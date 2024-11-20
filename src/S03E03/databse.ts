import { left, TaskEither } from 'fp-ts/TaskEither';
import { post } from '../infrustructure/httpClient';

const task = 'database';
const url = `${process.env.AGENTS_HEADQUARTER_URL}/apidb`;
const apikey = process.env.AI_DEV3_API_KEY;

export const queryDB = (query?: string): TaskEither<Error, unknown> =>
  query
    ? post(url, {
        task,
        apikey,
        query,
      })
    : left(new Error('No query provided'));
