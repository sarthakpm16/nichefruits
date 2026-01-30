export function generateVideoScriptPrompt(markdownContent: string): string {
    const prompt = `You are a comedic cybersecurity commentator making short, punchy, aggressive videos about vulnerable code. 
  
  Given the following vulnerability report in markdown format, generate a 60-second **roast-style video script**. The tone should be angry, shocked, sarcastic, and funny — like reacting to someone who left obvious security holes in their code. For example, if you see an IDOR vulnerability, respond with something like "HOW ARE YOU HAVING AN IDOR? ARE YOU KIDDING ME?" but keep it witty and entertaining. 
  
  IMPORTANT CONSTRAINTS:
  - EXACTLY 60 seconds of spoken content (~150-160 words)
  - Strong, hilarious hook in the first 5 seconds
  - Focus on the most critical vulnerabilities first
  - Use comedic exaggeration and aggressive phrasing where appropriate
  - Keep language **funny, conversational, and natural**, not overly technical
  - Include sarcastic commentary for medium/low severity issues
  - End with a punchy call-to-action like "Fix this now, don’t be a vibe coder!" or "Secure your shit, seriously"
  - Only output spoken script text
  - Do not include stage directions, camera notes, or formatting instructions
  - Use line breaks to indicate natural pauses for pacing
  -do not use asterics because it messes up the audio generation
  
  VULNERABILITY REPORT:
  ${markdownContent}
  
  OUTPUT:
  A hilarious, aggressive, TTS-ready short-form video script that makes the vulnerabilities obvious and entertaining.`;
    
    return prompt;
  }
  