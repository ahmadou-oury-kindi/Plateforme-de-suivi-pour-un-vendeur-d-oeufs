/* =====================================================================
   ICONES — jeu SVG inline, trace uniforme (20x20, trait 1.6, bouts ronds)
   Les icones heritent de la couleur du texte (currentColor), elles
   s'adaptent donc au theme clair comme au theme sombre sans reglage.
   Usage : icon('box') dans un gabarit.
   ===================================================================== */
const ICONS = {
  grid:       '<rect x="2" y="2" width="6.5" height="6.5" rx="1.5"/><rect x="11.5" y="2" width="6.5" height="6.5" rx="1.5"/><rect x="2" y="11.5" width="6.5" height="6.5" rx="1.5"/><rect x="11.5" y="11.5" width="6.5" height="6.5" rx="1.5"/>',
  users:      '<circle cx="8" cy="7" r="3"/><path d="M2.5 17v-1a4 4 0 014-4h3a4 4 0 014 4v1"/><path d="M14.5 4.4a3 3 0 010 5.2M15.5 12.3a4 4 0 012 3.4V17"/>',
  userCheck:  '<circle cx="8" cy="7" r="3"/><path d="M2.5 17v-1a4 4 0 014-4h3.5"/><path d="M13 15l1.8 1.8L18 13.5"/>',
  userOff:    '<circle cx="8" cy="7" r="3"/><path d="M2.5 17v-1a4 4 0 014-4h3.5"/><path d="M13.5 15.5h4.5"/>',
  star:       '<path d="M10 2.6l2.24 4.62 5.06.72-3.66 3.6.86 5.06L10 14.2l-4.5 2.4.86-5.06L2.7 7.94l5.06-.72z" fill="currentColor" stroke="none"/>',
  box:        '<path d="M2.8 6.6L10 3l7.2 3.6v6.8L10 17l-7.2-3.6z"/><path d="M2.8 6.6L10 10.3l7.2-3.7"/><path d="M10 10.3V17"/>',
  truck:      '<path d="M2 5.5h9v8H2z"/><path d="M11 8.5h3.4l2.6 2.6v2.4H11z"/><circle cx="5.5" cy="15.5" r="1.6"/><circle cx="14" cy="15.5" r="1.6"/>',
  trend:      '<path d="M2.5 14.5l4.6-5 3.2 2.8L17.5 5"/><path d="M13.2 5h4.3v4.3"/>',
  coins:      '<ellipse cx="10" cy="5.6" rx="6.2" ry="2.6"/><path d="M3.8 5.6v3.6c0 1.44 2.78 2.6 6.2 2.6s6.2-1.16 6.2-2.6V5.6"/><path d="M3.8 9.2v3.6c0 1.44 2.78 2.6 6.2 2.6s6.2-1.16 6.2-2.6V9.2"/>',
  percent:    '<circle cx="6" cy="6" r="2.2"/><circle cx="14" cy="14" r="2.2"/><path d="M15.5 4.5l-11 11"/>',
  alert:      '<path d="M10 3l7.2 12.5H2.8z"/><path d="M10 8v3.4M10 13.6v.1"/>',
  receipt:    '<path d="M4.5 2.5h11v15l-2.2-1.4-2.15 1.4L9 16.1l-2.2 1.4-2.3-1.4z"/><path d="M7.2 6.6h5.6M7.2 9.8h3.8"/>',
  list:       '<path d="M6.5 5.5h11M6.5 10h11M6.5 14.5h11"/><path d="M3 5.5h.01M3 10h.01M3 14.5h.01"/>',
  tag:        '<path d="M3 3h6.4l7.6 7.6-6.4 6.4L3 9.4z"/><circle cx="6.6" cy="6.6" r="1.1"/>',
  clock:      '<circle cx="10" cy="10" r="7.4"/><path d="M10 5.6V10l3 1.8"/>',
  calendar:   '<rect x="2.8" y="4" width="14.4" height="13.2" rx="2"/><path d="M2.8 8.2h14.4M6.6 2.6v2.8M13.4 2.6v2.8"/>',
  check:      '<path d="M3.8 10.4l4 4 8.4-9"/>',
  checkCircle:'<circle cx="10" cy="10" r="7.4"/><path d="M6.6 10.2l2.4 2.4 4.4-4.8"/>',
  info:       '<circle cx="10" cy="10" r="7.4"/><path d="M10 9.2v4.4M10 6.6v.1"/>',
  inbox:      '<path d="M2.6 11.5h4l1.2 2h4.4l1.2-2h4"/><path d="M4.8 4h10.4l2.2 7.5v3.4a1.6 1.6 0 01-1.6 1.6H4.2a1.6 1.6 0 01-1.6-1.6v-3.4z"/>',
  wallet:     '<path d="M2.8 6.4a2 2 0 012-2h9.4a2 2 0 012 2v.6"/><rect x="2.8" y="6.4" width="14.4" height="10.2" rx="2"/><circle cx="13.6" cy="11.5" r="1.2"/>',
  search:     '<circle cx="8.8" cy="8.8" r="5.4"/><path d="M12.8 12.8l4 4"/>',
  chart:      '<path d="M3 17V9M8 17V4M13 17v-5M18 17V7"/>',
  cloud:      '<path d="M6 15.5a3.7 3.7 0 01-.3-7.4 4.8 4.8 0 019.3-1.1 3.75 3.75 0 01.4 7.4z"/>',
  cloudCheck: '<path d="M6.4 14.5a3.5 3.5 0 01-.3-7 4.6 4.6 0 018.9-1 3.55 3.55 0 011 6.7"/><path d="M7.6 15.2l2 2 3.8-4"/>',
  cloudOff:   '<path d="M6 15.5a3.7 3.7 0 01-.3-7.4 4.8 4.8 0 019.3-1.1 3.75 3.75 0 01.4 7.4z"/><path d="M3 3l14 14"/>',
  refresh:    '<path d="M16.6 8.4A6.8 6.8 0 004.6 6"/><path d="M3.4 11.6a6.8 6.8 0 0012 2.4"/><path d="M4.2 2.8v3.4h3.4M15.8 17.2v-3.4h-3.4"/>',
  sun:        '<circle cx="10" cy="10" r="3.4"/><path d="M10 1.8v2M10 16.2v2M1.8 10h2M16.2 10h2M4.2 4.2l1.4 1.4M14.4 14.4l1.4 1.4M4.2 15.8l1.4-1.4M14.4 5.6l1.4-1.4"/>',
  auto:       '<circle cx="10" cy="10" r="7.4"/><path d="M10 2.6a7.4 7.4 0 000 14.8z" fill="currentColor" stroke="none"/>',
  moon:       '<path d="M16.2 11.8A6.8 6.8 0 018.2 3.8a6.9 6.9 0 108 8z"/>',
  plus:       '<path d="M10 4.2v11.6M4.2 10h11.6"/>',
  download:   '<path d="M10 3v9.4"/><path d="M6.2 9l3.8 3.8L13.8 9"/><path d="M3.4 15.6v1.4h13.2v-1.4"/>',
  upload:     '<path d="M10 13.2V3.8"/><path d="M6.2 7.6L10 3.8l3.8 3.8"/><path d="M3.4 15.6v1.4h13.2v-1.4"/>',
  shield:     '<path d="M10 2.6l6 2.2v4.9c0 3.7-2.4 6.5-6 7.7-3.6-1.2-6-4-6-7.7V4.8z"/><path d="M7.2 10l2 2 3.6-3.8"/>',
  trash:      '<path d="M3.6 5.4h12.8"/><path d="M8.2 5.4V3.8h3.6v1.6"/><path d="M5.2 5.4l.8 10.4a1.6 1.6 0 001.6 1.4h4.8a1.6 1.6 0 001.6-1.4l.8-10.4"/>',
  db:         '<ellipse cx="10" cy="5" rx="6.4" ry="2.6"/><path d="M3.6 5v10c0 1.44 2.87 2.6 6.4 2.6s6.4-1.16 6.4-2.6V5"/><path d="M3.6 10c0 1.44 2.87 2.6 6.4 2.6s6.4-1.16 6.4-2.6"/>'
};

/* Rend une icone. cls ajoute des classes CSS optionnelles. */
function icon(name, cls) {
  const d = ICONS[name];
  if (!d) return '';
  return '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" '
       + 'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"'
       + (cls ? ' class="' + cls + '"' : '') + '>' + d + '</svg>';
}
