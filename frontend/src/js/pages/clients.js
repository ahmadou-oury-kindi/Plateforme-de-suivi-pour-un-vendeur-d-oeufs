/* =====================================================================
   PAGE — CLIENTS
   Fichier client complet : creation, modification, passage en inactif
   avec motif, reactivation, suppression.
   ===================================================================== */
function rClients() {
  let list = S.clients;

  if (searchQ) {
    const q = searchQ.toLowerCase();
    list = list.filter(function (c) {
      return c.name.toLowerCase().includes(q) || c.phone.includes(searchQ);
    });
  }
  if (filterType !== 'all') list = list.filter(function (c) { return c.type === filterType; });
  if (filterStat === 'actif')        list = list.filter(isActive);
  else if (filterStat === 'inactif') list = list.filter(function (c) { return !isActive(c); });
  else if (filterStat === 'fidele')  list = list.filter(isLoyal);

  /* Actifs d'abord, puis les plus anciens : les clients qui comptent
     remontent naturellement en haut du tableau. */
  list = [...list].sort(function (a, b) {
    return (isActive(b) - isActive(a)) || (clientAge(b) - clientAge(a));
  });

  const nAct   = activeClients().length;
  const nInact = S.clients.length - nAct;
  const nFid   = S.clients.filter(isLoyal).length;
  const dorm   = dormantDemand();

  document.getElementById('pg-clients').innerHTML = `
    <div class="pg-hd">
      <h1>Clients</h1>
      <button class="btn btn-p" onclick="addClient()">${icon('plus')} Nouveau client</button>
    </div>

    <div class="stats">
      ${st({ tone: 'gold',  icon: 'users',     value: num(S.clients.length), count: S.clients.length, label: 'Total clients' })}
      ${st({ tone: 'green', icon: 'userCheck', value: num(nAct), count: nAct, label: 'Actifs' })}
      ${st({ tone: 'red',   icon: 'userOff',   value: num(nInact), count: nInact,
             label: 'Inactifs' + (dorm > 0 ? ` · ${dorm} pl./sem. perdus` : '') })}
      ${st({ tone: 'gold',  icon: 'star',      value: nFid + ' ★', count: nFid, suffix: ' ★',
             label: `Fidèles (${LOYAL_MO} mois et +)` })}
      ${st({ tone: 'blue',  icon: 'box',       value: num(weeklyDemand()), count: weeklyDemand(),
             label: 'Plateaux / semaine (actifs)' })}
    </div>

    <div class="pills">
      <button class="pill ${filterStat === 'all' ? 'active' : ''}" onclick="filterStat='all';rClients()">Tous</button>
      <button class="pill ${filterStat === 'actif' ? 'active' : ''}" onclick="filterStat='actif';rClients()">Actifs (${nAct})</button>
      <button class="pill ${filterStat === 'inactif' ? 'active' : ''}" onclick="filterStat='inactif';rClients()">Inactifs (${nInact})</button>
      <button class="pill ${filterStat === 'fidele' ? 'active' : ''}" onclick="filterStat='fidele';rClients()">★ Fidèles (${nFid})</button>
    </div>

    <div class="pills">
      <button class="pill ${filterType === 'all' ? 'active' : ''}" onclick="filterType='all';rClients()">Tous types</button>
      ${TYPES.map(function (t) {
        return `<button class="pill ${filterType === t.v ? 'active' : ''}" onclick="filterType='${t.v}';rClients()">${t.p} (${countType(t.v)})</button>`;
      }).join('')}
    </div>

    ${searchBar('Rechercher un client...', searchQ, 'searchQ=this.value;rClients()')}

    ${list.length ? `<div class="card card-flat"><div class="tbl-wrap"><table>
      <thead><tr><th>Nom</th><th>Téléphone</th><th>Statut</th><th>Type</th><th>Plateaux/sem.</th><th>Ancienneté</th><th></th></tr></thead>
      <tbody>${list.map(clientRow).join('')}</tbody>
    </table></div></div>` : emptyClients()}

    ${S.clients.length ? typeBreakdown() : ''}`;
}

