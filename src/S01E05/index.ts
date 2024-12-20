import { pipe } from 'fp-ts/function';
import { chain, TaskEither } from 'fp-ts/TaskEither';
import { LangfuseParent } from 'langfuse';
import { reportToHeadquarter } from '../infrustructure/headquoter';
import { get } from '../infrustructure/httpClient';
import { withTrace } from '../infrustructure/langfuse';
import { customOpenAiClient } from '../infrustructure/openai';
import { toPromise } from '../util/functional.ts';
import { logPipe } from '../util/log.ts';
import { systemPrompt } from './prompt.ts';

const inputDataUrl = `${process.env.AGENTS_HEADQUARTER_URL}/data/${process.env.AI_DEV3_API_KEY}/cenzura.txt`;
const openAiClient = customOpenAiClient({ baseURL: process.env.LM_STUDIO_BASE_URL });

const getData = (url: string): TaskEither<Error, string> => get(url, { responseFormat: 'text' });

const anonymizeData =
  (langfuseParent: LangfuseParent) =>
  (data: string): TaskEither<Error, string> =>
    pipe(
      openAiClient.completionWithFirstContent(
        {
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: data,
            },
          ],
          model: 'llama-3.2-3b-instruct:2',
          //model: 'gemma-2-2b-it',
        },
        langfuseParent,
      ),
    );

await pipe(
  withTrace({ name: 'AnonymizeData' })(trace =>
    pipe(
      getData(inputDataUrl),
      chain(anonymizeData(trace)),
      logPipe('Anonymised'),
      chain(reportToHeadquarter('CENZURA')),
    ),
  ),
  toPromise,
);
