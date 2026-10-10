/* =====================================================================
   ETAT — l'objet S contient toutes les donnees metier
   Le format de S est le contrat partage avec Supabase et le localStorage.
   Il ne doit pas changer sans migration (voir backend/README.md).
   ===================================================================== */

/* Donnees metier */
let S;

/* Etat d'interface, volontairement separe des donnees */
let selMonth;                 /* mois affiche sur les pages mensuelles */
let curPage    = 'dashboard'; /* page visible */
let curEmail   = '';          /* email de la session ouverte */
let DL         = null;        /* API de telechargement, si disponible */
let pendConf   = null;        /* resolve() de la confirmation en cours */
let searchQ    = '';          /* recherche clients */
let filterType = 'all';       /* filtre par type de client */
let filterStat = 'all';       /* filtre par statut de client */
let filterDebt = 'all';       /* filtre sur les dettes */
let debtClientView = null;    /* page Dettes : null = liste des clients, sinon id client dont on voit le detail */
let cloudLoading = false;     /* premiere lecture du cloud en cours */

/* Structure vide de reference. Toute nouvelle collection doit y figurer :
   c'est elle qui comble les champs absents des sauvegardes anciennes. */
function defaults() {
  return {
    initialStock: null,
    initialStockDate: null,
    clients: [],
    debts: [],
    expenses: [],
    receptions: [],
    daily: [],
    sales: [],
    losses: [],
    /* Champs de synchro (voir merge.js) : horodatage des scalaires et
       pierres tombales des enregistrements supprimes. */
    _stockUp: null,
    _del: emptyTombs()
  };
}

/* Lecture du cache navigateur. Une donnee illisible ne doit jamais
   empecher l'application de demarrer : on repart d'un etat vide, le
   cloud prendra le relais au chargement. */
function load() {
  try {
    const d = localStorage.getItem(DB);
    return d ? Object.assign(defaults(), JSON.parse(d)) : defaults();
  } catch (e) {
    return defaults();
  }
}

/* Copie de l'etat tel qu'il a ete sauvegarde la derniere fois. C'est la
   reference qui permet a stampChanges() de deduire ce qui a change sans
   que les formulaires aient a le declarer. */
let lastSaved = null;

function snapSaved() {
  lastSaved = JSON.parse(JSON.stringify(S));
}

/* Sauvegarde : cache local d'abord (instantane), cloud ensuite (asynchrone).
   Tout le code metier passe par save() — jamais par localStorage direct.
   L'horodatage des enregistrements touches est pose ici, une fois pour
   toutes : c'est ce qui rend la fusion multi-appareils possible. */
function save() {
  stampChanges(lastSaved);
  writeLocal();
  snapSaved();
  cloudPush();
}

/* Ecrit le cache local sans declencher de synchro cloud. Utilise quand la
   donnee vient justement d'etre lue depuis le cloud. */
function saveLocalOnly() {
  writeLocal();
  snapSaved();
}

function writeLocal() {
  try {
    localStorage.setItem(DB, JSON.stringify(S));
  } catch (e) {
    toast('Erreur de sauvegarde locale', 'err');
  }
}

/* Vrai si l'etat courant contient au moins une donnee saisie */
function hasData(o) {
  const d = o || S;
  if (!d) return false;
  return !!(
    (d.clients    || []).length ||
    (d.debts      || []).length ||
    (d.expenses   || []).length ||
    (d.receptions || []).length ||
    (d.sales      || []).length ||
    (d.daily      || []).length ||
    (d.losses     || []).length
  );
}
