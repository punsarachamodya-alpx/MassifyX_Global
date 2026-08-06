/* War Room "Investigate" action for /live's event popup
   (docs/internal/WARROOM_BUILD_PLAN.md, WARROOM_API_CONTRACT.md).

   Self-contained: exposes window.NorvenziaWarroom.buildSection(props), which
   public/js/live.js calls to append a section to the popup it already
   builds -- this file never touches the map itself. Every request goes to
   the site's own same-origin proxy routes (/live/unlock, /live/investigate,
   /live/investigate/:jobId); War Room's real address is never known here,
   same doctrine as MIS in live.js.

   Gating: the initial locked/unlocked state comes from the server-rendered
   #live-warroom-state JSON island (session-scoped). Unlocking flips a local
   flag immediately so the popup updates without a page reload; the actual
   session flag lives server-side and survives reloads on its own.

   Every affected/unaffected item is dropped rather than rendered if it has
   no resolvable, safely-linkable source citation -- "no claim without a
   source" is a hard rule from the API contract, not a nice-to-have. */
(function () {
  'use strict';

  var POLL_INTERVAL_MS = 4000;
  var CONFIDENCE_VALUES = ['high', 'medium', 'low'];
  var URGENCY_VALUES = ['high', 'medium', 'low'];

  // result.impactLevel is new (backend guarantees a fallback even for old
  // jobs, but a response captured before that landed simply won't have it)
  // -- any level not in this map is treated as "no badge" rather than
  // guessed at. Icon glyphs are plain characters (not emoji), matching the
  // rest of this file's no-innerHTML, textContent-only rendering.
  var IMPACT_LEVEL_META = {
    none: { modifier: 'none', label: 'No impact found', icon: '✓' },
    low: { modifier: 'low', label: 'Low impact', icon: '•' },
    moderate: { modifier: 'moderate', label: 'Moderate impact', icon: '!' },
    severe: { modifier: 'severe', label: 'Severe impact', icon: '!!' }
  };

  // The four "affected" categories the at-a-glance strip summarizes.
  // "Unaffected alternatives" is deliberately not part of this list -- it's
  // reassuring context, not an impact signal, so it stays as its own
  // always-open table below rather than gated behind the strip.
  var IMPACT_STRIP_CATEGORIES = [
    { field: 'affectedSuppliers', tag: 'SUP', label: 'Suppliers', tableLabel: 'Affected suppliers' },
    { field: 'affectedPorts', tag: 'PRT', label: 'Ports', tableLabel: 'Affected ports' },
    { field: 'affectedShippingLines', tag: 'SHL', label: 'Shipping lines', tableLabel: 'Affected shipping lines' },
    { field: 'affectedManufacturers', tag: 'MFG', label: 'Manufacturers', tableLabel: 'Affected manufacturers' }
  ];

  var SOURCE_TYPE_LABELS = {
    news: 'news',
    blog: 'blog',
    local_media: 'local media',
    port_authority: 'port authority',
    government: 'government',
    social: 'social',
    other: 'other'
  };

  var impactStripIdCounter = 0;

  function parseJsonIsland(id) {
    var el = document.getElementById(id);
    try {
      return JSON.parse((el && el.textContent) || '{}');
    } catch (e) {
      return {};
    }
  }

  var initial = parseJsonIsland('live-warroom-state');
  var state = {
    unlocked: Boolean(initial.unlocked),
    requestAccessHref: typeof initial.requestAccessHref === 'string' ? initial.requestAccessHref : '/contact',
    bookingEmbedUrl: typeof initial.bookingEmbedUrl === 'string' ? initial.bookingEmbedUrl : ''
  };

  // Keyed by event id so switching between popups (or reopening the same
  // one) shows whatever's currently known for that incident.
  var jobsByEventId = {};

  function fetchJson(url, opts) {
    return fetch(url, opts).then(function (res) {
      return res
        .json()
        .catch(function () { return {}; })
        .then(function (data) { return { status: res.status, data: data }; });
    });
  }

  // ------------------------------------------------------------- unlocking

  function submitUnlock(form, input, submit, error, props) {
    error.hidden = true;
    submit.disabled = true;
    fetchJson('/live/unlock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: input.value })
    })
      .then(function (result) {
        submit.disabled = false;
        if (result.status === 200 && result.data && result.data.ok) {
          state.unlocked = true;
          var container = form.closest('.warroom-panel');
          if (container) renderInto(container, props);
          return;
        }
        error.textContent = (result.data && result.data.error) || 'Could not verify that code.';
        error.hidden = false;
        input.value = '';
        input.focus();
      })
      .catch(function () {
        submit.disabled = false;
        error.textContent = 'Could not reach the server. Try again.';
        error.hidden = false;
      });
  }

  function buildUnlockToggle(props) {
    var wrap = document.createElement('div');
    wrap.className = 'warroom-unlock';

    var toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'warroom-unlock__toggle';
    toggle.textContent = 'Already have an access code?';

    var form = document.createElement('form');
    form.className = 'warroom-unlock-form';
    form.hidden = true;

    var inputId = 'warroom-code-' + props.id;
    var label = document.createElement('label');
    label.className = 'visually-hidden';
    label.setAttribute('for', inputId);
    label.textContent = 'Access code';

    var input = document.createElement('input');
    input.type = 'password';
    input.id = inputId;
    input.name = 'code';
    input.className = 'warroom-unlock-form__input';
    input.autocomplete = 'off';
    input.placeholder = 'Access code';
    input.required = true;

    var submit = document.createElement('button');
    submit.type = 'submit';
    submit.className = 'btn btn--primary btn--sm';
    submit.textContent = 'Unlock';

    var error = document.createElement('p');
    error.className = 'warroom-unlock-form__error';
    error.hidden = true;

    form.appendChild(label);
    form.appendChild(input);
    form.appendChild(submit);
    form.appendChild(error);

    toggle.addEventListener('click', function () {
      form.hidden = !form.hidden;
      if (!form.hidden) input.focus();
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      submitUnlock(form, input, submit, error, props);
    });

    wrap.appendChild(toggle);
    wrap.appendChild(form);
    return wrap;
  }

  function buildLocked(props) {
    var wrap = document.createElement('div');
    wrap.className = 'warroom-teaser';

    var title = document.createElement('strong');
    title.className = 'warroom-teaser__title';
    title.textContent = 'War Room investigation';
    wrap.appendChild(title);

    var body = document.createElement('p');
    body.className = 'warroom-teaser__body';
    body.textContent =
      'AI-researched incident briefing — affected suppliers, ports, and shipping lines, with recommended actions and sources.';
    wrap.appendChild(body);

    var actions = document.createElement('div');
    actions.className = 'warroom-teaser__actions';

    var requestLink = document.createElement('a');
    requestLink.className = 'btn btn--primary btn--sm';
    requestLink.href = state.requestAccessHref;
    requestLink.target = '_blank';
    requestLink.rel = 'noopener noreferrer';
    requestLink.textContent = 'Request access';
    actions.appendChild(requestLink);

    if (state.bookingEmbedUrl) {
      var demoLink = document.createElement('a');
      demoLink.className = 'btn btn--ghost btn--sm';
      demoLink.href = state.bookingEmbedUrl;
      demoLink.target = '_blank';
      demoLink.rel = 'noopener noreferrer';
      demoLink.textContent = 'Schedule a demo';
      actions.appendChild(demoLink);
    }
    wrap.appendChild(actions);
    wrap.appendChild(buildUnlockToggle(props));
    return wrap;
  }

  // -------------------------------------------------------- investigating

  function buildIdle(props) {
    var wrap = document.createElement('div');
    wrap.className = 'warroom-idle';

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn--primary btn--sm warroom-investigate-btn';
    btn.textContent = 'Investigate this incident';
    btn.addEventListener('click', function () {
      var container = btn.closest('.warroom-panel');
      if (container) startInvestigation(container, props);
    });

    wrap.appendChild(btn);
    return wrap;
  }

  function humanizeStage(stage) {
    return String(stage).replace(/_/g, ' ');
  }

  function buildProgress(job) {
    var wrap = document.createElement('div');
    wrap.className = 'warroom-progress';

    var spinner = document.createElement('span');
    spinner.className = 'warroom-spinner';
    spinner.setAttribute('aria-hidden', 'true');
    wrap.appendChild(spinner);

    var text = document.createElement('p');
    text.className = 'warroom-progress__text';
    text.textContent = job.stage ? 'Researching — ' + humanizeStage(job.stage) : 'Starting the investigation…';
    wrap.appendChild(text);

    var note = document.createElement('p');
    note.className = 'warroom-progress__note';
    note.textContent =
      'Deep investigations can take a few minutes. This updates automatically — no need to keep this open.';
    wrap.appendChild(note);

    return wrap;
  }

  function buildMessage(text, isError) {
    var wrap = document.createElement('div');
    wrap.className = isError ? 'warroom-message warroom-message--error' : 'warroom-message';
    var p = document.createElement('p');
    p.textContent = text;
    wrap.appendChild(p);
    return wrap;
  }

  function startInvestigation(container, props) {
    jobsByEventId[props.id] = { status: 'starting' };
    renderInto(container, props);

    fetchJson('/live/investigate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        incidentId: props.id,
        title: props.title,
        location: props.location,
        category: props.category,
        severity: props.severity,
        summary: props.summary,
        lat: props.lat,
        lon: props.lon,
        eventDate: props.eventDate
      })
    })
      .then(function (result) { handleInvestigateResponse(container, props, result); })
      .catch(function () {
        jobsByEventId[props.id] = { status: 'unavailable' };
        renderInto(container, props);
      });
  }

  function handleInvestigateResponse(container, props, result) {
    var data = result.data || {};

    if (data.locked) {
      // Session expired/never unlocked server-side between page load and
      // this click -- fall back to the locked teaser rather than an error.
      state.unlocked = false;
      jobsByEventId[props.id] = { status: 'idle' };
    } else if (!data.available) {
      jobsByEventId[props.id] = { status: 'unavailable' };
    } else if (data.rateLimited) {
      jobsByEventId[props.id] = { status: 'rate_limited' };
    } else if (data.error) {
      jobsByEventId[props.id] = { status: 'failed', message: data.error };
    } else if (typeof data.jobId === 'string') {
      jobsByEventId[props.id] = { status: 'running', jobId: data.jobId, stage: null };
    } else {
      jobsByEventId[props.id] = { status: 'unavailable' };
    }

    renderInto(container, props);
  }

  function schedulePoll(container, props, jobId) {
    setTimeout(function () {
      // The popup for this event may since have been closed or replaced by
      // another one -- if so, this container is no longer in the document
      // and the poll loop simply stops here instead of rescheduling.
      if (!document.body.contains(container)) return;

      fetchJson('/live/investigate/' + encodeURIComponent(jobId))
        .then(function (result) { handlePollResponse(container, props, jobId, result); })
        .catch(function () {
          if (!document.body.contains(container)) return;
          jobsByEventId[props.id] = { status: 'unavailable' };
          renderInto(container, props);
        });
    }, POLL_INTERVAL_MS);
  }

  function handlePollResponse(container, props, jobId, result) {
    if (!document.body.contains(container)) return;
    var data = result.data || {};

    if (data.locked) {
      state.unlocked = false;
      jobsByEventId[props.id] = { status: 'idle' };
      renderInto(container, props);
      return;
    }
    if (!data.available) {
      jobsByEventId[props.id] = { status: 'unavailable' };
      renderInto(container, props);
      return;
    }

    if (data.status === 'queued' || data.status === 'running') {
      jobsByEventId[props.id] = { status: 'running', jobId: jobId, stage: data.stage || null };
    } else if (data.status === 'complete' || data.status === 'capped') {
      // startedAt/completedAt/costEstimateUsd already existed; researchDepth
      // and relatedIncidents are new top-level fields (sibling of `result`,
      // not inside it) -- validated defensively here since an old-shape
      // response (job created before the backend added them) simply won't
      // have them, and buildResults()/buildMetaLine() must degrade to
      // omitting that signal rather than throwing on a missing field.
      jobsByEventId[props.id] = {
        status: data.status,
        jobId: jobId,
        result: data.result || null,
        startedAt: typeof data.startedAt === 'string' ? data.startedAt : null,
        completedAt: typeof data.completedAt === 'string' ? data.completedAt : null,
        costEstimateUsd: typeof data.costEstimateUsd === 'number' ? data.costEstimateUsd : null,
        researchDepth: data.researchDepth === 'shallow' || data.researchDepth === 'deep' ? data.researchDepth : null,
        relatedIncidents: Array.isArray(data.relatedIncidents) ? data.relatedIncidents : []
      };
    } else {
      jobsByEventId[props.id] = { status: 'failed' };
    }
    renderInto(container, props);
  }

  // ------------------------------------------------------------- results

  // Hard rule (WARROOM_API_CONTRACT.md): every affected/unaffected entry
  // must cite a real finding. Entries whose findingId doesn't resolve to a
  // finding with a safe https(s) sourceUrl are dropped, not shown unsourced.
  // Shared by buildCategoryTable() below and the at-a-glance impact strip's
  // counts, so the strip can never show a count higher than what actually
  // renders when expanded.
  function filterSourced(items, findingsById) {
    return (items || []).filter(function (item) {
      var finding = item && findingsById[item.findingId];
      return finding && typeof finding.sourceUrl === 'string' && /^https?:\/\//i.test(finding.sourceUrl);
    });
  }

  function buildCategoryTable(label, items, findingsById) {
    var list = filterSourced(items, findingsById);
    if (list.length === 0) return null;

    var section = document.createElement('div');
    section.className = 'warroom-table';

    var heading = document.createElement('h4');
    heading.className = 'warroom-table__heading';
    heading.textContent = label;
    section.appendChild(heading);

    var ul = document.createElement('ul');
    ul.className = 'warroom-table__list';
    list.forEach(function (item) { ul.appendChild(buildCategoryRow(item, findingsById[item.findingId])); });
    section.appendChild(ul);

    return section;
  }

  function buildCategoryRow(item, finding) {
    var li = document.createElement('li');
    li.className = 'warroom-table__row';

    var name = document.createElement('span');
    name.className = 'warroom-table__name';
    name.textContent = item.name || 'Unnamed';
    li.appendChild(name);

    var confidenceValue = CONFIDENCE_VALUES.indexOf(item.confidence) !== -1 ? item.confidence : null;
    if (confidenceValue) {
      var confidence = document.createElement('span');
      confidence.className = 'warroom-table__confidence warroom-table__confidence--' + confidenceValue;
      confidence.textContent = confidenceValue;
      li.appendChild(confidence);
    }

    var source = document.createElement('a');
    source.className = 'warroom-table__source';
    source.href = finding.sourceUrl;
    source.target = '_blank';
    source.rel = 'noopener noreferrer';
    source.textContent = 'Source: ' + (finding.title || finding.sourceUrl);
    li.appendChild(source);

    return li;
  }

  // recommendedActions is explicitly exempt from the per-item findingId
  // rule (it may synthesize across several) -- see WARROOM_API_CONTRACT.md.
  function buildActionsList(actions) {
    var list = (actions || []).filter(function (a) { return a && typeof a.action === 'string' && a.action.trim(); });
    if (list.length === 0) return null;

    var section = document.createElement('div');
    section.className = 'warroom-actions';

    var heading = document.createElement('h4');
    heading.className = 'warroom-table__heading';
    heading.textContent = 'Recommended actions';
    section.appendChild(heading);

    var ul = document.createElement('ul');
    ul.className = 'warroom-actions__list';
    list.forEach(function (a) { ul.appendChild(buildActionRow(a)); });
    section.appendChild(ul);

    return section;
  }

  function buildActionRow(a) {
    var li = document.createElement('li');
    li.className = 'warroom-actions__item';

    var urgencyValue = URGENCY_VALUES.indexOf(a.urgency) !== -1 ? a.urgency : null;
    if (urgencyValue) {
      var urgency = document.createElement('span');
      urgency.className = 'warroom-actions__urgency warroom-actions__urgency--' + urgencyValue;
      urgency.textContent = urgencyValue;
      li.appendChild(urgency);
    }

    var action = document.createElement('p');
    action.className = 'warroom-actions__action';
    action.textContent = a.action;
    li.appendChild(action);

    if (typeof a.rationale === 'string' && a.rationale.trim()) {
      var rationale = document.createElement('p');
      rationale.className = 'warroom-actions__rationale';
      rationale.textContent = a.rationale;
      li.appendChild(rationale);
    }

    return li;
  }

  function appendIfPresent(parent, node) {
    if (node) parent.appendChild(node);
  }

  // ---------------------------------------------- impact badge & at-a-glance

  // Above the summary: a colored, confident signal instead of making the
  // reader parse a paragraph to learn whether anything happened at all.
  // "none" gets the same treatment as every other level (not a bare empty
  // state) -- a real severity-2 no-impact result should read as a solid,
  // reassuring finding, not a shrug.
  function buildImpactBadge(result) {
    var meta = IMPACT_LEVEL_META[result.impactLevel];
    if (!meta) return null; // old-shape response or unrecognized value -- omit, don't guess

    var wrap = document.createElement('div');
    wrap.className = 'warroom-impact-badge warroom-impact-badge--' + meta.modifier;

    var icon = document.createElement('span');
    icon.className = 'warroom-impact-badge__icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = meta.icon;
    wrap.appendChild(icon);

    var text = document.createElement('div');
    text.className = 'warroom-impact-badge__text';

    var label = document.createElement('strong');
    label.className = 'warroom-impact-badge__label';
    label.textContent = meta.label;
    text.appendChild(label);

    if (typeof result.assessmentReason === 'string' && result.assessmentReason.trim()) {
      var reason = document.createElement('p');
      reason.className = 'warroom-impact-badge__reason';
      reason.textContent = result.assessmentReason.trim();
      text.appendChild(reason);
    }

    wrap.appendChild(text);
    return wrap;
  }

  // A compact row of icon+count pairs that reveals the existing (unchanged)
  // buildCategoryTable() sections on click, instead of always showing every
  // table stacked open. Only categories with at least one sourced entry are
  // shown -- counts always match filterSourced()'s result, so the strip can
  // never promise more than the tables underneath actually contain.
  function buildImpactStrip(categoryTables) {
    var visible = categoryTables.filter(function (c) { return c.count > 0; });
    if (visible.length === 0) return null;

    var wrap = document.createElement('div');
    wrap.className = 'warroom-impact-strip';

    visible.forEach(function (c) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'warroom-impact-strip__item';
      btn.setAttribute('aria-expanded', 'false');

      if (c.node) {
        impactStripIdCounter += 1;
        var id = 'warroom-cat-' + impactStripIdCounter;
        c.node.id = id;
        btn.setAttribute('aria-controls', id);
      }

      var tag = document.createElement('span');
      tag.className = 'warroom-impact-strip__tag';
      tag.textContent = c.tag;
      btn.appendChild(tag);

      var count = document.createElement('span');
      count.className = 'warroom-impact-strip__count';
      count.textContent = String(c.count);
      btn.appendChild(count);

      var label = document.createElement('span');
      label.className = 'warroom-impact-strip__label';
      label.textContent = c.label;
      btn.appendChild(label);

      btn.addEventListener('click', function () {
        if (!c.node) return;
        var willShow = c.node.hidden;
        c.node.hidden = !willShow;
        btn.setAttribute('aria-expanded', String(willShow));
      });

      wrap.appendChild(btn);
    });

    return wrap;
  }

  // ------------------------------------------------------------- sources

  function humanizeSourceType(sourceType) {
    if (typeof sourceType !== 'string' || !sourceType) return 'other';
    return SOURCE_TYPE_LABELS[sourceType] || sourceType.replace(/_/g, ' ');
  }

  // Computed entirely client-side from result.findings -- no backend
  // dependency. Total count plus a breakdown by sourceType, so source
  // diversity reads as a first-class signal instead of a buried citation
  // link on each row.
  function buildSourcesPanel(findings) {
    var valid = (findings || []).filter(function (f) {
      return f && typeof f.sourceUrl === 'string' && /^https?:\/\//i.test(f.sourceUrl);
    });
    if (valid.length === 0) return null;

    var counts = {};
    var order = [];
    valid.forEach(function (f) {
      var type = humanizeSourceType(f.sourceType);
      if (!Object.prototype.hasOwnProperty.call(counts, type)) {
        counts[type] = 0;
        order.push(type);
      }
      counts[type] += 1;
    });
    order.sort(function (a, b) { return counts[b] - counts[a]; });

    var section = document.createElement('div');
    section.className = 'warroom-sources';

    var heading = document.createElement('h4');
    heading.className = 'warroom-table__heading';
    heading.textContent = valid.length + (valid.length === 1 ? ' source' : ' sources');
    section.appendChild(heading);

    var chips = document.createElement('div');
    chips.className = 'warroom-sources__chips';
    order.forEach(function (type) {
      var chip = document.createElement('span');
      chip.className = 'warroom-sources__chip';
      chip.textContent = counts[type] + ' ' + type;
      chips.appendChild(chip);
    });
    section.appendChild(chips);

    return section;
  }

  // --------------------------------------------------- related incidents

  // No cross-event navigation mechanism exists yet in this popup system --
  // building one is out of scope here. v1 is exactly this: render the
  // titles as informational chips, nothing clickable to overpromise.
  function buildRelatedIncidents(relatedIncidents) {
    var valid = (relatedIncidents || []).filter(function (r) {
      return r && typeof r.jobId === 'string' && typeof r.title === 'string' && r.title.trim();
    });
    if (valid.length === 0) return null;

    var section = document.createElement('div');
    section.className = 'warroom-related';

    var heading = document.createElement('p');
    heading.className = 'warroom-related__heading';
    heading.textContent = valid.length === 1 ? '1 similar incident' : valid.length + ' similar incidents';
    section.appendChild(heading);

    var chips = document.createElement('div');
    chips.className = 'warroom-related__chips';
    valid.forEach(function (item) {
      var chip = document.createElement('span');
      chip.className = 'warroom-related__chip';
      chip.textContent = item.title.trim();
      if (typeof item.completedAt === 'string' && item.completedAt) {
        chip.title = 'Completed ' + item.completedAt;
      }
      chips.appendChild(chip);
    });
    section.appendChild(chips);

    return section;
  }

  // ------------------------------------------------------------ meta line

  function formatElapsed(startedAt, completedAt) {
    var start = Date.parse(startedAt);
    var end = Date.parse(completedAt);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
    var totalSeconds = Math.round((end - start) / 1000);
    if (totalSeconds < 60) return totalSeconds + 's';
    var minutes = Math.floor(totalSeconds / 60);
    var seconds = totalSeconds % 60;
    return minutes + 'm ' + seconds + 's';
  }

  function formatCost(usd) {
    if (typeof usd !== 'number' || !Number.isFinite(usd)) return null;
    var fixed = usd < 0.01 ? usd.toFixed(4) : usd.toFixed(3);
    fixed = fixed.replace(/0+$/, '').replace(/\.$/, '');
    return '$' + (fixed === '' ? '0' : fixed);
  }

  // Low-emphasis trust signal (cost/depth/timing), never the loudest thing
  // in the panel -- kept as its own caption-sized line rather than folded
  // into the summary or the sources panel.
  function buildMetaLine(job) {
    var parts = [];

    if (job.researchDepth === 'deep') parts.push('Deep investigation');
    else if (job.researchDepth === 'shallow') parts.push('Shallow investigation');

    var sourcedCount = job.result && Array.isArray(job.result.findings)
      ? job.result.findings.filter(function (f) {
          return f && typeof f.sourceUrl === 'string' && /^https?:\/\//i.test(f.sourceUrl);
        }).length
      : 0;
    if (sourcedCount > 0) parts.push(sourcedCount + (sourcedCount === 1 ? ' source' : ' sources'));

    var cost = formatCost(job.costEstimateUsd);
    if (cost) parts.push(cost);

    var elapsed = formatElapsed(job.startedAt, job.completedAt);
    if (elapsed) parts.push('completed in ' + elapsed);

    if (parts.length === 0) return null;

    var p = document.createElement('p');
    p.className = 'warroom-results__meta';
    p.textContent = parts.join(' · ');
    return p;
  }

  // ------------------------------------------------------------- assembly

  function buildResults(job) {
    var result = job.result;
    var wrap = document.createElement('div');
    wrap.className = 'warroom-results';

    if (!result) {
      wrap.appendChild(buildMessage('The investigation finished but returned no result.', true));
      return wrap;
    }

    if (job.status === 'capped') {
      var cappedNote = document.createElement('p');
      cappedNote.className = 'warroom-results__capped';
      cappedNote.textContent = 'This investigation hit its cost/time limit — showing partial findings below.';
      wrap.appendChild(cappedNote);
    }

    var findingsById = {};
    (result.findings || []).forEach(function (f) {
      if (f && typeof f.id === 'string') findingsById[f.id] = f;
    });

    appendIfPresent(wrap, buildImpactBadge(result));

    var summary = document.createElement('p');
    summary.className = 'warroom-results__summary';
    summary.textContent = result.summary || '';
    wrap.appendChild(summary);

    // Build (but don't yet append) each affected-category table so the
    // strip's counts and click targets can reference the same nodes --
    // buildCategoryTable()'s own "no claim without a source" filter is
    // untouched, this only changes when the result is inserted/shown.
    var categoryTables = IMPACT_STRIP_CATEGORIES.map(function (def) {
      var items = result[def.field];
      return {
        tag: def.tag,
        label: def.label,
        count: filterSourced(items, findingsById).length,
        node: buildCategoryTable(def.tableLabel, items, findingsById)
      };
    });

    appendIfPresent(wrap, buildImpactStrip(categoryTables));
    categoryTables.forEach(function (t) {
      if (!t.node) return;
      t.node.hidden = true;
      wrap.appendChild(t.node);
    });

    appendIfPresent(wrap, buildCategoryTable('Unaffected alternatives', result.unaffectedAlternatives, findingsById));
    appendIfPresent(wrap, buildSourcesPanel(result.findings));
    appendIfPresent(wrap, buildActionsList(result.recommendedActions));
    appendIfPresent(wrap, buildRelatedIncidents(job.relatedIncidents));
    appendIfPresent(wrap, buildMetaLine(job));

    var disclaimer = document.createElement('p');
    disclaimer.className = 'warroom-results__disclaimer';
    disclaimer.textContent = 'AI-generated analysis — verify independently.';
    wrap.appendChild(disclaimer);

    return wrap;
  }

  // ------------------------------------------------------------- render

  function renderInto(container, props) {
    container.innerHTML = '';

    if (!state.unlocked) {
      container.appendChild(buildLocked(props));
      return;
    }

    var job = jobsByEventId[props.id];
    if (!job || job.status === 'idle') {
      container.appendChild(buildIdle(props));
      return;
    }
    if (job.status === 'starting') {
      container.appendChild(buildProgress(job));
      return;
    }
    if (job.status === 'running') {
      container.appendChild(buildProgress(job));
      schedulePoll(container, props, job.jobId);
      return;
    }
    if (job.status === 'complete' || job.status === 'capped') {
      container.appendChild(buildResults(job));
      return;
    }
    if (job.status === 'rate_limited') {
      container.appendChild(buildMessage('Too many investigations requested right now — please wait a moment and try again.', true));
      return;
    }
    if (job.status === 'failed') {
      container.appendChild(buildMessage(job.message || 'This investigation failed. Please try again.', true));
      return;
    }
    container.appendChild(buildMessage("The War Room investigation service isn't reachable right now. Please try again shortly.", false));
  }

  function buildSection(props) {
    var container = document.createElement('div');
    container.className = 'warroom-panel';
    renderInto(container, props);
    return container;
  }

  window.NorvenziaWarroom = { buildSection: buildSection };
})();
