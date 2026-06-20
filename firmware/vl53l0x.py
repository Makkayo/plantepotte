# vl53l0x.py — MicroPython-driver for VL53L0X ToF-laser avstandssensor.
# Returnerer avstand i millimeter via .read().
#
# ✅ VERIFISERT mot ekte sensor 20. juni 2026 (i2c.scan viser 0x29, .read() gir stabil mm).
#
# ┌─────────────────────────────────────────────────────────────────────┐
# │  VERIFISER NAR HARDWARE KOMMER.                                       │
# │  Dette er standard community-driveren (ST sin init-sekvens). Den kan  │
# │  IKKE testes uten selve sensoren. Gir den rare/ustabile verdier, last │
# │  ned den kanoniske utgaven (sok "micropython vl53l0x" pa GitHub) og   │
# │  bytt ut denne fila. Firmwaren (main.py) taler at laseren mangler     │
# │  eller feiler — da blir vann_avstand_mm None og resten virker som for.│
# │  Sjekk forst med i2c.scan(): laseren skal dukke opp som 41 (0x29).    │
# └─────────────────────────────────────────────────────────────────────┘

import time

_IO_TIMEOUT = 1000

_SYSRANGE_START = 0x00
_SYSTEM_SEQUENCE_CONFIG = 0x01
_SYSTEM_INTERRUPT_CONFIG_GPIO = 0x0A
_SYSTEM_INTERRUPT_CLEAR = 0x0B
_RESULT_INTERRUPT_STATUS = 0x13
_RESULT_RANGE_STATUS = 0x14
_MSRC_CONFIG_CONTROL = 0x60
_FINAL_RANGE_CONFIG_MIN_COUNT_RATE_RTN_LIMIT = 0x44
_PRE_RANGE_CONFIG_VCSEL_PERIOD = 0x50
_FINAL_RANGE_CONFIG_VCSEL_PERIOD = 0x70
_GLOBAL_CONFIG_VCSEL_WIDTH = 0x32
_DYNAMIC_SPAD_NUM_REQUESTED_REF_SPAD = 0x4E
_DYNAMIC_SPAD_REF_EN_START_OFFSET = 0x4F
_GLOBAL_CONFIG_REF_EN_START_SELECT = 0xB6
_GLOBAL_CONFIG_SPAD_ENABLES_REF_0 = 0xB0
_SYSTEM_HISTOGRAM_BIN = 0x81
_HISTOGRAM_CONFIG_INITIAL_PHASE_SELECT = 0x33
_MSRC_CONFIG_TIMEOUT_MACROP = 0x46


