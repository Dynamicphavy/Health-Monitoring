import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-database.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js";
import { firebaseConfig, EMAILJS_PUBLIC_KEY, EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID } from "./config.js";

// Setup
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// EmailJS Init
emailjs.init(EMAILJS_PUBLIC_KEY);

// Health Elements
const hr = document.getElementById("PR");
const temp = document.getElementById("Temp");
const spo2 = document.getElementById("SPO2");

// Card Elements
const hrCard = document.getElementById("PRCard");
const tempCard = document.getElementById("TempCard");
const spo2Card = document.getElementById("SPO2Card");

// ECG Chart Setup
const ecgData = Array(300).fill(0);
const ctx = document.getElementById("hrChart").getContext("2d");

const hrChart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: Array(300).fill(""),
        datasets: [{
            data: ecgData,
            borderColor: "#000",
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.3
        }]
    },
    options: {
        responsive: true,
        animation: false,
        plugins: { legend: { display: false } },
        scales: {
            x: { grid: { color: "#eee" }, ticks: { display: false } },
            y: { min: -0.8, max: 1.2, grid: { color: "#eee" }, ticks: { display: false } }
        }
    }
});

// ECG Wave Generator
const INTERVAL_MS = 16;
let currentBPM = 75; // default until Firebase updates it

function generateECGWave(bpm) {
    const totalSamples = Math.round((60 / bpm) * (1000 / INTERVAL_MS));
    const pWave = [0, 0.05, 0.1, 0.15, 0.2, 0.15, 0.1, 0.05, 0];
    const qrs = [0, -0.1, -0.2, 1.0, -0.5, 0];
    const tWave = [0, 0.05, 0.15, 0.25, 0.2, 0.1, 0.05, 0];
    const signal = [...pWave, ...qrs, ...tWave];
    const flat = Array(Math.max(totalSamples - signal.length, 0)).fill(0);
    return[...signal, ...flat]
}

let wave = generateECGWave(currentBPM);
let waveIndex = 0;

function updateECG() {
    ecgData.push(wave[waveIndex]);
    ecgData.shift();
    waveIndex = (waveIndex + 1) % wave.length;
    hrChart.update('none');
}

setInterval(updateECG, INTERVAL_MS);

// Thresholds
const THRESHOLDS = {
    "pulse-rate":          { min: 50, max: 120 },
    "blood-oxygen-levels": { min: 90, max:100 },
    "body-temperature":    { min: 36.1, max: 37.5 },
};

const cardMap = {
    "pulse-rate":          hrCard,
    "blood-oxygen-levels": spo2Card,
    "body-temperature":    tempCard,
}

const abnormalLog = [];

// Card Outline
function updateCardOutline(key, value) {
    const card = cardMap[key];
    const range = THRESHOLDS[key];
    if (!card || !range) return;

    if (value < range.min || value > range.max) {
        card.style.outline = "1px solid red";
    } else {
        card.style.outline = "none";
    }
}

// Email Alert
let lastEmailSent = 0;
const EMAIL_COOLDOWN = 5 * 60 * 1000; // 5 minutes

function sendAlertEmail(data, flags) {
    const now = Date.now();
    if (now - lastEmailSent < EMAIL_COOLDOWN) return;

    const currentDoctor = auth.currentUser;
    if (!currentDoctor) return; // no doctor logged in

    lastEmailSent = now;

    const flagText = flags.map(f => `${f.metric}: ${f.value} (normal: ${f.min}-${f.max})`).join("\n");

    const templateParams = {
        to_email:    currentDoctor.email,
        to_name:     currentDoctor.displayName ?? "Doctor",
        timestamp:   new Date().toLocaleString(),
        pulse_rate:  data["pulse-rate"]          ?? "--",
        spo2:        data["blood-oxygen-levels"] ?? "--",
        temperature: data["body-temperature"]    ?? "--",
        flags:       flagText
    }

    emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams)
        .then(() => {
            console.log(`Alert email sent to ${currentDoctor.email} at ${new Date().toLocaleTimeString()}`)
        })
        .catch((error) => {
            console.error("Alert email failed to send: ", error);
        })
}

