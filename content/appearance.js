// Site-wide sizing knobs, editable from /admin/edit/appearance. Values are pixel
// numbers stored as strings from the admin form; views parse them with a fallback
// to these same defaults, so a blank or corrupted value can never break layout.

// The logo SVGs (public/brand/norvenzia-logo-*.svg) are tightly cropped to the
// artwork, so these numbers are the height of the visible wordmark itself.
module.exports = {
  logoHeaderHeight: '90',
  logoFooterHeight: '83',
  industryIconSize: '44',

  // Text sizes are percentages, not pixels, for two reasons: the type scale is
  // responsive (section headings are a clamp() that grows with the viewport) and
  // a fixed px value would flatten that, and rem-based sizes respect a visitor's
  // browser font-size setting where px would override it. 100 = as designed.
  eyebrowScale: '170',
  sectionHeadingScale: '100',

  // A maximum, not a fixed width: the portrait still shrinks with the viewport,
  // it just stops growing past this. The default matches its natural width at a
  // 1440px viewport, so anything at or below that is unchanged — this only reins
  // in very wide monitors, where the column was reaching ~700px.
  founderPhotoMaxWidth: '520'
};
