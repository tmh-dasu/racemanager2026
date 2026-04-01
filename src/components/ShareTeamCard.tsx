import { useRef, useState, useEffect } from "react";
import { Share2, Download, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Manager, Driver } from "@/lib/api";

interface Props {
  manager: Manager;
  rank: number | null;
  totalManagers: number;
  drivers: Driver[];
  getDriverPoints: (id: string) => number;
}

const GAME_TITLE = "DASU RaceManager";

const TIER_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  gold: { bg: "#3d3419", text: "#d4a843", label: "GULD" },
  silver: { bg: "#2a2d30", text: "#a8b2bc", label: "SØLV" },
  bronze: { bg: "#2d2219", text: "#cd7f32", label: "BRONZE" },
};

export default function ShareTeamCard({ manager, rank, totalManagers, drivers, getDriverPoints }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  function generateCard() {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const w = 600;
    const h = 420;
    canvas.width = w * 2;
    canvas.height = h * 2;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(2, 2);

    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, "#0f1923");
    grad.addColorStop(1, "#1a2a3a");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    const stripe = ctx.createLinearGradient(0, 0, w, 0);
    stripe.addColorStop(0, "#e63946");
    stripe.addColorStop(1, "#ff6b35");
    ctx.fillStyle = stripe;
    ctx.fillRect(0, 0, w, 5);

    ctx.fillStyle = "#556677";
    ctx.font = "bold 10px system-ui, -apple-system, sans-serif";
    ctx.fillText(GAME_TITLE.toUpperCase(), 32, 28);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 26px system-ui, -apple-system, sans-serif";
    ctx.fillText(manager.team_name, 32, 60);

    ctx.fillStyle = "#8899aa";
    ctx.font = "14px system-ui, -apple-system, sans-serif";
    ctx.fillText(`Manager: ${manager.name}`, 32, 82);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 56px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(String(manager.total_points), w - 32, 62);
    ctx.font = "12px system-ui, -apple-system, sans-serif";
    ctx.fillStyle = "#8899aa";
    ctx.fillText("POINT", w - 32, 80);
    if (rank && rank > 0) {
      ctx.fillText(`#${rank} af ${totalManagers}`, w - 32, 96);
    }
    ctx.textAlign = "left";

    ctx.fillStyle = "#2a3a4a";
    ctx.fillRect(32, 110, w - 64, 1);

    // Sort drivers by tier
    const sortedDrivers = [...drivers].sort((a, b) => {
      const order = { gold: 0, silver: 1, bronze: 2 };
      return (order[a.tier as keyof typeof order] ?? 3) - (order[b.tier as keyof typeof order] ?? 3);
    });

    sortedDrivers.forEach((d, i) => {
      const y = 130 + i * 58;
      const tierInfo = TIER_COLORS[d.tier] || TIER_COLORS.bronze;

      // Tier badge
      ctx.fillStyle = tierInfo.bg;
      ctx.beginPath();
      ctx.roundRect(32, y, 52, 20, 4);
      ctx.fill();
      ctx.fillStyle = tierInfo.text;
      ctx.font = "bold 9px system-ui, -apple-system, sans-serif";
      ctx.fillText(tierInfo.label, 40, y + 14);

      // Car number
      ctx.fillStyle = "#1e2d3d";
      ctx.beginPath();
      ctx.roundRect(32, y + 24, 44, 20, 4);
      ctx.fill();
      ctx.fillStyle = "#8899aa";
      ctx.font = "bold 11px system-ui, -apple-system, sans-serif";
      ctx.fillText(`#${d.car_number}`, 38, y + 38);

      ctx.fillStyle = "#ffffff";
      ctx.font = "600 16px system-ui, -apple-system, sans-serif";
      ctx.fillText(d.name, 88, y + 18);
      ctx.fillStyle = "#667788";
      ctx.font = "12px system-ui, -apple-system, sans-serif";
      ctx.fillText(d.team, 88, y + 38);

      const pts = getDriverPoints(d.id);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 20px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(String(pts), w - 40, y + 24);
      ctx.fillStyle = "#667788";
      ctx.font = "10px system-ui, -apple-system, sans-serif";
      ctx.fillText("PTS", w - 40, y + 40);
      ctx.textAlign = "left";
    });

    ctx.fillStyle = "#2a3a4a";
    ctx.fillRect(32, h - 36, w - 64, 1);
    ctx.fillStyle = "#445566";
    ctx.font = "bold 10px system-ui, -apple-system, sans-serif";
    ctx.fillText(GAME_TITLE, 32, h - 14);
    ctx.textAlign = "right";
    ctx.fillText("dasuracemanager.lovable.app", w - 32, h - 14);
    ctx.textAlign = "left";

    return canvas;
  }

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => generateCard(), 150);
    return () => clearTimeout(timer);
  }, [open, manager, drivers]);

  async function copyShareLink() {
    const url = `${window.location.origin}/hold/${manager.slug}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleDownload() {
    const canvas = generateCard();
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `${manager.team_name.replace(/\s+/g, "-")}-fantasy.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  async function handleShare() {
    const canvas = generateCard();
    if (!canvas) return;

    const isEmbedded = window.self !== window.top;
    if (isEmbedded || typeof navigator.share !== "function") {
      await copyShareLink();
      return;
    }

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) {
      await copyShareLink();
      return;
    }

    const file = new File([blob], "team-card.png", { type: "image/png" });

    try {
      if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: manager.team_name, text: GAME_TITLE });
        return;
      }
      await navigator.share({ title: manager.team_name, text: GAME_TITLE, url: `${window.location.origin}/hold/${manager.slug}` });
    } catch {
      await copyShareLink();
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="outline" size="sm" className="font-display">
        <Share2 className="h-4 w-4 mr-2" />Del hold
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-display text-foreground">Del dit hold</DialogTitle>
            <DialogDescription>
              Download billedkortet eller del det offentlige link til dit hold.
            </DialogDescription>
          </DialogHeader>
          <canvas ref={canvasRef} className="w-full rounded-lg" style={{ aspectRatio: "600/420" }} />
          <div className="flex gap-2">
            <Button onClick={handleDownload} variant="outline" className="flex-1 font-display">
              <Download className="h-4 w-4 mr-2" />Download
            </Button>
            <Button onClick={handleShare} className="flex-1 bg-gradient-racing text-primary-foreground font-display">
              {copied ? <><Check className="h-4 w-4 mr-2" />Link kopieret!</> : <><Share2 className="h-4 w-4 mr-2" />Del</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
