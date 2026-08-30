'use client';

import React from 'react';
import { Trophy, Medal, MapPin, ExternalLink, ThumbsUp, ThumbsDown, Users, Flame } from 'lucide-react';
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
        title="No votes on the ballot yet"
        description="Head back to the voting deck and cast your votes before wheels up."
      />
    );
  }

  const topThree = results.slice(0, 3);
  const remaining = results.slice(3);

  const getMedalBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-amber-400 text-slate-950 border-amber-300 shadow-md shadow-amber-400/20';
      case 2:
        return 'bg-slate-200 text-slate-800 border-slate-300 shadow-2xs';
      case 3:
        return 'bg-amber-700/20 text-amber-900 border-amber-600/30 shadow-2xs';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-8 text-left">
      {/* Stats Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-white/90 p-4 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex flex-col items-center justify-center p-2 text-center">
          <span className="text-2xl font-black text-slate-900">{results.length}</span>
          <span className="text-xs text-slate-500 font-medium">Spots on Radar</span>
        </div>
        <div className="flex flex-col items-center justify-center p-2 text-center border-x border-slate-100">
          <span className="text-2xl font-black text-blue-600">{totalVotes}</span>
          <span className="text-xs text-slate-500 font-medium">Votes Cast</span>
        </div>
        <div className="col-span-2 sm:col-span-1 flex flex-col items-center justify-center p-2 text-center">
          <span className="text-2xl font-black text-emerald-600">{totalParticipants}</span>
          <span className="text-xs text-slate-500 font-medium">Crew on Board</span>
        </div>
      </div>

      {/* Top 3 Podium Highlights */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
            First Class Picks
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {topThree.map((item, index) => {
            const totalItemVotes = item.likes + item.dislikes;

            return (
              <div
                key={item.id}
                className={`relative flex flex-col justify-between bg-white rounded-3xl border p-5 shadow-2xs interactive-card animate-card-reveal ${
                  item.rank === 1
                    ? 'border-amber-300 ring-2 ring-amber-400/20 shadow-amber-400/10'
                    : 'border-slate-200'
                }`}
                style={{ animationDelay: `${index * 80}ms` }}
              >
                {/* Winner Gold Shimmer Accent */}
                {item.rank === 1 && (
                  <div className="absolute top-0 inset-x-0 h-1 rounded-t-3xl shimmer-gold" />
                )}

                {/* Header with Rank Badge & Score */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div
                      className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs font-black transition-transform group-hover:scale-110 ${getMedalBadge(
                        item.rank
                      )}`}
                    >
                      #{item.rank}
                    </div>

                    <div className="flex items-center gap-1.5 bg-slate-900 text-white px-2.5 py-1 rounded-full text-xs font-black shadow-2xs">
                      <span>Score</span>
                      <span className="text-amber-400">
                        {item.score > 0 ? `+${item.score}` : item.score}
                      </span>
                    </div>
                  </div>

                  {/* Photo Thumbnail & Info */}
                  <div className="space-y-2.5">
                    {item.image_url && (
                      <div className="w-full h-32 rounded-2xl bg-slate-100 overflow-hidden relative">
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-500"
                        />
                        {item.rank === 1 && (
                          <div className="absolute top-2 right-2 bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1 animate-pulse-subtle">
                            <Flame className="w-3 h-3 text-rose-600 fill-rose-600" />
                            <span>Winner</span>
                          </div>
                        )}
                      </div>
                    )}
                    <h4 className="text-base font-extrabold text-slate-900 line-clamp-1">
                      {item.name}
                    </h4>
                    {item.description && (
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Voting breakdown & maps link */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  {item.place_uri ? (
                    <a
                      href={item.place_uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 hover:underline font-bold"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Map</span>
                      <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                    </a>
                  ) : (
                    <span className="text-slate-400 text-[11px]">No map link</span>
                  )}

                  <div className="flex items-center gap-2 font-bold">
                    <span className="inline-flex items-center gap-1 text-emerald-600">
                      <ThumbsUp className="w-3 h-3" />
                      {item.likes}
                    </span>
                    <span className="inline-flex items-center gap-1 text-rose-500">
                      <ThumbsDown className="w-3 h-3" />
                      {item.dislikes}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Remaining Ranked List */}
      {remaining.length > 0 && (
        <div className="pt-2">
          <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider mb-4">
            Full Consensus Ranking
          </h3>

          <div className="bg-white rounded-3xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-2xs">
            {remaining.map((item) => (
              <div
                key={item.id}
                className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-6 text-center text-xs font-black text-slate-400">
                    #{item.rank}
                  </span>

                  {item.image_url && (
                    <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div className="min-w-0">
                    <h5 className="text-sm font-extrabold text-slate-900 truncate">
                      {item.name}
                    </h5>
                    {item.place_uri ? (
                      <a
                        href={item.place_uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-blue-600 mt-0.5 font-medium"
                      >
                        <MapPin className="w-3 h-3" />
                        <span>View on Maps</span>
                        <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                      </a>
                    ) : (
                      <span className="text-[11px] text-slate-400">
                        Proposed by {item.added_by_name}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <span className="inline-flex items-center gap-0.5 text-emerald-600">
                      <ThumbsUp className="w-3 h-3" />
                      {item.likes}
                    </span>
                    <span className="inline-flex items-center gap-0.5 text-rose-500">
                      <ThumbsDown className="w-3 h-3" />
                      {item.dislikes}
                    </span>
                  </div>

                  <div className="px-3 py-1 rounded-full bg-slate-100 text-xs font-black text-slate-900 min-w-[48px] text-center">
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
