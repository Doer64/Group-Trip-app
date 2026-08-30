'use client';

import React from 'react';
import { Compass, Plane } from 'lucide-react';

interface FlightLoaderProps {
  label?: string;
  sublabel?: string;
  className?: string;
  compact?: boolean;
}

export function FlightLoader({
  label = 'Preparing for departure...',
  sublabel = 'Syncing flight plan with the crew',
  className = '',
  compact = false,
}: FlightLoaderProps) {
  if (compact) {
    return (
      <div className={`flex items-center justify-center gap-2.5 py-4 text-slate-500 ${className}`}>
        <div className="relative w-6 h-6 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-radar-ripple" />
          <Plane className="w-4 h-4 text-blue-600 animate-flight-glide" />
        </div>
        <span className="text-xs font-bold text-slate-700">{label}</span>
      </div>
    );
  }

  return (
    <div
      className={`py-20 sm:py-28 flex flex-col items-center justify-center text-center px-4 select-none ${className}`}
    >
      {/* Central Radar Sphere with Gliding Aircraft */}
      <div className="relative w-20 h-20 mb-6 flex items-center justify-center">
        {/* Concentric Radar Waves */}
        <div
          className="absolute inset-0 rounded-full bg-blue-500/15 animate-radar-ripple pointer-events-none"
          style={{ animationDelay: '0s' }}
        />
        <div
          className="absolute inset-0 rounded-full bg-indigo-500/10 animate-radar-ripple pointer-events-none"
          style={{ animationDelay: '0.75s' }}
        />

        {/* Center Flight Capsule */}
        <div className="relative z-10 w-16 h-16 rounded-3xl bg-linear-to-br from-blue-600 via-blue-700 to-indigo-700 text-white flex items-center justify-center shadow-xl shadow-blue-600/30 border border-white/25">
          <div className="animate-flight-glide">
            <Plane className="w-8 h-8 text-white drop-shadow-md" />
          </div>
        </div>

        {/* Orbiting Compass Dot */}
        <div className="absolute -top-1 -right-1 z-20 w-6 h-6 rounded-full bg-amber-400 border-2 border-white flex items-center justify-center text-slate-950 shadow-md">
          <Compass className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '6s' }} />
        </div>
      </div>

      {/* Text Labels */}
      <div className="space-y-1.5 max-w-xs">
        <h4 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
          {label}
        </h4>
        {sublabel && (
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            {sublabel}
          </p>
        )}
      </div>

      {/* Mini Flight Track Progress Bar */}
      <div className="mt-5 w-36 h-1.5 bg-slate-100 rounded-full overflow-hidden relative border border-slate-200/60">
        <div className="absolute inset-y-0 w-16 bg-linear-to-r from-transparent via-blue-500 to-amber-400 rounded-full animate-flight-track" />
      </div>
    </div>
  );
}
