#include <Wire.h>

// Libraries for IoT
#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include "addons/TokenHelper.h"
#include "addons/RTDBHelper.h"
#include "secrets.h"

// Libraries for OLED Display
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// Health Vitals Library
#include "MAX30105.h"
#include "heartRate.h"
#include "spo2_algorithm.h"

#include <Adafruit_MLX90614.h>

// Display size in pixels
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64

// Firebase components
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1); // Display what's on the screen
MAX30105 mex; // Heart Rate & SPO2
Adafruit_MLX90614 mlx = Adafruit_MLX90614(); // Temperature

// Pulse Rate and SPO2
uint32_t irBuffer[100];
uint32_t redBuffer[100];

int32_t bufferLength = 100;
int32_t spo2 = 0;
int8_t validSPO2 = 0;
int32_t heartRate = 0;
int8_t validHeartRate = 0;

// Timing
unsigned long lastOLEDUpdate = 0;
unsigned long lastFirebaseUpdate = 0;

// Front-End Interface for OLED
void healthVitals(int bpm, int displayedSPO2, float temp) {
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);

    // Title
    display.setCursor(0, 0);
    display.println("Health Monitoring");

    // Display Pulse Rate and SPO2
    display.setCursor(0, 12);
    display.print("Pulse Rate: ");
    display.print(bpm);
    display.println(" BPM");

    display.setCursor(0, 24);
    display.print("SPO2: ");
    display.print(displayedSPO2);
    display.println(" %");

    // Display Temperature
    display.setCursor(0, 36);
    display.print("Temp: ");
    display.print(temp, 1);
    display.println(" °C");

    display.display();
}

void setup() {
    // ------------- WIRE SETUP ------------
    Wire.begin(21, 22);
    Wire.setClock(400000);


    // Check if the OLED Display is working
    if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
        for(;;) {
            delay(10);
        }
    }

    // Display setup
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(0, 0);
    display.println("Initializing...");
    display.display();
    delay(800);

    // ------------- WIFI SETUP ------------
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    int dots = 0;
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);

        display.clearDisplay();
        display.setCursor(0, 0);
        display.println("Connecting to WiFi...");
        display.setCursor(0, 14);
        String dotStr = "";
        for (int i = 0; i < (dots % 4); i++) {
            dotStr += ".";
        }
        display.println(dotStr);
        display.display();
        dots++;
    }

    display.clearDisplay();
    display.setCursor(0, 0);
    display.println("WiFi Connected!");
    display.setCursor(0, 14);
    display.println(WiFi.localIP().toString());
    display.display();
    delay(1500);

    // ------------- FIREBASE SETUP ------------
    config.api_key = Web_API_KEY;
    config.database_url = DATABASE_URL;
    config.token_status_callback = tokenStatusCallback;
    auth.user.email = USER_EMAIL;
    auth.user.password = USER_PASS;

    Firebase.begin(&config, &auth);
    Firebase.reconnectWiFi(true);

    display.clearDisplay();
    display.setCursor(0, 0);
    display.println("Connecting to");
    display.setCursor(0, 14);
    display.println("Firebase...");
    display.display();

    // Timeout
    unsigned long fbTimeout = millis();
    while (!Firebase.ready() && millis() - fbTimeout < 10000) {
        delay(300);
    }

    display.clearDisplay();
    display.setCursor(0, 0);
    if (Firebase.ready()) {
        display.println("Firebase OK!");
    } else {
        display.println("Firebase Failed!");
        display.setCursor(0, 14);
        display.println("Check credentials");
    }
    display.display();
    delay(1500);
    lastFirebaseUpdate = 0;

    // ------------- SENSOR CHECKING ------------
    if(!mex.begin()) { // Heart rate & SPO2 sensor
        display.clearDisplay();
        display.setCursor(0, 0);
        display.println("Error, MAX30102 not connected");
        for (;;) {
            delay(10);
        }
    }

    mex.setup();
    mex.setPulseAmplitudeRed(0x3F);
    mex.setPulseAmplitudeIR(0x3F);

    if(!mlx.begin()) { // Temperature sensor
        display.clearDisplay();
        display.setCursor(0, 12);
        display.println("Error, MLX90614 not connected");
        display.display();
        for (;;) {
            delay(10);
        }
    }

    // When the sensors are working
    display.clearDisplay();
    display.setCursor(0,0);
    display.println("All sensors are OK!!!");
    display.display();
    delay(500);
}

void loop() {
    // ------------- MAX30102 READINGS ------------
    for (byte i = 0; i < 100; i++) {
        while (!mex.available())
        mex.check();
        
        redBuffer[i] = mex.getRed();
        irBuffer[i] = mex.getIR();
        mex.nextSample();     
    }
    
    uint32_t irValue = irBuffer[99];
    bool skinDetected = irValue > 30000;
    
    maxim_heart_rate_and_oxygen_saturation(
        irBuffer,
        bufferLength,
        redBuffer,
        &spo2,
        &validSPO2,
        &heartRate,
        &validHeartRate
    );
    
    int bpm = (skinDetected && validHeartRate && heartRate > 0) ? (int)heartRate : 0;
    int displaySPO2 = (skinDetected && validSPO2 && spo2 > 0) ? (int)spo2 : 0;
    
    // ------------- MLX90614 READINGS -------------
    float temp = mlx.readObjectTempC() + 0.5;

    // ------------- FIREBASE DATA STORAGE -------------
    if (Firebase.ready() && millis() - lastFirebaseUpdate > 5000) {
        lastFirebaseUpdate = millis();

        String timestamp = String(millis());
        String historyPath = "patients/device01/history/" + timestamp;
        String latestPath = "patients/device01/latest";

        FirebaseJson json;
        json.set("pulse-rate", bpm);
        json.set("blood-oxygen-levels", displaySPO2);
        json.set("body-temperature", temp);

        // Database Upload for medical records
        Firebase.RTDB.setJSON(&fbdo, historyPath, &json);

        // Live Record Update
        Firebase.RTDB.setJSON(&fbdo, latestPath, &json);
    }

    // ------------- OLED UPDATE -------------
    if (millis() - lastOLEDUpdate > 1000) {
        lastOLEDUpdate = millis();
        healthVitals(bpm, displaySPO2, temp); // Displayed on OLED
    }
}