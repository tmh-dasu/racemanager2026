import PageLayout from "@/components/PageLayout";

export default function TermsPage() {
  return (
    <PageLayout>
      <div className="container max-w-2xl py-12 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="font-display text-2xl font-bold text-foreground">
            Vilkår og betingelser
          </h1>
          <p className="text-sm text-muted-foreground">
            DASU RaceManager 2026
          </p>
        </div>

        <div className="space-y-6 text-sm text-muted-foreground leading-relaxed">
          <section className="space-y-2">
            <h2 className="font-display text-lg font-semibold text-foreground">1. Generelt</h2>
            <p>
              DASU RaceManager er et fantasy-managerspil tilknyttet Super GT Danmark-serien,
              arrangeret af Dansk Automobil Sports Union (DASU). Ved tilmelding accepterer du
              nedenstående vilkår.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-lg font-semibold text-foreground">2. Tilmelding og betaling</h2>
            <p>
              Tilmeldingsgebyret er 49 kr. og er en engangsbetaling for hele sæsonen 2026.
              Betaling sker via Stripe (kort eller MobilePay) eller ved indløsning af en
              gyldig voucher-kode. Tilmeldingsgebyret refunderes ikke.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-lg font-semibold text-foreground">3. Spilregler</h2>
            <p>
              De fulde spilregler, herunder pointsystem, holdkaptajn-regler og transfers,
              kan ses på <a href="/regler" className="text-racing-red hover:underline font-medium">regelsiden</a>.
              DASU forbeholder sig retten til at justere reglerne i løbet af sæsonen, hvis
              det vurderes nødvendigt for spillets balance.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-lg font-semibold text-foreground">4. Leaderboard og kommunikation</h2>
            <p>
              Dit holdnavn og dine pointresultater vises offentligt på leaderboardet og kan blive omtalt i forbindelse med nyheder og kommunikation om spillet — herunder på dasu.dk og i DASU's sociale medier og nyhedsbreve.
            </p>
            <p>
              Som deltager modtager du notifikationsmails fra spillet, f.eks. ved nye resultater, transfervinduer og påmindelser om kaptajnvalg.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-lg font-semibold text-foreground">5. Persondata</h2>
            <p>
              Vi opbevarer dit navn og din e-mailadresse for at administrere din deltagelse i
              spillet. Dine data deles ikke med tredjeparter ud over de tekniske platforme,
              der er nødvendige for at drive tjenesten (Stripe til betaling og e-mailudsendelser).
              Du kan til enhver tid anmode om sletning af din konto ved at kontakte DASU.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-lg font-semibold text-foreground">6. Præmier og anerkendelse</h2>
            <p>
              Der uddeles præmier i udvalgte kategorier i løbet af sæsonen. De konkrete præmier stilles til rådighed af eksterne partnere. Deltagerne har intet retskrav på en specifik præmie eller kompensation, og DASU påtager sig intet ansvar for præmiers art, værdi eller levering. DASU påtager sig desuden intet ansvar for tekniske fejl, nedetid eller datatab.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-lg font-semibold text-foreground">7. Kontakt</h2>
            <p>
              Har du spørgsmål til vilkårene eller spillet, kan du kontakte DASU på{" "}
              <a href="mailto:dasu@dasu.dk" className="text-racing-red hover:underline font-medium">
                dasu@dasu.dk
              </a>.
            </p>
          </section>
        </div>
      </div>
    </PageLayout>
  );
}
