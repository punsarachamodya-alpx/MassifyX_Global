module.exports = {
  meta: {
    title: 'Contact — MassifyX Global',
    description:
      'Book a discovery call. Tell us what your procurement operation looks like today and we’ll come back with an honest read on whether we can help.'
  },

  hero: {
    eyebrow: 'Contact',
    headline: 'Book a discovery call.',
    body:
      'Tell us what your procurement operation looks like today. We’ll come back with an honest read on whether we can help — and if we can’t, we’ll say so.'
  },

  responseCommitment: 'We respond within one business day.',
  engagementNote:
    'Your point of contact is based in Sweden — inside the EU, working in your business hours.',

  // TODO(founder): add a Calendly (or equivalent) embed URL. While empty, the
  // booking panel is omitted entirely rather than showing a placeholder.
  bookingEmbedUrl: '',

  fields: [
    { name: 'name', label: 'Name', type: 'text', required: true, autocomplete: 'name' },
    {
      name: 'company',
      label: 'Company',
      type: 'text',
      required: true,
      autocomplete: 'organization'
    },
    {
      name: 'email',
      label: 'Work email',
      type: 'email',
      required: true,
      autocomplete: 'email'
    },
    {
      name: 'country',
      label: 'Country',
      type: 'text',
      required: true,
      autocomplete: 'country-name'
    },
    {
      name: 'message',
      label: 'What would you like help with?',
      type: 'textarea',
      required: false
    }
  ],

  submitLabel: 'Send message',

  success: {
    headline: 'Thanks — your message is in.',
    body: 'We respond within one business day, usually sooner.'
  }
};
