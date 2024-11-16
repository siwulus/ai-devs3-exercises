import { write } from 'bun';
import * as A from 'fp-ts/Array';
import { pipe } from 'fp-ts/function';
import { map, TaskEither } from 'fp-ts/TaskEither';
import { Dirent } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import path from 'path';
import { tap, tryExecute } from '../../util/functional.ts';

export const getFileNames = (path: string, extension: string): TaskEither<Error, Dirent[]> =>
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

export const saveTextFile =
  (parentPath: string, name: string) =>
  (content: string): TaskEither<Error, string> =>
    pipe(
      tryExecute('Save file')(() => write(path.join(parentPath, name), content)),
      tap(() => console.log(`Saved file ${path.join(parentPath, name)}`)),
      map(() => path.join(parentPath, name)),
    );

export const readFileAsBase64 = (path: string): TaskEither<Error, string> =>
  pipe(tryExecute('Read file as base64url')(() => readFile(path, 'base64')));
