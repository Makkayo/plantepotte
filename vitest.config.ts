/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { svelteTesting } from '@testing-library/svelte/vite';

/**
 * Egen test-config (vitest foretrekker denne over vite.config.ts) så
 * produksjons-build (vite.config.ts) forblir HELT urørt — ingen deploy-risiko.
 *
 * Lib-tester kjører i «node» (raskt). Komponent-tester setter selv
 * `// @vitest-environment jsdom` på toppen av fila, så bare de laster jsdom.
 */
export default defineConfig({
  plugins: [svelte(), svelteTesting()],
  test: {
    environment: 'node',
  },
});
