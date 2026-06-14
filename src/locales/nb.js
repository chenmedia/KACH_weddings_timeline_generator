// Norsk (bokmål) — kildespråk. All tekst som vises i appen.
export default {
  code: 'nb',
  label: 'Norsk',
  dateLocale: 'nb-NO',

  meta: {
    title: 'KACH Weddings · Tidslinje',
    description: 'Lag en elegant tidslinje for bryllupsfotograferingen – fra bestilling til ferdig galleri.',
  },

  header: {
    eyebrow: 'Tidslinje for planlegging av bryllupsfotografering',
  },

  dashboard: {
    title: 'Brudepar',
    newBtn: 'Nytt brudepar',
    empty: 'Ingen brudepar ennå. Opprett det første.',
    loading: 'Laster …',
    error: 'Kunne ikke laste listen.',
    delete: 'Slett',
    deleteConfirm: 'Slette dette brudeparet? Dette kan ikke angres.',
    selectPrompt: 'Velg et brudepar i listen, eller opprett et nytt.',
    signInTitle: 'Logg inn',
    signInIntro: 'Logg inn for å lage og lagre tidslinjer.',
  },

  controls: {
    title: 'Sett opp tidslinjen',
    fields: {
      couple: { label: 'Brudeparets navn (valgfritt)', ph: 'f.eks. Ingrid & Markus' },
      wdate: { label: 'Bryllupsdato' },
      bdate: { label: 'Bestillingsdato (valgfritt)' },
      place: { label: 'Sted (valgfritt)', ph: 'f.eks. Bergen' },
      delw: { label: 'Levering av galleri (uker etter)' },
      sendDays: { label: 'Faktura sendes (dager etter bryllupet)' },
      termDays: { label: 'Forfall (dager etter faktura)' },
      finalOverride: { label: 'Egendefinert forfallsdato (valgfritt)' },
    },
    subPayment: 'Sluttbetaling (faktureres etter bryllupet)',
    toggles: {
      engage: 'Parfotografering inkludert i pakken',
      album: 'Bryllupsalbum inkludert i pakken',
    },
    buttons: {
      update: 'Oppdater tidslinje',
      share: 'Kopier delbar lenke',
      csv: 'Eksporter til Canva (CSV)',
      ics: 'Legg til i kalender (.ics)',
      pdf: 'Eksporter som PDF',
      reset: 'Tilbakestill',
      customize: 'Tilpass milepæler',
    },
    shareCopied: 'Lenken er kopiert',
    shareFailed: 'Kunne ikke kopiere – kopier fra adressefeltet i stedet.',
    langLabel: 'Språk',
  },

  editor: {
    title: 'Tilpass milepæler',
    intro: 'Skjul milepæler eller overstyr dato og notat for dette brudeparet.',
    show: 'Vis',
    customDate: 'Egendefinert dato',
    customNote: 'Eget notat (erstatter standardteksten)',
    resetItem: 'Nullstill',
    close: 'Lukk',
  },

  timeline: {
    defaultCouple: 'Deres tidslinje',
    empty: 'Velg en bryllupsdato for å se tidslinjen.',
    finalWhen: (sendDays) =>
      sendDays === 0
        ? 'på bryllupsdagen'
        : sendDays === 1
          ? 'dagen etter bryllupet'
          : `${sendDays} dager etter bryllupet`,
    finalDesc: (whenText, termDays) =>
      `Restbeløpet betales. Fakturaen sendes ${whenText}, med ${termDays} dagers betalingsfrist.`,
    finalWho: (sentDate) => `Fakturaen sendes ${sentDate}.`,
    finalOverrideDesc: 'Restbeløpet betales på den avtalte datoen.',
    finalOverrideWho: 'Egen forfallsdato.',
  },

  booking: { dateLabel: 'Ved signering', weekday: 'Med en gang' },

  phases: {
    velkommen: 'Velkommen',
    planlegging: 'Planlegging',
    forDagen: 'Før dagen',
    selveDagen: 'Selve dagen',
    etterDagen: 'Etter dagen',
  },

  items: {
    welcome: {
      tag: 'Oppstart',
      title: 'Velkommen til KACH Weddings',
      desc: 'Dato og avtale er bekreftet, og dere er offisielt en del av KACH Weddings. Jeg gleder meg til å bli kjent med dere og til å fortelle historien deres.',
      who: 'KACH Weddings tar kontakt innen 48 timer etter at kontrakten er signert.',
    },
    getToKnow: {
      tag: 'Spørreskjema',
      dateLabel: 'Etter bestilling',
      weekday: 'Innen en uke',
      title: 'La oss bli kjent',
      desc: 'Et lite spørreskjema så jeg kan bli ordentlig kjent med dere: historien deres, hva som betyr noe, og stilen deres. Jo bedre jeg kjenner dere, jo mer «dere» blir bildene.',
      who: 'KACH Weddings sender skjemaet kort tid etter bestillingen.',
    },
    timelineQ: {
      tag: 'Spørreskjema',
      title: 'Kjøreplanskjema',
      desc: 'Et spørreskjema med de praktiske detaljene rundt selve dagen: tider, steder, kontaktpersoner og program. Det danner grunnlaget for kjøreplanen vi lager sammen.',
      who: 'KACH Weddings sender det alltid den 1. i måneden, så dere kan fylle ut i ro og mak.',
    },
    plancall: {
      tag: 'Planlegging',
      title: 'Planleggingssamtale',
      desc: 'Vi tar en prat og går gjennom hele dagen: kjøreplan, ønskeliste, familiebilder og hvilke bilder som betyr mest for dere.',
      who: 'Omtrent en uke etter skjemaet. Vi avtaler tidspunkt sammen.',
    },
    finalSync: {
      tag: 'Bekreftelse',
      title: 'Siste gjennomgang',
      desc: 'En siste gjennomgang før dagen: vi bekrefter kjøreplan, adresser, kontaktpersoner og en reserveplan for været. Da er alt klart, og dere kan bare glede dere.',
      who: 'KACH Weddings tar kontakt.',
    },
    day: {
      tag: 'Bryllupsdagen',
      title: 'Bryllupsdagen',
      desc: 'Vi er der gjennom hele dagen og fanger historien deres slik den utspiller seg, uanstrengt og ekte.',
      who: '',
    },
    sneak: {
      tag: 'Levering',
      title: 'Smakebit',
      desc: 'Et lite utvalg bilder mens følelsen fortsatt sitter i kroppen, perfekt for de første takkehilsenene.',
      who: 'KACH Weddings sender.',
    },
    final: {
      tag: 'Betaling',
      title: 'Sluttbetaling forfaller',
      desc: '',
      who: '',
    },
    gallery: {
      tag: 'Levering',
      title: 'Ferdig galleri',
      desc: 'Det ferdige bildegalleriet leveres. Historien deres, fortalt fra start til slutt, klar til å lastes ned og deles.',
      who: 'KACH Weddings leverer i et nettgalleri dere kan laste ned fra.',
    },
    thanks: {
      tag: 'Avslutning',
      title: 'Takk for tilliten',
      desc: 'Tusen takk for at jeg fikk dele dagen deres. Ble dere glade i bildene, setter jeg umåtelig stor pris på noen ord eller en anmeldelse. Det betyr alt for oss i KACH Weddings.',
      who: 'KACH Weddings tar kontakt.',
    },
  },

  asides: {
    parfoto: {
      title: 'Parfotografering',
      eyebrowIncluded: 'Inkludert i pakken',
      eyebrowOptional: 'Valgfritt tillegg',
      descIncluded:
        'En egen fotoøkt for dere to, en rolig måte å bli trygg foran kamera på. Vi finner et fint tidspunkt sammen.',
      descOptional:
        'En egen fotoøkt for dere to i løpet av høsten eller våren før bryllupet, en rolig måte å bli trygg foran kamera på.',
      noteOptional: 'Kommer i tillegg til pakkeprisen.',
      seasonsLabel: 'Aktuelle årstider',
      seasons: { autumn: 'Høst', spring: 'Vår', summer: 'Sommer' },
    },
    album: {
      title: 'Bryllupsalbum',
      eyebrowIncluded: 'Inkludert i pakken',
      eyebrowOptional: 'Valgfritt tillegg',
      descIncluded:
        'Når galleriet er klart, kan favorittene deres samles i et håndlaget album, historien deres i fysisk form.',
      descOptional:
        'Når galleriet er klart, kan favorittene deres samles i et håndlaget album, historien deres i fysisk form.',
      noteOptional: 'Kommer i tillegg til pakkeprisen.',
    },
  },

  footer: {
    sig: 'Gleder meg til å forevige deres store dag',
  },

  csv: {
    headers: [
      'Brudepar',
      'Bryllupsdato',
      'Sted',
      'Fase',
      'Tag',
      'Dato',
      'Ukedag',
      'Tittel',
      'Beskrivelse',
      'Detalj',
    ],
    included: 'Inkludert',
    optional: 'Valgfritt tillegg',
    includedDetail: 'Inkludert i pakken',
    optionalDetail: 'Valgfritt tillegg som koster ekstra',
    seasonsDetail: (list) => ' · Aktuelle årstider: ' + list.join(', '),
  },

  ics: {
    calName: 'KACH Weddings · Tidslinje',
    reminder: 'Påminnelse',
  },

  pdf: {
    exporting: 'Eksporterer …',
    overlayTitle: 'Forhåndsvisning av PDF',
    download: 'Last ned',
    openTab: 'Åpne i ny fane',
    close: 'Lukk',
    hint: 'Tips: hvis «Last ned» ikke gjør noe, bruk lagre- eller utskriftsknappen i PDF-visningen under, eller «Åpne i ny fane».',
    error: 'Kunne ikke lage PDF her. Åpne fila i nettleseren din og prøv igjen.',
  },

  alerts: {
    pickDate: 'Velg en bryllupsdato først.',
  },
};
