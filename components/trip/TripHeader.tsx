'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Users, UserPlus, Trophy, LayoutGrid, Sparkles, Trash2 } from 'lucide-react';
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
  
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
  
  const isResultsPage = pathname?.endsWith('/results');

  const members = trip.members || [];

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
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-7 shadow-xs mb-8 text-left">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          {/* Destination & Meta */}
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold uppercase tracking-wider mb-2">
              <Sparkles className="w-3 h-3 text-indigo-500" />
              <span>Group Trip</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {trip.destination}
            </h1>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-500">
              <span className="font-medium text-slate-700">
                Organized by {trip.creator?.name || 'Organizer'}
              </span>
              <span>•</span>
              <div className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                <span>{members.length} {members.length === 1 ? 'member' : 'members'}</span>
              </div>
              {attractionCount > 0 && (
                <>
                  <span>•</span>
                  <span>{attractionCount} {attractionCount === 1 ? 'place' : 'places'} proposed</span>
                </>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center flex-wrap gap-2.5">
            {/* Delete Trip Button */}
            {trip.isCreator && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => setIsDeleteOpen(true)}
                leftIcon={<Trash2 className="w-4 h-4 text-rose-600" />}
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
            >
              Invite Friends
            </Button>

            {/* Switch between Board & Results */}
            {isResultsPage ? (
              <Link href={`/trip/${trip.id}`}>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<LayoutGrid className="w-4 h-4" />}
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
                >
                  View Results
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Member Avatars Row */}
        {members.length > 0 && (
          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center gap-2 overflow-x-auto py-1">
            <span className="text-xs font-semibold text-slate-500 shrink-0 mr-1">
              Participants:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200/60 text-xs font-medium text-slate-700"
                  title={member.email}
                >
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>{member.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
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
