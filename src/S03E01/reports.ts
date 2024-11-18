import { pipe } from 'fp-ts/function';
import { chain, map, sequenceSeqArray, TaskEither } from 'fp-ts/TaskEither';
import * as RA from 'fp-ts/ReadonlyArray';
import { LangfuseParent } from 'langfuse';
import { TextFileContent } from '../infrustructure/filesystem';
import { getTextFilesContent } from '../infrustructure/filesystem/content.ts';
import { openAiClient } from '../infrustructure/openai';
import { reportContextSystemMessage, reportKeywordsSystemMessage } from './prompts.ts';
import { ReportWithContext, ReportWithKeywords } from './types.ts';

export const getReports = (reportsDir: string): TaskEither<Error, TextFileContent[]> =>
  getTextFilesContent(reportsDir);

export const getReportsWithContext =
  (facts: string[], trace: LangfuseParent) =>
  (reports: TextFileContent[]): TaskEither<Error, ReportWithContext[]> =>
    pipe(
      sequenceSeqArray(reports.map(getReportWithContext(facts, reports, trace))),
      map(RA.toArray),
    );

const getReportWithContext =
  (facts: string[], reports: TextFileContent[], trace: LangfuseParent) =>
  (report: TextFileContent): TaskEither<Error, ReportWithContext> =>
    pipe(
      openAiClient.completionWithFirstContent(
        {
          model: 'gpt-4o',
          messages: [
            reportContextSystemMessage(facts, reports),
            { role: 'user', content: report.text },
          ],
        },
        trace,
      ),
      map(context => ({ ...report, context })),
    );

export const getReportsWithKeywords =
  (trace: LangfuseParent) =>
  (reports: ReportWithContext[]): TaskEither<Error, ReportWithKeywords[]> =>
    pipe(
      sequenceSeqArray(reports.map(report => getReportWithKeywords(trace)(report))),
      map(RA.toArray),
    );

const getReportWithKeywords =
  (trace: LangfuseParent) =>
  (report: ReportWithContext): TaskEither<Error, ReportWithKeywords> =>
    pipe(
      openAiClient.completionWithFirstContent(
        {
          model: 'gpt-4o',
          messages: [
            reportKeywordsSystemMessage,
            { role: 'user', content: [report.text, report.context].join('\n\n') },
          ],
        },
        trace,
      ),
      map(keywords => ({ ...report, keywords })),
    );
