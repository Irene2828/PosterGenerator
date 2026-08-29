const firebaseConfig = {
  projectId: "terryfoxrun-posters",
  appId: "1:1027931079819:web:3cfd66a3cff22fefa9008e",
  storageBucket: "terryfoxrun-posters.firebasestorage.app",
  apiKey: "AIzaSyD3v5XeebfPpSLkFGfXuJJQqPTD10s3jTM",
  authDomain: "terryfoxrun-posters.firebaseapp.com",
  messagingSenderId: "1027931079819",
  measurementId: "G-3QNBQCPEYL"
};

// Initialize Firebase using compat libraries
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Make them available globally so inline scripts can use them
window.firebaseAuth = auth;
window.firebaseDb = db;
window.firebaseProvider = new firebase.auth.GoogleAuthProvider();

// Check for Email Link Sign-In on page load
if (window.firebaseAuth.isSignInWithEmailLink(window.location.href)) {
  let email = window.localStorage.getItem('emailForSignIn');
  if (!email) {
    email = window.prompt('Please provide your email for confirmation');
  }
  if (email) {
    window.firebaseAuth.signInWithEmailLink(email, window.location.href)
      .then((result) => {
        window.localStorage.removeItem('emailForSignIn');
        // Clear the URL parameters so it doesn't try again
        window.history.replaceState({}, document.title, window.location.pathname);
      })
      .catch((error) => {
        console.error(error);
        alert('Error signing in with email link: ' + error.message);
      });
  }
}
