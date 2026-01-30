'use client';

import MacBookScreen from '../components/MacBookScreen';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';

interface FileNode {
  name: string;
  type: 'file' | 'folder';
  children?: FileNode[];
}

// Sample file structure
const sampleStructure: FileNode[] = [
  {
    name: 'src',
    type: 'folder',
    children: [
      {
        name: 'components',
        type: 'folder',
        children: [
          { name: 'Button.tsx', type: 'file' },
          { name: 'Input.tsx', type: 'file' },
          { name: 'Card.tsx', type: 'file' },
          { name: 'Modal.tsx', type: 'file' },
        ],
      },
      {
        name: 'utils',
        type: 'folder',
        children: [
          { name: 'helpers.ts', type: 'file' },
          { name: 'api.ts', type: 'file' },
          { name: 'validation.ts', type: 'file' },
        ],
      },
      {
        name: 'pages',
        type: 'folder',
        children: [
          { name: 'Home.tsx', type: 'file' },
          { name: 'About.tsx', type: 'file' },
          { name: 'Contact.tsx', type: 'file' },
        ],
      },
      { name: 'App.tsx', type: 'file' },
      { name: 'index.tsx', type: 'file' },
      { name: 'types.ts', type: 'file' },
    ],
  },
  {
    name: 'public',
    type: 'folder',
    children: [
      { name: 'favicon.ico', type: 'file' },
      { name: 'logo.png', type: 'file' },
      { name: 'robots.txt', type: 'file' },
    ],
  },
  {
    name: 'tests',
    type: 'folder',
    children: [
      { name: 'unit.test.ts', type: 'file' },
      { name: 'integration.test.ts', type: 'file' },
    ],
  },
  { name: 'package.json', type: 'file' },
  { name: 'README.md', type: 'file' },
  { name: 'tsconfig.json', type: 'file' },
  { name: '.gitignore', type: 'file' },
  { name: '.eslintrc.js', type: 'file' },
];

function FileTreeItem({ node, depth = 0 }: { node: FileNode; depth?: number }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = (e: React.MouseEvent) => {
    if (node.type === 'folder') {
      e.stopPropagation();
      setIsExpanded(!isExpanded);
    }
  };

  const handleExplainClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('Explain:', node.name);
  };

  return (
    <div>
      <div
        className={`flex items-center gap-2 py-1.5 px-2 hover:bg-zinc-200 rounded-md group transition-colors cursor-pointer`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={toggleExpand}
      >
        {/* Icon */}
        {node.type === 'folder' ? (
          <svg
            className={`w-4 h-4 text-zinc-500 transition-transform flex-shrink-0 ${
              isExpanded ? 'rotate-90' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        ) : (
          <div className="w-4 flex-shrink-0" />
        )}

        {/* Folder/File Icon */}
        {node.type === 'folder' ? (
          <svg className="w-5 h-5 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
          </svg>
        ) : (
          <svg className="w-5 h-5 text-zinc-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
        )}

        {/* Name */}
        <span className="text-sm text-zinc-700">{node.name}</span>

        {/* Explain with AI button - only for files */}
        {node.type === 'file' && (
          <button
            onClick={handleExplainClick}
            className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 px-2.5 py-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 rounded transition-all flex-shrink-0 ml-2"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
            </svg>
            <span>Explain with AI</span>
          </button>
        )}
      </div>

      {/* Children */}
      {node.type === 'folder' && isExpanded && node.children && (
        <div>
          {node.children.map((child, index) => (
            <FileTreeItem key={index} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CodebasePage() {
  const searchParams = useSearchParams();
  const repoUrl = searchParams.get('repo');

  return (
    <MacBookScreen className="h-[80vh] w-4/5 max-w-7xl mx-auto">
      <div className="h-full w-full overflow-y-auto px-4 pt-2 pb-4">
        {sampleStructure.map((node, index) => (
          <FileTreeItem key={index} node={node} />
        ))}
      </div>
    </MacBookScreen>
  );
}
