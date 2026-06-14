// English. Mirrors the structure of nb.js.
export default {
  code: 'en',
  label: 'English',
  dateLocale: 'en-GB',

  meta: {
    title: 'KACH Weddings · Timeline',
    description:
      'Create an elegant timeline for your wedding photography — from booking to finished gallery.',
  },

  header: {
    eyebrow: 'Planning timeline for wedding photography',
  },

  controls: {
    title: 'Set up the timeline',
    fields: {
      couple: { label: "Couple's names (optional)", ph: 'e.g. Ingrid & Markus' },
      wdate: { label: 'Wedding date' },
      bdate: { label: 'Booking date (optional)' },
      place: { label: 'Location (optional)', ph: 'e.g. Bergen' },
      delw: { label: 'Gallery delivery (weeks after)' },
      sendDays: { label: 'Invoice sent (days after the wedding)' },
      termDays: { label: 'Due (days after invoice)' },
      finalOverride: { label: 'Custom due date (optional)' },
    },
    subPayment: 'Final payment (invoiced after the wedding)',
    toggles: {
      engage: 'Couple session included in the package',
      album: 'Wedding album included in the package',
    },
    buttons: {
      update: 'Update timeline',
      share: 'Copy shareable link',
      csv: 'Export to Canva (CSV)',
      ics: 'Add to calendar (.ics)',
      pdf: 'Export as PDF',
      reset: 'Reset',
      customize: 'Customise milestones',
    },
    shareCopied: 'Link copied',
    shareFailed: 'Could not copy — copy it from the address bar instead.',
    langLabel: 'Language',
  },

  editor: {
    title: 'Customise milestones',
    intro: 'Hide milestones, or override the date and note for this couple.',
    show: 'Show',
    customDate: 'Custom date',
    customNote: 'Custom note (replaces the default text)',
    resetItem: 'Reset',
    close: 'Close',
  },

  timeline: {
    defaultCouple: 'Your timeline',
    empty: 'Choose a wedding date to see the timeline.',
    finalWhen: (sendDays) =>
      sendDays === 0
        ? 'on the wedding day'
        : sendDays === 1
          ? 'the day after the wedding'
          : `${sendDays} days after the wedding`,
    finalDesc: (whenText, termDays) =>
      `The remaining balance is paid. The invoice is sent ${whenText}, with a ${termDays}-day payment term.`,
    finalWho: (sentDate) => `The invoice is sent ${sentDate}.`,
    finalOverrideDesc: 'The remaining balance is paid on the agreed date.',
    finalOverrideWho: 'Custom due date.',
  },

  booking: { dateLabel: 'On signing', weekday: 'Right away' },

  phases: {
    velkommen: 'Welcome',
    planlegging: 'Planning',
    forDagen: 'Before the day',
    selveDagen: 'The day itself',
    etterDagen: 'After the day',
  },

  items: {
    welcome: {
      tag: 'Kick-off',
      title: 'Welcome to KACH Weddings',
      desc: 'The date and agreement are confirmed, and you are officially part of KACH Weddings. I can’t wait to get to know you and to tell your story.',
      who: 'KACH Weddings will be in touch within 48 hours of the contract being signed.',
    },
    getToKnow: {
      tag: 'Questionnaire',
      dateLabel: 'After booking',
      weekday: 'Within a week',
      title: 'Let’s get to know each other',
      desc: 'A short questionnaire so I can really get to know you: your story, what matters to you, and your style. The better I know you, the more “you” the photos become.',
      who: 'KACH Weddings sends the form shortly after booking.',
    },
    timelineQ: {
      tag: 'Questionnaire',
      title: 'Run-of-day questionnaire',
      desc: 'A questionnaire covering the practical details of the day itself: times, places, key contacts and programme. It forms the basis for the run-of-day plan we build together.',
      who: 'KACH Weddings always sends it on the 1st of the month, so you can fill it in at your own pace.',
    },
    plancall: {
      tag: 'Planning',
      title: 'Planning call',
      desc: 'We talk through the whole day: the run-of-day plan, your wish list, family photos and which images matter most to you.',
      who: 'About a week after the form — we agree a time together.',
    },
    finalSync: {
      tag: 'Confirmation',
      title: 'Final run-through',
      desc: 'One last run-through before the day: we confirm the schedule, addresses, key contacts and a backup plan for the weather. Then everything is set, and you can simply look forward to it.',
      who: 'KACH Weddings will be in touch.',
    },
    day: {
      tag: 'The wedding day',
      title: 'The wedding day',
      desc: 'We are there throughout the whole day, capturing your story as it unfolds — effortless and real.',
      who: '',
    },
    sneak: {
      tag: 'Delivery',
      title: 'Sneak peek',
      desc: 'A small selection of images while the feeling is still fresh — perfect for the first thank-you notes.',
      who: 'KACH Weddings will send it.',
    },
    final: {
      tag: 'Payment',
      title: 'Final payment due',
      desc: '',
      who: '',
    },
    gallery: {
      tag: 'Delivery',
      title: 'Finished gallery',
      desc: 'The finished gallery is delivered. Your story, told from start to finish, ready to download and share.',
      who: 'KACH Weddings delivers it in an online gallery you can download from.',
    },
    thanks: {
      tag: 'Closing',
      title: 'Thank you for your trust',
      desc: 'Thank you so much for letting me share your day. If you loved the photos, I would hugely appreciate a few words or a review. It means everything to us at KACH Weddings.',
      who: 'KACH Weddings will be in touch.',
    },
  },

  asides: {
    parfoto: {
      title: 'Couple session',
      eyebrowIncluded: 'Included in the package',
      eyebrowOptional: 'Optional add-on',
      descIncluded:
        'A dedicated photo session for the two of you — a relaxed way to grow comfortable in front of the camera. We find a good time together.',
      descOptional:
        'A dedicated photo session for the two of you during the autumn or spring before the wedding — a relaxed way to grow comfortable in front of the camera.',
      noteOptional: 'Comes in addition to the package price.',
      seasonsLabel: 'Suitable seasons',
      seasons: { autumn: 'Autumn', spring: 'Spring', summer: 'Summer' },
    },
    album: {
      title: 'Wedding album',
      eyebrowIncluded: 'Included in the package',
      eyebrowOptional: 'Optional add-on',
      descIncluded:
        'Once the gallery is ready, your favourites can be gathered into a handmade album — your story in physical form.',
      descOptional:
        'Once the gallery is ready, your favourites can be gathered into a handmade album — your story in physical form.',
      noteOptional: 'Comes in addition to the package price.',
    },
  },

  footer: {
    sig: 'Looking forward to capturing your big day',
  },

  csv: {
    headers: [
      'Couple',
      'Wedding date',
      'Location',
      'Phase',
      'Tag',
      'Date',
      'Weekday',
      'Title',
      'Description',
      'Detail',
    ],
    included: 'Included',
    optional: 'Optional add-on',
    includedDetail: 'Included in the package',
    optionalDetail: 'Optional add-on at extra cost',
    seasonsDetail: (list) => ' · Suitable seasons: ' + list.join(', '),
  },

  ics: {
    calName: 'KACH Weddings · Timeline',
    reminder: 'Reminder',
  },

  pdf: {
    exporting: 'Exporting …',
    overlayTitle: 'PDF preview',
    download: 'Download',
    openTab: 'Open in new tab',
    close: 'Close',
    hint: 'Tip: if “Download” does nothing, use the save or print button in the PDF view below, or “Open in new tab”.',
    error: 'Could not create the PDF here. Open the file in your browser and try again.',
  },

  alerts: {
    pickDate: 'Choose a wedding date first.',
  },
};
