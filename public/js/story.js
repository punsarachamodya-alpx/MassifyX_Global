/* Sweden Trade Intelligence scrollytelling page.
   Reads the same pre-baked dataset the server rendered the readable,
   no-JS version of the page from (see the #story-data JSON island in
   views/story.ejs) and drives a sticky D3 chart as the reader scrolls past
   each .story__step, using public/js/story-engine.js as the scroll stepper.
   Every beat this file can render is conditional on the step actually
   existing in the DOM -- views/story.ejs only emits a step when its backing
   array in sweden-trade.json is non-empty, so an empty/pending array (see
   meta.pending) here just means fewer scenes get wired up, never a broken
   or blank sticky panel. Nothing here invents a number: every value comes
   straight out of the JSON island. */
(function () {
  'use strict';

  if (typeof d3 === 'undefined') return;

  var dataEl = document.getElementById('story-data');
  var stickyEl = document.getElementById('storySticky');
  var statEl = document.getElementById('storyStat');
  var annotationEl = document.getElementById('storyAnnotation');
  var captionEl = document.getElementById('storyCaption');
  var svgEl = document.getElementById('storyGraphic');
  var steps = document.querySelectorAll('.story__step');

  if (!dataEl || !stickyEl || !svgEl || !steps.length) return;

  var trade;
  try {
    trade = JSON.parse(dataEl.textContent || 'null');
  } catch (e) {
    trade = null;
  }
  if (!trade) return;

  var reducedMotion =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var svg = d3.select(svgEl);

  // ------------------------------------------------------------ formatting
  // Mirrors the formatSek/formatPct helpers in views/story.ejs -- the two
  // runtimes (server-rendered prose, client-rendered chart labels) format
  // independently, but from the same source numbers and the same rules.

  function formatSek(thousandsSek) {
    if (typeof thousandsSek !== 'number' || !isFinite(thousandsSek)) return '—';
    var sek = thousandsSek * 1000;
    var abs = Math.abs(sek);
    var sign = sek < 0 ? '-' : '';
    if (abs >= 1e12) return sign + 'SEK ' + (abs / 1e12).toFixed(2) + 'tn';
    if (abs >= 1e9) return sign + 'SEK ' + (abs / 1e9).toFixed(1) + 'bn';
    if (abs >= 1e6) return sign + 'SEK ' + (abs / 1e6).toFixed(1) + 'm';
    return sign + 'SEK ' + Math.round(abs).toLocaleString('en-US');
  }

  function formatPct(fraction, digits) {
    if (typeof fraction !== 'number' || !isFinite(fraction)) return '—';
    return (fraction * 100).toFixed(digits == null ? 1 : digits) + '%';
  }

  function setStat(text) {
    statEl.textContent = text || '';
  }

  function setAnnotation(text) {
    annotationEl.textContent = text || '';
  }

  function setCaption(text) {
    captionEl.textContent = text || '';
  }

  // ------------------------------------------------------------- bar chart

  var BAR_WIDTH = 640;
  var BAR_MARGIN = { top: 8, right: 64, bottom: 8, left: 148 };
  var BAR_HEIGHT = 26;
  var BAR_GAP = 12;

  function renderBars(items) {
    var innerWidth = BAR_WIDTH - BAR_MARGIN.left - BAR_MARGIN.right;
    var innerHeight = items.length * (BAR_HEIGHT + BAR_GAP) - BAR_GAP;
    var duration = reducedMotion ? 0 : 650;

    var maxValue = d3.max(items, function (d) { return d.value; }) || 1;
    var x = d3.scaleLinear().domain([0, maxValue]).range([0, innerWidth]);

    svg.attr('viewBox', '0 0 ' + BAR_WIDTH + ' ' + (innerHeight + BAR_MARGIN.top + BAR_MARGIN.bottom));

    var g = svg
      .selectAll('g.story-chart')
      .data([null])
      .join('g')
      .attr('class', 'story-chart')
      .attr('transform', 'translate(' + BAR_MARGIN.left + ',' + BAR_MARGIN.top + ')');

    // renderBars/renderLines share this one <g> across scene changes (that's
    // what makes bar-to-bar scenes morph smoothly by label key) -- but a
    // scene switching chart *type* (e.g. a bars scene after a line scene)
    // must explicitly drop the other type's elements, since they don't share
    // a join key and would otherwise just sit there forever, stacked behind
    // the new chart.
    g.selectAll('path.story-line, g.story-x-axis, line.story-zero-line').remove();

    // A fast scroll can fire several scenes before a previous exit's fade
    // finishes -- interrupt any in-flight transitions so this call always
    // starts from the true current DOM state, not a mid-fade snapshot left
    // by a superseded call (that mismatch is what let an old scene's bars
    // and a new scene's bars/axis end up on screen at the same time).
    g.selectAll('g.story-bar-row').interrupt();

    var rows = g.selectAll('g.story-bar-row').data(items, function (d) { return d.label; });

    // Exit is immediate, not faded -- an animated exit is exactly the
    // multi-hundred-ms window where a superseding scene change (above) would
    // otherwise have to reconcile with still-present old rows.
    rows.exit().remove();

    var rowsEnter = rows
      .enter()
      .append('g')
      .attr('class', 'story-bar-row')
      .style('opacity', 0)
      .attr('transform', function (d, i) { return 'translate(0,' + i * (BAR_HEIGHT + BAR_GAP) + ')'; });

    rowsEnter
      .append('text')
      .attr('class', 'story-axis-label')
      .attr('x', -10)
      .attr('y', BAR_HEIGHT / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'end');

    rowsEnter.append('rect').attr('class', 'story-bar').attr('height', BAR_HEIGHT).attr('x', 0).attr('width', 0);

    rowsEnter
      .append('text')
      .attr('class', 'story-value-label')
      .attr('y', BAR_HEIGHT / 2)
      .attr('dy', '0.35em')
      .attr('x', 6);

    var rowsMerge = rowsEnter.merge(rows);

    rowsMerge
      .transition()
      .duration(duration)
      .style('opacity', 1)
      .attr('transform', function (d, i) { return 'translate(0,' + i * (BAR_HEIGHT + BAR_GAP) + ')'; });

    rowsMerge.select('text.story-axis-label').text(function (d) { return d.label; });

    rowsMerge
      .select('rect.story-bar')
      .attr('class', function (d) { return 'story-bar' + (d.highlight ? ' story-bar--highlight' : ''); })
      .transition()
      .duration(duration)
      .attr('width', function (d) { return Math.max(2, x(d.value)); });

    rowsMerge
      .select('text.story-value-label')
      .text(function (d) { return d.valueLabel; })
      .transition()
      .duration(duration)
      .attr('x', function (d) { return Math.max(2, x(d.value)) + 8; });
  }

  // ------------------------------------------------------------ line chart

  var LINE_WIDTH = 640;
  var LINE_MARGIN = { top: 16, right: 24, bottom: 28, left: 56 };
  var LINE_HEIGHT = 260;

  function renderLines(series) {
    var innerWidth = LINE_WIDTH - LINE_MARGIN.left - LINE_MARGIN.right;
    var innerHeight = LINE_HEIGHT;
    var duration = reducedMotion ? 0 : 650;

    var allPoints = [];
    series.forEach(function (s) { allPoints = allPoints.concat(s.points); });
    var xExtent = d3.extent(allPoints, function (d) { return d.x; });
    var yExtent = d3.extent(allPoints, function (d) { return d.y; });
    var yMin = Math.min(0, yExtent[0] == null ? 0 : yExtent[0]);
    var yMax = Math.max(0, yExtent[1] == null ? 0 : yExtent[1]);

    var x = d3.scaleLinear().domain(xExtent).range([0, innerWidth]);
    var y = d3.scaleLinear().domain([yMin, yMax]).nice().range([innerHeight, 0]);

    svg.attr('viewBox', '0 0 ' + LINE_WIDTH + ' ' + (innerHeight + LINE_MARGIN.top + LINE_MARGIN.bottom));

    var g = svg
      .selectAll('g.story-chart')
      .data([null])
      .join('g')
      .attr('class', 'story-chart')
      .attr('transform', 'translate(' + LINE_MARGIN.left + ',' + LINE_MARGIN.top + ')');

    // Symmetric cleanup to renderBars above -- drop any bar-chart rows left
    // over from a previous bars scene before drawing the line chart.
    g.selectAll('g.story-bar-row').remove();

    // Same rapid-scene-change safety as renderBars: force-complete any
    // transition still in flight from a superseded call before rebinding.
    g.selectAll('path.story-line').interrupt();

    var xAxis = d3.axisBottom(x).ticks(6).tickFormat(d3.format('d'));
    var xAxisG = g
      .selectAll('g.story-x-axis')
      .data([null])
      .join('g')
      .attr('class', 'story-x-axis story-axis-label')
      .attr('transform', 'translate(0,' + innerHeight + ')');
    xAxisG.transition().duration(duration).call(xAxis);

    var zeroLine = g
      .selectAll('line.story-zero-line')
      .data([null])
      .join('line')
      .attr('class', 'story-zero-line')
      .attr('x1', 0)
      .attr('x2', innerWidth);
    zeroLine.transition().duration(duration).attr('y1', y(0)).attr('y2', y(0));

    var lineGen = d3
      .line()
      .x(function (d) { return x(d.x); })
      .y(function (d) { return y(d.y); });

    var lines = g.selectAll('path.story-line').data(series, function (d) { return d.name; });
    lines.exit().remove();

    var linesEnter = lines
      .enter()
      .append('path')
      .attr('class', function (d) { return 'story-line ' + d.className; })
      .attr('d', function (d) { return lineGen(d.points); });

    linesEnter
      .merge(lines)
      .transition()
      .duration(duration)
      .attr('d', function (d) { return lineGen(d.points); });
  }

  // ------------------------------------------------------------------ data

  var hero = trade.hero || {};
  var topGoods = Array.isArray(trade.topGoodsCategories) ? trade.topGoodsCategories : [];
  var topPartners = Array.isArray(trade.topPartners) ? trade.topPartners : [];
  var concentration = trade.concentration || {};
  var balance = trade.balance || {};
  var trend = trade.trend || {};

  // -------------------------------------------------------------- scenes

  var scenes = {
    hook: function () {
      var isSurplus = typeof hero.tradeBalanceSek === 'number' && hero.tradeBalanceSek >= 0;
      renderBars([
        { label: 'Imports', value: hero.totalImportsSek || 0, valueLabel: formatSek(hero.totalImportsSek), highlight: !isSurplus },
        { label: 'Exports', value: hero.totalExportsSek || 0, valueLabel: formatSek(hero.totalExportsSek), highlight: isSurplus }
      ]);
      setStat(formatSek(hero.totalImportsSek));
      setAnnotation(
        (isSurplus ? 'Trade surplus of ' : 'Trade deficit of ') + formatSek(Math.abs(hero.tradeBalanceSek)) + ' in ' + hero.year + '.'
      );
      setCaption('Source: SCB, ' + hero.year + ' total goods trade');
      svgEl.setAttribute('aria-label', 'Bar chart comparing total Swedish imports and exports for ' + hero.year);
    },

    goods: function () {
      if (!topGoods.length) return;
      var top10 = topGoods.slice(0, 10);
      renderBars(
        top10.map(function (g, i) {
          return { label: g.label, value: g.importValueSek, valueLabel: formatSek(g.importValueSek), highlight: i === 0 };
        })
      );
      setStat(formatPct(top10[0].share));
      setAnnotation(top10[0].label + ' is Sweden’s largest import category, ' + formatPct(top10[0].share) + ' of the total.');
      setCaption('Source: SCB, top ' + top10.length + ' import categories by value, ' + hero.year);
      svgEl.setAttribute('aria-label', 'Bar chart ranking Sweden’s top import goods categories by value');
    },

    partners: function () {
      if (!topPartners.length) return;
      var top10 = topPartners.slice(0, 10);
      renderBars(
        top10.map(function (p, i) {
          return { label: p.label, value: p.importValueSek, valueLabel: formatSek(p.importValueSek), highlight: i === 0 };
        })
      );
      setStat(formatPct(top10[0].share));
      setAnnotation(top10[0].label + ' alone supplies ' + formatPct(top10[0].share) + ' of everything Sweden imports.');
      setCaption('Source: SCB, top ' + top10.length + ' import partners by value, ' + hero.year);
      svgEl.setAttribute('aria-label', 'Bar chart ranking Sweden’s top import trading partners by value');
    },

    concentration: function () {
      if (typeof concentration.top5PartnerImportShare !== 'number') return;
      var rest = Math.max(0, 1 - concentration.top5PartnerImportShare);
      renderBars([
        { label: 'Top 5 partners', value: concentration.top5PartnerImportShare, valueLabel: formatPct(concentration.top5PartnerImportShare), highlight: true },
        { label: 'Everyone else', value: rest, valueLabel: formatPct(rest), highlight: false }
      ]);
      setStat(formatPct(concentration.top5PartnerImportShare));
      var hhiNote = typeof concentration.hhiPartners === 'number' ? ' HHI ' + Math.round(concentration.hhiPartners) + '.' : '';
      setAnnotation('5 countries account for ' + formatPct(concentration.top5PartnerImportShare) + ' of Swedish imports.' + hhiNote);
      setCaption('Source: SCB, import-value share by partner, ' + hero.year);
      svgEl.setAttribute('aria-label', 'Bar chart showing the share of Swedish imports held by the top 5 trading partners versus all others');
    },

    balance: function () {
      if (!Array.isArray(balance.years) || !balance.years.length) return;
      var points = function (arr) {
        return balance.years.map(function (year, i) { return { x: year, y: (arr && arr[i]) || 0 }; });
      };
      renderLines([
        { name: 'imports', className: 'story-line--imports', points: points(balance.importsSek) },
        { name: 'exports', className: 'story-line--exports', points: points(balance.exportsSek) }
      ]);
      var lastIndex = balance.years.length - 1;
      var lastBalance = Array.isArray(balance.balanceSek) ? balance.balanceSek[lastIndex] : null;
      setStat(formatSek(lastBalance));
      setAnnotation(
        'Imports (grey) vs. exports (cyan), ' + balance.years[0] + '–' + balance.years[lastIndex] + '. ' +
          (typeof lastBalance === 'number' && lastBalance >= 0 ? 'Latest year: surplus.' : 'Latest year: deficit.')
      );
      setCaption('Source: SCB, annual trade balance');
      svgEl.setAttribute('aria-label', 'Line chart of Swedish imports and exports over time');
    },

    trend: function () {
      if (!Array.isArray(trend.years) || !trend.years.length) return;
      var points = function (arr) {
        return trend.years.map(function (year, i) { return { x: year, y: (arr && arr[i]) || 0 }; });
      };
      renderLines([
        { name: 'importGrowth', className: 'story-line--imports', points: points(trend.importGrowthPct) },
        { name: 'exportGrowth', className: 'story-line--exports', points: points(trend.exportGrowthPct) }
      ]);
      var lastIndex = trend.years.length - 1;
      var lastImportGrowth = Array.isArray(trend.importGrowthPct) ? trend.importGrowthPct[lastIndex] : null;
      setStat(typeof lastImportGrowth === 'number' ? (lastImportGrowth >= 0 ? '+' : '') + lastImportGrowth.toFixed(1) + '%' : '—');
      setAnnotation('Year-over-year change in imports (grey) vs. exports (cyan), ' + trend.years[0] + '–' + trend.years[lastIndex] + '.');
      setCaption('Source: SCB, YoY % change');
      svgEl.setAttribute('aria-label', 'Line chart of year-over-year percentage change in Swedish imports and exports');
    },

    sowhat: function () {
      // Closing beat: recap the concentration picture (or the partner
      // ranking if concentration data isn't available) as the evidence
      // behind the pitch, rather than introducing a new visual.
      if (typeof concentration.top5PartnerImportShare === 'number') {
        scenes.concentration();
      } else if (topPartners.length) {
        scenes.partners();
      } else {
        scenes.hook();
      }
      setAnnotation('This is the exact class of analysis Norvenzia runs continuously for one company’s supplier base.');
    }
  };

  // -------------------------------------------------------------- wiring

  function activateStep(step) {
    for (var i = 0; i < steps.length; i++) steps[i].classList.remove('is-active');
    step.classList.add('is-active');
    var scene = scenes[step.getAttribute('data-scene')];
    if (scene) scene();
  }

  // The engine evaluates the geometrically-closest step and fires
  // onStepEnter for it synchronously during init() -- correct even if the
  // page loads mid-scroll (e.g. browser back/forward restoring scroll
  // position), so no separate "activate the first step" call is needed here.
  window.MXScrollyEngine.init({
    steps: steps,
    onStepEnter: function (step) { activateStep(step); }
  });
})();
