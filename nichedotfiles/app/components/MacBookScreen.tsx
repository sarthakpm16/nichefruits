'use client';

interface MacBookScreenProps {
  children?: React.ReactNode;
  className?: string;
}

export default function MacBookScreen({ children, className }: MacBookScreenProps) {
  return (
    <div className={`relative ${className || ''}`}>
      {/* Bottom Rectangle - Glow */}
      <div
        className="absolute -inset-2 rounded-lg blur-2xl bg-gradient-to-br from-[#71A2EC] to-[#47B7D3]" />

      {/* Inner Rectangle - Main Screen */}
      <div
        className="relative h-full rounded-lg overflow-hidden"
        style={{
          background: `radial-gradient(
            circle at 75% 75%,
            rgba(245, 245, 245, 0.6) 0%,
            rgba(245, 245, 245, 0.6) 15%,
            rgba(245, 245, 245, 0.9) 35%
          )`,
          boxShadow: 'inset 0 0 25px 10px rgba(255, 255, 255, 0.75)',
        }}
      >
        {/* Window Controls */}
        <div className="flex items-center gap-2 px-5 py-5 h-12">
          <div className="w-4 h-4 rounded-full bg-[#ff5f57]" />
          <div className="w-4 h-4 rounded-full bg-[#ffbd2e]" />
          <div className="w-4 h-4 rounded-full bg-[#28c840]" />
        </div>

        {/* Content Area */}
        <div className="flex flex-col items-center justify-center h-[calc(100%-3rem)] p-8">
          {children || <p className="text-zinc-600">Content goes here</p>}
        </div>
      </div>
    </div>
  );
}
