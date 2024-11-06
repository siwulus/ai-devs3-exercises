import * as E from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';
import * as O from 'fp-ts/Option';
import { chain, fromEither, map, TaskEither } from 'fp-ts/TaskEither';
import { parseHTML } from 'linkedom';
import { OpenAI } from 'openai';
import { chainO, chainOS, mapO, tap, toPromise, tryExecute } from '../util/functional.ts';

const url = 'https://xyz.ag3nts.org/';
const username = 'tester';
const password = '574e112a';

const fetchQuestion = (): TaskEither<Error, O.Option<string>> =>
  pipe(
    tryExecute(() => fetch(url)),
    chain(response => tryExecute(() => response.text())),
    chain(html => fromEither(E.tryCatch(() => parseHTML(html), e => e as Error))),
    map(({ document }) => O.fromNullable(document.querySelector('#human-question'))),
    mapO(questionElement => O.fromNullable(questionElement.textContent)),
    tap(console.log),
  );


const askLLM = (question: string): TaskEither<Error, O.Option<string>> =>
  pipe(
    tryExecute(() => new OpenAI().chat.completions.create({
        messages: [{ role: 'system', content: 'Answer the question with number and only with number' }, {
          role: 'user',
          content: question,
        }],
        model: 'gpt-4o',
      },
    )),
    map(response => O.fromNullable(response.choices[0].message.content)),
    tap(console.log),
  );

const sendForm = (answer: string): TaskEither<Error, void> =>
  pipe(
    tryExecute(() => {
      const formData = new FormData();
      formData.append('username', username);
      formData.append('password', password);
      formData.append('answer', answer);
      return fetch(url, {
        method: 'POST',
        body: formData,
      });
    }),
    chain(response => tryExecute(() => response.text())),
    tap(console.log),
    chain(html => fromEither(E.tryCatch(() => parseHTML(html), e => e as Error))),
    map(({ document }) => O.fromNullable(document.querySelector('h2'))),
    mapO(flag => O.fromNullable(flag.textContent)),
    tap(console.log),
  );

await pipe(
  fetchQuestion(),
  chainO(askLLM),
  chainOS(sendForm),
  toPromise,
);