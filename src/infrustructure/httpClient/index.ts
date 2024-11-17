import { pipe } from 'fp-ts/function';
import { chain, map, of, TaskEither } from 'fp-ts/TaskEither';
import { match } from 'ts-pattern';
import { HeadersInit } from 'undici-types/fetch';
import { z, ZodType } from 'zod';
import { decode } from '../../util/decode.ts';

import { tryExecute } from '../../util/functional.ts';
import { logPipe } from '../../util/log.ts';

export type GetOptions<T> = {
  headers?: HeadersInit;
  responseSchema?: ZodType<T>;
  responseFormat?: ResponseFormat;
};

export type PostOptions<T> = GetOptions<T> & {
  payloadAsFormData?: boolean;
};

export const ResponseFormat = z.enum(['json', 'text', 'buffer']);
export type ResponseFormat = z.infer<typeof ResponseFormat>;

export const post = <P, T>(
  url: string,
  payload: P,
  {
    payloadAsFormData,
    headers,
    responseSchema,
    responseFormat = ResponseFormat.Values.json,
  }: PostOptions<T> = {},
): TaskEither<Error, T> =>
  pipe(
    tryExecute(`post: ${url}`)(() =>
      fetch(url, {
        method: 'POST',
        headers,
        body: payloadAsFormData ? (payload as FormData) : JSON.stringify(payload),
      }),
    ),
    chain(getBody(responseFormat ?? ResponseFormat.Values.json)),
    logPipe('POST Response'),
    chain(body => (responseSchema ? decode(responseSchema)(body) : of(body as T))),
  );

export const get = <T>(
  url: string,
  { headers, responseSchema, responseFormat }: GetOptions<T> = {},
): TaskEither<Error, T> =>
  pipe(
    tryExecute(`get: ${url}`)(() => fetch(url, { headers })),
    chain(getBody(responseFormat ?? ResponseFormat.Values.json)),
    chain(body => (responseSchema ? decode(responseSchema)(body) : of(body as T))),
  );

const getBody = (format: ResponseFormat) => (r: Response) =>
  match(format)
    .with('json', () => tryExecute('Get Json')(() => r.json()))
    .with('text', () => tryExecute('Get Text')(() => r.text()))
    .with('buffer', () =>
      pipe(
        tryExecute('Get Buffer')(() => r.arrayBuffer()),
        map(arrayBuffer => Buffer.from(arrayBuffer)),
      ),
    )
    .exhaustive();
