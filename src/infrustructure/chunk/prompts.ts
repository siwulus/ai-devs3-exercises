import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

export const createContextualChunkMessages = (
  chunk: string,
  document: string,
): ChatCompletionMessageParam[] => [
  {
    role: 'system',
    content: `
<document> 
${document} 
</document> 
 
 Please give a short succinct context to situate the chunk provided by the user within the overall document for the purposes of improving search retrieval of the chunk. Answer only with the succinct context and nothing else. 
 USE THE ORGINAL LANGUAGE OF THE DOCUMENT.
 Below inside tag <chunk> is the chunk we want to situate within the whole document 
`,
  },
  { role: 'user', content: `<chunk>${chunk}</chunk>` },
];
