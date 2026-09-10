/* =====================================================================
   COMPOSANTS — fabriques de HTML reutilisees par les pages
   Un seul endroit pour la structure d'une carte statistique, d'un etat
   vide, d'une barre ou d'un graphique : les sept pages restent coherentes
   et une retouche de style se fait ici, pas dans chaque renderer.
   ===================================================================== */

/* Carte statistique : valeur d'abord, legende ensuite, icone discrete.
   tone   : 'gold' | 'green' | 'red' | 'blue'
   icon   : nom d'icone (voir ICONS)
   value  : valeur affichee, deja formatee
   label  : legende sous la valeur
   count  : nombre brut, si la valeur doit etre animee au chargement
   fmt    : 'cfa' | 'int' | 'dec' — formatage pendant l'animation
   suffix : texte colle apres le nombre pendant l'animation (ex : ' j') */
function st(o) {
  return '<div class="st ' + (o.tone || 'gold') + '">'
       +   '<div class="st-ico">' + icon(o.icon || 'chart') + '</div>'
       +   '<div class="st-v"' + countAttr(o) + '>' + o.value + '</div>'
       +   '<div class="st-l">' + o.label + '</div>'
       + '</div>';
}

/* Valeur secondaire d'un panneau de tete.
   tone : '' | 'up' (vert) | 'down' (rouge) */
function mini(o) {
  return '<div class="mini">'
       +   '<div class="mini-v ' + (o.tone || '') + '"' + countAttr(o) + '>' + o.value + '</div>'
       +   '<div class="mini-l">' + o.label + '</div>'
       + '</div>';
}

/* Attributs lus par animateCounts(). Sans count, aucune animation. */
function countAttr(o) {
  if (o.count == null || !isFinite(o.count)) return '';
  return ' data-count="' + o.count + '" data-fmt="' + (o.fmt || 'int') + '"'
       + (o.suffix ? ' data-suffix="' + esc(o.suffix) + '"' : '');
}

/* Etat vide : icone, titre, explication, action facultative.
   o.action attend du HTML de bouton deja construit. */
function emptyState(o) {
  return '<div class="empty' + (o.small ? ' empty-sm' : '') + '">'
       +   '<div class="empty-ico">' + icon(o.icon || 'inbox') + '</div>'
       +   (o.title ? '<h4>' + o.title + '</h4>' : '')
       +   (o.text ? '<p>' + o.text + '</p>' : '')
       +   (o.action || '')
       + '</div>';
}

/* Barre de progression. part et total sont des nombres bruts. */
function prog(part, total, cls) {
  return '<div class="prog"><div class="prog-fill' + (cls ? ' ' + cls : '')
       + '" style="width:' + pct(part, total).toFixed(1) + '%"></div></div>';
}

/* Jauge : intitule, valeur, barre, graduation.
   o.max borne la barre — au-dela, elle reste pleine. */
function gauge(o) {
  return '<div class="gauge">'
       +   '<div class="gauge-hd"><span class="gl">' + o.label + '</span>'
       +     '<span class="gv">' + o.value + '</span></div>'
       +   prog(Math.min(o.now, o.max), o.max, o.tone)
       +   '<div class="gauge-scale"><span>' + o.scale[0] + '</span>'
       +     '<span>' + o.scale[1] + '</span><span>' + o.scale[2] + '</span></div>'
       + '</div>';
}

/* Graphique en barres.
   items : [{ label, value, now }]. Les reperes horizontaux donnent a
   l'oeil de quoi comparer deux barres qui ne se touchent pas. */
function barChart(items) {
  const max = Math.max.apply(null, items.map(function (d) { return d.value; }).concat([1]));

  const cols = items.map(function (d) {
    const h = ((d.value / max) * 100).toFixed(1);
    return '<div class="chart-col" title="' + d.value + ' plateaux — ' + esc(d.label) + '">'
         +   '<div class="chart-bar' + (d.value === 0 ? ' zero' : '') + '" style="height:' + h + '%">'
         +     '<span class="chart-v">' + d.value + '</span>'
         +   '</div>'
         + '</div>';
  }).join('');

  const axis = items.map(function (d) {
    return '<span' + (d.now ? ' class="is-today"' : '') + '>' + esc(d.label) + '</span>';
  }).join('');

  return '<div class="chart">'
       +   '<div class="chart-plot">'
       +     '<div class="chart-lines"><i></i><i></i><i></i><i></i></div>'
       +     '<div class="chart-cols">' + cols + '</div>'
       +   '</div>'
       +   '<div class="chart-axis">' + axis + '</div>'
       + '</div>';
}

/* Navigation de mois, partagee par Depenses, Stock et Marges */
function moNav() {
  return '<div class="mo-nav">'
       +   '<button class="btn btn-g" onclick="chgMonth(-1)" aria-label="Mois précédent">&larr;</button>'
       +   '<span>' + moLabel(selMonth) + '</span>'
       +   '<button class="btn btn-g" onclick="chgMonth(1)" aria-label="Mois suivant">&rarr;</button>'
       + '</div>';
}

/* Champ de recherche avec sa loupe. handler est le corps du oninput. */
function searchBar(placeholder, value, handler) {
  return '<div class="search-bar">' + icon('search')
       + '<input placeholder="' + esc(placeholder) + '" value="' + esc(value) + '" oninput="' + handler + '">'
       + '</div>';
}

/* Squelette affiche pendant la premiere lecture du cloud, pour que
   l'ecran ne reste pas vide le temps de la reponse reseau. */
function skeletonPage() {
  return '<div class="pg-hd"><div class="sk" style="width:200px;height:26px"></div></div>'
       + '<div class="hero">'
       +   '<div class="panel"><div class="sk sk-line w40"></div><div class="sk sk-block"></div></div>'
       +   '<div class="panel"><div class="sk sk-line w60"></div><div class="sk sk-block"></div></div>'
       + '</div>'
       + '<div class="card"><div class="sk sk-line w40"></div><div class="sk sk-block"></div></div>';
}
