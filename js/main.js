(() => {
  'use strict';
  const data = window.MEMORIAL || {};
  const sizes = ['standard', 'large', 'xlarge'];
  const buttons = [...document.querySelectorAll('[data-size]')];
  function setSize(size) {
    if (!sizes.includes(size)) size = 'standard';
    document.documentElement.dataset.textSize = size;
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.size === size)));
    // file:// や保存禁止のブラウザでも、ページ移動先へ設定を引き継ぐ。
    document.querySelectorAll('a[href]').forEach(link => {
      const target = new URL(link.getAttribute('href'), window.location.href);
      if (/\/(index|memories|message)\.html$/.test(target.pathname) && target.protocol === window.location.protocol && target.host === window.location.host) {
        target.searchParams.set('textSize', size);
        link.setAttribute('href', target.pathname.split('/').pop() + target.search + target.hash);
      }
    });
  }
  const requested = new URLSearchParams(window.location.search).get('textSize');
  try { setSize(requested || localStorage.getItem('memorial-text-size')); } catch (_) { setSize(requested || 'standard'); }
  buttons.forEach(button => button.addEventListener('click', () => {
    setSize(button.dataset.size);
    try { localStorage.setItem('memorial-text-size', button.dataset.size); } catch (_) { /* 保存不可でも当該ページでは変更可能 */ }
    const status = document.querySelector('[data-size-status]');
    if (status) status.textContent = `文字サイズを「${button.textContent}」にしました。`;
  }));
  document.querySelectorAll('[data-print]').forEach(button => button.addEventListener('click', () => window.print()));
  if (data.footerText) document.querySelectorAll('[data-footer-text]').forEach(el => { el.textContent = data.footerText; });
  if (data.showDaughterOccupation === true && data.daughterOccupationText) {
    document.querySelectorAll('[data-daughter-occupation]').forEach(el => { el.textContent = data.daughterOccupationText; el.hidden = false; });
  }
  if (data.collectionUrl) {
    try {
      const url = new URL(data.collectionUrl, window.location.href);
      if (['https:', 'http:'].includes(url.protocol)) document.querySelectorAll('[data-collection]').forEach(el => {
        el.href = url.href; el.textContent = data.collectionLabel || '作品集へ戻る'; el.hidden = false;
      });
    } catch (_) { /* 未設定・不正なURLでは表示しない */ }
  }
  const dialog = document.querySelector('[data-photo-dialog]');
  let opener;
  document.querySelectorAll('[data-photo]').forEach(figure => {
    const img = figure.querySelector('img');
    const link = figure.querySelector('[data-photo-link]');
    const missing = figure.querySelector('[data-photo-missing]');
    const hint = figure.querySelector('[data-zoom-hint]');
    if (!img || !link) return;
    const caption = data.photoCaption || figure.querySelector('figcaption').textContent;
    figure.querySelector('figcaption').textContent = caption;
    function update() {
      const ready = img.complete && img.naturalWidth > 0;
      link.hidden = !ready;
      missing.hidden = ready;
      if (hint) hint.hidden = !ready;
      figure.querySelector('figcaption').textContent = ready ? caption : '幼い頃によく遊んだ京都・祇園の辰巳神社を背景に重ねた、60代の写真を掲載する予定です。';
    }
    img.addEventListener('load', update);
    img.addEventListener('error', update);
    const path = data.photoPath || 'images/yosihiko.png';
    img.src = path; link.href = path;
    update();
    link.addEventListener('click', event => {
      if (!dialog || typeof dialog.showModal !== 'function') return;
      event.preventDefault(); opener = link;
      dialog.querySelector('img').src = img.src;
      dialog.querySelector('img').alt = img.alt;
      dialog.querySelector('[data-dialog-caption]').textContent = caption;
      dialog.showModal();
      dialog.querySelector('button').focus();
    });
  });
  if (dialog) {
    dialog.querySelector('[data-close-dialog]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => { if (opener) opener.focus(); });
    dialog.addEventListener('click', event => { if (event.target === dialog) {
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    }});
  }
  // 印刷時は折りたたまれた参考資料も紙面に含める。
  const detailState = new Map();
  window.addEventListener('beforeprint', () => document.querySelectorAll('details').forEach(el => { detailState.set(el, el.open); el.open = true; }));
  window.addEventListener('afterprint', () => { detailState.forEach((open, el) => { el.open = open; }); detailState.clear(); });
})();
