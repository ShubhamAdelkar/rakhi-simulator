import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { profiles, formatINR } from "@/data/profiles";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Wallet } from "lucide-react";

const RAKHI_COUNTS_STORAGE_KEY = "rakhi-tie-counts";
const PROFILE_REWARDS_STORAGE_KEY = "rakhi-profile-rewards";
const USER_PROFILE_STORAGE_KEY = "rakhi-user-profile";
const USER_WALLET_STORAGE_KEY = "rakhi-user-wallet";

function getTotalWalletFromRewards(rewards: Record<string, number>) {
  return Object.values(rewards).reduce(
    (sum, value) => sum + (Number(value) || 0),
    0,
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

export function HomePage() {
  const [rakhiCounts, setRakhiCounts] = useState<Record<string, number>>({});
  const [profileRewards, setProfileRewards] = useState<Record<string, number>>(
    {},
  );
  const [walletValue, setWalletValue] = useState<number>(0);
  const [userName, setUserName] = useState<string>("");
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [draftName, setDraftName] = useState("");

  useEffect(() => {
    const syncHomeState = () => {
      try {
        const nextCounts = JSON.parse(
          localStorage.getItem(RAKHI_COUNTS_STORAGE_KEY) || "{}",
        ) as Record<string, number>;
        const nextRewards = readStorageRecord<number>(
          PROFILE_REWARDS_STORAGE_KEY,
        );
        const derivedWallet = getTotalWalletFromRewards(nextRewards);

        setRakhiCounts(nextCounts);
        setProfileRewards(nextRewards);
        setWalletValue(derivedWallet);

        localStorage.setItem(USER_WALLET_STORAGE_KEY, String(derivedWallet));

        const savedName = localStorage.getItem(USER_PROFILE_STORAGE_KEY) || "";
        setUserName(savedName);
        if (!savedName) {
          setShowNameDialog(true);
        }
      } catch {
        setRakhiCounts({});
        setProfileRewards({});
        setWalletValue(0);
        setUserName("");
        setShowNameDialog(true);
      }
    };

    syncHomeState();
    window.addEventListener("storage", syncHomeState);
    return () => window.removeEventListener("storage", syncHomeState);
  }, []);

  const saveUserName = () => {
    const trimmed = draftName.trim();
    if (!trimmed) return;

    setUserName(trimmed);
    setShowNameDialog(false);
    localStorage.setItem(USER_PROFILE_STORAGE_KEY, trimmed);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 text-slate-800 md:p-8">
      <Dialog
        open={showNameDialog}
        onOpenChange={(open: boolean) =>
          !open && !userName && setShowNameDialog(false)
        }
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-extrabold text-slate-800">
              Welcome to Rakhi Shit!
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              Type your name to start your celebration.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <input
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              placeholder="Your name"
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-base outline-none ring-0 placeholder:text-slate-400 focus:border-sky-400"
              onKeyDown={(event) => {
                if (event.key === "Enter") saveUserName();
              }}
            />
            <Button
              onClick={saveUserName}
              disabled={!draftName.trim()}
              className="w-full bg-primary font-extrabold text-white shadow-[0_3px_0_#467f00] hover:bg-[#64b800]"
            >
              {/* <Sparkles className="mr-2 h-4 w-4" /> */}
              Save my name
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-col gap-4 md:mb-10 md:flex-row md:items-center md:justify-between">
          <div className="text-center md:text-left">
            <h1 className="mb-2 text-4xl font-extrabold tracking-tight text-primary md:text-5xl">
              Rakhi Simulator
            </h1>
            <p className="mx-auto max-w-2xl text-xl text-slate-500 md:mx-0">
              Choose a profile, pick your favorite rakhis, and tie them on the
              wrist.
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 shadow-sm md:min-w-60">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-500 font-bold text-white">
              {userName ? userName.charAt(0).toUpperCase() : "U"}
            </div>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-400">
                {/* {userName ? "Main profile" : "Guest"} */}
              </p>
              <p className="truncate text-lg font-extrabold text-slate-800">
                {userName || "Set your name"}
              </p>
            </div>
            <div className="ml-auto flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 text-sm font-bold text-white shadow-sm">
              <Wallet className="h-4 w-4" />
              {formatINR(walletValue)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {profiles.map((profile: (typeof profiles)[number]) => {
            const totalCount = rakhiCounts[profile.id] || 0;
            const totalReward = profileRewards[profile.id] || 0;

            return (
              <Link
                key={profile.id}
                to={`/rakhi/${profile.id}`}
                className="group block overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-sky-300 hover:shadow-md"
              >
                <div className="relative aspect-square overflow-hidden bg-sky-50">
                  <img
                    src={profile.image}
                    alt={profile.name}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      const fallback = e.currentTarget
                        .nextElementSibling as HTMLElement | null;
                      if (fallback) {
                        fallback.classList.remove("hidden");
                      }
                    }}
                  />
                  <div className="absolute inset-0 hidden items-center justify-center bg-sky-100">
                    <span className="text-6xl font-extrabold text-sky-500">
                      {profile.name.charAt(0)}
                    </span>
                  </div>
                  {totalCount > 0 && (
                    <div className="absolute right-2 top-2 rounded-full bg-[rgb(255,75,75)] px-2 py-1 text-xs font-bold text-white shadow-md">
                      {totalCount}
                      {/* Rakhi{totalCount > 1 ? "s" : ""} */}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-center gap-2 p-4 text-center">
                  <h3 className="text-lg font-extrabold text-slate-800 transition-colors group-hover:text-sky-500 p-0">
                    {profile.name}
                  </h3>
                  <p className="text-xs font-semibold text-slate-500">
                    Reward earned {formatINR(totalReward)}
                  </p>
                  <Button
                    size="sm"
                    className="w-full bg-primary font-extrabold text-white shadow-[0_3px_0_#467f00] hover:bg-[#64b800]"
                  >
                    Tie Rakhis
                  </Button>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
