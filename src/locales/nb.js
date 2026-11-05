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

  nav: {
    home: 'Oversikt',
    journey: 'Klientreise',
    timeline: 'Brudepar',
    workspace: 'Arbeidsområde',
    soon: 'Snart',
    menu: 'Meny',
    account: 'Konto',
  },

  tools: {
    journey: {
      title: 'Klientreise',
      summary: 'Følg hvert brudepar fra signert avtale til første bryllupsdag.',
    },
    timeline: {
      title: 'Tidslinjegenerator',
      summary: 'Lag en elegant fotograferingstidslinje for hvert brudepar.',
    },
  },

  home: {
    intro: 'Verktøyene dine',
    soon: 'Kommer snart',
    recent: 'Siste brudepar',
    allCouples: 'Alle brudepar',
    greeting: {
      morning: 'God morgen',
      afternoon: 'God ettermiddag',
      evening: 'God kveld',
      night: 'God natt',
    },
    comingSoon: [
      { title: 'Maler', summary: 'Gjenbrukbare pakker for raskere oppsett.', icon: 'templates' },
      { title: 'Betaling', summary: 'Følg depositum og betalinger per brudepar.', icon: 'payments' },
    ],
    overview: {
      nextActions: 'Neste handlinger',
      openJourney: 'Åpne klientreise',
      editTimeline: 'Tidslinje',
      noAction: 'Ingen åpne handlinger',
      noDate: 'Ingen dato',
      today: 'I dag',
      due: (date) => `Planlagt ${date}`,
      overdue: (date) => `Forfalt ${date}`,
      progress: (completed, total) => `${completed} av ${total} fullført`,
      weddingCount: (count) => `${count} ${count === 1 ? 'bryllup' : 'bryllup'}`,
      needsAttention: (count) => `${count} trenger oppfølging`,
      nextWedding: (date) => `neste bryllup ${date}`,
    },
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

  journey: {
    title: 'Klientreisen',
    intro: 'Se neste personlige handling, planlegg oppfølgingen og hold alle datoer samkjørt.',
    selectCouple: 'Velg brudepar',
    noCouples: 'Opprett det første brudeparet i tidslinjegeneratoren.',
    createCouple: 'Nytt brudepar',
    weddingDate: 'Bryllupsdato',
    location: 'Sted',
    packageName: 'Pakke',
    lastTouch: 'Siste personlige kontakt',
    nextAction: 'Neste handling',
    progress: 'Fremdrift',
    checklistTitle: 'Oppgaver i denne fasen',
    calculated: 'Beregnet',
    manual: 'Manuell',
    resetDate: 'Tilbakestill',
    save: 'Lagre endringer',
    saving: 'Lagrer …',
    saved: 'Endringene er lagret',
    openFocl: 'Åpne i FOCL',
    setupFocl: 'Legg til FOCL-lenke',
    unsaved: {
      title: 'Ulagrede endringer',
      body: 'Hvis du bytter brudepar nå, mister du endringene som ikke er lagret.',
      discard: 'Forkast endringer',
    },
    tabs: {
      journey: 'Klientreise',
      referrals: 'Referral moments',
      templates: 'Maler og FOCL',
    },
    stages: {
      welcome: 'Velkommen',
      planning: 'Planlegging',
      final: 'Før bryllupet',
      wedding: 'Bryllupsdagen',
      delivery: 'Levering',
      nurture: 'Videre relasjon',
    },
    tasks: {
      welcomeGuide: 'Send personlig velkomst og guide',
      foclSetup: 'Opprett eller koble FOCL-prosjekt',
      storyCall: 'Bli kjent med historien deres',
      questionnaire: 'Send planleggingsskjema',
      engagementSession: 'Planlegg parfotografering',
      planningCall: 'Gjennomfør planleggingssamtale',
      finalMeeting: 'Gjennomfør siste planleggingsmøte',
      weddingEncouragement: 'Send rolig oppmuntring før bryllupet',
      weddingCare: 'Planlegg personlig omsorg på bryllupsdagen',
      backupCheck: 'Kontroller utstyr, backup og kontaktpunkter',
      sneakPreview: 'Send en smakebit',
      galleryDelivery: 'Lever galleriet som en opplevelse',
      reviewRequest: 'Følg opp med takk og anmeldelse',
      parentPrint: 'Følg opp foreldre og familie om print',
      holidayGift: 'Send første julehilsen eller minne',
      anniversaryTouch: 'Følg opp på første bryllupsdag',
    },
    referrals: {
      title: 'Åtte referral moments',
      intro: 'Velg hvilke personlige øyeblikk som skal inngå, og planlegg kostnaden per bryllup.',
      enabled: 'Aktiv',
      cost: 'Kostnad i NOK',
      total: 'Budsjett for dette bryllupet',
      plans: {
        essential: 'Essential',
        signature: 'Signature',
        premium: 'Premium',
        custom: 'Tilpasset',
      },
      moments: {
        welcome: { title: 'Velkommen til KACH', desc: 'Bekreft tilhørighet og sett en trygg forventning.' },
        engagement: {
          title: 'Parfotograferingen',
          desc: 'Skap trygghet og en opplevelse de naturlig deler.',
        },
        weddingWeek: { title: 'Bryllupsuken', desc: 'Reduser stress med en personlig og rolig hilsen.' },
        weddingCare: { title: 'Omsorg på bryllupsdagen', desc: 'Gjør selve tjenesten verdt å anbefale.' },
        gallery: { title: 'Gallerileveringen', desc: 'Gjør leveringen til et emosjonelt gjensyn.' },
        parentPrint: {
          title: 'Familie og print',
          desc: 'Utvid relasjonen til foreldre, familie og fysiske minner.',
        },
        holiday: { title: 'Første jul', desc: 'Ta naturlig kontakt igjen med et meningsfullt minne.' },
        anniversary: { title: 'Første bryllupsdag', desc: 'Avslutt reisen og åpne for album og anbefaling.' },
      },
    },
    templates: {
      title: 'Meldingsmaler',
      intro: 'Et varmt utgangspunkt som alltid kan gjøres personlig før det sendes.',
      copy: 'Kopier',
      copied: 'Meldingen er kopiert',
      foclTitle: 'FOCL-prosjekt',
      foclHint: 'Lagre den direkte prosjektlenken. Automatisk synk er ikke aktivert ennå.',
      foclPlaceholder: 'https://getfocl.app/…',
      foclInvalid: 'Bruk en gyldig https-lenke.',
      integrationAreas: [
        'Tidslinje — klar for en fremtidig verifisert FOCL-integrasjon',
        'Personer og grupper — ikke synkronisert ennå',
        'Leverandører og steder — ikke synkronisert ennå',
        'Historie og bildeprioriteringer — ikke synkronisert ennå',
      ],
      welcome: {
        title: 'Velkommen',
        body: 'Hei! Så utrolig fint å få ønske dere velkommen til KACH Weddings. Jeg gleder meg til å bli kjent med historien deres og skape en rolig, personlig opplevelse hele veien frem mot bryllupet.',
      },
      weddingWeek: {
        title: 'Bryllupsuken',
        body: 'Nå er bryllupsuken her. Dere trenger ikke å prestere noe foran kameraet – min jobb er å skape ro, se de små øyeblikkene og la dere være fullt til stede med menneskene deres.',
      },
      gallery: {
        title: 'Galleriet er klart',
        body: 'Galleriet deres er klart. Finn gjerne et rolig øyeblikk, hell noe godt i glasset og opplev dagen sammen på nytt. Tusen takk for at jeg fikk ta vare på minnene deres.',
      },
      anniversary: {
        title: 'Første bryllupsdag',
        body: 'Gratulerer med deres første bryllupsdag. Jeg håper bildene fortsatt tar dere tilbake til følelsen, menneskene og de små øyeblikkene som gjorde dagen helt deres.',
      },
    },
    feedback: {
      loadFailed: 'Kunne ikke laste klientreisen.',
      saveFailed: 'Kunne ikke lagre alle endringene. Ingenting er skjult – prøv igjen.',
      conflict: 'Denne klientreisen ble endret et annet sted. Last inn siste versjon før du lagrer igjen.',
      invalidFocl: 'FOCL-lenken må starte med https://.',
    },
  },

  share: {
    title: 'Del med brudeparet',
    enable: 'Lag en delbar lenke',
    hint: 'Brudeparet kan se (men ikke endre) tidslinjen via denne lenken.',
    copy: 'Kopier lenke',
    copied: 'Lenken er kopiert',
    failed: 'Kunne ikke kopiere – kopier fra feltet i stedet.',
    scan: 'Skann for å åpne',
    urlLabel: 'Delbar lenke',
    expiryLabel: 'Lenken utløper (valgfritt)',
    expired: 'Utløpt',
    neverViewed: 'Ikke åpnet ennå',
    viewed: (n, date) => `Åpnet ${n} ${n === 1 ? 'gang' : 'ganger'} · sist ${date}`,
    revoke: 'Tilbakekall lenke',
    revokeTitle: 'Tilbakekall lenke',
    revokeConfirm:
      'Tilbakekalle lenken? Den gamle adressen slutter å virke, og en ny lages neste gang du deler.',
    expirySet: 'Utløpsdato lagret',
    expiryCleared: 'Utløpsdato fjernet',
    expiryFailed: 'Kunne ikke lagre utløpsdatoen.',
    revoked: 'Lenken er tilbakekalt',
    revokeFailed: 'Kunne ikke tilbakekalle lenken.',
  },

  feedback: {
    saveFailed: 'Kunne ikke lagre endringene.',
    conflict: 'Brudeparet er endret i en annen fane. Last siden på nytt før du lagrer igjen.',
    loadFailed: 'Kunne ikke laste brudeparet.',
    createFailed: 'Kunne ikke opprette brudeparet.',
    deleteFailed: 'Kunne ikke slette brudeparet.',
    shareToggleFailed: 'Kunne ikke endre delingsstatus.',
    exported: 'Filen er lastet ned',
    retry: 'Prøv igjen',
    deleteTitle: 'Slett brudepar',
    cancel: 'Avbryt',
  },

  controls: {
    title: 'Sett opp tidslinjen',
    groups: {
      design: 'Design',
      setup: 'Brudepar og dato',
      payment: 'Levering og sluttbetaling',
      extras: 'Hva som er inkludert',
      actions: 'Handlinger for tidslinjen',
    },
    themeLabel: 'Tidslinjemal',
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
    loadingPublic: 'Laster tidslinjen din …',
    notFound: 'Denne lenken er ikke lenger tilgjengelig. Be fotografen om en oppdatert lenke.',
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
