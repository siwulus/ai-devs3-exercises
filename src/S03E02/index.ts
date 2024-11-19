import * as A from 'fp-ts/Array';
import { pipe } from 'fp-ts/function';
import * as RA from 'fp-ts/ReadonlyArray';
import { chain, map, sequenceSeqArray, TaskEither } from 'fp-ts/TaskEither';
import { LangfuseParent } from 'langfuse';
import path from 'path';
import { isEmpty } from 'ramda';
import { v4 } from 'uuid';
import { getContextualChunk } from '../infrustructure/chunk';
import { TextFileContent } from '../infrustructure/filesystem';
import { getTextFilesContent } from '../infrustructure/filesystem/content.ts';
import { reportToHeadquarter } from '../infrustructure/headquoter';
import { withTrace } from '../infrustructure/langfuse';
import { vectorService } from '../infrustructure/qdrant';
import { Chunk } from '../model/chunk.ts';
import { toPromise } from '../util/functional.ts';
import { logPipe } from '../util/log.ts';

type ChunksWithDocument = { document: TextFileContent; chunks: Chunk[] };
const docsDir = path.join(__dirname, 'weapons');

const playWithVectors = (): TaskEither<Error, any> =>
  withTrace({ name: 'Play with Vectors' })(trace =>
    pipe(
      vectorService.deleteAll(),
      chain(() => getDocuments(docsDir)),
      map(documents => documents.map(extractChunks)),
      chain(getContextualChunks(trace)),
      chain(chunks => sequenceSeqArray(chunks.map(vectorService.addChunk(trace)))),
      chain(() =>
        vectorService.search(trace)(
          'W raporcie, z którego dnia znajduje się wzmianka o kradzieży prototypu broni',
          1,
        ),
      ),
      logPipe('Found chunk'),
      map(result => result[0].metadata.date),
      logPipe('Date of the report'),
      chain(reportToHeadquarter('wektory')),
    ),
  );

const getDocuments = (dirPath: string) => getTextFilesContent(dirPath);

const extractChunks = (document: TextFileContent): ChunksWithDocument =>
  pipe(
    document.text.split('\n'),
    A.filter(line => !isEmpty(line.trim())),
    A.map(content => ({
      id: v4(),
      documentId: document.name,
      content,
      metadata: {
        date: document.name.split('.')[0].replace(/_/g, '-'),
        docPath: document.parentPath,
        docName: document.name,
      },
    })),
    A.reduce({ document, chunks: [] } as ChunksWithDocument, (acc, chunk) => ({
      document: acc.document,
      chunks: [...acc.chunks, chunk],
    })),
  );

const getContextualChunks =
  (trace?: LangfuseParent) =>
  (chunksDocs: ChunksWithDocument[]): TaskEither<Error, Chunk[]> =>
    pipe(
      sequenceSeqArray(
        chunksDocs.map(({ document, chunks }) =>
          sequenceSeqArray(chunks.map(chunk => getContextualChunk(trace)(chunk, document.text))),
        ),
      ),
      map(RA.flatten),
      map(RA.toArray),
    );

await pipe(playWithVectors(), toPromise);
