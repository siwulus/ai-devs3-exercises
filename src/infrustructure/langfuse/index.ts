import { pipe } from 'fp-ts/function';
import { chain, map, of, TaskEither } from 'fp-ts/TaskEither';
import { Langfuse, LangfuseParent, LangfuseTraceClient } from 'langfuse';
import { CreateLangfuseTraceBody } from 'langfuse-core';
import { mergeRight } from 'ramda';
import { v4 } from 'uuid';
import { tap, tryExecute } from '../../util/functional.ts';

const langfuse = new Langfuse();

export const withTrace =
  (traceParams: CreateLangfuseTraceBody = {}) =>
  <T>(fn: (trace: LangfuseTraceClient) => TaskEither<Error, T>): TaskEither<Error, T> =>
    pipe(
      of(langfuse.trace(mergeRight({ sessionId: v4() }, traceParams))),
      chain(trace => pipe(fn(trace), flushLangfuse)),
    );

export const withSpan =
  (name: string, parent: LangfuseParent) =>
  <I, O>(fn: (input: I) => TaskEither<Error, O>) =>
  (input: I): TaskEither<Error, O> =>
    pipe(
      of(parent.span({ name, input })),
      chain(span =>
        pipe(
          fn(input),
          tap(output => span.end({ output })),
        ),
      ),
    );

const flushLangfuse = <T>(te: TaskEither<Error, T>): TaskEither<Error, T> =>
  pipe(
    te,
    chain(result =>
      pipe(
        tryExecute('Flush Langfuse')(() => langfuse.flushAsync()),
        map(() => result),
      ),
    ),
  );
