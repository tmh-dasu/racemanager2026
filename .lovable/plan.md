

Brugeren har lige fået bekræftet at payment-gaten virker og spørger nu hvilke andre vigtige flows vi bør teste end-to-end. Sikkerhedsscanneren viser ingen åbne issues (alle er enten fixed eller bevidst ignoreret), så fokus bør være på funktionelle/forretningskritiske flows.

Jeg laver en kort, prioriteret testplan med de mest kritiske flows der involverer penge, point, deadlines og rettigheder.

## Forslag: End-to-end testplan

Her er de mest kritiske flows at teste, prioriteret efter forretningsrisiko:

### 1. Pointintegritet (HØJEST prioritet)
- **Cheat-forsøg**: Prøv som almindelig bruger at opdatere `total_points` direkte via Supabase-klienten — triggeren `trg_protect_manager_fields` skal blokere det.
- **Transfer-bypass**: Prøv at indsætte en transfer med `is_free=true, point_cost=0` — triggeren `enforce_transfer_values` skal overskrive værdierne baseret på kørerens kategori (Guld 15 / Sølv 10 / Bronze 5).
- **Holdkaptajn-grænse**: Vælg samme kategori som kaptajn 3 gange — `enforce_captain_limit` skal afvise det 3. valg.

### 2. Deadlines (24h-låsen)
- **Holdkaptajn**: Forsøg at ændre kaptajn <24h før race_date — skal afvises (ikke-admin).
- **Transfer**: Samme test for transfers.
- **Predictions**: Samme test for prediction_answers.
- Verificér at admin kan bypasse alle tre.

### 3. Betalingsflow
- **Ny bruger uden betaling**: Bekræft at `/vaelg-hold` viser "Betaling påkrævet"-skærmen og at evt. direkte API-kald til at oprette manager fejler på RLS.
- **Verify-payment**: Test at `verify-payment` edge function kun registrerer betalinger med `payment_status === "paid"` fra Stripe.
- **Voucher**: Test at en gyldig voucherkode opretter `user_payments`-record uden Stripe.

### 4. Holdregler
- **Max 3 kørere**: Forsøg at tilføje en 4. kører — `enforce_max_drivers` skal afvise.
- **Slug-kollision**: Opret hold med samme navn som eksisterende — skal vise dansk fejlbesked.
- **Tilbagetrukken kører**: Marker en kører som withdrawn og test at gratis transfer (`is_free=true`, `point_cost=0`) automatisk sættes.

### 5. Rettigheder & data
- **Admin-check**: Login som ikke-admin og kald `/admin` — skal redirecte/blokere.
- **Predictions-svar**: Bekræft at andre brugeres svar er skjulte indtil deadline er passeret (ny RLS).
- **Egen data**: Bekræft at man kun kan se sin egen `user_payments`-række.

### 6. Email-flow
- **Holdoprettelse**: Bekræft at `send-team-confirmation` sender mail.
- **Betalingsbekræftelse**: Bekræft at `verify-payment` sender kvittering.
- **Auth-emails**: Test password-reset flow.

### Foreslået rækkefølge

Start med **#1 (pointintegritet)** og **#3 (betaling)** — det er der hvor cheat eller fejl gør mest skade. Resten kan testes løbende.

Det automatiserede testpanel ligger allerede på `/admin/test` — det dækker en del af #3 og #4. Vil du have mig til at udvide testpanelet med de manglende cheat-forsøg under #1, så du kan køre det hele med ét klik?

