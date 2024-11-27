import { pipe } from 'fp-ts/function';
import { chain, left, map, of, TaskEither } from 'fp-ts/TaskEither';
import { LangfuseParent } from 'langfuse';
import { zodResponseFormat } from 'openai/helpers/zod';
import {
  ChatCompletionMessageParam,
  ChatCompletionUserMessageParam,
} from 'openai/resources/chat/completions';
import { match } from 'ts-pattern';
import { withTrace } from '../infrustructure/langfuse';
import { openAiClient } from '../infrustructure/openai';
import { decode } from '../util/decode.ts';
import { toPromise } from '../util/functional.ts';
import { logPipe } from '../util/log.ts';
import { findBarbaraLocationSystemMessage, initialNamesSystemMessage } from './prompts.ts';
import { getInitialInformation, searchPeople, searchPlaces } from './tools.ts';
import { InitialNames, LocationSearch } from './types.ts';

const findLocation = () =>
  withTrace({ name: 'Find Location' })(trace =>
    pipe(
      getInitialInformation(),
      chain(getInitialInputData(trace)),
      chain(input =>
        queryLLMInLoop(trace)(
          { role: 'user', content: JSON.stringify(input) },
          [findBarbaraLocationSystemMessage],
          20,
        ),
      ),
      logPipe('Barbara Location'),
    ),
  );

const getInitialInputData =
  (trace?: LangfuseParent) =>
  (content: string): TaskEither<Error, InitialNames> =>
    pipe(
      openAiClient.completionWithText(
        {
          model: 'gpt-4o',
          messages: [initialNamesSystemMessage, { role: 'user', content }],
          response_format: zodResponseFormat(InitialNames, 'InitialNames'),
        },
        trace,
      ),
      chain(response => decode(InitialNames)(JSON.parse(response))),
    );

const queryLLMInLoop =
  (trace?: LangfuseParent) =>
  (
    userMessage: ChatCompletionUserMessageParam,
    history: ChatCompletionMessageParam[],
    limit: number,
  ): TaskEither<Error, LocationSearch> =>
    pipe(
      validateLimit(limit),
      map(() => [...history, userMessage]),
      chain(messages =>
        pipe(
          openAiClient.completionWithText(
            {
              model: 'gpt-4o',
              messages,
              response_format: zodResponseFormat(LocationSearch, 'LocationSearch'),
            },
            trace,
          ),
          chain(response => decode(LocationSearch)(JSON.parse(response))),
          chain(handleAnswer(trace)(messages, limit)),
        ),
      ),
    );

const validateLimit = (limit: number): TaskEither<Error, number> =>
  limit > 0 ? of(limit) : left(new Error('Limit queries to LLM  is exhausted'));

const handleAnswer =
  (trace?: LangfuseParent) =>
  (history: ChatCompletionMessageParam[], limit: number) =>
  (answer: LocationSearch): TaskEither<Error, LocationSearch> =>
    match(answer)
      .with({ action: 'response' }, of)
      .with({ action: 'places' }, collectPeople(trace)(history, limit))
      .with({ action: 'people' }, collectPlaces(trace)(history, limit))
      .exhaustive();

const collectPeople =
  (trace?: LangfuseParent) =>
  (history: ChatCompletionMessageParam[], limit: number) =>
  (answer: LocationSearch) =>
    pipe(
      searchPeople(answer.message),
      chain(people =>
        queryLLMInLoop(trace)(
          { role: 'user', content: people },
          addAssistantMsgToHistory(answer.message, history),
          limit - 1,
        ),
      ),
    );

const collectPlaces =
  (trace?: LangfuseParent) =>
  (history: ChatCompletionMessageParam[], limit: number) =>
  (answer: LocationSearch) =>
    pipe(
      searchPlaces(answer.message),
      chain(places =>
        queryLLMInLoop(trace)(
          { role: 'user', content: places },
          addAssistantMsgToHistory(answer.message, history),
          limit - 1,
        ),
      ),
    );

const addAssistantMsgToHistory = (
  message: string,
  history: ChatCompletionMessageParam[],
): ChatCompletionMessageParam[] => [...history, { role: 'assistant', content: message }];

await pipe(findLocation(), toPromise);
