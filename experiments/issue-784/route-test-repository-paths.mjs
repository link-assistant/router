// Routes cwd-relative repository reads in rust/tests through tests/support/repository.rs.
// Every replacement must match exactly the expected number of times or the script aborts.
import fs from 'node:fs';
const MOD = '#[path = "support/repository.rs"]\nmod repository;\n';
const edits = {
  'rust/tests/ci_regressions_test.rs': [
    ['use std::fs;\n', 'use std::fs;\n\n' + MOD, 1],
    ['    fs::read_to_string(path)\n', '    fs::read_to_string(repository::path(path))\n', 1],
    ['fs::read_dir("ui/dist/assets")', 'fs::read_dir(repository::path("ui/dist/assets"))', 1],
  ],
  'rust/tests/release_workflow_test.rs': [
    ['use std::fs;\n', 'use std::fs;\n\n' + MOD, 1],
    ['    fs::read_to_string(path)\n', '    fs::read_to_string(repository::path(path))\n', 1],
    [/fs::read_to_string\("([^"]+)"\)/g, 'fs::read_to_string(repository::path("$1"))', 15],
  ],
  'rust/tests/release_docker_test.rs': [
    ['use std::fs;\n', 'use std::fs;\n\n' + MOD, 1],
    ['    fs::read_to_string(path)\n', '    fs::read_to_string(repository::path(path))\n', 1],
  ],
  'rust/tests/release_packaging_test.rs': [
    ['    std::fs::read_to_string(path)\n', '    std::fs::read_to_string(repository::path(path))\n', 1],
  ],
  'rust/tests/release_gate_test.rs': [
    [/std::fs::read_to_string\("([^"]+)"\)/g, 'std::fs::read_to_string(repository::path("$1"))', 2],
  ],
  'rust/tests/ghcr_visibility_test.rs': [
    ['fs::read_to_string(".github/workflows/release.yml")', 'fs::read_to_string(repository::path(".github/workflows/release.yml"))', 1],
  ],
  'rust/tests/tunnel_test.rs': [
    ['.arg(ENTRYPOINT)', '.arg(repository::path(ENTRYPOINT))', 1],
  ],
  'rust/tests/integration_test.rs': [
    [/fs::read_to_string\("((?:docs|deploy)\/[^"]+)"\)/g, 'fs::read_to_string(super::repository::path("$1"))', 3],
  ],
};
for (const [file, list] of Object.entries(edits)) {
  let text = fs.readFileSync(file, 'utf8');
  for (const [from, to, count] of list) {
    const n = typeof from === 'string' ? text.split(from).length - 1 : (text.match(from) || []).length;
    if (n !== count) throw new Error(`${file}: ${from} matched ${n}, expected ${count}`);
    text = typeof from === 'string' ? text.split(from).join(to) : text.replace(from, to);
  }
  fs.writeFileSync(file, text);
  console.log('edited', file);
}
