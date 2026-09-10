/* =====================================================================
   UTILITAIRES — identifiants, formatage, dates, echappement HTML
   ===================================================================== */

/* Identifiant court, unique en pratique pour un usage mono-utilisateur */
function gid() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
}

/* Montant en francs CFA, separateurs a la francaise */
function cfa(n) {
  if (n == null || isNaN(n)) return '0 FCFA';
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA';
}

/* Nombre entier separe par milliers, sans devise */
function num(n) {
  if (n == null || isNaN(n)) return '0';
  return new Intl.NumberFormat('fr-FR').format(Math.round(n));
}

/* Date ISO (AAAA-MM-JJ) vers « 11 févr. 2026 ».
   Le T12:00:00 evite qu'un decalage de fuseau ne recule d'un jour. */
function fmtD(d) {
  return new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* Date du jour au format ISO, en heure locale */
function today() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

/* Mois courant au format AAAA-MM */
function curMo() {
  return today().substring(0, 7);
}

/* AAAA-MM vers « février 2026 » */
function moLabel(ym) {
  const [y, m] = ym.split('-');
  return new Date(y, m - 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

/* Echappement HTML. A appliquer a TOUTE donnee saisie par l'utilisateur
   avant de l'inserer dans un gabarit : noms, adresses, notes, libelles. */
function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* Pourcentage borne a [0,100], pour les barres de progression */
function pct(part, whole) {
  if (!whole) return 0;
  return Math.max(0, Math.min(100, (part / whole) * 100));
}

/* Accord du pluriel : plur(3,'client') -> « clients » */
function plur(n, word, suffix) {
  return word + (n > 1 ? (suffix || 's') : '');
}

/* Valeur d'un champ de formulaire, deja debarrassee des espaces */
function val(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

/* Valeur numerique d'un champ, ou NaN si le champ est vide ou invalide */
function numVal(id) {
  const el = document.getElementById(id);
  if (!el || el.value === '') return NaN;
  return parseFloat(el.value);
}
