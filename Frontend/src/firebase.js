// Import the functions you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth"; // ✅ ADD THIS

const firebaseConfig = {
  apiKey: "AIzaSyC4MH3C_hWeSC-UwJroEsMANNC2es2AlOQ",
  authDomain: "meetzyy-8dcd8.firebaseapp.com",
  projectId: "meetzyy-8dcd8",
  storageBucket: "meetzyy-8dcd8.firebasestorage.app",
  messagingSenderId: "447581263794",
  appId: "1:447581263794:web:a361ace2337117eb76f6ab",
  measurementId: "G-30HDP6XJ8T",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// ✅ Initialize Auth
export const auth = getAuth(app);
