/* =====================================================================
   SYNCHRONISATION CLOUD — Supabase
   Modele : le localStorage est le cache de lecture rapide, Supabase la
   sauvegarde de reference. Chaque save() ecrit les deux.
   ===================================================================== */

let sb = null;          /* client Supabase */
let cloudOK = false;    /* derniere operation reseau reussie ? */
let lastSync = null;    /* Date de la derniere ecriture reussie */

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

/* Envoie l'etat complet vers le cloud. Une seule ligne, id = 1. */
async function cloudPush() {
  if (!sb) { setSync('off', 'Hors ligne'); return false; }
  setSync('busy', 'Synchro...');
  try {
    const { error } = await sb.from('app_state').upsert({
      id: 1,
      data: S,
      updated_at: new Date().toISOString()
    });
    cloudOK = !error;
    if (error) {
      console.warn('Echec de la synchro vers le cloud', error);
      setSync('err', 'Non sauvegardé');
      return false;
    }
    lastSync = new Date();
    setSync('ok', 'Sauvegardé');
    return true;
  } catch (e) {
    cloudOK = false;
    console.warn('Echec de la synchro vers le cloud', e);
    setSync('err', 'Non sauvegardé');
    return false;
  }
}

/* Lit l'etat stocke dans le cloud. Renvoie null si rien n'est lisible. */
async function cloudPull() {
  if (!sb) return null;
  setSync('busy', 'Lecture...');
  try {
    const { data, error } = await sb.from('app_state').select('data').eq('id', 1).single();
    cloudOK = !error;
    if (error) {
      console.warn('Echec de la lecture du cloud', error);
      setSync('err', 'Cloud injoignable');
      return null;
    }
    setSync('ok', 'Sauvegardé');
    return data && data.data ? data.data : null;
  } catch (e) {
    cloudOK = false;
    setSync('err', 'Cloud injoignable');
    return null;
  }
}

/* Bouton « Forcer la synchro » de la page Parametres */
async function syncNow() {
  const ok = await cloudPush();
  toast(ok ? 'Données synchronisées' : 'Échec de la synchro — vérifiez votre connexion', ok ? 'ok' : 'err');
  if (curPage === 'settings') render();
}

/* Bouton « Restaurer depuis le cloud » de la page Parametres */
async function cloudRestore() {
  const d = await cloudPull();
  if (d && hasData(d)) {
    S = Object.assign(defaults(), d);
    save();
    render();
    toast('Données restaurées depuis le cloud');
  } else {
    toast('Aucune donnée trouvée dans le cloud', 'err');
  }
}

/* Premiere synchro apres la connexion.
   Regle : le cloud ne remplace le cache local que si celui-ci est vide.
   Sinon c'est le local qui est pousse vers le cloud. Cette asymetrie evite
   d'ecraser une saisie faite hors ligne. */
async function initCloud() {
  try {
    if (!initSb()) return;
    const cloud = await cloudPull();
    const localHas = hasData(S);
    const cloudHas = hasData(cloud);

    if (cloudHas && !localHas) {
      S = Object.assign(defaults(), cloud);
      saveLocalOnly();
      render();
      toast('Données chargées depuis le cloud', 'ok');
    } else if (localHas) {
      cloudPush();
    }
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
