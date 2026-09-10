/* =====================================================================
   RAPPORTS PDF — documents imprimables

   Pourquoi pas une bibliotheque PDF ? Parce qu'elle viendrait d'un CDN.
   L'application s'ouvre en file:// et doit rester utilisable sans reseau :
   un bouton d'export qui ne marche que connecte n'est pas un export.

   On construit donc un document HTML complet dans une iframe cachee, avec
   sa propre feuille de style d'impression, et on appelle print(). Le
   navigateur propose « Enregistrer au format PDF » — le fichier obtenu est
   un vrai PDF, et le meme document part a l'imprimante si besoin.

   Les polices sont celles du systeme, volontairement : attendre Google
   Fonts avant d'imprimer donnerait un document nu si le reseau manque.
   ===================================================================== */

/* Feuille de style du document imprime. Pensee pour du A4 : marges de
   15 mm, corps a 10,5 pt, tableaux qui ne se coupent pas au milieu d'une
   ligne. */
function repCSS() {
  return `
    @page{size:A4;margin:15mm 14mm}
    *{box-sizing:border-box;margin:0;padding:0}
    body{
      font:10.5pt/1.45 -apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
      color:#1B1B1B;-webkit-print-color-adjust:exact;print-color-adjust:exact;
    }
    .num{font-variant-numeric:tabular-nums}

    /* --- En-tete de document --- */
    .rep-hd{display:flex;align-items:flex-start;gap:14px;padding-bottom:12px;
            border-bottom:2px solid #B57F14;margin-bottom:22px}
    .rep-hd svg{width:42px;height:42px;flex-shrink:0}
    .rep-hd .bn{font-size:15pt;font-weight:700;letter-spacing:-.02em;line-height:1.1}
    .rep-hd .bs{font-size:8.5pt;color:#6B6052;margin-top:1px}
    .rep-hd .meta{margin-left:auto;text-align:right;font-size:8.5pt;color:#6B6052;line-height:1.5}
    .rep-hd .meta strong{display:block;font-size:12pt;color:#1B1B1B;letter-spacing:-.01em}

    /* --- Sections --- */
    h2{font-size:9pt;font-weight:700;text-transform:uppercase;letter-spacing:.09em;
       color:#8A7F6F;margin:22px 0 9px;padding-bottom:5px;border-bottom:1px solid #DDD6C9}
    h2:first-of-type{margin-top:0}
    p.note{font-size:8.5pt;color:#6B6052;margin-top:7px;line-height:1.5}

    /* --- Tableaux --- */
    table{width:100%;border-collapse:collapse;font-size:9.5pt}
    th{text-align:left;padding:6px 8px;font-size:8pt;font-weight:700;
       text-transform:uppercase;letter-spacing:.05em;color:#6B6052;
       border-bottom:1px solid #C9C0B1;white-space:nowrap}
    td{padding:6px 8px;border-bottom:1px solid #EDE7DC;vertical-align:top}
    tr{page-break-inside:avoid}
    thead{display:table-header-group}
    .r{text-align:right}
    .muted{color:#6B6052}
    .pos{color:#1F6B44;font-weight:600}
    .neg{color:#A6301F;font-weight:600}
    tfoot td{border-top:1.5px solid #C9C0B1;border-bottom:none;font-weight:700;padding-top:8px}

    /* --- Bloc de synthese chiffree --- */
    .sum{width:100%;border-collapse:collapse;font-size:10.5pt}
    .sum td{padding:7px 0;border-bottom:1px solid #EDE7DC}
    .sum td.r{text-align:right;font-weight:600}
    .sum tr.rule td{border-bottom:1.5px solid #1B1B1B}
    .sum tr.big td{font-size:13pt;font-weight:700;padding-top:10px;border-bottom:none}
    .sum tr.big td.r{color:#8A5C08}
    /* Ces deux regles doivent suivre la precedente : un resultat negatif
       se lit en rouge, pas dans l'or de la marque. */
    .sum tr.big td.r.pos{color:#1F6B44}
    .sum tr.big td.r.neg{color:#A6301F}

    /* --- Cartouches --- */
    .kpis{display:flex;gap:10px;margin-bottom:4px}
    .kpi{flex:1;border:1px solid #DDD6C9;border-radius:6px;padding:9px 11px}
    .kpi .k{font-size:8pt;color:#6B6052;text-transform:uppercase;letter-spacing:.05em}
    .kpi .v{font-size:14pt;font-weight:700;letter-spacing:-.02em;margin-top:2px}

    .rep-ft{margin-top:26px;padding-top:9px;border-top:1px solid #DDD6C9;
            font-size:8pt;color:#8A7F6F;display:flex;justify-content:space-between}
    .empty-line{padding:14px 8px;color:#8A7F6F;font-size:9.5pt;font-style:italic}
  `;
}

