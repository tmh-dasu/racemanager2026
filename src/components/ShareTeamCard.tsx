import { useRef, useState, useEffect } from "react";
import { Share2, Download, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Manager, Driver } from "@/lib/api";

interface Props {
  manager: Manager;
  rank: number | null;
  totalManagers: number;
  drivers: Driver[];
  getDriverPoints: (id: string) => number;
}

const GAME_TITLE = "DASU SuperGT Fantasy Race Manager";

export default function ShareTeamCard({ manager, rank, totalManagers, drivers, getDriverPoints }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  function generateCard() {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const w = 600, h = 420;
    canvas.width = w * 2;
    canvas.height = h * 2;
    ctx.scale(2, 2);

    // Background
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, "#0f1923");
    grad.addColorStop(1, "#1a2a3a");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Top accent stripe
    const stripe = ctx.createLinearGradient(0, 0, w, 0);
    stripe.addColorStop(0, "#e63946");
    stripe.addColorStop(1, "#ff6b35");
    ctx.fillStyle = stripe;
    ctx.fillRect(0, 0, w, 5);

    // Game title
    ctx.fillStyle = "#556677";
    ctx.font = "bold 10px system-ui, -apple-system, sans-serif";
    ctx.letterSpacing = "2px";
    ctx.fillText(GAME_TITLE.toUpperCase(), 32, 28);

    // Team name
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 26px system-ui, -apple-system, sans-serif";
    ctx.fillText(manager.team_name, 32, 60);

    // Manager name
    ctx.fillStyle = "#8899aa";
    ctx.font = "14px system-ui, -apple-system, sans-serif";
    ctx.fillText(`Manager: ${manager.name}`, 32, 82);

    // Points & rank (right side)
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

    // Divider
    ctx.fillStyle = "#2a3a4a";
    ctx.fillRect(32, 110, w - 64, 1);

    // Drivers
    drivers.forEach((d, i) => {
      const y = 130 + i * 52;

      // Number badge
      ctx.fillStyle = "#1e2d3d";
      ctx.beginPath();
      ctx.roundRect(32, y, 44, 36, 6);
      ctx.fill();
      ctx.fillStyle = "#8899aa";
      ctx.font = "bold 14px system-ui, -apple-system, sans-serif";
      ctx.fillText(`#${d.car_number}`, 38, y + 24);

      // Name & team
      ctx.fillStyle = "#ffffff";
      ctx.font = "600 16px system-ui, -apple-system, sans-serif";
      ctx.fillText(d.name, 88, y + 18);
      ctx.fillStyle = "#667788";
      ctx.font = "12px system-ui, -apple-system, sans-serif";
      ctx.fillText(d.team, 88, y + 34);

      // Points
      const pts = getDriverPoints(d.id);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 20px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(String(pts), w - 40, y + 22);
      ctx.fillStyle = "#667788";
      ctx.font = "10px system-ui, -apple-system, sans-serif";
      ctx.fillText("PTS", w - 40, y + 36);
      ctx.textAlign = "left";
    });

    // Footer
    ctx.fillStyle = "#2a3a4a";
    ctx.fillRect(32, h - 36, w - 64, 1);
    ctx.fillStyle = "#445566";
    ctx.font = "bold 10px system-ui, -apple-system, sans-serif";
    ctx.fillText(GAME_TITLE, 32, h - 14);
    ctx.textAlign = "right";
    ctx.fillText("supergt.dasu.dk", w - 32, h - 14);
    ctx.textAlign = "left";

    return canvas;
  }

  // Re-render canvas when dialog opens
  useEffect(() => {
    if (open) {
      // Wait for dialog animation to complete and canvas to mount
      const timer = setTimeout(() => generateCard(), 150);
      return () => clearTimeout(timer);
    }
  }, [open, manager, drivers]);

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
    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        if (navigator.share) {
          const file = new File([blob], "team-card.png", { type: "image/png" });
          await navigator.share({ files: [file], title: manager.team_name });
        } else {
          const url = `${window.location.origin}/hold/${manager.slug}`;
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }
      });
    } catch {
      const url = `${window.location.origin}/hold/${manager.slug}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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
