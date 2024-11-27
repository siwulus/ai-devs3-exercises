import { sequenceS } from 'fp-ts/Apply';
import { pipe } from 'fp-ts/function';
import * as O from 'fp-ts/Option';
import * as RA from 'fp-ts/ReadonlyArray';
import {
  ApplySeq,
  chain,
  fromOption,
  left,
  map,
  of,
  sequenceSeqArray,
  TaskEither,
} from 'fp-ts/TaskEither';
import { LangfuseParent } from 'langfuse';
import { match, P } from 'ts-pattern';
import { z } from 'zod';
import { reportToHeadquarter } from '../infrustructure/headquoter';
import { get } from '../infrustructure/httpClient';
import { withSpan, withTrace } from '../infrustructure/langfuse';
import { openAiClient } from '../infrustructure/openai';
import { toPromise } from '../util/functional.ts';

const inputDataUrl = `${process.env.AGENTS_HEADQUARTER_URL}/data/${process.env.AI_DEV3_API_KEY}/json.txt`;
const mathTestRegexp = /\d+\s*[\+\-\*\/]\s*\d+/;
const mathOpRegexp = /(\d+)\s*([\+\-\*\/])\s*(\d+)/;

const TestData = z.object({
  question: z.string(),
  answer: z.number(),
  test: z
    .object({
      q: z.string(),
      a: z.string(),
    })
    .optional(),
});
type TestData = z.infer<typeof TestData>;

const CalibrationData = z.object({
  'apikey': z.string(),
  'description': z.string(),
  'copyright': z.string(),
  'test-data': z.array(TestData),
});
type CalibrationData = z.infer<typeof CalibrationData>;

const getCalibrationDataInput = (url: string, apikey: string): TaskEither<Error, CalibrationData> =>
  pipe(
    get(url, { responseSchema: CalibrationData }),
    map(data => ({ ...data, apikey })),
  );

const recalibrateData =
  (trace: LangfuseParent) =>
  (input: TestData): TaskEither<Error, TestData> =>
    match(input)
      .with({ question: P.string.regex(mathTestRegexp), test: { a: P.nonNullable } }, data =>
        pipe(
          sequenceS(ApplySeq)({
            answer: recalculateMath(data.question),
            a: recalibrateAnswer(data.test.q, trace),
          }),
          map(({ answer, a }) => ({ ...data, answer, test: { ...data.test, a } })),
        ),
      )
      .with({ question: P.string.regex(mathTestRegexp) }, data =>
        pipe(
          recalculateMath(data.question),
          map(answer => ({ ...data, answer })),
        ),
      )
      .otherwise(() => left(new Error(`Invalid Test Data data: ${JSON.stringify(input)}`)));

const recalculateMath = (question: string): TaskEither<Error, number> =>
  pipe(
    O.fromNullable(question.match(mathOpRegexp)),
    O.chain(parts =>
      sequenceS(O.Apply)({
        number1: pipe(
          O.fromNullable(parts[1]),
          O.map(v => parseInt(v, 10)),
          O.chain(O.fromPredicate(v => !Number.isNaN(v))),
        ),
        operator: O.fromNullable(parts[2]),
        number2: pipe(
          O.fromNullable(parts[3]),
          O.map(v => parseInt(v, 10)),
          O.chain(O.fromPredicate(v => !Number.isNaN(v))),
        ),
      }),
    ),
    fromOption(() => new Error(`Invalid math question: ${JSON.stringify(question)}`)),
    chain(({ number1, operator, number2 }) =>
      match(operator)
        .with('+', () => of(number1 + number2))
        .with('-', () => of(number1 - number2))
        .with('*', () => of(number1 * number2))
        .with('/', () => of(number1 / number2))
        .otherwise(() =>
          left(new Error(`Invalid operator: ${operator} in question: ${JSON.stringify(question)}`)),
        ),
    ),
  );

const recalibrateAnswer = (question: string, trace: LangfuseParent): TaskEither<Error, string> =>
  openAiClient.completionWithText(
    {
      messages: [
        {
          role: 'system',
          content: 'Answer the user question, be precise and concise',
        },
        {
          role: 'user',
          content: question,
        },
      ],
      model: 'gpt-4o',
    },
    trace,
  );

const recalibrateDataSet = (
  data: TestData[],
  trace: LangfuseParent,
): TaskEither<Error, TestData[]> =>
  pipe(sequenceSeqArray(data.map(recalibrateData(trace))), map(RA.toArray));

const recalibrate =
  (trace: LangfuseParent) =>
  (input: CalibrationData): TaskEither<Error, CalibrationData> =>
    sequenceS(ApplySeq)({
      'apikey': of(input.apikey),
      'description': of(input.description),
      'copyright': of(input.copyright),
      'test-data': recalibrateDataSet(input['test-data'], trace),
    });

await pipe(
  withTrace({ name: 'RecalibrateData' })(trace =>
    pipe(
      getCalibrationDataInput(inputDataUrl, process.env.AI_DEV3_API_KEY ?? '<unknown>'),
      chain(recalibrate(trace)),
      //tap(data => writeFileSync('calibrated.json', JSON.stringify(data, null, 2))),
      chain(withSpan('Report to Headquarter', trace)(reportToHeadquarter('JSON'))),
    ),
  ),
  toPromise,
);
