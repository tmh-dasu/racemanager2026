import PageLayout from "@/components/PageLayout";
import { Trophy, Zap, Target, Calendar, ArrowRightLeft, AlertTriangle } from "lucide-react";

const pointsTable = [
  { pos: "1.", pts: 25 },
  { pos: "2.", pts: 18 },
  { pos: "3.", pts: 15 },
  { pos: "4.", pts: 12 },
  { pos: "5.", pts: 10 },
  { pos: "6.", pts: 8 },
  { pos: "7.", pts: 6 },
  { pos: "8.", pts: 4 },
  { pos: "9.", pts: 2 },
  { pos: "10.", pts: 1 },
];

const races = [
  { round: 1, name: "Padborg Park – Åbningsløbet", location: "Padborg", date: "25. april" },
  { round: 2, name: "Jyllandsringen – Forårsløbet", location: "Silkeborg", date: "9. maj" },
  { round: 3, name: "Ring Djursland – Sommerløbet", location: "Kolind", date: "20. juni" },
  { round: 4, name: "Jyllandsringen – Grand Prix Danmark", location: "Silkeborg", date: "22. august" },
  { round: 5, name: "Padborg Park – Night Race", location: "Padborg", date: "4. september" },
  { round: 6, name: "Padborg Park – Finaleløbet", location: "Padborg", date: "3. oktober" },
];

export default function RulesPage() {
  return (
    <PageLayout>
      <div className="container py-6 space-y-6 max-w-2xl">
        {/* Header */}
        <div className="rounded-lg border border-border bg-card p-6 shadow-card animate-slide-up">
          <div className="flex items-center gap-3 mb-3">
            <Trophy className="h-6 w-6 text-gold" />
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              Regler for <span className="text-gradient-racing">Fantasy Manager 2026</span>
            </h1>
          </div>
          <p className="text-muted-foreground">
            DASU Race Manager – Danish Supercar League Super GT
          </p>
        </div>

        {/* What is it */}
        <Section icon={<Target className="h-5 w-5 text-accent" />} title="Hvad er DASU Race Manager?">
          <p className="text-sm text-muted-foreground">
            DASU Race Manager er et fantasy managerspil for Danish Supercar League Super GT-sæsonen 2026.
            Du sammensætter dit eget hold af rigtige kørere og optjener point baseret på deres resultater i løbene.
          </p>
        </Section>

        {/* How to participate */}
        <Section icon={<Zap className="h-5 w-5 text-accent" />} title="Sådan deltager du">
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>Opret dit hold med et holdnavn, dit navn og din e-mail</li>
            <li>Vælg <strong className="text-foreground">3 kørere</strong> inden for budgettet på <strong className="text-foreground">100 mio.</strong></li>
            <li>Når holdet er valgt, er det låst for resten af sæsonen – med én undtagelse (se Joker nedenfor)</li>
          </ol>
        </Section>

        {/* Points system */}
        <Section icon={<Trophy className="h-5 w-5 text-accent" />} title="Pointsystem">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-1.5 text-left font-medium text-muted-foreground">Placering</th>
                    <th className="py-1.5 text-right font-medium text-muted-foreground">Point</th>
                  </tr>
                </thead>
                <tbody>
                  {pointsTable.map((r) => (
                    <tr key={r.pos} className="border-b border-border/50">
                      <td className="py-1.5 text-foreground">{r.pos} plads</td>
                      <td className="py-1.5 text-right font-display font-bold text-foreground">{r.pts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Bonuspoint</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2 rounded-md bg-secondary/50 px-3 py-2">
                  <span>⚡</span>
                  <span>Hurtigste omgang: <strong className="text-foreground">+3 point</strong></span>
                </div>
                <div className="flex items-center gap-2 rounded-md bg-secondary/50 px-3 py-2">
                  <span>🏎️</span>
                  <span>Pole position: <strong className="text-foreground">+3 point</strong></span>
                </div>
                <div className="flex items-center gap-2 rounded-md bg-secondary/50 px-3 py-2">
                  <span>❌</span>
                  <span>DNF (udgået): <strong className="text-foreground">0 point</strong></span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Dine samlede point er summen af dine 3 køreres point over alle løb.
              </p>
            </div>
          </div>
        </Section>

        {/* Joker */}
        <Section icon={<ArrowRightLeft className="h-5 w-5 text-accent" />} title="Joker-transfer 🃏">
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Du har <strong className="text-foreground">én</strong> Joker-transfer i hele sæsonen</li>
            <li>• Jokeren lader dig udskifte <strong className="text-foreground">én kører</strong> med en anden</li>
            <li>• Den nye kører skal kunne passe inden for dit resterende budget</li>
            <li>• Transfervinduet åbner <strong className="text-foreground">24 timer efter</strong> et løbs resultater offentliggøres</li>
            <li>• Transfervinduet lukker <strong className="text-foreground">24 timer før</strong> næste løb</li>
          </ul>
          <div className="mt-3 flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
            <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            <p className="text-xs text-destructive">Brug den med omtanke – du har kun én!</p>
          </div>
        </Section>

        {/* Race calendar */}
        <Section icon={<Calendar className="h-5 w-5 text-accent" />} title="Løbskalender 2026">
          <div className="space-y-2">
            {races.map((r) => (
              <div key={r.round} className="flex items-center justify-between rounded-md bg-secondary/50 px-3 py-2">
                <div className="flex items-center gap-3">
                  <span className="font-display text-lg font-bold text-muted-foreground">{r.round}</span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{r.name}</p>
                    <p className="text-xs text-muted-foreground">{r.location}</p>
                  </div>
                </div>
                <span className="text-sm font-medium text-foreground">{r.date}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* Winner */}
        <div className="rounded-lg border border-border bg-card p-5 shadow-card text-center">
          <Trophy className="h-8 w-8 text-gold mx-auto mb-2" />
          <p className="font-display text-lg font-bold text-foreground">
            Manageren med flest point efter 6 runder vinder! 🏆
          </p>
        </div>
      </div>
    </PageLayout>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-card">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h2 className="font-display text-lg font-bold text-foreground">{title}</h2>
      </div>
      {children}
    </div>
  );
}
