"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useParams, useNavigate, Link } from "react-router-dom";
import { profiles, rakhis, handImage, formatINR } from "@/data/profiles";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Check, ArrowLeft, X, RotateCcw } from "lucide-react";

interface Position {
  x: number;
  y: number;
  rotation: number;
  scale: number;
}

interface PlacedRakhi {
  id: string;
  rakhiId: string;
  position: Position;
}

const WRIST_IMAGE_Y = 0.62;
const Y_BOTTOM = 62;
const STACK_Y_STEP = 8;
const SNAP_THRESHOLD_PX = 45;
const RAKHI_COUNTS_STORAGE_KEY = "rakhi-tie-counts";
const RAKHI_PLACEMENTS_STORAGE_KEY = "rakhi-placements";
const PROFILE_REWARDS_STORAGE_KEY = "rakhi-profile-rewards";
const PROFILE_CLAIMS_STORAGE_KEY = "rakhi-profile-claims";
const USER_WALLET_STORAGE_KEY = "rakhi-user-wallet";

function getTotalWalletFromRewards(rewards: Record<string, number>) {
  return Object.values(rewards).reduce(
    (sum, value) => sum + (Number(value) || 0),
    0,
  );
}

function writeProfileRewards(rewards: Record<string, number>) {
  localStorage.setItem(PROFILE_REWARDS_STORAGE_KEY, JSON.stringify(rewards));
  localStorage.setItem(
    USER_WALLET_STORAGE_KEY,
    String(getTotalWalletFromRewards(rewards)),
  );
}

function readStorageRecord<T>(key: string): Record<string, T> {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, T>)
      : {};
  } catch {
    return {};
  }
}

function getProfileClaimSignature(placedRakhis: PlacedRakhi[]) {
  return [...placedRakhis]
    .sort((a, b) => a.rakhiId.localeCompare(b.rakhiId))
    .map((placed) => placed.rakhiId)
    .join("|");
}

