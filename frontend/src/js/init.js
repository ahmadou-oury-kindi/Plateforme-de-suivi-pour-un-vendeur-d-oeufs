/* =====================================================================
   DEMARRAGE — point d'entree, execute une fois le DOM en place
   Ce fichier est le dernier assemble par build.js : toutes les fonctions
   des autres modules sont deja definies quand il s'execute.
   ===================================================================== */

/* --- Raccourcis clavier --- */
function initKeys() {
  /* Entree valide le formulaire de connexion */
  document.getElementById('logPass').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') doLogin();
  });
  document.getElementById('logEmail').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') document.getElementById('logPass').focus();
  });

  /* Echap ferme la modale ouverte, ou le menu mobile */
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (!document.getElementById('modalOv').hidden) closeModal();
    else closeSide();
  });
}

/* --- Sequence de demarrage --- */
applyTheme();
setSync('off', 'Hors ligne');

S = load();
selMonth = curMo();

initDL();
initKeys();
initRipple();

/* Supabase conserve la session entre les visites : si elle est encore
   valide, on rouvre l'application directement, sinon on reste sur
   l'ecran de connexion. */
(async function initAuth() {
  if (!initSb()) return;
  try {
    const { data } = await sb.auth.getSession();
    if (data && data.session) {
      curEmail = data.session.user.email;
      cloudLoading = true;
      showApp();
      await initCloud();
      cloudLoading = false;
      render();
    }
  } catch (e) {
    console.warn('Session illisible', e);
    cloudLoading = false;
  }
})();
