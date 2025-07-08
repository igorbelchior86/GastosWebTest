// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCmIG1LXQyYDIHcbtcwD4-YUYl5BanuZe4",
  authDomain: "gastosweb-test.firebaseapp.com",
  databaseURL: "https://gastosweb-test-default-rtdb.firebaseio.com",
  projectId: "gastosweb-test",
  storageBucket: "gastosweb-test.firebasestorage.app",
  messagingSenderId: "1018674528871",
  appId: "1:1018674528871:web:953908eccb102cbdc60ac2",
  measurementId: "G-944T3Z4YR0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);