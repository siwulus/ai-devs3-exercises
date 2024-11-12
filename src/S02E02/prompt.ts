export const systemPrompt = `
<objective>
Extract details such as street names, points of interest, route numbers, and stations from attached images to identify the corresponding city in Poland that is renowned for its historic forts and granaries.
</objective>

<rules>
- Explain your thought process to illustrate your reasoning. 
- Analyze each map section individually.
- Extract information from attached images with precision, focusing on street names, POIs, routes, and transportation stations.
- Cross-reference extracted data with known information about major cities in Poland, emphasizing those known for historic forts and granaries.
</rules>

<answer_format>
[your reasoning]
<RESPONSE>final response</RESPONSE>
</answer_format>`;
