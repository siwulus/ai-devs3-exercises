import * as A from 'fp-ts/Array';
import { pipe } from 'fp-ts/function';
import * as RA from 'fp-ts/ReadonlyArray';
import { chain, map, sequenceArray } from 'fp-ts/TaskEither';
import { readFile } from 'node:fs/promises';
import path from 'path';
import { saveTextFile } from '../infrustructure/filesystem';
import { toPromise, tryExecute } from '../util/functional.ts';

export type FineTuningConfig = {
  filePath: string;
  systemPrompt: string;
  assistantPrompt: string;
};
export const systemPrompt = 'Validate the following data series';
export const fineTuningCorrect: FineTuningConfig = {
  filePath: path.join(__dirname, 'labdata', 'correct.txt'),
  systemPrompt,
  assistantPrompt: 'correct',
};
export const fineTuningIncorrect: FineTuningConfig = {
  filePath: path.join(__dirname, 'labdata', 'incorrect.txt'),
  systemPrompt,
  assistantPrompt: 'incorrect',
};

export const prepareFineTuningDataSets = (configs: FineTuningConfig[]) =>
  pipe(
    sequenceArray(configs.map(prepareFineTuningDataSet)),
    map(RA.toArray),
    map(A.flatten),
    map(rows => rows.map(row => JSON.stringify(row))),
    map(rows => rows.join('\n')),
    chain(saveTextFile(path.join(__dirname, 'labdata'), 'fine-tuning.jsonl')),
  );

const prepareFineTuningDataSet = (config: FineTuningConfig) =>
  pipe(
    tryExecute('Read file')(() => readFile(config.filePath, 'utf-8')),
    map(text => text.split('\n')),
    map(rows => rows.map(buildFineTuningMessage(config.systemPrompt, config.assistantPrompt))),
  );

const buildFineTuningMessage =
  (systemPrompt: string, assistantPrompt: string) => (text: string) => ({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: text },
      {
        role: 'assistant',
        content: assistantPrompt,
      },
    ],
  });
