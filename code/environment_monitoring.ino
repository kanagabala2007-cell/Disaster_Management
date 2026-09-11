/*
  AI-Powered Resilient Environmental Monitoring Network
  ESP32-S3 Environmental Monitoring Node

  Sensors:
  MQ-2 Gas/Smoke      -> GPIO 1
  Sound Sensor        -> GPIO 2
  Flame/IR Sensor     -> GPIO 3
  HC-SR04 TRIG        -> GPIO 4
  HC-SR04 ECHO        -> GPIO 5
  Rain Sensor         -> GPIO 6
  Soil Moisture       -> GPIO 7

  OLED:
  SDA                 -> GPIO 8
  SCL                 -> GPIO 9

  SD Card:
  CS                  -> GPIO 10
  MOSI                -> GPIO 11
  SCK                 -> GPIO 12
  MISO                -> GPIO 13

  Buzzer              -> GPIO 14
  Alert LED           -> GPIO 15

  GPS:
  RX                  -> GPIO 17
  TX                  -> GPIO 18
*/

#include <Wire.h>
#include <SPI.h>
#include <SD.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// ---------------- PIN DEFINITIONS ----------------

#define MQ2_PIN       1
#define SOUND_PIN     2
#define FLAME_PIN     3

#define TRIG_PIN      4
#define ECHO_PIN      5

#define RAIN_PIN      6
#define SOIL_PIN      7

#define OLED_SDA      8
#define OLED_SCL      9

#define SD_CS         10
#define SD_MOSI       11
#define SD_SCK        12
#define SD_MISO       13

#define BUZZER_PIN    14
#define LED_PIN       15

#define GPS_RX        17
#define GPS_TX        18

// ---------------- THRESHOLDS ----------------

#define GAS_THRESHOLD       1800
#define FLAME_THRESHOLD     1500
#define RAIN_THRESHOLD      1500
#define SOIL_WET_THRESHOLD  1800
#define SOUND_THRESHOLD     2500

#define WATER_LEVEL_CM      15.0

// ---------------- OLED ----------------

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64

Adafruit_SSD1306 display(
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  &Wire,
  -1
);

// ---------------- GPS ----------------

HardwareSerial GPS(1);

// ---------------- RISK LEVEL ----------------

enum RiskLevel {
  LOW,
  MEDIUM,
  HIGH,
  CRITICAL
};

// ---------------- SETUP ----------------

void setup() {

  Serial.begin(115200);

  delay(1000);

  Serial.println();
  Serial.println("======================================");
  Serial.println("ENVIRONMENTAL MONITORING SYSTEM");
  Serial.println("ESP32-S3 EDGE NODE");
  Serial.println("======================================");

  // Sensor pins
  pinMode(MQ2_PIN, INPUT);
  pinMode(SOUND_PIN, INPUT);
  pinMode(FLAME_PIN, INPUT);
  pinMode(RAIN_PIN, INPUT);
  pinMode(SOIL_PIN, INPUT);

  // HC-SR04
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);

  digitalWrite(TRIG_PIN, LOW);

  // Alert outputs
  pinMode(LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);

  digitalWrite(LED_PIN, LOW);
  digitalWrite(BUZZER_PIN, LOW);

  // OLED
  Wire.begin(OLED_SDA, OLED_SCL);

  if (display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {

    display.clearDisplay();

    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);

    display.setCursor(0, 0);
    display.println("ENVIRONMENT");
    display.println("MONITORING");
    display.println();

    display.println("ESP32-S3 READY");

    display.display();

    Serial.println("OLED: READY");

  } else {

    Serial.println("OLED: NOT FOUND");
  }

  // GPS
  GPS.begin(
    9600,
    SERIAL_8N1,
    GPS_RX,
    GPS_TX
  );

  Serial.println("GPS: STARTED");

  // SD card
  SPI.begin(
    SD_SCK,
    SD_MISO,
    SD_MOSI,
    SD_CS
  );

  if (SD.begin(SD_CS)) {

    Serial.println("SD CARD: READY");

    if (!SD.exists("/environment.csv")) {

      File file = SD.open(
        "/environment.csv",
        FILE_WRITE
      );

      if (file) {

        file.println(
          "Gas,Sound,Flame,Rain,Soil,Distance,Risk"
        );

        file.close();
      }
    }

  } else {

    Serial.println("SD CARD: NOT FOUND");
  }

  Serial.println("SYSTEM INITIALIZATION COMPLETE");
  Serial.println();
}

// ---------------- HC-SR04 DISTANCE ----------------

float readDistance() {

  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);

  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);

  digitalWrite(TRIG_PIN, LOW);

  long duration = pulseIn(
    ECHO_PIN,
    HIGH,
    30000
  );

  if (duration == 0) {
    return -1;
  }

  float distance =
    duration * 0.0343 / 2.0;

  return distance;
}

// ---------------- RISK CALCULATION ----------------

