module.exports = {
  meta: {
    title: 'MassifyX Global — Procurement & Supply Chain Operations',
    description:
      'A senior supply chain team, without the headcount. An EU-based engagement point in Sweden paired with senior-led procurement delivery from Sri Lanka.'
  },

  hero: {
    eyebrow: 'Procurement & supply chain operations',
    headline: 'A senior supply chain team, without the headcount.',
    body:
      'MassifyX Global gives mid-market companies an EU-based engagement point and a senior-led delivery team in Sri Lanka — running procurement, purchase orders, supplier onboarding, and analytics inside your existing systems.',
    primaryCta: { label: 'Book a Discovery Call', href: '/contact' },
    secondaryCta: { label: 'See what we do', href: '/what-we-do' },
    // Leave empty to keep the built-in animated diagram (views/partials/hero-figure.ejs).
    // Set this to replace it with an uploaded image instead.
    figureImage: ''
  },

  // The full-bleed moving band beneath the services section. Points at the
  // shipped SVG by default; change the path to swap in different artwork.
  motionBand: {
    image: '/img/motion/supply-flow.svg'
  },

  valueProps: [
    {
      title: 'Senior capacity, junior-hire economics',
      body:
        'You get senior supply chain and procurement analysts running your account, at a cost structure closer to a junior hire than a full in-house department — without cutting the corner most outsourcing does.'
    },
    {
      title: 'An EU engagement point',
      body:
        'Sweden is where you reach us: your time zone, your regulatory context, a real point of contact accountable for the work.'
    },
    {
      title: 'Senior-led, not junior-BPO',
      body:
        'Your account is run by analysts with genuine supply chain and procurement backgrounds — the caliber you’d expect from a senior in-house hire, not an outsourced generalist pool.'
    }
  ],

  process: {
    eyebrow: 'How we work',
    headline: 'Three steps from scope to a running operation.',
    steps: [
      {
        number: '01',
        title: 'Scope & Onboard',
        body:
          'We map your current procurement workflow, systems, and reporting needs before a single task moves.'
      },
      {
        number: '02',
        title: 'Embedded Delivery Team',
        body:
          'A dedicated analyst team picks up defined scope — procurement, PO management, supplier onboarding, reporting — inside your existing tools.'
      },
      {
        number: '03',
        title: 'QBR & Continuous Improvement',
        body:
          'Quarterly business reviews keep scope, SLAs, and reporting aligned as your operation evolves.'
      }
    ]
  },

  services: {
    eyebrow: 'What we do',
    headline: 'Two divisions, live today.',
    body:
      'Operations and Analytics are what MassifyX delivers now. Digital, AI, and Advisory sit on the roadmap as the company scales — they are not current offerings.',
    items: [
      {
        name: 'Operations',
        status: 'live',
        capabilities: [
          'Procurement Operations',
          'Purchase Order Management',
          'Supplier Onboarding',
          'RFQ / RFP Support'
        ]
      },
      {
        name: 'Analytics',
        status: 'live',
        capabilities: [
          'Spend Analysis',
          'Vendor Performance Dashboards',
          'Inventory Analytics',
          'Demand Planning Support'
        ]
      }
    ],
    cta: { label: 'Explore what we do', href: '/what-we-do' }
  },

  industriesStrip: {
    eyebrow: 'Industries we serve',
    headline: 'Eight verticals, one operating model.',
    body:
      'We work with mid-market manufacturers, suppliers, and producers whose procurement volume has outgrown the team that set it up.',
    cta: { label: 'See all industries', href: '/industries' }
  },

  why: {
    eyebrow: 'Why MassifyX',
    headline: 'What makes the model different.',
    items: [
      {
        title: 'The Sweden–Sri Lanka bridge',
        body:
          'A deliberate design, not an outsourcing euphemism. EU accountability at the engagement point; depth and cost-efficiency at the delivery hub.'
      },
      {
        title: 'Transparent, scope-based pricing',
        body:
          'Engagement scope is defined upfront. No black-box retainer, no pay-per-seat surprise at renewal.'
      },
      {
        title: 'Documented process',
        body:
          'Every recurring workflow becomes a written SOP with a QA loop, so quality never depends on one person’s memory.'
      }
    ]
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

  closing: {
    headline: 'Ready to see how this works for your operation?',
    body:
      'Book a discovery call and we’ll walk through your current process — no obligation, no pitch deck.',
    cta: { label: 'Book a Discovery Call', href: '/contact' }
  }
};
