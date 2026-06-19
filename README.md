# KACH Weddings · Tidslinje

En liten webapp som genererer en elegant tidslinje for bryllupsfotografering.
Brudeparet legger inn dato og noen detaljer, og verktøyet regner ut alle
milepæler (spørreskjemaer, planleggingssamtale, sluttbetaling, levering av
galleri osv.) og viser dem på en pen tidslinje. Tidslinjen kan deles som en
egen lenke, eksporteres som PDF/CSV, eller legges rett inn i kalenderen.

Norske offentlige helligdager beregnes automatisk, slik at datoer som faller
på en helligdag flyttes til neste virkedag.

## Funksjoner

- **Automatisk tidslinje** ut fra bryllupsdato og bestillingsdato
- **Norske helligdager** beregnes og hoppes over (påske, pinse, 17. mai m.m.)
- **Delbar lenke** – kopier en lenke til en skrivebeskyttet visning for brudeparet
- **Skrivebeskyttet «klientvisning»** (`?view=client`) som skjuler alle innstillinger
- **Norsk og engelsk** – språkvelger øverst, valget følger med i delbar lenke
- **Tilpass milepæler** – skjul enkeltmilepæler eller overstyr dato og notat per brudepar
- **Valgfrie tillegg**: parfotografering og bryllupsalbum
- **Legg til i kalender (.ics)** med påminnelser dagen før hver milepæl
- **Eksport til Canva** (CSV med BOM, klar for Bulk Create)
- **Eksport som PDF** (rasterisert kopi av tidslinjen, med vektor-reserve)
- **Selvhostede skrifter** – ingen kall til Google Fonts (personvern/GDPR)
- **Lagring lokalt** i nettleseren (localStorage) – siste oppsett huskes
- **Valgfri, cookieless statistikk** (Plausible) – avslått som standard
- **Utskriftsvennlig** og responsiv

## Teknologi

