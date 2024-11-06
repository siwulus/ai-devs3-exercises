import { pipe } from 'fp-ts/function';
import { chain, of, TaskEither } from 'fp-ts/TaskEither';
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

export const ResponseFormat = z.enum(['json', 'text']);
export type ResponseFormat = z.infer<typeof ResponseFormat>;

export const post = <P, T>(
  url: string,
  payload: P,
  { payloadAsFormData, headers, responseSchema, responseFormat = ResponseFormat.Values.json }: PostOptions<T> = {},
): TaskEither<Error, T> =>
  pipe(
    tryExecute(`post: ${url}`)(() =>
      fetch(url, {
        method: 'POST',
        headers,
        body: payloadAsFormData ? (payload as FormData) : JSON.stringify(payload),
      }),
    ),
    chain(r => tryExecute(`get http response as ${responseFormat}`)(() => responseFormat === ResponseFormat.Values.text ? r.text() : r.json())),
    logPipe('POST Response'),
    chain(body => (responseSchema ? decode(responseSchema)(body) : of(body as T))),
  );

export const get = <T>(
  url: string,
  { headers, responseSchema, responseFormat }: GetOptions<T> = {},
): TaskEither<Error, T> =>
  pipe(
    tryExecute(`get: ${url}`)(() => fetch(url, { headers })),
    chain(r => tryExecute(`get http response as ${responseFormat}`)(() => responseFormat === ResponseFormat.Values.text ? r.text() : r.json())),
    chain(body => (responseSchema ? decode(responseSchema)(body) : of(body as T))),
    logPipe('GET Response'),
  );
