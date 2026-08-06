module.exports = {
  meta: {
    title: 'Who We Are — Norvenzia',
    description:
      'A specialist procurement and supply chain operation, built deliberately small. Senior attention on your operation, not scale we don’t have yet.'
  },

  hero: {
    eyebrow: 'Who we are',
    headline: 'A specialist operation, built deliberately small.',
    body:
      'Norvenzia is early. We’d rather tell you that plainly than dress it up — what we offer is senior attention on your procurement operation, not scale we don’t have yet.'
  },

  founder: {
    eyebrow: 'Founder',
    headline: 'Why this exists.',
    name: 'Punsara Wimalasena',
    role: 'Founder, Norvenzia',
    // TODO(founder): upload a headshot; initials render until then.
    photo: '',
    linkedin: 'https://www.linkedin.com/in/punsara-wimalasena',
    // Signed off by the founder — the story below reads as finished, so no
    // visible review marker. Setting this to a non-empty string brings the
    // notice back (see views/who-we-are.ejs).
    draftNotice: '',
    story: [
      'I started Norvenzia because I’d spent years inside supply chain and procurement operations — across telecom, garments, seafood, and logistics — and kept running into the same gap. Mid-market companies need senior procurement talent, but can’t justify a full in-house team for it.',
      'Sri Lanka gave me a way to close that gap without cutting the corner most outsourcing does. The analysts running your account aren’t junior; they have real supply chain backgrounds. And Sweden gives you a genuine point of contact, in your time zone, accountable for the work.',
      'That’s the arbitrage: not cheaper labour for its own sake, but senior-level delivery at a cost structure that makes sense for a 50–500 person company.'
    ]
  },

  team: {
    eyebrow: 'The team',
    headline: 'Who’s behind the work.',
    members: [
      {
        name: 'Viraj Bulugahapitiya',
        role: 'AI Engineer and Data Scientist, At Norvenzia',
        // TODO(founder): upload a headshot; initials render until then.
        photo: '',
        quote: '',
        linkedin: 'https://www.linkedin.com/in/viraj97'
      }
    ]
  },

  mission: {
    statement:
      'To give mid-market companies senior-led procurement and supply chain operations, without the overhead of building that team in-house.'
  },

  roadmap: {
    eyebrow: 'Roadmap',
    headline: 'Where this is headed.',
    body:
      'We publish this so there’s no ambiguity about what you can buy today. Operations and Analytics are live. The rest is direction, not a menu.',
    divisions: [
      {
        name: 'Operations',
        status: 'live',
        scope: 'Procurement, PO management, supplier onboarding, reporting.'
      },
      {
        name: 'Analytics',
        status: 'live',
        scope:
          'Spend analysis, vendor dashboards, inventory and demand planning.'
      },
      {
        name: 'Digital',
        status: 'roadmap',
        scope: 'Process automation and systems integration — Year 2+.'
      },
      {
        name: 'AI',
        status: 'roadmap',
        scope: 'Applied forecasting and document processing — Year 2+.'
      },
      {
        name: 'Advisory',
        status: 'roadmap',
        scope: 'Strategic sourcing and procurement transformation — Year 2+.'
      }
    ]
  },

  closing: {
    headline: 'Let’s talk about your operation.',
    body:
      'A discovery call costs you half an hour and tells us both whether there’s a fit.',
    cta: { label: 'Book a Call', href: '/contact' }
  }
};
