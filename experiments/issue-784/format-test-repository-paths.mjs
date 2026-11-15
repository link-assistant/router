// Lays out the repository-path reads the way rustfmt (max_width 100) does and
// declares the shared resolver module where it is missing. Aborts on any miss.
import fs from 'node:fs';
const MOD = '#[path = "support/repository.rs"]\nmod repository;\n';
const sub = (file, from, to, count = 1) => {
  let text = fs.readFileSync(file, 'utf8');
  const n = text.split(from).length - 1;
  if (n !== count) throw new Error(`${file}: matched ${n}, expected ${count}: ${from}`);
  fs.writeFileSync(file, text.split(from).join(to));
};
const nextLine = (file, name, rhs, count = 1) =>
  sub(file, `    let ${name} = ${rhs}\n`, `    let ${name} =\n        ${rhs}\n`, count);
const W = 'rust/tests/release_workflow_test.rs';
nextLine(W, 'dockerfile', 'fs::read_to_string(repository::path("Dockerfile")).expect("Dockerfile should be readable");', 3);
nextLine(W, 'manifest', 'fs::read_to_string(repository::path("Cargo.toml")).expect("Cargo.toml should be readable");', 2);
nextLine(W, 'lockfile', 'fs::read_to_string(repository::path("Cargo.lock")).expect("Cargo.lock should be readable");');
nextLine(W, 'readme', 'fs::read_to_string(repository::path("README.md")).expect("README should be readable");', 2);
nextLine(W, 'manifest', 'fs::read_to_string(repository::path("Cargo.toml")).expect("manifest should be readable");');
const G = 'rust/tests/release_gate_test.rs';
nextLine(G, 'workflow', 'std::fs::read_to_string(repository::path(".github/workflows/docker-build.yml")).unwrap();');
sub(G, '//! Release publication must wait for all required artifacts (#687).\n\n',
  '//! Release publication must wait for all required artifacts (#687).\n\n' + MOD + '\n');
sub('rust/tests/release_packaging_test.rs', "//! repository's 1000-line limit.\n\n",
  "//! repository's 1000-line limit.\n\n" + MOD + '\n');
sub('rust/tests/ghcr_visibility_test.rs', 'use std::sync::atomic::{AtomicU64, Ordering};\n\n',
  'use std::sync::atomic::{AtomicU64, Ordering};\n\n' + MOD + '\n');
sub('rust/tests/tunnel_test.rs', 'use std::process::Command;\n\n', 'use std::process::Command;\n\n' + MOD + '\n');
const I = 'rust/tests/integration_test.rs';
sub(I, 'use link_assistant_router::token::{TOKEN_PREFIX, TokenManager};\n\n',
  'use link_assistant_router::token::{TOKEN_PREFIX, TokenManager};\n\n' + MOD + '\n');
sub(I, '        let docs = fs::read_to_string(super::repository::path("docs/forgefed.md")).expect("forgefed docs should exist");\n',
  '        let docs = fs::read_to_string(super::repository::path("docs/forgefed.md"))\n            .expect("forgefed docs should exist");\n');
sub(I, '        let sdl = fs::read_to_string(super::repository::path("deploy/akash/deploy.yaml")).expect("akash SDL should exist");\n',
  '        let sdl = fs::read_to_string(super::repository::path("deploy/akash/deploy.yaml"))\n            .expect("akash SDL should exist");\n');
sub(I, '        let manifest =\n            fs::read_to_string(super::repository::path("deploy/k8s/router.yaml")).expect("k8s manifest should exist");\n',
  '        let manifest = fs::read_to_string(super::repository::path("deploy/k8s/router.yaml"))\n            .expect("k8s manifest should exist");\n');
console.log('ok');
