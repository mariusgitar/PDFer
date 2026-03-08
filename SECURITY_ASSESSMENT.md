# Sikkerhets- og sårbarhetsanalyse – PDFer

Dato: 2026-03-08

## Omfang og metode
- Statisk kodegjennomgang av applikasjonskoden i `src/`.
- Vurdering av avhengigheter basert på deklarerte versjoner i `package.json`.
- Enkel byggeverifisering lokalt (`npm run build`).
- Forsøk på `npm audit` ble blokkert av registry-policy (HTTP 403), så kjente CVE-er kan ikke verifiseres i dette miljøet.

## Risikomodell
Skala brukt i denne vurderingen:
- **Sannsynlighet**: Lav / Middels / Høy
- **Konsekvens**: Lav / Middels / Høy
- **Alvorlighetsgrad**: Lav / Middels / Høy / Kritisk

## Oppsummering av funn (prioritert)

### 1) Manglende robust validering av PDF-innhold (filtype stoler på browser MIME)
- **Alvorlighetsgrad**: **Høy**
- **Sannsynlighet**: Middels
- **Konsekvens**: Høy
- **Beskrivelse**: Applikasjonen aksepterer filer som PDF basert på `file.type === 'application/pdf'`. MIME-feltet er bruker-/klientkontrollert og kan være feil eller manipulert. Lasting med `pdf-lib` er en sekundær kontroll, men skjer først etter at filen er akseptert og prosessert i flyt.
- **Risiko**: Ustabile parser-scenarier og DoS via malformed input blir lettere å trigge. Ved fremtidig parser-sårbarhet i `pdf-lib` øker eksponeringsflaten.
- **Berørte steder**: `isPdfFile` i UI-validering og filflyt for merge/reorder.
- **Anbefaling**:
  1. Utfør «magic number»-sjekk (`%PDF-`) på første bytes av filen før videre behandling.
  2. Avvis filer med mismatch mellom MIME/extension/signatur.
  3. Logg (lokalt) og vis tydelig feilmelding ved signaturfeil.

### 2) Potensiell klient-side DoS ved ressurskrevende PDF-parsing og forhåndsvisning
- **Alvorlighetsgrad**: **Høy**
- **Sannsynlighet**: Middels
- **Konsekvens**: Høy
- **Beskrivelse**: Appen prosesserer PDF-er i nettleseren med opptil 200 MB totalstørrelse. Operasjoner som parsing, kopiering av sider og generering av preview-PDF per side kan gi høy CPU/memory-bruk.
- **Risiko**: Nettleser-tab kan fryse/crashe ved «zip-bomb»-lignende eller svært komplekse PDF-er, som påvirker tilgjengelighet.
- **Berørte steder**: `mergePdfFiles`, `loadPdfForReorder`, `exportReorderedPdf`, `createPagePreviewPdf`.
- **Anbefaling**:
  1. Legg til hard grense på antall sider (ikke bare bytes).
  2. Timeout/abort-controller rundt tunge operasjoner der mulig.
  3. Kjør parsing i Web Worker for å isolere UI-tråd.
  4. Cache/reuse parsed dokument i reorder-flyt i stedet for å laste samme bytes gjentatt ved preview/export.

### 3) Manglende sikkerhetsheader/innramming i frontend (CSP, frame-ancestors)
- **Alvorlighetsgrad**: **Middels**
- **Sannsynlighet**: Middels
- **Konsekvens**: Middels
- **Beskrivelse**: Ingen eksplisitt CSP eller frame-beskyttelse er definert i appen. Vite default setter ikke nødvendigvis stram policy i produksjon uten serverkonfig.
- **Risiko**: Økt risiko for clickjacking/innlasting i iframe og svakere XSS-motstand ved fremtidige UI-endringer.
- **Anbefaling**:
  1. Sett CSP (`default-src 'self'; object-src 'none'; frame-ancestors 'none'`).
  2. Sett `X-Frame-Options: DENY` (eller via CSP `frame-ancestors`).
  3. Aktiver `Referrer-Policy` og `X-Content-Type-Options: nosniff` på hosting-laget.

### 4) Frigivelse av object URLs kan være for aggressiv i nedlasting
- **Alvorlighetsgrad**: **Lav**
- **Sannsynlighet**: Lav
- **Konsekvens**: Lav
- **Beskrivelse**: `URL.revokeObjectURL(url)` kalles umiddelbart etter `click()`. I enkelte nettleserscenarier kan dette påvirke pålitelig nedlasting.
- **Risiko**: Primært stabilitet, ikke direkte sikkerhetsbrudd.
- **Anbefaling**: Revoker URL i `setTimeout(..., 0-1000ms)` eller etter `visibilitychange`/tilbakemelding om nedlasting.

## Hva er mest alvorlig akkurat nå?
De to mest alvorlige forholdene er:
1. **Svakt inputfilter for filinnhold** (stoler på MIME).
2. **DoS-risiko i klienten** ved parsing/preview av store eller crafted PDF-er.

Begge har høy konsekvens for tilgjengelighet og robusthet. Kombinert kan en angriper/lokket bruker laste en «gyldig» men skadelig PDF som låser UI.

## Konkrete tiltak (prioritert rekkefølge)
1. **Innholdsvalidering før parsing**: sjekk `%PDF-` signatur og minimumsstruktur.
2. **Ressursvern**: maks antall sider + bedre avbruddsmekanismer + worker-isolering.
3. **Hardening i deploy**: CSP/frame-ancestors/nosniff.
4. **Dependency governance**: kjør audit/SCA i CI med tilgang til advisory-endepunkt.

## Verifikasjon kjørt i denne analysen
- Bygg: OK.
- Dependency audit: blokkert av miljøets tilgangspolicy mot npm audit-endepunkt.
