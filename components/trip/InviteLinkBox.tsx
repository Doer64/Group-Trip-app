'use client';

import React, { useState, useEffect } from 'react';
import { Copy, Check, MessageCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';

interface InviteLinkBoxProps {
  inviteToken: string;
  destination: string;
}

export function InviteLinkBox({ inviteToken, destination }: InviteLinkBoxProps) {
  const [copied, setCopied] = useState(false);
  const [inviteUrl, setInviteUrl] = useState('');
  const { success } = useToast();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setInviteUrl(`${window.location.origin}/invite/${inviteToken}`);
    }
  }, [inviteToken]);

  const handleCopy = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      success('Invite link copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  const shareText = `Join our trip planning group for ${destination}! Propose and vote on attractions here: ${inviteUrl}`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;

  return (
    <div className="space-y-4 text-left">
      <p className="text-xs text-slate-500">
        Share this link with your friends to start pitching and voting.
      </p>

      {/* Copy link input row */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          readOnly
          value={inviteUrl}
          className="flex-1 h-9 bg-slate-50 border border-slate-200 rounded-xl px-3.5 text-xs text-slate-800 font-mono select-all focus:outline-none focus:border-blue-500"
        />
        <Button
          size="sm"
          variant={copied ? 'secondary' : 'primary'}
          onClick={handleCopy}
          leftIcon={copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
        >
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>

      {/* Share directly */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
        <span className="text-xs font-bold text-slate-600">Quick share:</span>
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="h-9 inline-flex items-center gap-1.5 px-3.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold transition-colors"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          <span>Share to WhatsApp</span>
        </a>
      </div>
    </div>
  );
}
