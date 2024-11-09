import { pipe } from 'fp-ts/function';
import * as O from 'fp-ts/Option';
import { chain, fromOption, TaskEither } from 'fp-ts/TaskEither';
import { OpenAI } from 'openai';
import {
  ChatCompletion,
  ChatCompletionCreateParamsNonStreaming,
} from 'openai/resources/chat/completions';
import { z } from 'zod';
import { tryExecute } from '../../util/functional.ts';

export const OpenAIParams = z.object({
  baseURL: z.string().optional(),
  apiKey: z.string().optional(),
  organization: z.string().optional(),
  project: z.string().optional(),
});
export type OpenAIParams = z.infer<typeof OpenAIParams>;

const openai = new OpenAI();

const completionWithFirstContent =
  (openai: OpenAI) =>
  (params: ChatCompletionCreateParamsNonStreaming): TaskEither<Error, string> =>
    pipe(
      tryExecute('openai.chat.completions.create')(() => openai.chat.completions.create(params)),
      chain((result: ChatCompletion) =>
        pipe(
          O.fromNullable(result.choices[0].message.content),
          fromOption(() => new Error('No content in response')),
        ),
      ),
    );

export const openAiClient = {
  completionWithFirstContent: completionWithFirstContent(openai),
};

export const customOpenAiClient = (params: OpenAIParams) => ({
  completionWithFirstContent: completionWithFirstContent(new OpenAI(params)),
});
