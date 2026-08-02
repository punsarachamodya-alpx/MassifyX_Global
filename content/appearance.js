// Site-wide sizing knobs, editable from /admin/edit/appearance. Values are pixel
// numbers stored as strings from the admin form; views parse them with a fallback
// to these same defaults, so a blank or corrupted value can never break layout.

// The lockup PNGs are trimmed to the artwork, so these numbers are the height of
// the visible wordmark itself. (They previously sat on a canvas that was ~68%
// transparent padding, so a "68px" logo rendered as a ~22px wordmark.)
module.exports = {
  logoHeaderHeight: '112',
  logoFooterHeight: '104',
  industryIconSize: '44',

  // Text sizes are percentages, not pixels, for two reasons: the type scale is
  // responsive (section headings are a clamp() that grows with the viewport) and
  // a fixed px value would flatten that, and rem-based sizes respect a visitor's
  // browser font-size setting where px would override it. 100 = as designed.
  eyebrowScale: '100',
  sectionHeadingScale: '100',

  // A maximum, not a fixed width: the portrait still shrinks with the viewport,
  // it just stops growing past this. The default matches its natural width at a
  // 1440px viewport, so anything at or below that is unchanged — this only reins
  // in very wide monitors, where the column was reaching ~700px.
  founderPhotoMaxWidth: '520'
};
