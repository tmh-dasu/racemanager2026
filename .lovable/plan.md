# Vis holdkaptajn-point pr. runde

En spiller kan i dag kun se sin samlede holdkaptajn-bonus for hele sæsonen på "Mit Hold" og i rangeringen — der er ingen visning af, hvilken kører der var kaptajn i hver runde, eller hvor mange bonuspoint det gav. Det gør vi synligt.

## Svar til spilleren (kan sendes som det er)

Holdkaptajnens point tæller dobbelt. Konkret: kaptajnen får sine normale point for arrangementet (alle 4 sessioner), og oveni lægges præcis samme antal point som bonus. Vælger du ikke en kaptajn inden deadline (1 time før start), får du ingen bonus. Hver kategoriplads (Guld, Sølv, Bronze) kan bruges som kaptajn præcis 2 gange i sæsonen.

Eksempel: kaptajnen kører 47 point i en runde → 47 almindelige point + 47 i kaptajn-bonus.

## Hvad bygges

### 1. Ny sektion på "Mit Hold": Holdkaptajn pr. runde
Under pointopdelingen tilføjes en foldbar liste med én linje pr. afsluttet runde:
- Rundenummer og løbsnavn
- Hvilken kører var kaptajn (navn + kategori-badge; "Ingen valgt" hvis tom)
- Kørerens point i runden
- Kaptajn-bonus (samme tal, vist som +X i guld)

Nederst: sæson-total for kaptajn-bonus, så det stemmer med tallet i pointopdelingen.

### 2. Kort forklaring i visningen
En linje med: "Din holdkaptajns point for hele arrangementet tæller dobbelt — bonussen er lig kaptajnens point i runden." Med link til Regler.

### 3. Samme detalje på offentlig holdside
På et holds offentlige side vises i dag kun "Holdkaptajn i R2, R3". Den udvides med bonuspoint pr. runde, så alle kan efterse beregningen.

## Tekniske detaljer

- Data findes allerede i `manager_round_points`: `captain_bonus`, `captain_driver_id`, `race_id`. Ingen nye tabeller, ingen ændringer i beregningslogik.
- `MyTeam.tsx` henter allerede `myRoundPoints`; ny præsentationskomponent `CaptainBreakdown.tsx` får rounds + races + drivers som props.
- `TeamPublic.tsx` henter round points for det viste hold (RLS tillader læsning) og bruger samme komponent.
- Ingen backend- eller migrationsændringer.
