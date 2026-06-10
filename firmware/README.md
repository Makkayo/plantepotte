# Plantepotte — ESP32 firmware

Koden som kjører på hoved-ESP32-en i potta. Skrevet i **MicroPython** og
flashes med **Thonny**.

## Filer

| Fil | Hva | Lastes opp på ESP32? |
|-----|-----|:---:|
| `config.example.py` | **Mal** — kopier til `config.py` og fyll inn WiFi | ❌ (kun mal) |
| `config.py` | Innstillinger — **her endrer du WiFi-navn og passord**. Gitignored: WiFi-passordet ditt skal aldri til GitHub | ✅ |
| `boot.py` | Kobler til WiFi ved oppstart | ✅ |
| `main.py` | Selve programmet (sensorer, lys, Supabase, OLED, encoder) | ✅ |
| `logic.py` | Ren beslutningslogikk (lys-timer, dimming) — delt med testene | ✅ |
| `ssd1306.py` | Driver for OLED-skjermen | ✅ |
| `vl53l0x.py` | Driver for vann-laseren | ✅ |
| `test_logic.py` | Tester som kjøres på **PC-en**, ikke på ESP32 | ❌ (kun PC) |

## Slik tester du LOGIKKEN nå (uten hardware)

Du trenger ikke ESP32 for å sjekke at lys-timeren og dimmingen er riktig:

```bash
cd firmware
python test_logic.py
```

Alle testene skal si **PASS**. Dette tester nøyaktig de funksjonene `main.py`
bruker til å bestemme om lyset skal være på, tidssone-omregning og dimming.

For å teste **hardware-oppførsel** (skjerm, encoder, LED-dimming) i nettleseren:
bruk Wokwi-simulatoren i `../wokwi/` (egen, interaktiv).

## Slik flasher du på ESP32 (når den kommer)

1. Installer **Thonny** (thonny.org — allerede gjort).
2. Koble ESP32 til PC med USB-C (datakabel, ikke kun lading).
3. Thonny → *Tools → Options → Interpreter* → velg **MicroPython (ESP32)** og riktig COM-port.
4. Første gang: flash MicroPython-firmware på brettet (*Install or update MicroPython* i samme dialog).
5. **Lag `config.py`**: kopier `config.example.py` → `config.py`, og sett
   `WIFI_SSID` og `WIFI_PASS` (kun 2,4 GHz-nett). `config.py` er gitignored —
   passordet blir værende på din PC og ESP32, aldri på GitHub.
6. Last opp alle de 6 ✅-filene til ESP32 (Thonny: høyreklikk fil → *Upload to /*).
7. Trykk reset / kjør `main.py`. Konsollen skal vise WiFi-IP og «Ny kommando …».

## Hvordan det henger sammen

```
Web-app  ──skriver──►  Supabase  ◄──leser hvert 5s──  ESP32 (main.py)
(lysstyrke,            potte_commands                  └► styrer LED via MOSFET
 timer)                                                
ESP32  ──poster hvert 60s──►  potte_sensor_data  ──►  Web-app viser sensorer
(temp, fukt, jord×3, vann-mm)
```

- **Jordfukt og vann sendes som RÅ tall** (ADC 0–4095 / avstand i mm). Web-appen
  kalibrerer — så ESP32 skal *ikke* regne om til prosent.
- **KY-040:** vri = ±5 % lokalt, trykk = tilbake til appens verdi. En ny
  innstilling fra appen nullstiller lokal justering.
- **Lys-timer** støtter at av-tid er før på-tid (krysser midnatt).

## Viktige notater

- ⚠️ **`vl53l0x.py` må verifiseres mot ekte sensor.** Det er standard-driveren,
  men kan ikke testes uten laseren. Gir den rare verdier: bytt inn kanonisk
  driver (søk «micropython vl53l0x»). Firmwaren tåler at laseren feiler —
  `vann_avstand_mm` blir da `None` og resten virker.
- ⏰ **Riktig lys-timer krever internett-tid (NTP).** Uten WiFi ved oppstart vet
  ikke ESP32 klokka — firmwaren prøver da igjen så fort nettet er oppe, og
  re-synker uansett klokka én gang i døgnet (ESP32-klokka drifter ellers).
- 🐕 **Watchdog:** `BRUK_WATCHDOG = True` i `config.py` gjør at ESP32 restarter
  seg selv hvis programmet henger i over 2 min (f.eks. nettverkskall som aldri
  svarer). **Sett `True` når potta settes i drift** — men `False` mens du jobber
  i Thonny, ellers restarter brettet midt i økta (watchdog kan ikke skrus av
  når den først er startet).
- 🔌 Husk: still buck converter til **5,0 V** før ESP32 kobles til, og koble fra
  VIN før du programmerer via USB-C.
- 🌍 `TZ_OFFSET_HOURS` i `config.py`: 2 om sommeren, 1 om vinteren (endre 2× i året).
