/* =====================================================================
   SYNCHRONISATION CLOUD — Supabase

   Modele
   ------
   Le localStorage est le cache de lecture rapide ; Supabase est la
   sauvegarde de reference, partagee entre tous les appareils du gerant.

   Regle unique, qui remplace l'ancienne asymetrie local/cloud : on ne
   remplace JAMAIS un etat par l'autre, on les FUSIONNE enregistrement
   par enregistrement (voir merge.js). Chaque ecriture suit donc toujours
   le meme chemin :

       lire le cloud  ->  fusionner avec le local  ->  reecrire

   L'ecriture est gardee par un controle de version : on ne reecrit la
   ligne que si elle n'a pas bouge depuis la lecture. Si un autre
   appareil est passe entre les deux, on recommence avec la version
   fraiche. Rien ne peut donc etre ecrase en silence.
   ===================================================================== */

let sb = null;          /* client Supabase */
let cloudOK = false;    /* derniere operation reseau reussie ? */
let lastSync = null;    /* Date de la derniere ecriture reussie */
let cloudSeen = null;   /* updated_at de la derniere version lue */

/* Les saisies peuvent s'enchainer plus vite que le reseau : on serialise
   les synchros pour qu'elles ne se marchent pas dessus. */
let syncChain = Promise.resolve();

/* Rafraichissement automatique : periode, en millisecondes */
const SYNC_EVERY = 60000;
let syncTimer = null;

/* Cree le client. Appele avant la connexion, car l'ecran de login s'en sert. */
function initSb() {
  if (sb) return sb;
  try {
    sb = window.supabase.createClient(SUPA_URL, SUPA_KEY);
  } catch (e) {
    console.warn('Client Supabase indisponible', e);
    setSync('off', 'Hors ligne');
  }
  return sb;
}

/* Enchaine les synchros au lieu de les laisser se chevaucher */
function queueSync(fn) {
  syncChain = syncChain.then(fn, fn);
  return syncChain;
}

/* --- Lecture --------------------------------------------------------- */

/* Lit l'etat stocke dans le cloud.
   Renvoie { data, updatedAt } ; data vaut null si la ligne n'existe pas
   encore. Renvoie null — et seulement dans ce cas — si le reseau ou les
   droits ont refuse la lecture : l'appelant ne doit alors rien ecrire. */
async function cloudRead() {
  if (!sb) { setSync('off', 'Hors ligne'); return null; }
  try {
    const { data, error } = await sb.from('app_state')
      .select('data, updated_at').eq('id', 1).maybeSingle();
    if (error) {
      cloudOK = false;
      console.warn('Echec de la lecture du cloud', error);
      setSync('err', 'Cloud injoignable');
      return null;
    }
    cloudOK = true;
    cloudSeen = data ? data.updated_at : null;
    return { data: data ? data.data : null, updatedAt: cloudSeen };
  } catch (e) {
    cloudOK = false;
    console.warn('Echec de la lecture du cloud', e);
    setSync('err', 'Cloud injoignable');
    return null;
  }
}

/* --- Ecriture gardee ------------------------------------------------- */

/* Reecrit la ligne seulement si son updated_at est toujours celui qu'on a
   lu. Renvoie true si l'ecriture a bien eu lieu, false si la ligne a
   bouge entre-temps (il faut relire et refusionner), et leve en cas
   d'erreur reseau ou de droits. */
async function cloudWrite(state, seen) {
  const stamp = new Date().toISOString();
  const row = { id: 1, data: state, updated_at: stamp };

  /* Ligne absente : premiere ecriture, rien a garder. */
  if (seen == null) {
    const { error } = await sb.from('app_state').upsert(row);
    if (error) throw error;
    cloudSeen = stamp;
    return true;
  }

  const { data, error } = await sb.from('app_state')
    .update({ data: state, updated_at: stamp })
    .eq('id', 1).eq('updated_at', seen).select('updated_at');
  if (error) throw error;
  if (!data || !data.length) return false;   /* un autre appareil a ecrit */
  cloudSeen = stamp;
  return true;
}

/* --- Synchro complete ------------------------------------------------ */

/* Coeur de la synchro : lire, fusionner, reecrire, en reessayant si la
   ligne a bouge pendant l'operation.
   quiet : ne touche pas a l'indicateur de synchro (rafraichissement de
   fond, pour ne pas faire clignoter l'interface sans raison). */
async function cloudSyncOnce(quiet) {
  if (!sb) { setSync('off', 'Hors ligne'); return false; }
  if (!quiet) setSync('busy', 'Synchro...');

  for (let essai = 0; essai < 3; essai++) {
    const read = await cloudRead();
    if (!read) return false;                 /* cloud illisible : on n'ecrit pas */

    const merged = mergeStates(S, read.data);
    /* Les deux cotes sont normalises avant comparaison : sans cela un
       etat cloud qui ignore simplement les champs par defaut passerait
       pour different, et on reecrirait la ligne a chaque passage. */
    const cloudNorm    = Object.assign(defaults(), withSyncFields(read.data || {}));
    const localChanged = canon(merged) !== canon(S);
    const cloudStale   = canon(merged) !== canon(cloudNorm);

    /* On adopte le resultat de la fusion en local dans tous les cas :
       c'est lui la verite partagee. */
    if (localChanged) {
      S = merged;
      saveLocalOnly();
      renderIfIdle();
    }

    /* Le cloud est deja a jour : rien a ecrire. */
    if (!cloudStale) {
      lastSync = new Date();
      setSync('ok', 'Sauvegardé');
      return true;
    }

    try {
      if (await cloudWrite(merged, read.updatedAt)) {
        lastSync = new Date();
        setSync('ok', 'Sauvegardé');
        return true;
      }
      /* false : la ligne a bouge, on relit et on refusionne */
    } catch (e) {
      cloudOK = false;
      console.warn('Echec de la synchro vers le cloud', e);
      setSync('err', 'Non sauvegardé');
      return false;
    }
  }

  setSync('err', 'Non sauvegardé');
  return false;
}

