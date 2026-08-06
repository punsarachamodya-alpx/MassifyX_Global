'use strict';

// The editable-field schema. It generates the admin form AND acts as the write
// allow-list: the save handler only ever writes dotted paths declared here, so a
// crafted POST body can't reach anywhere else in the content tree.
//
// Field types: text | textarea | list | paras | select | boolean | image | repeater | url | externalUrl
//
// 'url'/'externalUrl' fields are scheme-validated on save (routes/admin.js's
// collect(), via lib/urlValidation.js) -- anything that isn't a safe link is
// dropped rather than persisted, since these values are later rendered into
// href/iframe src (views/partials/header.ejs, views/contact.ejs, etc).
// 'url': a same-site relative path ("/contact") or an http(s) URL --
// in-site nav/CTA links. 'externalUrl': must be an absolute http(s) URL --
// embeds and social links, where a relative path makes no sense.

const STATUS = [
  { value: 'live', label: 'Live today' },
  { value: 'roadmap', label: 'Roadmap' }
];

const heroFields = [
  { path: 'hero.eyebrow', label: 'Eyebrow', type: 'text' },
  { path: 'hero.headline', label: 'Headline', type: 'text' },
  { path: 'hero.body', label: 'Intro paragraph', type: 'textarea' }
];

const closingFields = [
  { path: 'closing.headline', label: 'Closing headline', type: 'text' },
  { path: 'closing.body', label: 'Closing body', type: 'textarea' },
  { path: 'closing.cta.label', label: 'Closing button label', type: 'text' },
  { path: 'closing.cta.href', label: 'Closing button link', type: 'url' }
];

const metaFields = [
  { path: 'meta.title', label: 'Browser / search title', type: 'text' },
  { path: 'meta.description', label: 'Meta description', type: 'textarea' }
];