RiskLevel calculateRisk(
  int gas,
  int sound,
  int flame,
  int rain,
  int soil,
  float distance
) {

  int riskScore = 0;

  // Gas
  if (gas > GAS_THRESHOLD) {
    riskScore += 2;
  }

  // Sound
  if (sound > SOUND_THRESHOLD) {
    riskScore += 1;
  }

  // Flame / IR
  if (flame < FLAME_THRESHOLD) {
    riskScore += 3;
  }

  // Rain
  if (rain > RAIN_THRESHOLD) {
    riskScore += 1;
  }

  // Soil
  if (soil < SOIL_WET_THRESHOLD) {
    riskScore += 1;
  }

  // Water level
  if (distance > 0 && distance < WATER_LEVEL_CM) {
    riskScore += 3;
  }

  if (riskScore >= 7) {
    return CRITICAL;
  }

  if (riskScore >= 5) {
    return HIGH;
  }

  if (riskScore >= 3) {
    return MEDIUM;
  }

  return LOW;
}

// ---------------- RISK TEXT ----------------

const char* riskToString(
  RiskLevel risk
) {

  switch (risk) {

    case LOW:
      return "LOW";

    case MEDIUM:
      return "MEDIUM";

    case HIGH:
      return "HIGH";

    case CRITICAL:
      return "CRITICAL";
  }

  return "UNKNOWN";
}

// ---------------- ALERT CONTROL ----------------

void updateAlerts(
  RiskLevel risk
) {

  if (risk == LOW) {

    digitalWrite(LED_PIN, LOW);
    digitalWrite(BUZZER_PIN, LOW);
  }

  else if (risk == MEDIUM) {

    digitalWrite(LED_PIN, HIGH);
    digitalWrite(BUZZER_PIN, LOW);
  }

  else if (risk == HIGH) {

    digitalWrite(LED_PIN, HIGH);
    digitalWrite(BUZZER_PIN, HIGH);
  }

  else if (risk == CRITICAL) {

    digitalWrite(LED_PIN, HIGH);
    digitalWrite(BUZZER_PIN, HIGH);
  }
}

// ---------------- OLED DISPLAY ----------------

void updateOLED(
  int gas,
  float distance,
  RiskLevel risk
) {

  display.clearDisplay();

  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);

  display.setCursor(0, 0);

  display.println("ENV MONITOR");

  display.setCursor(0, 15);

  display.print("Gas: ");
  display.println(gas);

  display.setCursor(0, 27);

  display.print("Water: ");

  if (distance < 0) {
    display.println("N/A");
  } else {
    display.print(distance, 1);
    display.println(" cm");
  }

  display.setCursor(0, 40);

  display.print("Risk: ");
  display.println(riskToString(risk));

  display.setCursor(0, 53);

  display.println("ESP32-S3 NODE");

  display.display();
}

// ---------------- SD LOGGING ----------------

void logToSD(
  int gas,
  int sound,
  int flame,
  int rain,
  int soil,
  float distance,
  RiskLevel risk
) {

  File file = SD.open(
    "/environment.csv",
    FILE_APPEND
  );

  if (file) {

    file.print(gas);
    file.print(",");

    file.print(sound);
    file.print(",");

    file.print(flame);
    file.print(",");

    file.print(rain);
    file.print(",");

    file.print(soil);
    file.print(",");

    if (distance < 0) {
      file.print("N/A");
    } else {
      file.print(distance, 2);
    }

    file.print(",");

    file.println(
      riskToString(risk)
    );

    file.close();

  } else {

    Serial.println("SD LOG: FAILED");
  }
}

// ---------------- GPS PASS THROUGH ----------------

void readGPS() {

  while (GPS.available()) {

    char c = GPS.read();

    Serial.write(c);
  }
}

// ---------------- MAIN LOOP ----------------

void loop() {

  // Read sensors
  int gasValue =
    analogRead(MQ2_PIN);

  int soundValue =
    analogRead(SOUND_PIN);

  int flameValue =
    analogRead(FLAME_PIN);

  int rainValue =
    analogRead(RAIN_PIN);

  int soilValue =
    analogRead(SOIL_PIN);

  float distance =
    readDistance();

  // Calculate risk
  RiskLevel risk =
    calculateRisk(
      gasValue,
      soundValue,
      flameValue,
      rainValue,
      soilValue,
      distance
    );

  // Serial output
  Serial.println("--------------------------------------");

  Serial.print("Gas: ");
  Serial.println(gasValue);

  Serial.print("Sound: ");
  Serial.println(soundValue);

  Serial.print("Flame/IR: ");
  Serial.println(flameValue);

  Serial.print("Rain: ");
  Serial.println(rainValue);

  Serial.print("Soil: ");
  Serial.println(soilValue);

  Serial.print("Water Distance: ");

  if (distance < 0) {
    Serial.println("No reading");
  } else {
    Serial.print(distance, 2);
    Serial.println(" cm");
  }

  Serial.print("RISK LEVEL: ");
  Serial.println(riskToString(risk));

  // Update outputs
  updateAlerts(risk);

  // OLED
  updateOLED(
    gasValue,
    distance,
    risk
  );

  // SD logging
  if (SD.begin(SD_CS)) {

    logToSD(
      gasValue,
      soundValue,
      flameValue,
      rainValue,
      soilValue,
      distance,
      risk
    );
  }

  // GPS
  readGPS();

  delay(2000);
}