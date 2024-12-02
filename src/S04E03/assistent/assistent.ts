import { pipe } from 'fp-ts/function';
import { chain, left, map, of, sequenceArray, TaskEither } from 'fp-ts/TaskEither';
import * as RA from 'fp-ts/ReadonlyArray';
import { LangfuseParent } from 'langfuse';
import { match } from 'ts-pattern';
import { documentService } from '../../infrustructure/document';
import { Document } from '../../infrustructure/document/types.ts';
import { withTrace } from '../../infrustructure/langfuse';
import { openAiClient } from '../../infrustructure/openai';
import { answerSystemPrompt } from './prompts/answer.ts';
import { ConversationContext, NextAction, NextActionLLMResponse } from './types';

export const answerUserQuestion = (question: string) =>
  withTrace({ name: 'S05E03' })(trace => actAsIndependentAssistant(trace)(question));

const actAsIndependentAssistant = (trace?: LangfuseParent) => (userQuestion: string) => {
  const context = new ConversationContext().addUserMessage(userQuestion).setLimit(10);
  return pipe(execute(context, trace));
};

const execute = (context: ConversationContext, trace?: LangfuseParent): TaskEither<Error, string> =>
  pipe(evaluateNextAction(context, trace), chain(executeNextAction(context, trace)));

const evaluateNextAction = (
  context: ConversationContext,
  trace?: LangfuseParent,
): TaskEither<Error, NextAction> =>
  pipe(
    openAiClient.completionWithJson<NextActionLLMResponse>(
      {
        model: 'gpt-4o',
        messages: context.getConversation(),
        response_format: {
          type: 'json_object',
        },
      },
      NextActionLLMResponse,
      trace,
    ),
    map(({ nextAction }) => nextAction),
  );

const executeNextAction =
  (context: ConversationContext, trace?: LangfuseParent) =>
  (nextAction: NextAction): TaskEither<Error, string> =>
    context.limitExceeded()
      ? left(new Error('Processing limit exceeded'))
      : match(nextAction)
          .with({ type: 'fetch' }, ({ urls }) => collectDocuments(urls, context, trace))
          .with({ type: 'solved' }, ({ query }) => answerQuestion(query, context, trace))
          .with({ type: 'resign' }, ({ explanation }) =>
            resignAndExplain(explanation, context, trace),
          )
          .exhaustive();

const answerQuestion = (
  query: string,
  context: ConversationContext,
  trace?: LangfuseParent,
): TaskEither<Error, string> =>
  openAiClient.completionWithText(
    {
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: answerSystemPrompt(context.getDocuments(), query) },
        { role: 'user', content: query },
      ],
    },
    trace,
  );

const resignAndExplain = (
  explanation: string,
  context: ConversationContext,
  trace?: LangfuseParent,
): TaskEither<Error, string> => of(explanation);

const collectDocuments = (
  urls: string[],
  context: ConversationContext,
  trace?: LangfuseParent,
): TaskEither<Error, string> =>
  pipe(
    fetchDocuments(urls, context),
    map(documents => context.addDocuments(documents)),
    chain(ctx => execute(ctx.decreaseLimit(), trace)),
  );

const fetchDocuments = (
  urls: string[],
  context: ConversationContext,
): TaskEither<Error, Document[]> =>
  pipe(
    of(urls.filter(url => !context.getDocuments().some(doc => doc.url === url))),
    chain(filteredUrls =>
      sequenceArray(filteredUrls.map(url => documentService.webPageAsDocument(new URL(url)))),
    ),
    map(RA.toArray),
  );
