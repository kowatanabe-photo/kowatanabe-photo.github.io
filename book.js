(() => {
  const B = window.BOOK;
  const wrap = document.getElementById('bookwrap');
  const prevBtn = document.querySelector('.v-prev');
  const nextBtn = document.querySelector('.v-next');
  const num = document.querySelector('.v-num');
  const bar = document.querySelector('.v-bar span');
  const hint = document.querySelector('.v-hint');
  const fullBtn = document.querySelector('.v-full');

  let pf = null;
  let mode = null;   // 'spread'（見開き）か 'single'（1ページずつ）
  let pages = [];    // {html, cls, hard, photo}
  let size = null;   // {pw, ph}
  let flipped = false;
  if (window.matchMedia('(pointer: coarse)').matches) hint.textContent = 'タップ・スワイプでページをめくれます';

  const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const alt = (p) => esc([p.t, p.p].filter(Boolean).join(' ') || '写真');

  // ---------- 画面に合わせた大きさ ----------
  function measure() {
    const W = window.innerWidth, H = window.innerHeight;
    const availW = W - (W < 760 ? 24 : 96);
    const availH = H - 56 - 64 - (W < 760 ? 36 : 64);
    const k = B.k;
    const spreadPw = Math.min(availW / 2, availH / k, 760);
    const singleK = Math.min(Math.max(availH / availW, 1.15), 1.6); // スマホは画面の縦横比に合わせる
    const singlePw = Math.min(availW, availH / singleK, 620);
    const useSpread = W >= 700 && W > H * 1.05 && spreadPw >= 240;
    if (useSpread) return { mode: 'spread', pw: Math.floor(spreadPw), ph: Math.floor(spreadPw * k) };
    return { mode: 'single', pw: Math.floor(singlePw), ph: Math.floor(singlePw * singleK) };
  }

  // ---------- ページを組む ----------
  function photoPage(p, i, pw) {
    const cap = (p.t || p.p)
      ? `<span class="t">${esc(p.t)}</span><span>${esc(p.p)}</span>${p.n ? `<span class="ph-note">${esc(p.n)}</span>` : ''}`
      : '';
    return `<div class="ph-page"><div class="ph-box"><img src="../${p.m}" srcset="../${p.m} ${p.mw}w, ../${p.l} ${p.w}w" sizes="${pw}px" alt="${alt(p)}" draggable="false"></div><p class="ph-cap">${cap}</p></div>`;
  }

  function spreadHalves(p, k, pw) {
    // ページ幅 = 1、高さ = k として、見開き全体（幅 2）に写真を置く
    const a = p.w / p.h;
    const iw = Math.min(2 * 0.9, k * 0.8 * a);
    const ih = iw / a;
    const ox = (2 - iw) / 2;
    const oy = (k - ih) / 2;
    const style = (left) => `left:${left * 100}%;top:${(oy / k) * 100}%;width:${iw * 100}%;height:${(ih / k) * 100}%`;
    const img = (left) => `<img class="sp-img" style="${style(left)}" src="../${p.m}" srcset="../${p.m} ${p.mw}w, ../${p.l} ${p.w}w" sizes="${Math.round(pw * iw)}px" alt="${alt(p)}" draggable="false">`;
    const cap = (p.t || p.p) ? `<p class="sp-cap"><span class="t">${esc(p.t)}</span>${esc(p.p)}</p>` : '';
    return [img(ox), img(ox - 1) + cap];
  }

  function compose(m, pw, ph) {
    const P = [];
    const add = (html, o = {}) => P.push({ html, cls: o.cls || '', hard: !!o.hard, photo: o.photo ?? null });
    add(B.cover, { hard: true, cls: 'pg-cover', photo: -1 });
    add('<div class="pg-end"></div>');
    add(`<div class="tp"><p class="tp-title">${esc(B.title)}</p>${B.sub ? `<p class="tp-sub">${esc(B.sub)}</p>` : ''}<span class="tp-rule"></span></div>`);
    if (m === 'single') P.splice(1, 1); // スマホでは見返しを省く
    // 見開きは左ページから始める。位置が合わないときは次の写真を先に置いて白紙を避ける
    const order = B.photos.map((_, i) => i);
    if (m === 'spread') {
      let len = P.length;
      for (let j = 0; j < order.length; j++) {
        const q = B.photos[order[j]];
        if (q.s && len % 2 === 0) {
          const k = order.findIndex((x, t) => t > j && !B.photos[x].s);
          if (k > j) { const [x] = order.splice(k, 1); order.splice(j, 0, x); len += 1; continue; }
        }
        len += q.s ? 2 : 1;
      }
    }
    order.forEach((i) => {
      const p = B.photos[i];
      if (p.s && m === 'spread') {
        if (P.length % 2 === 0) add('');          // それでも合わないときだけ白紙
        const [l, r] = spreadHalves(p, ph / pw, pw);
        add(l, { photo: i, cls: 'sp' });
        add(r, { photo: i, cls: 'sp' });
      } else {
        add(photoPage(p, i, pw), { photo: i, cls: p.s ? 'big' : '' });
      }
    });
    const colo = [
      `<p class="colo-title">${esc(B.title)}</p>`,
      B.sub ? `<p>${esc(B.sub)}</p>` : '',
      `<p>${B.photos.length} photographs</p>`,
      B.name ? `<p>© ${esc(B.year)} ${esc(B.name)}</p>` : '',
    ].join('');
    add(`<div class="colo">${colo}</div>`);
    // 裏表紙は奇数番目（見開きでは左側に1枚）に置く
    // 白紙の見開きができないよう、位置が合うときだけ裏見返しを入れる
    if (P.length % 2 === 0) add(m === 'spread' ? '<div class="pg-end"></div>' : '');
    add(B.cover.replace('class="cv"', 'class="cv cv-back"').replace(/<div class="cv-photo">.*?<\/div>/, '<div class="cv-photo"></div>'), { hard: true, cls: 'pg-back' });
    return P;
  }

  // ---------- 本を作る ----------
  function build(anchorPhoto) {
    const s = measure();
    mode = s.mode;
    size = s;
    pages = compose(mode, s.pw, s.ph);

    let start = 0;
    if (anchorPhoto != null) {
      const idx = pages.findIndex((p) => p.photo === anchorPhoto);
      if (idx >= 0) start = idx;
    }

    if (pf) { pf.destroy(); pf = null; }
    const el = document.createElement('div');
    el.className = 'book ' + mode;
    el.style.width = (mode === 'spread' ? s.pw * 2 : s.pw) + 'px';
    el.style.height = s.ph + 'px';
    el.style.setProperty('--fs', Math.max(10, s.pw * 0.03) + 'px');
    el.innerHTML = pages.map((p, i) => {
      const side = mode === 'spread' && i > 0 && i < pages.length - 1 ? (i % 2 ? ' is-left' : ' is-right') : '';
      return `<div class="page ${p.cls}${side}" data-density="${p.hard ? 'hard' : 'soft'}"><div class="pg-in">${p.html}</div></div>`;
    }).join('');
    wrap.style.width = el.style.width;
    wrap.style.height = el.style.height;
    wrap.appendChild(el);

    pf = new St.PageFlip(el, {
      width: s.pw,
      height: s.ph,
      size: 'fixed',
      showCover: true,
      usePortrait: mode === 'single',
      drawShadow: true,
      maxShadowOpacity: 0.55,
      flippingTime: mode === 'single' ? 750 : 950,
      mobileScrollSupport: false,
      swipeDistance: 24,
      showPageCorners: true,
      startPage: start,
      autoSize: false,
    });
    pf.loadFromHTML(el.querySelectorAll('.page'));
    pf.on('flip', (e) => update(e.data, true));
    pf.on('changeState', (e) => {
      if (e.data === 'flipping' || e.data === 'user_fold') {
        if (!flipped) { flipped = true; hint.classList.add('is-hidden'); }
        if (e.data === 'user_fold') cancelReturn();
      }
    });
    update(start);
    requestAnimationFrame(() => wrap.classList.add('is-ready'));
  }

  // ---------- 表示の更新 ----------
  function update(i, byUser) {
    const total = pages.length;
    const last = total - 1;
    // 閉じているとき（表紙・裏表紙）は本を中央に寄せる
    let shift = 0;
    if (mode === 'spread') {
      if (i === 0) shift = -size.pw / 2;
      else if (i >= last) shift = size.pw / 2;
    }
    wrap.style.setProperty('--shift', `${shift}px`);
    if (mode === 'spread') {
      const closedFront = i === 0, closedBack = i >= last;
      wrap.style.setProperty('--sh-l', closedFront ? '50%' : '0');
      wrap.style.setProperty('--sh-r', closedBack ? '50%' : '0');
    }
    prevBtn.disabled = i <= 0;
    nextBtn.disabled = i >= last;
    // ページ番号（表紙を除いて数える）
    let label;
    if (i === 0) label = 'Cover';
    else if (i >= last) label = 'End';
    else if (mode === 'spread') { const l = i % 2 ? i : i - 1; label = `${l}–${Math.min(l + 1, last - 1)} / ${last - 1}`; }
    else label = `${i} / ${last - 1}`;
    num.textContent = label;
    bar.style.width = `${(i / last) * 100}%`;
    try { history.replaceState(null, '', `#p${i}`); } catch (_) {}
    // 最後までめくったら、少し待って本棚へ戻る
    if (i >= last && byUser) scheduleReturn(); else cancelReturn();
  }

  // ---------- 読み終えたら本棚へ ----------
  const endBox = document.querySelector('.v-end');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let returnTimer = null;
  let leaving = false;

  function scheduleReturn() {
    if (returnTimer || leaving) return;
    endBox.classList.add('is-show');
    returnTimer = setTimeout(leave, 2200);
  }
  function cancelReturn() {
    clearTimeout(returnTimer);
    returnTimer = null;
    endBox.classList.remove('is-show');
  }
  function leave() {
    if (leaving) return;
    leaving = true;
    clearTimeout(returnTimer);
    returnTimer = null;
    try { sessionStorage.setItem('pb-return', B.slug); } catch (_) {}
    const go = () => {
      // 本棚から来たときは「戻る」で戻る（本棚のスクロール位置がそのまま残る）
      const shelf = new URL('../', location.href).href;
      if (document.referrer && document.referrer.split('#')[0] === shelf && history.length > 1) history.back();
      else location.href = '../';
    };
    if (reduce) return go();
    endBox.classList.remove('is-show');
    document.body.classList.add('is-leaving');
    setTimeout(go, 950);
  }
  // 戻ってきたとき（ブラウザの「進む」など）に元の状態にする
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) { leaving = false; document.body.classList.remove('is-leaving'); }
  });
  document.querySelector('.v-stay').addEventListener('click', cancelReturn);
  document.querySelector('.v-back').addEventListener('click', (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    leave();
  });

  function currentPhoto() {
    if (!pf) return null;
    const i = pf.getCurrentPageIndex();
    for (let j = i; j < pages.length; j++) if (pages[j].photo != null) return pages[j].photo;
    return null;
  }

  // ---------- 操作 ----------
  prevBtn.addEventListener('click', () => pf && pf.flipPrev('top'));
  nextBtn.addEventListener('click', () => pf && pf.flipNext('top'));
  document.addEventListener('keydown', (e) => {
    if (!pf) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); pf.flipNext('top'); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); pf.flipPrev('top'); }
    else if (e.key === 'Escape' && !document.fullscreenElement) { leave(); }
  });
  document.addEventListener('contextmenu', (e) => { if (e.target.tagName === 'IMG') e.preventDefault(); });

  if (document.fullscreenEnabled) {
    fullBtn.addEventListener('click', () => {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen().catch(() => {});
    });
  } else {
    fullBtn.style.visibility = 'hidden';
  }

  let timer = null;
  let lastKey = '';
  window.addEventListener('resize', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const s = measure();
      const key = `${s.mode}:${s.pw}:${s.ph}`;
      if (key === lastKey) return;
      lastKey = key;
      build(currentPhoto());
    }, 250);
  });

  // 最初の表示（URL の #p番号 からも再開できる）
  const m = location.hash.match(/^#p(\d+)$/);
  const first = measure();
  lastKey = `${first.mode}:${first.pw}:${first.ph}`;
  build(null);
  if (m && +m[1] > 0 && +m[1] < pages.length) pf.turnToPage(+m[1]), update(+m[1]);
})();
