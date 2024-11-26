import { pipe } from 'fp-ts/function';
import { map, TaskEither } from 'fp-ts/TaskEither';
import { z } from 'zod';
import { get, post } from '../infrustructure/httpClient';

const initialDataUrl = `${process.env.AGENTS_HEADQUARTER_URL}/dane/barbara.txt`;
const placesUrl = `${process.env.AGENTS_HEADQUARTER_URL}/places`;
const peopleUrl = `${process.env.AGENTS_HEADQUARTER_URL}/people`;
const payload = (query: string) => ({ apikey: process.env.AI_DEV3_API_KEY, query });
const Response = z.object({
  code: z.number(),
  message: z.string(),
});

export const getInitialInformation = (): TaskEither<Error, string> =>
  get<string>(initialDataUrl, { responseFormat: 'text' });

const tools =
  (url: string) =>
  (name: string): TaskEither<Error, string> =>
    pipe(
      post(url, payload(name), { responseSchema: Response }),
      map(({ code, message }) =>
        code === 0 ? `${name} -> ${message}` : `[ERROR: ${code} - ${message}]`,
      ),
    );

export const searchPlaces = tools(placesUrl);
export const searchPeople = tools(peopleUrl);
