/* Marks the document as JavaScript-capable before first paint.
   Loaded synchronously in <head> (external, not inline, so script-src 'self' holds).
   Only when this runs does CSS hide .reveal elements — so with JS disabled the
   content is simply visible, never stuck at opacity 0. */
document.documentElement.className += ' js';