- Ren JavaScript (ES-moduler), ingen rammeverk
- [Vite](https://vitejs.dev/) som dev-server og bygg
- Ingen kjøretidsavhengigheter – PDF-en bygges uten eksterne bibliotek

## Kjøre lokalt

```bash
npm install
npm run dev      # dev-server på http://localhost:5173
```

Bygg og forhåndsvis produksjonsversjonen:

```bash
npm run build    # bygger til dist/
npm run preview  # serverer dist/ lokalt
```

## Utvikling og kvalitet

```bash
npm test          # kjører enhetstestene (Vitest)
npm run lint      # ESLint
npm run format    # Prettier (skriv), eller format:check
npm run typecheck # typesjekk via JSDoc + tsc (jsconfig.json)
```

Enhetstestene dekker den rene logikken (datoer/helligdager, milepæl-beregning,
validering/sanitering av tilstand, og CSV/.ics-generering). En GitHub
Actions-arbeidsflyt (`.github/workflows/ci.yml`) kjører lint, format, typecheck,
tester og bygg på hver PR. Avhengigheter holdes oppdatert av Dependabot.

Node-versjon er festet i `.nvmrc` (Node 20+). Se `SECURITY.md` for sikkerhetsmodell.

## Prosjektstruktur

```
.
├── index.html              # HTML-skall (meta/OG/favicon, laster src/main.js)
├── public/
│   ├── fonts/              # selvhostede woff2 + fonts.css
│   ├── favicon.svg
│   ├── og.png             # delbilde for sosiale medier
│   └── robots.txt
├── src/
│   ├── main.js            # oppstart og sammenkobling
│   ├── config.js          # tidslinjens struktur + konstanter
│   ├── i18n.js            # språkmotor
│   ├── locales/           # nb.js, en.js (all synlig tekst)
│   ├── lib/
│   │   ├── dates.js       # datohjelp + norske helligdager
│   │   ├── milestones.js  # beregning av milepæler + feature-kort
│   │   ├── state.js       # standardverdier, validering, lagring, delbar lenke
│   │   └── download.js
│   ├── ui/
│   │   ├── controls.js    # skjema + milepæl-editor
│   │   └── render.js      # tidslinjen
│   ├── exporters/
│   │   ├── csv.js         # Canva/CSV (buildCSV + nedlasting)
│   │   ├── ics.js         # kalender (.ics) (buildICS + nedlasting)
│   │   └── pdf/           # PDF, splittet: index, raster, vector, fonts, overlay, util
│   ├── analytics.js       # valgfri cookieless statistikk
│   ├── types.js           # JSDoc-typedefinisjoner
│   └── styles.css
├── test/                  # Vitest enhetstester
├── .github/               # CI-arbeidsflyt + Dependabot
├── vite.config.js
├── vercel.json
├── jsconfig.json
└── .env.example
```

Eksportørene (CSV/.ics/PDF) lastes ved behov (dynamisk import), så
førstegangslasten – og brudeparets skrivebeskyttede visning – holdes liten.

### Legge til en ny milepæl

1. Legg til en post i `PHASES` i `src/config.js` (struktur: nøkkel, type, offset).
2. Legg til tekstene under `items.<nøkkel>` i **både** `src/locales/nb.js` og
   `src/locales/en.js`.

## Backend (Phase 1 — scaffold)

Et valgfritt backend for lagring, innlogging og integrasjoner er **skissert, men
inaktivt som standard**: uten miljøvariabler kjører appen akkurat som før
(localStorage). Stack: **Vercel Serverless Functions (`/api`) + Neon Postgres +
Drizzle + Clerk** — ingen rammeverk-omskriving av frontend.

Det som er på plass i denne fasen:

- **Database:** `db/schema.js` (Drizzle) + genererte migrasjoner i
  `db/migrations/`. `npm run db:generate` lager ny SQL, `npm run db:migrate`
  kjører dem (krever `DATABASE_URL`).
- **API (`/api`):** `health`, `timelines` (liste/opprett/hent/endre/slett),
  `overrides`, `public/timeline/:slug` (skrivebeskyttet for brudeparet, kun
  klient-trygge felt), og `cron/{retention,storage-report}` (lagringshygiene,
  beskyttet av `CRON_SECRET`; planlagt i `vercel.json`).
- **Adaptere (rene, testet):** `src/lib/row-mapper.js` (DB-rad ↔ `state`) og
  `src/lib/state-source.js` (localStorage i dag, API når påslått). Dato­logikken i
  `milestones.js`/`dates.js` er fortsatt eneste kilde — beregnede datoer lagres
  aldri.
- **Frontend koblet til:** Clerk-innlogging, fotograf-dashboard for lagrede
  tidslinjer (`src/ui/dashboard.js`), del-panel for å slå brudepar-lenken av/på
  (`src/ui/share-panel.js`), skrivebeskyttet `/c/:slug`-rute (håndtert i
  `src/main.js`), og `main.js` → `state-source` (localStorage uten innlogging,
  API når påslått).

Slå på backend: sett variablene i `.env.example` (Neon, Clerk, `CRON_SECRET`)
og kjør `npm run db:migrate`. Uten miljøvariabler faller alt tilbake til
localStorage og fungerer akkurat som før.

## Hoste på Vercel

Prosjektet bygges med Vite; Vercel oppdager dette automatisk.

### Via GitHub (anbefalt)

1. Push repoet til GitHub.
2. Importer det på [vercel.com/new](https://vercel.com/new).
3. Innstillingene fylles ut automatisk (Framework: **Vite**, build: `npm run build`,
   output: `dist`). Trykk **Deploy**.

### Via Vercel CLI

```bash
npm i -g vercel
vercel        # forhåndsvisning
vercel --prod # produksjon
```

`vercel.json` setter rene URL-er, sikkerhetsheadere og lang cache på skriftene.

## Personvern / statistikk (valgfritt)

Statistikk er **av** som standard. For å slå på cookieless Plausible-statistikk,
sett miljøvariabelen i Vercel (se `.env.example`):

```
VITE_PLAUSIBLE_DOMAIN=tidslinje.kachweddings.no
```

## Lisens

Privat prosjekt for KACH Weddings.
