import { pipe } from 'fp-ts/function';
import { chain, left, of, TaskEither } from 'fp-ts/TaskEither';
import { parseHTML } from 'linkedom';
import { Document as HtmlDocument } from 'linkedom/types/interface/document';
import { URL } from 'url';
import { v4 } from 'uuid';
import { tryExecute } from '../../util/functional.ts';
import { get } from '../httpClient';
import { convertHtmlToMarkdown } from './htmlToMarkdown.ts';
import { Document } from './types.ts';

const webPageAsDocument = (url: URL): TaskEither<Error, Document> =>
  pipe(
    get<string>(url.toString(), { responseFormat: 'text' }),
    chain(getHtmlDoc),
    chain(buildDocument(url)),
  );

const getHtmlDoc = (html: string): TaskEither<Error, HtmlDocument> =>
  tryExecute('Parse html')(async () => await parseHTML(html).document);

const buildDocument =
  (url: URL) =>
  (htmlDoc: HtmlDocument): TaskEither<Error, Document> => {
    try {
      const title: string = htmlDoc.querySelector('title')?.textContent ?? '';
      const body = htmlDoc.querySelector('body');
      const { links, markdown: content } = convertHtmlToMarkdown({
        baseUrl: `${url.protocol}//${url.host}`,
      })(body);
      return of({ id: v4(), title, url: url.toString(), content, links });
    } catch (error) {
      return left(new Error('Error building document', { cause: error }));
    }
  };

export const documentService = {
  webPageAsDocument,
};
