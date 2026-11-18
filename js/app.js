/* ============================================================
   How Linux Works — Study Lab
   Vanilla JS single-page study app. No build step, no network.
   ============================================================ */
'use strict';

const STORE_KEY = 'hlw-study-v1';
const THEME_KEY = 'hlw-theme';
const CHAPTERS = (window.HLW && window.HLW.chapters) ? window.HLW.chapters.slice().sort((a, b) => a.id - b.id) : [];
const byId = id => CHAPTERS.find(c => String(c.id) === String(id));

let state = loadState();
let examSet = null;
let examAnswers = {};
let examStarted = 0;
let examTimer = null;
let visState = { id: 'boot', index: 0, playing: false, failed: false, timer: null };
let scrollHandler = null;
let searchIndex = null;
let searchSelection = 0;
let searchResults = [];
let cheatFilter = 'all';
let deckFilter = 'all';
let deckShuffled = false;

/* ---------- storage ---------- */
function loadState() {
  const base = { completed: {}, quiz: {}, labs: {}, cards: {}, last: null, exam: [] };
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw);
    return Object.assign(base, parsed, {
      completed: parsed.completed || {},
      quiz: parsed.quiz || {},
      labs: parsed.labs || {},
      cards: parsed.cards || {},
      exam: Array.isArray(parsed.exam) ? parsed.exam : []
    });
  } catch (e) { return base; }
}
function saveState() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {}
  syncChrome();
}
function quizScore(ch) {
  const rec = state.quiz[ch.id];
  if (!rec || !rec.answers) return { answered: 0, correct: 0, total: ch.quiz.length };
  let correct = 0, answered = 0;
  ch.quiz.forEach((q, i) => {
    if (rec.answers[i] != null) {
      answered++;
      if (rec.answers[i] === q.answer) correct++;
    }
  });
  return { answered, correct, total: ch.quiz.length };
}
function labsDone(ch) {
  let n = 0;
  ch.labs.forEach((lab, li) => lab.steps.forEach((s, si) => { if (state.labs[`${ch.id}-${li}-${si}`]) n++; }));
  return n;
}
function totalLabSteps(ch) { return ch.labs.reduce((n, l) => n + l.steps.length, 0); }
function cardsKnown(ch) {
  return ch.cards.reduce((n, c, i) => n + (state.cards[`${ch.id}-${i}`] ? 1 : 0), 0);
}
function totalStats() {
  const commands = CHAPTERS.reduce((n, c) => n + (c.commands ? c.commands.length : 0), 0);
  const questions = CHAPTERS.reduce((n, c) => n + (c.quiz ? c.quiz.length : 0), 0);
  const cards = CHAPTERS.reduce((n, c) => n + (c.cards ? c.cards.length : 0), 0);
  return { commands, questions, cards };
}

