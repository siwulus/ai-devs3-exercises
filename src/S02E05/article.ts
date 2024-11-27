import { pipe } from 'fp-ts/function';
import { chain, TaskEither } from 'fp-ts/TaskEither';
import * as A from 'fp-ts/Array';
import { parseHTML } from 'linkedom';
import { NodeStruct } from 'linkedom/types/mixin/parent-node';
import { zodResponseFormat } from 'openai/helpers/zod';
import { openAiClient } from '../infrustructure/openai';
import { decode } from '../util/decode.ts';
import { tryExecute } from '../util/functional.ts';
import { imageContextSystemMessage } from './prompts.ts';
import { LinkDescription, LinksContext } from './types.ts';

export const getArticleAsHtml = (html: string): TaskEither<Error, NodeStruct> =>
  tryExecute('parse html')(async () => {
    const dom = await parseHTML(html);
    return dom.document.querySelector('body');
  });

export const enrichArticle =
  (markdown: string) =>
  (links: LinkDescription[]): string =>
    pipe(links, A.reduce(markdown, replaceAltText));

const replaceAltText = (acc: string, link: LinkDescription): string => {
  const regex = new RegExp(`\\[${link.id}\\]\\(([^)]+)\\)`, 'g');
  return acc.replace(regex, `[${link.description}]($1)`);
};

export const getLinksContextBasedOnArticle = (article: string) =>
  pipe(
    openAiClient.completionWithText({
      model: 'gpt-4o',
      messages: [imageContextSystemMessage, { role: 'user', content: article }],
      response_format: zodResponseFormat(LinksContext, 'links_context'),
    }),
    chain(context => decode(LinksContext)(JSON.parse(context))),
  );
