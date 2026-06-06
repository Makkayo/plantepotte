/*
 * Plantepotte — ESP32-CAM
 * ------------------------------------------------------------------
 * Eget kort (AI-Thinker ESP32-CAM). Tar et bilde av plantene med jevne
 * mellomrom og laster det opp til Supabase Storage over WiFi. Ingen
 * datakabel til hoved-ESP32 — all kontakt gar via skyen.
 *
 * Web-appen henter bildene fra samme bucket og bygger en vekst-tidslinje.
 *
 * KREVER (gjor dette FOR forste opplasting — se esp32cam/README.md):
 *   1. En Storage-bucket i Supabase som heter BUCKET (under), public read.
 *   2. En policy som lar "anon" laste opp (INSERT) til bucketen.
 *
 * Arduino IDE-oppsett:
 *   - Kort:    "AI Thinker ESP32-CAM"
 *   - Partition: "Huge APP (3MB No OTA/1MB SPIFFS)"
 *   - Last opp via FTDI/USB-TTL eller ESP32-CAM-MB programmeringsbordet.
 * ------------------------------------------------------------------
 */

#include "esp_camera.h"
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include "time.h"

// ====================== ENDRE DISSE ======================
const char* WIFI_SSID = "DITT-WIFI-NAVN";       // kun 2,4 GHz
const char* WIFI_PASS = "DITT-WIFI-PASSORD";

const char* SUPABASE_HOST = "ebjbxfwtwrahuokydvtj.supabase.co";
const char* ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImViamJ4Znd0d3JhaHVva3lkdnRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNDgxOTksImV4cCI6MjA4ODgyNDE5OX0.25yREg6vMLUPNoebopUX-TeMWlwKjtssRQLGa2BEQC0";

const char* POTTE_ID = "potte1";
const char* BUCKET   = "plantebilder";          // ma finnes i Supabase Storage

const int   CAPTURE_INTERVAL_MIN = 60;          // minutter mellom hvert bilde
// =========================================================

// AI-Thinker ESP32-CAM pinout
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

bool wifiConnect() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("WiFi");
  for (int i = 0; i < 40 && WiFi.status() != WL_CONNECTED; i++) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("WiFi OK: ");
    Serial.println(WiFi.localIP());
    return true;
  }
  Serial.println("WiFi feilet");
  return false;
}

bool cameraInit() {
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer   = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sccb_sda = SIOD_GPIO_NUM;
  config.pin_sccb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;

  if (psramFound()) {
    config.frame_size = FRAMESIZE_SVGA;   // 800x600
    config.jpeg_quality = 10;
    config.fb_count = 2;
  } else {
    config.frame_size = FRAMESIZE_VGA;    // 640x480
    config.jpeg_quality = 12;
    config.fb_count = 1;
  }

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Kamera-init feilet: 0x%x\n", err);
    return false;
  }
  return true;
}

String timestampName() {
  // Filnavn: potte1/20260606-143000.jpg  (faller tilbake til millis hvis NTP feiler)
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");
  struct tm t;
  char buf[40];
  if (getLocalTime(&t, 5000)) {
    strftime(buf, sizeof(buf), "%Y%m%d-%H%M%S", &t);
  } else {
    snprintf(buf, sizeof(buf), "boot-%lu", (unsigned long)millis());
  }
  return String(POTTE_ID) + "/" + String(buf) + ".jpg";
}

bool uploadImage(camera_fb_t* fb, const String& path) {
  WiFiClientSecure client;
  client.setInsecure();              // enkel TLS uten sertifikat-validering
  Serial.print("Kobler til Supabase ...");
  if (!client.connect(SUPABASE_HOST, 443)) {
    Serial.println(" feilet");
    return false;
  }
  String url = "/storage/v1/object/" + String(BUCKET) + "/" + path;

  client.printf("POST %s HTTP/1.1\r\n", url.c_str());
  client.printf("Host: %s\r\n", SUPABASE_HOST);
  client.printf("apikey: %s\r\n", ANON_KEY);
  client.printf("Authorization: Bearer %s\r\n", ANON_KEY);
  client.println("Content-Type: image/jpeg");
  client.printf("Content-Length: %u\r\n", fb->len);
  client.println("Connection: close");
  client.println();
  client.write(fb->buf, fb->len);

  // Les statuslinje
  String status = client.readStringUntil('\n');
  Serial.println("Svar: " + status);
  client.stop();
  return status.indexOf("200") > 0 || status.indexOf("201") > 0;
}

void deepSleepMinutes(int minutes) {
  Serial.printf("Sover i %d min ...\n", minutes);
  esp_sleep_enable_timer_wakeup((uint64_t)minutes * 60ULL * 1000000ULL);
  esp_deep_sleep_start();
}

void setup() {
  Serial.begin(115200);
  delay(300);

  if (!cameraInit()) { deepSleepMinutes(CAPTURE_INTERVAL_MIN); }
  if (!wifiConnect()) { deepSleepMinutes(CAPTURE_INTERVAL_MIN); }

  // Kast de forste rammene (auto-eksponering trenger a stabilisere seg)
  for (int i = 0; i < 3; i++) {
    camera_fb_t* fb = esp_camera_fb_get();
    if (fb) esp_camera_fb_return(fb);
    delay(100);
  }

  camera_fb_t* fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("Bilde-fangst feilet");
    deepSleepMinutes(CAPTURE_INTERVAL_MIN);
  }

  String path = timestampName();
  Serial.println("Laster opp: " + path + "  (" + String(fb->len) + " bytes)");
  bool ok = uploadImage(fb, path);
  esp_camera_fb_return(fb);
  Serial.println(ok ? "Opplasting OK" : "Opplasting feilet");

  deepSleepMinutes(CAPTURE_INTERVAL_MIN);
}

void loop() {
  // Tom — alt skjer i setup(), deretter deep sleep.
}
