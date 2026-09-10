/* =====================================================================
   NAVIGATION — bascule entre les sept pages, sidebar mobile, mois affiche
   ===================================================================== */

/* Table page -> renderer. Ajouter une page = ajouter une ligne ici,
   un <div id="pg-..."> dans app.html et un <li> dans la sidebar. */
const PAGES = {
  dashboard: rDash,
  clients:   rClients,
  debts:     rDebts,
  expenses:  rExpenses,
  stock:     rStock,
  margins:   rMargins,
  settings:  rSettings
};

function nav(p) {
  curPage = p;
  document.querySelectorAll('.page').forEach(function (x) { x.hidden = true; });
  document.getElementById('pg-' + p).hidden = false;
  document.querySelectorAll('.nav-item').forEach(function (x) {
    x.classList.toggle('active', x.dataset.p === p);
  });
  render();
  if (window.innerWidth <= 768) closeSide();
}

/* Rend la page courante, puis relance l'animation d'entree et les
   compteurs. Les renderers appeles directement (clic sur un filtre)
   ne passent pas par ici et ne rejouent donc aucune animation. */
function render() {
  const fn = PAGES[curPage];
  if (!fn) return;
  fn();

  const el = document.getElementById('pg-' + curPage);
  if (!el) return;
  el.classList.remove('page-in');
  void el.offsetWidth;          /* force le navigateur a repartir de zero */
  el.classList.add('page-in');
  animateCounts(el);
}

/* Rejoue le renderer de la page courante, sans animation d'entree.

   Une saisie ne touche pas toujours la page ou elle a ete faite : une
   vente enregistree depuis Stock modifie Marges ET Stock. Le formulaire
   appelle donc refresh(), qui rafraichit l'ecran que l'utilisateur a
   sous les yeux, quel qu'il soit. */
function refresh() {
  const fn = PAGES[curPage];
  if (fn) fn();
}

/* Navigation par mois, partagee par Depenses, Stock et Marges */
function chgMonth(d) {
  const [y, m] = selMonth.split('-').map(Number);
  const dt = new Date(y, m - 1 + d, 1);
  selMonth = dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0');
  render();
}

/* --- Sidebar mobile --- */
function toggleSide() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sideOv').classList.toggle('open');
}

function closeSide() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sideOv').classList.remove('open');
}
