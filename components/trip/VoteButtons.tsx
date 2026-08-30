'use client';

import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';

interface VoteButtonsProps {
  likes: number;
  dislikes: number;
  myVote: 'like' | 'dislike' | null;
  onVote: (voteType: 'like' | 'dislike') => void;
  disabled?: boolean;
}

export function VoteButtons({
  likes,
  dislikes,
  myVote,
  onVote,
  disabled = false,
}: VoteButtonsProps) {
  const [clickedVote, setClickedVote] = useState<'like' | 'dislike' | null>(null);

  const isLiked = myVote === 'like';
  const isDisliked = myVote === 'dislike';

  const handleClick = (type: 'like' | 'dislike') => {
    setClickedVote(type);
    onVote(type);
    setTimeout(() => setClickedVote(null), 350);
  };

  return (
    <div className="flex items-center gap-1.5 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80">
      {/* Upvote Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => handleClick('like')}
        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer active:scale-90 disabled:cursor-not-allowed ${
          clickedVote === 'like' ? 'animate-vote-spring' : ''
        } ${
          isLiked
            ? 'bg-emerald-500 text-white shadow-xs scale-100 ring-2 ring-emerald-500/30'
            : 'bg-white text-slate-700 hover:text-emerald-600 hover:bg-emerald-50/50 border border-slate-200/60 shadow-2xs hover:scale-105'
        }`}
        title={isLiked ? 'Remove upvote' : 'Vote yes'}
        aria-label={`Upvote (${likes} votes)`}
      >
        <ThumbsUp
          className={`w-3.5 h-3.5 transition-transform duration-200 ${
            isLiked ? 'fill-current scale-110' : ''
          }`}
        />
        <span className="font-mono">{likes}</span>
      </button>

      {/* Downvote Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => handleClick('dislike')}
        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer active:scale-90 disabled:cursor-not-allowed ${
          clickedVote === 'dislike' ? 'animate-vote-spring' : ''
        } ${
          isDisliked
            ? 'bg-rose-500 text-white shadow-xs scale-100 ring-2 ring-rose-500/30'
            : 'bg-white text-slate-700 hover:text-rose-600 hover:bg-rose-50/50 border border-slate-200/60 shadow-2xs hover:scale-105'
        }`}
        title={isDisliked ? 'Remove downvote' : 'Vote no'}
        aria-label={`Downvote (${dislikes} votes)`}
      >
        <ThumbsDown
          className={`w-3.5 h-3.5 transition-transform duration-200 ${
            isDisliked ? 'fill-current scale-110' : ''
          }`}
        />
        <span className="font-mono">{dislikes}</span>
      </button>
    </div>
  );
}
