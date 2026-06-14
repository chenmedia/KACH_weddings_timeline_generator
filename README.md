# KACH Weddings · Tidslinje

En liten, selvstendig webapp som genererer en elegant tidslinje for
bryllupsfotografering. Brudeparet legger inn dato og noen detaljer, og
verktøyet regner ut alle milepæler (spørreskjemaer, planleggingssamtale,
sluttbetaling, levering av galleri osv.) og viser dem på en pen tidslinje.

Norske offentlige helligdager beregnes automatisk slik at datoer som faller
på en helligdag flyttes til neste virkedag.

## Funksjoner

- **Automatisk tidslinje** ut fra bryllupsdato og bestillingsdato
- **Norske helligdager** beregnes og hoppes over (påske, pinse, 17. mai m.m.)
- **Valgfrie tillegg**: parfotografering og bryllupsalbum
- **Eksport til Canva** (CSV med BOM, klar for Bulk Create)
- **Eksport som PDF** (rasterisert kopi av tidslinjen, med vektor-reserve)
- **Lagring lokalt** i nettleseren (localStorage) – siste oppsett huskes
- **Utskriftsvennlig** (egen `@media print`-stil)

Hele appen er én enkelt `index.html` uten byggesteg eller eksterne avhengigheter
(bortsett fra Google Fonts som lastes fra CDN).

## Kjøre lokalt

Det er en statisk fil, så det holder å åpne den i en nettleser:

```bash
open index.html
```

Eller server den lokalt (anbefalt, så PDF-fonter og localStorage fungerer som i produksjon):

```bash
npx serve .
# eller
python3 -m http.server 3000
```

## Hoste på Vercel

Prosjektet er en ren statisk side – ingen rammeverk, ingen byggesteg.

### Alternativ A – via GitHub (anbefalt)

1. Push repoet til GitHub.
2. Gå til [vercel.com/new](https://vercel.com/new) og importer repoet.
3. La alle innstillinger stå på standard (Framework Preset: **Other**,
   ingen build command, output directory = repo-rot).
4. Trykk **Deploy**. Hver push til hovedgrenen gir en ny produksjonsversjon.

### Alternativ B – via Vercel CLI

```bash
npm i -g vercel
vercel        # forhåndsvisning
vercel --prod # produksjon
```

`vercel.json` setter rene URL-er og noen enkle sikkerhetsheadere.

## Filstruktur

```
.
├── index.html     # hele appen (HTML + CSS + JS)
├── vercel.json    # statisk hosting-konfig (headers, clean URLs)
└── README.md
```