const sections = [
  {
    key: 'appearance',
    label: 'Appearance',
    blurb: 'Logo and icon sizes. Applies across the whole site immediately.',
    fields: [
      { path: 'logoHeaderHeight', label: 'Header logo height, in pixels', type: 'text' },
      { path: 'logoFooterHeight', label: 'Footer logo height, in pixels', type: 'text' },
      {
        path: 'industryIconSize',
        label: 'Industry icon size, in pixels (industries page + home strip)',
        type: 'text'
      },
      {
        path: 'eyebrowScale',
        label:
          'Small label size, as a % (100 = default). The uppercase labels above section headings — "Roadmap", "Who we are" — plus the panel and footer column labels.',
        type: 'text'
      },
      {
        path: 'sectionHeadingScale',
        label:
          'Section heading size, as a % (100 = default). The large headlines within a page (and legal page titles) — not the big headline at the very top of the main pages.',
        type: 'text'
      },
      {
        path: 'founderPhotoMaxWidth',
        label:
          'Founder photo maximum width, in pixels (Who We Are). The photo still shrinks on smaller screens; this only caps how large it gets.',
        type: 'text'
      }
    ]
  },

  {
    key: 'nav',
    label: 'Navigation',
    blurb: 'Menu labels, links, and the header/footer call-to-action button.',
    fields: [
      {
        path: 'primary',
        label: 'Primary menu',
        type: 'repeater',
        itemLabel: 'Menu item',
        fields: [
          { path: 'label', label: 'Label', type: 'text' },
          { path: 'href', label: 'Link', type: 'url' }
        ]
      },
      {
        path: 'legal',
        label: 'Footer legal links',
        type: 'repeater',
        itemLabel: 'Link',
        fields: [
          { path: 'label', label: 'Label', type: 'text' },
          { path: 'href', label: 'Link', type: 'url' }
        ]
      },
      { path: 'ctaLabel', label: 'Button label', type: 'text' },
      { path: 'ctaHref', label: 'Button link', type: 'url' }
    ]
  },

  {
    key: 'site',
    label: 'Company details',
    blurb: 'Names, contact details, and the lines that appear in the footer.',
    fields: [
      { path: 'legalEntity', label: 'Legal entity', type: 'text' },
      { path: 'publicName', label: 'Public name', type: 'text' },
      { path: 'tagline', label: 'Tagline', type: 'text' },
      { path: 'description', label: 'Company description', type: 'textarea' },
      { path: 'contactEmail', label: 'Contact email', type: 'text' },
      { path: 'registrationLine', label: 'Registration line (footer)', type: 'text' },
      { path: 'engagementPoint', label: 'Engagement point', type: 'text' },
      { path: 'deliveryHub', label: 'Delivery hub', type: 'text' },
      { path: 'linkedinUrl', label: 'Company LinkedIn URL', type: 'externalUrl' },
      { path: 'baseUrl', label: 'Canonical base URL', type: 'externalUrl' }
    ]
  },

  {
    key: 'home',
    label: 'Home',
    blurb: 'The front page: hero, value props, process, services, and why.',
    fields: [
      ...metaFields,
      ...heroFields,
      { path: 'hero.primaryCta.label', label: 'Primary button label', type: 'text' },
      { path: 'hero.primaryCta.href', label: 'Primary button link', type: 'url' },
      { path: 'hero.secondaryCta.label', label: 'Secondary button label', type: 'text' },
      { path: 'hero.secondaryCta.href', label: 'Secondary button link', type: 'url' },
      {
        path: 'hero.figureImage',
        label: 'Hero diagram (leave empty to keep the built-in animated diagram)',
        type: 'image'
      },
      {
        path: 'motionBand.image',
        label: 'Supply-chain motion band graphic',
        type: 'image'
      },
      {
        path: 'valueProps',
        label: 'Value propositions',
        type: 'repeater',
        itemLabel: 'Value prop',
        fields: [
          { path: 'title', label: 'Title', type: 'text' },
          { path: 'body', label: 'Body', type: 'textarea' }
        ]
      },
      { path: 'process.eyebrow', label: 'Process eyebrow', type: 'text' },
      { path: 'process.headline', label: 'Process headline', type: 'text' },
      {
        path: 'process.steps',
        label: 'Process steps',
        type: 'repeater',
        itemLabel: 'Step',
        fields: [
          { path: 'number', label: 'Number', type: 'text' },
          { path: 'title', label: 'Title', type: 'text' },
          { path: 'body', label: 'Body', type: 'textarea' }
        ]
      },
      { path: 'services.eyebrow', label: 'Services eyebrow', type: 'text' },
      { path: 'services.headline', label: 'Services headline', type: 'text' },
      { path: 'services.body', label: 'Services intro', type: 'textarea' },
      {
        path: 'services.items',
        label: 'Service divisions',
        type: 'repeater',
        itemLabel: 'Division',
        fields: [
          { path: 'name', label: 'Name', type: 'text' },
          { path: 'status', label: 'Status', type: 'select', options: STATUS },
          { path: 'capabilities', label: 'Capabilities (one per line)', type: 'list' }
        ]
      },
      { path: 'industriesStrip.eyebrow', label: 'Industries eyebrow', type: 'text' },
      { path: 'industriesStrip.headline', label: 'Industries headline', type: 'text' },
      { path: 'industriesStrip.body', label: 'Industries intro', type: 'textarea' },
      { path: 'why.eyebrow', label: 'Why eyebrow', type: 'text' },
      { path: 'why.headline', label: 'Why headline', type: 'text' },
      {
        path: 'why.items',
        label: 'Why Norvenzia points',
        type: 'repeater',
        itemLabel: 'Point',
        fields: [
          { path: 'title', label: 'Title', type: 'text' },
          { path: 'body', label: 'Body', type: 'textarea' }
        ]
      },
      { path: 'posture.eyebrow', label: 'Posture eyebrow', type: 'text' },
      { path: 'posture.headline', label: 'Posture headline', type: 'text' },
      { path: 'posture.body', label: 'Posture intro', type: 'textarea' },
      { path: 'posture.inPlaceLabel', label: '"In place" column heading', type: 'text' },
      { path: 'posture.inPlace', label: 'In place today (one per line)', type: 'list' },
      { path: 'posture.roadmapLabel', label: '"Roadmap" column heading', type: 'text' },
      { path: 'posture.roadmap', label: 'Not yet true (one per line)', type: 'list' },
      { path: 'posture.cta.label', label: 'Posture link label', type: 'text' },
      { path: 'posture.cta.href', label: 'Posture link URL', type: 'url' },
      ...closingFields
    ]
  },

  {
    key: 'what-we-do',
    label: 'What We Do',
    blurb: 'Divisions, the product suite, and engagement tiers.',
    fields: [
      ...metaFields,
      ...heroFields,
      {
        path: 'divisions',
        label: 'Divisions',
        type: 'repeater',
        itemLabel: 'Division',
        fields: [
          { path: 'index', label: 'Index', type: 'text' },
          { path: 'name', label: 'Name', type: 'text' },
          { path: 'status', label: 'Status', type: 'select', options: STATUS },
          { path: 'summary', label: 'Summary', type: 'textarea' },
          { path: 'capabilities', label: 'Capabilities (one per line)', type: 'list' }
        ]
      },
      { path: 'products.eyebrow', label: 'Products eyebrow', type: 'text' },
      { path: 'products.headline', label: 'Products headline', type: 'text' },
      { path: 'products.body', label: 'Products intro', type: 'textarea' },
      {
        path: 'products.items',
        label: 'Products',
        type: 'repeater',
        itemLabel: 'Product',
        fields: [
          { path: 'name', label: 'Name', type: 'text' },
          { path: 'status', label: 'Status', type: 'select', options: STATUS },
          { path: 'description', label: 'Description', type: 'textarea' }
        ]
      },
      { path: 'tiers.eyebrow', label: 'Tiers eyebrow', type: 'text' },
      { path: 'tiers.headline', label: 'Tiers headline', type: 'text' },
      { path: 'tiers.body', label: 'Tiers intro', type: 'textarea' },
      {
        path: 'tiers.items',
        label: 'Engagement tiers',
        type: 'repeater',
        itemLabel: 'Tier',
        fields: [
          { path: 'name', label: 'Name', type: 'text' },
          { path: 'summary', label: 'Summary', type: 'textarea' },
          { path: 'includes', label: 'Includes (one per line)', type: 'list' }
        ]
      },
      { path: 'tiers.ctaLabel', label: 'Tier button label', type: 'text' },
      ...closingFields
    ]
  },

  {
    key: 'industries',
    label: 'Industries',
    blurb: 'The eight verticals and the fit criteria.',
    fields: [
      ...metaFields,
      ...heroFields,
      {
        path: 'items',
        label: 'Industries',
        type: 'repeater',
        itemLabel: 'Industry',
        fields: [
          { path: 'slug', label: 'Slug (icon key)', type: 'text' },
          { path: 'name', label: 'Name', type: 'text' },
          { path: 'image', label: 'Card image', type: 'image' },
          {
            path: 'icon',
            label: 'Custom icon (optional, overrides the built-in line icon)',
            type: 'image'
          },
          { path: 'painPoints', label: 'Pain points (one per line)', type: 'list' }
        ]
      },
      { path: 'fit.eyebrow', label: 'Fit eyebrow', type: 'text' },
      { path: 'fit.headline', label: 'Fit headline', type: 'text' },
      { path: 'fit.criteria', label: 'Fit criteria (one per line)', type: 'list' },
      ...closingFields
    ]
  },

  {
    key: 'how-we-work',
    label: 'How We Work',
    blurb: 'The two-location model, methodology, and security posture.',
    fields: [
      ...metaFields,
      ...heroFields,
      { path: 'model.eyebrow', label: 'Model eyebrow', type: 'text' },
      { path: 'model.headline', label: 'Model headline', type: 'text' },
      { path: 'model.body', label: 'Model paragraphs (blank line between)', type: 'paras' },
      {
        path: 'model.panels',
        label: 'Location panels',
        type: 'repeater',
        itemLabel: 'Panel',
        fields: [
          { path: 'label', label: 'Label', type: 'text' },
          { path: 'place', label: 'Place', type: 'text' },
          { path: 'image', label: 'Image', type: 'image' },
          { path: 'body', label: 'Body', type: 'textarea' }
        ]
      },
      { path: 'methodology.eyebrow', label: 'Methodology eyebrow', type: 'text' },
      { path: 'methodology.headline', label: 'Methodology headline', type: 'text' },
      { path: 'methodology.body', label: 'Methodology intro', type: 'textarea' },
      {
        path: 'methodology.stages',
        label: 'Methodology stages',
        type: 'repeater',
        itemLabel: 'Stage',
        fields: [
          { path: 'number', label: 'Number', type: 'text' },
          { path: 'title', label: 'Title', type: 'text' },
          { path: 'body', label: 'Body', type: 'textarea' }
        ]
      },
      { path: 'security.eyebrow', label: 'Security eyebrow', type: 'text' },
      { path: 'security.headline', label: 'Security headline', type: 'text' },
      { path: 'security.body', label: 'Security intro', type: 'textarea' },
      { path: 'security.inPlaceLabel', label: '"In place" column heading', type: 'text' },
      { path: 'security.inPlace', label: 'In place today (one per line)', type: 'list' },
      { path: 'security.roadmapLabel', label: '"Roadmap" column heading', type: 'text' },
      { path: 'security.roadmap', label: 'Not yet true (one per line)', type: 'list' },
      { path: 'faq.eyebrow', label: 'FAQ eyebrow', type: 'text' },
      { path: 'faq.headline', label: 'FAQ headline', type: 'text' },
      {
        path: 'faq.items',
        label: 'Frequently asked questions',
        type: 'repeater',
        itemLabel: 'Question',
        fields: [
          { path: 'question', label: 'Question', type: 'text' },
          { path: 'answer', label: 'Answer', type: 'textarea' }
        ]
      },
      ...closingFields
    ]
  },

  {
    key: 'who-we-are',
    label: 'Who We Are',
    blurb: 'Founder story, team, mission, and the division roadmap.',
    fields: [
      ...metaFields,
      ...heroFields,
      { path: 'founder.eyebrow', label: 'Founder eyebrow', type: 'text' },
      { path: 'founder.headline', label: 'Founder headline', type: 'text' },
      { path: 'founder.name', label: 'Founder name', type: 'text' },
      { path: 'founder.role', label: 'Founder role', type: 'text' },
      { path: 'founder.photo', label: 'Founder headshot', type: 'image' },
      { path: 'founder.linkedin', label: 'Founder LinkedIn URL', type: 'externalUrl' },
      {
        path: 'founder.draftNotice',
        label: 'Draft notice (clear this once the story is rewritten)',
        type: 'text'
      },
      { path: 'founder.story', label: 'Story paragraphs (blank line between)', type: 'paras' },
      { path: 'team.eyebrow', label: 'Team eyebrow', type: 'text' },
      { path: 'team.headline', label: 'Team headline', type: 'text' },
      {
        path: 'team.members',
        label: 'Team members',
        type: 'repeater',
        itemLabel: 'Member',
        fields: [
          { path: 'name', label: 'Name', type: 'text' },
          { path: 'role', label: 'Role', type: 'text' },
          { path: 'photo', label: 'Photo', type: 'image' },
          { path: 'quote', label: 'Quote', type: 'textarea' },
          { path: 'linkedin', label: 'LinkedIn URL', type: 'externalUrl' }
        ]
      },
      { path: 'mission.statement', label: 'Mission statement', type: 'textarea' },
      { path: 'roadmap.eyebrow', label: 'Roadmap eyebrow', type: 'text' },
      { path: 'roadmap.headline', label: 'Roadmap headline', type: 'text' },
      { path: 'roadmap.body', label: 'Roadmap intro', type: 'textarea' },
      {
        path: 'roadmap.divisions',
        label: 'Roadmap divisions',
        type: 'repeater',
        itemLabel: 'Division',
        fields: [
          { path: 'name', label: 'Name', type: 'text' },
          { path: 'status', label: 'Status', type: 'select', options: STATUS },
          { path: 'scope', label: 'Scope', type: 'textarea' }
        ]
      },
      ...closingFields
    ]
  },

  {
    key: 'contact',
    label: 'Contact',
    blurb:
      'Form copy and the booking panel. Notification email delivery is set via SMTP_* environment variables, not here — see .env.example.',
    fields: [
      ...metaFields,
      ...heroFields,
      { path: 'responseCommitment', label: 'Response commitment', type: 'text' },
      { path: 'engagementNote', label: 'Engagement note', type: 'textarea' },
      {
        path: 'bookingEmbedUrl',
        label: 'Booking embed URL (Calendly or equivalent)',
        type: 'externalUrl'
      },
      { path: 'submitLabel', label: 'Submit button label', type: 'text' },
      { path: 'success.headline', label: 'Success headline', type: 'text' },
      { path: 'success.body', label: 'Success body', type: 'textarea' }
    ]
  },

  {
    key: 'legal',
    label: 'Legal',
    blurb:
      'Privacy, Cookies, and Terms. Tick "counsel reviewed" to remove the draft notice from a page.',
    fields: [
      {
        path: 'all',
        label: 'Legal documents',
        type: 'repeater',
        itemLabel: 'Document',
        fields: [
          { path: 'slug', label: 'Slug (URL)', type: 'text' },
          { path: 'title', label: 'Title', type: 'text' },
          { path: 'intro', label: 'Intro', type: 'textarea' },
          { path: 'updated', label: 'Last updated', type: 'text' },
          { path: 'counselReviewed', label: 'Reviewed by counsel', type: 'boolean' },
          {
            path: 'sections',
            label: 'Sections',
            type: 'repeater',
            itemLabel: 'Section',
            fields: [
              { path: 'heading', label: 'Heading', type: 'text' },
              { path: 'body', label: 'Paragraphs (blank line between)', type: 'paras' }
            ]
          }
        ]
      }
    ]
  }
];

function bySectionKey(key) {
  return sections.find((s) => s.key === key);
}

module.exports = { sections, bySectionKey, STATUS };
