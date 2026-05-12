
# Persistér pr-løb breakdown

Opret en låst historik over hvert holds point pr. løb, så totalerne ikke længere skal genberegnes ad-hoc og ikke kan glide ved senere ændringer.

## Hvad bygges

### 1. Ny tabel `manager_round_points`
Én række pr. (manager, race) med fuldt breakdown:
- `race_points` — sum af pointene fra de 3 førere holdet havde på løbsdagen
- `captain_bonus` — captain-førerens point i løbet (eller 0)
- `prediction_points` — 5 × antal korrekte predictions for det løb
- `transfer_costs` — sum af `point_cost` for transfers lavet i transfer-vinduet før løbet
- `team_snapshot` — array af de 3 driver_ids holdet havde på løbsdagen (audit-trail)
- `captain_driver_id` — hvem var captain
- `computed_at` — hvornår beregnet

Unik constraint på (manager_id, race_id). Kun admin/service kan skrive. Alle kan læse.

### 2. Recompute-funktion `recompute_manager_round(manager_id, race_id)`
SECURITY DEFINER funktion der:
- Rekonstruerer holdet på løbsdagen ved at undo alle transfers efter `race_date`
- Beregner alle 4 felter
- UPSERTER én række i `manager_round_points`
- Opdaterer `managers.total_points` = SUM af alle rækker for den manager

### 3. Auto-opdatering via triggers
Triggers på følgende tabeller kalder recompute for berørte (manager, race):
- `race_results` (INSERT/UPDATE/DELETE) → recompute alle managers for det race
- `transfers` (INSERT/DELETE) → recompute den manager for alle løb (transferen påvirker historik bagud)
- `captain_selections` (INSERT/UPDATE/DELETE) → recompute den ene (manager, race)
- `prediction_answers` (UPDATE af is_correct) → recompute den ene (manager, race)
- `races` (UPDATE af race_date) → recompute alle managers for det race

### 4. Initial backfill
Kør recompute for alle eksisterende (manager, race)-kombinationer én gang som del af migrationen.

### 5. Frontend
`src/lib/api.ts` får ny `fetchManagerRoundPoints()` som henter fra den persisterede tabel.
`computePointBreakdown()` beholdes som fallback men markeres deprecated.
`Leaderboard.tsx` og `Index.tsx` (vinder pr. runde) bruger den persisterede data → hurtigere og garanteret konsistent med DB-totalerne.

## Tekniske detaljer

- Recompute-funktionen bruger `SECURITY DEFINER` + omgår `protect_manager_fields` ved selv at opdatere `managers.total_points` direkte (eller midlertidig disable-trigger inde i funktionen).
- Triggers er `AFTER` triggers så de ser endelig data.
- For at undgå rekursion: triggeren der opdaterer `managers` deaktiveres ikke andre triggers — `protect_manager_fields` skal ændres så den tillader opdateringer fra vores recompute-funktion (fx via `SET LOCAL app.recompute_in_progress = true` flag).
- Performance: ~86 managers × ~5 løb = ~430 rækker. Trigger-genberegninger er per-event så ingen N+N kompleksitet.

## Migrationer

1. `CREATE TABLE manager_round_points` + RLS + indexes
2. `CREATE FUNCTION recompute_manager_round(...)` og hjælpefunktion `recompute_all()`  
3. `CREATE TRIGGER`s på de 5 tabeller
4. Tilpas `protect_manager_fields` så recompute kan opdatere total_points
5. Initial backfill: `SELECT recompute_all();`

## Risici

- Triggers kan gøre admin-CSV-import af resultater langsommere (mange events). Kan optimeres ved batch-mode flag der suspenderer trigger og kører ét recompute til sidst.
- Hvis ny logik introduceres senere (fx ekstra bonusser), skal recompute-funktionen opdateres.
