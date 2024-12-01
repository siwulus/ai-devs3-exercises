import * as A from 'fp-ts/Array';
import { pipe } from 'fp-ts/function';
import * as RA from 'fp-ts/ReadonlyArray';
import { chain, map, sequenceSeqArray, TaskEither } from 'fp-ts/TaskEither';
import { readFile } from 'node:fs/promises';
import path from 'path';
import { isEmpty } from 'ramda';
import { reportToHeadquarter } from '../infrustructure/headquoter';
import { openAiClient } from '../infrustructure/openai';
import { toPromise, tryExecute } from '../util/functional.ts';
import { logPipe } from '../util/log.ts';
import { systemPrompt } from './dataset.ts';

type Data = {
  id: string;
  value: string;
};

type VerifiedData = Data & {
  result: string;
};

const verifyData = (path: string) =>
  pipe(
    tryExecute('Read file')(() => readFile(path, 'utf-8')),
    map(parse),
    logPipe('Verified data'),
    chain(values => sequenceSeqArray(values.map(verify))),
    logPipe('Verified data'),
    map(RA.toArray),
    logPipe('Verified data'),
    map(A.filter(v => v.result === 'correct')),
    map(A.map(v => v.id)),
    logPipe('Verified data- filttered'),
    chain(reportToHeadquarter('research')),
  );

const parse = (text: string): Data[] =>
  pipe(
    text.split('\n'),
    A.filter(line => !isEmpty(line.trim())),
    A.map(line => line.split('=')),
    A.map(([id, value]) => ({ id, value })),
  );

const verify = ({ id, value }: Data): TaskEither<Error, VerifiedData> =>
  pipe(
    openAiClient.completionWithText({
      model: 'ft:gpt-4o-mini-2024-07-18:dunning-kruger-associates:ai-devs3-s04e02-two:AZahO0eM',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: value },
      ],
    }),
    map(result => ({ id, value, result })),
  );

//await pipe(prepareFineTuningDataSets([fineTuningCorrect, fineTuningIncorrect]), toPromise);
await pipe(verifyData(path.join(__dirname, 'labdata', 'verify.txt')), toPromise);
