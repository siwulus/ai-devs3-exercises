import { pipe } from 'fp-ts/function';
import * as RA from 'fp-ts/ReadonlyArray';
import { chain, map, sequenceSeqArray, TaskEither } from 'fp-ts/TaskEither';
import { match } from 'ts-pattern';
import { OnLinkData } from '../infrustructure/htmlToMarkdown';
import { get } from '../infrustructure/httpClient';
import { openAiClient, toOpenAiFile } from '../infrustructure/openai';
import {
  previewImageSystemMessage,
  refineImageDescriptionSystemMessage,
  refineImageDescriptionUserMessageText,
} from './prompts.ts';
import {
  AudioLinkDescription,
  ImageLinkDescription,
  LinkContext,
  LinkDescription,
} from './types.ts';

export const buildLinksDescription = (
  links: OnLinkData[],
  linksContext: LinkContext[],
): TaskEither<Error, LinkDescription[]> =>
  pipe(sequenceSeqArray(links.map(buildLinkDescription(linksContext))), map(RA.toArray));

const buildLinkDescription =
  (linksContext: LinkContext[]) =>
  (link: OnLinkData): TaskEither<Error, LinkDescription> =>
    match(link)
      .with({ type: 'audio' }, buildAudioLinkDescription)
      .with({ type: 'image' }, buildImageLinkDescription(linksContext))
      .exhaustive();

const buildAudioLinkDescription = (link: OnLinkData): TaskEither<Error, AudioLinkDescription> =>
  pipe(
    get<Buffer>(link.url, { responseFormat: 'buffer' }),
    chain(buffer => toOpenAiFile(buffer, link.url.split('/').pop() ?? '')),
    chain(file => openAiClient.speachToText({ file, language: 'pl', model: 'whisper-1' })),
    map(description => ({ ...link, type: 'audio', description })),
  );

const buildImageLinkDescription =
  (linksContext: LinkContext[]) =>
  (link: OnLinkData): TaskEither<Error, ImageLinkDescription> =>
    pipe(
      get<Buffer>(link.url, { responseFormat: 'buffer' }),
      map(buffer => buffer.toString('base64')),
      map(base64 => `data:image/${link.url.split('.').pop() ?? 'jpeg'};base64,${base64}`),
      chain(base64Url =>
        pipe(
          buildPreview(link, base64Url),
          map(preview => ({ preview, context: collectContext(link.id, linksContext) })),
          chain(({ preview, context }) =>
            refineImageLinkDescription(link, preview, context, base64Url),
          ),
        ),
      ),
    );

const buildPreview = (link: OnLinkData, base64Url: string) =>
  openAiClient.completionWithFirstContent({
    model: 'gpt-4o',
    messages: [
      previewImageSystemMessage,
      {
        role: 'user',
        content: [{ type: 'image_url', image_url: { url: base64Url, detail: 'high' } }],
      },
    ],
  });

const collectContext = (id: string, linksContext: LinkContext[]): string =>
  linksContext.find(({ id: contextId }) => contextId === id)?.context ?? '';

const refineImageLinkDescription = (
  link: OnLinkData,
  preview: string,
  context: string,
  base64Url: string,
): TaskEither<Error, ImageLinkDescription> =>
  pipe(
    openAiClient.completionWithFirstContent({
      model: 'gpt-4o',
      messages: [
        refineImageDescriptionSystemMessage,
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: base64Url, detail: 'high' },
            },
            {
              type: 'text',
              text: refineImageDescriptionUserMessageText(preview, context),
            },
          ],
        },
      ],
    }),
    map(description => ({ ...link, type: 'image', preview, context, description })),
  );