/* ---------- helpers ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
const strip = html => String(html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const inline = s => esc(s).replace(/&lt;(\/?)(code|em|strong|b|i)&gt;/g, '<$1$2>');
const pad2 = n => String(n).padStart(2, '0');
const pct = (a, b) => b ? Math.round((a / b) * 100) : 0;
const copyText = text => {
  if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
  const ta = document.createElement('textarea');
  ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta); ta.select();
  try { document.execCommand('copy'); } catch (e) {}
  document.body.removeChild(ta);
  return Promise.resolve();
};
let toastTimer = null;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 1900);
}
function fmtScore(ch) {
  const s = quizScore(ch);
  return s.answered ? `${s.correct}/${s.total}` : '—';
}

/* ---------- theme + chrome ---------- */
function initTheme() {
  let t = null;
  try { t = new URLSearchParams(location.search).get('theme'); } catch (e) {}
  if (!t) { try { t = localStorage.getItem(THEME_KEY); } catch (e) {} }
  if (!t) t = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  if (t !== 'light' && t !== 'dark') t = 'dark';
  document.documentElement.dataset.theme = t;
}
function toggleTheme() {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
  try {
    const url = new URL(location.href);
    if (url.searchParams.has('theme')) {
      url.searchParams.delete('theme');
      history.replaceState(null, '', url.pathname + url.search + url.hash);
    }
  } catch (e) {}
  toast(next === 'dark' ? 'Dark terminal theme' : 'Paper theme');
}
function syncChrome() {
  const done = CHAPTERS.filter(c => state.completed[c.id]).length;
  const total = CHAPTERS.length;
  const p = pct(done, total);
  const sp = $('#sideProgress');
  if (sp) {
    sp.innerHTML = `
      <div class="sp-top"><span class="sp-label">Course progress</span><span class="sp-pct">${p}%</span></div>
      <div class="sp-bar"><i class="sp-fill" style="width:${p}%"></i></div>
      <div class="sp-note">${done} of ${total} chapters complete</div>`;
  }
  $$('.ch-link').forEach(a => {
    const id = a.dataset.ch;
    a.classList.toggle('done', !!state.completed[id]);
    a.classList.toggle('active', currentRoute().view === 'chapter' && String(currentRoute().id) === String(id));
  });
  $$('.side-link').forEach(a => a.classList.toggle('active', a.dataset.nav === currentRoute().view || (a.dataset.nav === 'home' && currentRoute().view === 'home')));
}
function renderChapterNav() {
  const nav = $('#chapterNav');
  if (!nav || !window.HLW) return;
  let html = '';
  HLW.tracks.forEach(track => {
    const chs = CHAPTERS.filter(c => c.track === track.id);
    if (!chs.length) return;
    html += `<div class="track-label">${esc(track.short || track.name)}</div>`;
    chs.forEach(c => {
      html += `<a href="#/chapter/${c.id}" class="ch-link" data-ch="${c.id}">
        <span class="ch-num">${pad2(c.id)}</span>
        <span class="ch-title">${esc(c.short || c.title)}</span>
        <span class="ch-dot" aria-hidden="true"></span>
      </a>`;
    });
  });
  nav.innerHTML = html;
}
function currentRoute() {
  const raw = (location.hash || '#/home').replace(/^#/, '');
  const parts = raw.split('/').filter(Boolean);
  if (!parts.length) return { view: 'home' };
  if (parts[0] === 'chapter') return { view: 'chapter', id: parts[1], anchor: parts[2] || null };
  if (parts[0] === 'visuals') return { view: 'visuals', id: parts[1] || 'boot', stage: Math.max(0, parseInt(parts[2], 10) || 0) };
  return { view: parts[0], anchor: parts[1] || null };
}
function closeNav() {
  document.body.classList.remove('nav-open');
  const btn = $('#menuBtn');
  if (btn) btn.setAttribute('aria-expanded', 'false');
  const scrim = $('#scrim');
  if (scrim) scrim.hidden = true;
}
function openNav() {
  document.body.classList.add('nav-open');
  const btn = $('#menuBtn');
  if (btn) btn.setAttribute('aria-expanded', 'true');
  const scrim = $('#scrim');
  if (scrim) scrim.hidden = false;
}

/* ---------- diagrams ---------- */
function diagramHTML(d) {
  if (!d) return '';
  let body = '';
  if (d.type === 'layers' || d.type === 'stack') {
    body = `<div class="dg-stack">` + d.items.map(it => `
      <div class="dg-box ${it.cls || ''}">
        <div class="dg-t">${it.t}</div>
        ${it.d ? `<div class="dg-d">${it.d}</div>` : ''}
      </div>`).join('') + `</div>`;
  } else if (d.type === 'flow') {
    body = `<div class="dg-flow">` + d.items.map((it, i) => `
      ${i ? `<span class="dg-arrow">→</span>` : ''}
      <div class="dg-box ${it.cls || ''}">
        <div class="dg-t">${it.t}</div>
        ${it.d ? `<div class="dg-d">${it.d}</div>` : ''}
      </div>`).join('') + `</div>`;
  } else if (d.type === 'compare') {
    body = `<div class="dg-compare">
      <div class="dg-col"><h4>${d.left.title}</h4><ul>${d.left.items.map(i => `<li>${i}</li>`).join('')}</ul></div>
      <div class="dg-col"><h4>${d.right.title}</h4><ul>${d.right.items.map(i => `<li>${i}</li>`).join('')}</ul></div>
    </div>`;
  } else if (d.type === 'tree') {
    body = `<div class="dg-tree">${d.text}</div>`;
  }
  return `<div class="figure">
    <div class="diagram">${body}</div>
    ${d.caption ? `<div class="figure-cap">${esc(d.caption)}</div>` : ''}
  </div>`;
}

/* ---------- code blocks ---------- */
function codeBlock(code, label) {
  return `<div class="code-wrap"><button class="copy-btn" data-copy="${esc(code)}" aria-label="Copy code">copy</button>
    <pre><code>${esc(code)}</code></pre></div>`;
}

/* ---------- views ---------- */
function homeView() {
  const done = CHAPTERS.filter(c => state.completed[c.id]).length;
  const p = pct(done, CHAPTERS.length);
  const stats = totalStats();
  const last = state.last && byId(state.last) ? byId(state.last) : CHAPTERS[0];
  const continueLabel = state.last ? 'Continue where you left off' : 'Start with the foundations';
  const vis = visualsData();
  const visTeasers = {
    boot: 'Firmware to login, with the failure modes that stop a boot.',
    command: 'Keystroke → shell → syscalls → page cache → disk.',
    packet: 'DNS → routing → ARP → TCP → TLS → server → response.'
  };
  let tracksHTML = '';
  HLW.tracks.forEach(track => {
    const chs = CHAPTERS.filter(c => c.track === track.id);
    if (!chs.length) return;
    tracksHTML += `<section class="track">
      <div class="track-head"><h2>${esc(track.name)}</h2><p>${esc(track.range)}</p></div>
      <div class="chapter-grid">
        ${chs.map(c => {
          const q = quizScore(c);
          return `<a class="chapter-card ${state.completed[c.id] ? 'done' : ''}" href="#/chapter/${c.id}">
            <div class="cc-top">
              <span class="cc-num">CH ${pad2(c.id)}</span>
              <span class="cc-done" aria-label="${state.completed[c.id] ? 'Complete' : 'Not complete'}"></span>
            </div>
            <h3>${esc(c.title)}</h3>
            <p>${esc(c.blurb)}</p>
            <div class="cc-foot"><span>${c.minutes} min</span><span>·</span><span>${c.commands.length} commands</span><span>·</span><span>${q.answered ? q.correct + '/' + q.total + ' quiz' : 'quiz'}</span></div>
            <div class="cc-bar"><i style="width:${state.completed[c.id] ? 100 : pct(q.answered, c.quiz.length)}%"></i></div>
          </a>`;
        }).join('')}
      </div>
    </section>`;
  });

  return `<div class="page">
    <section class="hero">
      <div class="hero-term"><span class="term-dots"><i></i><i></i><i></i></span> brian@linux ~ $ study --book "how-linux-works"</div>
      <div class="eyebrow">The complete study companion · 3rd edition</div>
      <h1>Understand the machine <em>beneath the shell.</em></h1>
      <p class="hero-lead">A guided, hands-on companion to <strong>Brian Ward's <em>How Linux Works</em></strong>. Work through 17 chapters of kernel internals, storage, boot, networking and tooling — with diagrams, command references, labs, quizzes and spaced-review flashcards.</p>
      <div class="hero-actions">
        <a class="btn btn-primary" href="#/chapter/${last.id}">${continueLabel} <span aria-hidden="true">→</span></a>
        <a class="btn" href="#/cheatsheet">Browse command index</a>
        <a class="btn btn-ghost" href="#/exam">Take practice exam</a>
      </div>
      <div class="hero-meta">
        <span class="chip accent">17 chapters</span>
        <span class="chip">${stats.commands} commands</span>
        <span class="chip">${stats.questions} quiz questions</span>
        <span class="chip">${stats.cards} flashcards</span>
        <span class="chip amber">Progress saved locally</span>
      </div>
    </section>

    <div class="stats">
      <div class="stat"><span class="stat-value">${done}/${CHAPTERS.length}</span><span class="stat-label">Chapters complete</span></div>
      <div class="stat"><span class="stat-value">${p}%</span><span class="stat-label">Course progress</span></div>
      <div class="stat"><span class="stat-value">${CHAPTERS.reduce((n, c) => n + quizScore(c).correct, 0)}</span><span class="stat-label">Quiz answers correct</span></div>
      <div class="stat"><span class="stat-value">${CHAPTERS.reduce((n, c) => n + cardsKnown(c), 0)}/${stats.cards}</span><span class="stat-label">Flashcards mastered</span></div>
    </div>

    <div class="continue-card">
      <div>
        <div class="cc-kicker">${state.last ? 'Up next' : 'Recommended starting point'}</div>
        <h3>${esc(last.title)}</h3>
        <p>${esc(last.tagline || last.blurb)}</p>
      </div>
      <a class="btn btn-primary" href="#/chapter/${last.id}">Open chapter</a>
    </div>

    ${vis ? `<section class="vis-promo">
      <div class="vis-promo-head">
        <div>
          <div class="eyebrow">New · Interactive</div>
          <h2>See the machine move</h2>
          <p>Step through the three things a Linux system does constantly: boot, run a command, and send a packet. Every stage has a failure mode you can inject.</p>
        </div>
        <a class="btn" href="#/visuals">Open visuals <span aria-hidden="true">→</span></a>
      </div>
      <div class="vis-promo-grid">
        ${vis.order.map(k => {
          const v = vis.items[k];
          return `<a class="vis-promo-card" href="#/visuals/${k}">
            <span class="vpc-glyph">${v.glyph}</span>
            <span class="vpc-body"><b>${esc(v.short)}</b><span>${esc(visTeasers[k] || v.title)}</span></span>
            <span class="vpc-meta">${v.stages.length} stages</span>
          </a>`;
        }).join('')}
      </div>
    </section>` : ''}

    ${tracksHTML}

    <div class="rule"></div>
    <section>
      <div class="section-head"><div><h2>How to use this lab</h2><p>Read, type, break, fix — in that order.</p></div></div>
      <div class="chapter-grid">
        <article class="chapter-card" style="cursor:default">
          <span class="cc-num">01</span><h3>Read the chapter notes</h3>
          <p>Every module maps back to specific sections of the book. Use the chapter reference chips to follow along in the PDF.</p>
        </article>
        <article class="chapter-card" style="cursor:default">
          <span class="cc-num">02</span><h3>Run the labs</h3>
          <p>Commands are shown verbatim and safe by default. Check off each step once you have tried it in a disposable VM, container, or Termux environment.</p>
        </article>
        <article class="chapter-card" style="cursor:default">
          <span class="cc-num">03</span><h3>Test and revisit</h3>
          <p>Finish each chapter with the quiz, then use flashcards and the practice exam to keep the mental model sharp.</p>
        </article>
      </div>
    </section>
    <div class="rule"></div>
    <p class="small muted">Study notes are paraphrased and structured for revision. The book is the primary source: <em>How Linux Works: What Every Superuser Should Know</em>, 3rd edition, Brian Ward (No Starch Press, 2021).</p>
  </div>`;
}

function chapterView(id, anchor) {
  const ch = byId(id);
  if (!ch) return notFoundView();
  state.last = ch.id;
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {}
  const qs = quizScore(ch);
  const done = !!state.completed[ch.id];
  const track = (HLW.tracks.find(t => t.id === ch.track) || {});
  const idx = CHAPTERS.findIndex(c => c.id === ch.id);
  const prev = CHAPTERS[idx - 1], next = CHAPTERS[idx + 1];
  const vd = visualsData();
  const visMatch = vd ? vd.order.map(k => ({ id: k, ...vd.items[k] })).find(v => v.chapters.includes(ch.id)) : null;

  const sections = ch.sections.map((s, i) => `
    <section class="concept" id="${esc(s.id)}">
      <div class="concept-head">
        <h2><span class="hash">#</span>${esc(s.title)}</h2>
        ${s.ref ? `<span class="ref">§ ${esc(s.ref)}</span>` : ''}
      </div>
      ${s.html}
      ${s.diagram ? diagramHTML(s.diagram) : ''}
      ${s.callout ? `<div class="callout ${esc(s.callout.type || 'note')}">
        <span class="co-ico">${s.callout.type === 'warn' ? '!' : s.callout.type === 'tip' ? '✓' : s.callout.type === 'key' ? '★' : 'i'}</span>
        <div><div class="co-title">${esc(s.callout.title || 'Note')}</div><p>${s.callout.text}</p></div>
      </div>` : ''}
    </section>`).join('');

  const commands = ch.commands.length ? `
    <section class="concept" id="ch${ch.id}-commands">
      <div class="concept-head"><h2><span class="hash">$</span>Command reference</h2><span class="ref">Copy &amp; try</span></div>
      <p>The commands below appear across this chapter. Always read a man page before running something unfamiliar, and test destructive operations in a disposable VM.</p>
      <div class="cmd-block">
        <div class="cmd-block-head"><span>Command</span><span>What it does</span></div>
        ${ch.commands.map(c => `<div class="cmd-row">
          <code>${esc(c.cmd)}</code>
          <div class="cmd-desc">${esc(c.desc)}</div>
          <button class="mini-copy" data-copy="${esc(c.cmd)}" aria-label="Copy ${esc(c.cmd)}">⧉</button>
        </div>`).join('')}
      </div>
    </section>` : '';

  const labs = ch.labs.length ? `
    <section class="concept" id="ch${ch.id}-labs">
      <div class="concept-head"><h2><span class="hash">⚗</span>Hands-on labs</h2><span class="ref">${labsDone(ch)}/${totalLabSteps(ch)} steps</span></div>
      <p>Work through these in a safe environment. Tick each step to record your progress.</p>
      ${ch.labs.map((lab, li) => `<div class="lab">
        <div class="lab-head"><span class="lab-ico">LAB ${li + 1}</span><div><h4>${esc(lab.title)}</h4><div class="lab-goal">${esc(lab.goal)}</div></div></div>
        <ol>
          ${lab.steps.map((step, si) => {
            const key = `${ch.id}-${li}-${si}`;
            return `<li><input type="checkbox" id="lab-${key}" data-lab="${key}" ${state.labs[key] ? 'checked' : ''}><label for="lab-${key}"><span>${step}</span></label></li>`;
          }).join('')}
        </ol>
      </div>`).join('')}
    </section>` : '';

  const terms = ch.cards.length ? `
    <section class="concept" id="ch${ch.id}-terms">
      <div class="concept-head"><h2><span class="hash">▣</span>Key terms</h2><span class="ref">${cardsKnown(ch)}/${ch.cards.length} mastered</span></div>
      <p>Review these definitions, then drill them as flashcards.</p>
      <div class="chapter-grid">
        ${ch.cards.map((c, i) => `<div class="chapter-card" style="cursor:default;min-height:auto">
          <div class="cc-top"><span class="cc-num">${pad2(i + 1)}</span>${state.cards[`${ch.id}-${i}`] ? '<span class="chip accent">known</span>' : ''}</div>
          <h3 style="margin-top:6px">${esc(c.front)}</h3>
          <p style="-webkit-line-clamp:5;display:block">${esc(c.back)}</p>
        </div>`).join('')}
      </div>
      <div style="margin-top:14px"><a class="btn" href="#/flashcards">Open flashcard deck →</a></div>
    </section>` : '';

  const quiz = `
    <section class="concept" id="ch${ch.id}-quiz">
      <div class="concept-head"><h2><span class="hash">?</span>Check your understanding</h2><span class="ref">${qs.answered}/${qs.total} answered</span></div>
      <div class="quiz-head">
        <p style="margin:0">Choose the best answer. Feedback appears immediately.</p>
        <div style="display:flex;align-items:center;gap:12px">
          <span class="quiz-score" id="quizScore">Score <b>${qs.correct}</b> / ${qs.total}</span>
          <button class="btn btn-sm" data-reset-quiz="${ch.id}">Reset</button>
        </div>
      </div>
      ${ch.quiz.map((q, qi) => {
        const rec = state.quiz[ch.id];
        const chosen = rec && rec.answers ? rec.answers[qi] : null;
        const isDone = chosen != null;
        return `<div class="q" data-q="${qi}">
          <div class="q-title"><span class="q-num">Q${qi + 1}</span><span>${inline(q.q)}</span></div>
          <div class="q-opts">
            ${q.options.map((opt, oi) => {
              let cls = '';
              if (isDone) {
                if (oi === q.answer) cls = 'correct';
                else if (oi === chosen) cls = 'wrong';
              }
              return `<button class="q-opt ${cls}" data-answer="${oi}" data-qi="${qi}" ${isDone ? 'disabled' : ''}>
                <span class="q-key">${String.fromCharCode(65 + oi)}</span><span>${inline(opt)}</span>
              </button>`;
            }).join('')}
          </div>
          <div class="q-explain" ${isDone ? '' : 'hidden'}><b>Why</b>${inline(q.explain)}</div>
        </div>`;
      }).join('')}
    </section>`;

  const navCards = `<div class="next-prev">
    ${prev ? `<a class="np-card prev" href="#/chapter/${prev.id}"><span>← Previous</span><b>${esc(prev.title)}</b></a>` : '<span></span>'}
    ${next ? `<a class="np-card next" href="#/chapter/${next.id}"><span>Next chapter →</span><b>${esc(next.title)}</b></a>` : '<a class="np-card next" href="#/progress"><span>Finish →</span><b>Review your progress</b></a>'}
  </div>`;

  return `<div class="page chapter-page">
    <div class="crumbs"><a href="#/home">Overview</a><span>/</span><span>${esc(track.name || 'Chapter')}</span><span>/</span><span>Chapter ${ch.id}</span></div>
    <header class="chapter-head" data-num="${pad2(ch.id)}">
      <div class="eyebrow">Chapter ${pad2(ch.id)} · ${esc(track.name || '')}</div>
      <h1>${esc(ch.title)}</h1>
      <p class="lead">${esc(ch.blurb)}</p>
      <div class="head-meta">
        <span class="chip accent">§ ${esc(ch.sectionsRef || ch.ref || '')}</span>
        <span class="chip">${ch.minutes} min read</span>
        <span class="chip">${ch.commands.length} commands</span>
        <span class="chip">${ch.quiz.length} questions</span>
        ${done ? '<span class="chip accent">✓ Completed</span>' : ''}
      </div>
      <div class="head-actions">
        <button class="btn ${done ? 'done' : 'btn-primary'}" data-complete="${ch.id}">${done ? '✓ Marked complete' : 'Mark chapter complete'}</button>
        <a class="btn" href="#/flashcards">Practice flashcards</a>
        ${visMatch ? `<a class="btn btn-ghost" href="#/visuals/${visMatch.id}">See it in motion</a>` : ''}
        <button class="btn btn-ghost" onclick="window.print()">Print notes</button>
      </div>
      <div class="read-progress" aria-hidden="true"><i id="readBar"></i></div>
    </header>

    <div class="objectives">
      <h2>Learning objectives</h2>
      <ol>${ch.objectives.map(o => `<li>${esc(o)}</li>`).join('')}</ol>
    </div>

    <div class="chapter-layout">
      <div class="chapter-main">
        ${sections}
        ${commands}
        ${labs}
        ${terms}
        ${quiz}
        ${navCards}
      </div>
      <aside class="toc-rail" aria-label="On this page">
        <div class="rail-title">On this page</div>
        <nav>
          ${ch.sections.map(s => `<a href="#${esc(s.id)}" data-scroll="${esc(s.id)}">${esc(s.title)}</a>`).join('')}
          <a href="#ch${ch.id}-commands" data-scroll="ch${ch.id}-commands">Command reference</a>
          <a href="#ch${ch.id}-labs" data-scroll="ch${ch.id}-labs">Labs</a>
          <a href="#ch${ch.id}-terms" data-scroll="ch${ch.id}-terms">Key terms</a>
          <a href="#ch${ch.id}-quiz" data-scroll="ch${ch.id}-quiz">Quiz</a>
        </nav>
      </aside>
    </div>
  </div>`;
}

function cheatsheetView() {
  const all = [];
  CHAPTERS.forEach(ch => ch.commands.forEach(c => all.push({ ...c, ch })));
  return `<div class="page">
    <div class="eyebrow">Reference desk</div>
    <h1 style="font-size:clamp(1.8rem,3.4vw,2.6rem);margin-bottom:8px">Command index</h1>
    <p class="muted" style="max-width:65ch">Every command in the study guide, grouped by chapter. Filter by topic or search by name — then copy straight into a terminal.</p>
    <div class="search-line">
      <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m16 16 4.5 4.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
      <input id="cheatSearch" type="search" placeholder="Search commands, e.g. mount, rsync, systemctl…" autocomplete="off">
    </div>
    <div class="filter-row" id="cheatFilters">
      <button class="filter-chip active" data-cheat-filter="all">All chapters</button>
      ${CHAPTERS.map(c => `<button class="filter-chip" data-cheat-filter="${c.id}" title="${esc(c.title)}">Ch ${c.id}</button>`).join('')}
    </div>
    <div id="cheatResults"></div>
  </div>`;
}

function renderCheatResults(query = '') {
  const wrap = $('#cheatResults');
  if (!wrap) return;
  const q = query.trim().toLowerCase();
  let html = '';
  let count = 0;
  CHAPTERS.forEach(ch => {
    if (cheatFilter !== 'all' && String(ch.id) !== String(cheatFilter)) return;
    const cmds = ch.commands.filter(c => !q || (c.cmd + ' ' + c.desc).toLowerCase().includes(q));
    if (!cmds.length) return;
    count += cmds.length;
    html += `<div class="cheat-group">
      <h2>${esc(ch.title)} <span class="chip">Ch ${ch.id}</span></h2>
      <div class="cg-ref">§ ${esc(ch.sectionsRef || '')} · <a href="#/chapter/${ch.id}">open chapter notes</a></div>
      <div class="cmd-block">
        <div class="cmd-block-head"><span>Command</span><span>What it does</span></div>
        ${cmds.map(c => `<div class="cmd-row"><code>${esc(c.cmd)}</code><div class="cmd-desc">${esc(c.desc)}</div><button class="mini-copy" data-copy="${esc(c.cmd)}" aria-label="Copy command">⧉</button></div>`).join('')}
      </div>
    </div>`;
  });
  wrap.innerHTML = count ? html : `<div class="empty-state"><strong>No commands found</strong>Try a different term or chapter filter.</div>`;
}

function allCards() {
  const out = [];
  CHAPTERS.forEach(ch => ch.cards.forEach((card, i) => out.push({ ...card, ch, i })));
  return out;
}

function flashcardsView() {
  const cards = allCards();
  const known = cards.filter(c => state.cards[`${c.ch.id}-${c.i}`]).length;
  return `<div class="page">
    <div class="eyebrow">Spaced review</div>
    <h1 style="font-size:clamp(1.8rem,3.4vw,2.6rem);margin-bottom:8px">Flashcards</h1>
    <p class="muted" style="max-width:65ch">Tap a card to flip it. Mark the ones you know; the deck remembers. Shuffle to test yourself out of order.</p>
    <div class="deck-bar">
      <button class="btn btn-sm" id="shuffleDeck">⤨ Shuffle</button>
      <button class="btn btn-sm" id="resetDeck">Reset mastery</button>
      <div class="filter-row" style="margin:0 0 0 auto" id="deckFilters">
        <button class="filter-chip active" data-deck-filter="all">All</button>
        ${CHAPTERS.map(c => `<button class="filter-chip" data-deck-filter="${c.id}">Ch ${c.id}</button>`).join('')}
      </div>
    </div>
    <div class="deck-progress" id="deckProgress" style="margin-bottom:14px">${known} of ${cards.length} cards mastered</div>
    <div class="deck-grid" id="deckGrid"></div>
    <div class="deck-actions">
      <span class="deck-progress">Click card = flip · Click “Got it” = mark mastered</span>
      <a class="btn" href="#/cheatsheet">Command index →</a>
    </div>
  </div>`;
}

function renderDeck() {
  const grid = $('#deckGrid');
  if (!grid) return;
  let cards = allCards().filter(c => deckFilter === 'all' || String(c.ch.id) === String(deckFilter));
  if (deckShuffled) cards = shuffle(cards);
  const known = cards.filter(c => state.cards[`${c.ch.id}-${c.i}`]).length;
  const dp = $('#deckProgress');
  if (dp) dp.textContent = `${known} of ${cards.length} cards mastered in this view`;
  if (!cards.length) {
    grid.innerHTML = '<div class="empty-state"><strong>No cards in this chapter</strong>Try another filter.</div>';
    return;
  }
  grid.innerHTML = cards.map((c, n) => {
    const key = `${c.ch.id}-${c.i}`;
    const isKnown = !!state.cards[key];
    return `<div class="flashcard" data-flip="${n}" role="button" tabindex="0" aria-label="Flashcard: ${esc(c.front)}">
      <div class="fc-inner">
        <div class="fc-face front">
          <div class="fc-tag">Ch ${c.ch.id} · ${esc(c.ch.short || c.ch.title)}</div>
          <div class="fc-front-text">${esc(c.front)}</div>
          <div class="fc-hint"><span>tap to reveal</span><span class="${isKnown ? 'fc-known' : ''}">${isKnown ? '✓ mastered' : ''}</span></div>
        </div>
        <div class="fc-face back">
          <div class="fc-tag">Answer</div>
          <div class="fc-back-text">${esc(c.back)}</div>
          <div class="fc-hint"><span>tap to flip back</span><button class="btn btn-sm" data-known="${key}" style="pointer-events:auto">${isKnown ? '✓ Mastered' : 'Got it'}</button></div>
        </div>
      </div>
    </div>`;
  }).join('');
}

function examView() {
  return `<div class="page">
    <div class="eyebrow">Mixed review</div>
    <h1 style="font-size:clamp(1.8rem,3.4vw,2.6rem);margin-bottom:8px">Practice exam</h1>
    <p class="muted" style="max-width:66ch">25 questions drawn from across all 17 chapters. Answer everything, submit, and get a scored review with explanations. Aim for 80% before moving on.</p>
    <div id="examBody"></div>
  </div>`;
}

function startExam() {
  const pool = [];
  CHAPTERS.forEach(ch => ch.quiz.forEach((q, i) => pool.push({ ...q, ch, original: i })));
  examSet = shuffle(pool).slice(0, Math.min(25, pool.length));
  examAnswers = {};
  examStarted = Date.now();
  renderExam();
}
function renderExam() {
  const body = $('#examBody');
  if (!body) return;
  body.innerHTML = `
    <div class="exam-top">
      <div class="muted small">Question <b id="examCount">0</b> of ${examSet.length} answered</div>
      <div class="exam-timer" id="examTimer">00:00</div>
    </div>
    ${examSet.map((q, qi) => `<div class="exam-q" data-eq="${qi}">
      <div class="q-title"><span class="q-num">Q${qi + 1}</span><span>${inline(q.q)}</span></div>
      <div class="q-opts">
        ${q.options.map((o, oi) => `<button class="q-opt" data-exam-answer="${oi}" data-eq="${qi}"><span class="q-key">${String.fromCharCode(65 + oi)}</span><span>${inline(o)}</span></button>`).join('')}
      </div>
      <div class="q-explain" hidden><b>Why</b>${inline(q.explain)}</div>
    </div>`).join('')}
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:18px">
      <button class="btn btn-primary" id="submitExam">Submit exam</button>
      <button class="btn" id="newExam">New question set</button>
      <a class="btn btn-ghost" href="#/cheatsheet">Review commands</a>
    </div>`;
  const timer = $('#examTimer');
  clearInterval(examTimer);
  examTimer = setInterval(() => {
    if (!document.body.contains(timer)) { clearInterval(examTimer); return; }
    const s = Math.floor((Date.now() - examStarted) / 1000);
    timer.textContent = `${pad2(Math.floor(s / 60))}:${pad2(s % 60)}`;
  }, 1000);
}
function submitExam() {
  const answered = Object.keys(examAnswers).length;
  if (answered < examSet.length && !confirm(`You have answered ${answered} of ${examSet.length} questions. Submit anyway?`)) return;
  clearInterval(examTimer);
  let correct = 0;
  $$('.exam-q').forEach((qEl, qi) => {
    const q = examSet[qi];
    const picked = examAnswers[qi];
    if (picked === q.answer) correct++;
    $$('.q-opt', qEl).forEach(btn => {
      btn.disabled = true;
      btn.classList.remove('selected');
      const oi = Number(btn.dataset.examAnswer);
      if (oi === q.answer) btn.classList.add('correct');
      else if (oi === picked) btn.classList.add('wrong');
    });
    const ex = $('.q-explain', qEl);
    if (ex) ex.hidden = false;
  });
  const score = pct(correct, examSet.length);
  state.exam.push({ date: new Date().toISOString(), correct, total: examSet.length });
  saveState();
  $('#examBody').insertAdjacentHTML('afterbegin', `<div class="exam-result">
    <div class="er-grade">Your result</div>
    <div class="er-score">${score}%</div>
    <div class="er-grade">${correct} of ${examSet.length} correct</div>
    <p>${score >= 80 ? 'Strong pass. Your mental model is holding up — revisit any red answers below, then try a fresh question set.' : score >= 60 ? 'Solid foundation, but a few gaps remain. Review the explanations below and revisit those chapters.' : 'Worth another pass through the chapter notes and flashcards before retrying. Linux rewards patient repetition.'}</p>
    <button class="btn btn-primary" id="retakeExam">Try a new set</button>
  </div>`);
  const retake = $('#retakeExam');
  if (retake) retake.addEventListener('click', () => { startExam(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
  const btn = $('#submitExam'); if (btn) btn.disabled = true;
  const nb = $('#newExam'); if (nb) nb.disabled = true;
  toast(`Exam scored: ${score}%`);
}

function progressView() {
  const stats = totalStats();
  const done = CHAPTERS.filter(c => state.completed[c.id]).length;
  const p = pct(done, CHAPTERS.length);
  const quizzesTaken = CHAPTERS.filter(c => quizScore(c).answered > 0).length;
  const correct = CHAPTERS.reduce((n, c) => n + quizScore(c).correct, 0);
  const answered = CHAPTERS.reduce((n, c) => n + quizScore(c).answered, 0);
  const avg = answered ? Math.round((correct / answered) * 100) : 0;
  const known = CHAPTERS.reduce((n, c) => n + cardsKnown(c), 0);
  const labs = CHAPTERS.reduce((n, c) => n + labsDone(c), 0);
  const labTotal = CHAPTERS.reduce((n, c) => n + totalLabSteps(c), 0);
  const circumference = 2 * Math.PI * 66;
  const offset = circumference - (p / 100) * circumference;
  return `<div class="page">
    <div class="eyebrow">Your notebook</div>
    <h1 style="font-size:clamp(1.8rem,3.4vw,2.6rem);margin-bottom:8px">My progress</h1>
    <p class="muted" style="max-width:65ch">Stored in this browser only. No account, no telemetry — just your run history.</p>

    <div class="figure" style="margin-top:22px">
      <div class="ring-wrap">
        <div class="ring">
          <svg width="160" height="160" viewBox="0 0 160 160" aria-hidden="true">
            <circle class="ring-bg" cx="80" cy="80" r="66" fill="none" stroke-width="9"/>
            <circle class="ring-fg" cx="80" cy="80" r="66" fill="none" stroke-width="9" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"/>
          </svg>
          <div class="ring-label"><b>${p}%</b><span>complete</span></div>
        </div>
        <div>
          <div class="prog-stats">
            <div class="prog-stat"><b>${done}/${CHAPTERS.length}</b><span>Chapters complete</span></div>
            <div class="prog-stat"><b>${labs}/${labTotal}</b><span>Lab steps done</span></div>
            <div class="prog-stat"><b>${known}/${stats.cards}</b><span>Cards mastered</span></div>
          </div>
          <div class="prog-stats" style="margin-top:10px">
            <div class="prog-stat"><b>${correct}/${answered}</b><span>Quiz answers correct</span></div>
            <div class="prog-stat"><b>${avg}%</b><span>Quiz accuracy</span></div>
            <div class="prog-stat"><b>${quizzesTaken}/${CHAPTERS.length}</b><span>Quizzes attempted</span></div>
          </div>
        </div>
      </div>
    </div>

    <div class="section-head"><div><h2>Chapter ledger</h2><p>Where you are across the book.</p></div>
      <div style="display:flex;gap:8px"><button class="btn btn-sm" id="exportProgress">Export JSON</button><button class="btn btn-sm" id="resetProgress">Reset all</button></div>
    </div>
    <div class="prog-wrap">
      <table class="prog-table">
        <thead><tr><th>Chapter</th><th>Read</th><th>Quiz</th><th>Labs</th><th>Cards</th><th></th></tr></thead>
        <tbody>
          ${CHAPTERS.map(c => {
            const qs = quizScore(c);
            const ld = labsDone(c), lt = totalLabSteps(c), kd = cardsKnown(c);
            return `<tr>
              <td class="pt-title"><a href="#/chapter/${c.id}">${pad2(c.id)} · ${esc(c.title)}</a></td>
              <td>${state.completed[c.id] ? '<span class="chip accent">✓</span>' : '<span class="chip">—</span>'}</td>
              <td>${qs.answered ? `${qs.correct}/${qs.total}` : '—'}</td>
              <td><span class="mini-bar"><i style="width:${pct(ld, lt)}%"></i></span> ${ld}/${lt}</td>
              <td><span class="mini-bar"><i style="width:${pct(kd, c.cards.length)}%"></i></span> ${kd}/${c.cards.length}</td>
              <td><a class="btn btn-sm" href="#/chapter/${c.id}">${state.completed[c.id] ? 'Review' : 'Study'}</a></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
    ${state.exam.length ? `<div class="section-head"><div><h2>Exam history</h2></div></div>
      <div class="prog-table-wrap"><table class="prog-table"><thead><tr><th>Date</th><th>Score</th><th>Result</th></tr></thead><tbody>
      ${state.exam.slice().reverse().slice(0, 10).map(e => `<tr><td>${new Date(e.date).toLocaleDateString()}</td><td>${e.correct}/${e.total}</td><td>${pct(e.correct, e.total)}%</td></tr>`).join('')}
      </tbody></table></div>` : ''}
  </div>`;
}

function notFoundView() {
  return `<div class="page"><div class="empty-state" style="margin-top:60px"><strong>Page not found</strong>The chapter you asked for is not in this study guide.<br><br><a class="btn" href="#/home">Back to overview</a></div></div>`;
}

/* ---------- visual explainers ---------- */
function visualsData() {
  return (window.HLW && HLW.visuals) ? HLW.visuals : null;
}
function visualFor(id) {
  const d = visualsData();
  if (!d) return null;
  return d.items[id] || d.items[d.order[0]] || null;
}
function visStageHTML(v, i, failed) {
  const s = v.stages[i];
  const n = v.stages.length;
  const link = s.link;
  return `<article class="vs-card ${failed ? 'has-fail' : ''}">
    <div class="vs-card-top">
      <span class="vs-stepno">Stage ${pad2(i + 1)} / ${pad2(n)}</span>
      <span class="vs-actor">${esc(s.actor)}</span>
    </div>
    <h2>${esc(s.title)}</h2>
    <p class="vs-summary">${esc(s.summary)}</p>
    <div class="vs-detail">${s.detail}</div>
    <div class="vs-try">
      <div class="vs-try-label"><span>Terminal</span><span>Try it</span></div>
      ${codeBlock(s.cmd)}
    </div>
    <div class="vs-foot">
      <a class="btn btn-sm" href="#/chapter/${link.ch}/${link.section}">${esc(link.label)} →</a>
      ${s.fail ? `<button class="btn btn-sm ${failed ? 'btn-danger' : 'btn-ghost'}" data-vis-fail>${failed ? 'Clear failure' : 'Inject failure'}</button>` : ''}
    </div>
    ${failed && s.fail ? `<div class="vs-failure" role="status">
      <div class="vf-head"><span class="vf-badge">Failure</span><b>${esc(s.fail.title)}</b></div>
      <div class="vf-detail">${s.fail.detail}</div>
      <div class="vf-code">${codeBlock(s.fail.cmd)}</div>
      <button class="btn btn-sm" data-vis-recover>Recover from failure</button>
    </div>` : ''}
  </article>`;
}
function visualsView(id) {
  const d = visualsData();
  if (!d) return '<div class="page"><div class="empty-state"><strong>Visuals not loaded</strong>Check that data/visuals.js is present.</div></div>';
  const activeId = d.items[id] ? id : d.order[0];
  const v = d.items[activeId];
  const tabs = d.order.map(k => {
    const x = d.items[k];
    return `<a class="vis-tab ${k === activeId ? 'active' : ''}" href="#/visuals/${k}">
      <span class="vt-glyph" aria-hidden="true">${x.glyph}</span>
      <span class="vt-text"><b>${esc(x.short)}</b><em>${x.stages.length} stages</em></span>
    </a>`;
  }).join('');
  const stops = v.stages.map((s, i) => `<button class="vis-stop tone-${s.tone}" data-vis-stop="${i}" aria-label="Stage ${i + 1}: ${esc(s.label)}">
      <span class="vs-dot">${i + 1}</span>
      <span class="vs-label">${esc(s.label)}</span>
      <span class="vs-sub">${esc(s.sub)}</span>
    </button>`).join('');
  return `<div class="page visuals-page">
    <div class="eyebrow">Under the hood</div>
    <h1 style="font-size:clamp(1.8rem,3.4vw,2.6rem);margin-bottom:8px">See the machine move.</h1>
    <p class="muted" style="max-width:68ch">Three interactive walkthroughs of the processes the book keeps coming back to. Play them, scrub them, and inject the failures that turn a normal boot or request into a debugging session.</p>
    <nav class="vis-tabs" aria-label="Visual explainers">${tabs}</nav>
    <section class="vis-shell" data-vis="${activeId}">
      <header class="vis-head">
        <div>
          <div class="vis-kicker">Interactive explainer</div>
          <h2>${esc(v.title)}</h2>
          <p>${esc(v.blurb)}</p>
        </div>
        <div class="vis-chapters">${v.chapters.map(cid => `<a class="chip" href="#/chapter/${cid}">Ch ${cid}</a>`).join('')}</div>
      </header>
      <div class="vis-controls">
        <button class="btn btn-sm btn-icon" data-vis-prev aria-label="Previous stage" title="Previous stage">←</button>
        <button class="btn btn-primary btn-sm" data-vis-play aria-label="Play walkthrough">▶ Play</button>
        <button class="btn btn-sm btn-icon" data-vis-next aria-label="Next stage" title="Next stage">→</button>
        <input class="vis-scrub" id="visScrub" type="range" min="0" max="${v.stages.length - 1}" step="1" value="0" aria-label="Walkthrough stage">
        <span class="vis-count" id="visCount">1 / ${v.stages.length}</span>
      </div>
      <div class="vis-rail-wrap">
        <div class="vis-rail" id="visRail">
          <div class="vis-flow" aria-hidden="true"><i id="visPulse"></i></div>
          ${stops}
        </div>
      </div>
      <div id="visStage" aria-live="polite"></div>
      <div class="vis-keybar"><span><kbd>←</kbd><kbd>→</kbd> step</span><span><kbd>space</kbd> play / pause</span><span>Click a stage to inspect it</span></div>
    </section>
  </div>`;
}
function visUpdate(scrollRail) {
  const v = visualFor(visState.id);
  if (!v) return;
  const n = v.stages.length;
  visState.index = Math.max(0, Math.min(n - 1, visState.index));
  const s = v.stages[visState.index];
  const rail = $('#visRail');
  if (!rail) return;
  $$('.vis-stop', rail).forEach((el, i) => {
    el.classList.toggle('active', i === visState.index);
    el.classList.toggle('done', i < visState.index);
    el.classList.toggle('failed', i === visState.index && visState.failed);
    if (i === visState.index) el.setAttribute('aria-current', 'step');
    else el.removeAttribute('aria-current');
  });
  const stage = $('#visStage');
  if (stage) stage.innerHTML = visStageHTML(v, visState.index, visState.failed);
  const count = $('#visCount');
  if (count) count.textContent = `${visState.index + 1} / ${n}`;
  const scrub = $('#visScrub');
  if (scrub) {
    scrub.value = String(visState.index);
    scrub.style.setProperty('--fill', `${n > 1 ? (visState.index / (n - 1)) * 100 : 0}%`);
  }
  const play = $('[data-vis-play]');
  if (play) {
    play.innerHTML = visState.playing ? '❚❚ Pause' : '▶ Play';
    play.setAttribute('aria-label', visState.playing ? 'Pause walkthrough' : 'Play walkthrough');
  }
  const wrap = rail.closest('.vis-rail-wrap');
  if (wrap) wrap.className = `vis-rail-wrap tone-${s.tone}`;
  const active = $('.vis-stop.active', rail);
  const pulse = $('#visPulse');
  if (active && pulse) {
    pulse.style.left = `${active.offsetLeft + active.offsetWidth / 2}px`;
  }
  if (scrollRail && active && rail.scrollWidth > rail.clientWidth + 4) {
    const left = active.offsetLeft - rail.clientWidth / 2 + active.offsetWidth / 2;
    rail.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
  }
}
function visPause() {
  if (visState.timer) { clearInterval(visState.timer); visState.timer = null; }
  visState.playing = false;
}
function visPlay() {
  const v = visualFor(visState.id);
  if (!v) return;
  if (visState.playing) { visPause(); visUpdate(false); return; }
  if (visState.index >= v.stages.length - 1) visState.index = 0;
  visState.playing = true;
  visState.failed = false;
  visState.timer = setInterval(() => {
    const vv = visualFor(visState.id);
    if (!vv) return;
    if (visState.index >= vv.stages.length - 1) { visPause(); visUpdate(false); return; }
    visState.index++;
    visState.failed = false;
    visUpdate(true);
  }, 3800);
  visUpdate(false);
}
function visMove(delta) {
  if (currentRoute().view !== 'visuals') return;
  const v = visualFor(visState.id);
  if (!v) return;
  visPause();
  visState.failed = false;
  visState.index = (visState.index + delta + v.stages.length) % v.stages.length;
  visUpdate(true);
}
function initVisuals(route) {
  const d = visualsData();
  if (!d) return;
  const activeId = d.items[route.id] ? route.id : d.order[0];
  const v = d.items[activeId];
  visState = {
    id: activeId,
    index: Math.max(0, Math.min(v.stages.length - 1, route.stage || 0)),
    playing: false, failed: false, timer: null
  };
  const rail = $('#visRail');
  if (rail) rail.addEventListener('click', e => {
    const b = e.target.closest('[data-vis-stop]');
    if (!b) return;
    visPause();
    visState.index = Number(b.dataset.visStop);
    visState.failed = false;
    visUpdate(true);
  });
  const stage = $('#visStage');
  if (stage) stage.addEventListener('click', e => {
    if (e.target.closest('[data-vis-fail]')) {
      visPause();
      visState.failed = !visState.failed;
      visUpdate(false);
      return;
    }
    if (e.target.closest('[data-vis-recover]')) {
      visPause();
      visState.failed = false;
      visUpdate(false);
    }
  });
  const prev = $('[data-vis-prev]'), next = $('[data-vis-next]'), play = $('[data-vis-play]');
  if (prev) prev.addEventListener('click', () => visMove(-1));
  if (next) next.addEventListener('click', () => visMove(1));
  if (play) play.addEventListener('click', visPlay);
  const scrub = $('#visScrub');
  if (scrub) scrub.addEventListener('input', e => {
    visPause();
    visState.index = Number(e.target.value);
    visState.failed = false;
    visUpdate(false);
  });
  const onResize = () => visUpdate(true);
  window.addEventListener('resize', onResize);
  const onHide = () => { if (document.hidden && visState.playing) { visPause(); visUpdate(false); } };
  document.addEventListener('visibilitychange', onHide);
  cleanupFns.push(() => {
    visPause();
    window.removeEventListener('resize', onResize);
    document.removeEventListener('visibilitychange', onHide);
  });
  visUpdate(true);
}

/* ---------- search ---------- */
function buildSearchIndex() {
  const items = [];
  CHAPTERS.forEach(ch => {
    items.push({ kind: 'chapter', title: `Ch ${ch.id}: ${ch.title}`, sub: ch.blurb, href: `#/chapter/${ch.id}`, ref: `Ch ${ch.id}`, text: ch.title + ' ' + ch.blurb });
    ch.sections.forEach(s => items.push({
      kind: 'notes', title: s.title, sub: `Chapter ${ch.id} · ${ch.title}`,
      href: `#/chapter/${ch.id}/${s.id}`, ref: `§ ${s.ref || ''}`, text: s.title + ' ' + strip(s.html) + ' ' + (s.callout ? s.callout.text : '')
    }));
    ch.commands.forEach(c => items.push({
      kind: 'command', title: c.cmd, sub: c.desc, href: `#/chapter/${ch.id}/ch${ch.id}-commands`, ref: `Ch ${ch.id}`, text: c.cmd + ' ' + c.desc
    }));
    ch.cards.forEach(c => items.push({
      kind: 'card', title: c.front, sub: c.back, href: `#/flashcards`, ref: `Ch ${ch.id}`, text: c.front + ' ' + c.back
    }));
    ch.quiz.forEach(q => items.push({
      kind: 'quiz', title: q.q, sub: `Chapter ${ch.id} quiz`, href: `#/chapter/${ch.id}/ch${ch.id}-quiz`, ref: `Ch ${ch.id}`, text: q.q + ' ' + q.options.join(' ')
    }));
  });
  const vd = visualsData();
  if (vd) vd.order.forEach(k => {
    const v = vd.items[k];
    v.stages.forEach((s, i) => items.push({
      kind: 'visual', title: s.title, sub: `${v.label} · stage ${i + 1} of ${v.stages.length}`,
      href: `#/visuals/${k}/${i}`, ref: 'Visual', text: s.title + ' ' + s.summary + ' ' + strip(s.detail)
    }));
  });
  return items;
}
function openSearch() {
  const modal = $('#searchModal');
  if (!modal) return;
  modal.hidden = false;
  const input = $('#searchInput');
  input.value = '';
  searchSelection = 0;
  renderSearchResults('');
  setTimeout(() => input.focus(), 20);
  document.body.style.overflow = 'hidden';
}
function closeSearch() {
  const modal = $('#searchModal');
  if (!modal) return;
  modal.hidden = true;
  document.body.style.overflow = '';
}
function renderSearchResults(query) {
  const box = $('#searchResults');
  if (!box) return;
  const q = query.trim().toLowerCase();
  if (!q) {
    const recents = CHAPTERS.slice(0, 5).map(ch => ({ kind: 'chapter', title: `Ch ${ch.id}: ${ch.title}`, sub: ch.blurb, href: `#/chapter/${ch.id}`, ref: `Ch ${ch.id}` }));
    searchResults = recents;
    box.innerHTML = `<div class="sr-group">Start here</div>` + recents.map((r, i) => srItem(r, i)).join('') +
      `<div class="sr-group">Tip</div><div class="search-empty" style="padding:10px 12px;text-align:left">Search across chapter notes, ${totalStats().commands} commands, ${totalStats().cards} flashcards and every quiz question.</div>`;
    return;
  }
  const terms = q.split(/\s+/);
  const scored = (searchIndex || [])
    .map(item => {
      const hay = (item.title + ' ' + item.sub + ' ' + item.text + ' ' + item.ref).toLowerCase();
      let score = 0;
      terms.forEach(t => {
        if (item.title.toLowerCase().includes(t)) score += 8;
        if (item.sub.toLowerCase().includes(t)) score += 3;
        if (hay.includes(t)) score += 1;
      });
      return { item, score };
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 24)
    .map(x => x.item);
  searchResults = scored;
  searchSelection = 0;
  if (!scored.length) {
    box.innerHTML = `<div class="search-empty"><strong>No results for “${esc(query)}”</strong><br>Try “inode”, “systemctl”, “subnet” or “rsync”.</div>`;
    return;
  }
  const groups = { chapter: [], notes: [], visual: [], command: [], card: [], quiz: [] };
  scored.forEach(r => (groups[r.kind] || groups.notes).push(r));
  box.innerHTML = Object.keys(groups).filter(k => groups[k].length).map(k => {
    const label = { chapter: 'Chapters', notes: 'Notes', visual: 'Visuals', command: 'Commands', card: 'Flashcards', quiz: 'Quiz' }[k];
    return `<div class="sr-group">${label}</div>` + groups[k].map(r => srItem(r, searchResults.indexOf(r))).join('');
  }).join('');
}
function srItem(r, i) {
  return `<a class="sr-item${i === searchSelection ? ' sel' : ''}" href="${r.href}" data-sr="${i}">
    <span class="sr-kind">${r.kind}</span>
    <span class="sr-main"><span class="sr-title">${esc(r.title)}</span><span class="sr-sub">${esc(r.sub || '')}</span></span>
    <span class="sr-ref">${esc(r.ref || '')}</span>
  </a>`;
}
function moveSearch(delta) {
  if (!searchResults.length) return;
  searchSelection = (searchSelection + delta + searchResults.length) % searchResults.length;
  $$('#searchResults .sr-item').forEach((el, i) => el.classList.toggle('sel', i === searchSelection));
  const el = $$('#searchResults .sr-item')[searchSelection];
  if (el) el.scrollIntoView({ block: 'nearest' });
}
function activateSearch() {
  const r = searchResults[searchSelection];
  if (r) { closeSearch(); location.hash = r.href.replace(/^#/, ''); }
}

/* ---------- render + events ---------- */
let cleanupFns = [];
function cleanup() {
  cleanupFns.forEach(fn => { try { fn(); } catch (e) {} });
  cleanupFns = [];
  if (scrollHandler) { window.removeEventListener('scroll', scrollHandler); scrollHandler = null; }
  if (examTimer) { clearInterval(examTimer); examTimer = null; }
}
function render() {
  cleanup();
  closeNav();
  const route = currentRoute();
  const app = $('#app');
  if (!CHAPTERS.length) {
    app.innerHTML = '<div class="page"><div class="empty-state"><strong>No chapter data loaded</strong>Make sure the data files are present.</div></div>';
    return;
  }
  if (route.view === 'home') app.innerHTML = homeView();
  else if (route.view === 'chapter') app.innerHTML = chapterView(route.id, route.anchor);
  else if (route.view === 'cheatsheet') { app.innerHTML = cheatsheetView(); renderCheatResults(''); }
  else if (route.view === 'flashcards') { app.innerHTML = flashcardsView(); renderDeck(); }
  else if (route.view === 'exam') { app.innerHTML = examView(); startExam(); }
  else if (route.view === 'progress') app.innerHTML = progressView();
  else if (route.view === 'visuals') app.innerHTML = visualsView(route.id);
  else app.innerHTML = notFoundView();

  syncChrome();
  const y = route.view === 'chapter' && route.anchor ? null : 0;
  if (y !== null) window.scrollTo(0, 0);
  initView(route);
  if (route.anchor) {
    setTimeout(() => {
      const target = document.getElementById(route.anchor);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  }
}

function initView(route) {
  if (route.view === 'chapter') initChapterPage(route);
  if (route.view === 'cheatsheet') initCheatsheet();
  if (route.view === 'flashcards') initFlashcards();
  if (route.view === 'exam') initExam();
  if (route.view === 'progress') initProgress();
  if (route.view === 'visuals') initVisuals(route);
}

function initChapterPage(route) {
  const ch = byId(route.id);
  if (!ch) return;
  const bar = $('#readBar');
  const tocLinks = $$('.toc-rail a[data-scroll]');
  const sections = $$('.concept[id]');
  scrollHandler = () => {
    const doc = document.documentElement;
    const max = doc.scrollHeight - window.innerHeight;
    const p = max > 0 ? Math.min(100, Math.round((window.scrollY / max) * 100)) : 0;
    if (bar) bar.style.width = p + '%';
    let active = null;
    sections.forEach(s => {
      const rect = s.getBoundingClientRect();
      if (rect.top <= 150) active = s.id;
    });
    tocLinks.forEach(a => a.classList.toggle('active', a.dataset.scroll === active));
  };
  window.addEventListener('scroll', scrollHandler, { passive: true });
  scrollHandler();
  cleanupFns.push(() => { if (scrollHandler) window.removeEventListener('scroll', scrollHandler); });

  $$('.toc-rail a[data-scroll]').forEach(a => a.addEventListener('click', e => {
    e.preventDefault();
    const el = document.getElementById(a.dataset.scroll);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));
}

function initCheatsheet() {
  const input = $('#cheatSearch');
  if (input) input.addEventListener('input', e => renderCheatResults(e.target.value));
  $$('#cheatFilters [data-cheat-filter]').forEach(btn => btn.addEventListener('click', () => {
    cheatFilter = btn.dataset.cheatFilter;
    $$('#cheatFilters .filter-chip').forEach(b => b.classList.toggle('active', b === btn));
    renderCheatResults(input ? input.value : '');
  }));
}

function initFlashcards() {
  const shuffleBtn = $('#shuffleDeck');
  if (shuffleBtn) shuffleBtn.addEventListener('click', () => { deckShuffled = !deckShuffled; renderDeck(); toast(deckShuffled ? 'Deck shuffled' : 'Deck in book order'); });
  const resetBtn = $('#resetDeck');
  if (resetBtn) resetBtn.addEventListener('click', () => {
    if (!confirm('Reset flashcard mastery for all chapters?')) return;
    state.cards = {};
    saveState(); renderDeck(); toast('Flashcard mastery reset');
  });
  $$('#deckFilters [data-deck-filter]').forEach(btn => btn.addEventListener('click', () => {
    deckFilter = btn.dataset.deckFilter;
    $$('#deckFilters .filter-chip').forEach(b => b.classList.toggle('active', b === btn));
    renderDeck();
  }));
}

function initExam() {}

function initProgress() {
  const reset = $('#resetProgress');
  if (reset) reset.addEventListener('click', () => {
    if (!confirm('Erase all progress: chapters, quiz answers, labs, flashcards and exam history?')) return;
    state = { completed: {}, quiz: {}, labs: {}, cards: {}, last: null, exam: [] };
    try { localStorage.removeItem(STORE_KEY); } catch (e) {}
    saveState(); render(); toast('Progress reset');
  });
  const exp = $('#exportProgress');
  if (exp) exp.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'how-linux-works-progress.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast('Progress exported');
  });
}

/* ---------- global click delegation ---------- */
document.addEventListener('click', e => {
  const copy = e.target.closest('[data-copy]');
  if (copy) {
    e.preventDefault();
    copyText(copy.dataset.copy).then(() => {
      copy.classList.add('copied');
      if (copy.classList.contains('copy-btn')) copy.textContent = 'copied';
      toast('Copied to clipboard');
      setTimeout(() => { copy.classList.remove('copied'); if (copy.classList.contains('copy-btn')) copy.textContent = 'copy'; }, 1300);
    });
    return;
  }

  const complete = e.target.closest('[data-complete]');
  if (complete) {
    const id = complete.dataset.complete;
    state.completed[id] = !state.completed[id];
    if (!state.completed[id]) delete state.completed[id];
    saveState();
    toast(state.completed[id] ? 'Chapter marked complete' : 'Chapter reopened');
    complete.outerHTML = `<button class="btn ${state.completed[id] ? 'done' : 'btn-primary'}" data-complete="${id}">${state.completed[id] ? '✓ Marked complete' : 'Mark chapter complete'}</button>`;
    const chips = $$('.head-meta .chip');
    return;
  }

  const ans = e.target.closest('[data-answer]');
  if (ans) {
    const ch = byId(currentRoute().id);
    if (!ch) return;
    const qi = Number(ans.dataset.qi);
    const oi = Number(ans.dataset.answer);
    if (!state.quiz[ch.id]) state.quiz[ch.id] = { answers: {} };
    if (!state.quiz[ch.id].answers) state.quiz[ch.id].answers = {};
    if (state.quiz[ch.id].answers[qi] != null) return;
    state.quiz[ch.id].answers[qi] = oi;
    saveState();
    const q = ch.quiz[qi];
    const qEl = ans.closest('.q');
    $$('.q-opt', qEl).forEach(btn => {
      btn.disabled = true;
      const n = Number(btn.dataset.answer);
      if (n === q.answer) btn.classList.add('correct');
      else if (n === oi) btn.classList.add('wrong');
    });
    const ex = $('.q-explain', qEl);
    if (ex) ex.hidden = false;
    const sc = quizScore(ch);
    const scoreEl = $('#quizScore');
    if (scoreEl) scoreEl.innerHTML = `Score <b>${sc.correct}</b> / ${sc.total}`;
    const refEl = $('.concept-head .ref', $('#ch' + ch.id + '-quiz'));
    if (refEl) refEl.textContent = `${sc.answered}/${sc.total} answered`;
    return;
  }

  const resetQuiz = e.target.closest('[data-reset-quiz]');
  if (resetQuiz) {
    const id = resetQuiz.dataset.resetQuiz;
    if (!confirm('Reset this chapter quiz?')) return;
    delete state.quiz[id];
    saveState(); render(); toast('Quiz reset');
    return;
  }

  const known = e.target.closest('[data-known]');
  if (known) {
    e.stopPropagation();
    e.preventDefault();
    const key = known.dataset.known;
    state.cards[key] = !state.cards[key];
    if (!state.cards[key]) delete state.cards[key];
    saveState();
    renderDeck();
    toast(state.cards[key] ? 'Card mastered' : 'Card marked for review');
    return;
  }

  const card = e.target.closest('.flashcard');
  if (card) {
    card.classList.toggle('flipped');
    return;
  }

  const examOpt = e.target.closest('[data-exam-answer]');
  if (examOpt) {
    const qi = Number(examOpt.dataset.eq);
    const oi = Number(examOpt.dataset.examAnswer);
    examAnswers[qi] = oi;
    const qEl = examOpt.closest('.exam-q');
    $$('.q-opt', qEl).forEach(b => b.classList.toggle('selected', b === examOpt));
    const count = $('#examCount');
    if (count) count.textContent = Object.keys(examAnswers).length;
    return;
  }

  if (e.target.closest('#submitExam')) { submitExam(); return; }
  if (e.target.closest('#newExam')) { startExam(); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }

  if (e.target.closest('#menuBtn')) {
    if (document.body.classList.contains('nav-open')) closeNav(); else openNav();
    return;
  }
  if (e.target.closest('#themeBtn')) { toggleTheme(); return; }
  if (e.target.closest('#searchBtn')) { openSearch(); return; }
  if (e.target === $('#searchModal') || e.target.closest('[data-close-search]')) { closeSearch(); return; }
  if (e.target.closest('#scrim')) { closeNav(); return; }
  const sr = e.target.closest('.sr-item');
  if (sr) closeSearch();
});

document.addEventListener('change', e => {
  const lab = e.target.closest('[data-lab]');
  if (lab) {
    const key = lab.dataset.lab;
    state.labs[key] = lab.checked;
    if (!lab.checked) delete state.labs[key];
    saveState();
    const ch = byId(currentRoute().id);
    if (ch) {
      const ref = $('#ch' + ch.id + '-labs .ref');
      if (ref) ref.textContent = `${labsDone(ch)}/${totalLabSteps(ch)} steps`;
    }
  }
});

document.addEventListener('keydown', e => {
  const modal = $('#searchModal');
  const modalOpen = modal && !modal.hidden;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    if (modalOpen) closeSearch(); else openSearch();
    return;
  }
  if (e.key === '/' && !modalOpen && !/input|textarea|select/i.test(document.activeElement.tagName)) {
    e.preventDefault(); openSearch(); return;
  }
  if (modalOpen) {
    if (e.key === 'Escape') { closeSearch(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); moveSearch(1); return; }
    if (e.key === 'ArrowUp') { e.preventDefault(); moveSearch(-1); return; }
    if (e.key === 'Enter') { e.preventDefault(); activateSearch(); return; }
  }
  if ((e.key === 'Enter' || e.key === ' ') && e.target.closest && e.target.closest('.flashcard') && !e.target.closest('button')) {
    e.preventDefault();
    e.target.closest('.flashcard').click();
    return;
  }
  if (currentRoute().view === 'visuals') {
    const tag = (e.target.tagName || '').toLowerCase();
    const typing = /input|textarea|select/.test(tag);
    if (!typing && e.key === 'ArrowRight') { e.preventDefault(); visMove(1); return; }
    if (!typing && e.key === 'ArrowLeft') { e.preventDefault(); visMove(-1); return; }
    if (!/input|textarea|select|button|a/.test(tag) && e.key === ' ') { e.preventDefault(); visPlay(); return; }
  }
  if (e.key === 'Escape' && document.body.classList.contains('nav-open')) closeNav();
});

/* ---------- boot ---------- */
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

(function boot() {
  initTheme();
  if (!window.HLW) {
    document.getElementById('app').innerHTML = '<div class="page"><div class="empty-state"><strong>Book data missing</strong>book.js did not load.</div></div>';
    return;
  }
  renderChapterNav();
  searchIndex = buildSearchIndex();
  const searchInput = $('#searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', e => renderSearchResults(e.target.value));
  }

  window.addEventListener('hashchange', render);
  render();
  syncChrome();

  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    });
  }
})();
