import { NextRequest, NextResponse } from 'next/server';

interface VulnerabilityFinderRequest {
  repoUrl: string;
  model?: string;
  openRouterApiKey?: string;
}

interface FileContent {
  path: string;
  content: string;
  type: string;
}

interface Vulnerability {
  severity: 'critical' | 'high' | 'medium' | 'low';
  file: string;
  line?: number;
  issue: string;
  description: string;
  recommendation: string;
}

// Parse GitHub repo URL to extract owner and repo name
function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  const patterns = [
    /github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?$/,
    /github\.com\/([^\/]+)\/([^\/]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return { owner: match[1], repo: match[2] };
    }
  }

  return null;
}

// Fetch repository tree from GitHub API
async function fetchRepoTree(owner: string, repo: string, branch: string = 'main'): Promise<any> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Vulnerability-Scanner',
        },
      }
    );

    if (!response.ok) {
      // Try 'master' if 'main' fails
      if (branch === 'main') {
        return fetchRepoTree(owner, repo, 'master');
      }
      throw new Error(`GitHub API error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    throw new Error(`Failed to fetch repository tree: ${error}`);
  }
}

// Fetch file content from GitHub
async function fetchFileContent(owner: string, repo: string, path: string): Promise<string> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        headers: {
          'Accept': 'application/vnd.github.v3.raw',
          'User-Agent': 'Vulnerability-Scanner',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }

    return await response.text();
  } catch (error) {
    console.error(`Error fetching ${path}:`, error);
    return '';
  }
}

// Determine if file should be scanned based on extension
function shouldScanFile(path: string): boolean {
  const scanExtensions = [
    '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.go', '.rb', '.php',
    '.env', '.config', '.json', '.yml', '.yaml', '.xml', '.sh', '.bash',
    '.cs', '.cpp', '.c', '.h', '.swift', '.kt', '.rs', '.vue', '.svelte'
  ];

  const configFiles = [
    'package.json', 'Dockerfile', 'docker-compose.yml', 'requirements.txt',
    '.gitignore', 'Makefile', 'Gemfile', 'Cargo.toml', 'pom.xml'
  ];

  const fileName = path.split('/').pop() || '';
  
  return scanExtensions.some(ext => path.toLowerCase().endsWith(ext)) ||
         configFiles.some(file => fileName.toLowerCase() === file.toLowerCase());
}

// Analyze code using OpenRouter API
async function analyzeWithLLM(
  files: FileContent[],
  model: string,
  apiKey: string
): Promise<Vulnerability[]> {
  const codeContext = files.map(f => 
    `File: ${f.path}\n\`\`\`${f.type}\n${f.content.slice(0, 5000)}\n\`\`\``
  ).join('\n\n');

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

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/your-repo',
        'X-Title': 'Vulnerability Scanner',
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.2,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter API error: ${error}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '[]';
    
    // Extract JSON from the response (in case there's extra text)
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    const jsonStr = jsonMatch ? jsonMatch[0] : content;
    
    const vulnerabilities = JSON.parse(jsonStr);
    return vulnerabilities;
  } catch (error) {
    console.error('Error analyzing with LLM:', error);
    throw error;
  }
}

