module.exports = {
  meta: {
    title: 'How We Work — MassifyX Global',
    description:
      'An EU engagement point in Sweden paired with a senior-led delivery hub in Sri Lanka. Documented process, and a straight account of our security posture today.'
  },

  hero: {
    eyebrow: 'How we work',
    headline: 'A deliberate design, not an outsourcing euphemism.',
    body:
      'An EU engagement point paired with a Sri Lanka delivery hub is the whole point of the model — not a detail we hide in the footer.'
  },

  model: {
    eyebrow: 'The model',
    headline: 'Two locations, one accountable team.',
    body: [
      'Sweden is where you reach us. A real point of contact, operating in your time zone and your regulatory context, accountable for the work that gets delivered.',
      'Sri Lanka is where the work happens. Senior supply chain and procurement analysts — not a rotating call-centre desk — working inside your existing tools and processes.',
      'The split exists so you get EU-grade accountability and cost-efficient, senior-led delivery in the same engagement. Most outsourcing asks you to trade one for the other.'
    ],
    panels: [
      {
        label: 'EU engagement point',
        place: 'Sweden',
        image: '/img/regions/sweden.svg',
        body: 'Contracting, communication, and accountability inside the EU.'
      },
      {
        label: 'Delivery hub',
        place: 'Sri Lanka',
        image: '/img/regions/sri-lanka.svg',
        body: 'Senior analysts running your day-to-day procurement operations.'
      }
    ]
  },

  methodology: {
    eyebrow: 'Methodology',
    headline: 'Documented process, not tribal knowledge.',
    body:
      'Every engagement follows the same five stages. The point is that quality survives staff changes, holidays, and volume spikes — because the process is written down, not carried in someone’s head.',
    stages: [
      {
        number: '01',
        title: 'Onboarding',
        body:
          'We map your current tools, workflows, and reporting cadence before any task moves.'
      },
      {
        number: '02',
        title: 'Knowledge Transfer',
        body:
          'Structured handover sessions capture the context a new team needs to work inside your existing process — not around it.'
      },
      {
        number: '03',
        title: 'SOP Documentation',
        body:
          'Every recurring process is written up as a standard operating procedure, reviewed with you before it goes live.'
      },
      {
        number: '04',
        title: 'QA Loop',
        body:
          'Work is checked against the documented SOP before it reaches you — not after something breaks.'
      },
      {
        number: '05',
        title: 'SLA / TAT Commitments',
        body:
          'Turnaround and service-level commitments are agreed upfront and tracked per engagement.'
      }
    ]
  },

  security: {
    eyebrow: 'Data security & compliance',
    headline: 'What’s actually in place today.',
    body:
      'We write this section around what is genuinely true right now, rather than borrowing enterprise-vendor language we haven’t earned. If you need something here that isn’t listed, ask us directly and we’ll give you a straight answer.',
    inPlaceLabel: 'In place today',
    inPlace: [
      'GDPR-aligned data handling practices across the engagement.',
      'A Data Processing Agreement (DPA) available on request.',
      'Confidentiality terms in every engagement agreement.',
      'Access limited to the analysts assigned to your account.'
    ],
    roadmapLabel: 'On the roadmap — not yet true',
    roadmap: [
      'ISO 27001 certification is a planned trust-building step, not a credential we hold today.',
      'We do not claim SOC 2, and won’t until an audit is actually complete.'
    ]
  },

  // Pre-empts the objections a skeptical EU buyer has before they'll book a
  // call. Two further questions — the engagement-size floor and the list of
  // systems we work inside — are pending founder input and are deliberately
  // absent rather than answered vaguely; add them here when confirmed.
  faq: {
    eyebrow: 'Questions',
    headline: 'Frequently asked questions.',
    items: [
      {
        question: 'Why is MassifyX so new — should that concern me?',
        answer:
          'It’s a fair question, so here’s a straight answer: we’re early, and we’ve said so throughout this site rather than dressing it up. What you get today is senior attention on your operation, run by someone with hands-on supply chain and procurement experience across telecom, garments, seafood, and logistics — not scale we haven’t earned yet. A discovery call costs you thirty minutes and tells you directly whether that trade-off works for your operation.'
      },
      {
        question: 'How does our data actually move between Sweden and Sri Lanka?',
        answer:
          'Your engagement point in Sweden handles contracting and communication. Where work is delivered from Sri Lanka, access is limited to the analysts assigned to your account, under confidentiality terms in every engagement agreement, with a Data Processing Agreement available on request. Full detail is in the data security section above.'
      },
      {
        question: 'Do you replace our procurement team, or work alongside it?',
        answer:
          'Alongside, by default. Most engagements start with one defined process — PO management or supplier onboarding, for example — running inside your existing tools, not replacing your systems or your team.'
      },
      {
        question: 'How is pricing structured?',
        answer:
          'Every engagement is scoped and priced against your actual process — we don’t publish a rate card because a generic one wouldn’t reflect what you actually need. Tell us what you run today and we’ll come back with a scoped proposal.'
      }
    ]
  },

  closing: {
    headline: 'Want to see how this maps to your operation?',
    body:
      'We’ll walk through your current process and show you exactly where the model would slot in.',
    cta: { label: 'Book a Discovery Call', href: '/contact' }
  }
};
