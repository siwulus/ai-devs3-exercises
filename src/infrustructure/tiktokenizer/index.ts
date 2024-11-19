import { createByModelName, TikTokenizer } from '@microsoft/tiktokenizer';
import { pipe } from 'fp-ts/function';
import * as A from 'fp-ts/Array';
import { map, of, TaskEither } from 'fp-ts/TaskEither';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { tryExecute } from '../../util/functional.ts';

const IM_START = '<|im_start|>';
const IM_END = '<|im_end|>';
const IM_SEP = '<|im_sep|>';

const specialTokens: ReadonlyMap<string, number> = new Map([
  [IM_START, 100264],
  [IM_END, 100265],
  [IM_SEP, 100266],
]);

const tikTokenizers: Map<string, TikTokenizer> = new Map();

const getTokenizer = (modelName: string): TaskEither<Error, TikTokenizer> =>
  tikTokenizers.has(modelName)
    ? of(tikTokenizers.get(modelName) as TikTokenizer)
    : createTikTokenizer(modelName);

const createTikTokenizer = (modelName: string): TaskEither<Error, TikTokenizer> =>
  pipe(
    tryExecute(`Create TikTokenizer ${modelName}`)(() =>
      createByModelName(modelName, specialTokens),
    ),
    map(tikTokenizer => tikTokenizers.set(modelName, tikTokenizer).get(modelName) as TikTokenizer),
  );

export const countTokens = (
  messages: ChatCompletionMessageParam[],
  model: string = 'gpt-4o',
): TaskEither<Error, number> =>
  pipe(
    messages,
    A.reduce(
      '',
      (acc, message) =>
        `${acc}${IM_START}${message.role}${IM_SEP}${message.content || ''}${IM_END}`,
    ),
    content => `${content}${IM_START}assistant${IM_SEP}`,
    formattedContent =>
      pipe(
        getTokenizer(model),
        map(tokenizer => tokenizer.encode(formattedContent, [IM_START, IM_END, IM_SEP])),
        map(tokens => tokens.length),
      ),
  );
