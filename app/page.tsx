"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Compass, Plus, KeyRound, MapPin, ArrowRight, Sparkles, Users, Layers, Vote, Trophy } from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { DestinationInput } from "@/components/trip/DestinationInput";
import { TripCreateForm } from "@/components/trip/TripCreateForm";
import { FlightLoader } from "@/components/ui/FlightLoader";
import { Trip } from "@/lib/types/database.types";

function formatDate(dateStr?: string) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  } catch {
    return "";
  }
}

function TripCardItem({ trip }: { trip: Trip }) {
  const [imageError, setImageError] = useState(false);
  const imageUrl = trip.image_url || trip.coverImage;

  return (
    <Link
      href={`/trip/${trip.id}`}
      className="group relative flex flex-col justify-between bg-white rounded-3xl border border-slate-200/90 p-4 shadow-2xs hover:border-blue-300 interactive-card text-left overflow-hidden"
    >
      {/* Top part: Destination Title + Image */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className="text-base font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
            {trip.destination}
          </h3>
          <div className="w-7 h-7 rounded-xl bg-slate-100 group-hover:bg-blue-50 flex items-center justify-center text-slate-400 group-hover:text-blue-600 transition-colors shrink-0">
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Image Thumbnail */}
        <div className="w-full h-32 rounded-2xl bg-slate-100 overflow-hidden mb-3.5 relative">
          {imageUrl && !imageError ? (
            <img
              src={imageUrl}
              alt={trip.destination}
              onError={() => setImageError(true)}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-linear-to-br from-blue-50 via-slate-100 to-amber-50 text-slate-400">
              <MapPin className="w-6 h-6 mb-1 text-blue-500 opacity-80" />
              <span className="text-[11px] font-semibold text-slate-500 tracking-wide truncate max-w-[90%] px-1">
                {trip.destination}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Details */}
      <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-slate-600 font-semibold">
          <span className="inline-flex items-center gap-1 bg-slate-100 px-2.5 py-0.5 rounded-full text-[11px]">
            <Users className="w-3 h-3 text-slate-500" />
            {trip.memberCount || 1}
          </span>
          <span className="inline-flex items-center gap-1 bg-slate-100 px-2.5 py-0.5 rounded-full text-[11px]">
            <Layers className="w-3 h-3 text-slate-500" />
            {trip.attractionCount || 0}
          </span>
        </div>
        <span className="text-[11px] text-slate-400 font-medium">
          {formatDate(trip.created_at)}
        </span>
      </div>
    </Link>
  );
}

export default function HomePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: isAuthLoading } = useCurrentUser();

  // Logged-in trips state
  const [userTrips, setUserTrips] = useState<Trip[]>([]);
  const [isLoadingTrips, setIsLoadingTrips] = useState(false);

  // Modals for logged-in user
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);

  // Inputs for logged-out / standalone forms
  const [loggedOutDestination, setLoggedOutDestination] = useState("");
  const [loggedOutInviteCode, setLoggedOutInviteCode] = useState("");
  const [modalInviteCode, setModalInviteCode] = useState("");
  const [destinationError, setDestinationError] = useState<string | undefined>();
  const [isCreatingLoggedOut, setIsCreatingLoggedOut] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      setIsLoadingTrips(true);
      fetch("/api/users/me")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.trips) {
            setUserTrips(data.trips);
          }
        })
        .catch(() => {})
        .finally(() => setIsLoadingTrips(false));
    } else {
      setUserTrips([]);
    }
  }, [isAuthenticated]);

  const handleJoinWithCode = (code: string) => {
    const raw = code.trim();
    if (!raw) return;

    let token = raw;
    if (token.includes("/invite/")) {
      token = token.split("/invite/")[1].split("?")[0];
    }
    router.push(`/invite/${token}`);
  };

  const handleLoggedOutCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loggedOutDestination.trim()) {
      setDestinationError("Destination is required");
      return;
    }
    setDestinationError(undefined);

    if (!isAuthenticated) {
      router.push(
        `/login?redirect=/&message=${encodeURIComponent(
          `Sign in to start your trip to ${loggedOutDestination.trim()}`,
        )}`,
      );
      return;
    }

    setIsCreatingLoggedOut(true);
    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination: loggedOutDestination.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.tripId) {
        window.location.href = `/trip/${data.tripId}`;
      } else {
        router.push("/login?redirect=/");
      }
    } catch {
      router.push("/login?redirect=/");
    } finally {
      setIsCreatingLoggedOut(false);
    }
  };

  if (isAuthLoading) {
    return (
      <FlightLoader
        label="Scanning boarding passes..."
        sublabel="Connecting to your flight hub"
      />
    );
  }

  // ==========================================
  // VIEW 1: LOGGED IN
  // ==========================================
  if (isAuthenticated && user) {
    const firstName = user.name ? user.name.split(" ")[0] : "there";

    return (
      <div className="space-y-8 text-left py-2 sm:py-4">
        {/* Header Greeting */}
        <section className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 py-2">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Where to next, {firstName}?
            </h1>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsJoinModalOpen(true)}
              leftIcon={<KeyRound className="w-4 h-4 text-slate-500" />}
              className="font-bold text-xs"
            >
              Join with Code
            </Button>
            <Button
              type="button"
              variant="amber"
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
              className="text-xs"
            >
              New Trip
            </Button>
          </div>
        </section>

        {/* Your Trips Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Your Trips</span>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
                {userTrips.length}
              </span>
            </h2>
          </div>

          {/* Trips Grid Container */}
          <div className="bg-white/70 backdrop-blur-xs rounded-[2rem] border border-slate-200/80 p-5 sm:p-7 shadow-sm min-h-[220px]">
            {isLoadingTrips ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-56 rounded-3xl bg-slate-100 animate-pulse border border-slate-200/60"
                  />
                ))}
              </div>
            ) : userTrips.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                {userTrips.map((trip, index) => (
                  <div
                    key={trip.id}
                    className="animate-card-reveal"
                    style={{ animationDelay: `${Math.min(index * 60, 360)}ms` }}
                  >
                    <TripCardItem trip={trip} />
                  </div>
                ))}
              </div>
            ) : (
              /* Empty state */
              <div className="py-12 text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-600 flex items-center justify-center mx-auto shadow-2xs rotate-[-4deg]">
                  <Compass className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    The departure board is clear
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                    No flights booked yet. Pick a destination and rally your cabin crew.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <Button
                    type="button"
                    variant="amber"
                    size="md"
                    onClick={() => setIsCreateModalOpen(true)}
                    leftIcon={<Plus className="w-4 h-4" />}
                  >
                    Create a Trip
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    onClick={() => setIsJoinModalOpen(true)}
                    leftIcon={<KeyRound className="w-4 h-4 text-slate-500" />}
                  >
                    Join with Code
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal: Create Trip */}
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="Create a New Trip"
          description="Pick a destination to start packing the itinerary with your crew."
        >
          <TripCreateForm
            onSuccess={(newTripId) => {
              setIsCreateModalOpen(false);
              window.location.href = `/trip/${newTripId}`;
            }}
          />
        </Modal>

        {/* Modal: Join Trip */}
        <Modal
          isOpen={isJoinModalOpen}
          onClose={() => setIsJoinModalOpen(false)}
          title="Join an Existing Trip"
          description="Enter a boarding code or invite link shared by your trip organizer."
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleJoinWithCode(modalInviteCode);
            }}
            className="space-y-4 text-left"
          >
            <Input
              label="Invite Code or Link"
              placeholder="e.g. a1b2c3d4 or paste full link"
              value={modalInviteCode}
              onChange={(e) => setModalInviteCode(e.target.value)}
              required
              autoFocus
              leftIcon={<KeyRound className="w-4 h-4 text-slate-400" />}
            />
            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full font-bold"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Join Trip
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: LOGGED OUT
  // ==========================================
  return (
    <div className="space-y-10 py-6 sm:py-10 text-center max-w-4xl mx-auto">
      {/* Playful Hero Section */}
      <section className="space-y-4 relative">
        <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight leading-[1.05]">
          Pick the trip.<br />
          <span className="text-blue-600">Skip the group chat drama.</span>
        </h1>

        <p className="max-w-lg mx-auto text-sm sm:text-base leading-relaxed text-slate-600">
          Toss in your favorite spots, vote with your crew, and agree on the itinerary before takeoff.
        </p>

        <div className="pt-1">
          <Link href="/login">
            <Button variant="secondary" size="md">
              Sign In to Your Account
            </Button>
          </Link>
        </div>
      </section>

      {/* Side-by-Side Departure Gates */}
      <div className="relative flex flex-col md:flex-row items-stretch justify-center gap-5 pt-2">
        {/* Left Card: Create Trip */}
        <div className="flex-1 bg-white/95 p-6 sm:p-8 rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-900/5 text-left flex flex-col justify-between relative overflow-hidden">
          <form onSubmit={handleLoggedOutCreate} className="space-y-5">
            <div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                <Compass className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-extrabold text-slate-900">
                Start a New Trip
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Pick a destination and open the gate for your group.
              </p>
            </div>

            <DestinationInput
              placeholder="Destination (e.g. Rome, Tokyo)"
              value={loggedOutDestination}
              onChange={(val) => {
                setLoggedOutDestination(val);
                if (destinationError) setDestinationError(undefined);
              }}
              error={destinationError}
            />

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full font-bold"
                isLoading={isCreatingLoggedOut}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Create Trip
              </Button>
            </div>
          </form>
        </div>

        {/* Centered OR Divider */}
        <div className="flex items-center justify-center -my-2 md:-mx-3 z-10">
          <div className="w-10 h-10 rounded-full bg-slate-900 border-4 border-[#f8fafc] flex items-center justify-center text-[10px] font-black text-white shadow-md">
            OR
          </div>
        </div>

        {/* Right Card: Join Trip */}
        <div className="flex-1 bg-white/95 p-6 sm:p-8 rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-900/5 text-left flex flex-col justify-between relative overflow-hidden">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleJoinWithCode(loggedOutInviteCode);
            }}
            className="space-y-5"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
                <KeyRound className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-extrabold text-slate-900">
                Join a Friend&apos;s Trip
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Got a boarding code or link? Step right on board.
              </p>
            </div>

            <div>
              <Input
                placeholder="Paste code or invite URL"
                value={loggedOutInviteCode}
                onChange={(e) => setLoggedOutInviteCode(e.target.value)}
                required
                leftIcon={<KeyRound className="w-4 h-4 text-slate-400" />}
              />
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="amber"
                size="lg"
                className="w-full font-bold"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Join In
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* 3 Simple Pillars */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-slate-200/70 text-left">
        <div className="p-4 rounded-2xl bg-white/60 border border-slate-200/60">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-2 font-black text-xs">
            1
          </div>
          <h4 className="text-sm font-bold text-slate-900">Pitch Spots</h4>
          <p className="text-xs text-slate-500 mt-1">Add sights, landmarks, and food joints to the flight plan.</p>
        </div>

        <div className="p-4 rounded-2xl bg-white/60 border border-slate-200/60">
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-2 font-black text-xs">
            2
          </div>
          <h4 className="text-sm font-bold text-slate-900">Vote with the Crew</h4>
          <p className="text-xs text-slate-500 mt-1">Thumbs up or down before anyone buys non-refundable tickets.</p>
        </div>

        <div className="p-4 rounded-2xl bg-white/60 border border-slate-200/60">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2 font-black text-xs">
            3
          </div>
          <h4 className="text-sm font-bold text-slate-900">Consensus Leaderboard</h4>
          <p className="text-xs text-slate-500 mt-1">Top-voted activities climb to first class automatically.</p>
        </div>
      </div>
    </div>
  );
}
