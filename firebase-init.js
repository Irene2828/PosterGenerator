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
