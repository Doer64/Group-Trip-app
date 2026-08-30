'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Users, UserPlus, Trophy, LayoutGrid, Sparkles, Trash2, MapPin } from 'lucide-react';
import { TripWithDetails } from '@/lib/types/database.types';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { useToast } from '../ui/Toast';
import { InviteLinkBox } from './InviteLinkBox';

interface TripHeaderProps {
  trip: TripWithDetails;
  attractionCount?: number;
}

export function TripHeader({ trip, attractionCount = 0 }: TripHeaderProps) {
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
  
  const isResultsPage = pathname?.endsWith('/results');

  const members = trip.members || [];
  const imageUrl = trip.image_url || trip.coverImage;
  const hasImage = Boolean(imageUrl && !imageError);

  const handleDeleteTrip = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/trips/${trip.id}`, {
        method: 'DELETE',
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to delete trip');
      }
      
      toast.success('Trip deleted successfully');
      router.push('/');
    } catch (error: any) {
      toast.error(error.message || 'An error occurred');
      setIsDeleting(false);
      setIsDeleteOpen(false);
    }
  };

  return (
    <>
      <div className="relative rounded-[2rem] overflow-hidden border border-white/30 shadow-xl shadow-indigo-300/30 mb-8 text-left transition-all duration-300">
        {/* Background Layer: Real Image with Gradient Overlay OR Pure CSS Gradient (No temp images) */}
        {hasImage ? (
          <div className="absolute inset-0 z-0 overflow-hidden">
            <img
              src={imageUrl!}
              alt={trip.destination}
              onError={() => setImageError(true)}
              className="w-full h-full object-cover transform scale-100 hover:scale-105 transition-transform duration-700 ease-out"
            />
            {/* Rich gradient overlay for crystal clear contrast */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/75 to-slate-900/40 backdrop-blur-[0.5px]" />
          </div>
        ) : (
          <div className="absolute inset-0 z-0 bg-linear-to-br from-indigo-800 via-violet-700 to-cyan-700 overflow-hidden">
            {/* Subtle decorative atmospheric accents - purely CSS/code generated */}
            <div className="absolute -top-24 -right-24 w-80 h-80 bg-amber-300/30 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-cyan-300/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
          </div>
        )}

        {/* Foreground Content */}
        <div className="relative z-10 p-6 sm:p-8 flex flex-col justify-between min-h-[230px]">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            {/* Destination & Meta */}
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/30 text-white text-[10px] font-black uppercase tracking-[0.16em] shadow-xs">
                {hasImage ? (
                  <MapPin className="w-3.5 h-3.5 text-indigo-300" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
                )}
                <span>trip mission</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-[-0.04em] drop-shadow-xs">
                {trip.destination}
              </h1>

              <div className="flex flex-wrap items-center gap-2 text-xs text-white/85">
                <span className="font-bold bg-black/15 backdrop-blur-xs px-2.5 py-1 rounded-full border border-white/10">
                  Organized by <strong className="text-white">{trip.creator?.name || 'Organizer'}</strong>
                </span>
                <span>•</span>
                <div className="flex items-center gap-1.5 bg-black/20 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-white/10">
                  <Users className="w-3.5 h-3.5 text-amber-200" />
                  <span>{members.length} {members.length === 1 ? 'member' : 'members'}</span>
                </div>
                {attractionCount > 0 && (
                  <>
                    <span>•</span>
                    <div className="flex items-center gap-1.5 bg-black/20 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-white/10">
                      <span>{attractionCount} {attractionCount === 1 ? 'place' : 'places'} proposed</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center flex-wrap gap-2.5 shrink-0 self-start md:self-auto">
              {/* Delete Trip Button */}
              {trip.isCreator && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setIsDeleteOpen(true)}
                  leftIcon={<Trash2 className="w-4 h-4 text-rose-300" />}
                  className="bg-rose-950/40 hover:bg-rose-900/60 text-rose-100 border border-rose-300/30 backdrop-blur-md shadow-xs cursor-pointer"
                >
                  Delete Trip
                </Button>
              )}

              {/* Invite Button */}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsInviteOpen(true)}
                leftIcon={<UserPlus className="w-4 h-4 text-indigo-600" />}
                className="bg-white/95 hover:bg-white text-indigo-950 font-black border border-white/40 shadow-sm cursor-pointer"
              >
                Invite Friends
              </Button>

              {/* Switch between Board & Results */}
              {isResultsPage ? (
                <Link href={`/trip/${trip.id}`}>
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<LayoutGrid className="w-4 h-4 text-white" />}
                    className="bg-amber-300 hover:bg-amber-400 text-indigo-950 font-black border border-amber-200 shadow-md shadow-amber-950/15 cursor-pointer"
                  >
                    Trip Board
                  </Button>
                </Link>
              ) : (
                <Link href={`/trip/${trip.id}/results`}>
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<Trophy className="w-4 h-4 text-amber-300" />}
                    className="bg-amber-300 hover:bg-amber-400 text-indigo-950 font-black border border-amber-200 shadow-md shadow-amber-950/15 cursor-pointer"
                  >
                    View Results
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Member Avatars / Participants Row */}
          {members.length > 0 && (
            <div className="mt-6 pt-4 border-t border-white/10 flex items-center gap-2 overflow-x-auto py-1">
              <span className="text-xs font-black text-white/65 shrink-0 mr-1">
                Crew:
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/15 text-xs font-bold text-white shadow-xs transition-colors"
                    title={member.email}
                  >
                    <div className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-emerald-400/20" />
                    <span>{member.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Invite Modal */}
      <Modal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        title={`Invite to ${trip.destination} Trip`}
        description="Share this link with your friends or family group to start collaborating."
      >
        <InviteLinkBox
          inviteToken={trip.invite_token}
          destination={trip.destination}
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => !isDeleting && setIsDeleteOpen(false)}
        title="Delete Trip"
        description={`Are you sure you want to delete the trip to ${trip.destination}? This action cannot be undone and will delete all proposed places and votes.`}
      >
        <div className="flex justify-end gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() => setIsDeleteOpen(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDeleteTrip}
            isLoading={isDeleting}
          >
            Yes, delete trip
          </Button>
        </div>
      </Modal>
    </>
  );
}
