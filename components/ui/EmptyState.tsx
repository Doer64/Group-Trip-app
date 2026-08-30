import React from 'react';
import { Compass } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-3xl border-2 border-dashed border-indigo-200 bg-white/70 shadow-xs">
      <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-indigo-600 mb-4 shadow-sm rotate-[-4deg]">
        {icon || <Compass className="w-6 h-6" />}
      </div>
      <h3 className="text-base font-black text-indigo-950 mb-1">{title}</h3>
      <p className="text-xs sm:text-sm text-indigo-500 max-w-sm mb-6 leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="primary" size="md">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
