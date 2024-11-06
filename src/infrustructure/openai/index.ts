import { pipe } from 'fp-ts/function';
import * as O from 'fp-ts/Option';
import { chain, fromOption, TaskEither } from 'fp-ts/TaskEither';
import { OpenAI } from 'openai';
import { ChatCompletion, ChatCompletionCreateParamsNonStreaming } from 'openai/resources/chat/completions';
import { tryExecute } from '../../util/functional.ts';

const openai = new OpenAI();


const completionWithFirstContent = (params: ChatCompletionCreateParamsNonStreaming): TaskEither<Error, string> =>
  pipe(
    tryExecute('openai.chat.completions.create')(() => openai.chat.completions.create(params)),
    chain((result: ChatCompletion) =>
      pipe(
        O.fromNullable(result.choices[0].message.content),
        fromOption(() => new Error('No content in response'))),
    ),
  );

export const openAiClient = {
  completionWithFirstContent,
}