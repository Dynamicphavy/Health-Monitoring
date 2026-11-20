const fs = require("fs");

const content = `
export const firebaseConfig = {
    apiKey: "${process.env.FIREBASE_API_KEY}",
    authDomain: "${process.env.FIREBASE_AUTH_DOMAIN}",
    databaseURL: "${process.env.FIREBASE_DATABASE_URL}",
    projectId: "${process.env.FIREBASE_PROJECT_ID}",
    storageBucket: "${process.env.FIREBASE_STORAGE_BUCKET}",
    messagingSenderId: "${process.env.FIREBASE_MESSAGING_SENDER_ID}",
    appId: "${process.env.FIREBASE_APP_ID}"
};

export const EMAILJS_PUBLIC_KEY  = "${process.env.EMAILJS_PUBLIC_KEY}";
export const EMAILJS_SERVICE_ID  = "${process.env.EMAILJS_SERVICE_ID}";
export const EMAILJS_TEMPLATE_ID = "${process.env.EMAILJS_TEMPLATE_ID}";
`;

fs.writeFileSync("config.js", content);
