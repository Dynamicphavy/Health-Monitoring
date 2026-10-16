import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js";
import { getAuth, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js";
import { firebaseConfig } from "./config.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth();

const submit = document.getElementById("submit");
const message = document.getElementById("msg");

// Submit functionalities
submit.addEventListener("click", function(event) {
    event.preventDefault()

    const email = document.getElementById("email").value; // Input

    // Validation
    if (!email) {
        message.textContent = "Please enter your email address";
    }

    sendPasswordResetEmail(auth, email)
        .then(() => {
            message.textContent = `Password reset email sent to ${email}. Check your inbox.`;
        })
        .catch((error) => {
            switch (error.code) {
                case "auth/invalid-email":
                    message.textContent = "Invalid email address."
                    break;
                case "auth/too-many-requests":
                    message.textContent = "Too many requests. Try again later";
                    break;
                default:
                    message.textContent = `Error: ${error.message}`;
            }
        })
})