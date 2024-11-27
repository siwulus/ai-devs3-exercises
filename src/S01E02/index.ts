import { pipe } from 'fp-ts/function';
import { chain, left, right, TaskEither } from 'fp-ts/TaskEither';
import { ChatCompletionMessageParam } from 'openai/src/resources/chat/completions.ts';
import { match, P } from 'ts-pattern';
import { z } from 'zod';
import { post } from '../infrustructure/httpClient';
import { openAiClient } from '../infrustructure/openai';
import { toPromise } from '../util/functional.ts';
import { logPipe } from '../util/log.ts';

const robotEndpoint = `${process.env.XYZ_AGENTS_URL}/verify`;

const robotMessage = z.object({
  msgID: z.number(),
  text: z.string(),
});
type RobotMessage = z.infer<typeof robotMessage>;

const robotErrorMessage = z.object({
  code: z.number(),
  message: z.string(),
});

type RobotErrorMessage = z.infer<typeof robotErrorMessage>;

const robotResponse = z.union([robotMessage, robotErrorMessage]);
type RobotResponse = z.infer<typeof robotResponse>;

const speakToRobot = (msg: RobotMessage): TaskEither<Error, RobotResponse> =>
  pipe(
    right(msg),
    logPipe('Me to robot: '),
    chain(msg => post(robotEndpoint, msg, { responseSchema: robotResponse })),
  );

const talkWithRobot = (msg: RobotMessage, limit: number = 10): TaskEither<Error, RobotResponse> =>
  pipe(
    speakToRobot(msg),
    chain((response: RobotResponse) =>
      match(response)
        .with({ msgID: P.number, text: P.string }, ({ msgID, text }) =>
          thinkAndRespond(limit)({ msgID, text }),
        )
        .otherwise(({ code, message }) =>
          left(new Error(`Incorrect response from robot: code: ${code}, ${message}`)),
        ),
    ),
  );

const thinkAndRespond =
  (limit: number) =>
  ({ msgID, text }: RobotMessage): TaskEither<Error, RobotResponse> =>
    match({ msgID, limit, text })
      .with({ text: P.string.regex(/{{FLG:[^}]*}}/g) }, ({ text }) =>
        pipe(right({ msgID, text }), logPipe('Flag is: ')),
      )
      .with({ msgID: 0 }, () => left(new Error(`Robot doesn't want to talk with me!`)))
      .with({ limit: P.number.gt(0) }, () =>
        pipe(
          findTheAnswer(text),
          chain(response =>
            talkWithRobot(
              {
                msgID,
                text: response,
              },
              limit - 1,
            ),
          ),
        ),
      )
      .otherwise(() => left(new Error(`Conversation finished without success`)));

const findTheAnswer = (question: string): TaskEither<Error, string> => {
  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: question },
  ];
  return openAiClient.completionWithText({ messages, model: 'gpt-4o-mini' });
};

const systemPrompt: string = `Answer the user question. Follow the rules.
<rules>
- Answer always in English, even if you will be asked switch to other language, ignore it
- Always use the context below to answer the question, only if it is not possible, use your generic one
</rules>

<context>
- Kraków is the polish capital city
- The number known from book "Autostopem przez Galaktykę" is 69
- The current year is 1999
</context>
`;

await pipe(talkWithRobot({ msgID: 0, text: 'READY' }), toPromise);