export function RakhiPage() {
  const { profileId } = useParams<{ profileId: string }>();
  const navigate = useNavigate();
  const profile = profiles.find(
    (p: (typeof profiles)[number]) => p.id === profileId,
  );

  const [selectedRakhiIds, setSelectedRakhiIds] = useState<string[]>([]);
  const [placedRakhis, setPlacedRakhis] = useState<PlacedRakhi[]>([]);
  const [savedProfilePlacements, setSavedProfilePlacements] = useState<
    PlacedRakhi[]
  >([]);
  const [draggingRakhiId, setDraggingRakhiId] = useState<string | null>(null);
  const [dragPosition, setDragPosition] = useState<Position>({
    x: 50,
    y: 80,
    rotation: 0,
    scale: 1,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [lastCelebrationReward, setLastCelebrationReward] = useState(0);
  const [celebrationMessage, setCelebrationMessage] = useState("");
  const [handImageLoaded, setHandImageLoaded] = useState(false);

  const handRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!profileId) {
      setPlacedRakhis([]);
      setSelectedRakhiIds([]);
      return;
    }

    const savedPlacements = readStorageRecord<PlacedRakhi[]>(
      RAKHI_PLACEMENTS_STORAGE_KEY,
    );
    const profilePlacements = Array.isArray(savedPlacements[profileId])
      ? savedPlacements[profileId]
      : [];

    setSavedProfilePlacements(profilePlacements);
    setPlacedRakhis([]);
    setSelectedRakhiIds(
      Array.from(
        new Set(profilePlacements.map((placedRakhi) => placedRakhi.rakhiId)),
      ),
    );
  }, [profileId]);

  const persistPlacements = useCallback(
    (nextPlacements: PlacedRakhi[]) => {
      if (!profileId) return;

      const savedCounts = readStorageRecord<number>(RAKHI_COUNTS_STORAGE_KEY);
      const savedPlacements = readStorageRecord<PlacedRakhi[]>(
        RAKHI_PLACEMENTS_STORAGE_KEY,
      );

      if (nextPlacements.length > 0) {
        savedPlacements[profileId] = nextPlacements;
        savedCounts[profileId] = nextPlacements.length;
      } else {
        delete savedPlacements[profileId];
        delete savedCounts[profileId];
      }

      localStorage.setItem(
        RAKHI_PLACEMENTS_STORAGE_KEY,
        JSON.stringify(savedPlacements),
      );
      localStorage.setItem(
        RAKHI_COUNTS_STORAGE_KEY,
        JSON.stringify(savedCounts),
      );
      setSavedProfilePlacements(nextPlacements);
    },
    [profileId],
  );

  const getWristPosition = useCallback((): Position => {
    const container = containerRef.current;
    const hand = handRef.current;
    if (!container || !hand) return { x: 50, y: 62, rotation: 0, scale: 1 };

    const containerRect = container.getBoundingClientRect();
    const handRect = hand.getBoundingClientRect();
    return {
      x:
        ((handRect.left + handRect.width / 2 - containerRect.left) /
          containerRect.width) *
        100,
      y:
        ((handRect.top + handRect.height * WRIST_IMAGE_Y - containerRect.top) /
          containerRect.height) *
        100,
      rotation: 0,
      scale: 1,
    };
  }, []);

  const playSound = useCallback((type: "snap" | "celebrate" | "select") => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
    }
    const ctx = audioContextRef.current;

    if (type === "snap") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    } else if (type === "celebrate") {
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "triangle";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(
          0.01,
          ctx.currentTime + i * 0.1 + 0.3,
        );
        osc.start(ctx.currentTime + i * 0.1);
        osc.stop(ctx.currentTime + i * 0.1 + 0.4);
      });
    } else {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    }
  }, []);

  const toggleRakhiSelection = (rakhiId: string) => {
    setSelectedRakhiIds((prev) => {
      const isSelected = prev.includes(rakhiId);
      playSound("select");
      return isSelected
        ? prev.filter((id) => id !== rakhiId)
        : [...prev, rakhiId];
    });
  };

  const handleDragStart = (
    e: React.MouseEvent | React.TouchEvent,
    rakhiId: string,
  ) => {
    const savedRakhiIds = new Set(
      savedProfilePlacements.map((placed) => placed.rakhiId),
    );
    if (!selectedRakhiIds.includes(rakhiId) || savedRakhiIds.has(rakhiId))
      return;
    e.preventDefault();
    e.stopPropagation();

    setDraggingRakhiId(rakhiId);
    setIsDragging(true);

    const existing = placedRakhis.find((p) => p.rakhiId === rakhiId);
    const startPos = existing?.position || {
      x: 50,
      y: 80,
      rotation: 0,
      scale: 1,
    };

    setDragPosition(startPos);
  };

  const handleDragMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!isDragging || !draggingRakhiId || !containerRef.current) return;

      e.preventDefault();
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

      const rect = containerRef.current.getBoundingClientRect();
      const newX = ((clientX - rect.left) / rect.width) * 100;
      const newY = ((clientY - rect.top) / rect.height) * 100;

      setDragPosition((prev) => ({
        ...prev,
        x: Math.max(5, Math.min(95, newX)),
        y: Math.max(5, Math.min(95, newY)),
      }));
    },
    [isDragging, draggingRakhiId],
  );

  const handleDragEnd = useCallback(() => {
    if (!isDragging || !draggingRakhiId) return;

    const wristPosition = getWristPosition();
    const rect = containerRef.current?.getBoundingClientRect();
    const distance = rect
      ? Math.hypot(
          ((dragPosition.x - wristPosition.x) / 100) * rect.width,
          ((dragPosition.y - wristPosition.y) / 100) * rect.height,
        )
      : Infinity;

    if (distance < SNAP_THRESHOLD_PX) {
      const snappedPos = {
        x: wristPosition.x,
        y: wristPosition.y,
        rotation: 0,
        scale: 1,
      };

      setPlacedRakhis((prev) => {
        const activePlacedRakhis = [...savedProfilePlacements, ...prev];
        const existing = activePlacedRakhis.find(
          (p) => p.rakhiId === draggingRakhiId,
        );
        const stackIndex = existing
          ? activePlacedRakhis.findIndex((p) => p.rakhiId === draggingRakhiId)
          : activePlacedRakhis.length;
        const stackY = Y_BOTTOM - stackIndex * STACK_Y_STEP;
        if (existing) {
          return prev.map((p) =>
            p.rakhiId === draggingRakhiId
              ? { ...p, position: { ...snappedPos, y: stackY } }
              : p,
          );
        }
        return [
          ...prev,
          {
            id: crypto.randomUUID(),
            rakhiId: draggingRakhiId!,
            position: { ...snappedPos, y: stackY },
          },
        ];
      });
      playSound("snap");
    }

    setIsDragging(false);
    setDraggingRakhiId(null);
  }, [
    isDragging,
    draggingRakhiId,
    dragPosition,
    getWristPosition,
    playSound,
    savedProfilePlacements,
  ]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleDragMove);
      window.addEventListener("mouseup", handleDragEnd);
      window.addEventListener("touchmove", handleDragMove, { passive: false });
      window.addEventListener("touchend", handleDragEnd);

      return () => {
        window.removeEventListener("mousemove", handleDragMove);
        window.removeEventListener("mouseup", handleDragEnd);
        window.removeEventListener("touchmove", handleDragMove);
        window.removeEventListener("touchend", handleDragEnd);
      };
    }
  }, [isDragging, handleDragMove, handleDragEnd]);

  const handleHandLoad = () => {
    setHandImageLoaded(true);
  };

  const removeRakhi = (rakhiId: string) => {
    setPlacedRakhis((prev) => prev.filter((p) => p.rakhiId !== rakhiId));
  };

  const handleCelebrate = () => {
    if (placedRakhis.length === 0 || !profileId) return;

    const totalReward = placedRakhis.reduce((sum, placed) => {
      const rakhi = rakhis.find(
        (item: (typeof rakhis)[number]) => item.id === placed.rakhiId,
      );
      return sum + (rakhi?.value ?? 0);
    }, 0);

    const savedRewards = readStorageRecord<number>(PROFILE_REWARDS_STORAGE_KEY);
    const currentProfileReward = Number(savedRewards[profileId] || 0);
    const savedClaims = readStorageRecord<string[]>(PROFILE_CLAIMS_STORAGE_KEY);
    const profileClaims = Array.isArray(savedClaims[profileId])
      ? savedClaims[profileId]
      : [];
    const claimSignature = getProfileClaimSignature(placedRakhis);

    const alreadyClaimed = profileClaims.includes(claimSignature);
    setLastCelebrationReward(alreadyClaimed ? 0 : totalReward);
    setCelebrationMessage(
      alreadyClaimed
        ? "Already claimed this rakhi set"
        : `${profile?.name ?? "Profile"} just earned ${formatINR(totalReward)}`,
    );

    if (alreadyClaimed) {
      const nextSavedPlacements = [...savedProfilePlacements, ...placedRakhis];
      persistPlacements(nextSavedPlacements);
      setPlacedRakhis([]);
      setSelectedRakhiIds([]);
      setShowCelebration(true);
      playSound("celebrate");
      return;
    }

    if (totalReward > 0) {
      const nextRewards = { ...savedRewards };
      nextRewards[profileId] = currentProfileReward + totalReward;
      writeProfileRewards(nextRewards);

      const nextSavedPlacements = [...savedProfilePlacements, ...placedRakhis];
      persistPlacements(nextSavedPlacements);

      profileClaims.push(claimSignature);
      savedClaims[profileId] = [...new Set(profileClaims)];
      localStorage.setItem(
        PROFILE_CLAIMS_STORAGE_KEY,
        JSON.stringify(savedClaims),
      );
    }

    setPlacedRakhis([]);
    setSelectedRakhiIds([]);
    setShowCelebration(true);
    playSound("celebrate");
  };

  const handleReset = () => {
    setPlacedRakhis([]);
    setSelectedRakhiIds([]);
    setShowCelebration(false);
    setLastCelebrationReward(0);
    setCelebrationMessage("");
    if (profileId) {
      const savedCounts = readStorageRecord<number>(RAKHI_COUNTS_STORAGE_KEY);
      const savedRewards = readStorageRecord<number>(
        PROFILE_REWARDS_STORAGE_KEY,
      );
      const remainingRewards = { ...savedRewards };
      delete remainingRewards[profileId];
      writeProfileRewards(remainingRewards);

      delete savedCounts[profileId];
      localStorage.setItem(
        RAKHI_COUNTS_STORAGE_KEY,
        JSON.stringify(savedCounts),
      );

      const savedClaims = readStorageRecord<string[]>(
        PROFILE_CLAIMS_STORAGE_KEY,
      );
      delete savedClaims[profileId];
      localStorage.setItem(
        PROFILE_CLAIMS_STORAGE_KEY,
        JSON.stringify(savedClaims),
      );

      const savedPlacements = readStorageRecord<PlacedRakhi[]>(
        RAKHI_PLACEMENTS_STORAGE_KEY,
      );
      delete savedPlacements[profileId];
      localStorage.setItem(
        RAKHI_PLACEMENTS_STORAGE_KEY,
        JSON.stringify(savedPlacements),
      );

      setSavedProfilePlacements([]);
    }
  };

  const handleCloseCelebration = () => {
    setPlacedRakhis([]);
    setSelectedRakhiIds([]);
    setShowCelebration(false);
    setLastCelebrationReward(0);
    setCelebrationMessage("");
  };

  const wristPosition = getWristPosition();
  const containerBounds = containerRef.current?.getBoundingClientRect();
  const isNearWrist = containerBounds
    ? Math.hypot(
        ((dragPosition.x - wristPosition.x) / 100) * containerBounds.width,
        ((dragPosition.y - wristPosition.y) / 100) * containerBounds.height,
      ) < SNAP_THRESHOLD_PX
    : false;
  const savedRakhiIds = new Set(
    savedProfilePlacements.map((placed) => placed.rakhiId),
  );
  const previewRakhiId =
    draggingRakhiId ??
    selectedRakhiIds.find(
      (id) =>
        !placedRakhis.some((placed) => placed.rakhiId === id) &&
        !savedRakhiIds.has(id),
    );
  const activePlacedRakhis = [...savedProfilePlacements, ...placedRakhis];
  const visiblePlacedRakhis = activePlacedRakhis;
  const canCelebrate = placedRakhis.length > 0;

  if (!profile) return null;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-800">
      <header className="border-b border-slate-200 bg-white p-2 md:p-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-2">
          <Link
            to="/"
            className="flex items-center gap-2 text-slate-500 transition-colors hover:text-sky-500"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back to Profiles</span>
          </Link>

          <div className="flex items-center gap-3">
            <div className="hidden h-10 w-10 items-center justify-center rounded-full bg-sky-400 font-bold text-white">
              {profile.name.charAt(0)}
            </div>
            <span className="font-extrabold text-slate-700">
              {profile.name}
            </span>
            <img
              src={profile.image}
              alt={profile.name}
              className="h-10 w-10 rounded-full border-2 border-sky-200 object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
                const fallback = e.currentTarget
                  .nextElementSibling as HTMLElement | null;
                if (fallback) {
                  fallback.classList.remove("hidden");
                }
              }}
            />
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6 max-w-6xl mx-auto w-full">
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="relative flex min-w-0 flex-col">
            <Card className="min-h-0 overflow-hidden">
              <CardContent className="p-0 relative h-full">
                <div
                  ref={containerRef}
                  className="relative flex w-full items-center justify-center bg-white sm:min-h-[560px] lg:mx-auto lg:w-lg lg:max-h-[560px]"
                  style={{ touchAction: "none" }}
                >
                  <img
                    ref={handRef}
                    src={handImage}
                    alt="Hand for rakhi"
                    className="max-w-[80%] max-h-[90%] object-contain lg:max-w-[65%] lg:max-h-[75%]"
                    onLoad={handleHandLoad}
                    onError={() => {}}
                    style={{ opacity: handImageLoaded ? 1 : 0 }}
                  />

                  {!handImageLoaded && (
                    <div className="text-center text-slate-400">
                      <p className="text-sm mb-2">Loading hand image...</p>
                    </div>
                  )}

                  {isDragging && (
                    <div
                      className="pointer-events-none absolute z-40 flex h-20 w-52 -translate-x-1/2 -translate-y-1/2 animate-pulse items-center justify-center rounded-full border-2 border-dashed border-sky-400 bg-sky-300/20 shadow-[0_0_0_8px_rgba(14,165,233,0.12)]"
                      style={{
                        left: `${wristPosition.x}%`,
                        top: `${wristPosition.y}%`,
                      }}
                    >
                      <span className="rounded-full bg-sky-500 px-3 py-1 text-xs font-extrabold text-white shadow-md">
                        Snap here
                      </span>
                    </div>
                  )}

                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      clipPath: `polygon(34% 0%, 66% 0%, 63% 68%, 37% 68%)`,
                      WebkitClipPath: `polygon(34% 0%, 66% 0%, 63% 68%, 37% 68%)`,
                    }}
                  >
                    {visiblePlacedRakhis.map((placed) => {
                      const rakhi = rakhis.find(
                        (r: (typeof rakhis)[number]) => r.id === placed.rakhiId,
                      );
                      if (!rakhi) return null;

                      const isCurrentDrag =
                        draggingRakhiId === rakhi.id && isDragging;
                      const pos = isCurrentDrag
                        ? dragPosition
                        : placed.position;

                      return (
                        <PlacedRakhi
                          key={`${placed.id}-${placed.rakhiId}`}
                          rakhi={rakhi}
                          position={pos}
                        />
                      );
                    })}
                  </div>

                  {previewRakhiId && (
                    <>
                      {!isDragging && (
                        <div
                          className="pointer-events-none absolute z-40 -translate-x-1/2 rounded-full bg-slate-700 px-4 py-2 text-sm font-extrabold text-white shadow-lg"
                          style={{ left: "50%", top: "67%" }}
                        >
                          Drag rakhi on wrist
                        </div>
                      )}
                      <DraggingRakhiPreview
                        rakhi={
                          rakhis.find(
                            (r: (typeof rakhis)[number]) =>
                              r.id === previewRakhiId,
                          )!
                        }
                        position={
                          isDragging
                            ? dragPosition
                            : { x: 50, y: 80, rotation: 0, scale: 1 }
                        }
                        isNearWrist={isDragging && isNearWrist}
                        containerRef={containerRef}
                        handRef={handRef}
                        onDragStart={(e) => handleDragStart(e, previewRakhiId)}
                      />
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {!showCelebration && (
              <div className="mt-4 flex w-full shrink-0 flex-col justify-center gap-3 sm:flex-row">
                <Button
                  onClick={handleCelebrate}
                  disabled={!canCelebrate}
                  className="min-h-11 w-full bg-[#58a700] font-extrabold shadow-[0_3px_0_#467f00] hover:bg-[#64b800] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:min-w-44"
                >
                  <Check className="mr-2 h-5 w-5" />
                  Done - Celebrate!
                </Button>
                <Button
                  variant="outline"
                  onClick={handleReset}
                  className="min-h-11 w-full sm:w-auto sm:min-w-32"
                >
                  <RotateCcw className="mr-2 h-5 w-5" />
                  Reset
                </Button>
              </div>
            )}
          </div>

          <aside className="grid lg:grid-cols-2 gap-4 md:mb-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-extrabold text-slate-700">
                    Available Rakhis
                  </h3>
                  <span className="text-sm text-slate-400">
                    {selectedRakhiIds.length}/{rakhis.length} selected
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {rakhis.map((rakhi: (typeof rakhis)[number]) => {
                    const isSavedPlaced = savedProfilePlacements.some(
                      (p) => p.rakhiId === rakhi.id,
                    );
                    const isSelected =
                      selectedRakhiIds.includes(rakhi.id) || isSavedPlaced;
                    const isPlaced = placedRakhis.some(
                      (p) => p.rakhiId === rakhi.id,
                    );
                    return (
                      <button
                        key={rakhi.id}
                        onClick={() => toggleRakhiSelection(rakhi.id)}
                        className={`
                          relative group p-3 rounded-lg border-2 transition-all duration-200
                          ${
                            isSelected
                              ? "border-sky-400 bg-sky-50"
                              : "border-slate-200 hover:border-sky-300"
                          }
                          ${isPlaced || isSavedPlaced ? "opacity-60" : ""}
                          ${isSelected ? "cursor-pointer" : "cursor-pointer"}
                        `}
                        disabled={isSavedPlaced || (isPlaced && !isSelected)}
                        aria-disabled={
                          isSavedPlaced || (isPlaced && !isSelected)
                        }
                      >
                        <div className="relative mb-2 aspect-square overflow-hidden rounded-lg bg-sky-50">
                          <img
                            src={rakhi.image}
                            alt={rakhi.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                              const fallback =
                                e.currentTarget.nextElementSibling;
                              if (fallback) {
                                fallback.classList.remove("hidden");
                              }
                            }}
                          />
                          <div className="absolute inset-0 hidden items-center justify-center bg-sky-100 text-3xl">
                            🎀
                          </div>
                          {(isPlaced || isSavedPlaced) && (
                            <div className="absolute inset-0 flex items-center justify-center bg-slate-700/65">
                              <Check className="h-6 w-6 text-[#58a700]" />
                            </div>
                          )}
                        </div>
                        <p className="truncate text-center text-xs font-bold text-slate-600">
                          {rakhi.name}
                        </p>
                        {isSelected && (
                          <div className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-sky-500 text-xs text-white">
                            <X
                              className="w-3 h-3"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleRakhiSelection(rakhi.id);
                              }}
                            />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-3 text-center text-xs text-slate-400">
                  Click to select/deselect. Then drag onto the wrist.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <h3 className="mb-3 text-sm font-extrabold text-slate-700">
                  Placed Rakhis
                </h3>
                {activePlacedRakhis.length === 0 ? (
                  <p className="py-4 text-center text-slate-400">
                    No rakhis placed yet
                  </p>
                ) : (
                  <div className="space-y-2 overflow-y-auto">
                    {activePlacedRakhis.map((placed) => {
                      const rakhi = rakhis.find(
                        (r: (typeof rakhis)[number]) => r.id === placed.rakhiId,
                      );
                      return (
                        <div
                          key={placed.id}
                          className="flex items-center gap-3 rounded-lg bg-slate-50 p-2"
                        >
                          <img
                            src={rakhi?.image}
                            alt={rakhi?.name}
                            className="w-8 h-8 rounded object-cover"
                          />
                          <span className="flex-1 truncate text-sm font-bold text-slate-600">
                            {rakhi?.name}
                          </span>
                          {/* <button
                            onClick={() => removeRakhi(rakhi!.id)}
                            className="p-1 text-rose-500 hover:text-rose-700"
                            aria-label="Remove rakhi"
                          >
                            <X className="w-4 h-4" />
                          </button> */}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>

      <CelebrationOverlay
        isOpen={showCelebration}
        onClose={handleCloseCelebration}
        profile={profile}
        rewardTotal={lastCelebrationReward}
        message={celebrationMessage}
        navigate={navigate}
      />
    </div>
  );
}

function PlacedRakhi({ rakhi, position }: { rakhi: any; position: Position }) {
  return (
    <motion.div
      className="absolute left-1/2 flex h-[42px] w-full items-center justify-center pointer-events-none sm:h-[52px]"
      style={{
        top: `${position.y}%`,
        transform: "translate(-51%, -60%) rotate(0deg)",
      }}
      initial={false}
      animate={{ top: `${position.y}%` }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
    >
      <img
        src={rakhi.image}
        alt={rakhi.name}
        className="block w-full h-full drop-shadow-sm"
        style={{
          objectFit: "cover",
          objectPosition: "center",
          transform: "scale(1)",
        }}
      />
    </motion.div>
  );
}

function DraggingRakhiPreview({
  rakhi,
  position,
  isNearWrist,
  containerRef,
  handRef,
  onDragStart,
}: {
  rakhi: any;
  position: Position;
  isNearWrist: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
  handRef: React.RefObject<HTMLImageElement | null>;
  onDragStart: (e: React.MouseEvent | React.TouchEvent) => void;
}) {
  const getStyle = () => {
    if (!containerRef.current) return {};
    const rect = containerRef.current.getBoundingClientRect();
    const handRect = handRef.current?.getBoundingClientRect();
    if (!handRect) return {};
    const cx = (position.x / 100) * rect.width;
    const cy = (position.y / 100) * rect.height;
    const width = handRect.width * 0.72 * position.scale;

    return {
      left: `${cx}px`,
      top: `${cy}px`,
      width: "var(--calculated-wrist-width)",
      "--calculated-wrist-width": `${width}px`,
      height: "60px",
      transform: "translate(-50%, -50%) rotate(0deg)",
      overflow: "hidden",
      filter: isNearWrist
        ? "drop-shadow(0 0 12px #f59e0b) drop-shadow(0 0 20px #f59e0b)"
        : "drop-shadow(0 8px 20px rgba(0,0,0,0.3))",
      touchAction: "none",
    };
  };

  return (
    <div
      className="absolute z-50 transition-transform duration-50"
      style={getStyle()}
      onMouseDown={onDragStart}
      onTouchStart={onDragStart}
    >
      <div className="relative w-full h-full">
        <img
          src={rakhi.image}
          alt={rakhi.name}
          className="block h-full w-full drop-shadow-sm animate-pulse cursor-grab active:cursor-grabbing"
          style={{
            objectFit: "contain",
            objectPosition: "center",
            transform: "scale(2.2)",
          }}
        />
        {/* <div className="absolute -bottom-2 left-1/2 h-3 w-20 -translate-x-1/2 rounded-full bg-sky-300 opacity-50 blur-sm" /> */}
      </div>
      {/* <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-slate-700 px-2 py-0.5 text-xs font-bold text-black drop-shadow-lg">
        {rakhi.name}
      </div> */}
    </div>
  );
}

function CelebrationOverlay({
  isOpen,
  onClose,
  profile,
  rewardTotal,
  message,
  navigate,
}: {
  isOpen: boolean;
  onClose: () => void;
  profile: any;
  rewardTotal: number;
  message: string;
  navigate: any;
}) {
  const [burst, setBurst] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setBurst(true), 100);
    } else {
      setBurst(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <ConfettiCanvas burst={burst} />
      <Dialog
        open={isOpen}
        onOpenChange={(open: boolean) => !open && onClose()}
      >
        <DialogContent className="max-w-md overflow-visible p-6 md:p-8">
          <div className="relative z-10">
            <div className="relative z-10 text-center">
              <div className="flex flex-col items-center justify-center gap-2">
                <div className="inline-flex h-30 animate-scale-in items-center justify-center rounded-full">
                  <img
                    src="/cat-meme.gif"
                    alt="cat-meme"
                    className="h-30 items-center"
                  />
                </div>

                <DialogTitle className="text-2xl font-extrabold text-[#58a700] md:text-3xl">
                  {rewardTotal > 0
                    ? `You got ${formatINR(rewardTotal)} from ${profile.name}!`
                    : message || "Great job!"}
                </DialogTitle>
                <DialogDescription className="text-lg">
                  {rewardTotal > 0
                    ? "Celebration complete 🎉"
                    : "This combo was already claimed."}
                </DialogDescription>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Button
                  size="lg"
                  onClick={onClose}
                  className="w-full bg-[#58a700] font-extrabold shadow-[0_3px_0_#467f00] hover:bg-[#64b800] sm:w-auto cursor-pointer"
                >
                  Tie More Rakhis
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate("/")}
                  className="w-full sm:w-auto cursor-pointer"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Change Profile
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ConfettiCanvas({ burst }: { burst: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d")!;
    const colors = [
      "#f59e0b",
      "#dc2626",
      "#ec4899",
      "#8b5cf6",
      "#06b6d4",
      "#fff",
      "#fde68a",
      "#fbbf24",
      "#fb7185",
      "#a78bfa",
    ];

    const resize = () => {
      canvas.width = canvas.offsetWidth * 2;
      canvas.height = canvas.offsetHeight * 2;
      ctx.scale(2, 2);
    };
    resize();
    window.addEventListener("resize", resize);

    if (burst) {
      for (let i = 0; i < 120; i++) {
        particlesRef.current.push({
          x: canvas.offsetWidth / 2,
          y: canvas.offsetHeight / 2,
          vx: (Math.random() - 0.5) * 20,
          vy: Math.random() * -15 - 5,
          size: Math.random() * 10 + 5,
          color: colors[Math.floor(Math.random() * colors.length)],
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 25,
          shape: Math.random() > 0.5 ? "circle" : "square",
        });
      }
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current = particlesRef.current.filter((p) => {
        p.vy += 0.35;
        p.vx *= 0.985;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, 1 - p.y / (canvas.offsetHeight * 1.5));

        if (p.shape === "circle") {
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        }
        ctx.restore();

        return (
          p.y < canvas.offsetHeight + 100 &&
          p.x > -100 &&
          p.x < canvas.offsetWidth + 100
        );
      });

      if (particlesRef.current.length > 0) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animate();

    return () => {
      window.removeEventListener("resize", resize);
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [burst]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-[60] w-full h-full pointer-events-none"
      style={{ width: "100%", height: "100%" }}
    />
  );
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  shape: "circle" | "square";
}