/* Le logo, redessine ici : le document imprime ne partage aucun style
   avec l'application. */
function repLogo() {
  return '<svg viewBox="0 0 40 40" aria-hidden="true">'
    + '<defs><linearGradient id="rl" x1="0" y1="0" x2="0" y2="1">'
    + '<stop offset="0" stop-color="#D8A139"/><stop offset="1" stop-color="#A5700E"/>'
    + '</linearGradient></defs>'
    + '<rect width="40" height="40" rx="12" fill="url(#rl)"/>'
    + '<path d="M20 9.7c4.6 0 7.9 5 7.9 10.4 0 4.9-3.5 8.6-7.9 8.6s-7.9-3.7-7.9-8.6c0-5.4 3.3-10.4 7.9-10.4z" fill="#FFFCF3"/>'
    + '</svg>';
}

/* Assemble le document complet et lance l'impression. */
function printReport(docTitle, period, sections) {
  const html = '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">'
    + '<title>' + esc(docTitle) + '</title><style>' + repCSS() + '</style></head><body>'
    + '<div class="rep-hd">' + repLogo()
    +   '<div><div class="bn">Nenu Jolof</div><div class="bs">Suivi des ventes d\'oeufs</div></div>'
    +   '<div class="meta"><strong>' + esc(docTitle) + '</strong>'
    +     (period ? esc(period) + '<br>' : '')
    +     'Édité le ' + fmtD(today())
    +   '</div>'
    + '</div>'
    + sections
    + '<div class="rep-ft"><span>Nenu Jolof — ' + esc(docTitle) + '</span>'
    +   '<span>' + esc(curEmail || '') + '</span></div>'
    + '</body></html>';

  const old = document.getElementById('repFrame');
  if (old) old.remove();

  /* Hors ecran, mais aux dimensions d'une page : une iframe masquee par
     visibility:hidden ou display:none n'est pas mise en page par tous les
     moteurs, et s'imprime alors vide. On la sort du champ de vision au
     lieu de la cacher. */
  const f = document.createElement('iframe');
  f.id = 'repFrame';
  f.setAttribute('aria-hidden', 'true');
  f.style.cssText = 'position:fixed;left:-10000px;top:0;width:794px;height:1123px;border:0';
  document.body.appendChild(f);

  const doc = f.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();

  /* Laisser le moteur poser la mise en page avant d'ouvrir le dialogue,
     sinon Chrome imprime parfois une page vide. */
  setTimeout(function () {
    try {
      f.contentWindow.focus();
      f.contentWindow.print();
      toast('Choisissez « Enregistrer au format PDF » dans la fenêtre d\'impression', 'info');
    } catch (e) {
      toast('Impression indisponible sur ce navigateur', 'err');
    }
  }, 300);
}

/* Petit utilitaire : un tableau, ou une ligne « rien a afficher ». */
function repTable(headers, rows, foot) {
  if (!rows.length) return '<div class="empty-line">Aucune donnée sur la période.</div>';
  return '<table><thead><tr>'
    + headers.map(function (h) {
        return '<th' + (h.r ? ' class="r"' : '') + '>' + h.l + '</th>';
      }).join('')
    + '</tr></thead><tbody>' + rows.join('') + '</tbody>'
    + (foot ? '<tfoot>' + foot + '</tfoot>' : '')
    + '</table>';
}

