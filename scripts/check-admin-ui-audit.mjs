import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const advisory = 'https://github.com/advisories/GHSA-fc5q-39xc-vjpf';
const dependencies = new Map([
  ['picomatch', []],
  ['fdir', ['picomatch']],
  ['tinyglobby', ['fdir', 'picomatch']],
  ['vite', ['tinyglobby', 'picomatch']],
  ['@vitejs/plugin-react', ['vite']],
]);

export function isKnownBuildOnlyAdvisory(report, lock) {
  const root = lock.packages?.['node_modules/picomatch'];
  if (report.error || report.auditReportVersion !== 2 || root?.version !== '4.0.7') return false;
  const entries = Object.entries(report.vulnerabilities ?? {});
  const blocking = new Map(entries.filter(([, value]) => ['high', 'critical'].includes(value.severity)));
  if (!blocking.has('picomatch')) return false;
  return [...blocking].every(([name, value]) => {
    const upstream = dependencies.get(name);
    const path = `node_modules/${name}`;
    if (!upstream || value.name !== name || value.severity !== 'high' ||
      lock.packages[path]?.dev !== true || value.nodes?.length !== 1 || value.nodes[0] !== path ||
      !Array.isArray(value.via) || !value.via.length) return false;
    if (name === 'picomatch') {
      return value.via.length === 1 && value.via[0]?.name === name &&
        value.via[0].severity === 'high' && value.via[0].url === advisory;
    }
    return value.via.every(cause => upstream.includes(cause) && blocking.has(cause));
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [reportPath, lockPath] = process.argv.slice(2);
  const report = JSON.parse(readFileSync(reportPath, 'utf8'));
  const lock = JSON.parse(readFileSync(lockPath, 'utf8'));
  if (!isKnownBuildOnlyAdvisory(report, lock)) {
    console.error('Admin UI audit failed. Review the full npm audit output.');
    process.exitCode = 1;
  } else {
    const message = `Admin UI build-only picomatch 4.0.7: ${advisory}. Update the lockfile to a patched release when available and remove the PR #794 exception.`;
    if (process.env.ROUTER_ALLOW_REVIEWED_UI_AUDIT === 'true') {
      console.log(`::warning::${message}`);
    } else {
      console.error(`::error::${message}`);
      process.exitCode = 1;
    }
  }
}
