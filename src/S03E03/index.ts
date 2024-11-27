import { pipe } from 'fp-ts/function';
import { chain, left, map, of, TaskEither } from 'fp-ts/TaskEither';
import { LangfuseParent } from 'langfuse';
import { zodResponseFormat } from 'openai/helpers/zod';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { match } from 'ts-pattern';
import { reportToHeadquarter } from '../infrustructure/headquoter';
import { withTrace } from '../infrustructure/langfuse';
import { openAiClient } from '../infrustructure/openai';
import { decode } from '../util/decode.ts';
import { toPromise } from '../util/functional.ts';
import { logPipe } from '../util/log.ts';
import { queryDB } from './databse.ts';
import { sqlAnalystSystemMessage } from './prompts.ts';
import { Answer } from './types.ts';

const answerQuestion = (question: string) =>
  withTrace({ name: 'Answer Question' })(trace =>
    pipe(askLLM(trace)(question, [sqlAnalystSystemMessage], 10), logPipe('Answer Question')),
  );

const askLLM =
  (trace?: LangfuseParent) =>
  (
    userMsg: string,
    history: ChatCompletionMessageParam[],
    limit: number,
  ): TaskEither<Error, string> =>
    pipe(
      validateLimit(limit),
      chain(() =>
        openAiClient.completionWithText(
          {
            model: 'gpt-4o',
            messages: [...history, { role: 'user', content: userMsg }],
            response_format: zodResponseFormat(Answer, 'Answer'),
          },
          trace,
        ),
      ),
      chain(response => decode(Answer)(JSON.parse(response))),
      chain(handleAnswer(trace)(userMsg, history, limit)),
    );

const validateLimit = (limit: number): TaskEither<Error, number> =>
  limit > 0 ? of(limit) : left(new Error('Limit queries to LLM  is exhausted'));

const handleAnswer =
  (trace?: LangfuseParent) =>
  (userMsg: string, history: ChatCompletionMessageParam[], limit: number) =>
  (answer: Answer): TaskEither<Error, string> =>
    match(answer)
      .with({ actionType: 'FINAL_RESPONSE' }, ({ answer }) => of(answer || '[empty response]'))
      .with({ actionType: 'COLLECT_DATA' }, collectData(trace)(userMsg, history, limit))
      .exhaustive();

const collectData =
  (trace?: LangfuseParent) =>
  (userMsg: string, history: ChatCompletionMessageParam[], limit: number) =>
  (answer: Answer) =>
    pipe(
      queryDB(answer.query),
      map(dbResponse => JSON.stringify(dbResponse, null, 2)),
      chain(dbData =>
        askLLM(trace)(
          dbData,
          [
            ...history,
            { role: 'user', content: userMsg || '' },
            { role: 'assistant', content: JSON.stringify(answer, null, 2) },
          ],
          limit - 1,
        ),
      ),
    );

const toArray = (msg: string) =>
  pipe(
    openAiClient.completionWithText({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content:
            'Convert the response to JSON array with DC_ID values. Return only the array nothing more',
        },
        { role: 'user', content: msg },
      ],
    }),
    map(response => JSON.parse(response)),
  );

await pipe(
  answerQuestion(
    'Które aktywne datacenter (DC_ID) są zarządzane przez pracowników, którzy są na urlopie (is_active=0)',
  ),
  chain(toArray),
  chain(reportToHeadquarter('database')),
  toPromise,
);
