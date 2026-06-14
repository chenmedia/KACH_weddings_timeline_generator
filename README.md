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
│   │   ├── csv.js         # Canva/CSV
│   │   ├── ics.js         # kalender (.ics)
│   │   └── pdf.js         # PDF (raster + vektor-reserve)
│   ├── analytics.js       # valgfri cookieless statistikk
│   └── styles.css
├── vite.config.js
├── vercel.json
└── .env.example
```

### Legge til en ny milepæl

1. Legg til en post i `PHASES` i `src/config.js` (struktur: nøkkel, type, offset).
2. Legg til tekstene under `items.<nøkkel>` i **både** `src/locales/nb.js` og
   `src/locales/en.js`.

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
