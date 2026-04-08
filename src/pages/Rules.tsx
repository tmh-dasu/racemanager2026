import PageLayout from "@/components/PageLayout";
import { Trophy, Zap, Target, Calendar, ArrowRightLeft, ListMinus, Crown, Brain, ShieldAlert } from "lucide-react";

const pointsTable = [
  { pos: "1.", pts: 25 }, { pos: "2.", pts: 22 }, { pos: "3.", pts: 20 },
  { pos: "4.", pts: 18 }, { pos: "5.", pts: 16 }, { pos: "6.", pts: 15 },
  { pos: "7.", pts: 14 }, { pos: "8.", pts: 13 }, { pos: "9.", pts: 12 },
  { pos: "10.", pts: 11 }, { pos: "11.", pts: 10 }, { pos: "12.", pts: 9 },
  { pos: "13.", pts: 8 }, { pos: "14.", pts: 7 }, { pos: "15.", pts: 6 },
  { pos: "16.", pts: 5 }, { pos: "17.", pts: 4 }, { pos: "18.", pts: 3 },
  { pos: "19.", pts: 2 }, { pos: "20.", pts: 1 },
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
              Regler for <span className="text-gradient-racing">DASU RaceManager</span>
            </h1>
          </div>
          <p className="text-muted-foreground">
            DASU RaceManager – Danish Supercar League Super GT
          </p>
        </div>

        {/* What is it */}
        <Section icon={<Target className="h-5 w-5 text-accent" />} title="Hvad er DASU RaceManager?">
          <p className="text-sm text-muted-foreground">
            DASU RaceManager er et fantasy managerspil for Danish Supercar League Super GT-sæsonen 2026.
            Du sammensætter dit eget hold af rigtige kørere og optjener point baseret på deres resultater i løbene.
          </p>
        </Section>

        {/* How to participate */}
        <Section icon={<Zap className="h-5 w-5 text-accent" />} title="Sådan deltager du">
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>Opret dit hold med et holdnavn, dit navn og din e-mail</li>
            <li>Betal tilmeldingsgebyret på <strong className="text-foreground">kr. 49</strong> per hold (via kort eller MobilePay)</li>
            <li>Vælg <strong className="text-foreground">3 kørere</strong>: én fra <strong className="text-gold">Guld</strong>, én fra <strong className="text-silver">Sølv</strong> og én fra <strong className="text-bronze">Bronze</strong>-kategorien</li>
            <li>Du kan løbende justere dit hold via transfers (se nedenfor)</li>
          </ol>
          <div className="mt-3 flex items-start gap-2 rounded-md bg-gold/10 border border-gold/20 px-3 py-2">
            <Trophy className="h-4 w-4 text-gold mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              Alle tilmeldingsgebyrer går til en <strong className="text-foreground">præmie til bedste am-kører</strong> i klassen.
            </p>
          </div>
        </Section>

        {/* Points system */}
        <Section icon={<Trophy className="h-5 w-5 text-accent" />} title="Pointsystem">
          <p className="text-sm text-muted-foreground mb-3">
            Der gives point for <strong className="text-foreground">tidtagning/Super Pole</strong> og hvert af de <strong className="text-foreground">3 heats</strong> per afdeling – i alt 4 resultater per runde.
          </p>
          <div className="grid grid-cols-2 gap-x-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-1.5 text-left font-medium text-muted-foreground">Placering</th>
                  <th className="py-1.5 text-right font-medium text-muted-foreground">Point</th>
                </tr>
              </thead>
              <tbody>
                {pointsTable.slice(0, 10).map((r) => (
                  <tr key={r.pos} className="border-b border-border/50">
                    <td className="py-1 text-foreground">{r.pos} plads</td>
                    <td className="py-1 text-right font-display font-bold text-foreground">{r.pts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-1.5 text-left font-medium text-muted-foreground">Placering</th>
                  <th className="py-1.5 text-right font-medium text-muted-foreground">Point</th>
                </tr>
              </thead>
              <tbody>
                {pointsTable.slice(10, 20).map((r) => (
                  <tr key={r.pos} className="border-b border-border/50">
                    <td className="py-1 text-foreground">{r.pos} plads</td>
                    <td className="py-1 text-right font-display font-bold text-foreground">{r.pts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-md bg-secondary/50 px-3 py-2">
            <span>❌</span>
            <span className="text-sm text-muted-foreground">DNF (udgået): <strong className="text-foreground">0 point</strong></span>
          </div>
        </Section>


        {/* Transfers */}
        <Section icon={<ArrowRightLeft className="h-5 w-5 text-accent" />} title="Transfer-system 🔄">
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Du kan til enhver tid skifte <strong className="text-foreground">én kører</strong> ud mod en anden <strong className="text-foreground">inden for samme kategori</strong></li>
            <li>• Transfers koster point afhængigt af kategorien på den kører, du henter ind: en <strong className="text-gold">guldkører koster 15 point</strong>, en <strong className="text-silver">sølvkører koster 10 point</strong> og en <strong className="text-bronze">bronzekører koster 5 point</strong>. Pointomkostningen trækkes fra din pointsaldo ved bekræftelse.</li>
            <li>• Der er <strong className="text-foreground">ingen grænse</strong> for antal transfers – men hvert koster point</li>
            <li>• Pointfradraget er <strong className="text-foreground">permanent</strong> og kan ikke fortrydes</li>
            <li>• Transfervinduet er <strong className="text-foreground">lukket</strong> indtil admin åbner det efter hvert arrangements resultater er indtastet</li>
            <li>• Vinduet lukker automatisk <strong className="text-foreground">24 timer inden næste arrangement starter</strong></li>
            <li>• Vinduet kan også <strong className="text-foreground">lukkes manuelt</strong> af admin</li>
            <li>• Holdkaptajn-budgettet følger <strong className="text-foreground">kategoripladsen</strong>, ikke den individuelle kører — se holdkaptajn-regler nedenfor</li>
            <li>• <strong className="text-foreground">Gæstekørere</strong> er ikke en del af spillet — kun kørere tilmeldt den fulde sæson kan vælges</li>
          </ul>
          <div className="mt-3 flex items-start gap-2 rounded-md bg-secondary/50 border border-border px-3 py-2">
            <ArrowRightLeft className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">Overvej nøje – hvert transfer koster point!</p>
          </div>
        </Section>

        {/* Points total */}
        <Section icon={<Trophy className="h-5 w-5 text-accent" />} title="Din samlede pointtotal 📊">
          <p className="text-sm text-muted-foreground mb-3">
            Din samlede pointtotal beregnes automatisk og består af:
          </p>
          <div className="space-y-1.5 text-sm">
            <div className="flex items-center gap-2 rounded-md bg-secondary/50 px-3 py-2">
              <span className="text-success font-bold">+</span>
              <span className="text-muted-foreground"><strong className="text-foreground">Race-point</strong> (tidtagning + 3 heats per arrangement)</span>
            </div>
            <div className="flex items-center gap-2 rounded-md bg-secondary/50 px-3 py-2">
              <span className="text-success font-bold">+</span>
              <span className="text-muted-foreground"><strong className="text-foreground">Holdkaptajn-bonus</strong> (dobbelte point for valgt holdkaptajn)</span>
            </div>
            <div className="flex items-center gap-2 rounded-md bg-secondary/50 px-3 py-2">
              <span className="text-success font-bold">+</span>
              <span className="text-muted-foreground"><strong className="text-foreground">Prediction-point</strong> (op til 15 point per arrangement)</span>
            </div>
            <div className="flex items-center gap-2 rounded-md bg-secondary/50 px-3 py-2">
              <span className="text-destructive font-bold">−</span>
              <span className="text-muted-foreground"><strong className="text-foreground">Transferfradrag</strong> (5/10/15 point afhængigt af kategori)</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-3">
            Pointopdeling er synlig på din holdside og i rangeringen.
          </p>
        </Section>

        {/* Driver withdrawal */}
        <Section icon={<ShieldAlert className="h-5 w-5 text-destructive" />} title="Kører udgår af klassen ⚠️">
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Hvis en kører officielt udgår af klassen, markeres det af admin i systemet</li>
            <li>• Berørte hold får automatisk ét <strong className="text-foreground">gratis ekstraordinært transfer</strong> inden for samme kategori – uden pointfradrag</li>
            <li>• Det gratis transfer gælder kun til erstatning af den udgåede kører</li>
            <li>• Du modtager en <strong className="text-foreground">email-notifikation</strong> når en af dine kørere udgår</li>
            <li>• Holdkaptajn-budgettet følger kategoripladsen — den nye kører har samme resterende budget som pladsen</li>
          </ul>
        </Section>

        {/* Holdkaptajn */}
        <Section icon={<Crown className="h-5 w-5 text-gold" />} title="Holdkaptajn 👑">
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Inden hvert arrangement vælger du <strong className="text-foreground">én kører som holdkaptajn</strong></li>
            <li>• Holdkaptajnens point for <strong className="text-foreground">hele arrangementet</strong> (alle 4 sessioner) tæller <strong className="text-foreground">dobbelt</strong></li>
            <li>• Holdkaptajn-budgettet er fordelt per <strong className="text-foreground">kategoriplads</strong>, ikke per kører:</li>
            <li className="ml-4">– Guld-pladsen: præcis <strong className="text-foreground">2 holdkaptajner</strong> hele sæsonen</li>
            <li className="ml-4">– Sølv-pladsen: præcis <strong className="text-foreground">2 holdkaptajner</strong> hele sæsonen</li>
            <li className="ml-4">– Bronze-pladsen: præcis <strong className="text-foreground">2 holdkaptajner</strong> hele sæsonen</li>
            <li>• Deadline for holdkaptajn: <strong className="text-foreground">24 timer inden arrangementet starter</strong></li>
            <li>• Hvis du ikke vælger holdkaptajn inden deadline, tæller alle point <strong className="text-foreground">normalt</strong> (ingen bonus) — systemet tildeler <strong className="text-foreground">ikke</strong> automatisk en holdkaptajn</li>
            <li>• Ved transfer: holdkaptajn-budgettet følger <strong className="text-foreground">kategoripladsen</strong> — hvis begge sølv-holdkaptajner er brugt, kan den nye sølvkører ikke vælges som holdkaptajn</li>
          </ul>
          <div className="mt-3 flex items-start gap-2 rounded-md bg-gold/10 border border-gold/20 px-3 py-2">
            <Crown className="h-4 w-4 text-gold mt-0.5 shrink-0" />
            <p className="text-xs text-gold">Du får en påmindelse 48 timer inden deadline!</p>
          </div>
        </Section>

        {/* Predictions */}
        <Section icon={<Brain className="h-5 w-5 text-accent" />} title="Predictions 🔮">
          <p className="text-sm text-muted-foreground mb-3">
            Optjen bonuspoint ved at gætte rigtigt! Admin opretter <strong className="text-foreground">3 spørgsmål per arrangement</strong>.
          </p>
          <h3 className="font-display font-semibold text-foreground text-sm mb-2">Pointgivning</h3>
          <ul className="space-y-1 text-sm text-muted-foreground mb-4">
            <li>• Hvert korrekt svar = <strong className="text-foreground">+5 bonuspoint</strong></li>
            <li>• Maks <strong className="text-foreground">15 bonuspoint</strong> per arrangement (3 × 5)</li>
            <li>• Point tilføjes automatisk når admin bekræfter korrekte svar</li>
          </ul>
          <h3 className="font-display font-semibold text-foreground text-sm mb-2">Spørgsmålstyper</h3>
          <ul className="space-y-1 text-sm text-muted-foreground mb-4">
            <li>• <strong className="text-foreground">Duel:</strong> "Hvem kvalificerer sig bedst af [Kører A] og [Kører B]?" — vælg én af to kørere</li>
            <li>• <strong className="text-foreground">Pointduel:</strong> "Hvem opnår flest point i weekenden af [Kører A] og [Kører B]?" — vælg én af to kørere</li>
            <li>• <strong className="text-foreground">Ja/Nej:</strong> Fritekstspørgsmål med ja eller nej som svar</li>
          </ul>
          <h3 className="font-display font-semibold text-foreground text-sm mb-2">Predictions-vindue</h3>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>• Vinduet åbner når admin publicerer spørgsmålene</li>
            <li>• Vinduet lukker <strong className="text-foreground">24 timer inden arrangementet starter</strong></li>
            <li>• Du kan ændre dine svar <strong className="text-foreground">indtil vinduet lukker</strong></li>
            <li>• Efter vinduet lukker kan du se dine svar men ikke ændre dem</li>
          </ul>
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
            Manageren med flest point efter fratrækning vinder! 🏆
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
