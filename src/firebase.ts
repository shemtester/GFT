// src/firebase.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD6_qmO6E5TJhi_3HSJ1sKH2JVbDR9o3WM",
  authDomain: "gift-factory-pos.firebaseapp.com",
  projectId: "gift-factory-pos",
  storageBucket: "gift-factory-pos.firebasestorage.app",
  messagingSenderId: "865882648545",
  appId: "1:865882648545:web:132f70a7c5b10d35adaca0",
  measurementId: "G-PB043HHHER"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
