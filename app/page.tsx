"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Compass, Plus, KeyRound, MapPin, ArrowRight } from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { DestinationInput } from "@/components/trip/DestinationInput";
import { TripCreateForm } from "@/components/trip/TripCreateForm";
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
      className="group relative flex flex-col justify-between bg-white/90 rounded-3xl border border-indigo-100 p-4 shadow-sm shadow-indigo-100/50 hover:shadow-xl hover:shadow-indigo-200/40 hover:-translate-y-1 hover:border-violet-300 transition-all text-left overflow-hidden"
    >
      {/* Top part: Destination Title + Image */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className="text-base font-black text-indigo-950 group-hover:text-violet-600 transition-colors truncate">
            {trip.destination}
          </h3>
          <ArrowRight className="w-4 h-4 text-indigo-300 group-hover:text-violet-600 group-hover:translate-x-0.5 transition-all shrink-0" />
        </div>

        {/* Image Thumbnail */}
        <div className="w-full h-28 rounded-2xl bg-indigo-50 overflow-hidden mb-3 relative">
          {imageUrl && !imageError ? (
            <img
              src={imageUrl}
              alt={trip.destination}
              onError={() => setImageError(true)}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-linear-to-br from-violet-100 to-cyan-100 text-indigo-400">
              <MapPin className="w-6 h-6 mb-1 text-violet-500 opacity-70" />
              <span className="text-[10px] font-medium tracking-wide truncate max-w-[90%] px-1">
                {trip.destination}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Details */}
      <div className="pt-2 border-t border-indigo-50 space-y-1">
        <p className="text-xs text-indigo-600 font-bold truncate">
          {trip.memberCount || 1}{" "}
          {(trip.memberCount || 1) === 1 ? "member" : "members"} |{" "}
          {trip.attractionCount || 0}{" "}
          {(trip.attractionCount || 0) === 1 ? "place" : "places"}
        </p>
        <p className="text-[11px] text-indigo-300 font-medium">
          {formatDate(trip.created_at)}
        </p>
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
  const [destinationError, setDestinationError] = useState<
    string | undefined
  >();
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
          `Sign in to create your trip to ${loggedOutDestination.trim()}`,
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
      <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
        <span className="text-sm font-medium">Loading...</span>
      </div>
    );
  }

  // ==========================================
  // VIEW 1: LOGGED IN
  // ==========================================
  if (isAuthenticated && user) {
    const firstName = user.name ? user.name.split(" ")[0] : "there";

    return (
      <div className="space-y-8 text-left py-3 sm:py-5">
        {/* Title */}
        <section className="text-center py-4 sm:py-7">
          <p className="text-xs font-black tracking-[0.2em] text-violet-500 mb-3">YOUR TRIP HQ</p>
          <h1 className="text-3xl sm:text-5xl font-black text-indigo-950 tracking-[-0.04em]">
            Where to next, {firstName}? <span className="inline-block rotate-[-8deg]">✈️</span>
          </h1>
        </section>

        {/* Your Trips Section */}
        <div className="space-y-4">
          {/* Header Row */}
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-black text-indigo-950 tracking-tight">
              Your Trips
            </h2>

            <div className="flex items-center gap-2">
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
                variant="primary"
                size="sm"
                onClick={() => setIsCreateModalOpen(true)}
                leftIcon={<Plus className="w-4 h-4" />}
                className="bg-linear-to-br from-amber-300 to-orange-400 hover:from-amber-400 hover:to-orange-500 text-indigo-950 font-black text-xs shadow-md shadow-amber-200"
              >
                New Trip
              </Button>
            </div>
          </div>

          {/* Trips Container Card */}
          <div className="bg-white/75 rounded-[2rem] border border-white p-5 sm:p-7 shadow-xl shadow-indigo-100/50 min-h-[220px]">
            {isLoadingTrips ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-44 rounded-3xl bg-indigo-100/70 animate-pulse border border-indigo-100"
                  />
                ))}
              </div>
            ) : userTrips.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                {userTrips.map((trip) => (
                  <TripCardItem key={trip.id} trip={trip} />
                ))}
              </div>
            ) : (
              /* Empty state */
              <div className="py-12 text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-100 text-violet-600 flex items-center justify-center mx-auto shadow-sm rotate-[-5deg]">
                  <Compass className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-indigo-950">
                    The departure board is empty
                  </h3>
                  <p className="text-xs text-indigo-500 mt-1 max-w-sm mx-auto">
                    Give your group chat a mission: create a trip, invite the crew, then let the attractions battle it out.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    onClick={() => setIsCreateModalOpen(true)}
                    className="bg-linear-to-br from-amber-300 to-orange-400 hover:from-amber-400 hover:to-orange-500 text-indigo-950 font-black shadow-md shadow-amber-200"
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
          description="Enter a destination to start planning attractions and invite your travel group."
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
          description="Enter an invite code or URL shared by the trip organizer."
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
              placeholder="e.g. a1b2c3d4 or full link"
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
                className="w-full bg-emerald-500 hover:bg-emerald-600 font-semibold"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Join in!
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
    <div className="space-y-10 py-4 sm:py-8 text-center max-w-4xl mx-auto">
      {/* Title & Prominent Log In Button */}
      <section className="space-y-5 relative">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/80 border border-violet-100 px-4 py-2 text-xs font-black text-violet-600 shadow-sm">
          <span className="text-base leading-none">✦</span> GROUP TRIPS, ZERO GROUP CHAT CHAOS
        </div>
        <h1 className="text-4xl sm:text-6xl font-black text-indigo-950 tracking-[-0.04em] leading-[0.98]">
          Pick the trip.<br /><span className="text-transparent bg-clip-text bg-linear-to-r from-violet-600 via-indigo-600 to-cyan-500">Skip the drama.</span>
        </h1>
        <p className="max-w-xl mx-auto text-sm sm:text-base leading-relaxed text-indigo-600">
          Gather your crew, toss in the must-sees, and let the votes settle the “but I wanted pizza” debate.
        </p>

        <div>
          <Link href="/login">
            <button
              type="button"
              className="inline-flex items-center justify-center px-7 py-3 rounded-2xl bg-white hover:bg-indigo-50 text-indigo-800 font-black text-sm shadow-md shadow-indigo-200/40 transition-all hover:-translate-y-0.5 active:scale-95 cursor-pointer border border-indigo-100"
            >
              Log In
            </button>
          </Link>
        </div>
      </section>

      {/* Side-by-Side Action Cards with 'OR' */}
      <div className="relative flex flex-col md:flex-row items-stretch justify-center gap-6 pt-2">
        {/* Left Card: Create Trip */}
        <div className="flex-1 bg-white/90 p-6 sm:p-8 rounded-[2rem] border border-violet-100 shadow-xl shadow-violet-100/50 text-left flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -top-8 -right-6 text-7xl opacity-10 rotate-12">🗺️</div>
          <form onSubmit={handleLoggedOutCreate} className="space-y-5">
            <div>
              <h2 className="text-xl font-black text-indigo-950">
                Start a fresh escape
              </h2>
              <p className="text-xs text-indigo-500 mt-1">
                Name a destination. We’ll handle the friendly campaigning.
              </p>
            </div>

            <DestinationInput
              placeholder="Destination"
              value={loggedOutDestination}
              onChange={(val) => {
                setLoggedOutDestination(val);
                if (destinationError) setDestinationError(undefined);
              }}
              error={destinationError}
            />

            <div className="pt-2">
              <button
                type="submit"
                disabled={isCreatingLoggedOut}
                className="w-full py-3 px-4 rounded-2xl bg-amber-300 hover:bg-amber-400 text-indigo-950 font-black text-sm shadow-md shadow-amber-200/60 transition-all hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 border border-amber-400/50"
              >
                <span>{isCreatingLoggedOut ? "Starting..." : "Let's Go!"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>

        {/* Centered OR Divider */}
        <div className="flex items-center justify-center -my-2 md:-mx-3 z-10">
          <div className="w-11 h-11 rounded-full bg-indigo-950 border-4 border-[#f7f7ff] flex items-center justify-center text-[10px] font-black text-white shadow-md">
            OR
          </div>
        </div>

        {/* Right Card: Join Trip */}
        <div className="flex-1 bg-white/90 p-6 sm:p-8 rounded-[2rem] border border-cyan-100 shadow-xl shadow-cyan-100/50 text-left flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -top-8 -right-6 text-7xl opacity-10 rotate-12">🎟️</div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleJoinWithCode(loggedOutInviteCode);
            }}
            className="space-y-5"
          >
            <div>
              <h2 className="text-xl font-black text-indigo-950">
                Your crew called
              </h2>
              <p className="text-xs text-indigo-500 mt-1">
                Paste the invite and join the adventure planning squad.
              </p>
            </div>

            <div>
              <Input
                placeholder="Code/URL"
                value={loggedOutInviteCode}
                onChange={(e) => setLoggedOutInviteCode(e.target.value)}
                required
                leftIcon={<KeyRound className="w-4 h-4 text-slate-400" />}
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3 px-4 rounded-2xl bg-cyan-300 hover:bg-cyan-400 text-indigo-950 font-black text-sm shadow-md shadow-cyan-200/60 transition-all hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 border border-cyan-400/50"
              >
                <span>Join in!</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
