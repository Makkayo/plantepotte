# boot.py — kjører automatisk hver gang ESP32 starter, FØR main.py.
# Eneste jobb: koble til WiFi. main.py prøver videre hvis det ikke lykkes her.

import network
import time
from config import WIFI_SSID, WIFI_PASS

sta = network.WLAN(network.STA_IF)
sta.active(True)

if not sta.isconnected():
    print("WiFi: kobler til '%s' ..." % WIFI_SSID)
    sta.connect(WIFI_SSID, WIFI_PASS)
    for _ in range(40):                 # vent opptil 20 sekunder
        if sta.isconnected():
            break
        time.sleep(0.5)

if sta.isconnected():
    print("WiFi OK — IP:", sta.ifconfig()[0])
else:
    print("WiFi: ikke tilkoblet enda — main.py forsoker videre")
