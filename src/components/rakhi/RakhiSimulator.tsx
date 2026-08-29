"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Check, Sparkles, Heart } from "lucide-react";

interface Position {
  x: number;
  y: number;
}

interface RakhiType {
  id: string;
  name: string;
  color: string;
  gradient: string;
  icon: React.ReactNode;
}

const RAKHI_TYPES: RakhiType[] = [
  {
    id: "traditional",
    name: "Traditional Red",
    color: "#dc2626",
    gradient: "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="4" fill="white" opacity="0.3" />
      </svg>
    ),
  },
  {
    id: "golden",
    name: "Golden Royal",
    color: "#f59e0b",
    gradient: "linear-gradient(135deg, #f59e0b 0%, #b45309 100%)",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
  },
  {
    id: "silver",
    name: "Silver Elegant",
    color: "#94a3b8",
    gradient: "linear-gradient(135deg, #94a3b8 0%, #475569 100%)",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <circle
          cx="12"
          cy="12"
          r="8"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
        />
        <circle
          cx="12"
          cy="12"
          r="4"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
        />
      </svg>
    ),
  },
  {
    id: "colorful",
    name: "Multi Color",
    color: "#ec4899",
    gradient: "linear-gradient(135deg, #ec4899 0%, #8b5cf6 50%, #06b6d4 100%)",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
      </svg>
    ),
  },
];

const WRIST_POSITION = { x: 50, y: 58 };
const SNAP_THRESHOLD = 40;

