# Wearable Health Monitoring Device for Remote Fitness and Preventive Healthcare

An IoT-based wearable prototype designed to collect selected health and
activity measurements, send readings to Firebase, and display them on a
web dashboard for remote monitoring.

## Overview

The device uses an ESP32-C3 microcontroller and sensors to collect heart
rate, blood oxygen saturation (SpO₂), body temperature, and movement
data. When Wi-Fi is available, readings are uploaded to Firebase
Realtime Database and displayed on a web dashboard intended for
authorized doctor access.

The prototype also includes visual status indicators, a piezo buzzer,
and automated email alerts with a PDF report attachment when configured
health readings are abnormal.

## Features

-   Heart-rate and SpO₂ acquisition using a GY-MAX30102 sensor.
-   Temperature measurement using a MAX30205 sensor.
-   Movement/activity sensing using an LSM6DS3 accelerometer.
-   ESP32-C3 connectivity and Firebase Realtime Database integration.
-   HTML, CSS, and JavaScript dashboard for viewing readings.
-   Visual status changes and piezo-buzzer alerts.
-   Email notifications with PDF report attachments through EmailJS.
-   Wearable armband form factor.

## Hardware

  Component           Purpose
  ------------------- ----------------------------------------
  ESP32-C3            Microcontroller and Wi-Fi connectivity
  GY-MAX30102         Heart-rate and SpO₂ sensing
  MAX30205            Temperature sensing
  LSM6DS3             Movement/activity sensing
  Piezo buzzer        Local alert output
  Armband enclosure   Holds the prototype against the wearer

The sensors communicate with the ESP32-C3 over I²C.

## Software and Services

-   **Embedded firmware:** ESP32-C3 sensor acquisition and data upload
-   **Database:** Firebase Realtime Database
-   **Dashboard:** HTML, CSS, and JavaScript
-   **Email alerts:** EmailJS
-   **Report output:** PDF report attached to alert emails

## How It Works

1.  The sensors collect measurements from the wearer.
2.  The ESP32-C3 reads the sensor data.
3.  When Wi-Fi is available, the device uploads readings to Firebase
    Realtime Database.
4.  The web dashboard retrieves and displays the stored readings.
5.  Configured abnormal readings can trigger visual indicators, a
    buzzer, and an email alert with a PDF report.

## Testing and Results

The prototype was tested using **568 readings**. Reported validation
results included:

  Measurement        Reported result
  ------------------ ---------------------------------------------------
  Temperature        Mean Absolute Percentage Error (MAPE): **2.2%**
  Heart rate         MAPE on continuous Firebase data: **24.2%**
  SpO₂               MAPE: **21.0%**
  SpO₂ acquisition   **66.7%** of attempts failed to acquire a reading

Heart-rate readings were reported as clinically valid during
reference-device validation for all four volunteers, despite the higher
error measured in continuous Firebase data. The results also highlighted
sensitivity to sensor contact, particularly for SpO₂ measurements.

These are prototype validation results, not evidence of clinical-grade
performance. The device is intended as an academic prototype and should
not be used to make medical decisions.

## Known Limitations

-   Inconsistent sensor-to-skin contact can affect readings, especially
    SpO₂.
-   The current prototype uses a fabric armband and would benefit from
    improved mechanical sensor positioning.
-   Further calibration, signal-quality filtering, and broader testing
    are needed.
-   The validation sample was limited to four volunteers.
-   Firebase access rules, authentication, and transport security must
    be configured carefully before any real deployment involving
    personal health data.

## Future Improvements

-   Design a custom PCB and more stable wearable housing.
-   Improve optical sensor contact and add PPG signal-quality filtering.
-   Calibrate the temperature sensor and tune activity/step-count
    processing.
-   Evaluate an alternative SpO₂ sensor if acquisition reliability
    remains poor.
-   Improve battery life and power management.
-   Validate with a larger participant group and a more rigorous
    protocol.
-   Strengthen access control and security, and explore electronic
    health record (EHR) integration.

## Project Scope

This project demonstrates the integration of wearable sensing, embedded
programming, cloud data storage, a web dashboard, and alert reporting
for remote health monitoring. It is a prototype, and further engineering
and clinical validation are required before practical healthcare use.

## Author

Final-year undergraduate project.

## Disclaimer

This project is for educational and prototype demonstration purposes
only. It is not a certified medical device and must not be relied upon
for diagnosis, treatment, or emergency decisions.
