

## Plan: Udvid transfer-testsystemet

### Nuværende status
Test 5 dækker allerede:
- Sølv→Sølv transfer med −10 point ✓
- Bronze→Bronze transfer med −5 point ✓
- Guld→Guld transfer med −15 point ✓
- Cross-tier afvisning (kun client-side check) ✓

### Identificerede mangler
Test 5 har følgende huller:

1. **Cross-tier afvisning testes kun som string-sammenligning** — den forsøger aldrig en reel database-insert, så `enforce_transfer_values`-triggeren testes ikke
2. **Gratis nødtransfer (udgåede kørere)** testes ikke — `performEmergencyTransfer` + `is_free=true` + `point_cost=0`
3. **Backend-trigger `enforce_transfer_values`** verificeres ikke direkte — triggeren overskriver `point_cost`, men testen sender allerede den korrekte værdi, så den fanger ikke en eventuel trigger-fejl
4. **Transfer-historik** verificeres ikke — at der faktisk oprettes korrekte rækker i `transfers`-tabellen
5. **`recalculateManagerPoints` efter transfers** testes ikke — at `total_points` på manageren opdateres korrekt i databasen

### Plan for ændringer

**Fil: `src/pages/AdminTest.tsx`** — Udvid `runTest5` med nye sub-tests:

- **5E: Trigger-verifikation** — Indsæt en transfer med forkert `point_cost` (f.eks. 0) og verificer at triggeren overskriver til korrekt tier-pris
- **5F: Gratis nødtransfer** — Marker en kører som `withdrawn`, kør `performEmergencyTransfer`, verificer `is_free=true` og `point_cost=0`
- **5G: Transfer-historik** — Query `transfers`-tabellen og verificer at alle 4+ transfers er logget korrekt med rigtige `point_cost` og `is_free`-værdier
- **5H: recalculateManagerPoints** — Kør `recalculateManagerPoints()` og verificer at `managers.total_points` matcher den beregnede breakdown

### Forventede værdier efter alle transfers

Spiller A's flow:
- Start: 225 race + 74 captain = 299
- Transfer A (sølv −10): racepoints ændres (−74+56=207), total = 207+74−10 = 271
- Transfer B (bronze −5): racepoints ændres (−54+11=164), total = 164+74−15 = 223
- Transfer C (guld −15): racepoints ændres (−97+87=154), total = 154+74−30 = 198
- Nødtransfer (gratis): point_cost=0, total uændret i fradrag

### Tekniske detaljer
- Nødtransfer-test kræver at en driver markeres som `withdrawn=true` via admin update
- Trigger-test kræver direkte supabase insert med bevidst forkert `point_cost`
- Cleanup skal håndtere de nye test-data (withdrawn-flag nulstilles)

