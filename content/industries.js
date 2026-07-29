// Eight verticals. Pain points describe operational patterns we see repeatedly —
// they are not case studies, and no client is named or implied (Brief §11).

module.exports = {
  meta: {
    title: 'Industries We Serve — MassifyX Global',
    description:
      'Eight verticals, one operating model. The procurement and supply chain patterns we are built to take on.'
  },

  hero: {
    eyebrow: 'Industries we serve',
    headline: 'Eight verticals, one operating model.',
    body:
      'These are the operational patterns we see repeatedly in mid-market procurement teams. No named clients — just the problems we’re built to take on.'
  },

  items: [
    {
      slug: 'manufacturing',
      name: 'Manufacturing',
      image: '/img/industries/manufacturing.svg',
      painPoints: [
        'Purchasing spread across plant-level spreadsheets with no consolidated spend view.',
        'Supplier onboarding and RFQ cycles that stretch weeks longer than production schedules allow.',
        'Little visibility into which suppliers drive cost or delivery risk until it’s already late.'
      ]
    },
    {
      slug: 'medical-devices',
      name: 'Medical Devices',
      image: '/img/industries/medical-devices.svg',
      painPoints: [
        'Supplier qualification and documentation overhead that outpaces a lean procurement team.',
        'Component sourcing decisions made without consistent vendor performance tracking.',
        'Compliance-driven traceability requirements that manual PO processes were never built for.'
      ]
    },
    {
      slug: 'renewable-energy',
      name: 'Renewable Energy',
      image: '/img/industries/renewable-energy.svg',
      painPoints: [
        'Fast-scaling procurement volume outpacing the internal team that originally set it up.',
        'Multi-region supplier coordination with inconsistent lead-time visibility.',
        'Project-based sourcing that needs faster RFQ turnaround than current headcount supports.'
      ]
    },
    {
      slug: 'automotive-suppliers',
      name: 'Automotive Suppliers',
      image: '/img/industries/automotive-suppliers.svg',
      painPoints: [
        'Tier-2/3 supplier management stretched thin against OEM delivery windows.',
        'PO and change-order volume that overwhelms a generalist purchasing desk.',
        'Reporting assembled after the fact instead of live KPI visibility for supply continuity.'
      ]
    },
    {
      slug: 'electronics-ems',
      name: 'Electronics / EMS',
      image: '/img/industries/electronics-ems.svg',
      painPoints: [
        'Component sourcing across volatile lead times with no dedicated analyst tracking it.',
        'Supplier onboarding backlog as production lines add new vendors under time pressure.',
        'Spend data locked in ERP exports nobody has time to turn into a usable view.'
      ]
    },
    {
      slug: 'fmcg',
      name: 'FMCG',
      image: '/img/industries/fmcg.svg',
      painPoints: [
        'High SKU count driving procurement admin a lean team can’t keep pace with.',
        'Demand swings that outrun manual replenishment and inventory tracking.',
        'Vendor performance tracked informally, if at all, across a large supplier base.'
      ]
    },
    {
      slug: 'food-production',
      name: 'Food Production',
      image: '/img/industries/food-production.svg',
      painPoints: [
        'Supplier onboarding and documentation cycles competing with seasonal production pressure.',
        'Inventory and demand planning done in spreadsheets as volume outgrows the process.',
        'Procurement reporting that can’t answer where cost or supply risk is concentrated.'
      ]
    },
    {
      slug: 'e-commerce',
      name: 'E-commerce',
      image: '/img/industries/e-commerce.svg',
      painPoints: [
        'Inventory and demand planning that hasn’t kept pace with order volume growth.',
        'Vendor and fulfilment-partner performance with no consolidated dashboard.',
        'Procurement handled reactively between founders and ops leads instead of a dedicated team.'
      ]
    }
  ],

  fit: {
    eyebrow: 'Is this a fit?',
    headline: 'Where MassifyX works best.',
    criteria: [
      'You run 50–500 employees and procurement has outgrown the person who set it up.',
      'You’re based in Scandinavia, the EU, the UK, Switzerland, or Australia.',
      'You have defined, repeatable procurement processes — or want help defining them.',
      'You’d rather buy senior capacity than carry the cost of hiring it in-house.'
    ]
  },

  closing: {
    headline: 'Don’t see your industry?',
    body:
      'If your operation runs on procurement and supply chain, we’d still like to hear from you.',
    cta: { label: 'Book a Discovery Call', href: '/contact' }
  }
};
