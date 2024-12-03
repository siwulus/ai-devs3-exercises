import { pipe } from 'fp-ts/function';
import { chain, left, of, TaskEither } from 'fp-ts/TaskEither';
import { match } from 'ts-pattern';
import { z } from 'zod';
import { openAiClient } from '../../infrustructure/openai';
import { instructionToPositionMessages } from './prompts.ts';

const Status = z.enum(['success', 'error']);
const PositionError = z.object({
  status: Status.refine(status => status === 'error'),
});
type PositionError = z.infer<typeof PositionError>;

const PositionSuccess = z.object({
  status: Status.refine(status => status === 'success'),
  position: z.array(z.number()).length(2),
});
type PositionSuccess = z.infer<typeof PositionSuccess>;

const Position = z.union([PositionError, PositionSuccess]);
type Position = z.infer<typeof Position>;

export const getPosition = (instruction: string): TaskEither<Error, number[]> =>
  pipe(
    openAiClient.completionWithJson(
      {
        model: 'gpt-4o',
        messages: instructionToPositionMessages(instruction),
        temperature: 0,
        response_format: { type: 'json_object' },
      },
      Position,
    ),
    chain(response =>
      match(response)
        .with({ status: 'success' }, ({ position }: PositionSuccess) => of(position))
        .with({ status: 'error' }, () => left(new Error('Failed to get position')))
        .exhaustive(),
    ),
  );
