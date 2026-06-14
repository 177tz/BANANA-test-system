// BANANA test system v0.2
// Firebase Web App config

const firebaseConfig = {
  apiKey: "AIzaSyAVLlbuXo14ChoYe4GzkSMzTjplxc9b9HA",
  authDomain: "banana-test-system.firebaseapp.com",
  projectId: "banana-test-system",
  storageBucket: "banana-test-system.firebasestorage.app",
  messagingSenderId: "129132517184",
  appId: "1:129132517184:web:685843d3f0b32186cbcca5",
  measurementId: "G-DMBQ45Y2KR"
};

firebase.initializeApp(firebaseConfig);

const db = firebase.firestore();
