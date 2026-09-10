#!/usr/bin/env node
/* =====================================================================
   BUILD — assemble frontend/src/ en un seul fichier nenujolof.html
   Usage : npm run build   (ou : node build.js)

   Le build est volontairement minimal : il concatene et il injecte, rien
   de plus. Pas de bundler, pas de transpilation, pas de minification.
   Le HTML produit reste lisible, ouvrable en file:// dans Chrome, et le
   code qu'il contient est exactement celui des sources.

   Consequence importante : TOUT le JavaScript finit dans un seul
   <script>. Les fichiers partagent donc une meme portee globale, et
   l'ORDRE ci-dessous compte pour les constantes et les variables (les
   fonctions, elles, sont remontees par le moteur JS).
   ===================================================================== */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SRC = path.join(ROOT, 'frontend', 'src');
const OUT = path.join(ROOT, 'nenujolof.html');

/* --- Feuilles de style, dans l'ordre de la cascade ------------------ */
const CSS_FILES = [
  'css/variables.css',    /* d'abord les variables : tout le reste s'en sert */
  'css/base.css',
  'css/animations.css',
  'css/layout.css',
  'css/components.css',
  'css/forms.css',
  'css/tables.css',
  'css/pages.css',
  'css/responsive.css'    /* en dernier : surcharge sans jouer sur la specificite */
];

/* --- Modules JavaScript, dans l'ordre d'execution ------------------- */
const JS_FILES = [
  /* Noyau : constantes, etat, reseau, authentification */
  'js/core/constants.js',
  'js/core/state.js',
  'js/core/utils.js',
  'js/core/supabase.js',
  'js/core/auth.js',
  'js/core/backup.js',
  'js/core/report.js',

  /* Interface : briques partagees par toutes les pages */
  'js/ui/icons.js',
  'js/ui/components.js',
  'js/ui/modal.js',
  'js/ui/toast.js',
  'js/ui/theme.js',
  'js/ui/sync.js',
  'js/ui/counters.js',
  'js/ui/ripple.js',
  'js/ui/nav.js',

  /* Calculs metier */
  'js/helpers/stock.js',
  'js/helpers/clients.js',
  'js/helpers/debts.js',

  /* Une page = un renderer + ses formulaires */
  'js/pages/dashboard.js',
  'js/pages/clients.js',
  'js/pages/debts.js',
  'js/pages/expenses.js',
  'js/pages/stock.js',
  'js/pages/margins.js',
  'js/pages/settings.js',

  /* Demarrage : doit rester en dernier */
  'js/init.js'
];

/* --- Fragments HTML ------------------------------------------------- */
const HTML_PARTS = {
  '<!--@LOGIN-->': 'html/login.html',
  '<!--@APP-->':   'html/app.html',
  '<!--@MODAL-->': 'html/modal.html'
};

/* --- Assemblage ----------------------------------------------------- */

function read(rel) {
  const file = path.join(SRC, rel);
  if (!fs.existsSync(file)) {
    console.error('\n  Fichier introuvable : ' + rel);
    console.error('  Verifiez la liste en haut de build.js.\n');
    process.exit(1);
  }
  return fs.readFileSync(file, 'utf8');
}

/* Concatene des fichiers en separant chaque bloc par un commentaire qui
   rappelle son origine : dans le HTML genere, on retrouve d'ou vient
   chaque section. */
function concat(files, comment) {
  return files.map(function (f) {
    const head = comment === 'css'
      ? '/* ===== ' + f + ' ===== */'
      : '/* ===== ' + f + ' ===== */';
    return head + '\n' + read(f).trim();
  }).join('\n\n');
}

function build() {
  let html = read('html/index.html');

  Object.keys(HTML_PARTS).forEach(function (token) {
    html = html.replace(token, read(HTML_PARTS[token]).trim());
  });

  const css = concat(CSS_FILES, 'css');
  const js  = concat(JS_FILES, 'js');

  /* Garde-fou : on refuse de produire un fichier qui ne se parse pas.
     new Function analyse le code sans jamais l'executer. */
  try {
    new Function(js);
  } catch (e) {
    console.error('\n  Erreur de syntaxe JavaScript — build interrompu');
    console.error('  ' + e.message + '\n');
    process.exit(1);
  }

  /* replace() avec une chaine de remplacement interprete $&, $1, etc.
     On passe donc par une fonction, qui rend le texte tel quel. */
  html = html.replace('<!--@CSS-->', function () { return css; });
  html = html.replace('<!--@JS-->',  function () { return js; });

  const banner = '<!--\n'
    + '  Nenu Jolof — fichier genere automatiquement. NE PAS EDITER A LA MAIN.\n'
    + '  Sources : frontend/src/  ·  Regenerer : npm run build\n'
    + '  Genere le ' + new Date().toLocaleString('fr-FR') + '\n'
    + '-->\n';

  html = html.replace('<!DOCTYPE html>', '<!DOCTYPE html>\n' + banner);

  fs.writeFileSync(OUT, html, 'utf8');

  const ko = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(1);
  console.log('');
  console.log('  nenujolof.html genere');
  console.log('  ' + CSS_FILES.length + ' feuilles CSS, ' + JS_FILES.length + ' modules JS, '
              + Object.keys(HTML_PARTS).length + ' fragments HTML');
  console.log('  ' + ko + ' Ko — ouvrir directement dans Chrome');
  console.log('');
}

build();
