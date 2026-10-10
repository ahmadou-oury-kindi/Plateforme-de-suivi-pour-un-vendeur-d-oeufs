/* =====================================================================
   PAGE — DETTES
   Chaque dette garde son montant d'origine ; les reglements s'ajoutent
   dans payments[]. La barre de progression montre la part deja reglee.

   La page a deux vues :
     · liste des clients, regroupant toutes leurs dettes en une carte ;
     · detail d'un client, qui remonte chaque dette individuellement avec
       ses paiements et les actions habituelles.
   La variable debtClientView (voir state.js) choisit la vue.
   ===================================================================== */
function rDebts() {
  if (debtClientView) { rDebtDetail(debtClientView); return; }
  rDebtList();
}

/* --- Vue liste : une carte par client -------------------------------- */
function rDebtList() {
  const groups = debtsByClient();

  /* Reste a payer en premier, puis dates les plus recentes pour
     departager : ce sont les clients a relancer qui restent en haut.
     On tri sur activeRemaining : un client qui a tout solde glisse en
     bas, meme s'il a eu de grosses dettes par le passe. */
  groups.sort(function (a, b) {
    return (b.activeRemaining - a.activeRemaining)
        || b.lastActiveDate.localeCompare(a.lastActiveDate)
        || b.lastDate.localeCompare(a.lastDate);
  });

  let list = groups;
  if (filterDebt === 'en_cours')    list = groups.filter(function (g) { return clientDebtStatus(g) === 'en_cours'; });
  else if (filterDebt === 'soldee') list = groups.filter(function (g) { return clientDebtStatus(g) === 'soldee'; });

  const nAll = groups.length;
  const nEn  = groups.filter(function (g) { return clientDebtStatus(g) === 'en_cours'; }).length;
  const nSo  = groups.filter(function (g) { return clientDebtStatus(g) === 'soldee'; }).length;

  /* Les stats du haut gardent leur echelle « dettes » : total du,
     dettes actives et dettes soldees — ces chiffres macro restent
     parlants meme si l'affichage est maintenant groupe. */
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
      <button class="pill ${filterDebt === 'all' ? 'active' : ''}" onclick="filterDebt='all';rDebts()">Tous (${nAll})</button>
      <button class="pill ${filterDebt === 'en_cours' ? 'active' : ''}" onclick="filterDebt='en_cours';rDebts()">En cours (${nEn})</button>
      <button class="pill ${filterDebt === 'soldee' ? 'active' : ''}" onclick="filterDebt='soldee';rDebts()">Soldés (${nSo})</button>
    </div>

    ${list.length ? `<div class="debt-list">${list.map(clientDebtCard).join('')}</div>` : emptyDebts()}`;
}

/* Carte groupee pour un client : clic -> vue detail.
   La carte parle de la situation COURANTE : seuls les montants des dettes
   non soldees sont additionnes, et la barre reflete le reglement en cours.
   L'historique soldee reste consultable dans la vue detail. */
function clientDebtCard(g) {
  const status = clientDebtStatus(g);
  const c      = S.clients.find(function (x) { return x.id === g.clientId; });
  const soldee = status === 'soldee';
  const nT     = g.debts.length;

  /* Compteur : on affiche d'abord ce qui est a surveiller (dettes en
     cours). Quand tout est solde, on bascule sur le total historique. */
  const meta = soldee
    ? `${nT} ${plur(nT, 'dette')} ${plur(nT, 'soldée')}`
    : `${g.activeCount} ${plur(g.activeCount, 'dette')} en cours`
      + (nT > g.activeCount ? ` <span class="debt-meta-sec">· ${nT - g.activeCount} ${plur(nT - g.activeCount, 'soldée')}</span>` : '');

  return `<div class="card debt-client-card" onclick="openDebtClient('${g.clientId}')" role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openDebtClient('${g.clientId}')}">
    <div class="debt-hd">
      <div>
        <span class="debt-name">${esc(clientName(g.clientId))}</span>
        ${c && !isActive(c) ? ' <span class="badge badge-gray">Inactif</span>' : ''}
        <div class="debt-meta">${meta}</div>
      </div>
      <div class="debt-amt">
        <span class="badge ${soldee ? 'badge-green' : 'badge-red'}">${soldee ? 'Soldé' : 'En cours'}</span>
        <div class="rem">${cfa(g.activeRemaining)}</div>
        ${soldee ? '' : `<div class="tot">sur ${cfa(g.activeOwed)}</div>`}
      </div>
    </div>

    <div class="debt-prog">
      <div class="prog-lbl">
        <span>${soldee ? 'Tout réglé' : cfa(g.activePaid) + ' réglés'}</span>
        <span>${soldee ? '100 %' : pct(g.activePaid, g.activeOwed).toFixed(0) + ' %'}</span>
      </div>
      ${soldee ? prog(1, 1) : prog(g.activePaid, g.activeOwed)}
    </div>
  </div>`;
}

/* --- Vue detail : l'historique complet des dettes d'un client -------- */
function rDebtDetail(clientId) {
  const groups = debtsByClient();
  const g = groups.find(function (x) { return x.clientId === clientId; });

  /* Le client peut ne plus avoir de dettes (toutes supprimees pendant la
     navigation) : on retombe automatiquement sur la liste. */
  if (!g) { debtClientView = null; rDebtList(); return; }

  const c      = S.clients.find(function (x) { return x.id === clientId; });
  const status = clientDebtStatus(g);
  const soldee = status === 'soldee';

  /* Deux groupes : les dettes qui courent, en haut, puis l'archive, dans
     un bloc replie par defaut. Les deux triees de la plus recente a la
     plus ancienne. */
  const sortByDateDesc = function (a, b) { return b.date.localeCompare(a.date); };
  const actives = g.debts.filter(function (d) { return debtStatus(d) === 'en_cours'; }).sort(sortByDateDesc);
  const archive = g.debts.filter(function (d) { return debtStatus(d) === 'soldee'; }).sort(sortByDateDesc);

  /* Les totaux recapitulatifs reflettent la carte : uniquement les
     dettes en cours. L'historique soldee est consultable plus bas sans
     polluer les chiffres du haut. */
  const progHd = soldee
    ? `<div class="prog-lbl"><span>Tout soldé</span><span>100 %</span></div>${prog(1, 1)}`
    : `<div class="prog-lbl"><span>${actives.length} ${plur(actives.length, 'dette')} en cours</span><span>${pct(g.activePaid, g.activeOwed).toFixed(0)} %</span></div>${prog(g.activePaid, g.activeOwed)}`;

  document.getElementById('pg-debts').innerHTML = `
    <button class="debt-back" onclick="closeDebtClient()" aria-label="Retour à la liste des clients">&larr; Clients</button>
    <div class="pg-hd debt-detail-hd">
      <div class="debt-detail-title">
        <h1>${esc(clientName(clientId))}</h1>
        ${c && !isActive(c) ? '<span class="badge badge-gray">Inactif</span>' : ''}
        <span class="badge ${soldee ? 'badge-green' : 'badge-red'}">${soldee ? 'Soldé' : 'En cours'}</span>
      </div>
      <button class="btn btn-p" onclick="addDebt('${clientId}')">${icon('plus')} Nouvelle dette</button>
    </div>

    <div class="stats">
      ${st({ tone: 'red',   icon: 'alert',       value: cfa(g.activeRemaining), count: g.activeRemaining, fmt: 'cfa', label: 'Reste à payer' })}
      ${st({ tone: 'gold',  icon: 'wallet',      value: cfa(g.activeOwed),      count: g.activeOwed,      fmt: 'cfa', label: 'Dû (en cours)' })}
      ${st({ tone: 'green', icon: 'checkCircle', value: cfa(g.activePaid),      count: g.activePaid,      fmt: 'cfa', label: 'Déjà réglé' })}
    </div>

    <div class="debt-prog debt-detail-prog">${progHd}</div>

    ${actives.length ? `
      <h3 class="debt-section-hd">${icon('clock')} En cours <span class="debt-section-count">(${actives.length})</span></h3>
      <div class="debt-list">${actives.map(debtCard).join('')}</div>
    ` : `
      <div class="debt-section-empty">${icon('checkCircle')} Aucune dette en cours — tout est soldé.</div>
    `}

    ${archive.length ? `
      <details class="debt-archive"${soldee && !actives.length ? ' open' : ''}>
        <summary><span class="debt-section-hd debt-section-hd--inline">${icon('checkCircle')} Historique soldé <span class="debt-section-count">(${archive.length})</span></span></summary>
        <div class="debt-list debt-list--archive">${archive.map(debtCard).join('')}</div>
      </details>
    ` : ''}`;
}

function openDebtClient(id) {
  debtClientView = id;
  render();                      /* passe par render() pour rejouer l'animation d'entree */
}

function closeDebtClient() {
  debtClientView = null;
  render();
}

/* Carte d'une dette : entete, progression, historique des paiements.
   Utilisee dans la vue detail d'un client (plus jamais dans la liste
   principale, qui groupe par client). */
function debtCard(d) {
  const rem    = debtRemaining(d);
  const paid   = debtPaid(d);
  const status = debtStatus(d);
  const pays   = d.payments || [];

  /* Les anciennes dettes n'ont ni plateaux ni prix unitaire : on
     n'affiche la ligne de detail que lorsque les deux sont renseignes. */
  const hasBreakdown = d.plateaux != null && d.prixUnitaire != null;

  return `<div class="card">
    <div class="debt-hd">
      <div>
        <span class="debt-name">${cfa(d.amount)}</span>
        <div class="debt-meta">${d.description ? esc(d.description) + ' — ' : ''}${fmtD(d.date)}${hasBreakdown ? ` · ${num(d.plateaux)} ${plur(d.plateaux, 'plateau', 'x')} × ${cfa(d.prixUnitaire)}` : ''}</div>
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
      title: filterDebt === 'en_cours' ? 'Aucun client avec dette en cours' : 'Aucun client entièrement soldé',
      text: filterDebt === 'en_cours' ? 'Tout est réglé — rien à recouvrer pour le moment.' : 'Aucun client n\'a encore soldé l\'ensemble de ses dettes.',
      action: `<button class="btn btn-s" onclick="filterDebt='all';rDebts()">Voir tous les clients</button>`
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

