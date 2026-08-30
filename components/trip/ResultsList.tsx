'use client';

import React from 'react';
import { Trophy, Medal, MapPin, ExternalLink, ThumbsUp, ThumbsDown, Users } from 'lucide-react';
import { RankedAttraction } from '@/lib/types/database.types';
import { EmptyState } from '../ui/EmptyState';

interface ResultsListProps {
  results: RankedAttraction[];
  totalParticipants: number;
  totalVotes: number;
  destination: string;
}

export function ResultsList({
  results,
  totalParticipants,
  totalVotes,
  destination,
}: ResultsListProps) {
  if (results.length === 0) {
    return (
      <EmptyState
        icon={<Trophy className="w-6 h-6 text-amber-500" />}
        title="No votes recorded yet"
        description="Head back to the trip board and vote on attractions to build your group's consensus leaderboard."
      />
    );
  }

  const topThree = results.slice(0, 3);
  const remaining = results.slice(3);

  const getMedalColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-amber-100 text-amber-800 border-amber-300 ring-4 ring-amber-400/20';
      case 2:
        return 'bg-slate-200 text-slate-800 border-slate-300 ring-4 ring-slate-400/20';
      case 3:
        return 'bg-amber-700/10 text-amber-900 border-amber-600/30 ring-4 ring-amber-600/15';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-8 text-left">
      {/* Stats Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-white/85 p-4 rounded-3xl border border-white shadow-lg shadow-indigo-100/60">
        <div className="flex flex-col items-center justify-center p-2 text-center">
          <span className="text-xl font-black text-indigo-950">{results.length}</span>
          <span className="text-xs text-indigo-500">Ideas pitched</span>
        </div>
        <div className="flex flex-col items-center justify-center p-2 text-center border-x border-indigo-100">
          <span className="text-xl font-black text-violet-600">{totalVotes}</span>
          <span className="text-xs text-indigo-500">Votes cast</span>
        </div>
        <div className="col-span-2 sm:col-span-1 flex flex-col items-center justify-center p-2 text-center">
          <span className="text-xl font-black text-cyan-600">{totalParticipants}</span>
          <span className="text-xs text-indigo-500">Crew involved</span>
        </div>
      </div>

      {/* Top 3 Podium Highlights */}
      <div>
        <h3 className="text-sm font-black text-indigo-900 uppercase tracking-[0.14em] mb-4 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-500" />
          <span>Top Group Favorites</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {topThree.map((item) => (
            <div
              key={item.id}
              className={`relative flex flex-col justify-between bg-white/90 rounded-3xl border p-5 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1 ${
                item.rank === 1
                  ? 'border-amber-300 ring-2 ring-amber-400/20 bg-linear-to-b from-amber-50/30 to-white'
                  : 'border-indigo-100'
              }`}
            >
              {/* Rank Medal */}
              <div className="flex items-center justify-between mb-3">
                <div
                  className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs font-bold ${getMedalColor(
                    item.rank
                  )}`}
                >
                  #{item.rank}
                </div>
                <div className="flex items-center gap-1.5 bg-indigo-950 text-white px-2.5 py-1 rounded-full text-xs font-black shadow-sm">
                  <span>Score</span>
                  <span className="text-amber-300">
                    {item.score > 0 ? `+${item.score}` : item.score}
                  </span>
                </div>
              </div>

              {/* Photo Thumbnail & Info */}
              <div className="space-y-2.5">
                {item.image_url && (
                  <div className="w-full h-32 rounded-xl bg-slate-100 overflow-hidden">
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <h4 className="text-base font-black text-indigo-950 line-clamp-1">
                  {item.name}
                </h4>
                {item.description && (
                  <p className="text-xs text-indigo-500 line-clamp-2">
                    {item.description}
                  </p>
                )}
              </div>

              {/* Voting breakdown & maps link */}
              <div className="mt-4 pt-3 border-t border-indigo-50 flex items-center justify-between text-xs">
                {item.place_uri ? (
                  <a
                    href={item.place_uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-indigo-600 hover:underline font-medium"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Google Maps</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                ) : (
                  <span className="text-slate-400">No map link</span>
                )}

                <div className="flex items-center gap-2 font-semibold">
                  <span className="inline-flex items-center gap-0.5 text-emerald-600">
                    <ThumbsUp className="w-3 h-3" />
                    {item.likes}
                  </span>
                  <span className="inline-flex items-center gap-0.5 text-rose-500">
                    <ThumbsDown className="w-3 h-3" />
                    {item.dislikes}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Remaining Ranked List */}
      {remaining.length > 0 && (
        <div className="pt-4">
          <h3 className="text-sm font-black text-indigo-900 uppercase tracking-[0.14em] mb-4">
            Full Consensus Ranking
          </h3>

          <div className="bg-white/90 rounded-3xl border border-white divide-y divide-indigo-50 overflow-hidden shadow-lg shadow-indigo-100/50">
            {remaining.map((item) => (
              <div
                key={item.id}
                className="p-4 flex items-center justify-between gap-4 hover:bg-violet-50/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-6 text-center text-xs font-black text-violet-400">
                    #{item.rank}
                  </span>

                  {item.image_url && (
                    <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden shrink-0">
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div className="min-w-0">
                    <h5 className="text-sm font-black text-indigo-950 truncate">
                      {item.name}
                    </h5>
                    {item.place_uri ? (
                      <a
                        href={item.place_uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-indigo-600 mt-0.5"
                      >
                        <MapPin className="w-3 h-3" />
                        <span>View on Maps</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    ) : (
                      <span className="text-[11px] text-slate-400">
                        Proposed by {item.added_by_name}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="flex items-center gap-2 text-xs font-medium">
                    <span className="inline-flex items-center gap-0.5 text-emerald-600">
                      <ThumbsUp className="w-3 h-3" />
                      {item.likes}
                    </span>
                    <span className="inline-flex items-center gap-0.5 text-rose-500">
                      <ThumbsDown className="w-3 h-3" />
                      {item.dislikes}
                    </span>
                  </div>

                  <div className="px-2.5 py-1 rounded-xl bg-amber-100 text-xs font-black text-indigo-900 min-w-[50px] text-center">
                    {item.score > 0 ? `+${item.score}` : item.score}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
