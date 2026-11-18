import assert from 'node:assert/strict';
import test from 'node:test';
import { isKnownBuildOnlyAdvisory } from '../../scripts/check-admin-ui-audit.mjs';

const advisory = {
  name: 'picomatch',
  severity: 'high',
  url: 'https://github.com/advisories/GHSA-fc5q-39xc-vjpf',
};
const dependency = (name, via) => ({ name, severity: 'high', nodes: [`node_modules/${name}`], via });
const report = {
  auditReportVersion: 2,
  vulnerabilities: {
    picomatch: dependency('picomatch', [advisory]),
    fdir: dependency('fdir', ['picomatch']),
    tinyglobby: dependency('tinyglobby', ['fdir', 'picomatch']),
    vite: dependency('vite', ['tinyglobby', 'picomatch']),
    '@vitejs/plugin-react': dependency('@vitejs/plugin-react', ['vite']),
  },
};
const lock = {
  packages: Object.fromEntries(Object.keys(report.vulnerabilities).map(name => [
    `node_modules/${name}`, { dev: true },
  ])),
};
lock.packages['node_modules/picomatch'].version = '4.0.7';

test('allows only the known development chain for the advisory', () => {
  assert.equal(isKnownBuildOnlyAdvisory(report, lock), true);
  const runtime = structuredClone(lock);
  runtime.packages['node_modules/picomatch'].dev = false;
  assert.equal(isKnownBuildOnlyAdvisory(report, runtime), false);
  assert.equal(isKnownBuildOnlyAdvisory({ ...report, error: { code: 'E401' } }, lock), false);
});

test('keeps a second high advisory fatal on the same dependency or another one', () => {
  const changed = structuredClone(report);
  changed.vulnerabilities.picomatch.via.push({ ...advisory, url: 'https://github.com/advisories/another' });
  assert.equal(isKnownBuildOnlyAdvisory(changed, lock), false);
  const additional = structuredClone(report);
  additional.vulnerabilities.other = dependency('other', ['picomatch']);
  assert.equal(isKnownBuildOnlyAdvisory(additional, lock), false);
});
