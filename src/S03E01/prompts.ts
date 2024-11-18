import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { TextFileContent } from '../infrustructure/filesystem';

export const factsUsabilityClassificationSystemMessage: ChatCompletionMessageParam = {
  role: 'system',
  content: `
<objective>
Evaluate the given text based on the following criteria. Assign a category of "Meaningful" or "Useless" depending on the text's adherence to the category attributes
</objective>

<criteria>
Criteria for "Meaningful":
- Relevance: The text addresses a specific topic or question and aligns with its purpose.
- Accuracy: It provides verifiable facts, correct data, or logical reasoning.
- Clarity: The text is written in clear, unambiguous language.
- Depth: It contains sufficient detail or explanation to offer valuable insights.
- Actionability: It includes information that can be applied, understood, or used practically.
- Completeness: The text covers its topic adequately without critical gaps.
- Credibility: Sources or references are cited where necessary, ensuring trustworthiness.

Criteria for "Useless"
- Irrelevance: The text does not address the topic or adds no value to the context.
- Inaccuracy: It contains incorrect, outdated, or unverifiable information.
- Vagueness: It lacks clarity, detail, or specificity.
- Redundancy: It repeats common knowledge without new insights or perspectives.
- Incomplete: Critical information is missing, making the text confusing or ineffective.
- Unengaging: The text is poorly structured, making it difficult to read or follow.
</criteria>

<output_format>
- Return a single category: "Meaningful" or "Useless".
- Provide a brief explanation justifying the categorization, referencing the criteria above.
- Return response in JSON format where "category" contains the classification: "Meaningful" or "Useless", "_explanation" contains justification of selected category
</output_format>`,
};

export const reportContextSystemMessage = (
  facts: string[],
  reports: TextFileContent[],
): ChatCompletionMessageParam => ({
  role: 'system',
  content: `
<facts>
${facts.join('\n\n')}
</facts>

<surveillance_reports>
${reports.map(reportDetails).join('\n\n')}
</surveillance_reports>

You are a text analysis assistant.
<objective>
Your task is to construct a detailed context for a given text fragment based on set of facts and surveillance reports provided above.
</objective>
<rules>
- Identify the purpose, main themes, and structure of the document. Summarize key points as needed to build the context.
- Analyze the text fragment in relation to the facts and surveillance reports describe its connection to the larger context
- Collect all personal details about mentioned persons like names, surnames, professions, habits, etc.
- Add proper names, tools, programing languages, locations, animals and other relevant entities mentioned in the text
- Add surveillance observations relevant to the persons mentioned in analized text
</rules>
<output_format>
- Provide only the contextual information relevant to understanding the fragment's role in the document.
- WRITE THE OUTPUT IN POLISH
<output_format>  
 `,
});

const reportDetails = (report: TextFileContent): string => {
  const { date, name, sector } = parseReportFilename(report.name);
  return `
Raport: ${name}
Nazwa sektoru: ${sector}
Data obserwacji: ${date}
Obserwacja: ${report.text}`;
};

const parseReportFilename = (filename: string): { date: string; name: string; sector: string } => {
  const regex = /^(\d{4}-\d{2}-\d{2})_([a-zA-Z0-9-]+)-([a-zA-Z0-9_]+)\.txt$/;
  const match = filename.match(regex);

  if (!match) {
    throw new Error('Invalid filename format');
  }

  const [_, date, namePart, sector] = match;
  const name = namePart.replace(/-/g, ' ');

  return {
    date,
    name,
    sector: sector.replace(/_/g, ' '),
  };
};

export const reportKeywordsSystemMessage: ChatCompletionMessageParam = {
  role: 'system',
  content: `
<objective>
Extract keywords from the given user text that describe its content most effectively to ensure the output is as accurate and complete as possible.
<objective>

<rules>
- Focus on selecting words that capture the main themes or core concepts
- COLLECT ALL IMPORTANT OR ADDITIONAL facts and information mentioned in the text before generating the keywords
- The keywords should index persons, their jobs, roles, relations, locations, actions, memories, skills, used tools and other relevant entities
- Keywords should contain information about proper names, sector names, programming languages, tools, places, animals and other relevant entities mentioned in the text
- Keywords MUST BE  in Polish
- Each keyword MUST BE a noun in the nominative case
- DO NOT use adjectives or verbs as keywords
</rules>

<output_format>
Provide the keywords as a comma-separated list only.
</output_format>
`,
};
