import { sequenceS } from 'fp-ts/Apply';
import { pipe } from 'fp-ts/function';
import RA from 'fp-ts/ReadonlyArray';
import {
  ApplyPar,
  chain,
  map,
  of,
  sequenceArray,
  sequenceSeqArray,
  TaskEither,
} from 'fp-ts/TaskEither';
import { LangfuseParent } from 'langfuse';
import { zodResponseFormat } from 'openai/helpers/zod';
import path from 'path';
import { z } from 'zod';
import {
  AudioFileContent,
  getAudioFileContent,
  getFileNames,
  getImageFileContent,
  getTextFileContent,
  ImageFileContent,
  TextFileContent,
} from '../infrustructure/filesystem';
import { reportToHeadquarter } from '../infrustructure/headquoter';
import { withTrace } from '../infrustructure/langfuse';
import { openAiClient, toOpenAiFile } from '../infrustructure/openai';
import { decode } from '../util/decode.ts';
import { toPromise } from '../util/functional.ts';
import { logPipe } from '../util/log.ts';
import { ClassificationResponse, classificationSystemPrompt, systemOcrPrompt } from './prompts.ts';

const Category = z.enum(['people', 'hardware', 'other']);
const CategorizedReport = z.object({
  name: z.string(),
  content: z.string(),
  category: Category,
});
type CategorizedReport = z.infer<typeof CategorizedReport>;
const Report = CategorizedReport.omit({ category: true });
type Report = z.infer<typeof Report>;
type FilesContent = { txt: TextFileContent[]; audio: AudioFileContent[]; img: ImageFileContent[] };

const categorizeReports = (dirPath: string) =>
  withTrace({ name: 'Categorize Reports' })(trace =>
    pipe(
      readFiles(dirPath),
      chain(toReports(trace)),
      chain(categorize(trace)),
      logPipe('Categorized reports'),
      map(toResponseFormat),
      logPipe('Response format'),
      chain(reportToHeadquarter('kategorie')),
    ),
  );

const readFiles = (dirPath: string): TaskEither<Error, FilesContent> =>
  sequenceS(ApplyPar)({
    txt: readTextFiles(dirPath),
    audio: readAudioFiles(dirPath),
    img: readImageFiles(dirPath),
  });

const readTextFiles = (dirPath: string): TaskEither<Error, TextFileContent[]> =>
  pipe(
    getFileNames(dirPath, '.txt'),
    chain(dirents => sequenceArray(dirents.map(getTextFileContent))),
    map(RA.toArray),
  );

const readAudioFiles = (dirPath: string): TaskEither<Error, AudioFileContent[]> =>
  pipe(
    getFileNames(dirPath, '.mp3'),
    chain(dirents => sequenceArray(dirents.map(getAudioFileContent))),
    map(RA.toArray),
  );

const readImageFiles = (dirPath: string): TaskEither<Error, ImageFileContent[]> =>
  pipe(
    getFileNames(dirPath, '.png'),
    chain(dirents => sequenceArray(dirents.map(getImageFileContent))),
    map(RA.toArray),
  );

const toReports =
  (trace: LangfuseParent) =>
  ({ txt, img, audio }: FilesContent): TaskEither<Error, Report[]> =>
    pipe(
      sequenceSeqArray([
        ...txt.map(toTxtReport),
        ...audio.map(toAudioReport(trace)),
        ...img.map(toImageReport(trace)),
      ]),
      map(RA.toArray),
    );

const toTxtReport = (txt: TextFileContent): TaskEither<Error, Report> =>
  of({ name: txt.name, content: txt.text });

const toAudioReport =
  (trace: LangfuseParent) =>
  (audio: AudioFileContent): TaskEither<Error, Report> =>
    pipe(
      toOpenAiFile(audio.buffer, audio.name),
      chain(file => openAiClient.speachToText({ file, model: 'whisper-1', language: 'en' }, trace)),
      map(content => ({ name: audio.name, content })),
    );

const toImageReport =
  (trace: LangfuseParent) =>
  (image: ImageFileContent): TaskEither<Error, Report> =>
    pipe(
      openAiClient.completionWithText(
        {
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemOcrPrompt },
            {
              role: 'user',
              content: [{ type: 'image_url', image_url: { url: image.base64Url, detail: 'high' } }],
            },
          ],
        },
        trace,
      ),
      map(content => ({ name: image.name, content })),
    );

const categorize =
  (trace: LangfuseParent) =>
  (reports: Report[]): TaskEither<Error, CategorizedReport[]> =>
    pipe(sequenceArray(reports.map(report => categorizeReport(report, trace))), map(RA.toArray));

const categorizeReport = (
  report: Report,
  trace: LangfuseParent,
): TaskEither<Error, CategorizedReport> =>
  pipe(
    openAiClient.completionWithText(
      {
        model: 'gpt-4o',
        temperature: 0.3,
        response_format: zodResponseFormat(ClassificationResponse, 'classification_response'),
        messages: [
          { role: 'system', content: classificationSystemPrompt },
          { role: 'user', content: report.content },
        ],
      },
      trace,
    ),
    chain(response => decode(ClassificationResponse)(JSON.parse(response))),
    map(classification => ({ ...report, ...classification })),
  );

const toResponseFormat = (reports: CategorizedReport[]): Record<string, string[]> => ({
  people: reports
    .filter(r => r.category === 'people')
    .map(r => r.name)
    .toSorted(),
  hardware: reports
    .filter(r => r.category === 'hardware')
    .map(r => r.name)
    .toSorted(),
});

await pipe(categorizeReports(path.join(__dirname, 'reports')), toPromise);
