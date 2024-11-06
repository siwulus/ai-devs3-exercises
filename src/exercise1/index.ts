import { pipe } from 'fp-ts/function';
import * as O from 'fp-ts/Option';
import { chain, fromOption, TaskEither } from 'fp-ts/TaskEither';
import { parseHTML } from 'linkedom';
import { get, post } from '../infrustructure/httpClient';
import { openAiClient } from '../infrustructure/openai';
import { mapO, toPromise, tryExecute } from '../util/functional.ts';
import { logPipe } from '../util/log.ts';

const url = 'https://xyz.ag3nts.org/';
const username = 'tester';
const password = '574e112a';

const fetchQuestion = (): TaskEither<Error, string> =>
  pipe(
    get(url, { responseFormat: 'text' }),
    chain(html => tryExecute('parse html')(async () => {
      const { document } = parseHTML(html);
      return O.fromNullable(document.querySelector('#human-question'));
    })),
    mapO(questionElement => O.fromNullable(questionElement.textContent)),
    chain(fromOption(() => new Error('Question not found'))),
    logPipe('Question: '),
  );


const findAnswer = (question: string): TaskEither<Error, string> =>
  pipe(
    openAiClient.completionWithFirstContent({
        messages: [{ role: 'system', content: 'Answer the question with number and only with number' }, {
          role: 'user',
          content: question,
        }],
        model: 'gpt-4o',
      },
    ),
    logPipe('Answer: '),
  );

const sendForm = (answer: string): TaskEither<Error, string> => {
  const formData = new FormData();
  formData.append('username', username);
  formData.append('password', password);
  formData.append('answer', answer);
  return pipe(
    post(url, formData, { payloadAsFormData: true, responseFormat: 'text' }),
    chain(html => tryExecute('parse form response')(async () => {
      const { document } = parseHTML(html);
      return O.fromNullable(document.querySelector('h2'));
    })),
    mapO(flag => O.fromNullable(flag.textContent)),
    chain(fromOption(() => new Error('Flag not found'))),
    logPipe('Flag'),
  );
};


await pipe(
  fetchQuestion(),
  chain(findAnswer),
  chain(sendForm),
  toPromise,
);