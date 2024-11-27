import { pipe } from 'fp-ts/function';
import RA from 'fp-ts/ReadonlyArray';
import { chain, left, map, of, sequenceSeqArray, TaskEither } from 'fp-ts/TaskEither';
import { LangfuseParent } from 'langfuse';
import { Dirent } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { toFile } from 'openai';
import * as path from 'path';
import { getFileNames, saveTextFile } from '../infrustructure/filesystem';
import { reportToHeadquarter } from '../infrustructure/headquoter';
import { withTrace } from '../infrustructure/langfuse';
import { openAiClient } from '../infrustructure/openai';
import { toPromise, tryExecute } from '../util/functional.ts';
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
              chain(saveTextFile(path.join(dirPath), file.name + '.txt')),
            ),
          ),
        ),
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
        openAiClient.completionWithText(
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
//   transcribeTestimonials(path.join(__dirname, 'testimonials')),
//   toPromise,
// );

await pipe(
  witnessesQuestioning(path.join(__dirname, 'testimonials')),
  chain(reportToHeadquarter('mp3')),
  toPromise,
);
