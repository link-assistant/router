// Shared plan for the issue #784 Cargo.lock advisory upgrades.
//
// Each entry names a crate whose locked version CI's `cargo audit` reported
// (ci-logs/569e641-audit.clean.log), the version it was locked at, the version
// it is moved to, and the lowest version RustSec lists as patched for every
// advisory reported against it. Targets were chosen from the crates.io sparse
// index as non-yanked releases inside the semver line every dependent already
// requires, whose non-dev dependency declarations are satisfied by packages
// already in Cargo.lock (see compare-index-deps.mjs).
export const upgrades = [
  { name: 'ctutils', from: '0.4.2', to: '0.4.8', fixed: '0.4.4', ids: ['RUSTSEC-2026-0385'] },
  {
    name: 'quinn-proto',
    from: '0.11.17',
    to: '0.11.19',
    fixed: '0.11.19',
    ids: ['RUSTSEC-2026-0343', 'RUSTSEC-2026-0340', 'RUSTSEC-2026-0338', 'RUSTSEC-2026-0524', 'RUSTSEC-2026-0523'],
  },
  { name: 'quinn-udp', from: '0.5.15', to: '0.5.16', fixed: '0.5.16', ids: ['RUSTSEC-2026-0538'] },
  {
    name: 'rustls',
    from: '0.23.45',
    to: '0.23.46',
    fixed: '0.23.46',
    ids: ['RUSTSEC-2026-0346', 'RUSTSEC-2026-0347', 'RUSTSEC-2026-0348', 'RUSTSEC-2026-0349'],
  },
  { name: 'rustls-webpki', from: '0.103.15', to: '0.103.17', fixed: '0.103.16', ids: ['RUSTSEC-2026-0382'] },
  { name: 'webpki-root-certs', from: '1.0.9', to: '1.0.12', fixed: '1.0.10', ids: ['RUSTSEC-2026-0383'] },
  { name: 'webpki-roots', from: '1.0.9', to: '1.0.12', fixed: '1.0.10', ids: ['RUSTSEC-2026-0381'] },
  { name: 'zstd', from: '0.14.0', to: '0.14.4', fixed: '0.14.3', ids: ['RUSTSEC-2026-0391'] },
  {
    name: 'zstd-safe',
    from: '8.0.0',
    to: '8.3.0',
    fixed: '8.2.0',
    ids: [
      'RUSTSEC-2026-0395', 'RUSTSEC-2026-0396', 'RUSTSEC-2026-0397', 'RUSTSEC-2026-0398',
      'RUSTSEC-2026-0399', 'RUSTSEC-2026-0400', 'RUSTSEC-2026-0401', 'RUSTSEC-2026-0402',
      'RUSTSEC-2026-0403', 'RUSTSEC-2026-0404', 'RUSTSEC-2026-0405', 'RUSTSEC-2026-0406',
    ],
  },
  { name: 'zstd-sys', from: '2.1.0+zstd.1.5.7', to: '2.1.3+zstd.1.5.7', fixed: '2.1.2', ids: ['RUSTSEC-2026-0410'] },
  { name: 'rustix', from: '1.1.4', to: '1.1.6', fixed: '1.1.6', ids: ['RUSTSEC-2026-0486'] },
  { name: 'tokio', from: '1.53.2', to: '1.53.3', fixed: '1.53.3', ids: ['RUSTSEC-2026-0386'] },
];

// Findings with no semver-compatible fix; accepted in .cargo/audit.toml.
export const ignored = [
  { name: 'crypto-bigint', version: '0.5.5', fixed: '0.7.6', ids: ['RUSTSEC-2026-0387'] },
];
