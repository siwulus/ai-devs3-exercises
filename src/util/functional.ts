import { pipe } from 'fp-ts/function';
import { isSome, none, Option, some } from 'fp-ts/Option';
import { chain, fromOption, left, map, matchE, right, TaskEither, tryCatch } from 'fp-ts/TaskEither';

export const tryExecute = (name: string) => <E, T>(lazy: () => Promise<T>): TaskEither<Error, T> =>
  tryCatch(lazy, (err) =>  {
    if (err instanceof Error) {
      console.error(`| ${name} | ${err.message}`, err);
      return err;
    }
    console.error(`| ${name} |`, err);
    return new Error(String(err));
  });

export const tap =
  <E, T>(f: (t: T) => void) =>
  (te: TaskEither<E, T>): TaskEither<E, T> =>
    pipe(
      te,
      map(t => {
        f(t);
        return t;
      }),
    );

export const toPromise = <L, R>(te: TaskEither<L, R>): Promise<R> =>
  pipe(
    te,
    matchE(
      (error: L) => () => Promise.reject(error),
      (result: R) => () => Promise.resolve(result),
    ),
  )();

export const chainO =
  <E, A, B>(f: (a: A) => TaskEither<E, Option<B>>) =>
    (ma: TaskEither<E, Option<A>>): TaskEither<E, Option<B>> =>
      pipe(
        ma,
        chain((a) => (isSome(a) ? f(a.value) : right(none))),
      );

export const chainOS =
  <E, A, B>(f: (a: A) => TaskEither<E, B>) =>
    (ma: TaskEither<E, Option<A>>): TaskEither<E, Option<B>> =>
      pipe(
        ma,
        chain((a) => (isSome(a) ? pipe(f(a.value), map(some)) : right(none))),
      );

export const mapO =
  <E, A, B>(f: (a: A) => Option<B>) =>
    (ma: TaskEither<E, Option<A>>): TaskEither<E, Option<B>> =>
      pipe(
        ma,
        map((a) => (isSome(a) ? f(a.value) : none)),
      );

export const mapOS =
  <E, A, B>(f: (a: A) => B) =>
    (ma: TaskEither<E, Option<A>>): TaskEither<E, Option<B>> =>
      pipe(
        ma,
        map((a) => (isSome(a) ? some(f(a.value)) : none)),
      );
