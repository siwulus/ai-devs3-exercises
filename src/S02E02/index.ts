import { pipe } from 'fp-ts/function';
import { chain, map, sequenceSeqArray, TaskEither } from 'fp-ts/TaskEither';
import {
  ChatCompletionContentPartImage,
  ChatCompletionMessageParam,
} from 'openai/resources/chat/completions';
import path from 'path';

import { getFileNames, readFileAsBase64 } from '../infrustructure/filesystem';
import { withTrace } from '../infrustructure/langfuse';
import { openAiClient } from '../infrustructure/openai';
import { toPromise } from '../util/functional.ts';
import { systemPrompt } from './prompt.ts';

const findCity = () =>
  withTrace({ name: 'Find city' })(trace =>
    pipe(
      getMaps(),
      map(buildPromptMessages),
      chain(messages =>
        openAiClient.completionWithFirstContent(
          { messages, model: 'gpt-4o', temperature: 0.2 },
          trace,
        ),
      ),
    ),
  );

const getMaps = (): TaskEither<Error, ChatCompletionContentPartImage[]> =>
  pipe(
    getFileNames(path.join(__dirname, 'maps'), '.jpg'),
    chain(files =>
      sequenceSeqArray(
        files.map(({ parentPath, name }) => readFileAsBase64(path.join(parentPath, name))),
      ),
    ),
    map(images =>
      images.map(base64Image => ({
        type: 'image_url',
        image_url: {
          url: `data:image/jpeg;base64,${base64Image}`,
          detail: 'high',
        },
      })),
    ),
  );

export const buildPromptMessages = (
  maps: ChatCompletionContentPartImage[],
): ChatCompletionMessageParam[] => [
  {
    role: 'system',
    content: systemPrompt,
  },
  { role: 'user', content: [{ type: 'text', text: 'Map fragments' }, ...maps] },
];

await pipe(findCity(), toPromise);
