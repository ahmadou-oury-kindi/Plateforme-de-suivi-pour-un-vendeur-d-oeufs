/* =====================================================================
   AUTHENTIFICATION
   Le mot de passe est verifie par Supabase, jamais par ce fichier. La
   session obtenue est ce qui donne acces aux donnees : sans elle, les
   regles RLS refusent toute lecture et toute ecriture.
   ===================================================================== */

async function doLogin() {
  const email = val('logEmail');
  const pass  = document.getElementById('logPass').value;
  const err   = document.getElementById('logErr');
  const btn   = document.getElementById('logBtn');

  if (!email || !pass) { err.textContent = 'Entrez votre email et votre mot de passe'; return; }
  if (!initSb()) { err.textContent = 'Serveur injoignable. Vérifiez votre connexion internet.'; return; }

  err.textContent = 'Connexion en cours...';
  btn.disabled = true;

  try {
    const { data, error } = await sb.auth.signInWithPassword({ email: email, password: pass });
    if (error) {
      err.textContent = /network|fetch/i.test(error.message)
        ? 'Serveur injoignable. Vérifiez votre connexion internet.'
        : 'Email ou mot de passe incorrect';
      return;
    }
    err.textContent = '';
    document.getElementById('logPass').value = '';
    curEmail = data && data.user ? data.user.email : email;
    cloudLoading = true;
    showApp();
    await initCloud();
    cloudLoading = false;
    render();
  } catch (ex) {
    err.textContent = 'Serveur injoignable. Vérifiez votre connexion internet.';
  } finally {
    btn.disabled = false;
  }
}

async function doLogout() {
  try { if (sb) await sb.auth.signOut(); } catch (e) { /* deconnexion locale quand meme */ }
  cloudOK = false;
  curEmail = '';
  document.getElementById('app').hidden = true;
  document.getElementById('loginScreen').hidden = false;
}

/* Bascule de l'ecran de connexion vers l'application */
function showApp() {
  document.getElementById('loginScreen').hidden = true;
  document.getElementById('app').hidden = false;
  nav('dashboard');
}
