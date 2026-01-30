'use client';

import { useState } from 'react';

interface Vulnerability {
  severity: 'critical' | 'high' | 'medium' | 'low';
  file: string;
  line?: number;
  issue: string;
  description: string;
  recommendation: string;
}

interface ScanResult {
  success: boolean;
  vulnerabilities: Vulnerability[];
  markdown: string;
  filesScanned: number;
  repository: string;
}

export default function Home() {
  const [repoUrl, setRepoUrl] = useState('');
  const [model, setModel] = useState('anthropic/claude-3.5-sonnet');
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState('');

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/vulnfinder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repoUrl,
          model,
          ...(apiKey && { openRouterApiKey: apiKey }),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to scan repository');
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const downloadMarkdown = () => {
    if (!result) return;
    const blob = new Blob([result.markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `security-report-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 dark:text-red-400';
      case 'high':
        return 'text-orange-600 dark:text-orange-400';
      case 'medium':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'low':
        return 'text-green-600 dark:text-green-400';
      default:
        return 'text-zinc-600 dark:text-zinc-400';
    }
  };

  const getSeverityBg = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 dark:bg-red-900/20 border-red-300 dark:border-red-800';
      case 'high':
        return 'bg-orange-100 dark:bg-orange-900/20 border-orange-300 dark:border-orange-800';
      case 'medium':
        return 'bg-yellow-100 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-800';
      case 'low':
        return 'bg-green-100 dark:bg-green-900/20 border-green-300 dark:border-green-800';
      default:
        return 'bg-zinc-100 dark:bg-zinc-900/20 border-zinc-300 dark:border-zinc-800';
    }
  };

  const severityCounts = result?.vulnerabilities.reduce(
    (acc, v) => {
      acc[v.severity] = (acc[v.severity] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      <main className="container mx-auto px-4 py-12 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-50 mb-3">
            🔍 Vulnerability Scanner
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            AI-powered security analysis for GitHub repositories
          </p>
        </div>

        {/* Scan Form */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg p-8 mb-8">
          <form onSubmit={handleScan} className="space-y-6">
            <div>
              <label
                htmlFor="repoUrl"
                className="block text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-2"
              >
                GitHub Repository URL *
              </label>
              <input
                id="repoUrl"
                type="text"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/owner/repo"
                required
                className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              />
            </div>

            <div>
              <label
                htmlFor="model"
                className="block text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-2"
              >
                AI Model
              </label>
              <select
                id="model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              >
                <option value="anthropic/claude-3.5-sonnet">
                  Claude 3.5 Sonnet (Recommended)
                </option>
                <option value="anthropic/claude-3-opus">Claude 3 Opus</option>
                <option value="openai/gpt-4o">GPT-4o</option>
                <option value="openai/gpt-4-turbo">GPT-4 Turbo</option>
                <option value="google/gemini-pro-1.5">Gemini Pro 1.5</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="apiKey"
                className="block text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-2"
              >
                OpenRouter API Key{' '}
                <span className="text-zinc-500 font-normal">
                  (optional if set in .env.local)
                </span>
              </label>
              <input
                id="apiKey"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-or-v1-..."
                className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              />
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                Get your key at{' '}
                <a
                  href="https://openrouter.ai/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  openrouter.ai/keys
                </a>
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !repoUrl}
              className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-400 dark:disabled:bg-zinc-700 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Scanning Repository...
                </span>
              ) : (
                'Scan for Vulnerabilities'
              )}
            </button>
          </form>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-lg p-4 mb-8">
            <p className="text-red-800 dark:text-red-300 font-medium">
              ❌ {error}
            </p>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                  Scan Results
                </h2>
                <button
                  onClick={downloadMarkdown}
                  className="flex items-center gap-2 px-4 py-2 bg-zinc-800 dark:bg-zinc-700 text-white rounded-lg hover:bg-zinc-700 dark:hover:bg-zinc-600 transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Download Report
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                    {result.vulnerabilities.length}
                  </p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Total Issues
                  </p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {severityCounts?.critical || 0}
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-400">
                    Critical
                  </p>
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {severityCounts?.high || 0}
                  </p>
                  <p className="text-sm text-orange-600 dark:text-orange-400">
                    High
                  </p>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {severityCounts?.medium || 0}
                  </p>
                  <p className="text-sm text-yellow-600 dark:text-yellow-400">
                    Medium
                  </p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {severityCounts?.low || 0}
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    Low
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-zinc-600 dark:text-zinc-400">
                <span>📦 Repository: {result.repository}</span>
                <span>•</span>
                <span>📄 Files Scanned: {result.filesScanned}</span>
              </div>
            </div>

            {/* Vulnerabilities List */}
            {result.vulnerabilities.length > 0 ? (
              <div className="space-y-4">
                {result.vulnerabilities.map((vuln, index) => (
                  <div
                    key={index}
                    className={`border rounded-xl p-6 ${getSeverityBg(
                      vuln.severity
                    )}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${getSeverityColor(
                              vuln.severity
                            )} bg-white dark:bg-zinc-900`}
                          >
                            {vuln.severity}
                          </span>
                          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                            {vuln.issue}
                          </h3>
                        </div>
                        <p className="text-sm text-zinc-700 dark:text-zinc-300 font-mono mb-2">
                          📁 {vuln.file}
                          {vuln.line && ` (Line ~${vuln.line})`}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-1">
                          Description:
                        </p>
                        <p className="text-sm text-zinc-700 dark:text-zinc-300">
                          {vuln.description}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-1">
                          Recommendation:
                        </p>
                        <p className="text-sm text-zinc-700 dark:text-zinc-300">
                          {vuln.recommendation}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-800 rounded-xl p-8 text-center">
                <p className="text-2xl mb-2">✅</p>
                <p className="text-lg font-semibold text-green-800 dark:text-green-300 mb-2">
                  No Vulnerabilities Detected!
                </p>
                <p className="text-sm text-green-700 dark:text-green-400">
                  Great job! No obvious security issues were found in this scan.
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