/* --- 1. RAPPORT DU MOIS ------------------------------------------------
   Le document de reference : ce qui est entre, ce qui est sorti, ce qui
   reste. Il remplace le bilan redige a la main. */
function repMonth(mo) {
  mo = mo || selMonth;

  const sales = S.sales.filter(function (s) { return s.date.startsWith(mo); })
    .sort(function (a, b) { return a.date.localeCompare(b.date); });
  const exps = S.expenses.filter(function (e) { return e.date.startsWith(mo); })
    .sort(function (a, b) { return a.date.localeCompare(b.date); });
  const recs = S.receptions.filter(function (r) { return r.date.startsWith(mo); });

  const rev  = sales.reduce(function (s, x) { return s + x.quantity * x.sellingPrice; }, 0);
  const cost = sales.reduce(function (s, x) { return s + x.quantity * x.costPrice; }, 0);
  const qty  = sales.reduce(function (s, x) { return s + x.quantity; }, 0);
  const marge = rev - cost;
  const dep  = exps.reduce(function (s, x) { return s + x.amount; }, 0);
  const net  = marge - dep;
  const rate = rev ? (marge / rev) * 100 : 0;
  const recu = recs.reduce(function (s, r) { return s + r.quantity; }, 0);

  /* Stock a la fin du mois, ou a aujourd'hui si le mois court encore */
  const [y, m] = mo.split('-').map(Number);
  const last = new Date(y, m, 0);
  const lastDay = mo + '-' + String(last.getDate()).padStart(2, '0');
  const stockDay = lastDay > today() ? today() : lastDay;

  /* Ventes regroupees par jour */
  const byDate = {};
  sales.forEach(function (s) {
    if (!byDate[s.date]) byDate[s.date] = { qty: 0, rev: 0, cost: 0 };
    byDate[s.date].qty  += s.quantity;
    byDate[s.date].rev  += s.quantity * s.sellingPrice;
    byDate[s.date].cost += s.quantity * s.costPrice;
  });

  /* Depenses regroupees par categorie, de la plus lourde a la plus legere */
  const byCat = {};
  exps.forEach(function (e) { byCat[e.category] = (byCat[e.category] || 0) + e.amount; });
  const cats = Object.keys(byCat).sort(function (a, b) { return byCat[b] - byCat[a]; });

  const dettes = S.debts.filter(function (d) { return debtStatus(d) === 'en_cours'; });

  const sections =
    '<h2>Résultat du mois</h2>'
    + '<table class="sum"><tbody>'
    +   row2("Chiffre d'affaires", cfa(rev))
    +   row2('Coût des plateaux vendus', '− ' + cfa(cost))
    +   '<tr class="rule"><td>Marge brute' + (rev ? ' <span class="muted">(' + rate.toFixed(0) + ' %)</span>' : '')
    +     '</td><td class="r">' + cfa(marge) + '</td></tr>'
    +   row2('Dépenses du mois', '− ' + cfa(dep))
    +   '<tr class="big"><td>Résultat net</td><td class="r ' + (net >= 0 ? 'pos' : 'neg') + '">'
    +     cfa(net) + '</td></tr>'
    + '</tbody></table>'

    + '<h2>Activité</h2>'
    + '<div class="kpis">'
    +   kpi('Plateaux vendus', num(qty))
    +   kpi('Plateaux reçus', num(recu))
    +   kpi('Stock au ' + fmtD(stockDay), num(stockOn(stockDay)))
    +   kpi('Dettes à recouvrer', cfa(totalOwed()))
    + '</div>'

    + '<h2>Ventes par jour</h2>'
    + repTable(
        [{ l: 'Date' }, { l: 'Plateaux', r: 1 }, { l: "Chiffre d'affaires", r: 1 },
         { l: 'Coût', r: 1 }, { l: 'Marge', r: 1 }],
        Object.keys(byDate).sort().map(function (d) {
          const v = byDate[d], mg = v.rev - v.cost;
          return '<tr><td>' + fmtD(d) + '</td>'
            + '<td class="r num">' + num(v.qty) + '</td>'
            + '<td class="r num">' + cfa(v.rev) + '</td>'
            + '<td class="r num muted">' + cfa(v.cost) + '</td>'
            + '<td class="r num ' + (mg >= 0 ? 'pos' : 'neg') + '">' + cfa(mg) + '</td></tr>';
        }),
        '<tr><td>Total</td><td class="r num">' + num(qty) + '</td>'
        + '<td class="r num">' + cfa(rev) + '</td>'
        + '<td class="r num">' + cfa(cost) + '</td>'
        + '<td class="r num">' + cfa(marge) + '</td></tr>')

    + '<h2>Dépenses par catégorie</h2>'
    + repTable(
        [{ l: 'Catégorie' }, { l: 'Montant', r: 1 }, { l: 'Part', r: 1 }],
        cats.map(function (c) {
          return '<tr><td>' + esc(c) + '</td>'
            + '<td class="r num">' + cfa(byCat[c]) + '</td>'
            + '<td class="r num muted">' + (dep ? (byCat[c] / dep * 100).toFixed(0) : 0) + ' %</td></tr>';
        }),
        '<tr><td>Total</td><td class="r num">' + cfa(dep) + '</td><td></td></tr>')

    + '<h2>Détail des dépenses</h2>'
    + repTable(
        [{ l: 'Date' }, { l: 'Description' }, { l: 'Catégorie' }, { l: 'Montant', r: 1 }],
        exps.map(function (e) {
          return '<tr><td class="num">' + fmtD(e.date) + '</td>'
            + '<td>' + esc(e.description) + '</td>'
            + '<td class="muted">' + esc(e.category) + '</td>'
            + '<td class="r num">' + cfa(e.amount) + '</td></tr>';
        }))

    + '<h2>Créances en cours au ' + fmtD(today()) + '</h2>'
    + repTable(
        [{ l: 'Client' }, { l: 'Depuis' }, { l: 'Montant', r: 1 },
         { l: 'Réglé', r: 1 }, { l: 'Reste dû', r: 1 }],
        dettes.map(function (d) {
          return '<tr><td>' + esc(clientName(d.clientId)) + '</td>'
            + '<td class="num muted">' + fmtD(d.date) + '</td>'
            + '<td class="r num">' + cfa(d.amount) + '</td>'
            + '<td class="r num muted">' + cfa(debtPaid(d)) + '</td>'
            + '<td class="r num neg">' + cfa(debtRemaining(d)) + '</td></tr>';
        }),
        '<tr><td colspan="4">Total à recouvrer</td><td class="r num">' + cfa(totalOwed()) + '</td></tr>')

    + '<p class="note">Le résultat net ne tient pas compte des créances : une vente à crédit '
    + 'est comptée dans le chiffre d\'affaires du mois où elle a eu lieu, même si le règlement '
    + 'n\'est pas encore rentré.</p>';

  printReport('Rapport mensuel', moLabel(mo), sections);
}

