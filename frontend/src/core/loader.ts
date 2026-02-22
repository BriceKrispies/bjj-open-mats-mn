/**
 * src/core/loader.ts
 *
 * Pure loading logic.  Takes a registry array and calls register() on each
 * module.  Does NOT import any module implementations directly — that is
 * the sole responsibility of src/registry.ts.
 */

import type { Module } from './module';
import { createModuleAPI } from './module';

export function loadModules(registry: readonly Module[]): void {
  for (const mod of registry) {
    const api = createModuleAPI();
    mod.register(api);
  }
}
