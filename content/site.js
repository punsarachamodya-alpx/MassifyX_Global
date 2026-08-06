// Company facts, contact details, base URL.
// TODO(founder): confirm the exact Sweden engagement-point framing and the
// registered-company wording for the footer, and add the LinkedIn company URL.

module.exports = {
  legalEntity: 'Norvenzia (Private) Limited',
  publicName: 'Norvenzia',
  descriptor: 'Procurement & supply chain operations',
  // Retired "Precision. Partnership. Progress." — generic for the first two,
  // over-claiming for the third. "We run the work." is true today and is the
  // actual differentiator.
  tagline: 'We run the work.',
  description:
    'Norvenzia runs procurement and supply chain operations for mid-market companies — an EU engagement point in Sweden with senior-led delivery from Colombo.',
  contactEmail: 'info@norvenzia.com',
  registrationLine: 'Norvenzia (Private) Limited, registered in Sri Lanka.',
  engagementPoint: 'Sweden',
  deliveryHub: 'Colombo, Sri Lanka',
  // TODO(founder): add the Norvenzia LinkedIn company page URL. Left empty so
  // the footer renders no dead link until it's real.
  linkedinUrl: '',
  baseUrl: process.env.BASE_URL || 'https://www.norvenzia.com'
};
