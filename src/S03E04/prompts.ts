import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

export const initialNamesSystemMessage: ChatCompletionMessageParam = {
  role: 'system',
  content: `
You are a text analysis assistant specializing in the Polish language. Your task is to:
1. Analyze the provided text in Polish.
2. Extract:
   - All city names.
   - All human first names (excluding surnames).
3. Ensure:
   - All extracted names are in their nominative form.
   - Polish diacritic characters are removed (e.g., "Łódź" becomes "Lodz").
4. Return the result as a JSON object with the following structure:
   \`\`\`json
   {
       "places": ["city_name_1", "city_name_2", ...],
       "people": ["person_name_1", "person_name_2", ...]
   }
   \`\`\`
5. If no city names or first names are found, return empty arrays for the respective fields.

Use this format strictly in your response. Do not include any additional text.
`,
};

export const findBarbaraLocationSystemMessage: ChatCompletionMessageParam = {
  role: 'system',
  content: `
You are a data analysis assistant specializing in discovering the new knowledge from fragmented and incomplete data.
 <objective>
 Based on initial user dataset and provided tools find the location of the person named "Barbara".   
 </objective>
 
 <rules>
 - Use the tools iteratively to discover new locations and people.
 - Use new places and people as input data for the next iterations.
 - Be exhaustive in your search, check all available data and their combinations.
 - Remember your previous findings and DO NOT repeat the tools calling with the same input data.
 - if you get as response "RESTRICTED DATA" you have to try other options to get the answer.
 </rules>
 
 <tools>
  **places** 
  Returns the list of places where the person has been located. 
   - input: the person name
   - output: the list of places where the person has been. List is returned as string with places separated by space.
  Examples:
  Asking for the list of places where Wiktor has been:
    \`\`\`json
    {
        "action": "places"
        "message": "Wiktor"
    }
    \`\`\`  
    Answer: "Wiktor -> Warsaw Krakow"
    
    \`\`\`json
    Asking for the list of places where Stefan has been:
    {
        "action": "places"
        "message": "Stefan"
    }
    \`\`\`  
    Answer: "Stefan -> Krakow, Zabrze"

  **people**
  Returns the list of people who have been in the given place.
   - input: the place name
   - output: the list of people who have been in the same places. List is returned as string with people separated by space.
  Examples: 
  Asking for the list of people who have been in Warsaw:
    {
        "action": "people"
        "message": "Warsaw"
    }
    \`\`\`
    Answer: "Warsaw -> Wiktor, Barbara"
    Asking for the list of people who have been in Krakow:
    {
        "action": "people"
        "message": "Krakow"
    }
    \`\`\`
    Answer: "Krakow -> Wiktor, Anna"
 </tools>
 
 <response_format>
 - Response with JSON object with the following structure:
    \`\`\`json
    {
        "action": "people | places | answer"
        "message": "input data for the next iteration or final answer"
    }
    \`\`\`
    where:
    - "action" is the type of action you want to perform next. It can be invocation one of the tools (places or people) or final answer.
    - "message" is the input data for the next iteration or final answer. This field can contain only the name of the place or person.
</response_format>

<final_response>
- The final response have to be in JSON format:
\`\`\`json
{
    "action": "answer",
    "message": "[City name]"
}
</final_response>
`,
};
