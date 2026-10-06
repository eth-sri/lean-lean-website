// Router and shell. One page: the intro and leaderboard, below them the repository
// viewer for the selected repository, then the method and the citation.
//   (no hash)                   leaderboard + the example run below, Graph view
//   #/                          leaderboard only (the viewer closed)
//   #/graph/<id>[/<model>[/<declaration>]]  leaderboard + repository viewer, Graph view (the default),
//                                           with that declaration open in the inspector
//   #/repo/<id>[/<model>[/<file path>]]      leaderboard + repository viewer, Diff view, on that file
//   #/trace/<id>[/<model>]      leaderboard + repository viewer, the agent's trace
//   #/model/<model>             a model's run configuration, over whatever is open
// <model> is an agent's short key, or `prep` for the repository before and after preprocessing.
// Every address is a link that can be shared: the viewer keeps it in step with what is open.
import { h, load, registerLogos } from './util.js?v=6082c9e522';
import { renderLeaderboard, renderMethod, renderCitation } from './leaderboard.js?v=6082c9e522';
// The repository viewer (diff, graph, charts) and the full benchmark data load
// only when a repository is opened; the leaderboard needs one small file.

// The run the page opens on: Opus 5 on Arthur742Ramos/Metatheory, the compact
// confluence repository the paper uses as its example.
const EXAMPLE = { id: 'palomar__2026-09-01-000010', short: 'opus' };
const EXAMPLE_HASH = `#/graph/${EXAMPLE.id}/${EXAMPLE.short}`;

const view = document.getElementById('view');
let board = null;
let bench = null;
let boardEl = null;   // the mounted leaderboard page
let panel = null;     // full-width host for the repository viewer
let cleanup = null;   // tears down the current repository viewer
let shownRepo = null;
let openedFrom = null; // the address before a model's configuration was opened
const loadRepoPage = () => import('./repo.js?v=6082c9e522');
const loadConfig = () => import('./config.js?v=6082c9e522');
// Colours the scripts compute (heatmap ramp, graph, origin bars) are read from
// site.css's custom properties. Not every browser holds module scripts until the
// stylesheet has applied, and on a cold load an empty property turns the whole
// heatmap black; so the first render waits for it.
const styled = () => getComputedStyle(document.documentElement).getPropertyValue('--z0').trim() !== '';
const stylesReady = styled() ? Promise.resolve() : new Promise((resolve) => {
  const link = document.querySelector('link[rel="stylesheet"][href*="site.css"]');
  let settled = false;
  const finish = () => { settled = true; resolve(); };
  const done = () => { if (settled) return; if (styled()) finish(); else requestAnimationFrame(done); };
  link?.addEventListener('load', done, { once: true });
  link?.addEventListener('error', finish, { once: true });
  // Also poll: a stylesheet that finished between the check and the listener fires no event.
  requestAnimationFrame(done);
});
const loadBoard = async () => {
  if (!board) {
    await stylesReady;
    board = await load('data/leaderboard.json');
    registerLogos(board.logos);
  }
  return board;
};

function mountBoard() {
  if (boardEl && view.contains(boardEl)) return false;
  const host = h('div');
  renderLeaderboard(host, board);
  boardEl = host.firstElementChild;
  panel = h('section', { class: 'repo-panel', 'aria-label': 'Repository viewer', hidden: true });
  view.replaceChildren(boardEl, panel, renderMethod(board), renderCitation());
  return true;
}

// Mark the selected repository column (and the agent's cell) in the leaderboard.
function markSelection(id, short) {
  for (const el of boardEl.querySelectorAll('.sel, .sel-col')) el.classList.remove('sel', 'sel-col');
  if (!id) return;
  for (const el of boardEl.querySelectorAll(`[data-repo="${CSS.escape(id)}"]`)) {
    el.classList.add('sel-col');
    if (short && el.dataset.model === short) el.classList.add('sel');
  }
}

// The route's parts; an empty address shows the example.
const routeParts = () => (location.hash ? location.hash : EXAMPLE_HASH).replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);

async function route() {
  const parts = routeParts();
  const isRepo = ['repo', 'graph', 'trace'].includes(parts[0]) && parts[1];
  const isModel = parts[0] === 'model' && parts[1];
  if (parts.length && !isRepo && !isModel) { location.replace('#/'); return; }
  try {
    await loadBoard();
    const fresh = mountBoard();
    if (isModel) {
      // A dialog over the page: the leaderboard and any open repository stay as they are.
      const { openModelConfig } = await loadConfig();
      const from = openedFrom;
      const shown = openModelConfig(board, parts[1], () => {
        if (!location.hash.startsWith('#/model/')) return;
        if (from != null) history.back(); else location.replace('#/');
      });
      if (!shown) location.replace('#/');
      return;
    }
    if (document.querySelector('dialog.cfg-dialog[open]')) (await loadConfig()).closeModelConfig();
    if (!isRepo) {
      if (cleanup) { cleanup(); cleanup = null; }
      panel.hidden = true;
      panel.replaceChildren();
      shownRepo = null;
      markSelection(null);
      // Warm the repository viewer in the background once the leaderboard is up.
      const warm = () => { loadRepoPage(); if (!bench) load('data/benchmark.json').then((b) => { bench = b; }).catch(() => {}); };
      'requestIdleCallback' in window ? requestIdleCallback(warm, { timeout: 3000 }) : setTimeout(warm, 1500);
      return;
    }
    const [kind, id, short, ...rest] = parts;
    const target = rest.length ? rest.join('/') : null;
    const newRepo = id !== shownRepo;
    markSelection(id, short);
    panel.hidden = false;
    if (newRepo && cleanup) { cleanup(); cleanup = null; }
    const [{ renderRepository }, full] = await Promise.all([loadRepoPage(), bench || load('data/benchmark.json')]);
    bench = full;
    const result = await renderRepository(panel, bench, id, short, kind, !newRepo, target, location.hash ? null : EXAMPLE_HASH);
    if (typeof result === 'function') cleanup = result;
    shownRepo = id;
    // Bring a newly opened repository into view; switching agent or view stays put,
    // and the example the page opens on waits below the leaderboard.
    if (newRepo && location.hash) panel.scrollIntoView({ behavior: fresh ? 'auto' : 'smooth', block: 'start' });
  } catch (error) {
    console.error(error);
    view.replaceChildren(h('div', { class: 'error' }, `Could not load this page: ${error.message}. Serve the site over HTTP (python3 serve.py) so the data files can be fetched.`));
    boardEl = null;
  }
}

window.addEventListener('hashchange', (event) => {
  const from = new URL(event.oldURL).hash;
  if (location.hash.startsWith('#/model/') && !from.startsWith('#/model/')) openedFrom = from;
  route();
  window.goatcounter?.count?.({ referrer: event.oldURL });
});
window.addEventListener('leaderboard:redraw', () => {
  if (!boardEl) return;
  const [, id, short] = routeParts();
  markSelection(shownRepo && id ? id : null, short);
});
route();
