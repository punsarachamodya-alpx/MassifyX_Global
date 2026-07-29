/* Admin panel enhancements: repeater add/remove, confirm dialogs, unsaved-edit warning.
   The form still saves correctly without any of this — rows already present can be
   edited and submitted with JS off. */

(function () {
  'use strict';

  // ------------------------------------------------------------- repeaters
  var repeaters = document.querySelectorAll('[data-repeater]');

  Array.prototype.forEach.call(repeaters, function (rep) {
    var rows = rep.querySelector('.arep__rows');
    var tpl = rep.querySelector('.arep__tpl');
    var add = rep.querySelector('.arep__add');

    if (add && rows && tpl) {
      add.addEventListener('click', function () {
        var index = parseInt(rep.getAttribute('data-next'), 10) || 0;
        var html = tpl.innerHTML.split('__INDEX__').join(String(index));
        var holder = document.createElement('div');
        holder.innerHTML = html;
        var row = holder.firstElementChild;
        rows.appendChild(row);
        rep.setAttribute('data-next', String(index + 1));
        var first = row.querySelector('input[type="text"], textarea, select');
        if (first) first.focus();
      });
    }

    // Delegated so it also catches rows added after load.
    rep.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('.arep__del') : null;
      if (!btn || !rep.contains(btn)) return;
      var row = btn.closest('.arep__row');
      if (!row) return;
      // Flip the row's __deleted flag and hide it, rather than removing the inputs —
      // the server reads the flag, so indices of the remaining rows stay stable.
      var flag = row.querySelector('input[type="hidden"][name$=".__deleted"]');
      if (flag) flag.value = '1';
      row.style.display = 'none';
      row.setAttribute('aria-hidden', 'true');
      Array.prototype.forEach.call(row.querySelectorAll('input, textarea, select'), function (el) {
        if (el !== flag) el.setAttribute('disabled', 'disabled');
      });
      dirty = true;
    });
  });

  // -------------------------------------------------------------- confirms
  var confirmForms = document.querySelectorAll('form[data-confirm]');
  Array.prototype.forEach.call(confirmForms, function (form) {
    form.addEventListener('submit', function (e) {
      if (!window.confirm(form.getAttribute('data-confirm'))) e.preventDefault();
      else skipWarn = true;
    });
  });

  // ------------------------------------------------------- unsaved changes
  var dirty = false;
  var skipWarn = false;
  var watched = document.querySelector('[data-warn-unsaved]');

  if (watched) {
    watched.addEventListener('input', function () {
      dirty = true;
    });
    watched.addEventListener('change', function () {
      dirty = true;
    });
    watched.addEventListener('submit', function () {
      skipWarn = true;
    });

    window.addEventListener('beforeunload', function (e) {
      if (!dirty || skipWarn) return;
      e.preventDefault();
      e.returnValue = '';
    });
  }
})();
