# PDF-sammenslåer (frontend-only)

En enkel app for ansatte som vil slå sammen flere PDF-filer direkte i nettleseren.

## Personvern og ansvar

- Filene **forlater ikke maskinen**. All behandling skjer lokalt i nettleseren med `pdf-lib`.
- Bruk på eget ansvar.
- Unngå hemmelige eller svært sensitive dokumenter hvis du er usikker.

## Begrensninger (rate limiting i UI)

- Maks antall filer: **25**
- Maks total størrelse: **200 MB**
- Hvis grensen overskrides, blir ekstra filer avvist med tydelig melding.

## Førstegangs-onboarding

Etter disclaimer vises en minioppgave første gang:

1. Sorter fem fiktive PDF-filer i riktig rekkefølge (01 → 05) med opp/ned-knapper.
2. Når rekkefølgen er riktig, vises en kort dagskode.
3. Skriv inn koden og trykk **Fortsett** for å låse opp verktøyet.

Onboarding og disclaimer lagres i localStorage per nettleser (`pdfmerger_onboarding_done`, `pdfmerger_disclaimer_accepted`).

## Funksjoner

- Dra-og-slipp for PDF-filer + knapp for filvalg.
- Liste over filer med:
  - navn
  - størrelse i MB
  - flytt opp/ned
  - fjern fil
  - tøm alt
- Input for output-filnavn (standard: `merged.pdf`).
- Sammenslåing i valgt rekkefølge.
- Statusvisning: Leser filer, Slår sammen, Ferdig.
- Feilhåndtering for ugyldige PDF-filer.

## Lokal utvikling

```bash
npm install
npm run dev
```

## Test i StackBlitz (ingen lokal installasjon)

Åpne:

`https://stackblitz.com/github/<GH_USERNAME>/<REPO_NAME>`

Eksempel for dette repoet:

`https://stackblitz.com/github/<GH_USERNAME>/PDFer`

## Deploy til GitHub Pages

Workflow finnes i `.github/workflows/deploy.yml`.

> Merk: workflowen trigger på både `main` og `master`, og bruker `npm ci` når `package-lock.json` finnes (ellers `npm install`).

### Første gangs oppsett på GitHub

1. Gå til **Settings → Pages**.
2. Velg **Build and deployment source: GitHub Actions**.
3. Push til `main` (eller `master`) for å trigge deploy.

## Viktig om Vite base path

`vite.config.ts` bruker:

```ts
base: '/PDFer/'
```

Hvis repo-navnet endres, må du oppdatere `base` til `/<nytt-reponavn>/` for at assets skal lastes riktig på GitHub Pages.
