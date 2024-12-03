import Elysia, { t } from 'elysia';
import { pipe } from 'fp-ts/function';
import { chain, map, of } from 'fp-ts/TaskEither';
import { toPromise } from '../util/functional.ts';
import { logPipe } from '../util/log.ts';
import { buildMapTails } from './map';
import { getPosition } from './position';

const mapTails = await buildMapTails();
const app = new Elysia()
  .decorate('mapTails', mapTails)
  .post('/', async ({ body: { instruction }, mapTails }) => answer(instruction, mapTails), {
    body: t.Object({ instruction: t.String() }),
  })
  .listen(3000);

const answer = (instruction: string, mapTails: string[][]): Promise<{ description: string }> =>
  pipe(
    of(instruction),
    logPipe('instruction'),
    chain(getPosition),
    logPipe('position'),
    map(([x, y]) => ({ description: mapTails[y - 1][x - 1] })),
    logPipe('description'),
    toPromise,
  );
