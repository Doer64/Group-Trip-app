'use client';

import React from 'react';
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
  const isLiked = myVote === 'like';
  const isDisliked = myVote === 'dislike';

  return (
    <div className="flex items-center gap-1.5 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80">
      {/* Upvote Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => onVote('like')}
        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer active:scale-90 disabled:cursor-not-allowed ${
          isLiked
            ? 'bg-emerald-500 text-white shadow-xs'
            : 'bg-white text-slate-700 hover:text-emerald-600 hover:bg-emerald-50/50 border border-slate-200/60 shadow-2xs'
        }`}
        title={isLiked ? 'Remove upvote' : 'Vote yes'}
        aria-label={`Upvote (${likes} votes)`}
      >
        <ThumbsUp className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : ''}`} />
        <span className="font-mono">{likes}</span>
      </button>

      {/* Downvote Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => onVote('dislike')}
        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer active:scale-90 disabled:cursor-not-allowed ${
          isDisliked
            ? 'bg-rose-500 text-white shadow-xs'
            : 'bg-white text-slate-700 hover:text-rose-600 hover:bg-rose-50/50 border border-slate-200/60 shadow-2xs'
        }`}
        title={isDisliked ? 'Remove downvote' : 'Vote no'}
        aria-label={`Downvote (${dislikes} votes)`}
      >
        <ThumbsDown className={`w-3.5 h-3.5 ${isDisliked ? 'fill-current' : ''}`} />
        <span className="font-mono">{dislikes}</span>
      </button>
    </div>
  );
}
