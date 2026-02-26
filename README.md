# PDF-sammenslåer (frontend-only)

En enkel app for ansatte som vil slå sammen flere PDF-filer direkte i nettleseren.

## Personvern

Filene **forlater ikke maskinen**. All behandling skjer lokalt i nettleseren med `pdf-lib`.

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
- Advarsel for totalstørrelse over 200 MB.

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

### Første gangs oppsett på GitHub

1. Gå til **Settings → Pages**.
2. Velg **Build and deployment source: GitHub Actions**.
3. Push til `main` for å trigge deploy.

## Viktig om Vite base path

`vite.config.ts` bruker:

```ts
base: '/PDFer/'
```

Hvis repo-navnet endres, må du oppdatere `base` til `/<nytt-reponavn>/` for at assets skal lastes riktig på GitHub Pages.
