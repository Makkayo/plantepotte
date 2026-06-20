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
#include <HTTPClient.h>
#include "time.h"
#include "esp_sntp.h"      // for a stoppe NTP for opplasting (unngar UDP-krasj)

// WiFi-navn og passord ligger i secrets.h (gitignored — skal ALDRI hit).
// Første gang: kopier secrets.example.h -> secrets.h og fyll inn der.
#include "secrets.h"

// ================== RESTEN ER FERDIG UTFYLT ==================
// (ANON_KEY er en offentlig "anon"-nøkkel — laget for å ligge i klientkode.)
const char* SUPABASE_HOST = "ebjbxfwtwrahuokydvtj.supabase.co";
const char* ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImViamJ4Znd0d3JhaHVva3lkdnRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNDgxOTksImV4cCI6MjA4ODgyNDE5OX0.25yREg6vMLUPNoebopUX-TeMWlwKjtssRQLGa2BEQC0";

const char* POTTE_ID = "potte1";
const char* BUCKET   = "plantebilder";          // ma finnes i Supabase Storage

// 720 min = 2 bilder/dag — matcher frekvens-filosofien (1–2 bilder/dag er nok
// for en vekst-tidslinje, og holder AI-analysekostnaden på ~5–10 kr/mnd).
// TODO (fase 4b, når kameraet er montert): ta bildet i et vindu der vekst-
// lyset er AV (les timer fra potte_commands) eller bruk flash-LED-en — ellers
// blir bildene magenta av phyto-lyset og ubrukelige for AI-vurdering.
const int   CAPTURE_INTERVAL_MIN = 720;

// Ved feil (kamera/WiFi/opplasting): prøv igjen raskt i stedet for å vente
// et halvt døgn på neste ordinære forsøk.
const int   RETRY_MIN = 10;
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

// Teller som overlever dyp sovn (lagres i RTC-minnet) — gir unike filnavn
// selv om NTP skulle feile, sa to bilder aldri kolliderer.
RTC_DATA_ATTR uint32_t bootteller = 0;

// Synk klokka EN gang, rett etter WiFi og FOR all annen nett-trafikk.
// Stopper SNTP etterpa: ellers fortsetter NTP a sende UDP i bakgrunnen og
// kolliderer med DNS-oppslaget mot Supabase -> udp_new_ip_type-krasj.
// RTC-klokka gar videre selv om SNTP stoppes, sa tiden beholdes.
void syncTimeOnce() {
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");
  struct tm t;
  if (getLocalTime(&t, 8000)) {
    Serial.println("NTP-tid satt");
  } else {
    Serial.println("NTP feilet — bruker teller i filnavn");
  }
  esp_sntp_stop();         // VIKTIG: ingen NTP-UDP under opplastingen
}

String buildName() {
  // Filnavn: potte1/20260606-143000.jpg, eller potte1/img-<teller>.jpg hvis
  // klokka ikke ble satt. Kaller IKKE nett (configTime) — leser bare RTC-klokka.
  struct tm t;
  char buf[40];
  if (getLocalTime(&t, 0)) {
    strftime(buf, sizeof(buf), "%Y%m%d-%H%M%S", &t);
  } else {
    snprintf(buf, sizeof(buf), "img-%lu", (unsigned long)bootteller);
  }
  return String(POTTE_ID) + "/" + String(buf) + ".jpg";
}

// Liten Stream-innpakning rundt kamera-bufferet. ESP32 sin TLS sender maks
// en TLS-pakke per write — sender vi hele bildet i ett kall, feiler det med
// HTTP -3 nar bildet er storre enn pakkestorrelsen. Som Stream deler
// HTTPClient bildet i ~1,4 KB-biter som hver far plass i en TLS-pakke.
class BufStream : public Stream {
  const uint8_t* _buf;
  size_t _len, _pos;
public:
  BufStream(const uint8_t* b, size_t l) : _buf(b), _len(l), _pos(0) {}
  int available() override { return (int)(_len - _pos); }
  int read() override { return _pos < _len ? _buf[_pos++] : -1; }
  int peek() override { return _pos < _len ? _buf[_pos] : -1; }
  size_t write(uint8_t) override { return 0; }   // kun lesing
};

bool uploadImage(camera_fb_t* fb, const String& path) {
  WiFiClientSecure tls;
  tls.setInsecure();                 // enkel TLS uten sertifikat-validering

  HTTPClient http;
  String url = String("https://") + SUPABASE_HOST
               + "/storage/v1/object/" + BUCKET + "/" + path;

  Serial.printf("Fri heap for opplasting: %u bytes\n", ESP.getFreeHeap());
  Serial.print("Kobler til Supabase ...");
  if (!http.begin(tls, url)) {
    Serial.println(" begin feilet");
    return false;
  }
  http.setTimeout(20000);            // TLS + opplasting kan ta tid
  http.addHeader("apikey", ANON_KEY);
  http.addHeader("Authorization", String("Bearer ") + ANON_KEY);
  http.addHeader("Content-Type", "image/jpeg");

  BufStream body(fb->buf, fb->len);
  int code = http.sendRequest("POST", &body, fb->len);
  Serial.println(" HTTP " + String(code));
  http.end();

  return code == 200 || code == 201;
}

void deepSleepMinutes(int minutes) {
  Serial.printf("Sover i %d min ...\n", minutes);
  esp_sleep_enable_timer_wakeup((uint64_t)minutes * 60ULL * 1000000ULL);
  esp_deep_sleep_start();
}

void setup() {
  Serial.begin(115200);
  delay(300);

  // WiFi FORST, mens kameraet enna er av: da slipper vi at kameraet
  // overflyter buffere (FB-OVF) og trekker strom/CPU under WiFi-oppkoblingen
  // — det gjorde WiFi ustabil og stjal minne fra TLS-opplastingen.
  bootteller++;
  if (!wifiConnect()) { deepSleepMinutes(RETRY_MIN); }

  // Klokka synkes EN gang her, og SNTP stoppes — sa det aldri kjorer to
  // nett-kall (NTP-UDP + Supabase-DNS) samtidig under opplastingen.
  syncTimeOnce();

  if (!cameraInit())  { deepSleepMinutes(RETRY_MIN); }

  // Kast de forste rammene (auto-eksponering trenger a stabilisere seg)
  for (int i = 0; i < 3; i++) {
    camera_fb_t* fb = esp_camera_fb_get();
    if (fb) esp_camera_fb_return(fb);
    delay(100);
  }

  camera_fb_t* fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("Bilde-fangst feilet");
    deepSleepMinutes(RETRY_MIN);
  }

  String path = buildName();
  Serial.println("Laster opp: " + path + "  (" + String(fb->len) + " bytes)");
  bool ok = uploadImage(fb, path);
  esp_camera_fb_return(fb);
  Serial.println(ok ? "Opplasting OK" : "Opplasting feilet");

  deepSleepMinutes(ok ? CAPTURE_INTERVAL_MIN : RETRY_MIN);
}

void loop() {
  // Tom — alt skjer i setup(), deretter deep sleep.
}
