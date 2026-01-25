// Login popup functionality
let auth = null;
let db = null;

// Initialize Firebase (check if page already did it, otherwise do it here)
async function initializeAuthState() {
  try {
    // Check if Firebase is already initialized by the page
    if (window.auth && window.db) {
      auth = window.auth;
      db = window.db;
      console.log('Using existing Firebase instance from page');
      return;
    }

    // If not initialized yet, initialize it here
    console.log('Initializing Firebase from login-popup.js...');
    
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
    
    console.log('Firebase initialized successfully by login-popup.js');

  } catch (error) {
    console.error('Firebase initialization error:', error);
  }
}

// Initialize when DOM loads
document.addEventListener('DOMContentLoaded', async function() {
  await initializeAuthState();
  checkAuthState(); // Check if user is logged in
});

// Check authentication state and update UI
async function checkAuthState() {
  try {
    if (!auth) {
      console.log('Auth not ready, waiting...');
      setTimeout(checkAuthState, 500);
      return;
    }

    const { onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
    
    onAuthStateChanged(auth, (user) => {
      const sideMenu = document.getElementById('sideMenu');
      
      if (user) {
        // User is logged in
        console.log('User is logged in:', user.email);
        updateMenuForLoggedInUser(sideMenu);
      } else {
        // User is logged out
        console.log('User is logged out');
        updateMenuForLoggedOutUser(sideMenu);
      }
    });
  } catch (error) {
    console.error('Error checking auth state:', error);
  }
}

// Update menu for logged-in user
function updateMenuForLoggedInUser(sideMenu) {
  if (!sideMenu) return;
  
  // Find the menu logo to insert items before it
  const menuLogo = sideMenu.querySelector('.menu-logo');
  
  // Remove existing nav items and user info (except logo)
  const existingLinks = sideMenu.querySelectorAll('a');
  existingLinks.forEach(link => link.remove());
  const existingUserInfo = sideMenu.querySelector('.user-info');
  if (existingUserInfo) existingUserInfo.remove();
  
  // Create logged-in menu items
  const menuItems = [
    { href: 'index.html', text: 'Home' },
    { href: 'about.html', text: 'About' },
    { href: 'vacancies.html', text: 'Vacancies' },
    { href: 'manager-vacancies.html', text: 'Manage Vacancies' },
  ];
  
  // Add menu items
  menuItems.forEach(item => {
    const link = document.createElement('a');
    link.href = item.href;
    link.textContent = item.text;
    sideMenu.insertBefore(link, menuLogo);
  });
  
  // Add user info display AFTER menu items
  const userInfo = document.createElement('div');
  userInfo.className = 'user-info';
  userInfo.innerHTML = `
    <div style="color: #fff; padding: 0.5rem 0; border-bottom: 1px solid rgba(255,255,255,0.2); margin-bottom: 1rem;">
      <small>Logged in as:</small><br>
      <strong>${auth.currentUser?.displayName || auth.currentUser?.email || 'User'}</strong>
    </div>
  `;
  sideMenu.insertBefore(userInfo, menuLogo);
  
  // Add logout link at the end
  const logoutLink = document.createElement('a');
  logoutLink.href = '#';
  logoutLink.textContent = 'Logout';
  logoutLink.setAttribute('onclick', 'logout()');
  sideMenu.insertBefore(logoutLink, menuLogo);
}

// Update menu for logged-out user
function updateMenuForLoggedOutUser(sideMenu) {
  if (!sideMenu) return;
  
  // Find the menu logo
  const menuLogo = sideMenu.querySelector('.menu-logo');
  
  // Remove existing nav items (except logo)
  const existingLinks = sideMenu.querySelectorAll('a');
  existingLinks.forEach(link => link.remove());
  
  // Remove user info if exists
  const existingUserInfo = sideMenu.querySelector('.user-info');
  if (existingUserInfo) existingUserInfo.remove();
  
  // Create logged-out menu
  const menuItems = [
    { href: 'index.html', text: 'Home' },
    { href: 'about.html', text: 'About' },
    { href: 'vacancies.html', text: 'Vacancies' },
    { href: '#', text: 'Login', onclick: 'showLogin(event)' },
    { href: 'register.html', text: 'Register' }
  ];
  
  menuItems.forEach(item => {
    const link = document.createElement('a');
    link.href = item.href;
    link.textContent = item.text;
    if (item.onclick) {
      link.setAttribute('onclick', item.onclick);
    }
    sideMenu.insertBefore(link, menuLogo);
  });
}

// Show login popup
function showLogin(event) {
  if (event) event.preventDefault();
  document.getElementById('loginOverlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}

// Close login popup
function closeLogin(event) {
  if (event) {
    if (event.target.id === 'loginOverlay' || event.target.classList.contains('login-close')) {
      document.getElementById('loginOverlay').classList.remove('active');
      document.body.style.overflow = '';
      
      // Clear any error messages
      const msg = document.getElementById('loginMessage');
      if (msg) {
        msg.textContent = '';
        msg.className = 'login-message';
      }
    }
  } else {
    document.getElementById('loginOverlay').classList.remove('active');
    document.body.style.overflow = '';
  }
}

// Handle login form submission
document.addEventListener('DOMContentLoaded', function() {
  const loginForm = document.getElementById('loginForm');
  
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = document.getElementById('loginEmail').value.trim();
      const password = document.getElementById('loginPassword').value;
      const loginBtn = document.getElementById('loginBtn');
      const msg = document.getElementById('loginMessage');
      
      // Disable button and show loading
      loginBtn.disabled = true;
      loginBtn.textContent = 'Logging in...';
      
      try {
        // Wait for Firebase to be ready
        if (!auth) {
          await initializeAuthState();
          // Give it a moment to initialize
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        if (!auth) {
          throw new Error('Firebase authentication not available. Please refresh the page.');
        }

        // Import signInWithEmailAndPassword
        const { signInWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
        
        // Sign in
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        console.log('User logged in:', user.uid);
        
        // Show success message
        msg.textContent = 'Login successful! Redirecting...';
        msg.className = 'login-message success';
        
        // Clear form
        loginForm.reset();
        
        // Close popup and reload to update menu
        setTimeout(() => {
          closeLogin();
          window.location.reload(); // Reload current page to update menu
        }, 1000);
        
      } catch (error) {
        console.error('Login error:', error);
        
        let errorMessage = 'Login failed. Please try again.';
        
        switch (error.code) {
          case 'auth/invalid-email':
            errorMessage = 'Invalid email address.';
            break;
          case 'auth/user-disabled':
            errorMessage = 'This account has been disabled.';
            break;
          case 'auth/user-not-found':
            errorMessage = 'No account found with this email.';
            break;
          case 'auth/wrong-password':
            errorMessage = 'Incorrect password.';
            break;
          case 'auth/invalid-credential':
            errorMessage = 'Invalid email or password.';
            break;
          case 'auth/too-many-requests':
            errorMessage = 'Too many failed attempts. Please try again later.';
            break;
          default:
            errorMessage = error.message || errorMessage;
        }
        
        msg.textContent = errorMessage;
        msg.className = 'login-message error';
        
      } finally {
        // Re-enable button
        loginBtn.disabled = false;
        loginBtn.textContent = 'Login';
      }
    });
  }
});

// Forgot password functionality
async function forgotPassword(event) {
  event.preventDefault();
  
  const email = prompt('Please enter your email address:');
  
  if (!email) return;
  
  try {
    // Wait for Firebase to be ready
    if (!auth) {
      await initializeAuthState();
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    if (!auth) {
      alert('Firebase authentication not available. Please refresh the page.');
      return;
    }

    const { sendPasswordResetEmail } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
    
    await sendPasswordResetEmail(auth, email);
    
    alert('Password reset email sent! Please check your inbox.');
    
  } catch (error) {
    console.error('Password reset error:', error);
    
    let errorMessage = 'Failed to send password reset email.';
    
    switch (error.code) {
      case 'auth/invalid-email':
        errorMessage = 'Invalid email address.';
        break;
      case 'auth/user-not-found':
        errorMessage = 'No account found with this email.';
        break;
      default:
        errorMessage = error.message || errorMessage;
    }
    
    alert(errorMessage);
  }
}

// Logout functionality
async function logout() {
  try {
    if (!auth) {
      await initializeAuthState();
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    if (!auth) {
      console.error('Firebase authentication not available');
      return;
    }

    const { signOut } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
    
    await signOut(auth);
    console.log('User logged out');
    
    // Reload current page to update menu
    window.location.reload();
    
  } catch (error) {
    console.error('Logout error:', error);
    alert('Failed to logout. Please try again.');
  }
}