/* Redessine la page, sauf si l'utilisateur est en train de remplir une
   modale : on ne lui enleve pas son formulaire sous les doigts. */
function renderIfIdle() {
  const ov = document.getElementById('modalOv');
  if (ov && !ov.hidden) return;
  if (typeof render === 'function') render();
}

/* Appelee par save() apres chaque saisie. Le nom reste « cloudPush »
   pour tout le code appelant, mais l'operation fusionne desormais. */
function cloudPush() {
  return queueSync(function () { return cloudSyncOnce(false); });
}

/* Rafraichissement de fond : recupere ce que les autres appareils ont
   saisi, sans bruit visuel. */
function cloudRefresh() {
  return queueSync(function () { return cloudSyncOnce(true); });
}

/* --- Rafraichissement automatique ------------------------------------ */

/* Sans cela, un appareil reste indefiniment sur sa propre copie : c'est
   exactement le symptome qu'on corrige. On relit donc le cloud quand
   l'onglet revient au premier plan et a intervalle regulier. */
function startAutoSync() {
  if (syncTimer) return;
  syncTimer = setInterval(function () {
    if (document.visibilityState === 'visible') cloudRefresh();
  }, SYNC_EVERY);

  /* Ces deux ecouteurs ne se retirent pas : ils verifient donc eux-memes
     que la synchro est encore active, sinon ils continueraient d'appeler
     le cloud apres une deconnexion. */
  document.addEventListener('visibilitychange', function () {
    if (syncTimer && document.visibilityState === 'visible') cloudRefresh();
  });
  window.addEventListener('online', function () { if (syncTimer) cloudRefresh(); });
}

function stopAutoSync() {
  if (syncTimer) { clearInterval(syncTimer); syncTimer = null; }
}

/* --- Actions de la page Parametres ----------------------------------- */

/* Bouton « Forcer la synchro » */
async function syncNow() {
  const ok = await cloudPush();
  toast(ok ? 'Données synchronisées' : 'Échec de la synchro — vérifiez votre connexion', ok ? 'ok' : 'err');
  if (curPage === 'settings') render();
}

/* Bouton « Restaurer depuis le cloud ».
   Contrairement a la synchro, c'est un remplacement assume : il sert a
   recuperer apres une fausse manoeuvre locale, donc il doit pouvoir
   perdre ce qui est sur l'appareil. D'ou la confirmation. */
async function cloudRestore() {
  const read = await cloudRead();
  if (!read || !read.data || !hasData(read.data)) {
    toast('Aucune donnée trouvée dans le cloud', 'err');
    return;
  }
  const n = countRecords(read.data);
  if (!await showConfirm('Remplacer les données de cet appareil par celles du cloud ('
      + n + ' enregistrements) ? Ce qui n\'a pas encore été synchronisé sera perdu.')) return;

  S = Object.assign(defaults(), withSyncFields(read.data));
  saveLocalOnly();
  render();
  toast('Données restaurées depuis le cloud');
}

/* Premiere synchro apres la connexion : une fusion, comme les autres.
   L'ancienne version ne lisait le cloud que si le cache local etait vide,
   ce qui figeait chaque appareil sur sa propre copie. */
async function initCloud() {
  try {
    if (!initSb()) return;
    const before = countRecords(S);
    const ok = await cloudPush();
    const after = countRecords(S);
    if (ok && after > before) {
      toast((after - before) + ' enregistrement(s) récupéré(s) depuis le cloud', 'ok');
    }
    startAutoSync();
  } catch (e) {
    cloudOK = false;
    console.warn('Echec de l initialisation du cloud', e);
    setSync('err', 'Cloud injoignable');
  }
}

/* Changement de mot de passe (page Parametres). Le mot de passe n'est
   jamais stocke ni verifie par ce fichier : Supabase s'en charge. */
async function changePassword() {
  const a = document.getElementById('pw1').value;
  const b = document.getElementById('pw2').value;
  if (a.length < 8) { toast('Le mot de passe doit faire au moins 8 caractères', 'err'); return; }
  if (a !== b) { toast('Les deux mots de passe ne correspondent pas', 'err'); return; }
  if (!sb) { toast('Serveur injoignable', 'err'); return; }

  const { error } = await sb.auth.updateUser({ password: a });
  if (error) {
    toast('Impossible de changer le mot de passe', 'err');
    console.warn(error);
    return;
  }
  document.getElementById('pw1').value = '';
  document.getElementById('pw2').value = '';
  toast('Mot de passe modifié');
}
