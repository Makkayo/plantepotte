# config.example.py — MAL for config.py.
# Kopier denne fila til `config.py` og fyll inn WiFi-navn og passord nederst.
# (config.py er gitignored slik at WiFi-passordet ditt ALDRI havner på GitHub.)
# Resten er ferdig utfylt for potte 1.
#
# (ANON_KEY er en offentlig "anon"-nøkkel — den er laget for å ligge i klient-
#  kode og er trygg å ha her. Den gir kun tilgang som RLS-policyene tillater.)

# ── Supabase (ferdig utfylt — ikke endre) ──
SUPABASE_URL = "https://ebjbxfwtwrahuokydvtj.supabase.co"
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImViamJ4Znd0d3JhaHVva3lkdnRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNDgxOTksImV4cCI6MjA4ODgyNDE5OX0.25yREg6vMLUPNoebopUX-TeMWlwKjtssRQLGa2BEQC0"

# ── Hvilken potte er dette? ──
POTTE_ID = "potte1"            # bytt til "potte2" på den andre ESP32-en

# ── Sensordata-frekvens ──
# Hvor ofte sensordata postes til Supabase, i sekunder. 300 = hvert 5. minutt.
# (Minutt-oppløsning trengs aldri for planter — endres her uten å røre main.py.
#  ESP32 leser fortsatt kommandoer hvert 5. sek, så lys-styring er like kjapp.)
POST_INTERVALL_SEK = 300

# ── Jordfuktsensorer ──
# Hvilke av de 4 sensor-plassene er faktisk koblet til? Plass 1-4 sitter på
# GPIO 34/35/32/33. Skriv bare numrene du har plugget inn — resten sendes som
# null (appen viser dem ikke). Eks: [1, 2] hvis du bare bruker to.
AKTIVE_JORDSENSORER = [1, 2, 3]

# ── Tidssone ──
# ESP32 henter UTC fra internett. Norge = UTC+2 om sommeren, UTC+1 om vinteren.
# ESP32 har ingen automatisk sommertid — endre dette tallet manuelt 2x i året.
TZ_OFFSET_HOURS = 2

# ── Standardverdier (brukes før første kommando er hentet, eller hvis nett er nede) ──
DEFAULT_INTENSITET = 70        # prosent
DEFAULT_TIMER_ON = "07:00"
DEFAULT_TIMER_OFF = "23:00"

# ── Vaktbikkje (watchdog) ──
# True  = ESP32 restarter seg selv automatisk hvis programmet henger i over
#         2 minutter (f.eks. et nettverkskall som aldri svarer). Skal være
#         True når potta står i drift uten PC tilkoblet.
# False = av. Bruk under utvikling i Thonny — en aktiv watchdog kan ikke skrus
#         av igjen, og restarter brettet midt i økta når du stopper programmet.
BRUK_WATCHDOG = False          # ⚠️ sett True når potta settes i drift!

# ─────────────────────────────────────────────────────────────────────
#  ↓↓↓  ENDRE DISSE TO  ↓↓↓   (kun 2,4 GHz-nett — ESP32 ser ikke 5 GHz)
# ─────────────────────────────────────────────────────────────────────
WIFI_SSID = "DITT-WIFI-NAVN"
WIFI_PASS = "DITT-WIFI-PASSORD"
