import { QdrantClient } from '@qdrant/js-client-rest';
import { components } from '@qdrant/js-client-rest/dist/types/openapi/generated_schema';
import * as A from 'fp-ts/Array';
import { pipe } from 'fp-ts/function';
import { chain, fromOption, left, map, of, TaskEither } from 'fp-ts/TaskEither';
import { LangfuseParent } from 'langfuse';
import { isNil } from 'ramda';
import { v4 } from 'uuid';
import { Chunk, ChunkEmbedded } from '../../model/chunk.ts';
import { tryExecute } from '../../util/functional.ts';
import { getChunkEmbedded } from '../chunk';
import { openAiClient } from '../openai';

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});
const collectionName = 'ai_dev3';
const embeddingModel = 'text-embedding-3-large';

const withQdrant = <R>(fn: (qdrant: QdrantClient) => TaskEither<Error, R>): TaskEither<Error, R> =>
  pipe(
    tryExecute('Get Qdrant collections')(() => qdrant.getCollections()),
    map(({ collections }) => collections.find(c => c.name === collectionName)),
    chain(collection =>
      isNil(collection)
        ? tryExecute('Create Qdrant collection')(() =>
            qdrant.createCollection(collectionName, {
              vectors: { size: 3072, distance: 'Cosine' },
            }),
          )
        : of(true),
    ),
    chain(success =>
      success ? fn(qdrant) : left(new Error('Failed to create qdrant collection')),
    ),
  );

const addChunk =
  (trace?: LangfuseParent) =>
  (chunk: Chunk): TaskEither<Error, 'acknowledged' | 'completed'> =>
    withQdrant(client =>
      pipe(
        getChunkEmbedded(trace)(chunk, embeddingModel),
        map(toPoint),
        chain(upsertPoint(client)),
      ),
    );

const toPoint = (chunk: ChunkEmbedded) => ({
  id: v4(),
  vector: chunk.embedding,
  payload: {
    ...chunk.metadata,
    chunkId: chunk.id,
    documentId: chunk.documentId,
    text: chunk.content,
  },
});

const upsertPoint = (client: QdrantClient) => (point: components['schemas']['PointStruct']) =>
  pipe(
    tryExecute('Upsert point in Qdrant')(async () =>
      client.upsert(collectionName, { wait: true, points: [point] }),
    ),
    map(({ status }) => status),
  );

const search =
  (trace?: LangfuseParent) =>
  (query: string, limit: number = 5): TaskEither<Error, Chunk[]> =>
    withQdrant(client =>
      pipe(
        embeddQuery(trace)(query),
        chain(embedding =>
          tryExecute('Search in Qdrant')(() =>
            client.search(collectionName, {
              vector: embedding,
              limit,
              with_payload: true,
            }),
          ),
        ),
        map(result =>
          pipe(
            result,
            A.map(({ payload }) => {
              const { chunkId, documentId, text, ...metadata } = payload as any;
              return {
                id: chunkId,
                documentId,
                content: text,
                metadata,
              };
            }),
          ),
        ),
      ),
    );

const embeddQuery =
  (trace?: LangfuseParent) =>
  (query: string): TaskEither<Error, number[]> =>
    pipe(
      openAiClient.createEmbeddings(
        {
          model: embeddingModel,
          input: query,
        },
        trace,
      ),
      map(embeddings => A.head(embeddings)),
      chain(fromOption(() => new Error('No embeddings in response'))),
      map(({ embedding }) => embedding),
    );

const deleteAll = (): TaskEither<Error, boolean> =>
  withQdrant(client => tryExecute('Clear Qdrant')(() => client.deleteCollection(collectionName)));

export const vectorService = {
  addChunk,
  search,
  deleteAll,
};