function row2(label, value) {
  return '<tr><td>' + label + '</td><td class="r num">' + value + '</td></tr>';
}
function kpi(k, v) {
  return '<div class="kpi"><div class="k">' + k + '</div><div class="v num">' + v + '</div></div>';
}

/* --- 2. FICHIER CLIENTS ----------------------------------------------- */
function repClients() {
  const list = [...S.clients].sort(function (a, b) {
    return (isActive(b) - isActive(a)) || a.name.localeCompare(b.name, 'fr');
  });
  const types = demandByType();
  const total = types.reduce(function (s, r) { return s + r.trays; }, 0);

  const sections =
    '<h2>Répartition de la demande</h2>'
    + repTable(
        [{ l: 'Type' }, { l: 'Clients', r: 1 }, { l: 'Actifs', r: 1 },
         { l: 'Plateaux / sem.', r: 1 }, { l: 'Part', r: 1 }],
        types.map(function (r) {
          return '<tr><td>' + esc(r.type.p) + '</td>'
            + '<td class="r num">' + r.clients + '</td>'
            + '<td class="r num">' + r.active + '</td>'
            + '<td class="r num">' + num(r.trays) + '</td>'
            + '<td class="r num muted">' + (total ? (r.trays / total * 100).toFixed(0) : 0) + ' %</td></tr>';
        }),
        '<tr><td colspan="3">Total (clients actifs)</td>'
        + '<td class="r num">' + num(total) + '</td><td></td></tr>')

    + '<h2>Fichier client</h2>'
    + repTable(
        [{ l: 'Nom' }, { l: 'Téléphone' }, { l: 'Type' }, { l: 'Statut' },
         { l: 'Pl./sem.', r: 1 }, { l: 'Client depuis' }],
        list.map(function (c) {
          const act = isActive(c);
          return '<tr><td><strong>' + esc(c.name) + '</strong>'
            + (c.address ? '<br><span class="muted">' + esc(c.address) + '</span>' : '') + '</td>'
            + '<td class="num">' + esc(c.phone) + '</td>'
            + '<td>' + esc(clientType(c).s) + '</td>'
            + '<td>' + (act ? 'Actif' : '<span class="muted">Inactif</span>')
            +   (!act && c.inactiveReason ? '<br><span class="muted">' + esc(c.inactiveReason) + '</span>' : '') + '</td>'
            + '<td class="r num">' + (c.weeklyTrays || 0) + '</td>'
            + '<td class="num muted">' + (c.since ? fmtD(c.since) : '—')
            +   '<br>' + ageLabel(clientAge(c)) + '</td></tr>';
        }));

  printReport('Fichier clients', num(S.clients.length) + ' clients', sections);
}

