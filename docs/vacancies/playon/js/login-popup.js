// Login popup functionality
let auth = null;
let db = null;

async function initializeAuthState() {
  try {
    if (window.auth && window.db) {
      auth = window.auth;
      db = window.db;
      return;
    }
    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
    const { getAuth } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
    const { getFirestore } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

    const firebaseConfig = {
      apiKey: "AIzaSyAX9ivQ4aKQzokUMEkNpGTIbbAUMJhLlys",
      authDomain: "playon-1a86b.firebaseapp.com",
      projectId: "playon-1a86b",
      storageBucket: "playon-1a86b.firebasestorage.app",
      messagingSenderId: "28141646391",
      appId: "1:28141646391:web:98d83339ed46c17efa45b2",
      measurementId: "G-Z12HWY8PFJ"
    };

    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    window.auth = auth;
    window.db = db;
    window.firebaseReady = true;
  } catch (error) {
    console.error('Firebase initialization error:', error);
  }
}

document.addEventListener('DOMContentLoaded', async function() {
  // Hide auth-sensitive nav links until Firebase resolves — prevents flash of wrong state
  const authEls = ['manageVacanciesLink', 'loginLink', 'registerLink', 'logoutLink'];
  authEls.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.visibility = 'hidden';
  });

  await initializeAuthState();
  checkAuthState();
});

async function checkAuthState() {
  try {
    if (!auth) { setTimeout(checkAuthState, 500); return; }
    const { onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');

    onAuthStateChanged(auth, (user) => {
      if (user) {
        updateDrawerLoggedIn(user);
      } else {
        updateDrawerLoggedOut();
      }
      // Reveal nav links now that auth state is known
      const authEls = ['manageVacanciesLink', 'loginLink', 'registerLink', 'logoutLink'];
      authEls.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.visibility = '';
      });
    });
  } catch (error) {
    console.error('Error checking auth state:', error);
    // On error, reveal anyway so nav isn't permanently hidden
    const authEls = ['manageVacanciesLink', 'loginLink', 'registerLink', 'logoutLink'];
    authEls.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.visibility = '';
    });
  }
}

function updateDrawerLoggedIn(user) {
  // Show manager links, hide guest links
  const show = ['manageVacanciesLink', 'logoutLink'];
  const hide = ['loginLink', 'registerLink'];
  show.forEach(id => { const el = document.getElementById(id); if (el) el.style.display = ''; });
  hide.forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });

  // Add user info if not already present
  const drawerLinks = document.querySelector('.drawer-links');
  if (drawerLinks && !document.getElementById('auth-user-info')) {
    const name = user.displayName || user.email || 'User';
    const userInfo = document.createElement('div');
    userInfo.id = 'auth-user-info';
    userInfo.style.cssText = 'padding:0.75rem 1.5rem; font-size:0.78rem; color:rgba(255,255,255,0.4); border-bottom:1px solid rgba(255,255,255,0.07); margin-bottom:0.25rem;';
    userInfo.innerHTML = `Logged in as <strong style="color:white">${name}</strong>`;
    drawerLinks.prepend(userInfo);
  }
}

function updateDrawerLoggedOut() {
  // Show guest links, hide manager links
  const show = ['loginLink', 'registerLink'];
  const hide = ['manageVacanciesLink', 'logoutLink'];
  show.forEach(id => { const el = document.getElementById(id); if (el) el.style.display = ''; });
  hide.forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });

  const userInfo = document.getElementById('auth-user-info');
  if (userInfo) userInfo.remove();
}

// Show login popup
function showLogin(event) {
  if (event) event.preventDefault();
  const overlay = document.getElementById('loginOverlay');
  if (overlay) {
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

// Close login popup
function closeLogin(event) {
  if (event) {
    if (event.target.id === 'loginOverlay' || event.target.classList.contains('login-close')) {
      document.getElementById('loginOverlay').classList.remove('active');
      document.body.style.overflow = '';
      const msg = document.getElementById('loginMessage');
      if (msg) { msg.textContent = ''; msg.className = 'login-message'; }
    }
  } else {
    document.getElementById('loginOverlay').classList.remove('active');
    document.body.style.overflow = '';
  }
}

// Login form submission
document.addEventListener('DOMContentLoaded', function() {
  const loginForm = document.getElementById('loginForm');
  if (!loginForm) return;

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const loginBtn = document.getElementById('loginBtn');
    const msg = document.getElementById('loginMessage');

    loginBtn.disabled = true;
    loginBtn.textContent = 'Logging in...';

    try {
      if (!auth) {
        await initializeAuthState();
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      if (!auth) throw new Error('Firebase not available. Please refresh.');

      const { signInWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      msg.textContent = 'Login successful!';
      msg.className = 'login-message success';
      loginForm.reset();

      setTimeout(() => {
        closeLogin();
        updateDrawerLoggedIn(userCredential.user);
      }, 800);

    } catch (error) {
      let errorMessage = 'Login failed. Please try again.';
      switch (error.code) {
        case 'auth/invalid-email':      errorMessage = 'Invalid email address.'; break;
        case 'auth/user-disabled':      errorMessage = 'This account has been disabled.'; break;
        case 'auth/user-not-found':     errorMessage = 'No account found with this email.'; break;
        case 'auth/wrong-password':     errorMessage = 'Incorrect password.'; break;
        case 'auth/invalid-credential': errorMessage = 'Invalid email or password.'; break;
        case 'auth/too-many-requests':  errorMessage = 'Too many failed attempts. Please try again later.'; break;
        default: errorMessage = error.message || errorMessage;
      }
      msg.textContent = errorMessage;
      msg.className = 'login-message error';
    } finally {
      loginBtn.disabled = false;
      loginBtn.textContent = 'Login';
    }
  });
});

// Forgot password
async function forgotPassword(event) {
  event.preventDefault();
  const email = prompt('Please enter your email address:');
  if (!email) return;
  try {
    if (!auth) { await initializeAuthState(); await new Promise(r => setTimeout(r, 500)); }
    const { sendPasswordResetEmail } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
    await sendPasswordResetEmail(auth, email);
    alert('Password reset email sent! Please check your inbox.');
  } catch (error) {
    let msg = 'Failed to send password reset email.';
    if (error.code === 'auth/invalid-email') msg = 'Invalid email address.';
    if (error.code === 'auth/user-not-found') msg = 'No account found with this email.';
    alert(msg);
  }
}

// Logout
async function logout() {
  try {
    if (!auth) { await initializeAuthState(); await new Promise(r => setTimeout(r, 500)); }
    const { signOut } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
    await signOut(auth);
    updateDrawerLoggedOut();
    window.location.href = 'index.html';
  } catch (error) {
    console.error('Logout error:', error);
    alert('Failed to logout. Please try again.');
  }
}