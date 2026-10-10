/* =====================================================================
   HELPERS DETTES — reste a payer, statut, montant deja regle
   Une dette n'est jamais modifiee « en place » : son montant reste celui
   d'origine et les reglements s'empilent dans payments[]. L'historique
   est donc toujours reconstituable.
   ===================================================================== */

function debtPaid(d) {
  return (d.payments || []).reduce(function (s, p) { return s + p.amount; }, 0);
}

function debtRemaining(d) {
  return d.amount - debtPaid(d);
}

function debtStatus(d) {
  return debtRemaining(d) <= 0 ? 'soldee' : 'en_cours';
}

/* Total encore du, toutes dettes confondues. Un trop-percu sur une dette
   ne vient pas diminuer le total des autres : on plancher a zero. */
function totalOwed() {
  return S.debts.reduce(function (s, d) {
    const r = debtRemaining(d);
    return s + (r > 0 ? r : 0);
  }, 0);
}

function countDebts(status) {
  return S.debts.filter(function (d) { return debtStatus(d) === status; }).length;
}

function clientName(id) {
  const c = S.clients.find(function (x) { return x.id === id; });
  return c ? c.name : 'Client inconnu';
}

/* --- Agregation par client ------------------------------------------
   Un meme client peut avoir plusieurs dettes ; la page Dettes les regroupe
   en une seule carte. On applique la meme regle que totalOwed() : un
   trop-percu sur une dette ne vient pas diminuer le reste des autres (on
   plancher a zero par dette), sans quoi un paiement en avance effacerait
   une creance distincte. */
function debtsByClient() {
  const groups = {};
  const order = [];
  S.debts.forEach(function (d) {
    let g = groups[d.clientId];
    if (!g) {
      g = groups[d.clientId] = {
        clientId: d.clientId,
        debts: [],
        totalOwed: 0,
        totalPaid: 0,
        totalRemaining: 0,
        lastDate: ''
      };
      order.push(d.clientId);
    }
    g.debts.push(d);
    g.totalOwed += d.amount;
    g.totalPaid += debtPaid(d);
    const r = debtRemaining(d);
    g.totalRemaining += r > 0 ? r : 0;
    if (!g.lastDate || (d.date || '') > g.lastDate) g.lastDate = d.date || '';
  });
  return order.map(function (id) { return groups[id]; });
}

/* Statut global : tant qu'une seule dette reste a payer, le client est
   en cours ; soldee signifie que toutes ses dettes le sont. */
function clientDebtStatus(g) {
  return g.totalRemaining > 0 ? 'en_cours' : 'soldee';
}
