/* =====================================================================
   PAGE — DETTES
   Chaque dette garde son montant d'origine ; les reglements s'ajoutent
   dans payments[]. La barre de progression montre la part deja reglee.
   ===================================================================== */
function rDebts() {
  let list = [...S.debts];
  if (filterDebt === 'en_cours')    list = list.filter(function (d) { return debtStatus(d) === 'en_cours'; });
  else if (filterDebt === 'soldee') list = list.filter(function (d) { return debtStatus(d) === 'soldee'; });
  list.sort(function (a, b) { return b.date.localeCompare(a.date); });

  const enCours = countDebts('en_cours');
  const soldees = countDebts('soldee');

  document.getElementById('pg-debts').innerHTML = `
    <div class="pg-hd">
      <h1>Dettes</h1>
      <button class="btn btn-p" onclick="addDebt()">${icon('plus')} Nouvelle dette</button>
    </div>

    <div class="stats">
      ${st({ tone: 'red',   icon: 'alert',       value: cfa(totalOwed()), count: totalOwed(), fmt: 'cfa', label: 'Total dettes en cours' })}
      ${st({ tone: 'gold',  icon: 'clock',       value: num(enCours), count: enCours, label: 'Dettes actives' })}
      ${st({ tone: 'green', icon: 'checkCircle', value: num(soldees), count: soldees, label: 'Dettes soldées' })}
    </div>

    <div class="pills">
      <button class="pill ${filterDebt === 'all' ? 'active' : ''}" onclick="filterDebt='all';rDebts()">Toutes (${S.debts.length})</button>
      <button class="pill ${filterDebt === 'en_cours' ? 'active' : ''}" onclick="filterDebt='en_cours';rDebts()">En cours (${enCours})</button>
      <button class="pill ${filterDebt === 'soldee' ? 'active' : ''}" onclick="filterDebt='soldee';rDebts()">Soldées (${soldees})</button>
    </div>

    ${list.length ? `<div class="debt-list">${list.map(debtCard).join('')}</div>` : emptyDebts()}`;
}

/* Carte d'une dette : entete, progression, historique des paiements */
function debtCard(d) {
  const rem    = debtRemaining(d);
  const paid   = debtPaid(d);
  const status = debtStatus(d);
  const pays   = d.payments || [];
  const c      = S.clients.find(function (x) { return x.id === d.clientId; });

  return `<div class="card">
    <div class="debt-hd">
      <div>
        <span class="debt-name">${esc(clientName(d.clientId))}</span>
        ${c && !isActive(c) ? ' <span class="badge badge-gray">Inactif</span>' : ''}
        <div class="debt-meta">${d.description ? esc(d.description) + ' — ' : ''}${fmtD(d.date)}</div>
      </div>
      <div class="debt-amt">
        <span class="badge ${status === 'en_cours' ? 'badge-red' : 'badge-green'}">${status === 'en_cours' ? 'En cours' : 'Soldée'}</span>
        <div class="rem">${cfa(rem > 0 ? rem : 0)}</div>
        <div class="tot">sur ${cfa(d.amount)}</div>
      </div>
    </div>

    <div class="debt-prog">
      <div class="prog-lbl"><span>${cfa(paid)} réglés</span><span>${pct(paid, d.amount).toFixed(0)} %</span></div>
      ${prog(paid, d.amount)}
    </div>

    ${pays.length ? `<div class="pay-list">${pays.map(function (p) {
      return `<div class="pay-row">
        <span class="pay-amt">+${cfa(p.amount)}</span>
        <span class="pay-date">${fmtD(p.date)}${p.note ? ' — ' + esc(p.note) : ''}</span>
      </div>`;
    }).join('')}</div>` : ''}

    <div class="debt-actions">
      ${status === 'en_cours' ? `<button class="btn btn-s btn-sm" onclick="addPayment('${d.id}')">${icon('plus')} Paiement</button>` : ''}
      <button class="btn-icon" onclick="delDebt('${d.id}')" title="Supprimer">&times;</button>
    </div>
  </div>`;
}

function emptyDebts() {
  if (filterDebt !== 'all') {
    return emptyState({
      icon: 'wallet', small: true,
      title: filterDebt === 'en_cours' ? 'Aucune dette en cours' : 'Aucune dette soldée',
      text: filterDebt === 'en_cours' ? 'Tout est réglé — rien à recouvrer pour le moment.' : 'Aucune dette n\'a encore été soldée.',
      action: `<button class="btn btn-s" onclick="filterDebt='all';rDebts()">Voir toutes les dettes</button>`
    });
  }
  return emptyState({
    icon: 'wallet',
    title: 'Aucune dette enregistrée',
    text: 'Enregistrez une dette pour suivre les montants dus et les paiements partiels de vos clients.',
    action: `<button class="btn btn-p" onclick="addDebt()">${icon('plus')} Nouvelle dette</button>`
  });
}

/* --- Selection du client dans le formulaire --- */

/* Filtre la liste deroulante pendant la frappe et resume ce qui est
   propose : seuls les clients actifs peuvent recevoir une nouvelle dette. */