/* --- 3. ETAT DES CREANCES --------------------------------------------- */
function repDebts() {
  const encours = S.debts.filter(function (d) { return debtStatus(d) === 'en_cours'; })
    .sort(function (a, b) { return debtRemaining(b) - debtRemaining(a); });
  const soldees = S.debts.filter(function (d) { return debtStatus(d) === 'soldee'; })
    .sort(function (a, b) { return b.date.localeCompare(a.date); });

  const sections =
    '<h2>Créances en cours</h2>'
    + repTable(
        [{ l: 'Client' }, { l: 'Motif' }, { l: 'Depuis' }, { l: 'Montant', r: 1 },
         { l: 'Réglé', r: 1 }, { l: 'Reste dû', r: 1 }],
        encours.map(function (d) {
          return '<tr><td><strong>' + esc(clientName(d.clientId)) + '</strong></td>'
            + '<td class="muted">' + esc(d.description || '—') + '</td>'
            + '<td class="num muted">' + fmtD(d.date) + '<br>' + agoLabel(d.date) + '</td>'
            + '<td class="r num">' + cfa(d.amount) + '</td>'
            + '<td class="r num muted">' + cfa(debtPaid(d)) + '</td>'
            + '<td class="r num neg">' + cfa(debtRemaining(d)) + '</td></tr>';
        }),
        '<tr><td colspan="5">Total à recouvrer</td>'
        + '<td class="r num">' + cfa(totalOwed()) + '</td></tr>')

    + '<h2>Règlements reçus</h2>'
    + repTable(
        [{ l: 'Date' }, { l: 'Client' }, { l: 'Note' }, { l: 'Montant', r: 1 }],
        S.debts.reduce(function (acc, d) {
          (d.payments || []).forEach(function (p) {
            acc.push({ date: p.date, client: clientName(d.clientId), note: p.note || '', amount: p.amount });
          });
          return acc;
        }, [])
        .sort(function (a, b) { return b.date.localeCompare(a.date); })
        .map(function (p) {
          return '<tr><td class="num">' + fmtD(p.date) + '</td>'
            + '<td>' + esc(p.client) + '</td>'
            + '<td class="muted">' + esc(p.note) + '</td>'
            + '<td class="r num pos">' + cfa(p.amount) + '</td></tr>';
        }))

    + '<h2>Créances soldées</h2>'
    + repTable(
        [{ l: 'Client' }, { l: 'Motif' }, { l: 'Date' }, { l: 'Montant', r: 1 }],
        soldees.map(function (d) {
          return '<tr><td>' + esc(clientName(d.clientId)) + '</td>'
            + '<td class="muted">' + esc(d.description || '—') + '</td>'
            + '<td class="num muted">' + fmtD(d.date) + '</td>'
            + '<td class="r num">' + cfa(d.amount) + '</td></tr>';
        }));

  printReport('État des créances', cfa(totalOwed()) + ' à recouvrer', sections);
}

