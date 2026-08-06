// Phase-1 navigation only. Insights/blog and Careers are Phase 2 (Brief §11) and
// are absent by design until there is a real content pipeline or active hiring.

module.exports = {
  primary: [
    { label: 'What We Do', href: '/what-we-do' },
    { label: 'Industries We Serve', href: '/industries' },
    { label: 'How We Work', href: '/how-we-work' },
    { label: 'Who We Are', href: '/who-we-are' },
    { label: 'Intelligence', href: '/live' },
    { label: 'Contact', href: '/contact' }
  ],
  legal: [
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Cookie Policy', href: '/cookies' },
    { label: 'Terms of Use', href: '/terms' }
  ],
  // CTA label throughout the site (Brief §9). Lands on the contact form, which
  // sets the right expectation until a real calendar link is wired up
  // (contact.bookingEmbedUrl is still empty).
  ctaLabel: 'Book a Call',
  ctaHref: '/contact'
};
