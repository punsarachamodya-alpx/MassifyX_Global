/* Self-hosted scrollytelling stepper (the pattern libraries like Scrollama
   implement), no dependencies, no CDN. Watches a list of "step" elements and
   fires a callback once each becomes the one the reader is currently
   reading. Nothing here is Sweden-trade-specific: public/js/story.js
   supplies the data and the D3 rendering, this file only knows about scroll
   position.

   Deliberately geometric (closest step to the viewport's vertical center),
   recomputed on every scroll/resize, rather than a narrow-band
   IntersectionObserver that only reacts to threshold-crossing events: a
   fast wheel-flick or a large programmatic scroll can move the viewport far
   enough in one frame that a thin trigger band is skipped over entirely
   without ever reporting an intersection, leaving the sticky graphic stuck
   one scene behind the text the reader is actually looking at. Recomputing
   the closest step from scratch each time is correct regardless of scroll
   speed, and cheap enough (a handful of steps, each just a
   getBoundingClientRect() call) that it doesn't need IntersectionObserver's
   efficiency trade-offs. */
(function (global) {
  'use strict';

  function init(options) {
    var steps = Array.prototype.slice.call((options && options.steps) || []);
    var onStepEnter = typeof (options && options.onStepEnter) === 'function' ? options.onStepEnter : function () {};
    var activeIndex = -1;
    var ticking = false;

    if (!steps.length) {
      return { destroy: function () {} };
    }

    function closestStepIndex() {
      var viewportCenter = window.innerHeight / 2;
      var bestIndex = 0;
      var bestDistance = Infinity;
      for (var i = 0; i < steps.length; i++) {
        var rect = steps[i].getBoundingClientRect();
        var stepCenter = rect.top + rect.height / 2;
        var distance = Math.abs(stepCenter - viewportCenter);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestIndex = i;
        }
      }
      return bestIndex;
    }

    function evaluate() {
      ticking = false;
      var index = closestStepIndex();
      if (index === activeIndex) return;
      activeIndex = index;
      onStepEnter(steps[index], index);
    }

    function requestEvaluate() {
      if (ticking) return;
      ticking = true;
      (global.requestAnimationFrame || function (fn) { global.setTimeout(fn, 16); })(evaluate);
    }

    global.addEventListener('scroll', requestEvaluate, { passive: true });
    global.addEventListener('resize', requestEvaluate);

    // Establish the correct initial scene immediately (e.g. a deep link or
    // a reload that lands mid-page), not just on the first scroll event.
    evaluate();

    return {
      destroy: function () {
        global.removeEventListener('scroll', requestEvaluate);
        global.removeEventListener('resize', requestEvaluate);
      }
    };
  }

  global.MXScrollyEngine = { init: init };
})(window);
