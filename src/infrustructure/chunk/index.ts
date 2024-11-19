import * as A from 'fp-ts/Array';
import { pipe } from 'fp-ts/function';
import { chain, fromOption, map, TaskEither } from 'fp-ts/TaskEither';
import { LangfuseParent } from 'langfuse';
import { EmbeddingModel } from 'openai/src/resources/embeddings';
import { Chunk, ChunkEmbedded } from '../../model/chunk';
import { openAiClient } from '../openai';
import { createContextualChunkMessages } from './prompts';

export const getContextualChunk =
  (trace?: LangfuseParent) =>
  (chunk: Chunk, document: string): TaskEither<Error, Chunk> =>
    pipe(
      openAiClient.completionWithFirstContent(
        {
          model: 'gpt-4o-mini',
          messages: createContextualChunkMessages(chunk.content, document),
        },
        trace,
      ),
      map(content => ({ ...chunk, content })),
    );

export const getChunkEmbedded =
  (trace?: LangfuseParent) =>
  (
    chunk: Chunk,
    model: EmbeddingModel = 'text-embedding-3-large',
  ): TaskEither<Error, ChunkEmbedded> =>
    pipe(
      openAiClient.createEmbeddings(
        {
          model,
          input: chunk.content,
        },
        trace,
      ),
      map(embeddings => A.head(embeddings)),
      chain(fromOption(() => new Error('No embeddings in response'))),
      map(({ embedding }) => ({ ...chunk, embedding })),
    );
