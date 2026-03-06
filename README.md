# PDF-stifteren (klientside)

Et enkelt verktøy for PDF-behandling direkte i nettleseren.

## Hva appen gjør nå

Appen har to moduser:

1. **Slå sammen PDF**
   - Last opp flere PDF-filer
   - Endre filrekkefølge med opp/ned
   - Eksporter én sammenslått PDF

2. **Organiser sider**
   - Last opp én PDF
   - Se sider som kort med miniatyr
   - Dra og slipp for å endre side-rekkefølge
   - Slett sider
   - Eksporter ny PDF med oppdatert innhold

All behandling skjer **kun klientside** i nettleseren med `pdf-lib`. Ingen filopplasting til server.

## Personvern og ansvar

- Filene **forlater ikke maskinen**.
- Bruk på eget ansvar.
- Unngå hemmelige eller svært sensitive dokumenter hvis du er usikker.

## Begrensninger

### Merge-modus (UI-grenser)

- Maks antall filer: **25**
- Maks total størrelse: **200 MB**

### Organiser sider (MVP)

- Én PDF om gangen
- Ingen rotering
- Ingen splitting i flere dokumenter
- Ingen OCR

Store eller tunge skannede PDF-er kan være krevende i nettleseren og gi treghet på svakere maskiner.

## Førstegangs-onboarding

Etter disclaimer vises en minioppgave første gang:

1. Sorter tre fiktive PDF-filer i riktig rekkefølge (01 → 03) med opp/ned-knapper.
2. Når rekkefølgen er riktig, vises en kort dagskode.
3. Skriv inn koden og trykk **Fortsett** for å låse opp verktøyet.

Onboarding og disclaimer lagres i localStorage per nettleser (`pdfmerger_onboarding_done`, `pdfmerger_disclaimer_accepted`).

## Lokal utvikling

```bash
npm install
npm run dev
```

## Manuell test (minimum)

1. Verifiser at **Slå sammen PDF** fortsatt fungerer (legg til flere filer, slå sammen, last ned).
2. Bytt mellom moduser med modusvelgeren.
3. Last opp én PDF i **Organiser sider**.
4. Verifiser at sider vises som miniatyrkort med sidetall.
5. Dra en side til en ny posisjon.
6. Slett en side.
7. Eksporter ny PDF.
8. Åpne eksportert PDF og verifiser korrekt siderekkefølge.
9. Verifiser at slettede sider ikke er med.
10. Last opp ugyldig fil og verifiser feilmelding.

## Deploy til GitHub Pages

Workflow finnes i `.github/workflows/deploy.yml`.

## Viktig om Vite base path

`vite.config.ts` bruker:

```ts
base: '/PDFer/'
```

Hvis repo-navnet endres, må du oppdatere `base` til `/<nytt-reponavn>/`.
