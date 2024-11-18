import { pipe } from 'fp-ts/function';
import { chain, map, sequenceSeqArray, TaskEither } from 'fp-ts/TaskEither';
import { LangfuseParent } from 'langfuse';
import { zodResponseFormat } from 'openai/helpers/zod';
import { TextFileContent } from '../infrustructure/filesystem';
import { getTextFilesContent } from '../infrustructure/filesystem/content.ts';
import { openAiClient } from '../infrustructure/openai';
import { decode } from '../util/decode.ts';
import { factsUsabilityClassificationSystemMessage } from './prompts.ts';
import { FactUsabilityClassification } from './types.ts';

export const extractMeaningfulFacts = (
  dirPath: string,
  trace: LangfuseParent,
): TaskEither<Error, string[]> =>
  pipe(
    getTextFilesContent(dirPath),
    chain(fileContents => sequenceSeqArray(fileContents.map(categorizeFact(trace)))),
    map(result => result.filter(({ classification: { category } }) => category === 'Meaningful')),
    map(result => result.map(({ fact }) => fact.text)),
  );

const categorizeFact =
  (trace: LangfuseParent) =>
  (
    fact: TextFileContent,
  ): TaskEither<Error, { classification: FactUsabilityClassification; fact: TextFileContent }> =>
    pipe(
      openAiClient.completionWithFirstContent(
        {
          model: 'gpt-4o-mini',
          response_format: zodResponseFormat(FactUsabilityClassification, 'classification'),
          messages: [
            factsUsabilityClassificationSystemMessage,
            { role: 'user', content: fact.text },
          ],
        },
        trace,
      ),
      chain(response => decode(FactUsabilityClassification)(JSON.parse(response))),
      map(classification => ({ classification, fact })),
    );
