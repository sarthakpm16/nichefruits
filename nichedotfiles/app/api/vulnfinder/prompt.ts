export function generateVulnerabilityPrompt(codeContext: string): string {

const prompt = `You are a security expert analyzing a code repository for vulnerabilities. Analyze the following code files and identify security issues.

Focus on:
1. Hardcoded API keys, tokens, passwords, or secrets
2. Exposed environment variables in client-side code
3. SQL injection vulnerabilities
4. Cross-Site Scripting (XSS) vulnerabilities
5. Insecure authentication/authorization
6. Sensitive data exposure
7. Missing input validation
8. Unsafe deserialization
9. Using components with known vulnerabilities
10. Insecure direct object references
11. Security misconfigurations
12. Insecure cryptographic storage
13. Insufficient logging and monitoring

Repository Files:
${codeContext}

Respond ONLY with a valid JSON array of vulnerabilities. Each vulnerability must have:
- severity: "critical" | "high" | "medium" | "low"
- file: string (file path)
- line: number (approximate line number if possible)
- issue: string (brief title)
- description: string (detailed explanation)
- recommendation: string (how to fix)

Example format:
[
  {
    "severity": "critical",
    "file": "src/config.js",
    "line": 10,
    "issue": "Hardcoded API Key",
    "description": "API key is hardcoded directly in source code",
    "recommendation": "Move API key to environment variables"
  }
]

Return ONLY the JSON array, no other text.`;


return prompt;
}