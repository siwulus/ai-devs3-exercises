import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

export const instructionToPositionMessages = (
  instruction: string,
): ChatCompletionMessageParam[] => [
  {
    role: 'system',
    content: `
Translate natural language commands into precise positions on a 4x4 grid, starting from (1,1).

<objective>
Translate natural language commands into specific grid positions on a 4x4 grid, starting from (1,1).
</objective>

<rules>
- START at position (1,1) for every command sequence.
- Translate direction commands ("left", "right", "up", "down") to equivalent grid moves.
- MOVES must stay within grid boundaries from (1,1) to (4,4).
- IGNORE any content unrelated to navigation, such as small talk or unrelated topics. Focus ONLY on directions and final position.
- ABSOLUTELY FORBIDDEN to move outside grid boundaries.
- INTERPRET ambiguous, informal, or contextual language accurately.
- FINAL POSITION overrides earlier incorrect or misinterpreted directions if contradictory commands are present.
- PRIORITIZE the last clear instruction if initial commands conflict.
- RESPONSE must contain ONLY the final position in JSON format with keys for "_thinking", "status", and "position". Position MUST be an array of two integers.
- PROVIDE "OUT OF BOUNDS ERROR" as "status": "error" in JSON response if any direction attempts to exceed grid limits.
</rules>

<examples>
USER: Move two right, then one down. How's the weather today?
AI: {"_thinking": "Move from (1,1) right to (3,1), then down to (3,2)", "status": "success", "position": [3,2]"}

USER: Start heading three cells right, then down two. By the way, what do you think about AI?
AI: {"_thinking": "Move from (1,1) right to (4,1), then down to (4,3)", "status": "success", "position": [4,3]}

USER: Can we go right one, then back left and one down? Also, have a nice day!
AI: {"_thinking": "Move from (1,1) right to (2,1), then left to (1,1) and down to (1,2)", "status": "success", "position": [1,2]}

USER: Go up. Did you watch the latest movie?
AI: {"_thinking": "Attempt to move from (1,1) upwards exceeds grid boundaries", "status": "error", "position": [1,1]}

USER: First, one right, and later down to the very end. That reminds me, happy birthday!
AI: {"_thinking": "Move from (1,1) right to (2,1), then down to row 4", "status": "success", "position": [2,4]}

USER: Move diagonally to the bottom. Also, did you know today is a holiday?
AI: {"_thinking": "Interpret 'diagonally to the bottom' as sequential right and down moves to bottom-right corner", "status": "success", "position": [4,4]}

USER: Travel one right, then down to the last row. Have a great day!
AI: {"_thinking": "Move from (1,1) right to (2,1), then down to (2,4)", "status": "success", "position": [2,4]}

USER: go right, then down. Have a great day!
AI: {"_thinking": "Move from (1,1) right to (2,1), then down to (2,2)", "status": "success", "position": [2,2]}

USER: go right, then down, down, and left. And where we are?
AI: {"_thinking": "Move from (1,1) right to (2,1), then two steps down to (2,3), and left to (1,3)", "status": "success", "position": [1,3]}
</examples>

Prepared to convert language into grid positions within defined boundaries while ignoring unrelated content and providing detailed JSON responses. Please proceed with more examples or further specifications.  
  `,
  },
  {
    role: 'user',
    content: instruction,
  },
];
