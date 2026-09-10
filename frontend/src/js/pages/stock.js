/* =====================================================================
   PAGE — STOCK
   Trois blocs : la journee en cours, les besoins clients, puis le mois
   (receptions et journal quotidien).

   Regle de calcul : stock = point de depart + receptions - ventes (voir
   helpers/stock.js). Rien n'est saisi deux fois : une vente enregistree
   dans Marges fait baisser le stock ici, automatiquement. L'inventaire du
   soir ne sert qu'a recaler le compteur sur le comptage physique.
   ===================================================================== */
function rStock() {
  const t  = today();
  const mo = selMonth;

  const received = getReceived(t);
  const sold     = getSold(t);
  const inv      = inventoryOn(t);
  const gap      = stockGap(t);
  const curStock = getCurrentStock();
  const needsInit = needsInitialStock();

  const wDem  = weeklyDemand();
  const dDem  = dailyDemand();
  const cover = dDem > 0 ? curStock / dDem : null;
  const dorm  = dormantDemand();
  const lastRec = lastReception();

  const engaged = activeClients()
    .filter(function (c) { return (c.weeklyTrays || 0) > 0; })
    .sort(function (a, b) { return (b.weeklyTrays || 0) - (a.weeklyTrays || 0); });

  const moDates = activeDates(mo);
  const moRec = S.receptions.filter(function (r) { return r.date.startsWith(mo); })
    .sort(function (a, b) { return b.date.localeCompare(a.date); });

  const totalRec  = moRec.reduce(function (s, r) { return s + r.quantity; }, 0);
  const totalSold = S.sales.filter(function (s) { return s.date.startsWith(mo); })
    .reduce(function (s, x) { return s + x.quantity; }, 0);

  document.getElementById('pg-stock').innerHTML = `
    <div class="pg-hd"><h1>Stock</h1></div>

    ${needsInit ? `<div class="card" style="text-align:center;padding:32px">
      <h3>Configuration initiale</h3>
      <p style="color:var(--tx2);margin:8px 0 16px">Indiquez le stock dont vous disposez aujourd'hui : les réceptions et les ventes le feront ensuite varier tout seul.</p>
      <button class="btn btn-p" onclick="setInitStock()">Définir le stock de départ</button>
    </div>` : `<div class="today">
      <h3>${icon('calendar')} Aujourd'hui — ${fmtD(t)}</h3>
      <div class="today-grid">
        <div class="today-item"><span class="tl">Reçu aujourd'hui</span><span class="tv">${received}</span></div>
        <div class="today-item"><span class="tl">Vendu aujourd'hui</span><span class="tv">${sold}</span></div>
        <div class="today-item hl"><span class="tl">Stock en magasin</span><span class="tv">${num(curStock)}</span></div>
        ${inv ? `<div class="today-item"><span class="tl">Écart d'inventaire</span>
          <span class="tv" style="color:${gap === 0 ? 'var(--green)' : 'var(--red)'}">${gap > 0 ? '+' : ''}${gap}</span></div>`
              : `<div class="today-item"><span class="tl">Inventaire du soir</span><span class="tv" style="color:var(--tx3)">—</span></div>`}
      </div>
      <div class="today-actions">
        <button class="btn btn-p" onclick="addReception()">${icon('plus')} Réception</button>
        <button class="btn btn-s" onclick="addSale()">${icon('plus')} Vente du jour</button>
        ${inv
          ? '<button class="btn btn-s" onclick="doInventory()">Corriger l\'inventaire</button>'
          : '<button class="btn btn-s" onclick="doInventory()">Inventaire du soir</button>'}
      </div>
      ${curStock < 0 ? `<div class="form-hint" style="color:var(--red);margin-top:12px">
        Le stock calculé est négatif : il manque des réceptions, ou des ventes ont été saisies en double. Un inventaire du soir remet le compteur à la réalité du magasin.
      </div>` : ''}
    </div>`}

    ${wDem > 0 ? `<div class="card">
      <h3>Besoins clients</h3>
      <div class="stats" style="margin-bottom:14px">
        ${st({ tone: 'gold', icon: 'users', value: num(wDem), count: wDem, label: 'Plateaux / semaine engagés' })}
        ${st({ tone: 'blue', icon: 'chart', value: dDem.toFixed(1), count: dDem, fmt: 'dec', label: 'Besoin moyen / jour' })}
        ${st({ tone: coverTone(cover), icon: 'clock',
               value: cover == null ? '—' : cover.toFixed(1) + ' j',
               count: cover == null ? null : cover, fmt: 'dec', suffix: ' j',
               label: `Couverture du stock (${num(curStock)} plateaux)` })}
      </div>
      ${cover != null && cover < COVER_MID
        ? `<div class="form-hint" style="color:var(--red)">Stock insuffisant pour couvrir une semaine : il manque ${Math.max(0, Math.ceil(wDem - curStock))} plateaux.</div>`
        : ''}
      ${dorm > 0
        ? `<div class="form-hint">Hors calcul : ${dorm} plateaux/semaine chez des clients inactifs — volume récupérable s'ils reviennent.</div>`
        : ''}
      <div class="tbl-wrap" style="margin-top:12px"><table>
        <thead><tr><th>Client</th><th>Type</th><th>Plateaux/sem.</th><th>Part</th></tr></thead>
        <tbody>${engaged.map(function (c) {
          return `<tr>
            <td><strong class="nowrap">${esc(c.name)}</strong> <span class="stars">${loyaltyStars(c)}</span></td>
            <td>${typeBadge(c)}</td>
            <td>${c.weeklyTrays}</td>
            <td style="color:var(--tx2)">${(c.weeklyTrays / wDem * 100).toFixed(0)} %</td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>
    </div>` : ''}

    ${moNav()}

    <div class="stats">
      ${st({ tone: 'gold',  icon: 'truck', value: num(totalRec), count: totalRec, label: 'Plateaux reçus' })}
      ${st({ tone: 'green', icon: 'trend', value: num(totalSold), count: totalSold, label: 'Plateaux vendus' })}
      ${st({ tone: 'blue',  icon: 'coins', value: cfa(getLatestCost()), count: getLatestCost(), fmt: 'cfa', label: 'Dernier prix de revient' })}
      ${st({ tone: lastRec == null ? 'blue' : (daysAgo(lastRec.date) >= 7 ? 'red' : 'green'),
             icon: 'clock',
             value: lastRec ? agoLabel(lastRec.date) : '—',
             label: lastRec
               ? `Dernière réception : ${lastRec.quantity} plateaux le ${fmtD(lastRec.date)}`
               : 'Aucune réception enregistrée' })}
    </div>

    <div class="card">
      <h3>Réceptions</h3>
      ${moRec.length ? `<div class="tbl-wrap"><table>
        <thead><tr><th>Date</th><th>Quantité</th><th>Prix unitaire</th><th>Total</th><th></th></tr></thead>
        <tbody>${moRec.map(function (r) {
          return `<tr>
            <td class="nowrap">${fmtD(r.date)}</td>
            <td>${r.quantity}</td>
            <td>${cfa(r.costPrice)}</td>
            <td>${cfa(r.quantity * r.costPrice)}</td>
            <td><button class="btn-icon" onclick="delReception('${r.id}')" title="Supprimer">&times;</button></td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>` : emptyState({ icon: 'truck', small: true, text: 'Aucune réception ce mois' })}
    </div>

    <div class="card">
      <h3>Journal quotidien</h3>
      ${moDates.length ? `<div class="tbl-wrap"><table>
        <thead><tr><th>Date</th><th>Reçu</th><th>Vendu</th><th>Stock le soir</th><th>Inventaire</th></tr></thead>
        <tbody>${moDates.map(function (d) {
          const iv = inventoryOn(d);
          const gp = stockGap(d);
          return `<tr>
            <td class="nowrap">${fmtD(d)}</td>
            <td>${getReceived(d) || '—'}</td>
            <td>${getSold(d) || '—'}</td>
            <td><strong>${num(stockOn(d))}</strong></td>
            <td>${iv
              ? `${num(iv.closingStock)} <span class="cell-sub" style="color:${gp === 0 ? 'var(--green)' : 'var(--red)'}">${gapLabel(gp)}</span>`
              : '<span class="muted">—</span>'}</td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>` : emptyState({ icon: 'calendar', small: true, text: 'Aucun mouvement ce mois' })}
      ${S.initialStock != null ? `<div class="form-hint" style="margin-top:10px">
        Stock de départ : <strong>${S.initialStock} plateaux</strong>${S.initialStockDate
          ? ` au ${fmtD(S.initialStockDate)}`
          : ' — <span style="color:var(--red)">date non renseignée</span>'}
        <button class="btn-icon edit" onclick="setInitStock()" title="Corriger le stock de départ">&#9998;</button>
      </div>` : ''}
    </div>`;
}

/* --- Stock de depart --- */

function setInitStock() {
  const has = S.initialStock != null;
  openModal(has ? 'Corriger le stock de départ' : 'Stock de départ', `
    <div class="form-row">
      <div class="form-g"><label>Plateaux en magasin *</label><input id="m-qty" type="number" min="0" value="${has ? S.initialStock : ''}"></div>
      <div class="form-g"><label>À la date du *</label><input id="m-date" type="date" max="${today()}" value="${S.initialStockDate || today()}"></div>
    </div>
    <div class="form-hint">Point de départ du suivi. À partir de cette date, les réceptions font monter le stock et les ventes le font baisser, sans autre saisie.</div>
    <div class="modal-ft">
      <button class="btn btn-s" onclick="closeModal()">Annuler</button>
      <button class="btn btn-p" onclick="saveInitStock()">Enregistrer</button>
    </div>`);
}

function saveInitStock() {
  const q = parseInt(document.getElementById('m-qty').value, 10);
  const d = val('m-date') || today();
  if (isNaN(q) || q < 0) { toast('Quantité invalide', 'err'); return; }
  if (d > today()) { toast('La date ne peut pas être dans le futur', 'err'); return; }
  S.initialStock = q;
  S.initialStockDate = d;
  save(); closeModal(); rStock(); toast('Stock de départ enregistré');
}

/* --- Receptions --- */

function addReception() {
  const lr = lastReception();
  openModal('Nouvelle réception', `
    ${lr ? `<div class="form-hint" style="margin-bottom:12px">Dernière réception : <strong>${lr.quantity} plateaux</strong> le ${fmtD(lr.date)} (${agoLabel(lr.date)}).</div>` : ''}
    <div class="form-g"><label>Date de réception *</label><input id="m-date" type="date" value="${today()}"></div>
    <div class="form-row">
      <div class="form-g"><label>Quantité (plateaux) *</label><input id="m-qty" type="number" min="1"></div>
      <div class="form-g"><label>Prix de revient/plateau (FCFA) *</label><input id="m-cost" type="number" min="0" value="${getLatestCost() || ''}"></div>
    </div>
    <div class="form-g"><label>Fournisseur</label><input id="m-sup"></div>
    <div class="modal-ft">
      <button class="btn btn-s" onclick="closeModal()">Annuler</button>
      <button class="btn btn-p" onclick="saveReception()">Enregistrer</button>
    </div>`);
}

function saveReception() {
  const q = parseInt(document.getElementById('m-qty').value, 10);
  const c = numVal('m-cost');
  const d = val('m-date') || today();
  if (!q || q <= 0 || isNaN(c)) { toast('Quantité et prix requis', 'err'); return; }
  S.receptions.push({
    id: gid(),
    date: d,
    quantity: q,
    costPrice: c,
    supplier: val('m-sup')
  });
  save(); closeModal(); rStock();
  toast('Réception enregistrée');
  warnStockAfter(d);
}

async function delReception(id) {
  if (await showConfirm('Supprimer cette réception ?')) {
    S.receptions = S.receptions.filter(function (x) { return x.id !== id; });
    save(); rStock(); toast('Réception supprimée');
  }
}

/* --- Inventaire du soir --- */

/* Le comptage physique remet le compteur a la realite du magasin. On
   affiche d'abord le theorique pour que l'ecart saute aux yeux : c'est
   lui qui revele la casse, les oublis de saisie ou les erreurs. */
function doInventory() {
  const t   = today();
  const inv = inventoryOn(t);
  const b   = stockBasis(t);
  openModal(inv ? "Corriger l'inventaire" : 'Inventaire du soir', `
    <div class="form-hint" style="margin-bottom:14px;line-height:1.7">
      ${esc(b.label)} : <strong>${num(b.base)}</strong><br>
      + ${num(b.received)} reçus &nbsp;·&nbsp; − ${num(b.sold)} vendus<br>
      = stock théorique ce soir : <strong>${num(b.theo)} plateaux</strong>
    </div>
    <div class="form-g">
      <label>Plateaux réellement comptés *</label>
      <input id="m-closing" type="number" min="0" value="${inv ? inv.closingStock : ''}"
             oninput="updInvGap(${b.theo})" autofocus>
      <div class="form-hint" id="m-gap">${inv ? invGapLabel(inv.closingStock - b.theo) : ''}</div>
    </div>
    <div class="modal-ft">
      ${inv ? `<button class="btn btn-s" onclick="delInventory()">Supprimer</button>` : ''}
      <button class="btn btn-s" onclick="closeModal()">Annuler</button>
      <button class="btn btn-p" onclick="saveInventory()">Enregistrer</button>
    </div>`);
}

/* Ecart en une expression courte, pour les tableaux */
function gapLabel(gap) {
  if (gap === 0) return 'conforme';
  return 'écart ' + (gap > 0 ? '+' : '−') + Math.abs(gap);
}

/* Libelle long de l'ecart, code par couleur : un manquant n'est pas une
   information neutre, il doit se voir. */
function invGapLabel(gap) {
  if (gap === 0) return '<span style="color:var(--green)">Comptage conforme au théorique.</span>';
  if (gap < 0) return '<span style="color:var(--red)">Manquant de ' + (-gap) + ' plateaux — casse, don, ou vente non saisie.</span>';
  return '<span style="color:var(--gold-h)">Excédent de ' + gap + ' plateaux — réception non saisie, ou vente comptée en trop.</span>';
}

function updInvGap(theo) {
  const el = document.getElementById('m-gap');
  const raw = document.getElementById('m-closing').value;
  const n = parseInt(raw, 10);
  el.innerHTML = (raw === '' || isNaN(n)) ? '' : invGapLabel(n - theo);
}

function saveInventory() {
  const cl = parseInt(document.getElementById('m-closing').value, 10);
  const t = today();
  if (isNaN(cl) || cl < 0) { toast('Valeur invalide', 'err'); return; }

  const gap = cl - theoreticalStock(t);
  const entry = S.daily.find(function (e) { return e.date === t; });
  if (entry) entry.closingStock = cl;
  else S.daily.push({ date: t, closingStock: cl });

  save(); closeModal(); rStock();
  toast(gap === 0 ? 'Inventaire conforme' : 'Inventaire enregistré — écart de ' + gap + ' plateaux',
        gap === 0 ? 'ok' : 'info');
}

async function delInventory() {
  if (!await showConfirm("Supprimer l'inventaire du jour ? Le stock repartira du calcul théorique.")) return;
  S.daily = S.daily.filter(function (e) { return e.date !== today(); });
  save(); closeModal(); rStock(); toast('Inventaire supprimé');
}

/* Appelee apres tout mouvement (vente ou reception). Elle couvre les deux
   cas ou le stock affiche ne correspondra pas a ce que l'utilisateur
   attend, plutot que de le laisser le decouvrir plus tard :

   1. un inventaire cloture sa journee — un mouvement saisi apres coup sur
      ce jour-la ne rebaisse plus le stock, c'est le comptage qui fait foi ;
   2. un stock negatif signale une saisie manquante ou dupliquee. */
function warnStockAfter(date) {
  if (inventoryOn(date)) {
    toast("Un inventaire existe déjà pour ce jour : corrigez-le pour en tenir compte", 'info');
    return;
  }
  if (getCurrentStock() < 0) {
    toast('Stock négatif : vérifiez vos réceptions ou faites un inventaire', 'err');
  }
}
