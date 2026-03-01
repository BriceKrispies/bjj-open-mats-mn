#!/usr/bin/env node
// Checks that every src/modules/<name>/ has at least one *.pw.spec.ts file
// under tests/pw/modules/<name>/. Prints a report and exits 0 (warn-only).

import { readdirSync, existsSync, statSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const root = fileURLToPath(new URL('..', import.meta.url));

function isDir(p) {
  try { return statSync(p).isDirectory(); } catch { return false; }
}

function findPwSpecs(dir) {
  if (!existsSync(dir)) return [];
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (isDir(full)) {
      results.push(...findPwSpecs(full));
    } else if (entry.endsWith('.pw.spec.ts')) {
      results.push(full);
    }
  }
  return results;
}

const modulesDir = join(root, 'src', 'modules');
const testModulesDir = join(root, 'tests', 'pw', 'modules');

const modules = readdirSync(modulesDir)
  .filter(e => isDir(join(modulesDir, e)))
  .sort();

const missing = [];

console.log('\nPlaywright module coverage:');
for (const mod of modules) {
  const specs = findPwSpecs(join(testModulesDir, mod));
  if (specs.length > 0) {
    console.log(`  ✓ ${mod}`);
  } else {
    console.log(`  ✗ ${mod}   (missing tests)`);
    missing.push(mod);
  }
}

if (missing.length > 0) {
  console.log(`\nWARNING: ${missing.length} module(s) missing Playwright tests: ${missing.join(', ')}`);
  for (const mod of missing) {
    console.log(`  Create: tests/pw/modules/${mod}/${mod}.pw.spec.ts`);
  }
} else {
  console.log('\nAll modules have Playwright tests.');
}

// Always exit 0 — this is a warn-only check, never fails CI.
process.exit(0);
