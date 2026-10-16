import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js";
import { firebaseConfig } from "./config.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth();

const submit = document.getElementById("submit");
const message = document.getElementById("msg");

// Submit functionalities
submit.addEventListener("click", function(event) {
    event.preventDefault()

    // Inputs
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    // Log In
    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            // Logged in 
            const user = userCredential.user;
            alert("Logging In");
            window.location.href = "index.html";
        })
        .catch((error) => {
            const errorCode = error.code;
            const errorMessage = error.message;
            message.textContent = errorMessage;
        });
})