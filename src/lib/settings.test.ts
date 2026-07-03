import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { strompris, settStrompris, ppfdMaks, settPpfdMaks } from './settings';
import { STROMPRIS_KR_KWH } from './energi';
import { ANTATT_PPFD_MAX } from './lys';

describe('settStrompris', () => {
  beforeEach(() => settStrompris(STROMPRIS_KR_KWH));

  it('godtar norsk komma-pris', () => {
    expect(settStrompris('2,25')).toBe(true);
    expect(get(strompris)).toBe(2.25);
  });

  it('godtar rene tall og punktum', () => {
    expect(settStrompris(1.8)).toBe(true);
    expect(get(strompris)).toBe(1.8);
    expect(settStrompris('0.99')).toBe(true);
    expect(get(strompris)).toBe(0.99);
  });

  it('runder til to desimaler', () => {
    settStrompris('1,239');
    expect(get(strompris)).toBe(1.24);
  });

  it('avviser søppel og urimelige verdier uten å endre prisen', () => {
    settStrompris('1,50');
    const foer = get(strompris);
    for (const ugyldig of ['abc', '', 0, -5, 99, NaN, Infinity]) {
      expect(settStrompris(ugyldig)).toBe(false);
    }
    expect(get(strompris)).toBe(foer);
  });

  it('godtar grenseverdiene (rett over 0 og opp til 20)', () => {
    expect(settStrompris(0.01)).toBe(true);
    expect(settStrompris(20)).toBe(true);
    expect(get(strompris)).toBe(20);
    expect(settStrompris(20.01)).toBe(false);
  });
});

describe('settPpfdMaks — DLI-kalibrering', () => {
  beforeEach(() => settPpfdMaks(ANTATT_PPFD_MAX));

  it('godtar en målt verdi (hele µmol, komma tåles)', () => {
    expect(settPpfdMaks('183')).toBe(true);
    expect(get(ppfdMaks)).toBe(183);
    expect(settPpfdMaks('412,7')).toBe(true);
    expect(get(ppfdMaks)).toBe(413); // rundes til hele µmol
  });

  it('avviser verdier som må være tastefeil, uten å endre kalibreringen', () => {
    const foer = get(ppfdMaks);
    for (const ugyldig of ['abc', '', 0, -50, 10, 1501, NaN, Infinity]) {
      expect(settPpfdMaks(ugyldig)).toBe(false);
    }
    expect(get(ppfdMaks)).toBe(foer);
  });

  it('godtar grenseverdiene (20 og 1500)', () => {
    expect(settPpfdMaks(20)).toBe(true);
    expect(settPpfdMaks(1500)).toBe(true);
    expect(get(ppfdMaks)).toBe(1500);
  });
});
