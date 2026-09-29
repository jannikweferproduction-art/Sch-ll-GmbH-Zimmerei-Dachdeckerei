// Zimmerei & Dachdeckerei Schüll – kleine Helfer ohne Bibliotheken.
// Alles funktioniert auch ohne JavaScript; hier kommen nur Komfort und Bewegung dazu.
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- Mobiles Menü ----
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('hauptmenue');
  if (toggle && nav) {
    var setOpen = function (open) {
      toggle.setAttribute('aria-expanded', String(open));
      nav.classList.toggle('is-open', open);
    };
    toggle.addEventListener('click', function () {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setOpen(false);
        toggle.focus();
      }
    });
    window.matchMedia('(min-width: 1024px)').addEventListener('change', function () { setOpen(false); });
  }

  // ---- Einblenden beim Scrollen (Maßskalen, Schichtaufbau, Abschnitte) ----
  var revealEls = document.querySelectorAll('[data-reveal]');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.15 });
    revealEls.forEach(function (el) { io.observe(el); });
  }

  // ---- Anfrageformular ----
  var form = document.querySelector('[data-anfrage]');
  if (!form) return;

  var MAX_FILES = 5;
  var MAX_FILE_MB = 10;
  var MAX_TOTAL_MB = 25;

  // Anliegen vorauswählen: Seite (data-anliegen) oder ?anliegen=dach
  var preset = new URLSearchParams(location.search).get('anliegen') || form.getAttribute('data-anliegen');
  if (preset) {
    var radio = form.querySelector('input[name="anliegen"][value="' + CSS.escape(preset) + '"]');
    if (radio) radio.checked = true;
  }

  var fileInput = form.querySelector('input[type="file"]');
  var fileList = form.querySelector('.upload__list');
  var status = form.querySelector('.form__status');
  var submit = form.querySelector('button[type="submit"]');

  function mb(bytes) { return (bytes / 1048576).toFixed(1).replace('.', ',') + ' MB'; }

  function checkFiles() {
    if (!fileInput) return '';
    var files = Array.prototype.slice.call(fileInput.files || []);
    fileList.textContent = '';
    var total = 0;
    files.forEach(function (f) {
      total += f.size;
      var li = document.createElement('li');
      li.textContent = f.name + ' · ' + mb(f.size);
      fileList.appendChild(li);
    });
    if (files.length > MAX_FILES) return 'Bitte höchstens ' + MAX_FILES + ' Fotos auswählen.';
    for (var i = 0; i < files.length; i++) {
      if (files[i].size > MAX_FILE_MB * 1048576) return '„' + files[i].name + '“ ist größer als ' + MAX_FILE_MB + ' MB.';
    }
    if (total > MAX_TOTAL_MB * 1048576) return 'Die Fotos sind zusammen größer als ' + MAX_TOTAL_MB + ' MB.';
    return '';
  }

  function showStatus(msg, ok) {
    status.textContent = msg;
    status.className = 'form__status ' + (msg ? (ok ? 'form__status--ok' : 'form__status--error') : '');
  }

  if (fileInput) {
    fileInput.addEventListener('change', function () {
      var err = checkFiles();
      showStatus(err, false);
    });
  }

  form.addEventListener('submit', function (e) {
    var phone = form.querySelector('[name="telefon"]');
    var email = form.querySelector('[name="email"]');
    if (!phone.value.trim() && !email.value.trim()) {
      e.preventDefault();
      phone.setAttribute('aria-invalid', 'true');
      email.setAttribute('aria-invalid', 'true');
      showStatus('Bitte geben Sie eine Telefonnummer oder eine E-Mail-Adresse an, damit wir Sie erreichen können.', false);
      phone.focus();
      return;
    }
    phone.removeAttribute('aria-invalid');
    email.removeAttribute('aria-invalid');

    var fileErr = checkFiles();
    if (fileErr) { e.preventDefault(); showStatus(fileErr, false); return; }

    if (!window.fetch || !window.FormData) return; // normaler Versand ohne JS-Komfort

    e.preventDefault();
    submit.disabled = true;
    var label = submit.textContent;
    submit.textContent = 'Wird gesendet …';
    showStatus('', true);

    fetch(form.action, {
      method: 'POST',
      body: new FormData(form),
      headers: { 'Accept': 'application/json' }
    })
      .then(function (res) { return res.json().catch(function () { return { ok: false }; }); })
      .then(function (data) {
        if (data && data.ok) {
          window.location.href = '/kontakt/danke/';
          return;
        }
        var msg = (data && data.message) || 'Das hat leider nicht geklappt. Bitte rufen Sie uns an: 0177 404 95 89.';
        showStatus(msg, false);
        submit.disabled = false;
        submit.textContent = label;
      })
      .catch(function () {
        showStatus('Keine Verbindung. Bitte versuchen Sie es noch einmal oder rufen Sie an: 0177 404 95 89.', false);
        submit.disabled = false;
        submit.textContent = label;
      });
  });
})();
