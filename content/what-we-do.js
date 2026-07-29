module.exports = {
  meta: {
    title: 'What We Do — MassifyX Global',
    description:
      'Two divisions live today: Operations and Analytics. Digital, AI, and Advisory are roadmap divisions — we don’t sell them yet.'
  },

  hero: {
    eyebrow: 'What we do',
    headline: 'Two divisions, live today.',
    body:
      'MassifyX runs Operations and Analytics now. Digital, AI, and Advisory are roadmap divisions for when the company scales — we don’t sell them yet.'
  },

  divisions: [
    {
      index: '01',
      name: 'Operations',
      status: 'live',
      summary:
        'End-to-end supply chain management operations, run by senior analysts inside the systems you already use.',
      capabilities: [
        'Procurement Operations',
        'Purchase Order Management',
        'Supplier Onboarding',
        'RFQ / RFP Support',
        'Logistics Coordination',
        'Supply Chain Reporting',
        'KPI Dashboards'
      ]
    },
    {
      index: '02',
      name: 'Analytics',
      status: 'live',
      summary:
        'Visibility and decision support layered on top of your operational data, so procurement decisions stop being guesswork.',
      capabilities: [
        'Spend Analysis',
        'Vendor Performance Dashboards',
        'Inventory Analytics',
        'Demand Planning Support',
        'Master Data Management',
        'ERP Administration'
      ]
    }
  ],

  products: {
    eyebrow: 'Product suite',
    headline: 'A roadmap, labelled honestly.',
    body:
      'Core and Flow describe delivery capabilities that exist today. Signal, Pulse, Link, and Desk are planned platform features — not shipped software. We label them that way so nothing here implies a product you can log into.',
    items: [
      {
        name: 'Core',
        status: 'live',
        description:
          'The foundational delivery engine behind every engagement today.'
      },
      {
        name: 'Flow',
        status: 'live',
        description:
          'Supply Chain workflow and Procurement management, delivered as a service today.'
      },
      {
        name: 'Signal',
        status: 'roadmap',
        description:
          'Vendor and spend analytics platform - planned as engagements scale.'
      },
      {
        name: 'Pulse',
        status: 'roadmap',
        description:
          'Live KPI and demand-planning dashboards - future platform layer.'
      },
      {
        name: 'Link',
        status: 'roadmap',
        description:
          'Client-facing systems integration layer - future platform feature.'
      },
      {
        name: 'Desk',
        status: 'roadmap',
        description: 'Self-serve client portal - future platform feature.'
      }
    ]
  },

  tiers: {
    eyebrow: 'Engagement tiers',
    headline: 'Launch, Scale, Command.',
    body:
      'Every engagement is scoped and priced against your actual process, so we don’t publish rate cards. Tell us what you run today and we’ll come back with a scoped proposal.',
    items: [
      {
        name: 'Launch',
        summary:
          'For teams starting with a single defined process (PO management or supplier onboarding, for example).',
        includes: [
          'One core process',
          'Dedicated analyst',
          'Monthly reporting',
          'Documented SOP + QA loop'
        ]
      },
      {
        name: 'Scale',
        summary:
          'For teams running several procurement and analytics workflows in parallel.',
        includes: [
          'Multiple processes',
          'Dedicated analyst team',
          'Quarterly business reviews',
          'Custom KPI dashboards'
        ]
      },
      {
        name: 'Command',
        summary:
          'For teams that want MassifyX embedded across procurement and analytics end to end.',
        includes: [
          'Full Operations + Analytics scope',
          'Embedded delivery team',
          'Quarterly business reviews',
          'Master data & ERP administration'
        ]
      }
    ],
    ctaLabel: 'Contact us'
  },

  closing: {
    headline: 'Ready to scope your engagement?',
    body:
      'A discovery call is the fastest way to find out whether this model fits your operation.',
    cta: { label: 'Book a Discovery Call', href: '/contact' }
  }
};
