/* =====================================================================
   PAGE — MARGES
   Une vente = une quantite, un prix de vente et un prix de revient.
   La marge est toujours recalculee, jamais stockee : corriger une vente
   corrige aussitot tous les totaux.
   Marge nette = marge brute - depenses. Elle se recalcule a chaque rendu,
   donc suit en direct toute vente ou depense ajoutee, modifiee ou supprimee.
   ===================================================================== */
function rMargins() {
  const mo = selMonth;
  const list = S.sales
    .filter(function (s) { return s.date.startsWith(mo); })
    .sort(function (a, b) { return b.date.localeCompare(a.date); });
  const moExp = S.expenses.filter(function (e) { return e.date.startsWith(mo); });

  const totalRev  = list.reduce(function (s, x) { return s + x.quantity * x.sellingPrice; }, 0);
  const totalCost = list.reduce(function (s, x) { return s + x.quantity * x.costPrice; }, 0);
  const totalQty  = list.reduce(function (s, x) { return s + x.quantity; }, 0);
  const totalExp  = moExp.reduce(function (s, x) { return s + x.amount; }, 0);
  const totalMargin = totalRev - totalCost;
  const totalNet    = totalMargin - totalExp;
  const rate    = totalRev ? (totalMargin / totalRev) * 100 : 0;
  const netRate = totalRev ? (totalNet / totalRev) * 100 : 0;

  /* Regroupement par jour, pour le resume. Un jour avec des depenses mais
     sans vente apparait aussi : sans lui, la colonne marge nette ne
     retomberait pas sur le total du mois. */
  const byDate = {};
  function day(d) {
    if (!byDate[d]) byDate[d] = { rev: 0, cost: 0, qty: 0, exp: 0 };
    return byDate[d];
  }
  list.forEach(function (s) {
    const v = day(s.date);
    v.rev  += s.quantity * s.sellingPrice;
    v.cost += s.quantity * s.costPrice;
    v.qty  += s.quantity;
  });
  moExp.forEach(function (e) { day(e.date).exp += e.amount; });

  document.getElementById('pg-margins').innerHTML = `
    <div class="pg-hd">
      <h1>Marges</h1>
      <button class="btn btn-p" onclick="addSale()">${icon('plus')} Vente du jour</button>
    </div>

    ${moNav()}

    <div class="stats">
      ${st({ tone: 'blue',  icon: 'coins',   value: cfa(totalRev), count: totalRev, fmt: 'cfa', label: "Chiffre d'affaires" })}
      ${st({ tone: 'green', icon: 'percent', value: cfa(totalMargin), count: totalMargin, fmt: 'cfa',
             label: `Marge brute${totalRev ? ` · ${rate.toFixed(0)} %` : ''}` })}
      ${st({ tone: 'gold',  icon: 'box',     value: num(totalQty), count: totalQty, label: 'Plateaux vendus' })}
      ${st({ tone: 'red',   icon: 'receipt', value: cfa(totalCost), count: totalCost, fmt: 'cfa', label: 'Coût total' })}
      ${st({ tone: totalNet >= 0 ? 'green' : 'red', icon: 'trend', value: cfa(totalNet), count: totalNet, fmt: 'cfa',
             label: `Marge nette${totalRev ? ` · ${netRate.toFixed(0)} %` : ''}` })}
    </div>

    ${Object.keys(byDate).length ? `<div class="card">
      <h3>Résumé par jour</h3>
      <div class="tbl-wrap"><table>
        <thead><tr><th>Date</th><th>Plateaux</th><th>Chiffre d'aff.</th><th>Coût</th><th>Marge brute</th><th>Dépenses</th><th class="ta-r">Marge nette</th></tr></thead>
        <tbody>${Object.entries(byDate)
          .sort(function (a, b) { return b[0].localeCompare(a[0]); })
          .map(function (entry) {
            const d = entry[0], v = entry[1], m = v.rev - v.cost, n = m - v.exp;
            return `<tr>
              <td class="nowrap">${fmtD(d)}</td>
              <td>${v.qty}</td>
              <td>${cfa(v.rev)}</td>
              <td>${cfa(v.cost)}</td>
              <td style="font-weight:600;color:${m >= 0 ? 'var(--green)' : 'var(--red)'}">${cfa(m)}</td>
              <td>${v.exp ? cfa(v.exp) : '—'}</td>
              <td class="ta-r" style="font-weight:600;color:${n >= 0 ? 'var(--green)' : 'var(--red)'}">${cfa(n)}</td>
            </tr>`;
          }).join('')}</tbody>
      </table></div>
    </div>` : ''}

    ${list.length ? `<div class="card">
      <h3>Détail des ventes</h3>
      <div class="tbl-wrap"><table>
        <thead><tr><th>Date</th><th>Qté</th><th>Prix vente</th><th>Prix revient</th><th>Marge</th><th></th></tr></thead>
        <tbody>${list.map(function (s) {
          const m = (s.sellingPrice - s.costPrice) * s.quantity;
          return `<tr>
            <td class="nowrap">${fmtD(s.date)}</td>
            <td>${s.quantity}</td>
            <td>${cfa(s.sellingPrice)}</td>
            <td>${cfa(s.costPrice)}</td>
            <td style="font-weight:600;color:${m >= 0 ? 'var(--green)' : 'var(--red)'}">${cfa(m)}</td>
            <td class="nowrap">
              <button class="btn-icon edit" onclick="editSale('${s.id}')" title="Modifier">&#9998;</button>
              <button class="btn-icon" onclick="delSale('${s.id}')" title="Supprimer">&times;</button>
            </td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>
    </div>` : emptyState({
      icon: 'trend',
      title: 'Aucune vente ce mois',
      text: `Enregistrez vos ventes pour suivre le chiffre d'affaires et la marge de ${moLabel(mo)}.`,
      action: `<button class="btn btn-p" onclick="addSale()">${icon('plus')} Vente du jour</button>`
    })}`;
}

function saleForm(s) {
  const cost = s ? s.costPrice : getLatestCost();
  /* Le stock baisse tout seul a l'enregistrement : on montre ce qui reste
     en magasin pour que la quantite se saisisse en connaissance de cause.
     Sur une modification, la vente en cours est deja deduite du stock —
     on la remet pour afficher ce qui etait disponible avant elle. */
  const avail = getCurrentStock() + (s ? s.quantity : 0);
  return `
    <div class="form-g"><label>Date</label><input id="m-date" type="date" value="${s ? s.date : today()}"></div>
    <div class="form-row">
      <div class="form-g"><label>Plateaux vendus *</label><input id="m-qty" type="number" min="1" value="${s ? s.quantity : ''}"></div>
      <div class="form-g"><label>Prix de vente/plateau (FCFA) *</label><input id="m-sell" type="number" min="0" value="${s ? s.sellingPrice : ''}"></div>
    </div>
    <div class="form-hint" style="margin:-8px 0 16px">
      Stock en magasin : <strong>${num(avail)} plateau${avail > 1 ? 'x' : ''}</strong> — il baissera d'autant à l'enregistrement.
    </div>
    <div class="form-g"><label>Prix de revient/plateau (FCFA)</label>
      <input id="m-cost" type="number" min="0" value="${cost || ''}">
      ${s ? '' : '<div class="form-hint">Pré-rempli depuis la dernière réception</div>'}
    </div>`;
}

function addSale() {
  openModal('Enregistrer une vente', saleForm(null) + `
    <div class="modal-ft">
      <button class="btn btn-s" onclick="closeModal()">Annuler</button>
      <button class="btn btn-p" onclick="saveSale()">Enregistrer</button>
    </div>`);
}

function saveSale() {
  const q  = parseInt(document.getElementById('m-qty').value, 10);
  const sp = numVal('m-sell');
  const cp = numVal('m-cost');
  const d  = val('m-date') || today();
  if (!q || q <= 0 || isNaN(sp)) { toast('Quantité et prix de vente requis', 'err'); return; }
  S.sales.push({
    id: gid(),
    date: d,
    quantity: q,
    sellingPrice: sp,
    costPrice: cp || 0
  });
  /* Le stock est deduit des ventes : il n'y a rien de plus a ecrire, mais
     la page Stock doit repartir a jour si l'utilisateur y revient. */
  save(); closeModal(); refresh();
  toast('Vente enregistrée — stock à jour');
  warnStockAfter(d);
}

function editSale(id) {
  const s = S.sales.find(function (x) { return x.id === id; });
  if (!s) return;
  openModal('Modifier la vente', saleForm(s) + `
    <div class="modal-ft">
      <button class="btn btn-s" onclick="closeModal()">Annuler</button>
      <button class="btn btn-p" onclick="updSale('${id}')">Enregistrer</button>
    </div>`);
}

function updSale(id) {
  const s = S.sales.find(function (x) { return x.id === id; });
  if (!s) return;
  const q  = parseInt(document.getElementById('m-qty').value, 10);
  const sp = numVal('m-sell');
  const cp = numVal('m-cost');
  if (!q || isNaN(sp)) { toast('Champs requis', 'err'); return; }
  s.date = val('m-date') || s.date;
  s.quantity = q;
  s.sellingPrice = sp;
  s.costPrice = cp || 0;
  save(); closeModal(); refresh();
  toast('Vente modifiée — stock à jour');
  warnStockAfter(s.date);
}

async function delSale(id) {
  if (await showConfirm('Supprimer cette vente ?')) {
    S.sales = S.sales.filter(function (x) { return x.id !== id; });
    save(); refresh(); toast('Vente supprimée — stock à jour');
  }
}
