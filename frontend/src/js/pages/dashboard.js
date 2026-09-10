/* =====================================================================
   PAGE — TABLEAU DE BORD

   Hierarchie de lecture, du plus important au plus detaille :
     1. l'argent du mois (chiffre d'affaires, marge, depenses, dettes)
     2. le stock et sa couverture — la question operationnelle du jour
     3. la tendance des sept derniers jours
     4. le detail clients et dettes
   Les memes sept indicateurs qu'avant sont presents ; c'est leur poids
   visuel qui differe, pour qu'un coup d'oeil suffise.
   ===================================================================== */
function rDash() {
  const pg = document.getElementById('pg-dashboard');

  /* Tant que la premiere lecture du cloud n'a rien rendu et que rien
     n'est en cache, on montre un squelette plutot qu'un ecran vide. */
  if (cloudLoading && !hasData()) { pg.innerHTML = skeletonPage(); return; }

  const mo = selMonth;
  const moSales = S.sales.filter(function (s) { return s.date.startsWith(mo); });
  const moExp   = S.expenses.filter(function (e) { return e.date.startsWith(mo); });

  const totalRev    = moSales.reduce(function (s, x) { return s + x.quantity * x.sellingPrice; }, 0);
  const totalCost   = moSales.reduce(function (s, x) { return s + x.quantity * x.costPrice; }, 0);
  const totalMargin = totalRev - totalCost;
  const totalExp    = moExp.reduce(function (s, x) { return s + x.amount; }, 0);
  const totalDebt   = totalOwed();
  const rate        = totalRev ? (totalMargin / totalRev) * 100 : 0;

  const moSold = moSales.reduce(function (s, x) { return s + x.quantity; }, 0);

  /* Sept derniers jours glissants, aujourd'hui inclus */
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const ds = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    days.push({
      label: d.toLocaleDateString('fr-FR', { weekday: 'short' }),
      value: getSold(ds),
      now: i === 0
    });
  }

  const stock = getCurrentStock();
  const dDem  = dailyDemand();
  const cover = dDem > 0 ? stock / dDem : null;
  const tone  = coverTone(cover);
  const lastRec = lastReception();

  const nAct = activeClients().length;
  const nLoy = S.clients.filter(isLoyal).length;
  const enCours = countDebts('en_cours');
  const soldees = countDebts('soldee');

  pg.innerHTML = `
    <div class="pg-hd">
      <h1>Tableau de bord</h1>
      <span class="pg-sub">${moLabel(mo)}</span>
    </div>

    <div class="hero">
      <div class="panel">
        <div class="hero-hd">
          <span class="eyebrow">Chiffre d'affaires du mois</span>
          ${totalRev ? `<span class="badge ${totalMargin >= 0 ? 'badge-green' : 'badge-red'}">${rate.toFixed(0)} % de marge</span>` : ''}
        </div>
        <div class="hero-v" data-count="${totalRev}" data-fmt="cfa">${cfa(totalRev)}</div>
        <div class="hero-u">${num(moSold)} ${plur(moSold, 'plateau', 'x')} ${plur(moSold, 'vendu')} ce mois</div>
        <div class="hero-split">
          ${mini({ tone: totalMargin >= 0 ? 'up' : 'down', value: cfa(totalMargin), count: totalMargin, fmt: 'cfa', label: 'Marge brute' })}
          ${mini({ value: cfa(totalExp), count: totalExp, fmt: 'cfa', label: 'Dépenses du mois' })}
          ${mini({ tone: totalDebt > 0 ? 'down' : '', value: cfa(totalDebt), count: totalDebt, fmt: 'cfa', label: 'Dettes en cours' })}
        </div>
      </div>

      <div class="panel">
        <div class="hero-hd">
          <span class="eyebrow">Stock</span>
          ${cover != null ? `<span class="badge badge-${tone === 'gold' ? 'gold' : tone === 'red' ? 'red' : 'green'}">${
            tone === 'red' ? 'Tension' : tone === 'gold' ? 'À surveiller' : 'Confortable'}</span>` : ''}
        </div>
        <div class="hero-v" data-count="${stock}">${num(stock)}</div>
        <div class="hero-u">plateaux en magasin</div>
        ${cover != null ? gauge({
          label: 'Couverture des besoins',
          value: cover.toFixed(1) + ' jours',
          now: cover, max: 14,
          tone: tone === 'gold' ? 'gold' : tone === 'red' ? 'red' : '',
          scale: ['0', `${COVER_MID} j`, '14 j +']
        }) : `<div class="form-hint" style="margin-top:20px">Renseignez les plateaux/semaine de vos clients pour suivre la couverture du stock.</div>`}
        <div class="hero-foot">${lastRec
          ? `Dernière réception : <strong>${lastRec.quantity} plateaux</strong> ${agoLabel(lastRec.date)}`
          : 'Aucune réception enregistrée'}</div>
      </div>
    </div>

    <div class="card">
      <h3>${icon('chart')} Ventes des 7 derniers jours</h3>
      ${barChart(days)}
    </div>

    <div class="duo">
      <div class="card">
        <h3>${icon('users')} Clients</h3>
        <div class="big-n">${nAct}<small> / ${S.clients.length} actifs</small></div>
        <div class="big-sub">${nLoy} ${plur(nLoy, 'fidèle')} ★ · ${S.clients.length - nAct} ${plur(S.clients.length - nAct, 'inactif')} · ${weeklyDemand()} plateaux/sem.</div>
        ${S.clients.length ? prog(nAct, S.clients.length, 'gold') : ''}
      </div>
      <div class="card">
        <h3>${icon('wallet')} Dettes</h3>
        <div class="big-n">${enCours}<small> / ${S.debts.length} en cours</small></div>
        <div class="big-sub">${soldees} ${plur(soldees, 'soldée')} · <strong>${cfa(totalDebt)}</strong> à recouvrer</div>
        ${S.debts.length ? prog(soldees, S.debts.length) : ''}
      </div>
    </div>`;
}
