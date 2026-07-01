import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { strompris, settStrompris } from './settings';
import { STROMPRIS_KR_KWH } from './energi';

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
