import { pipe } from 'fp-ts/function';
import { chain, map, sequenceSeqArray, TaskEither } from 'fp-ts/TaskEither';
import { z } from 'zod';
import { reportToHeadquarter } from '../infrustructure/headquoter';
import { get } from '../infrustructure/httpClient';
import { toPromise } from '../util/functional.ts';
import { logPipe } from '../util/log.ts';
import { answerUserQuestion } from './assistent/assistent.ts';
import * as RA from 'fp-ts/ReadonlyArray';

const Questions = z.record(z.string(), z.string());
type Questions = z.infer<typeof Questions>;
const Answers = z.record(z.string(), z.string());
type Answers = z.infer<typeof Answers>;

const questionUrl = `${process.env.AGENTS_HEADQUARTER_URL}/data/${process.env.AI_DEV3_API_KEY}/softo.json`;

const getQuestions = (): TaskEither<Error, Questions> =>
  get(questionUrl, { responseFormat: 'json', responseSchema: Questions });

const answerQuestions = () =>
  pipe(
    getQuestions(),
    logPipe('Questions:'),
    map(questions => Object.entries(questions)),
    chain(questions => sequenceSeqArray(questions.map(answerQuestion))),
    map(RA.toArray),
    map(answers => Object.fromEntries(answers)),
    logPipe('Answers'),
    chain(reportToHeadquarter('softo')),
  );

const answerQuestion = ([key, question]: [string, string]) =>
  pipe(
    answerUserQuestion(
      `Przeszukaj strone https://softo.ag3nts.org i odpowiedz na pytanie: ${question}`,
    ),
    map(answer => [key, answer]),
  );

await pipe(answerQuestions(), toPromise);
