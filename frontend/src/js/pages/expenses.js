/* =====================================================================
   PAGE — DEPENSES
   Saisie par categorie, navigation mois par mois, repartition visuelle.
   ===================================================================== */
function rExpenses() {
  const mo = selMonth;
  const list = S.expenses
    .filter(function (e) { return e.date.startsWith(mo); })
    .sort(function (a, b) { return b.date.localeCompare(a.date); });

  const total = list.reduce(function (s, e) { return s + e.amount; }, 0);

  const byCat = {};
  list.forEach(function (e) { byCat[e.category] = (byCat[e.category] || 0) + e.amount; });
  const topCat = Object.entries(byCat).sort(function (a, b) { return b[1] - a[1]; });

  document.getElementById('pg-expenses').innerHTML = `
    <div class="pg-hd">
      <h1>Dépenses</h1>
      <button class="btn btn-p" onclick="addExpense()">${icon('plus')} Nouvelle dépense</button>
    </div>

    ${moNav()}

    <div class="stats">
      ${st({ tone: 'red',  icon: 'receipt', value: cfa(total), count: total, fmt: 'cfa', label: 'Total dépenses' })}
      ${st({ tone: 'gold', icon: 'list',    value: num(list.length), count: list.length, label: "Nombre d'entrées" })}
      ${st({ tone: 'blue', icon: 'tag',     value: topCat.length ? esc(topCat[0][0]) : '—', label: 'Catégorie principale' })}
    </div>

    ${topCat.length ? `<div class="card">
      <h3>Répartition par catégorie</h3>
      ${topCat.map(function (entry) {
        const cat = entry[0], amt = entry[1];
        return `<div class="cat-row">
          <span class="cat-name">${esc(cat)}</span>
          ${prog(amt, total, 'gold')}
          <span class="cat-amt">${cfa(amt)}</span>
        </div>`;
      }).join('')}
    </div>` : ''}

    ${list.length ? `<div class="card card-flat"><div class="tbl-wrap"><table>
      <thead><tr><th>Date</th><th>Description</th><th>Catégorie</th><th class="ta-r">Montant</th><th></th></tr></thead>
      <tbody>${list.map(function (e) {
        const linked = !!e.lossId;
        return `<tr${linked ? ' class="row-linked"' : ''}>
          <td class="nowrap">${fmtD(e.date)}</td>
          <td>${esc(e.description)}${linked ? ' <span class="link-tag" title="Liée à une casse — gérez-la depuis Stock">&#128274;</span>' : ''}</td>
          <td><span class="badge ${linked ? 'badge-red' : 'badge-gold'}">${esc(e.category)}</span></td>
          <td class="ta-r" style="font-weight:600">${cfa(e.amount)}</td>
          <td class="nowrap">
            <button class="btn-icon edit" onclick="editExpense('${e.id}')" title="${linked ? 'Liée à une casse — modifiez-la depuis Stock' : 'Modifier'}">&#9998;</button>
            <button class="btn-icon" onclick="delExpense('${e.id}')" title="${linked ? 'Liée à une casse — supprimez-la depuis Stock' : 'Supprimer'}">&times;</button>
          </td>
        </tr>`;
      }).join('')}</tbody>
    </table></div></div>` : emptyState({
      icon: 'receipt',
      title: 'Aucune dépense ce mois',
      text: `Rien n'a encore été enregistré pour ${moLabel(mo)}.`,
      action: `<button class="btn btn-p" onclick="addExpense()">${icon('plus')} Nouvelle dépense</button>`
    })}`;
}

/* Options de categorie. Une categorie disparue de CATS mais presente dans
   une ancienne depense reste proposee, pour ne pas la perdre en modifiant.
   La categorie « Casse / Perte » est reservee aux depenses auto-generees :
   on l'exclut du formulaire manuel pour qu'elle ne devienne pas un simple
   libelle sans lien avec une declaration de casse. */
function catOpts(sel) {
  let list = CATS.filter(function (c) { return c !== LOSS_CAT; });
  if (sel && !list.includes(sel)) list = list.concat([sel]);
  return list.map(function (c) {
    return '<option' + (c === sel ? ' selected' : '') + '>' + esc(c) + '</option>';
  }).join('');
}

function expenseForm(e) {
  return `
    <div class="form-g"><label>Description *</label><input id="m-desc" value="${e ? esc(e.description) : ''}"></div>
    <div class="form-row">
      <div class="form-g"><label>Montant (FCFA) *</label><input id="m-amount" type="number" min="0" value="${e ? e.amount : ''}"></div>
      <div class="form-g"><label>Catégorie</label><select id="m-cat">${catOpts(e ? e.category : null)}</select></div>
    </div>
    <div class="form-g"><label>Date</label><input id="m-date" type="date" value="${e ? e.date : today()}"></div>`;
}

function addExpense() {
  openModal('Nouvelle dépense', expenseForm(null) + `
    <div class="modal-ft">
      <button class="btn btn-s" onclick="closeModal()">Annuler</button>
      <button class="btn btn-p" onclick="saveExpense()">Enregistrer</button>
    </div>`);
}

function saveExpense() {
  const desc = val('m-desc'), amt = numVal('m-amount');
  if (!desc || !amt || amt <= 0) { toast('Description et montant requis', 'err'); return; }
  S.expenses.push({
    id: gid(),
    description: desc,
    amount: amt,
    category: val('m-cat'),
    date: val('m-date') || today()
  });
  save(); closeModal(); rExpenses(); toast('Dépense ajoutée');
}

function editExpense(id) {
  const e = S.expenses.find(function (x) { return x.id === id; });
  if (!e) return;
  if (e.lossId) {
    toast('Cette dépense est liée à une casse — modifiez-la depuis la page Stock', 'info');
    return;
  }
  openModal('Modifier la dépense', expenseForm(e) + `
    <div class="modal-ft">
      <button class="btn btn-s" onclick="closeModal()">Annuler</button>
      <button class="btn btn-p" onclick="updExpense('${id}')">Enregistrer</button>
    </div>`);
}

function updExpense(id) {
  const e = S.expenses.find(function (x) { return x.id === id; });
  if (!e) return;
  const desc = val('m-desc'), amt = numVal('m-amount');
  if (!desc || !amt) { toast('Champs requis', 'err'); return; }
  e.description = desc;
  e.amount = amt;
  e.category = val('m-cat');
  e.date = val('m-date');
  save(); closeModal(); rExpenses(); toast('Dépense modifiée');
}

async function delExpense(id) {
  const e = S.expenses.find(function (x) { return x.id === id; });
  if (!e) return;
  if (e.lossId) {
    toast('Cette dépense est liée à une casse — supprimez-la depuis la page Stock', 'info');
    return;
  }
  if (await showConfirm('Supprimer cette dépense ?')) {
    S.expenses = S.expenses.filter(function (x) { return x.id !== id; });
    save(); rExpenses(); toast('Dépense supprimée');
  }
}
