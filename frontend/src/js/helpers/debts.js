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
   une creance distincte.

   On tient deux niveaux de compteurs :
     · total*     : toutes les dettes du client, historique compris — sert
                    aux listings par exercice et aux rapports ;
     · active*    : uniquement les dettes NON soldees — c'est ce qu'affiche
                    la carte du client, pour que la barre de progression
                    refletisse la situation en cours et non le passe. */
function debtsByClient() {
  const groups = {};
  const order = [];
  S.debts.forEach(function (d) {
    let g = groups[d.clientId];
    if (!g) {
      g = groups[d.clientId] = {
        clientId: d.clientId,
        debts: [],
        totalOwed: 0, totalPaid: 0, totalRemaining: 0,
        activeOwed: 0, activePaid: 0, activeRemaining: 0, activeCount: 0,
        lastActiveDate: '',
        lastDate: ''
      };
      order.push(d.clientId);
    }
    g.debts.push(d);
    const paid = debtPaid(d);
    const rem  = debtRemaining(d);
    g.totalOwed += d.amount;
    g.totalPaid += paid;
    g.totalRemaining += rem > 0 ? rem : 0;
    if (debtStatus(d) === 'en_cours') {
      g.activeOwed      += d.amount;
      g.activePaid      += paid;
      g.activeRemaining += rem > 0 ? rem : 0;
      g.activeCount     += 1;
      if (!g.lastActiveDate || (d.date || '') > g.lastActiveDate) g.lastActiveDate = d.date || '';
    }
    if (!g.lastDate || (d.date || '') > g.lastDate) g.lastDate = d.date || '';
  });
  return order.map(function (id) { return groups[id]; });
}

/* Statut global : tant qu'une seule dette reste a payer, le client est
   en cours ; soldee signifie que toutes ses dettes le sont. */
function clientDebtStatus(g) {
  return g.activeCount > 0 ? 'en_cours' : 'soldee';
}
