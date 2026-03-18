import { useRef, useState } from "react";
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

export default function ShareTeamCard({ manager, rank, totalManagers, drivers, getDriverPoints }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  function generateCard(): HTMLCanvasElement {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const w = 600, h = 400;
    canvas.width = w * 2;
    canvas.height = h * 2;
    ctx.scale(2, 2);

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, "#0f1923");
    grad.addColorStop(1, "#1a2a3a");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Accent stripe
    const stripe = ctx.createLinearGradient(0, 0, w, 0);
    stripe.addColorStop(0, "#e63946");
    stripe.addColorStop(1, "#ff6b35");
    ctx.fillStyle = stripe;
    ctx.fillRect(0, 0, w, 6);

    // Team name
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 28px system-ui, -apple-system, sans-serif";
    ctx.fillText(manager.team_name, 32, 56);

    // Manager name
    ctx.fillStyle = "#8899aa";
    ctx.font = "14px system-ui, -apple-system, sans-serif";
    ctx.fillText(`Manager: ${manager.name}`, 32, 80);

    // Points & rank
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 64px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(String(manager.total_points), w - 32, 64);
    ctx.font = "14px system-ui, -apple-system, sans-serif";
    ctx.fillStyle = "#8899aa";
    ctx.fillText("POINT", w - 32, 84);
    if (rank && rank > 0) {
      ctx.fillText(`#${rank} af ${totalManagers}`, w - 32, 102);
    }
    ctx.textAlign = "left";

    // Divider
    ctx.fillStyle = "#2a3a4a";
    ctx.fillRect(32, 120, w - 64, 1);

    // Drivers
    drivers.forEach((d, i) => {
      const y = 152 + i * 52;
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
    ctx.fillStyle = "#334455";
    ctx.font = "11px system-ui, -apple-system, sans-serif";
    ctx.fillText("DASU SuperGT Fantasy", 32, h - 16);
    ctx.textAlign = "right";
    ctx.fillText("dasu.dk/supergt", w - 32, h - 16);
    ctx.textAlign = "left";

    return canvas;
  }

  function handleOpen() {
    setOpen(true);
    setTimeout(() => generateCard(), 50);
  }

  async function handleDownload() {
    const canvas = generateCard();
    const link = document.createElement("a");
    link.download = `${manager.team_name.replace(/\s+/g, "-")}-fantasy.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  async function handleShare() {
    const canvas = generateCard();
    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        if (navigator.share) {
          const file = new File([blob], "team-card.png", { type: "image/png" });
          await navigator.share({ files: [file], title: manager.team_name });
        } else {
          // Fallback: copy share link
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
      <Button onClick={handleOpen} variant="outline" size="sm" className="font-display">
        <Share2 className="h-4 w-4 mr-2" />Del hold
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-display text-foreground">Del dit hold</DialogTitle>
          </DialogHeader>
          <canvas ref={canvasRef} className="w-full rounded-lg" style={{ aspectRatio: "3/2" }} />
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