// Generate markdown report
function generateMarkdownReport(
  repoUrl: string,
  vulnerabilities: Vulnerability[],
  scanDate: Date
): string {
  const severityCounts = {
    critical: vulnerabilities.filter(v => v.severity === 'critical').length,
    high: vulnerabilities.filter(v => v.severity === 'high').length,
    medium: vulnerabilities.filter(v => v.severity === 'medium').length,
    low: vulnerabilities.filter(v => v.severity === 'low').length,
  };

  const sortedVulns = [...vulnerabilities].sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  let markdown = `# Security Vulnerability Report

**Repository:** ${repoUrl}  
**Scan Date:** ${scanDate.toISOString()}  
**Total Vulnerabilities Found:** ${vulnerabilities.length}

## Summary

| Severity | Count |
|----------|-------|
| 🔴 Critical | ${severityCounts.critical} |
| 🟠 High | ${severityCounts.high} |
| 🟡 Medium | ${severityCounts.medium} |
| 🟢 Low | ${severityCounts.low} |

---

## Detailed Findings

`;

  if (sortedVulns.length === 0) {
    markdown += `### ✅ No Vulnerabilities Detected

Great job! No obvious security vulnerabilities were found in this scan.

**Note:** This scan is not exhaustive. Always follow security best practices and conduct regular security audits.
`;
  } else {
    sortedVulns.forEach((vuln, index) => {
      const severityEmoji = {
        critical: '🔴',
        high: '🟠',
        medium: '🟡',
        low: '🟢',
      };

      markdown += `### ${index + 1}. ${severityEmoji[vuln.severity]} ${vuln.issue} (${vuln.severity.toUpperCase()})

**File:** \`${vuln.file}\`${vuln.line ? ` (Line ~${vuln.line})` : ''}

**Description:**  
${vuln.description}

**Recommendation:**  
${vuln.recommendation}

---

`;
    });
  }

  markdown += `## Next Steps

1. **Review all findings** carefully and prioritize fixes based on severity
2. **Implement recommendations** for each vulnerability
3. **Update dependencies** to their latest secure versions
4. **Add security scanning** to your CI/CD pipeline
5. **Conduct regular security audits** and penetration testing
6. **Use environment variables** for all sensitive data
7. **Enable security headers** and HTTPS
8. **Implement proper authentication and authorization**

## Disclaimer

This automated scan is provided as a helpful tool but should not be considered a comprehensive security audit. 
It may produce false positives or miss certain vulnerabilities. Always consult with security professionals for 
critical applications and conduct thorough manual security reviews.

---

*Generated by AI-Powered Vulnerability Scanner*
`;

  return markdown;
}

export async function POST(request: NextRequest) {
  try {
    const body: VulnerabilityFinderRequest = await request.json();
    const { repoUrl, model = 'anthropic/claude-3.5-sonnet', openRouterApiKey } = body;

    if (!repoUrl) {
      return NextResponse.json(
        { error: 'Repository URL is required' },
        { status: 400 }
      );
    }

    // Check for API key in request or environment
    const apiKey = openRouterApiKey || process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenRouter API key is required. Provide it in request body or set OPENROUTER_API_KEY environment variable.' },
        { status: 400 }
      );
    }

    // Parse GitHub URL
    const repoInfo = parseGitHubUrl(repoUrl);
    if (!repoInfo) {
      return NextResponse.json(
        { error: 'Invalid GitHub repository URL' },
        { status: 400 }
      );
    }

    const { owner, repo } = repoInfo;

    // Fetch repository structure
    console.log(`Fetching repository: ${owner}/${repo}`);
    const tree = await fetchRepoTree(owner, repo);

    // Filter files to scan
    const filesToScan = tree.tree.filter((item: any) => 
      item.type === 'blob' && shouldScanFile(item.path)
    ).slice(0, 30); // Limit to 30 files to avoid token limits

    console.log(`Found ${filesToScan.length} files to scan`);

    // Fetch file contents
    const fileContents: FileContent[] = [];
    for (const file of filesToScan) {
      const content = await fetchFileContent(owner, repo, file.path);
      if (content) {
        const extension = file.path.split('.').pop() || '';
        fileContents.push({
          path: file.path,
          content: content,
          type: extension,
        });
      }
    }

    console.log(`Analyzing ${fileContents.length} files with ${model}`);

    // Analyze with LLM
    const vulnerabilities = await analyzeWithLLM(fileContents, model, apiKey);

    // Generate markdown report
    const markdown = generateMarkdownReport(repoUrl, vulnerabilities, new Date());

    return NextResponse.json({
      success: true,
      vulnerabilities,
      markdown,
      filesScanned: fileContents.length,
      repository: `${owner}/${repo}`,
    });

  } catch (error) {
    console.error('Error in vulnerability scanner:', error);
    return NextResponse.json(
      { 
        error: 'Failed to scan repository',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
