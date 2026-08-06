module.exports = {
  meta: {
    title: 'Norvenzia — Procurement & Supply Chain Operations',
    description:
      'Scale procurement without scaling headcount. An EU engagement point in Sweden paired with senior-led procurement delivery from Colombo.'
  },

  hero: {
    eyebrow: 'Procurement & supply chain operations',
    headline: 'Scale procurement without scaling headcount.',
    body:
      'Norvenzia runs the day-to-day of your procurement — purchase orders, supplier follow-up, spend data and reporting — inside the systems you already use. An EU engagement point in Sweden. Senior delivery from Colombo.',
    // The paid front door of the business is a small, bounded, obviously valuable
    // purchase — sold directly from the homepage — not an open-ended call.
    primaryCta: { label: 'Start with a Spend Diagnostic', href: '/contact' },
    secondaryCta: { label: 'See how it works', href: '/how-we-work' },
    // Leave empty to keep the built-in animated diagram (views/partials/hero-figure.ejs).
    // Set this to replace it with an uploaded image instead.
    figureImage: ''
  },

  // The full-bleed band beneath the value props. Points at the shipped image
  // by default; change the path to swap in different artwork.
  motionBand: {
    image: '/img/generated-data-tunnel.jpg'
  },

  problem: {
    eyebrow: 'The situation.',
    headline: 'Procurement outgrew the person who set it up.',
    points: [
      'Purchase orders chased one email at a time.',
      'Spend data sitting in an ERP export nobody has time to open.',
      'Supplier problems found at delivery, not before it.'
    ]
  },

  insight: {
    eyebrow: 'Why it happens.',
    headline: 'It is not a people problem. It is a capacity problem.',
    body:
      'Most mid-market procurement teams are staffed for the volume the company had three years ago. Every hour spent chasing confirmations is an hour not spent on cost, supplier strategy, or risk. Hiring fixes it — at a cost a 50 to 500 person company struggles to justify for the volume involved.'
  },

  valueProps: [
    {
      title: 'Cost structure that works',
      body:
        'Senior delivery from Colombo gives you analyst capacity at a cost a local hire can’t match — without cutting the corner most low-cost providers do.'
    },
    {
      title: 'An EU engagement point',
      body:
        'Sweden is where you reach us: your time zone, your regulatory context, a real point of contact accountable for the work.'
    },
    {
      title: 'Senior-led, not junior desk work',
      body:
        'Your account is run by analysts with genuine supply chain and procurement backgrounds — not a rotating call-centre desk.'
    }
  ],

  // The three small, bounded ways every engagement starts, so you can judge the
  // work before committing to it.
  solution: {
    eyebrow: 'What we run.',
    headline: 'Three ways in. One operation.',
    body:
      'Every engagement starts with something small and bounded, so you can judge the work before you commit to it.',
    items: [
      {
        name: 'Spend Diagnostic',
        body:
          'Five working days. You send twelve months of purchase and spend data. You get a findings pack: where the money goes, where it leaks, and what to do about it. Fixed fee, agreed before we start.'
      },
      {
        name: 'Supplier Risk Screen',
        body:
          'Concentration, single-source exposure, geographic clustering and counterparty health across your supply base — from your own data and public company filings.'
      },
      {
        name: 'Freight Invoice Audit',
        body:
          'Twelve months of freight invoices checked against your contracted rates — rate mismatch, duplicate billing, unagreed surcharges, re-rating.'
      }
    ],
    thenWeRunIt:
      'Then we run it: purchase order management, supplier onboarding and follow-up, RFQ support, master data, reporting and KPI dashboards — run by a named team inside your systems, to agreed turnaround and service levels.',
    cta: { label: 'Explore what we do', href: '/what-we-do' }
  },

  // How an engagement runs, end to end. The fourth stage is the differentiator:
  // most firms stop at a recommendation.
  engagement: {
    eyebrow: 'How an engagement runs.',
    headline: 'See. Steady. Sharpen. Scale.',
    steps: [
      {
        number: '01',
        title: 'See',
        body:
          'We baseline the operation — spend, suppliers, exceptions, lead times. Nothing moves until we know what is actually happening.'
      },
      {
        number: '02',
        title: 'Steady',
        body:
          'We absorb the transactional load. Your team stops firefighting.'
      },
      {
        number: '03',
        title: 'Sharpen',
        body:
          'We use the baseline to cut cost and lift performance — consolidation, payment terms, supplier performance.'
      },
      {
        number: '04',
        title: 'Scale',
        body:
          'We extend into more categories, more geographies, more automation. The engagement deepens rather than ending.'
      }
    ],
    note:
      'Most firms stop at a recommendation. Our fourth stage is the one they do not have.'
  },

  // The Sweden / Colombo split, with the honest comparison against hiring
  // in-house. A design decision, not a cost decision.
  model: {
    eyebrow: 'The model.',
    headline: 'An EU engagement point. A senior delivery team.',
    panels: [
      {
        label: 'EU engagement point — Sweden',
        body:
          'Contracting, communication and accountability inside the EU, in your time zone and your regulatory context.'
      },
      {
        label: 'Delivery hub — Colombo',
        body:
          'Senior analysts with real procurement backgrounds, working inside your existing tools and processes.'
      }
    ],
    note:
      'The split is a design decision, not a cost decision. It exists so you get EU accountability and senior-led delivery in the same engagement — most arrangements ask you to trade one for the other.',
    comparison: {
      colLeft: 'Hiring in-house',
      colRight: 'Norvenzia',
      rows: [
        {
          criterion: 'Time to first output',
          left: 'Recruitment, notice period, onboarding — weeks',
          right: 'Days'
        },
        {
          criterion: 'Holiday and sickness cover',
          left: 'One person, no cover',
          right: 'Team, with documented SOPs'
        },
        {
          criterion: 'Scope flexibility',
          left: 'Fixed role',
          right: 'Scope adjusts by agreement'
        },
        {
          criterion: 'If they leave',
          left: 'The knowledge leaves with them',
          right: 'Written SOP and QA loop remain'
        },
        {
          criterion: 'Cost structure',
          left: 'Full-time salary plus employment cost',
          right: 'Scoped engagement'
        }
      ]
    }
  },

  industriesStrip: {
    eyebrow: 'Industries we serve',
    headline: 'Eight verticals, one operating model.',
    body:
      'We work with mid-market manufacturers, suppliers, and producers whose procurement volume has outgrown the team that set it up.',
    cta: { label: 'See all industries', href: '/industries' }
  },

  // No client logos, no testimonials, no case studies — because we are early,
  // and inventing them would tell you more about our judgement than our
  // capability. Point at what can be verified instead.
  proof: {
    eyebrow: 'Why believe us.',
    headline: 'We would rather be checked than believed.',
    body:
      'No client logos, no testimonials, no case studies — because we are early, and inventing them would tell you more about our judgement than our capability. Here is what can be verified instead: a founder credentials panel, built as a checkable grid rather than a biography, and Signal — a live supply chain disruption tracker we built and run ourselves. Public, in beta, and the same capability we point at a client’s own supply base in the Risk Screen.',
    cta: { label: 'Open Signal', href: '/live' }
  },

  // Deliberately a condensed echo of the How We Work security section rather
  // than new claims: the point is that a visitor meets the honest posture
  // before the final CTA, without having to find the other page first.
  posture: {
    eyebrow: 'Data security & compliance',
    headline: 'What’s actually in place today.',
    body: 'We’d rather tell you what’s real than borrow language we haven’t earned.',
    inPlaceLabel: 'In place today',
    inPlace: [
      'GDPR-aligned data handling across every engagement',
      'A Data Processing Agreement (DPA) available on request',
      'Confidentiality terms in every engagement agreement',
      'Access limited to the analysts assigned to your account'
    ],
    roadmapLabel: 'On the roadmap — not yet true',
    roadmap: [
      'ISO 27001 certification: planned, not held today',
      'SOC 2: not claimed until an audit is actually complete'
    ],
    cta: { label: 'See the full picture on How We Work', href: '/how-we-work' }
  },

  founder: {
    eyebrow: 'Who runs it',
    headline: 'Senior attention, not scale we don’t have yet.',
    credentials: [
      '4+ years across telecom, garments, seafood and logistics',
      'A documented cost-savings result from a prior role',
      'MSc Logistics and Transport Management, Sweden'
    ],
    name: 'Punsara Wimalasena',
    role: 'Founder, Norvenzia',
    cta: { label: 'Meet the founder', href: '/who-we-are' }
  },

  closing: {
    headline: 'Start with the smallest useful thing.',
    body:
      'A Spend Diagnostic takes five working days and tells you where your money goes and where it leaks. You keep the findings whether or not we work together afterwards.',
    cta: { label: 'Start with a Spend Diagnostic', href: '/contact' }
  }
};
