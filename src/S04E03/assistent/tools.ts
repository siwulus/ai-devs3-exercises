import { pipe } from 'fp-ts/function';
import * as RA from 'fp-ts/ReadonlyArray';
import { chain, map, of, sequenceArray, TaskEither } from 'fp-ts/TaskEither';
import { LangfuseParent } from 'langfuse';
import { documentService } from '../../infrustructure/document';
import { Document } from '../../infrustructure/document/types.ts';
import { openAiClient } from '../../infrustructure/openai';
import { answerSystemPrompt } from './prompts/answer.ts';
import { AssistantTool, ConversationContext } from './types.ts';

export const tools: AssistantTool[] = [
  {
    name: 'fetch',
    description: `Use this to load resources' content from given URLs. 
    It is helpful when the conversation context lacks enough information to answer the user's question but includes links to external resources that might provide relevant details. 
    REQUIRED PARAMETERS: "urls", and array of urls to fetch content from.
    Usage example: { "type": "fetch", "urls": ["https://example.com/article1.txt", "https://example.com/article2.txt"] }`,
  },
  {
    name: 'solved',
    description: `Use to provide the final answer to the user. 
      IMPORTANT: before selecting this tool DOUBLE CHECK if the context is sufficient to answer the user query. If not use the "fetch" tool to load the required information.
      HINT: If attached documents do not answer the user query, check carefully links to sub-documents. Fetch them and try to answer the query again.
      REQUIRED PARAMETERS: "query", Rephrase the user query for which you try to answer.
      Usage example: { "type": "solved", "query": "[What are the the key features of the latest smartphones?]" }`,
  },
  {
    name: 'resign',
    description: `Use to inform the user that even after many tries of collecting required information with "fetch" tool you are not able to answer the query. 
      IMPORTANT: Use this tool ONLY when you are sure that giving the correct the answer is not possible. Before resigning DOUBLE CHECK if the collected documents can help in the correct answer or still there are some linked documents not fetch before. 
      REQUIRED PARAMETERS: "explanation", your explanation why yoy resigned from giving the answer.
      Usage example: { "type": "resign", "explanation": "I'm sorry, but I couldn't find any relevant information to answer your question." }`,
  },
];
