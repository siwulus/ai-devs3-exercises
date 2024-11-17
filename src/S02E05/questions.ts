import { pipe } from 'fp-ts/function';
import { map, sequenceSeqArray, TaskEither } from 'fp-ts/TaskEither';
import * as RA from 'fp-ts/ReadonlyArray';
import { get } from '../infrustructure/httpClient';
import { openAiClient } from '../infrustructure/openai';
import { logPipe } from '../util/log.ts';
import { answerUserQuestionSystemMessage } from './prompts.ts';
import { Question, QuestionWithAnswer } from './types.ts';

export const getQuestions = (url: string): TaskEither<Error, Question[]> =>
  pipe(get<string>(url, { responseFormat: 'text' }), map(buildQuestions));

const buildQuestions = (text: string): Question[] =>
  text
    .split('\n')
    .filter(Boolean)
    .map(line => {
      const [id, question] = line.split('=');
      return { id, question };
    });

export const answerAllQuestions = (
  article: string,
  questions: Question[],
): TaskEither<Error, QuestionWithAnswer[]> =>
  pipe(
    sequenceSeqArray(questions.map(question => answerOneQuestion(article, question))),
    map(RA.toArray),
    logPipe('Answered all questions'),
  );

export const answerOneQuestion = (
  article: string,
  question: Question,
): TaskEither<Error, QuestionWithAnswer> =>
  pipe(
    openAiClient.completionWithFirstContent({
      model: 'gpt-4o',
      max_tokens: 2000,
      messages: [
        answerUserQuestionSystemMessage(article),
        { role: 'user', content: question.question },
      ],
    }),
    map(answer => ({ ...question, answer })),
  );
