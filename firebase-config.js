// firebase-config.js — VibeStore Firebase Configuration
// ─────────────────────────────────────────────────────
// SETUP (takes 2 minutes):
// 1. Go to https://console.firebase.google.com
// 2. Click "Add project" → name it "vibestore" → Continue
// 3. Disable Google Analytics → Create project
// 4. Click "</> Web" icon → Register app as "vibestore-web"
// 5. Copy the firebaseConfig object below and replace the placeholder values
// 6. Go to Firestore Database → Create database → Start in test mode → Enable
// ─────────────────────────────────────────────────────

const firebaseConfig = {
  apiKey:            "",
  authDomain:        "ooumphapp.firebaseapp.com",
  projectId:         "ooumphapp",
  storageBucket:     "ooumphapp.firebasestorage.app",
  messagingSenderId: "964549387783",
  appId:             "1:964549387783:web:e66a1e626b206619cc6ca2",
  measurementId:     "G-6ZPSP5F1RR"
};

// Initialize Firebase
let _db = null;
let _firebaseReady = false;

function vsInitFirebase() {
  try {
    if (typeof firebase === 'undefined') {
      console.warn('VibeStore: Firebase SDK not loaded — using localStorage fallback');
      return false;
    }
    if (firebaseConfig.apiKey === 'YOUR_API_KEY') {
      console.warn('VibeStore: Firebase not configured — using localStorage fallback. See firebase-config.js for setup instructions.');
      return false;
    }
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    _db = firebase.firestore();
    _firebaseReady = true;
    console.log('VibeStore: Firebase connected ✅');
    return true;
  } catch(e) {
    console.warn('VibeStore: Firebase init failed —', e.message, '— using localStorage fallback');
    return false;
  }
}

function vsGetDb() { return _db; }
function vsIsFirebaseReady() { return _firebaseReady; }

// Auto-init when script loads
vsInitFirebase();
