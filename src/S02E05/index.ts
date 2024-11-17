import { sequenceS } from 'fp-ts/Apply';
import { pipe } from 'fp-ts/function';
import { ApplyPar, chain, map, TaskEither } from 'fp-ts/TaskEither';
import * as A from 'fp-ts/Array';
import path from 'path';
import { mergeRight } from 'ramda';
import { saveTextFile } from '../infrustructure/filesystem';
import { reportToHeadquarter } from '../infrustructure/headquoter';
import { convertHtmlToMarkdown } from '../infrustructure/htmlToMarkdown';
import { get } from '../infrustructure/httpClient';
import { toPromise } from '../util/functional.ts';
import { enrichArticle, getArticleAsHtml, getLinksContextBasedOnArticle } from './article.ts';
import { buildLinksDescription } from './links.ts';
import { answerAllQuestions, getQuestions } from './questions.ts';
import { LinkDescription, QuestionWithAnswer } from './types.ts';

const articleBaseUrl = `${process.env.AGENTS_HEADQUARTER_URL}/dane/`;
const articleUrl = `${articleBaseUrl}arxiv-draft.html`;
const questionsUrl = `${process.env.AGENTS_HEADQUARTER_URL}/data/${process.env.AI_DEV3_API_KEY}/arxiv.txt`;

const answerQuestions = () =>
  pipe(
    sequenceS(ApplyPar)({
      article: getArticle(articleUrl),
      questions: getQuestions(questionsUrl),
    }),
    chain(({ article, questions }) => answerAllQuestions(article, questions)),
    map(toHeadquarterFormat),
    chain(reportToHeadquarter('arxiv')),
  );

const getArticle = (url: string): TaskEither<Error, string> =>
  pipe(
    get<string>(url, { responseFormat: 'text' }),
    chain(getArticleAsHtml),
    map(convertHtmlToMarkdown({ baseUrl: articleBaseUrl })),
    chain(({ markdown: rawArticle, links }) =>
      pipe(
        getLinksContextBasedOnArticle(rawArticle),
        chain(context => buildLinksDescription(links, context.links)),
        chain((linksContext: LinkDescription[]) =>
          pipe(enrichArticle(rawArticle)(linksContext), enrichedArticle =>
            saveElementsForDebugging(rawArticle, linksContext, enrichedArticle),
          ),
        ),
      ),
    ),
  );

const saveElementsForDebugging = (
  rawArticle: string,
  linksContext: LinkDescription[],
  enrichedArticle: string,
) =>
  pipe(
    saveTextFile(path.join(__dirname, 'article'), 'rawArticle.md')(rawArticle),
    chain(() =>
      saveTextFile(path.join(__dirname, 'article'), 'context.json')(JSON.stringify(linksContext)),
    ),
    chain(() =>
      saveTextFile(path.join(__dirname, 'article'), 'enrichedArticle.md')(enrichedArticle),
    ),
    map(() => enrichedArticle),
  );

const toHeadquarterFormat = (answers: QuestionWithAnswer[]) =>
  pipe(
    answers,
    A.reduce({}, (acc, { id, answer }) => mergeRight(acc, { [id]: answer })),
  );

await pipe(answerQuestions(), toPromise);
