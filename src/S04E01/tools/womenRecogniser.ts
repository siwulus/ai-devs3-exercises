import { LangfuseParent } from 'langfuse';
import { openAiClient } from '../../infrustructure/openai';
import { womenDescriptionMessages } from './prompts.ts';
import { ExtractImageUrlResponse } from './types.ts';

export const describeWomen = (trace?: LangfuseParent) => (images: ExtractImageUrlResponse[]) =>
  openAiClient.completionWithText(
    {
      model: 'gpt-4o',
      messages: womenDescriptionMessages(images),
    },
    trace,
  );
