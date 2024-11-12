import {
  ChatCompletionContentPartImage,
  ChatCompletionMessageParam,
} from 'openai/resources/chat/completions';

export const systemPrompt = `<objective>
Identify the city name that matches best the analyzed map sections. If the match is ambiguous respond with the list of best matches
</objective>

<rules>
- Explain your thought process to illustrate your reasoning. 
- Analyze each map section individually.
- Read street names from each map fragment use them to find the correct city
- IMPORTANT potentially the most obvious match can be incorrect, rethink your answer
</rules>

<hints>
- IMPORTANT this city has granaries and forts. Use general knowledge of these features to improve accuracy. 
- IMPORTANT  the streets or roads found on one map fragment have to be located close each other otherwise can not be located on one map fragment, use your internal knowladge to verify it. It is the CLUE to fins the right answer!
</hints>

<answer_format>
[your reasoning]
<RESPONSE>final response</RESPONSE>
</answer_format>`;
