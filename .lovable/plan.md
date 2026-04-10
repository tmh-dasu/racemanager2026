

## Plan: Top 5 managers per runde i Admin

### Formål
Tilføj en ny fane i Admin-panelet der viser de 5 bedst scorende managers pr. løbsrunde. Dette giver admin et hurtigt overblik over hvem der performer bedst i hver runde.

### Implementering

**1. Ny admin-komponent: `src/components/admin/RoundTopManagers.tsx`**

- Henter: races, managers, manager_drivers, race_results, captain_selections, prediction_answers, transfers
- For hver race (runde) beregnes point pr. manager kun for den specifikke runde:
  - Race-point fra holdets kørere i den pågældende runde
  - Holdkaptajn-bonus for runden
  - Prediction-point for spørgsmål tilknyttet runden
  - Transfer-costs (fordeles ikke pr. runde, men kan vises samlet)
- Sorterer managers efter runde-point og viser top 5 i en tabel/kort pr. runde
- Viser: Rank, Holdnavn, Manager-navn, Runde-point

**2. Tilføj fane i `src/pages/Admin.tsx`**

- Ny TabsTrigger: "Runde-top" 
- Ny TabsContent med `<RoundTopManagers />` komponenten

### Beregningslogik

For hver runde (race_id):
- Sum af `race_results.points` for managerens kørere i den runde
- Plus captain bonus (dobbelt point for captain-køreren i runden)
- Plus prediction points for spørgsmål med matching `race_id`
- Ranger alle managers og vis top 5

### UI

Én sektion pr. afholdt runde (kun runder med resultater), nyeste først. Hver sektion viser en simpel tabel med rank, holdnavn, managernavn og point for runden.

