import { pipe } from 'fp-ts/function';
import * as O from 'fp-ts/Option';
import { chain, fromOption, map, TaskEither } from 'fp-ts/TaskEither';
import { LangfuseConfig, LangfuseParent, observeOpenAI } from 'langfuse';
import { OpenAI, toFile } from 'openai';
import { TranscriptionCreateParams } from 'openai/resources/audio';
import { EmbeddingCreateParams, Embedding } from 'openai/resources/embeddings';
import {
  ChatCompletion,
  ChatCompletionCreateParamsNonStreaming,
} from 'openai/resources/chat/completions';
import { Image, ImageGenerateParams } from 'openai/resources/images';
import { FileLike } from 'openai/uploads';
import { z } from 'zod';
import { tap, tryExecute } from '../../util/functional.ts';
import { logPipe } from '../../util/log.ts';

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
  (
    params: ChatCompletionCreateParamsNonStreaming,
    langfuseParent?: LangfuseParent,
  ): TaskEither<Error, string> =>
    pipe(
      tryExecute('openai.chat.completions.create')(() =>
        observeOpenAI(openai, buildLangfuseConfig(langfuseParent)).chat.completions.create(params),
      ),
      chain((result: ChatCompletion) =>
        pipe(
          O.fromNullable(result.choices[0].message.content),
          fromOption(() => new Error('No content in response')),
        ),
      ),
      logPipe('Chat completion response'),
    );

const speachToText =
  (openai: OpenAI) =>
  (
    params: TranscriptionCreateParams,
    langfuseParent?: LangfuseParent,
  ): TaskEither<Error, string> => {
    console.log('speachToText', params);
    return pipe(
      tryExecute('OpenAI speach to text')(() =>
        observeOpenAI(openai, buildLangfuseConfig(langfuseParent)).audio.transcriptions.create(
          params,
        ),
      ),
      map(({ text }) => text),
    );
  };

const generateOneImage =
  (openai: OpenAI) =>
  (params: ImageGenerateParams, langfuseParent?: LangfuseParent): TaskEither<Error, Image> =>
    pipe(
      tryExecute('openai.images.create')(() =>
        observeOpenAI(openai, buildLangfuseConfig(langfuseParent)).images.generate(params),
      ),
      map(({ data }) => O.fromNullable(data[0])),
      chain(fromOption(() => new Error('No image in response'))),
    );

const createEmbeddings =
  (openai: OpenAI) =>
  (
    params: EmbeddingCreateParams,
    langfuseParent?: LangfuseParent,
  ): TaskEither<Error, Embedding[]> =>
    pipe(
      tryExecute('openai.embeddings.create')(() =>
        observeOpenAI(openai, buildLangfuseConfig(langfuseParent)).embeddings.create(params),
      ),
      map(({ data }) => data),
      tap(() => console.log('Embeddings created')),
    );

const buildLangfuseConfig = (parent?: LangfuseParent): LangfuseConfig | undefined =>
  parent ? { parent } : undefined;

export const openAiClient = {
  completionWithFirstContent: completionWithFirstContent(openai),
  speachToText: speachToText(openai),
  generateOneImage: generateOneImage(openai),
  createEmbeddings: createEmbeddings(openai),
};

export const customOpenAiClient = (params: OpenAIParams) => ({
  completionWithFirstContent: completionWithFirstContent(new OpenAI(params)),
});

export const toOpenAiFile = (buffer: Buffer, name: string): TaskEither<Error, FileLike> =>
  tryExecute('Buffer to OpenAI file')(() => toFile(buffer, name));
