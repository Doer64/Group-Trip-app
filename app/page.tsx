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
      className="group relative flex flex-col justify-between bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs hover:shadow-md hover:border-indigo-300 transition-all text-left"
    >
      {/* Top part: Destination Title + Image */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
            {trip.destination}
          </h3>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all shrink-0" />
        </div>

        {/* Image Thumbnail */}
        <div className="w-full h-28 rounded-xl bg-slate-100 overflow-hidden mb-3 relative">
          {imageUrl && !imageError ? (
            <img
              src={imageUrl}
              alt={trip.destination}
              onError={() => setImageError(true)}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-linear-to-br from-indigo-50/50 to-slate-100 text-slate-400">
              <MapPin className="w-6 h-6 mb-1 text-indigo-400 opacity-70" />
              <span className="text-[10px] font-medium tracking-wide truncate max-w-[90%] px-1">
                {trip.destination}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Details */}
      <div className="pt-2 border-t border-slate-100 space-y-1">
        <p className="text-xs text-slate-600 font-medium truncate">
          {trip.memberCount || 1}{" "}
          {(trip.memberCount || 1) === 1 ? "member" : "members"} |{" "}
          {trip.attractionCount || 0}{" "}
          {(trip.attractionCount || 0) === 1 ? "place" : "places"}
        </p>
        <p className="text-[11px] text-slate-400 font-medium">
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
      <div className="space-y-8 text-left py-4">
        {/* Title */}
        <section className="text-center py-4">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Where are we flying, {firstName}?
          </h1>
        </section>

        {/* Your Trips Section */}
        <div className="space-y-4">
          {/* Header Row */}
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Your Trips
            </h2>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setIsJoinModalOpen(true)}
                leftIcon={<KeyRound className="w-4 h-4 text-slate-500" />}
                className="font-semibold text-xs"
              >
                Join with Code
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => setIsCreateModalOpen(true)}
                leftIcon={<Plus className="w-4 h-4" />}
                className="bg-emerald-500 hover:bg-emerald-600 font-semibold text-xs shadow-xs"
              >
                New Trip
              </Button>
            </div>
          </div>

          {/* Trips Container Card */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-7 shadow-xs min-h-[220px]">
            {isLoadingTrips ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-44 rounded-2xl bg-slate-100 animate-pulse border border-slate-200/60"
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
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                  <Compass className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    No trips planned yet
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Start a new trip to begin proposing attractions and voting
                    with friends, or join one with an invite code.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    onClick={() => setIsCreateModalOpen(true)}
                    className="bg-emerald-500 hover:bg-emerald-600 font-semibold"
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
    <div className="space-y-10 py-6 text-center max-w-4xl mx-auto">
      {/* Title & Prominent Log In Button */}
      <section className="space-y-6">
        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
          Planning a trip with friends?
        </h1>

        <div>
          <Link href="/login">
            <button
              type="button"
              className="inline-flex items-center justify-center px-10 py-3.5 rounded-2xl bg-cyan-200 hover:bg-cyan-300 text-slate-900 font-bold text-base shadow-xs transition-all hover:scale-105 active:scale-95 cursor-pointer border border-cyan-300/60"
            >
              Log In
            </button>
          </Link>
        </div>
      </section>

      {/* Side-by-Side Action Cards with 'OR' */}
      <div className="relative flex flex-col md:flex-row items-stretch justify-center gap-6 pt-4">
        {/* Left Card: Create Trip */}
        <div className="flex-1 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs text-left flex flex-col justify-between">
          <form onSubmit={handleLoggedOutCreate} className="space-y-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Where are you traveling to?
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Type any city or country to get started
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
                className="w-full py-3 px-4 rounded-xl bg-amber-300 hover:bg-amber-400 text-slate-900 font-bold text-sm shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 border border-amber-400/50"
              >
                <span>{isCreatingLoggedOut ? "Starting..." : "Let's Go!"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>

        {/* Centered OR Divider */}
        <div className="flex items-center justify-center -my-2 md:-mx-3 z-10">
          <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-400 shadow-xs">
            OR
          </div>
        </div>

        {/* Right Card: Join Trip */}
        <div className="flex-1 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs text-left flex flex-col justify-between">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleJoinWithCode(loggedOutInviteCode);
            }}
            className="space-y-5"
          >
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Do you have an invite?
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Paste an invite code or full URL to jump in
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
                className="w-full py-3 px-4 rounded-xl bg-emerald-400 hover:bg-emerald-500 text-slate-900 font-bold text-sm shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 border border-emerald-500/50"
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