// Abnormal Check
function checkAbnormal(data) {
    const timestamp = new Date().toLocaleString();
    const flags = [];

    for (const [key, range] of Object.entries(THRESHOLDS)) {
        const val = parseFloat(data[key]);
        if (isNaN(val)) continue;

        updateCardOutline(key, val);

        if (val < range.min || val > range.max) {
            flags.push({ metric: key, value: val, min: range.min, max: range.max });
        }
    }

    if (flags.length > 0) {
        abnormalLog.push({ timestamp, readings: data, flags });

        // Show export button when anomaly detected
        document.getElementById("export-btn").style.display = "block";

        // Sends to logged in doctor's email
        sendAlertEmail(data, flags)
    }
}

// PDF Render
function exportAbnormalReport() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    // Header
    doc.setFontSize(13);
    doc.setFont("times", "bold");
    doc.text("Health Monitoring - Abnormal Readings Report", pageWidth / 2, y, { align: "center" });
    y += 8;

    doc.setFontSize(10);
    doc.setFont("times", "normal");
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, y, { align: "center" });
    y += 10;

    doc.line(15, y, pageWidth - 15, y);
    y += 8;

    if (abnormalLog.length === 0) {
        doc.text("No abnormal readings recorded.", 15, y);
    }

    // Log each abnormal event
    abnormalLog.forEach((entry, i) => {
        if (y > 260) { // New page
            doc.addPage();
            y = 20;
        }

        doc.setFontSize(11);
        doc.setFont("times", "bold");
        doc.text(`Event ${i + 1} - ${entry.timestamp}`, 15, y);
        y += 6;

        doc.setFontSize(12);
        doc.setFont("times", "normal");
        doc.text(`Pulse Rate: ${entry.readings["pulse-rate"]} BPM`, 20, y);
        y += 5;
        doc.text(`SpO2: ${entry.readings["blood-oxygen-levels"]}%`, 20, y);
        y += 5;
        doc.text(`Temperature: ${entry.readings["body-temperature"]}°C`, 20, y);
        y += 5;

        doc.setTextColor(200, 0, 0);
        doc.setFont("times", "bold");
        doc.text("Abnormal Flags:", 20, y);
        y += 5;

        doc.setFont("times", "normal");
        entry.flags.forEach(flag => {
            doc.text(`• ${flag.metric}: ${flag.value} (normal: ${flag.min}-${flag.max})`, 25, y);
            y += 5;
        });

        doc.setTextColor(0, 0, 0);
        y += 4;
        doc.line(15, y, pageWidth - 15, y);
        y += 6;
    });

    doc.save(`abnormal_report_${Date.now()}.pdf`);
}

// Firebase Live Listener
const vitalsRef = ref(db, "patients/device01/latest");

onValue(vitalsRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) return;

    // Vital Card Update
    hr.textContent = data["pulse-rate"] ?? 0;
    temp.textContent = data["body-temperature"] ?? 0;
    spo2.textContent = data["blood-oxygen-levels"] ?? 0;

    checkAbnormal(data);

    // Update ECG wave speed
    const newBPM = parseInt(data["pulse-rate"]);
    if (newBPM && newBPM !== currentBPM && newBPM > 30 && newBPM < 250) {
        currentBPM = newBPM;
        wave = generateECGWave(currentBPM);
        waveIndex = 0; // Position Wave reset
    }
});

// Logging out
const logOut = document.getElementById("logout");
logOut.addEventListener("click", () => {
    signOut(auth).then(() => {
        window.location.href = "log.html";
    }).catch((error) => {
        console.error("Logout failed: ", error)
    });
});https://github.com/Dynamicphavy/Health-Monitoring-Device.git

// Restriction
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "log.html";
    }
});

// Export Button
document.getElementById("export-btn").addEventListener("click", exportAbnormalReport);