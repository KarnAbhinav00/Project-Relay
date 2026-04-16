"use client";

export default function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="h-screen w-full bg-neutral-950 text-white flex">
        {/* Left Sidebar Skeleton */}
        <div className="hidden md:flex w-80 flex-col border-r border-neutral-800 bg-neutral-900">
          {/* Header */}
          <div className="p-4 border-b border-neutral-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full skeleton-shimmer" />
              <div className="space-y-2 flex-1">
                <div className="h-4 w-20 rounded skeleton-shimmer" />
                <div className="h-3 w-12 rounded skeleton-shimmer" />
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="p-3 border-b border-neutral-800">
            <div className="h-10 w-full rounded-lg skeleton-shimmer" />
          </div>

          {/* Chat List */}
          <div className="flex-1 overflow-hidden p-2 space-y-2">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-2">
                <div className="w-10 h-10 rounded-full skeleton-shimmer flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-24 rounded skeleton-shimmer" />
                  <div className="h-3 w-32 rounded skeleton-shimmer" />
                 </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Chat Area Skeleton */}
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="h-16 flex items-center gap-3 px-4 md:px-5 border-b border-neutral-800 bg-neutral-900">
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-full skeleton-shimmer" />
            <div className="space-y-2">
              <div className="h-4 w-24 rounded skeleton-shimmer" />
              <div className="h-3 w-16 rounded skeleton-shimmer" />
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
            {/* Left messages (other) */}
            {[...Array(4)].map((_, i) => (
              <div key={`left-${i}`} className="flex justify-start">
                <div className="flex gap-3 max-w-[80%] md:max-w-md">
                  <div className="w-8 h-8 rounded-full skeleton-shimmer flex-shrink-0" />
                  <div className="space-y-2">
                    <div className="h-8 w-32 md:w-48 rounded-2xl rounded-bl-sm skeleton-shimmer" />
                    <div className="h-3 w-16 rounded skeleton-shimmer" />
                  </div>
                </div>
              </div>
            ))}

            {/* Right messages (me) */}
            {[...Array(4)].map((_, i) => (
              <div key={`right-${i}`} className="flex justify-end">
                <div className="flex gap-3 max-w-[80%] md:max-w-md">
                  <div className="space-y-2">
                    <div className="h-8 w-28 md:w-40 rounded-2xl rounded-br-sm skeleton-shimmer" />
                    <div className="h-3 w-16 rounded skeleton-shimmer ml-auto" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Input Area */}
          <div className="p-3 md:p-4 border-t border-neutral-800 bg-neutral-900">
            <div className="h-10 w-full rounded-lg skeleton-shimmer" />
          </div>
        </div>

        {/* Branding Overlay */}
        <div className="fixed inset-0 pointer-events-none flex flex-col items-center justify-center z-50">
          <div className="bg-neutral-950/80 backdrop-blur-sm px-8 py-4 rounded-2xl border border-neutral-800">
            <h1 className="text-2xl font-bold text-center mb-4">
              <span className="text-emerald-500">Project</span> Relay
            </h1>
            <div className="flex justify-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
