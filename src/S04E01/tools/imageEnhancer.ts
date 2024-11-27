import * as A from 'fp-ts/Array';
import { pipe } from 'fp-ts/function';
import { chain, fromOption, left, map, of, TaskEither } from 'fp-ts/TaskEither';
import { LangfuseParent } from 'langfuse';
import { zodFunction, zodResponseFormat } from 'openai/helpers/zod';
import { ChatCompletion, ChatCompletionMessageToolCall } from 'openai/resources/chat/completions';
import { match } from 'ts-pattern';
import { openAiClient } from '../../infrustructure/openai';
import { decode } from '../../util/decode.ts';
import { imageProcessor, ImageProcessorParameters } from './imageProcessor.ts';
import { analyseImageMessages } from './prompts.ts';
import { ExtractImageUrlResponse } from './types.ts';

export const getInitialImageUrls = (trace?: LangfuseParent): TaskEither<Error, string[]> =>
  pipe(
    imageProcessor.start(),
    chain(({ status, images }) =>
      status === 'SUCCESS' ? of(images) : left(new Error('Failed to extract image URLs')),
    ),
  );

export const enhanceImage =
  (trace?: LangfuseParent) =>
  (url?: string): TaskEither<Error, ExtractImageUrlResponse> =>
    pipe(
      openAiClient.completionWithChoice({
        model: 'gpt-4o',
        messages: analyseImageMessages(url),
        response_format: zodResponseFormat(ExtractImageUrlResponse, 'image_enhancement'),
        tools: enhanceImageTools,
      }),
      chain(proceedNextStep(trace)),
    );

const enhanceImageTools = [
  zodFunction({
    name: 'REPAIR',
    parameters: ImageProcessorParameters,
    description: 'Fix heavily pixelated or noisy images to improve clarity and definition.',
  }),
  zodFunction({
    name: 'DARKEN',
    parameters: ImageProcessorParameters,
    description: 'Reduce overexposure by making the image darker.',
  }),
  zodFunction({
    name: 'BRIGHTEN',
    parameters: ImageProcessorParameters,
    description: 'Correct underexposure by making the image brighter.',
  }),
];

const proceedNextStep = (trace?: LangfuseParent) => (choice: ChatCompletion.Choice) =>
  match(choice)
    .with({ finish_reason: 'stop' }, choice =>
      decode(ExtractImageUrlResponse)(JSON.parse(choice.message.content || '')),
    )
    .with({ finish_reason: 'tool_calls' }, choice =>
      selectEnhanceTool(trace)(choice.message.tool_calls ?? []),
    )
    .otherwise(() => left(new Error('Failed to enhance image')));

const selectEnhanceTool = (trace?: LangfuseParent) => (tool: ChatCompletionMessageToolCall[]) =>
  pipe(
    A.head(tool),
    fromOption(() => new Error('No tool call in response')),
    map(tool => tool.function),
    chain(fn =>
      pipe(
        decode(ImageProcessorParameters)(JSON.parse(fn.arguments)),
        map(({ imageUrl }) => ({ imageUrl, name: fn.name })),
        map(({ imageUrl, name }) => ({ fileName: imageUrl.split('/').pop() ?? imageUrl, name })),
      ),
    ),
    chain(({ name, fileName }) =>
      match(name)
        .with('REPAIR', () =>
          pipe(
            imageProcessor.repair(trace)(fileName),
            chain(({ image }) => enhanceImage(trace)(image)),
          ),
        )
        .with('DARKEN', () =>
          pipe(
            imageProcessor.darken(trace)(fileName),
            chain(({ image }) => enhanceImage(trace)(image)),
          ),
        )
        .with('BRIGHTEN', () =>
          pipe(
            imageProcessor.brighten(trace)(fileName),
            chain(({ image }) => enhanceImage(trace)(image)),
          ),
        )
        .otherwise(() => left(new Error('Unknown tool call'))),
    ),
  );
