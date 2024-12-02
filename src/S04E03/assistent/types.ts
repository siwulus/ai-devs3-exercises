import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { z } from 'zod';
import { Document } from '../../infrustructure/document/types';
import { nextActionSystemPrompt } from './prompts/nextAction';
import { tools } from './tools.ts';

export class ConversationContext {
  private limit: number;
  private history: ChatCompletionMessageParam[];
  private documents: Document[];

  public constructor(
    history: ChatCompletionMessageParam[] = [],
    documents: Document[] = [],
    limit = 5,
  ) {
    this.history = history;
    this.documents = documents;
    this.limit = limit;
  }

  public getConversation(): ChatCompletionMessageParam[] {
    return [
      { role: 'system', content: nextActionSystemPrompt(tools, this.documents) },
      ...this.history,
    ];
  }

  public addDocument(document: Document) {
    this.documents.push(document);
    return this;
  }

  public addDocuments(documents: Document[]) {
    this.documents = this.documents.concat(documents);
    return this;
  }
  public getDocuments() {
    return this.documents;
  }
  public addUserMessage(content: string) {
    this.history.push({ role: 'user', content });
    return this;
  }

  public addAssistantMessage(content: string) {
    this.history.push({ role: 'assistant', content });
    return this;
  }

  public decreaseLimit() {
    this.limit -= 1;
    return this;
  }

  public setLimit(limit: number) {
    this.limit = limit;
    return this;
  }

  public limitExceeded() {
    return this.limit <= 0;
  }
}

export const ToolName = z.enum(['fetch', 'solved', 'resign']);
export type ToolName = z.infer<typeof ToolName>;

export const AssistantTool = z.object({
  name: ToolName,
  description: z.string(),
});
export type AssistantTool = z.infer<typeof AssistantTool>;

export const NextActionFetch = z.object({
  type: ToolName.refine(value => value === 'fetch'),
  urls: z.array(z.string()),
});
export type NextActionFetch = z.infer<typeof NextActionFetch>;

export const NextActionAnswer = z.object({
  type: ToolName.refine(value => value === 'solved'),
  query: z.string(),
});
export type NextActionAnswer = z.infer<typeof NextActionAnswer>;

export const NextActionResign = z.object({
  type: ToolName.refine(value => value === 'resign'),
  explanation: z.string(),
});
export type NextActionResign = z.infer<typeof NextActionResign>;

export const NextAction = z.union([NextActionFetch, NextActionAnswer, NextActionResign]);
export type NextAction = z.infer<typeof NextAction>;

export const NextActionLLMResponse = z.object({
  _thinking: z.string(),
  nextAction: NextAction,
});
export type NextActionLLMResponse = z.infer<typeof NextActionLLMResponse>;
