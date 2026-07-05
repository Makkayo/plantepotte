// @vitest-environment jsdom
/**
 * Lysvariant-systemet trenger ekte localStorage (per-variant PPFD skal
 * overleve bytter) — derfor jsdom, ikke node. Testene er sekvensielle med
 * delt modul-state, som i nettleseren.
 */
import { describe, it, expect } from 'vitest';
import { get } from 'svelte/store';
import {
  lysVariant,
  settLysVariant,
  ppfdMaks,
  settPpfdMaks,
  lysWatt,
  ppfdStandard,
  LYS_VARIANTER,
} from './settings';

describe('lysVariant — bytte mellom 12V-strip og 24V-barer', () => {
  it('starter på 12V-stripa (det som er montert) med variantens anslag', () => {
    expect(get(lysVariant)).toBe('strip12');
    expect(get(ppfdMaks)).toBe(LYS_VARIANTER.strip12.standardPpfd);
    expect(get(lysWatt)).toBe(LYS_VARIANTER.strip12.watt);
  });

  it('husker PPFD-kalibrering per variant gjennom et rundtur-bytte', () => {
    settPpfdMaks(35); // Photone-måling av stripa
    settLysVariant('bar24');
    // Ingen måling av barene ennå → variantens anslag, og watt/standard følger.
    expect(get(ppfdMaks)).toBe(LYS_VARIANTER.bar24.standardPpfd);
    expect(get(lysWatt)).toBe(LYS_VARIANTER.bar24.watt);
    expect(get(ppfdStandard)).toBe(LYS_VARIANTER.bar24.standardPpfd);

    settPpfdMaks(280); // Photone-måling av barene
    settLysVariant('strip12');
    expect(get(ppfdMaks)).toBe(35); // stripas måling bevart
    settLysVariant('bar24');
    expect(get(ppfdMaks)).toBe(280); // barenes måling bevart
  });

  it('persisterer valg og målinger så de overlever reload', () => {
    settLysVariant('bar24');
    settPpfdMaks(300);
    expect(localStorage.getItem('plantepotte:lysvariant')).toBe('bar24');
    expect(localStorage.getItem('plantepotte:ppfd:bar24')).toBe('300');
    // Stripas måling ligger urørt under den GAMLE nøkkelen — eksisterende
    // kalibrering fra før variant-systemet blir dermed med videre.
    expect(localStorage.getItem('plantepotte:ppfd')).toBe('35');
  });
});
