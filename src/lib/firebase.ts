// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCpmq3B74co2vLPqoTyampOrbd2eswsWhk",
  authDomain: "saas-nox.firebaseapp.com",
  projectId: "saas-nox",
  storageBucket: "saas-nox.firebasestorage.app",
  messagingSenderId: "654977639751",
  appId: "1:654977639751:web:338194d21a9305eea11862"
};

// Initialize Firebase
// A lógica getApps().length ? getApp() : initializeApp(firebaseConfig) 
// evita que o app seja inicializado múltiplas vezes no ambiente de desenvolvimento
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Configurar provedor do Google
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export { app, auth, db, googleProvider }; 