import { pipe } from 'fp-ts/function';
import { map, TaskEither } from 'fp-ts/TaskEither';
import { z, ZodType } from 'zod';
import { post } from '../infrustructure/httpClient';

const task = 'database';
const url = `${process.env.AGENTS_HEADQUARTER_URL}/apidb`;
const apikey = process.env.AI_DEV3_API_KEY;

export const query =
  <T>(t: ZodType<T>) =>
  (query: string): TaskEither<Error, T[]> =>
    pipe(
      post(
        url,
        {
          task,
          apikey,
          query,
        },
        { responseSchema: z.object({ reply: t.array() }) },
      ),
      map(({ reply }) => reply),
    );
