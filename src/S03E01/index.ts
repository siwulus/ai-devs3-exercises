import * as A from 'fp-ts/Array';
import { pipe } from 'fp-ts/function';
import { chain, map } from 'fp-ts/TaskEither';
import path from 'path';
import { reportToHeadquarter } from '../infrustructure/headquoter';
import { withTrace } from '../infrustructure/langfuse';
import { toPromise } from '../util/functional.ts';
import { logPipe } from '../util/log.ts';
import { extractMeaningfulFacts } from './facts.ts';
import { getReports, getReportsWithContext, getReportsWithKeywords } from './reports.ts';

import { ReportWithKeywords } from './types.ts';

const factsDir = path.join(__dirname, 'reports', 'facts');
const reportsDir = path.join(__dirname, 'reports');

const prepareReportsKeywords = () =>
  withTrace({ name: 'Prepare Reports Metadata' })(trace =>
    pipe(
      extractMeaningfulFacts(factsDir, trace),
      chain(facts =>
        pipe(
          getReports(reportsDir),
          chain(getReportsWithContext(facts, trace)),
          chain(getReportsWithKeywords(trace)),
        ),
      ),
      map(toHeadquarterFormat),
      logPipe('Reports metadata prepared'),
      chain(reportToHeadquarter('dokumenty')),
    ),
  );

const toHeadquarterFormat = (reports: ReportWithKeywords[]) =>
  pipe(
    reports,
    A.reduce({}, (acc, { name, keywords }) => ({ ...acc, [name]: keywords })),
  );

await pipe(prepareReportsKeywords(), toPromise);