/* Recalcule le montant a partir du nombre de plateaux et du prix
   unitaire. Un des deux champs vide efface le total : on ne devine pas
   une valeur pour l'utilisateur. */
function updDebtAmount() {
  const n = document.getElementById('m-plateaux').value;
  const p = document.getElementById('m-prixu').value;
  const amt = document.getElementById('m-amount');
  if (n === '' || p === '') { amt.value = ''; return; }
  const total = Math.round(parseFloat(n) * parseFloat(p));
  amt.value = isFinite(total) && total >= 0 ? total : '';
}

function addDebt(presetClientId) {
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
    <div class="form-row">
      <div class="form-g"><label>Nombre de plateaux *</label><input id="m-plateaux" type="number" min="0" step="1" oninput="updDebtAmount()"></div>
      <div class="form-g"><label>Prix par plateau (FCFA) *</label><input id="m-prixu" type="number" min="0" oninput="updDebtAmount()"></div>
    </div>
    <div class="form-g"><label>Montant (FCFA)</label><input id="m-amount" type="number" readonly><div class="form-hint">Calculé automatiquement : plateaux × prix.</div></div>
    <div class="form-g"><label>Description</label><input id="m-desc" placeholder="Ex: Livraison du 10/02"></div>
    <div class="form-g"><label>Date</label><input id="m-date" type="date" value="${today()}"></div>
    <div class="modal-ft">
      <button class="btn btn-s" onclick="closeModal()">Annuler</button>
      <button class="btn btn-p" onclick="saveDebt()">Enregistrer</button>
    </div>`);

  /* Pre-selection du client quand on ouvre le formulaire depuis la vue
     detail : le client courant est propose d'office. Si ce client n'est
     plus actif, on laisse la selection vide — le select ne contient que
     les actifs — pour forcer un choix volontaire. */
  if (presetClientId) {
    const sel = document.getElementById('m-client');
    if ([...sel.options].some(function (o) { return o.value === presetClientId; })) {
      sel.value = presetClientId;
    }
  }
}

function saveDebt() {
  const cid = val('m-client');
  if (!cid) { toast('Sélectionnez un client', 'err'); return; }

  const n = numVal('m-plateaux');
  const p = numVal('m-prixu');
  if (isNaN(n) || n <= 0) { toast('Nombre de plateaux invalide', 'err'); return; }
  if (isNaN(p) || p <= 0) { toast('Prix par plateau invalide', 'err'); return; }

  const amt = Math.round(n * p);
  if (!amt || amt <= 0) { toast('Montant calculé invalide', 'err'); return; }

  S.debts.push({
    id: gid(),
    clientId: cid,
    amount: amt,
    plateaux: n,
    prixUnitaire: p,
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
