import { pipe } from 'fp-ts/function';
import { chain, map, of, TaskEither } from 'fp-ts/TaskEither';
import { LangfuseParent } from 'langfuse';
import { isNotNil } from 'ramda';
import { z } from 'zod';
import { reportToHeadquarter } from '../../infrustructure/headquoter';
import { Command, ExtractImageUrlResponse, ExtractImageUrlsResponse } from './types.ts';
import { imageUrlsExtractor } from './urlsExtractor.ts';

const process =
  (command: Command, trace?: LangfuseParent) =>
  (fileName?: string): TaskEither<Error, string> =>
    pipe(
      of(command),
      map(command => (isNotNil(fileName) ? `${command} ${fileName}` : command)),
      chain(reportToHeadquarter('photos')),
      map(({ message }) => message),
    );

export const imageProcessor = {
  start: (trace?: LangfuseParent): TaskEither<Error, ExtractImageUrlsResponse> =>
    pipe(process('START')(), chain(imageUrlsExtractor.extractUrls(trace))),
  repair:
    (trace?: LangfuseParent) =>
    (fileName: string): TaskEither<Error, ExtractImageUrlResponse> =>
      pipe(process('REPAIR', trace)(fileName), chain(imageUrlsExtractor.extractUrl(trace))),
  darken:
    (trace?: LangfuseParent) =>
    (fileName: string): TaskEither<Error, ExtractImageUrlResponse> =>
      pipe(process('DARKEN', trace)(fileName), chain(imageUrlsExtractor.extractUrl(trace))),
  brighten:
    (trace?: LangfuseParent) =>
    (fileName: string): TaskEither<Error, ExtractImageUrlResponse> =>
      pipe(process('BRIGHTEN', trace)(fileName), chain(imageUrlsExtractor.extractUrl(trace))),
};

export const ImageProcessorParameters = z.object({
  imageUrl: z.string({ description: 'The url to user input image file' }),
});
