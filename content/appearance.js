// Site-wide sizing knobs, editable from /admin/edit/appearance. Values are pixel
// numbers stored as strings from the admin form; views parse them with a fallback
// to these same defaults, so a blank or corrupted value can never break layout.

// The lockup PNGs are trimmed to the artwork, so these numbers are the height of
// the visible wordmark itself. (They previously sat on a canvas that was ~68%
// transparent padding, so a "68px" logo rendered as a ~22px wordmark.)
module.exports = {
  logoHeaderHeight: '44',
  logoFooterHeight: '40',
  industryIconSize: '44'
};
