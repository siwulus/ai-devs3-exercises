import { write } from 'bun';
import * as A from 'fp-ts/Array';
import RA from 'fp-ts/ReadonlyArray';
import { pipe } from 'fp-ts/function';
import { chain, left, map, of, sequenceSeqArray, TaskEither } from 'fp-ts/TaskEither';
import { LangfuseParent } from 'langfuse';
import { Dirent } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { toFile } from 'openai';
import * as path from 'path';
import { reportToHeadquarter } from '../infrustructure/headquoter';
import { withTrace } from '../infrustructure/langfuse';
import { openAiClient } from '../infrustructure/openai';
import { tap, toPromise, tryExecute } from '../util/functional.ts';
import { buildSystemPrompt } from './prompt.ts';

const transcribeTestimonials = (dirPath: string) =>
  withTrace({ name: 'Transcribe testimonials' })(trace =>
    pipe(
      getFileNames(dirPath, '.m4a'),
      chain(files =>
        sequenceSeqArray(
          files.map(file =>
            pipe(
              transcribeTestimonial(file, trace),
              chain(saveFile(path.join(dirPath), file.name + '.txt')),
            ),
          ),
        ),
      ),
    ),
  );

const getFileNames = (path: string, extension: string): TaskEither<Error, Dirent[]> =>
  pipe(
    tryExecute('Read testimonials audio directory')(() => readdir(path, { withFileTypes: true })),
    map(dirents =>
      pipe(
        dirents,
        A.filter(v => v.isFile()),
        A.filter(v => v.name.endsWith(extension)),
      ),
    ),
  );

const transcribeTestimonial = (
  { parentPath, name }: Dirent,
  trace: LangfuseParent,
): TaskEither<Error, string> =>
  pipe(
    tryExecute('Read testimonial')(() => readFile(path.join(parentPath, name))),
    chain(buffer => tryExecute('Testimonial to OpenAI file')(() => toFile(buffer, name))),
    chain(file =>
      openAiClient.speachToText(
        {
          file,
          model: 'whisper-1',
          language: 'pl',
        },
        trace,
      ),
    ),
  );

const saveFile =
  (parentPath: string, name: string) =>
  (content: string): TaskEither<Error, string> =>
    pipe(
      tryExecute('Save file')(() => write(path.join(parentPath, name), content)),
      tap(() => console.log(`Saved file ${path.join(parentPath, name)}`)),
      map(() => path.join(parentPath, name)),
    );

const getTestimonials = (dirPath: string): TaskEither<Error, string[]> =>
  pipe(
    getFileNames(dirPath, '.txt'),
    chain(files =>
      sequenceSeqArray(
        files.map(({ parentPath, name }) => getTestimonial(path.join(parentPath, name))),
      ),
    ),
    map(RA.toArray),
  );

const getTestimonial = (path: string): TaskEither<Error, string> =>
  pipe(tryExecute('Read testimonial')(() => readFile(path, { encoding: 'utf-8' })));

const witnessesQuestioning = (testimonialsPath: string): TaskEither<Error, string> =>
  withTrace({ name: 'Witnesses questioning' })(trace =>
    pipe(
      getTestimonials(testimonialsPath),
      chain(testimonials =>
        openAiClient.completionWithFirstContent(
          {
            messages: [
              { role: 'system', content: buildSystemPrompt(testimonials) },
              {
                role: 'user',
                content: `Andrzej Maj works on university, try to deduce the street name of his faculty or institute where he belongs. Answer only with street name`,
              },
            ],
            model: 'gpt-4o',
          },
          trace,
        ),
      ),
      chain(extractAnswer),
    ),
  );

const extractAnswer = (text: string): TaskEither<Error, string> => {
  const match = text.match(/<ANSWER>(.*?)<\/ANSWER>/);
  return match ? of(match[1]) : left(new Error('Answer not found'));
};

// await pipe(
//   transcribeTestimonials(path.join(process.cwd(), 'src', 'S02E01', 'testimonials')),
//   toPromise,
// );

await pipe(
  witnessesQuestioning(path.join(process.cwd(), 'src', 'S02E01', 'testimonials')),
  chain(reportToHeadquarter('mp3')),
  toPromise,
);