/* Ce que chaque categorie de client pese dans la demande.

   Place en bas de page : on parcourt d'abord la liste, puis on lit ce
   qu'elle represente. La categorie choisie dans les filtres du haut est
   surlignee ici — la selectionner repond directement a « combien de
   plateaux prend-elle ? » — mais les trois lignes restent affichees, pour
   que le chiffre garde son point de comparaison.

   Les totaux portent sur tout le fichier client, pas sur la liste filtree
   au-dessus : une repartition qui changerait a chaque recherche ne serait
   plus une repartition. */
function typeBreakdown() {
  const rows  = demandByType();
  const total = rows.reduce(function (s, r) { return s + r.trays; }, 0);
  const dorm  = rows.reduce(function (s, r) { return s + r.dormant; }, 0);

  return `<div class="card">
    <h3>${icon('box')} Plateaux par semaine, par type de client</h3>
    <div class="card-sub">Demande engagée par les clients actifs. Cliquez un type ci-dessus pour le retrouver surligné.</div>

    ${rows.map(function (r) {
      const share = total ? (r.trays / total) * 100 : 0;
      const sel = filterType === r.type.v;
      /* « 3 clients » quand ils sont tous actifs, « 2 actifs sur 3 » sinon :
         la mention ne s'allonge que lorsqu'elle apprend quelque chose. */
      const who = r.active === r.clients
        ? `${r.clients} ${plur(r.clients, 'client')}`
        : `${r.active} ${plur(r.active, 'actif')} sur ${r.clients}`;
      return `<div class="type-row ${sel ? 'is-sel' : ''}">
        <div class="t-name">
          <span class="badge ${r.type.b}">${r.type.p}</span>
          <span class="muted">${who}</span>
        </div>
        <div class="prog"><div class="prog-fill ${r.type.b.replace('badge-', '')}" style="width:${share.toFixed(1)}%"></div></div>
        <div class="t-amt">
          ${num(r.trays)} pl./sem.
          <span class="muted">${share.toFixed(0)} %${r.dormant > 0 ? ` · +${r.dormant} dormants` : ''}</span>
        </div>
      </div>`;
    }).join('')}

    <div class="type-total">
      <span>Total des clients actifs</span>
      <span>${num(total)} plateaux / semaine${total ? ` <span class="muted" style="font-weight:400">· ≈ ${num(Math.round(total * 52 / 12))} / mois</span>` : ''}</span>
    </div>
    ${dorm > 0 ? `<div class="form-hint">${num(dorm)} plateaux/semaine sont portés par des clients inactifs — volume récupérable s'ils reviennent.</div>` : ''}
  </div>`;
}

/* Une ligne du tableau des clients */
function clientRow(c) {
  const act = isActive(c);
  return `<tr class="${act ? '' : 'row-off'}">
    <td>
      <strong class="nowrap">${esc(c.name)}</strong> <span class="stars">${loyaltyStars(c)}</span>
      ${c.address ? `<span class="cell-sub">${esc(c.address)}</span>` : ''}
    </td>
    <td class="nowrap">${esc(c.phone)}</td>
    <td>
      <span class="badge ${act ? 'badge-green' : 'badge-gray'}">${act ? 'Actif' : 'Inactif'}</span>
      ${!act && c.inactiveReason ? `<span class="cell-sub">${esc(c.inactiveReason)}</span>` : ''}
    </td>
    <td>${typeBadge(c)}</td>
    <td><strong>${c.weeklyTrays || 0}</strong></td>
    <td class="nowrap" style="color:var(--tx2)">
      ${ageLabel(clientAge(c))}
      ${!act && c.statusSince ? `<span class="cell-sub">parti le ${fmtD(c.statusSince)}</span>` : ''}
    </td>
    <td class="nowrap">
      <button class="btn-icon ${act ? '' : 'ok'}" onclick="toggleStatus('${c.id}')" title="${act ? 'Marquer inactif' : 'Réactiver'}">${act ? '&#9210;' : '&#10004;'}</button>
      <button class="btn-icon edit" onclick="editClient('${c.id}')" title="Modifier">&#9998;</button>
      <button class="btn-icon" onclick="delClient('${c.id}')" title="Supprimer">&times;</button>
    </td>
  </tr>`;
}

/* Etat vide : distingue « aucun client » de « aucun resultat de filtre » */
function emptyClients() {
  const filtered = searchQ || filterType !== 'all' || filterStat !== 'all';
  if (filtered) {
    return emptyState({
      icon: 'search',
      title: 'Aucun résultat',
      text: 'Aucun client ne correspond à cette recherche ou à ces filtres.',
      action: `<button class="btn btn-s" onclick="searchQ='';filterType='all';filterStat='all';rClients()">Réinitialiser les filtres</button>`
    });
  }
  return emptyState({
    icon: 'users',
    title: 'Aucun client enregistré',
    text: 'Ajoutez vos clients pour suivre leur demande hebdomadaire, leur fidélité et leurs dettes.',
    action: `<button class="btn btn-p" onclick="addClient()">${icon('plus')} Nouveau client</button>`
  });
}

/* --- Formulaires --- */

function clientForm(c) {
  const isNew = !c;
  return `
    <div class="form-g"><label>Nom complet *</label><input id="m-name" value="${isNew ? '' : esc(c.name)}"></div>
    <div class="form-g"><label>Téléphone *</label><input id="m-phone" type="tel" value="${isNew ? '' : esc(c.phone)}"></div>
    <div class="form-row">
      <div class="form-g"><label>Type de client</label><select id="m-type">${typeOpts(isNew ? 'final' : clientType(c).v)}</select></div>
      <div class="form-g"><label>Statut</label><select id="m-status">
        <option value="actif" ${isNew || isActive(c) ? 'selected' : ''}>Actif</option>
        <option value="inactif" ${!isNew && !isActive(c) ? 'selected' : ''}>Inactif</option>
      </select></div>
    </div>
    <div class="form-row">
      <div class="form-g"><label>Plateaux par semaine</label><input id="m-week" type="number" min="0" step="1" value="${isNew ? 0 : (c.weeklyTrays || 0)}"></div>
      <div class="form-g"><label>Client depuis</label><input id="m-since" type="date" value="${isNew ? today() : esc(c.since || (c.createdAt || '').substring(0, 10))}"></div>
    </div>
    <div class="form-hint">${isNew
      ? "Plateaux/semaine : quantité habituelle, sert à estimer la demande et la couverture du stock. Client depuis : sert à calculer l'ancienneté et la fidélité."
      : `Ancienneté actuelle : <strong>${ageLabel(clientAge(c))}</strong>${isLoyal(c) ? ' — client fidèle &#9733;' : ''}${!isActive(c) && c.inactiveReason ? ` &middot; Inactif : ${esc(c.inactiveReason)}` : ''}`}</div>
    <div class="form-g"><label>Adresse</label><input id="m-addr" value="${isNew ? '' : esc(c.address || '')}"></div>
    <div class="form-g"><label>Notes</label><textarea id="m-notes" rows="2">${isNew ? '' : esc(c.notes || '')}</textarea></div>`;
}

function addClient() {
  openModal('Nouveau client', clientForm(null) + `
    <div class="modal-ft">
      <button class="btn btn-s" onclick="closeModal()">Annuler</button>
      <button class="btn btn-p" onclick="saveClient()">Enregistrer</button>
    </div>`);
}

function editClient(id) {
  const c = S.clients.find(function (x) { return x.id === id; });
  if (!c) return;
  openModal('Modifier le client', clientForm(c) + `
    <div class="modal-ft">
      <button class="btn btn-s" onclick="closeModal()">Annuler</button>
      <button class="btn btn-p" onclick="updClient('${id}')">Enregistrer</button>
    </div>`);
}

/* Lit et valide le formulaire. Renvoie null si la saisie est invalide,
   apres avoir affiche le message d'erreur. */
function readClientForm() {
  const name  = val('m-name');
  const phone = val('m-phone');
  if (!name || !phone) { toast('Nom et téléphone requis', 'err'); return null; }

  const raw = document.getElementById('m-week').value;
  const w = parseInt(raw, 10);
  if (raw !== '' && (isNaN(w) || w < 0)) { toast('Nombre de plateaux invalide', 'err'); return null; }

  return {
    name: name,
    phone: phone,
    type: val('m-type'),
    status: val('m-status'),
    since: val('m-since'),
    weeklyTrays: isNaN(w) ? 0 : w,
    address: val('m-addr'),
    notes: val('m-notes')
  };
}

function saveClient() {
  const f = readClientForm();
  if (!f) return;
  f.since = f.since || today();
  S.clients.push(Object.assign({
    id: gid(),
    statusSince: today(),
    inactiveReason: '',
    createdAt: new Date().toISOString()
  }, f));
  save(); closeModal(); rClients(); toast('Client ajouté');
}

function updClient(id) {
  const c = S.clients.find(function (x) { return x.id === id; });
  if (!c) return;
  const f = readClientForm();
  if (!f) return;

  /* Un changement de statut redate le passage actif / inactif */
  if (f.status !== (c.status || 'actif')) {
    c.statusSince = today();
    if (f.status === 'actif') c.inactiveReason = '';
  }
  /* Un champ date vide ne doit pas effacer l'anciennete deja connue */
  f.since = f.since || c.since;
  Object.assign(c, f);
  save(); closeModal(); rClients(); toast('Client modifié');
}

function toggleStatus(id) {
  const c = S.clients.find(function (x) { return x.id === id; });
  if (!c) return;
  isActive(c) ? askInactive(id) : reactivate(id);
}

function askInactive(id) {
  const c = S.clients.find(function (x) { return x.id === id; });
  if (!c) return;
  openModal('Marquer comme inactif', `
    <p style="margin-bottom:14px"><strong>${esc(c.name)}</strong> n'achète plus pour le moment. Il reste dans la liste mais sort de la demande hebdomadaire et perd son ancienneté de fidélité.</p>
    <div class="form-row">
      <div class="form-g"><label>Inactif depuis</label><input id="m-sdate" type="date" value="${today()}"></div>
      <div class="form-g"><label>Raison</label><select id="m-reason">
        <option>Hausse des prix</option><option>Parti chez un concurrent</option>
        <option>Arr&ecirc;t d'activit&eacute;</option><option>D&eacute;m&eacute;nagement</option>
        <option>Impay&eacute;</option><option>Autre</option>
      </select></div>
    </div>
    <div class="form-g"><label>Précision</label><input id="m-rnote" placeholder="Optionnel"></div>
    <div class="modal-ft">
      <button class="btn btn-s" onclick="closeModal()">Annuler</button>
      <button class="btn btn-p" onclick="saveInactive('${id}')">Confirmer</button>
    </div>`);
}

function saveInactive(id) {
  const c = S.clients.find(function (x) { return x.id === id; });
  if (!c) return;
  const r = val('m-reason'), note = val('m-rnote');
  c.status = 'inactif';
  c.statusSince = val('m-sdate') || today();
  c.inactiveReason = note ? r + ' — ' + note : r;
  save(); closeModal(); rClients(); toast(c.name + ' marqué inactif');
}

async function reactivate(id) {
  const c = S.clients.find(function (x) { return x.id === id; });
  if (!c) return;
  if (await showConfirm('Réactiver ' + esc(c.name) + ' ? Son ancienneté de fidélité repart à zéro.', false)) {
    c.status = 'actif';
    c.statusSince = today();
    c.since = today();
    c.inactiveReason = '';
    save(); rClients(); toast(c.name + ' réactivé');
  }
}

async function delClient(id) {
  const c = S.clients.find(function (x) { return x.id === id; });
  if (!c) return;
  if (await showConfirm('Supprimer <strong>' + esc(c.name) + '</strong> ? Cette action est irréversible.')) {
    S.clients = S.clients.filter(function (x) { return x.id !== id; });
    save(); rClients(); toast('Client supprimé');
  }
}
