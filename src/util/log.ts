import { pipe } from 'fp-ts/function';
import { orElse, TaskEither } from 'fp-ts/TaskEither';
import { tap } from './functional.ts';

export const logPipe =
  <E, T>(msg?: string) =>
  (te: TaskEither<E, T>): TaskEither<E, T> =>
    pipe(
      te,
      tap(v => console.info(msg ? `${msg}: ` : '', JSON.stringify(v, null, 2))),
      orElse(e => {
        console.error(msg ? `${msg}: ` : '', JSON.stringify(e, null, 2));
        return te;
      }),
    );

export const logPipeProjection =
  <E, T, K>(pr: (p: T) => K, msg?: string) =>
  (te: TaskEither<E, T>): TaskEither<E, T> =>
    pipe(
      te,
      tap(v => console.info(msg ? `${msg}: ` : '', JSON.stringify(pr(v), null, 2))),
      orElse(e => {
        console.error(msg ? `${msg}: ` : '', JSON.stringify(e, null, 2));
        return te;
      }),
    );

export const logReplace = (text: string): void => {
  process.stdout.clearLine(0);
  process.stdout.cursorTo(0);
  process.stdout.write(text);
};
