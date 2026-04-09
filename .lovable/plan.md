

## Plan: Opdater test-forventede værdier efter nødtransfer

### Problem
Test 5F (nødtransfer) blev tilføjet og ændrer Spiller A's hold: Bronze 2 → Bronze 3 (som har 0 race-point). Men Test 7's forventede værdier er stadig beregnet ud fra det gamle hold (med Bronze 2 = 11 point).

### Beregning efter alle transfers

Spiller A's hold efter Test 5:
- Transfer A: Sølv 1 → Sølv 2
- Transfer B: Bronze 1 → Bronze 2
- Transfer C: Guld 1 → Guld 2
- Transfer F: Bronze 2 → Bronze 3 (nødtransfer, gratis)

**Sluthold:** Guld 2, Sølv 2, Bronze 3

Race-point for slutholdet:
- Guld 2: P2(22) + P1(25) + P4(18) + P2(22) = **87**
- Sølv 2: P5(16) + P6(15) + P8(13) + P9(12) = **56**
- Bronze 3: ingen resultater = **0**
- **Race total = 143**

Captain-bonus (Sølv 1, sat i Test 3): **74** (bevares efter transfer)
Transfer-fradrag: 10 + 5 + 15 + 0 = **30**

### Ændringer

**Fil: `src/pages/AdminTest.tsx`**

**Test 7 — linje 552-558:** Opdater forventede værdier:
- `racePoints`: 154 → **143**
- `total`: 213 → **202** (143 + 74 + 15 − 30)
- Captain-bonus (74), prediction (15) og transferfradrag (30) er uændrede

Det er den eneste test der har forkerte forventede værdier. Test 5H sammenligner blot DB mod beregnet og vil matche korrekt (begge giver 187 uden predictions, da Test 6 ikke er kørt endnu). Test 2 og 3 kører før transfers og er upåvirkede.

