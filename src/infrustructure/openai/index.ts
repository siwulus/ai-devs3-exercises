import * as A from 'fp-ts/Array';
import { pipe } from 'fp-ts/function';
import * as O from 'fp-ts/Option';
import { chain, fromEither, fromOption, left, map, of, TaskEither } from 'fp-ts/TaskEither';
import { LangfuseConfig, LangfuseParent, observeOpenAI } from 'langfuse';
import { OpenAI, toFile } from 'openai';
import { TranscriptionCreateParams } from 'openai/resources/audio';
import {
  ChatCompletion,
  ChatCompletionCreateParamsNonStreaming,
} from 'openai/resources/chat/completions';
import { Embedding, EmbeddingCreateParams } from 'openai/resources/embeddings';
import { Image, ImageGenerateParams } from 'openai/resources/images';
import { FileLike } from 'openai/uploads';
import { match } from 'ts-pattern';
import { z } from 'zod';
import { decode } from '../../util/decode.ts';
import { tap, tryExecute, tryExecuteE } from '../../util/functional.ts';
import { logPipe } from '../../util/log.ts';

export const OpenAIParams = z.object({
  baseURL: z.string().optional(),
  apiKey: z.string().optional(),
  organization: z.string().optional(),
  project: z.string().optional(),
});
export type OpenAIParams = z.infer<typeof OpenAIParams>;

const openai = new OpenAI();

const completionWithChoice =
  (openai: OpenAI) =>
  (
    params: ChatCompletionCreateParamsNonStreaming,
    langfuseParent?: LangfuseParent,
  ): TaskEither<Error, ChatCompletion.Choice> =>
    pipe(
      tryExecute('openai.chat.completions.create')(() =>
        observeOpenAI(openai, buildLangfuseConfig(langfuseParent)).chat.completions.create(params),
      ),
      chain((result: ChatCompletion) =>
        pipe(
          A.head(result.choices),
          fromOption(() => new Error('No content in response')),
        ),
      ),
      chain(choice =>
        match(choice)
          .with({ finish_reason: 'content_filter' }, choice =>
            left(new Error('Content Filter blocked content')),
          )
          .with({ finish_reason: 'length' }, choice =>
            left(new Error('Not enough token to generate response')),
          )
          .otherwise(of),
      ),
      logPipe('Chat completionWithChoice response'),
    );

const completionWithText =
  (openai: OpenAI) =>
  (
    params: ChatCompletionCreateParamsNonStreaming,
    langfuseParent?: LangfuseParent,
  ): TaskEither<Error, string> =>
    pipe(
      completionWithChoice(openai)(params, langfuseParent),
      chain(choice =>
        match(choice)
          .with({ finish_reason: 'stop' }, choice => of(choice.message.content || ''))
          .otherwise(() => left(new Error('No text content in response'))),
      ),
      logPipe('Chat completionWithText response'),
    );

const completionWithJson =
  (openai: OpenAI) =>
  <T>(
    params: ChatCompletionCreateParamsNonStreaming,
    schema: z.ZodType<T>,
    langfuseParent?: LangfuseParent,
  ): TaskEither<Error, T> =>
    pipe(
      completionWithText(openai)(params, langfuseParent),
      chain(content => fromEither(tryExecuteE('Parse JSON')(() => JSON.parse(content)))),
      chain(decode(schema)),
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
  completionWithChoice: completionWithChoice(openai),
  completionWithText: completionWithText(openai),
  completionWithJson: completionWithJson(openai),
  speachToText: speachToText(openai),
  generateOneImage: generateOneImage(openai),
  createEmbeddings: createEmbeddings(openai),
};

export const customOpenAiClient = (params: OpenAIParams) => ({
  completionWithFirstContent: completionWithText(new OpenAI(params)),
});

export const toOpenAiFile = (buffer: Buffer, name: string): TaskEither<Error, FileLike> =>
  tryExecute('Buffer to OpenAI file')(() => toFile(buffer, name));