export function RakhiSimulator() {
  const [selectedRakhi, setSelectedRakhi] = useState<RakhiType | null>(null);
  const [rakhiPosition, setRakhiPosition] = useState<Position>({
    x: 50,
    y: 85,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isPlaced, setIsPlaced] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });
  const handRef = useRef<HTMLDivElement>(null);
  const rakhiRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const playSound = useCallback((type: "snap" | "celebrate") => {
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
    } else {
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
    }
  }, []);

  const handleDragStart = (
    e: React.MouseEvent | React.TouchEvent,
    rakhi: RakhiType,
  ) => {
    e.preventDefault();
    setSelectedRakhi(rakhi);
    setIsDragging(true);
    setIsPlaced(false);

    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    if (rakhiRef.current) {
      const rect = rakhiRef.current.getBoundingClientRect();
      setDragOffset({
        x: clientX - rect.left,
        y: clientY - rect.top,
      });
    }
  };

  const handleDragMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!isDragging || !handRef.current) return;

      e.preventDefault();
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

      const handRect = handRef.current.getBoundingClientRect();
      const newX =
        ((clientX - handRect.left - dragOffset.x) / handRect.width) * 100;
      const newY =
        ((clientY - handRect.top - dragOffset.y) / handRect.height) * 100;

      setRakhiPosition({
        x: Math.max(0, Math.min(100, newX)),
        y: Math.max(0, Math.min(100, newY)),
      });
    },
    [isDragging, dragOffset],
  );

  const handleDragEnd = useCallback(() => {
    if (!isDragging || !selectedRakhi) return;

    const distance = Math.sqrt(
      Math.pow(rakhiPosition.x - WRIST_POSITION.x, 2) +
        Math.pow(rakhiPosition.y - WRIST_POSITION.y, 2),
    );

    if (distance < SNAP_THRESHOLD) {
      setRakhiPosition(WRIST_POSITION);
      setIsPlaced(true);
      playSound("snap");
    }

    setIsDragging(false);
  }, [isDragging, selectedRakhi, rakhiPosition, playSound]);

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

  const handleCelebrate = () => {
    setShowCelebration(true);
    playSound("celebrate");
  };

  const handleReset = () => {
    setSelectedRakhi(null);
    setRakhiPosition({ x: 50, y: 85 });
    setIsPlaced(false);
    setShowCelebration(false);
  };

  const isNearWrist =
    Math.sqrt(
      Math.pow(rakhiPosition.x - WRIST_POSITION.x, 2) +
        Math.pow(rakhiPosition.y - WRIST_POSITION.y, 2),
    ) < SNAP_THRESHOLD;

  return (
    <div className="min-h-screen bg-linear-to-br from-amber-50 via-orange-50 to-red-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold bg-linear-to-r from-amber-600 via-orange-600 to-red-600 bg-clip-text text-transparent mb-2">
            Rakhi Simulator
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Drag a rakhi onto the wrist and celebrate the bond!
          </p>
        </div>

        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div
              ref={handRef}
              className="relative aspect-square max-w-md mx-auto bg-white dark:bg-gray-800"
              style={{ touchAction: "none" }}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <HandSVG
                  wristPosition={WRIST_POSITION}
                  showSnapZone={isDragging && !isPlaced}
                  snapThreshold={SNAP_THRESHOLD}
                />
              </div>

              {selectedRakhi && (
                <DraggableRakhi
                  rakhi={selectedRakhi}
                  position={rakhiPosition}
                  isDragging={isDragging}
                  isPlaced={isPlaced}
                  isNearWrist={isNearWrist}
                />
              )}
            </div>

            {!selectedRakhi && (
              <div className="p-6">
                <RakhiSelection onSelect={handleDragStart} />
              </div>
            )}

            {isPlaced && !showCelebration && (
              <div className="p-6 text-center">
                <Button
                  size="lg"
                  onClick={handleCelebrate}
                  className="w-full bg-linear-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700"
                >
                  <Check className="mr-2 h-4 w-4" />
                  Done - Celebrate!
                </Button>
                <Button
                  variant="outline"
                  className="mt-3 w-full"
                  onClick={handleReset}
                >
                  Try Another Rakhi
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>Made with love for Raksha Bandhan ❤️</p>
        </div>
      </div>

      <CelebrationOverlay
        isOpen={showCelebration}
        onClose={handleReset}
        rakhi={selectedRakhi}
      />
    </div>
  );
}

function HandSVG({
  wristPosition,
  showSnapZone,
  snapThreshold,
}: {
  wristPosition: Position;
  showSnapZone: boolean;
  snapThreshold: number;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      className="w-full h-full"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <filter id="handShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow
            dx="0"
            dy="4"
            stdDeviation="8"
            floodColor="#000"
            floodOpacity="0.15"
          />
        </filter>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {showSnapZone && (
        <circle
          cx={wristPosition.x}
          cy={wristPosition.y}
          r={(snapThreshold / 100) * 100}
          fill="url(#snapGradient)"
          className="animate-pulse"
          style={{ filter: "url(#glow)" }}
        />
      )}

      <defs>
        <radialGradient id="snapGradient" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.2" />
          <stop offset="70%" stopColor="#f59e0b" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
        </radialGradient>
      </defs>

      <g filter="url(#handShadow)">
        <path
          d="M50 95 Q45 75 40 60 Q35 50 45 45 Q50 40 55 45 Q65 50 60 60 Q55 75 50 95"
          fill="#fde68a"
          stroke="#fcd34d"
          strokeWidth="0.5"
        />

        <ellipse
          cx={50}
          cy={35}
          rx={18}
          ry={12}
          fill="#fde68a"
          stroke="#fcd34d"
          strokeWidth="0.5"
        />

        <ellipse
          cx={38}
          cy={30}
          rx={5}
          ry={4}
          fill="#fde68a"
          stroke="#fcd34d"
          strokeWidth="0.5"
        />

        <ellipse
          cx={62}
          cy={30}
          rx={5}
          ry={4}
          fill="#fde68a"
          stroke="#fcd34d"
          strokeWidth="0.5"
        />

        <path
          d="M35 50 Q30 50 30 55 Q30 60 35 60"
          stroke="#fcd34d"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
        />

        <path
          d="M65 50 Q70 50 70 55 Q70 60 65 60"
          stroke="#fcd34d"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
        />

        <path
          d="M30 65 Q25 65 25 70 Q25 75 30 75"
          stroke="#fcd34d"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
        />

        <path
          d="M70 65 Q75 65 75 70 Q75 75 70 75"
          stroke="#fcd34d"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
        />

        <ellipse
          cx={50}
          cy={wristPosition.y}
          rx={12}
          ry={6}
          fill="none"
          stroke="#f59e0b"
          strokeWidth="2"
          strokeDasharray="4 4"
          className={showSnapZone ? "animate-dash" : "opacity-0"}
        />
      </g>
    </svg>
  );
}

function DraggableRakhi({
  rakhi,
  position,
  isDragging,
  isPlaced,
  isNearWrist,
}: {
  rakhi: RakhiType;
  position: Position;
  isDragging: boolean;
  isPlaced: boolean;
  isNearWrist: boolean;
}) {
  return (
    <div
      className={`
        absolute transition-all duration-300 ease-out
        ${isDragging ? "z-50 cursor-grabbing rotate-3 scale-110" : "z-10 cursor-grab"}
        ${isPlaced ? "animate-bounce-in" : ""}
        ${isNearWrist && !isPlaced ? "animate-pulse-glow" : ""}
      `}
      style={{
        left: `calc(${position.x}% - 32px)`,
        top: `calc(${position.y}% - 32px)`,
        transform: isPlaced ? "rotate(-15deg)" : "rotate(0deg)",
      }}
    >
      <div className="relative w-16 h-16">
        <div
          className="absolute inset-0 rounded-full flex items-center justify-center shadow-lg"
          style={{
            background: rakhi.gradient,
            boxShadow: isPlaced
              ? "0 8px 32px rgba(0,0,0,0.3), 0 0 0 4px rgba(245,158,11,0.3)"
              : "0 4px 20px rgba(0,0,0,0.2)",
            filter:
              isNearWrist && !isPlaced
                ? "drop-shadow(0 0 8px #f59e0b)"
                : "none",
          }}
        >
          <span className="text-white drop-shadow-lg">{rakhi.icon}</span>
        </div>

        <div
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-20 h-3"
          style={{
            background: `linear-gradient(90deg, transparent, ${rakhi.color}40, transparent)`,
            borderRadius: "9999px",
            filter: "blur(2px)",
          }}
        />
      </div>

      <div
        className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-medium px-2 py-0.5 rounded-full text-white drop-shadow-lg"
        style={{ background: rakhi.gradient }}
      >
        {rakhi.name}
      </div>
    </div>
  );
}

function RakhiSelection({
  onSelect,
}: {
  onSelect: (e: React.MouseEvent | React.TouchEvent, rakhi: RakhiType) => void;
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-center text-gray-700 dark:text-gray-200">
        Choose Your Rakhi
      </h3>
      <div className="grid grid-cols-2 gap-4">
        {RAKHI_TYPES.map((rakhi) => (
          <button
            key={rakhi.id}
            onMouseDown={(e) => onSelect(e, rakhi)}
            onTouchStart={(e) => onSelect(e, rakhi)}
            className="group relative p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-amber-400 dark:hover:border-amber-500 transition-all duration-200 active:scale-95 touch-none"
            style={{ touchAction: "none" }}
          >
            <div
              className="w-16 h-16 mx-auto mb-3 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300"
              style={{ background: rakhi.gradient }}
            >
              <span className="text-white text-2xl drop-shadow-lg">
                {rakhi.icon}
              </span>
            </div>
            <p className="text-center font-medium text-gray-700 dark:text-gray-200">
              {rakhi.name}
            </p>
            <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-[10px]">→</span>
            </div>
          </button>
        ))}
      </div>
      <p className="text-center text-sm text-gray-500 dark:text-gray-400">
        Drag any rakhi onto the hand above
      </p>
    </div>
  );
}

function CelebrationOverlay({
  isOpen,
  onClose,
  rakhi,
}: {
  isOpen: boolean;
  onClose: () => void;
  rakhi: RakhiType | null;
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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-8 overflow-visible">
        <div className="relative z-10">
          <ConfettiCanvas burst={burst} rakhiColor={rakhi?.color} />

          <div className="relative z-10 text-center">
            <div className="mb-6">
              <div
                className="inline-flex items-center justify-center w-24 h-24 rounded-full mb-4 animate-scale-in"
                style={{
                  background:
                    rakhi?.gradient ||
                    "linear-gradient(135deg, #f59e0b 0%, #dc2626 100%)",
                }}
              >
                <Heart className="w-12 h-12 text-white" />
              </div>
              <DialogTitle className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-amber-600 to-red-600 bg-clip-text text-transparent">
                Happy Raksha Bandhan!
              </DialogTitle>
              <DialogDescription className="mt-2 text-lg">
                {rakhi?.name} rakhi tied perfectly ✨
              </DialogDescription>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                size="lg"
                onClick={onClose}
                className="w-full sm:w-auto bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Tie Another Rakhi
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={onClose}
                className="w-full sm:w-auto"
              >
                Share Joy
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ConfettiCanvas({
  burst,
  rakhiColor,
}: {
  burst: boolean;
  rakhiColor?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d")!;
    const colors = rakhiColor
      ? [rakhiColor, "#f59e0b", "#ec4899", "#8b5cf6", "#06b6d4", "#fff"]
      : [
          "#f59e0b",
          "#dc2626",
          "#ec4899",
          "#8b5cf6",
          "#06b6d4",
          "#fff",
          "#fde68a",
        ];

    const resize = () => {
      canvas.width = canvas.offsetWidth * 2;
      canvas.height = canvas.offsetHeight * 2;
      ctx.scale(2, 2);
    };
    resize();
    window.addEventListener("resize", resize);

    if (burst) {
      for (let i = 0; i < 80; i++) {
        particlesRef.current.push({
          x: canvas.offsetWidth / 2,
          y: canvas.offsetHeight / 2,
          vx: (Math.random() - 0.5) * 16,
          vy: Math.random() * -12 - 4,
          size: Math.random() * 8 + 4,
          color: colors[Math.floor(Math.random() * colors.length)],
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 20,
          shape: Math.random() > 0.5 ? "circle" : "square",
        });
      }
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current = particlesRef.current.filter((p) => {
        p.vy += 0.3;
        p.vx *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, 1 - p.y / canvas.offsetHeight);

        if (p.shape === "circle") {
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        }
        ctx.restore();

        return (
          p.y < canvas.offsetHeight + 50 &&
          p.x > -50 &&
          p.x < canvas.offsetWidth + 50
        );
      });

      if (particlesRef.current.length > 0) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animate();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationRef.current!);
    };
  }, [burst, rakhiColor]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
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
