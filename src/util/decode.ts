import { TaskEither } from 'fp-ts/TaskEither';
import { ZodType } from 'zod';
import { tryExecute } from './functional.ts';

export const decode = <T>(schema: ZodType<T>) => (obj: unknown): TaskEither<Error, T> =>
  tryExecute(`decode object`)(() => schema.parseAsync(obj));