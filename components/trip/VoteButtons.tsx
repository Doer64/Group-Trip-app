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
    <div className="flex items-center gap-2 bg-slate-50/80 p-1.5 rounded-xl border border-slate-100">
      {/* Upvote Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => onVote('like')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer active:scale-95 disabled:cursor-not-allowed ${
          isLiked
            ? 'bg-emerald-500 text-white shadow-xs'
            : 'bg-white text-slate-600 hover:text-emerald-600 hover:bg-emerald-50/60 border border-slate-200/80'
        }`}
        title={isLiked ? 'Remove like' : 'Vote like'}
        aria-label={`Like (${likes} votes)`}
      >
        <ThumbsUp className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : ''}`} />
        <span>{likes}</span>
      </button>

      {/* Downvote Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => onVote('dislike')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer active:scale-95 disabled:cursor-not-allowed ${
          isDisliked
            ? 'bg-rose-500 text-white shadow-xs'
            : 'bg-white text-slate-600 hover:text-rose-600 hover:bg-rose-50/60 border border-slate-200/80'
        }`}
        title={isDisliked ? 'Remove dislike' : 'Vote dislike'}
        aria-label={`Dislike (${dislikes} votes)`}
      >
        <ThumbsDown className={`w-3.5 h-3.5 ${isDisliked ? 'fill-current' : ''}`} />
        <span>{dislikes}</span>
      </button>
    </div>
  );
}