/* --- 4. JOURNAL DU STOCK ---------------------------------------------- */
function repStock(mo) {
  mo = mo || selMonth;
  const dates = activeDates(mo);
  const recs = S.receptions.filter(function (r) { return r.date.startsWith(mo); })
    .sort(function (a, b) { return a.date.localeCompare(b.date); });

  const totRec = recs.reduce(function (s, r) { return s + r.quantity; }, 0);
  const totVal = recs.reduce(function (s, r) { return s + r.quantity * r.costPrice; }, 0);
  const totSold = S.sales.filter(function (s) { return s.date.startsWith(mo); })
    .reduce(function (s, x) { return s + x.quantity; }, 0);

  const sections =
    '<h2>Mouvements du mois</h2>'
    + '<div class="kpis">'
    +   kpi('Plateaux reçus', num(totRec))
    +   kpi('Plateaux vendus', num(totSold))
    +   kpi('Stock actuel', num(getCurrentStock()))
    +   kpi('Valeur des achats', cfa(totVal))
    + '</div>'

    + '<h2>Réceptions</h2>'
    + repTable(
        [{ l: 'Date' }, { l: 'Fournisseur' }, { l: 'Quantité', r: 1 },
         { l: 'Prix unitaire', r: 1 }, { l: 'Total', r: 1 }],
        recs.map(function (r) {
          return '<tr><td class="num">' + fmtD(r.date) + '</td>'
            + '<td>' + esc(r.supplier || '—') + '</td>'
            + '<td class="r num">' + num(r.quantity) + '</td>'
            + '<td class="r num muted">' + cfa(r.costPrice) + '</td>'
            + '<td class="r num">' + cfa(r.quantity * r.costPrice) + '</td></tr>';
        }),
        '<tr><td colspan="2">Total</td><td class="r num">' + num(totRec) + '</td>'
        + '<td></td><td class="r num">' + cfa(totVal) + '</td></tr>')

    + '<h2>Journal quotidien</h2>'
    + repTable(
        [{ l: 'Date' }, { l: 'Reçu', r: 1 }, { l: 'Vendu', r: 1 },
         { l: 'Stock le soir', r: 1 }, { l: 'Inventaire', r: 1 }],
        dates.slice().reverse().map(function (d) {
          const iv = inventoryOn(d);
          const gp = stockGap(d);
          return '<tr><td class="num">' + fmtD(d) + '</td>'
            + '<td class="r num">' + (getReceived(d) || '—') + '</td>'
            + '<td class="r num">' + (getSold(d) || '—') + '</td>'
            + '<td class="r num"><strong>' + num(stockOn(d)) + '</strong></td>'
            + '<td class="r num">' + (iv
                ? num(iv.closingStock) + ' <span class="' + (gp === 0 ? 'muted' : 'neg') + '">('
                  + (gp === 0 ? 'conforme' : (gp > 0 ? '+' : '−') + Math.abs(gp)) + ')</span>'
                : '<span class="muted">—</span>') + '</td></tr>';
        }))

    + '<p class="note">Le stock se calcule à partir du point de départ, des réceptions et '
    + 'des ventes. Un inventaire remet le compteur sur le comptage physique : l\'écart entre '
    + 'parenthèses est ce qui manquait ou s\'ajoutait ce jour-là.</p>';

  printReport('Journal du stock', moLabel(mo), sections);
}
