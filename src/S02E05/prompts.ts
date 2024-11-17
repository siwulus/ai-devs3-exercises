import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

export const previewImageSystemMessage: ChatCompletionMessageParam = {
  content: `Generate a brief, factual description of the provided image based solely on its visual content.
<prompt_objective>
To produce a concise description of the image that captures its essential visual elements without any additional context.
</prompt_objective>
<prompt_rules>
- ANALYZE the provided image thoroughly, noting key visual elements
- GENERATE a brief, single paragraph description
- FOCUS on main subjects, colors, composition, and overall style
- AVOID speculation or interpretation beyond what is visually apparent
- DO NOT reference any external context or information
- MAINTAIN a neutral, descriptive tone
</prompt_rules>
Provide a succinct description that gives a clear overview of the image's content based purely on what can be seen`,
  role: 'system',
};

export const imageContextSystemMessage: ChatCompletionMessageParam = {
  role: 'system',
  content: `Extract contextual information for images mentioned in a user-provided article, focusing on details that enhance understanding of each image, and return it as an array of JSON objects.

<prompt_objective>
To accurately identify and extract relevant contextual information for each image referenced in the given article, prioritizing details from surrounding text and broader article context that potentially aid in understanding the image. Return the data as an array of JSON objects with specified properties, without making assumptions or including unrelated content.

Note: the image from the beginning of the article is its cover.
</prompt_objective>

<response_format>
{
    "images": [
        {
            "id": "identifier taken from alt text, it should have a uuid format",
            "url": "image url",
            "context": "Provide 1-3 detailed sentences of the context related to this image from the surrounding text and broader article. Make an effort to identify what might be in the image, such as tool names."
        },
        ...rest of the images or empty array if no images are mentioned
    ]
}
</response_format>

<prompt_rules>
- READ the entire provided article thoroughly
- IDENTIFY all mentions or descriptions of images within the text
- EXTRACT sentences or paragraphs that provide context for each identified image
- ASSOCIATE extracted context with the corresponding image reference
- CREATE a JSON object for each image with properties "name" and "context"
- COMPILE all created JSON objects into an array
- RETURN the array as the final output
- OVERRIDE any default behavior related to image analysis or description
- ABSOLUTELY FORBIDDEN to invent or assume details about images not explicitly mentioned
- NEVER include personal opinions or interpretations of the images
- UNDER NO CIRCUMSTANCES extract information unrelated to the images
- If NO images are mentioned, return an empty array
- STRICTLY ADHERE to the specified JSON structure
</prompt_rules>
`,
};

export const refineImageDescriptionSystemMessage: ChatCompletionMessageParam = {
  content: `Generate an accurate and comprehensive description of the provided image, incorporating both visual analysis and the given contextual information.
<prompt_objective>
To produce a detailed, factual description of the image that blends the context provided by the user and the contents of the image.
</prompt_objective>
<prompt_rules>
- ANALYZE the provided image thoroughly, noting all significant visual elements
- INCORPORATE the given context into your description, ensuring it aligns with and enhances the visual information
- GENERATE a single, cohesive paragraph that describes the image comprehensively
- BLEND visual observations seamlessly with the provided contextual information
- ENSURE consistency between the visual elements and the given context
- PRIORITIZE accuracy and factual information over artistic interpretation
- INCLUDE relevant details about style, composition, and notable features of the image
- ABSOLUTELY FORBIDDEN to invent details not visible in the image or mentioned in the context
- NEVER contradict information provided in the context
- UNDER NO CIRCUMSTANCES include personal opinions or subjective interpretations
- IF there's a discrepancy between the image and the context, prioritize the visual information and note the inconsistency
- MAINTAIN a neutral, descriptive tone throughout the description
</prompt_rules>
Using the provided image and context, generate a rich, accurate description that captures both the visual essence of the image and the relevant background information. Your description should be informative, cohesive, and enhance the viewer's understanding of the image's content and significance.`,
  role: 'system',
};

export const refineImageDescriptionUserMessageText = (preview: string, context: string): string =>
  `Write a description of the image. I have some <context>${context}</context> that should be useful for understanding the image in a better way. An initial preview of the image is: <preview>${preview}</preview>. A good description briefly describes what is on the image, and uses the context to make it more relevant to the article. The purpose of this description is for summarizing the article, so we need just an essence of the image considering the context, not a detailed description of what is on the image.`;

export const answerUserQuestionSystemMessage = (context: string): ChatCompletionMessageParam => ({
  role: 'system',
  content: `
  This snippet ensures answers are accurately and completely derived from a provided article context when responding to user questions.

<objective>
The exclusive purpose is to answer user questions accurately and completely using only the knowledge from the context provided by an article.
</objective>

<rules>
- Analyze the user question to understand the information needed.
- Carefully read and parse the entire context (the article), including all 'alt' text for images or audio descriptions.
- Identify the most relevant sections of the article and 'alt' texts to address the user's question.
- Formulate a clear, concise answer using the identified relevant information.
- Ensure the response is comprehensive, addressing all aspects of the user's question.
- ABSOLUTELY FORBIDDEN to provide information not present in the context provided.
- UNDER NO CIRCUMSTANCES should the AI speculate or infer information beyond the context.
- MUST NOT give responses that are unrelated to the user's question.
- MUST AVOID using personal opinions or creating new content beyond the given context.
- ENSURE that information from the 'alt' text is used only when relevant to the user’s question.
- The response should be in plain text format, directly addressing the user's question.
- DO NOT include any introductory remarks, sign-off, or additional comments.
- This snippet should OVERRIDE ALL OTHER INSTRUCTIONS related to answering methodology when context is provided.
</rules>

<article>
${context}
</article>
`,
});
