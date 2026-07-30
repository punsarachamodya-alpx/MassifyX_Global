// Phase-1 navigation only. Insights/blog and Careers are Phase 2 (Brief §11) and
// are absent by design until there is a real content pipeline or active hiring.

module.exports = {
  primary: [
    { label: 'What We Do', href: '/what-we-do' },
    { label: 'Industries We Serve', href: '/industries' },
    { label: 'How We Work', href: '/how-we-work' },
    { label: 'Who We Are', href: '/who-we-are' },
    { label: 'Contact', href: '/contact' }
  ],
  legal: [
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Cookie Policy', href: '/cookies' },
    { label: 'Terms of Use', href: '/terms' }
  ],
  // Deliberately not "Book a Call": the top-nav shortcut would promise instant
  // scheduling that isn't wired up yet (contact.bookingEmbedUrl is still empty).
  // Page CTAs keep "Book a Discovery Call" — those land on the form, which sets
  // the right expectation. Switch this back once a real calendar link is live.
  ctaLabel: 'Get in Touch',
  ctaHref: '/contact'
};
