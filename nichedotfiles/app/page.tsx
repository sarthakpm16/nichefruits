'use client';

import MacBookScreen from './components/MacBookScreen';
import Image from 'next/image';

export default function Home() {
  // Get current date/time formatted like "January 30th, 2026 at 11:27 AM"
  const now = new Date();
  const month = now.toLocaleString('en-US', { month: 'long' });
  const day = now.getDate();
  const year = now.getFullYear();
  const time = now.toLocaleString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit', 
    hour12: true 
  });
  
  // Add ordinal suffix (st, nd, rd, th)
  const getOrdinal = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };
  
  const formattedDate = `Modified ${month} ${getOrdinal(day)}, ${year} at ${time}`;

  return (
    <MacBookScreen className="h-[50vh] w-2/3 max-w-6xl mx-auto">
      <div className="flex items-center justify-center w-full h-full">
        <div className="flex flex-col items-start gap-4 w-full max-w-lg px-4">
          {/* File icon and title section */}
          <div className="flex flex-row items-center w-full">
            {/* File icon - 1/4 width */}
            <div className="w-24 h-24 flex items-center justify-start">
              <Image 
                src="/file-icon.png" 
                alt="File icon" 
                width={80} 
                height={80}
              />
            </div>
            
            {/* Text content - 3/4 width */}
            <div className="w-3/4 flex flex-col">
              <h1 className="text-5xl">
                <span className="font-medium" style={{ fontFamily: 'var(--font-rethink-sans)' }}>
                  niche
                </span>
                <span className="font-bold" style={{ fontFamily: 'var(--font-rethink-sans)' }}>
                  .files
                </span>
              </h1>
              <p className="text-sm text-zinc-600" style={{ fontFamily: 'var(--font-inter)' }}>
                {formattedDate}
              </p>
            </div>
          </div>

          {/* GitHub input */}
          <div className="w-full">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                <svg className="w-5 h-5 text-zinc-400" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Enter GitHub Link"
                className="w-full pl-12 pr-4 py-3 rounded-lg border border-zinc-300 bg-white/80 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>
    </MacBookScreen>
  );
}
