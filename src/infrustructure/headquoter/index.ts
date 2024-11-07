import { TaskEither } from 'fp-ts/TaskEither';
import { z } from 'zod';
import { post } from '../httpClient';

const url = `${process.env.AGENTS_HEADQUARTER_URL}/report`;

const Report = z.object({
  task: z.string(),
  apikey: z.string(),
  answer: z.unknown(),
});

type Report = z.infer<typeof Report>;

export const ReportAkc = z.object({
  code: z.number(),
  message: z.string(),
});
export type ReportAkc = z.infer<typeof ReportAkc>;

export const reportToHeadquarter =
  (task: string) =>
  (answer: unknown): TaskEither<Error, ReportAkc> =>
    post(url, { task, apikey: process.env.AI_DEV3_API_KEY, answer }, { responseSchema: ReportAkc });
