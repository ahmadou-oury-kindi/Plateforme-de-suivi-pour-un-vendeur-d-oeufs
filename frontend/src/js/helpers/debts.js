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
