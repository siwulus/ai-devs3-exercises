import { pipe } from 'fp-ts/function';
import { map, TaskEither } from 'fp-ts/TaskEither';
import { LangfuseParent } from 'langfuse';
import { zodResponseFormat } from 'openai/helpers/zod';
import { isEmpty } from 'ramda';
import { openAiClient } from '../../infrustructure/openai';
import { extractImageUrlsMessages } from './prompts.ts';
import { ExtractImageUrlResponse, ExtractImageUrlsResponse } from './types.ts';

const extractUrls =
  (trace?: LangfuseParent) =>
  (msg: string): TaskEither<Error, ExtractImageUrlsResponse> =>
    pipe(
      openAiClient.completionWithJson(
        {
          model: 'gpt-4o',
          messages: extractImageUrlsMessages(msg, 'https://centrala.ag3nts.org/dane/barbara/'),
          response_format: zodResponseFormat(ExtractImageUrlsResponse, 'image_url_extraction'),
        },
        ExtractImageUrlsResponse,
        trace,
      ),
    );

const extractUrl =
  (trace?: LangfuseParent) =>
  (msg: string): TaskEither<Error, ExtractImageUrlResponse> =>
    pipe(
      extractUrls(trace)(msg),
      map(({ status, images }) =>
        status === 'SUCCESS' && !isEmpty(images)
          ? { status: 'SUCCESS', image: images[0] }
          : { status: 'ERROR' },
      ),
    );

export const imageUrlsExtractor = {
  extractUrls,
  extractUrl,
};
