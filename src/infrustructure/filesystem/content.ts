import { pipe } from 'fp-ts/function';
import { map, TaskEither } from 'fp-ts/TaskEither';
import { Dirent } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'path';
import { match, P } from 'ts-pattern';
import { tryExecute } from '../../util/functional.ts';
import { AudioFileContent, ImageFileContent, TextFileContent } from './types.ts';

export const getTextFileContent = ({
  parentPath,
  name,
}: Dirent): TaskEither<Error, TextFileContent> =>
  pipe(
    tryExecute('Read file as utf-8 text')(() => readFile(path.join(parentPath, name), 'utf-8')),
    map(text => ({ parentPath, name, text })),
  );

export const getAudioFileContent = ({
  parentPath,
  name,
}: Dirent): TaskEither<Error, AudioFileContent> =>
  pipe(
    tryExecute('Read file as Buffer')(() => readFile(path.join(parentPath, name))),
    map(buffer => ({ parentPath, name, buffer })),
  );

export const getImageFileContent = ({
  parentPath,
  name,
}: Dirent): TaskEither<Error, ImageFileContent> =>
  pipe(
    tryExecute('Read file as base64url')(() => readFile(path.join(parentPath, name), 'base64')),
    map(base64Image => ({ parentPath, name, base64Url: getBase64Url(name, base64Image) })),
  );

const getBase64Url = (name: string, base64Image: string): string =>
  match(name.toLowerCase())
    .returnType<string>()
    .with(P.string.endsWith('.png'), () => `data:image/png;base64,${base64Image}`)
    .otherwise(() => `data:image/jpeg;base64,${base64Image}`);
