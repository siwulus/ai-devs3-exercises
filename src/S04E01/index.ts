import { pipe } from 'fp-ts/function';
import { chain, map, sequenceSeqArray } from 'fp-ts/TaskEither';
import * as RA from 'fp-ts/ReadonlyArray';
import { reportToHeadquarter } from '../infrustructure/headquoter';
import { withTrace } from '../infrustructure/langfuse';
import { toPromise } from '../util/functional.ts';
import { logPipe } from '../util/log.ts';
import { enhanceImage, getInitialImageUrls } from './tools/imageEnhancer.ts';
import { describeWomen } from './tools/womenRecogniser.ts';

const describeBarbara = () =>
  withTrace({ name: 'Describe Barbara' })(trace =>
    pipe(
      getInitialImageUrls(trace),
      chain(urls => sequenceSeqArray(urls.map(enhanceImage(trace)))),
      map(RA.toArray),
      logPipe('Enhanced images'),
      chain(describeWomen(trace)),
      chain(reportToHeadquarter('photos')),
    ),
  );

await pipe(describeBarbara(), toPromise);
