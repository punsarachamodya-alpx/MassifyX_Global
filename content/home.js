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
      title: 'Cost structure that works',
      body:
        'Delivery from Sri Lanka gives you senior analyst capacity at a cost a local hire can’t match — without cutting the corner most outsourcing does.'
    },
    {
      title: 'An EU engagement point',
      body:
        'Sweden is where you reach us: your time zone, your regulatory context, a real point of contact accountable for the work.'
    },
    {
      title: 'Senior-led, not junior-BPO',
      body:
        'Your account is run by analysts with genuine supply chain and procurement backgrounds — not a rotating call-centre desk.'
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

  team: {
    eyebrow: 'Who runs this',
    headline: 'Senior attention, named and accountable.',
    members: [
      {
        name: 'Punsara Wimalasena',
        role: 'Founder, MassifyX Global',
        // TODO(founder): upload a headshot; initials render until then.
        photo: '',
        quote:
          'International supply chain and procurement experience across telecom, garments, seafood, and logistics - built around a simple observation: mid-market companies need dedicated intelligent procurement talents for smooth operation .',
        linkedin: 'https://www.linkedin.com/in/punsara-wimalasena'
      },
      {
        name: 'Viraj Bulugahapitiya',
        role: 'AI Engineer and Data Scientist, At MassifyX Global',
        photo: '',
        quote: '',
        linkedin: 'https://www.linkedin.com/in/viraj97'
      }
    ]
  },

  closing: {
    headline: 'Ready to see how this works for your operation?',
    body:
      'Book a discovery call and we’ll walk through your current process — no obligation, no pitch deck.',
    cta: { label: 'Book a Discovery Call', href: '/contact' }
  }
};
