import { pipe } from 'fp-ts/function';
import { chain, map, TaskEither } from 'fp-ts/TaskEither';
import { z } from 'zod';
import { reportToHeadquarter } from '../infrustructure/headquoter';
import { get } from '../infrustructure/httpClient';
import { openAiClient } from '../infrustructure/openai';
import { toPromise } from '../util/functional.ts';
import { logPipe } from '../util/log.ts';

const robotDescriptionUrl = `${process.env.AGENTS_HEADQUARTER_URL}/data/${process.env.AI_DEV3_API_KEY}/robotid.json`;
const RobotDescription = z.object({
  description: z.string(),
});
type RobotDescription = z.infer<typeof RobotDescription>;

const getRobotDescription = (): TaskEither<Error, RobotDescription> =>
  get(robotDescriptionUrl, { responseFormat: 'json', responseSchema: RobotDescription });

await pipe(
  getRobotDescription(),
  chain(({ description }) =>
    openAiClient.generateOneImage({
      prompt: description,
      model: 'dall-e-3',
      n: 1,
      size: '1024x1024',
      response_format: 'url',
    }),
  ),
  map(({ url, revised_prompt }) => ({ url, revised_prompt })),
  logPipe('Generated image URL'),
  chain(({ url }) => reportToHeadquarter('robotid')(url)),
  toPromise,
);