class VL53L0X:
    def __init__(self, i2c, address=0x29):
        self.i2c = i2c
        self.address = address
        self._started = False
        self.init()

    # ── lavnivaa I2C ──
    def _reg8(self, reg, value=None):
        if value is None:
            return self.i2c.readfrom_mem(self.address, reg, 1)[0]
        self.i2c.writeto_mem(self.address, reg, bytes([value & 0xFF]))

    def _reg16(self, reg, value=None):
        if value is None:
            d = self.i2c.readfrom_mem(self.address, reg, 2)
            return (d[0] << 8) | d[1]
        self.i2c.writeto_mem(self.address, reg, bytes([(value >> 8) & 0xFF, value & 0xFF]))

    def _flush(self):
        self._reg8(0x83, self._reg8(0x83) | 0x04)
        self._reg8(0xFF, 0x01)
        self._reg8(0x00, 0x00)
        self._reg8(0x91, self._stop_variable)
        self._reg8(0x00, 0x01)
        self._reg8(0xFF, 0x00)
        self._reg8(0x83, self._reg8(0x83) & ~0x04)

    # ── init ──
    def init(self):
        # 2.8V mode
        self._reg8(0x89, self._reg8(0x89) | 0x01)
        # standard I2C mode
        self._reg8(0x88, 0x00)
        self._reg8(0x80, 0x01)
        self._reg8(0xFF, 0x01)
        self._reg8(0x00, 0x00)
        self._stop_variable = self._reg8(0x91)
        self._reg8(0x00, 0x01)
        self._reg8(0xFF, 0x00)
        self._reg8(0x80, 0x00)

        # disable SIGNAL_RATE_MSRC og SIGNAL_RATE_PRE_RANGE limit checks
        self._reg8(_MSRC_CONFIG_CONTROL, self._reg8(_MSRC_CONFIG_CONTROL) | 0x12)
        # set final range signal rate limit to 0.25 MCPS
        self._set_signal_rate_limit(0.25)
        self._reg8(_SYSTEM_SEQUENCE_CONFIG, 0xFF)

        spad_count, spad_is_aperture = self._spad_info()
        ref_spad_map = self.i2c.readfrom_mem(self.address, _GLOBAL_CONFIG_SPAD_ENABLES_REF_0, 6)

        self._reg8(0xFF, 0x01)
        self._reg8(_DYNAMIC_SPAD_REF_EN_START_OFFSET, 0x00)
        self._reg8(_DYNAMIC_SPAD_NUM_REQUESTED_REF_SPAD, 0x2C)
        self._reg8(0xFF, 0x00)
        self._reg8(_GLOBAL_CONFIG_REF_EN_START_SELECT, 0xB4)

        first_spad = 12 if spad_is_aperture else 0
        spads_enabled = 0
        new_map = bytearray(ref_spad_map)
        for i in range(48):
            if i < first_spad or spads_enabled == spad_count:
                new_map[i // 8] &= ~(1 << (i % 8))
            elif (ref_spad_map[i // 8] >> (i % 8)) & 0x1:
                spads_enabled += 1
        self.i2c.writeto_mem(self.address, _GLOBAL_CONFIG_SPAD_ENABLES_REF_0, bytes(new_map))

        # standard "magic" tuning-sekvens (fra ST sin referanse-API)
        for pair in (
            (0xFF, 0x01), (0x00, 0x00), (0xFF, 0x00), (0x09, 0x00), (0x10, 0x00),
            (0x11, 0x00), (0x24, 0x01), (0x25, 0xFF), (0x75, 0x00), (0xFF, 0x01),
            (0x4E, 0x2C), (0x48, 0x00), (0x30, 0x20), (0xFF, 0x00), (0x30, 0x09),
            (0x54, 0x00), (0x31, 0x04), (0x32, 0x03), (0x40, 0x83), (0x46, 0x25),
            (0x60, 0x00), (0x27, 0x00), (0x50, 0x06), (0x51, 0x00), (0x52, 0x96),
            (0x56, 0x08), (0x57, 0x30), (0x61, 0x00), (0x62, 0x00), (0x64, 0x00),
            (0x65, 0x00), (0x66, 0xA0), (0xFF, 0x01), (0x22, 0x32), (0x47, 0x14),
            (0x49, 0xFF), (0x4A, 0x00), (0xFF, 0x00), (0x7A, 0x0A), (0x7B, 0x00),
            (0x78, 0x21), (0xFF, 0x01), (0x23, 0x34), (0x42, 0x00), (0x44, 0xFF),
            (0x45, 0x26), (0x46, 0x05), (0x40, 0x40), (0x0E, 0x06), (0x20, 0x1A),
            (0x43, 0x40), (0xFF, 0x00), (0x34, 0x03), (0x35, 0x44), (0xFF, 0x01),
            (0x31, 0x04), (0x4B, 0x09), (0x4C, 0x05), (0x4D, 0x04), (0xFF, 0x00),
            (0x44, 0x00), (0x45, 0x20), (0x47, 0x08), (0x48, 0x28), (0x67, 0x00),
            (0x70, 0x04), (0x71, 0x01), (0x72, 0xFE), (0x76, 0x00), (0x77, 0x00),
            (0xFF, 0x01), (0x0D, 0x01), (0xFF, 0x00), (0x80, 0x01), (0x01, 0xF8),
            (0xFF, 0x01), (0x8E, 0x01), (0x00, 0x01), (0xFF, 0x00), (0x80, 0x00),
        ):
            self._reg8(pair[0], pair[1])

        # interrupt-konfig
        self._reg8(_SYSTEM_INTERRUPT_CONFIG_GPIO, 0x04)
        self._reg8(0x84, self._reg8(0x84) & ~0x10)
        self._reg8(_SYSTEM_INTERRUPT_CLEAR, 0x01)

        self._reg8(_SYSTEM_SEQUENCE_CONFIG, 0xE8)
        self._reg8(_SYSTEM_SEQUENCE_CONFIG, 0x01)
        self._calibrate(0x40)
        self._reg8(_SYSTEM_SEQUENCE_CONFIG, 0x02)
        self._calibrate(0x00)
        self._reg8(_SYSTEM_SEQUENCE_CONFIG, 0xE8)

    def _set_signal_rate_limit(self, mcps):
        val = int(mcps * (1 << 7))
        self._reg16(_FINAL_RANGE_CONFIG_MIN_COUNT_RATE_RTN_LIMIT, val)

    def _spad_info(self):
        self._reg8(0x80, 0x01)
        self._reg8(0xFF, 0x01)
        self._reg8(0x00, 0x00)
        self._reg8(0xFF, 0x06)
        self._reg8(0x83, self._reg8(0x83) | 0x04)
        self._reg8(0xFF, 0x07)
        self._reg8(0x81, 0x01)
        self._reg8(0x80, 0x01)
        self._reg8(0x94, 0x6B)
        self._reg8(0x83, 0x00)
        start = time.ticks_ms()
        while self._reg8(0x83) == 0x00:
            if time.ticks_diff(time.ticks_ms(), start) > _IO_TIMEOUT:
                raise OSError("VL53L0X SPAD-timeout")
        self._reg8(0x83, 0x01)
        tmp = self._reg8(0x92)
        count = tmp & 0x7F
        is_aperture = bool((tmp >> 7) & 0x01)
        self._reg8(0x81, 0x00)
        self._reg8(0xFF, 0x06)
        self._reg8(0x83, self._reg8(0x83) & ~0x04)
        self._reg8(0xFF, 0x01)
        self._reg8(0x00, 0x01)
        self._reg8(0xFF, 0x00)
        self._reg8(0x80, 0x00)
        return count, is_aperture

    def _calibrate(self, vhv_init_byte):
        self._reg8(_SYSRANGE_START, 0x01 | vhv_init_byte)
        start = time.ticks_ms()
        while (self._reg8(_RESULT_INTERRUPT_STATUS) & 0x07) == 0:
            if time.ticks_diff(time.ticks_ms(), start) > _IO_TIMEOUT:
                raise OSError("VL53L0X kalibrering-timeout")
        self._reg8(_SYSTEM_INTERRUPT_CLEAR, 0x01)
        self._reg8(_SYSRANGE_START, 0x00)

    # ── les avstand (enkelt-maling) ──
    def read(self):
        for pair in ((0x80, 0x01), (0xFF, 0x01), (0x00, 0x00)):
            self._reg8(pair[0], pair[1])
        self._reg8(0x91, self._stop_variable)
        for pair in ((0x00, 0x01), (0xFF, 0x00), (0x80, 0x00)):
            self._reg8(pair[0], pair[1])
        self._reg8(_SYSRANGE_START, 0x01)
        start = time.ticks_ms()
        while (self._reg8(_SYSRANGE_START) & 0x01):
            if time.ticks_diff(time.ticks_ms(), start) > _IO_TIMEOUT:
                raise OSError("VL53L0X start-timeout")
        start = time.ticks_ms()
        while (self._reg8(_RESULT_INTERRUPT_STATUS) & 0x07) == 0:
            if time.ticks_diff(time.ticks_ms(), start) > _IO_TIMEOUT:
                raise OSError("VL53L0X maling-timeout")
        distance = self._reg16(_RESULT_RANGE_STATUS + 10)
        self._reg8(_SYSTEM_INTERRUPT_CLEAR, 0x01)
        return distance