function filterClientSel() {
  const q    = document.getElementById('m-csearch').value;
  const sel  = document.getElementById('m-client');
  const prev = sel.value;

  sel.innerHTML = clientOpts(q);
  if (prev && [...sel.options].some(function (o) { return o.value === prev; })) sel.value = prev;

  const n = sel.options.length;
  const trimmed = q.trim().toLowerCase();
  const hidden = trimmed
    ? S.clients.filter(function (c) { return !isActive(c) && c.name.toLowerCase().includes(trimmed); }).length
    : 0;

  document.getElementById('m-cinfo').textContent = n
    ? `${n} ${plur(n, 'client')} ${plur(n, 'actif', 's')}`
      + (hidden ? ` · ${hidden} ${plur(hidden, 'inactif')} ${plur(hidden, 'masqué')}` : '')
    : (hidden
        ? `Aucun client actif — ${hidden} ${plur(hidden, 'client')} ${plur(hidden, 'inactif')} ${hidden > 1 ? 'correspondent' : 'correspond'} : réactivez-le depuis la page Clients.`
        : 'Aucun client ne correspond à cette recherche.');
}

function addDebt() {
  const act = activeClients().length;
  if (!act) {
    toast(S.clients.length ? "Aucun client actif — réactivez un client d'abord" : "Ajoutez d'abord un client", 'err');
    return;
  }
  openModal('Nouvelle dette', `
    <div class="form-g"><label>Client *</label>
      <input id="m-csearch" placeholder="Rechercher par nom ou téléphone..." oninput="filterClientSel()" autocomplete="off">
      <select id="m-client" style="margin-top:6px">${clientOpts('')}</select>
      <div class="form-hint" id="m-cinfo">${act} ${plur(act, 'client')} ${plur(act, 'actif', 's')} · les inactifs ne sont pas proposés</div>
    </div>
    <div class="form-g"><label>Montant (FCFA) *</label><input id="m-amount" type="number" min="0"></div>
    <div class="form-g"><label>Description</label><input id="m-desc" placeholder="Ex: Achat 20 plateaux"></div>
    <div class="form-g"><label>Date</label><input id="m-date" type="date" value="${today()}"></div>
    <div class="modal-ft">
      <button class="btn btn-s" onclick="closeModal()">Annuler</button>
      <button class="btn btn-p" onclick="saveDebt()">Enregistrer</button>
    </div>`);
}

function saveDebt() {
  const cid = val('m-client');
  if (!cid) { toast('Sélectionnez un client', 'err'); return; }
  const amt = numVal('m-amount');
  if (!amt || amt <= 0) { toast('Montant invalide', 'err'); return; }

  S.debts.push({
    id: gid(),
    clientId: cid,
    amount: amt,
    description: val('m-desc'),
    date: val('m-date') || today(),
    payments: []
  });
  save(); closeModal(); rDebts(); toast('Dette ajoutée');
}

function addPayment(debtId) {
  const d = S.debts.find(function (x) { return x.id === debtId; });
  if (!d) return;
  const rem = debtRemaining(d);

  openModal('Ajouter un paiement', `
    <p style="margin-bottom:8px">Reste à payer : <strong>${cfa(rem)}</strong></p>
    <div class="prog-lbl"><span>${cfa(debtPaid(d))} déjà réglés</span><span>sur ${cfa(d.amount)}</span></div>
    ${prog(debtPaid(d), d.amount)}
    <div class="form-g" style="margin-top:16px"><label>Montant du paiement (FCFA) *</label><input id="m-payamt" type="number" min="0" max="${rem}" value="${rem}"></div>
    <div class="form-g"><label>Date</label><input id="m-paydate" type="date" value="${today()}"></div>
    <div class="form-g"><label>Note</label><input id="m-paynote" placeholder="Ex: Acompte"></div>
    <div class="modal-ft">
      <button class="btn btn-s" onclick="closeModal()">Annuler</button>
      <button class="btn btn-p" onclick="savePayment('${debtId}')">Enregistrer</button>
    </div>`);
}

function savePayment(debtId) {
  const d = S.debts.find(function (x) { return x.id === debtId; });
  if (!d) return;
  const amt = numVal('m-payamt');
  if (!amt || amt <= 0) { toast('Montant invalide', 'err'); return; }

  if (!d.payments) d.payments = [];
  d.payments.push({
    id: gid(),
    amount: amt,
    date: val('m-paydate') || today(),
    note: val('m-paynote')
  });
  save(); closeModal(); rDebts();
  toast(debtStatus(d) === 'soldee' ? 'Dette soldée !' : 'Paiement enregistré');
}

async function delDebt(id) {
  const d = S.debts.find(function (x) { return x.id === id; });
  if (!d) return;
  if (await showConfirm('Supprimer la dette de <strong>' + esc(clientName(d.clientId)) + '</strong> et son historique de paiements ?')) {
    S.debts = S.debts.filter(function (x) { return x.id !== id; });
    save(); rDebts(); toast('Dette supprimée');
  }
}
