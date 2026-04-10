

## Plan: Pre-launch fixes

### Problem
Flere kritiske ting mangler før systemet kan gå live sikkert.

### Trin

**1. Verificer at database-triggers er aktive**
- Kør en SQL-forespørgsel for at tjekke om de 6 triggers eksisterer i databasen
- Hvis de mangler, undersøg hvorfor migrationen ikke blev kørt, og opret dem igen

**2. Fix leaderboard-adgang: Tilføj offentlig SELECT-policy på managers**
- Nuværende RLS tillader kun ejeren at se sin egen manager-record
- Leaderboard-siden kræver at alle kan læse `team_name`, `total_points` og `name`
- Opret en ny policy: `Anyone can read managers` med `USING (true)` for SELECT

**3. Ryd op i Bent Hansens konti**
- Identificer hvilken af de 3 konti der har et aktivt hold (manager-record)
- Informer dig om situationen, så du kan kontakte brugeren

**4. Verificer prediction_questions_public view**
- Bekræft at frontend-API'en bruger viewet og ikke tabellen direkte
- Sikr at `correct_answer` ikke lækkes til almindelige brugere

### Tekniske detaljer
- Managers-policy: `CREATE POLICY "Anyone can read managers" ON public.managers FOR SELECT TO public USING (true);`
- Trigger-check: `SELECT tgname FROM pg_trigger WHERE tgrelid = 'public.prediction_answers'::regclass;`

