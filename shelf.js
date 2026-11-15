(() => {
  // 本を選ぶと、表紙が開いてから写真集へ移る
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('.bk').forEach((a) => {
    a.addEventListener('click', (e) => {
      if (reduce || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      a.classList.add('is-opening');
      document.body.classList.add('is-leaving');
      setTimeout(() => { location.href = a.href; }, 700);
    });
  });
  // 本棚に戻ってきたとき：開いた状態を元に戻し、読んでいた本を元の場所へ収める
  window.addEventListener('pageshow', () => {
    document.body.classList.remove('is-leaving');
    document.querySelectorAll('.bk.is-opening').forEach((a) => a.classList.remove('is-opening'));
    let slug = null;
    try { slug = sessionStorage.getItem('pb-return'); sessionStorage.removeItem('pb-return'); } catch (_) {}
    if (!slug || reduce) return;
    const a = [...document.querySelectorAll('.bk')].find((x) => x.getAttribute('href') === `${slug}/`);
    if (!a) return;
    const r = a.getBoundingClientRect();
    if (r.top < 0 || r.bottom > window.innerHeight) a.scrollIntoView({ block: 'center', behavior: 'instant' });
    a.classList.remove('is-returning');
    void a.offsetWidth; // アニメーションをやり直すため
    a.classList.add('is-returning');
    a.addEventListener('animationend', (e) => { if (e.target.classList.contains('bk-obj')) a.classList.remove('is-returning'); });
  });
  document.addEventListener('contextmenu', (e) => { if (e.target.tagName === 'IMG') e.preventDefault(); });
})();
