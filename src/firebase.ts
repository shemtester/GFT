// src/firebase.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB3J2VzHl6VvR3fCdDcK7EsZ1GIttrVCys",
  authDomain: "gft-1-0.firebaseapp.com",
  projectId: "gft-1-0",
  storageBucket: "gft-1-0.firebasestorage.app",
  messagingSenderId: "454254663763",
  appId: "1:454254663763:web:cec669ec1267e465680ea6",
  measurementId: "G-M9HN2JEEQP"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
