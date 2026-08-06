// Three legal documents, one template. Each carries counselReviewed: false by default,
// which renders a visible "Draft — pending legal review" notice on the live page.
// TODO(founder): have counsel review all three, then set counselReviewed: true.

const privacy = {
  slug: 'privacy',
  title: 'Privacy Policy',
  intro:
    'This policy explains what personal data Norvenzia handles when you use this website or contact us, why we handle it, and what rights you have over it.',
  updated: 'July 2026',
  counselReviewed: false,
  sections: [
    {
      heading: 'Who we are',
      body: [
        'Norvenzia (Private) Limited runs procurement and supply chain operations for mid-market companies. Our engagement point for European clients is based in Sweden; delivery is carried out from Sri Lanka.',
        'For any question about this policy, or about data we hold, write to info@norvenzia.com.'
      ]
    },
    {
      heading: 'What data we collect',
      body: [
        'From this website, we collect only what you type into the contact form: your name, company, work email, country, and whatever you choose to write in the free-text field.',
        'Our web server keeps standard request logs, which include IP addresses, for security and diagnostic purposes. We do not build profiles from them.',
        'We do not use tracking pixels, advertising cookies, or third-party analytics on this site.'
      ]
    },
    {
      heading: 'Why we collect it',
      body: [
        'To respond to your enquiry, assess whether our service is a fit for your operation, and — if it is — to scope and deliver an engagement.',
        'We do not sell personal data, and we do not use contact-form submissions for unrelated marketing.'
      ]
    },
    {
      heading: 'Legal basis',
      body: [
        'Where the GDPR applies, we rely on legitimate interests for responding to a business enquiry you initiated, and on the necessity of processing to take steps at your request prior to entering a contract.',
        'Strictly necessary cookies are set on the basis of that necessity. Anything non-essential would require your consent first — see our Cookie Policy.'
      ]
    },
    {
      heading: 'Where your data is handled',
      body: [
        'Enquiry data reaches our engagement point in Sweden and, where relevant to scoping or delivering your engagement, our delivery team in Sri Lanka.',
        'Sri Lanka is not covered by a European Commission adequacy decision. Where personal data is transferred there, we rely on appropriate safeguards, including contractual confidentiality terms and access limited to the analysts assigned to your account. A Data Processing Agreement is available on request.'
      ]
    },
    {
      heading: 'How long we keep it',
      body: [
        'Enquiries that do not lead to an engagement are kept for up to 24 months, so we can pick up a conversation you may resume, and are then deleted.',
        'Where an engagement begins, data is retained for the life of the contract and for the period required by applicable statutory and tax obligations afterwards.'
      ]
    },
    {
      heading: 'Your rights',
      body: [
        'Subject to applicable law, you may request access to the personal data we hold about you, ask us to correct or delete it, object to or restrict our processing, and request a portable copy.',
        'To exercise any of these, email info@norvenzia.com. If you are in the EU or EEA and believe we have handled your data improperly, you also have the right to lodge a complaint with your national supervisory authority.'
      ]
    },
    {
      heading: 'Contact',
      body: [
        'Questions about this policy, or about data we hold: info@norvenzia.com.'
      ]
    }
  ]
};

const cookies = {
  slug: 'cookies',
  title: 'Cookie Policy',
  intro:
    'This site uses as few cookies as it can. This policy sets out exactly which ones, and what you can do about them.',
  updated: 'July 2026',
  counselReviewed: false,
  sections: [
    {
      heading: 'Strictly necessary cookies',
      body: [
        'We store your cookie choice itself, so the banner does not reappear on every page you visit.',
        'If you sign in to the site’s administration panel, a session cookie keeps you signed in. It is set only after a successful login, is HTTP-only, and expires after eight hours.',
        'These cookies are required for the site to work as intended and cannot be switched off from within the site.'
      ]
    },
    {
      heading: 'Analytics cookies',
      body: [
        'No analytics tool is currently connected to this site. Nothing is measuring your visit.',
        'The consent gate is built and in place so that if we do add a privacy-first, cookieless analytics tool later, it will sit behind your explicit choice rather than being switched on quietly.'
      ]
    },
    {
      heading: 'What we do not use',
      body: [
        'No advertising or retargeting cookies. No social media tracking pixels. No cross-site profiling. No third-party font or script CDNs — our fonts are served from this domain precisely so that visiting this page does not disclose your IP address to a third party.'
      ]
    },
    {
      heading: 'Managing your preference',
      body: [
        'You can accept or reject non-essential cookies from the banner shown on your first visit, and reopen that choice at any time using the "Cookie preferences" link in the footer.',
        'You can also clear or block cookies in your browser settings. The site remains fully functional if you do.'
      ]
    }
  ]
};

const terms = {
  slug: 'terms',
  title: 'Terms of Use',
  intro:
    'These terms govern your use of this website. They do not govern any engagement between Norvenzia and a client — that is covered by a separate signed agreement.',
  updated: 'July 2026',
  counselReviewed: false,
  sections: [
    {
      heading: 'Acceptance of terms',
      body: [
        'By using this website you accept these terms. If you do not accept them, please do not use the site.'
      ]
    },
    {
      heading: 'Use of the site',
      body: [
        'You may use this site for lawful purposes: to learn about our services and to contact us. You may not attempt to gain unauthorised access to any part of the site, interfere with its operation, or use automated means to submit the contact form.'
      ]
    },
    {
      heading: 'No binding offer',
      body: [
        'Nothing on this site is an offer capable of acceptance, a quotation, or a commitment to provide services. Service descriptions, engagement tiers, and roadmap items are indicative.',
        'Items labelled "Roadmap" describe intended direction and are explicitly not available to purchase today. Only work described in a signed engagement agreement is binding on us.'
      ]
    },
    {
      heading: 'Intellectual property',
      body: [
        'The Norvenzia name, logo, site design, and written content are our property or used with permission, and may not be reproduced without written consent.'
      ]
    },
    {
      heading: 'Limitation of liability',
      body: [
        'This site is provided as-is. To the fullest extent permitted by law, we exclude liability for any loss arising from reliance on information published here. Nothing in these terms limits liability that cannot lawfully be limited.'
      ]
    },
    {
      heading: 'Governing law',
      body: [
        // TODO(founder): confirm the governing-law jurisdiction with counsel before publishing.
        'The governing law and jurisdiction for these terms are being confirmed and will be stated here before publication.'
      ]
    },
    {
      heading: 'Contact',
      body: ['Questions about these terms: info@norvenzia.com.']
    }
  ]
};

module.exports = {
  all: [privacy, cookies, terms],
  privacy,
  cookies,
  terms
};
