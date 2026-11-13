// Temporary manual translation policy requested by the maintainer:
// https://github.com/link-assistant/router/pull/785#issuecomment-6864697228
// These checks never grant strict parity. Once every active stage passes for
// the same SHA, Rust CI may verify the manually maintained router; Rust
// failures remain fatal. Local Rust tools stay forbidden (AGENTS.md).
export const MANUAL_WORKFLOW = 'javascript-manual-development.yml';
export const RUST_BLOCK = "needs.javascript.outputs.rust_allowed == 'true' && (";
export const MANUAL_STAGES = Object.freeze([
  ['lint', [
    'node scripts/sync-rust-assets.mjs --check',
    'node scripts/lint-js-first.mjs',
    'node --test scripts/test/manual-development.test.mjs',
    'node scripts/check-manual-development-workflows.mjs',
    'node --test tools/translation/test/matrix-trace-writer.test.mjs',
    'bun test tools/translation/test/matrix-trace-writer.test.mjs',
  ]],
  ['node-tests', ['npm run native:test --prefix js']],
  ['bun-tests', ['npm run native:test:bun --prefix js']],
  ['typescript', [
    'node scripts/run-node-tests.mjs --outer-timeout-ms=180000 scripts/test/node-case-deadlines.test.mjs',
    'npm run typecheck --prefix js',
    'npm run native:typecheck --prefix js',
    'node scripts/check-native-typescript.mjs',
    'node js/node_modules/typescript/bin/tsc -p tools/translation/tsconfig.json',
    'node scripts/build-js-first-ui.mjs',
  ]],
].map(([id, commands]) => Object.freeze([id, Object.freeze(commands)])));

export const SHA_VERIFIER = `node --input-type=module -e "
  import {execFileSync} from 'node:child_process';
  const expected = process.env.EXPECTED_SHA;
  if (!/^[a-f0-9]{40}$/.test(expected) || execFileSync('git', ['rev-parse', 'HEAD'], {encoding:'utf8'}).trim() !== expected) process.exit(1);
"`;

export const MANUAL_AGGREGATE = `node --input-type=module -e "
  import fs from 'node:fs';
  const stages = JSON.parse(process.env.STAGE_RESULTS);
  const required = ['lint', 'node-tests', 'bun-tests', 'typescript'];
  if (Object.keys(stages).length !== required.length || required.some(id => stages[id]?.result !== 'success')) {
    console.error('Manual development checks rejected:', process.env.STAGE_RESULTS);
    process.exit(1);
  }
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, 'rust_allowed=true\\n');
  console.log('Temporary manual development checks passed. Automated translation checks are suspended; strict parity is unverified. Same-SHA Rust CI may now run; its failures remain fatal.');
"`;

export const INSTALLS = Object.freeze({
  lint: ['npm ci --prefix scripts/ci --ignore-scripts', 'npm ci --prefix js --ignore-scripts'],
  'node-tests': ['npm ci --prefix js --ignore-scripts'],
  'bun-tests': ['npm ci --prefix js --ignore-scripts'],
  typescript: ['npm ci --prefix js --ignore-scripts', 'npm ci --prefix ui --ignore-scripts'],
});

export const MANUAL_OUTPUTS = Object.freeze({
  rust_allowed: {
    description: 'True only after every active manual development stage passed for this SHA; never strict parity',
    value: '${{ jobs.complete.outputs.rust_allowed }}',
  },
});

export function manualJobs() {
  const jobs = Object.fromEntries(MANUAL_STAGES.map(([id, commands]) => [id, {
    'runs-on': 'ubuntu-24.04',
    'timeout-minutes': id === 'typescript' ? 25 : 15,
    steps: [
      { uses: 'actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1', with: { ref: '${{ inputs.sha }}' } },
      { uses: 'actions/setup-node@820762786026740c76f36085b0efc47a31fe5020', with: { 'node-version': '20' } },
      ...(['lint', 'bun-tests', 'typescript'].includes(id) ? [{ uses: 'oven-sh/setup-bun@0c5077e51419868618aeaa5fe8019c62421857d6', with: { 'bun-version': '1.4.3' } }] : []),
      { name: 'Verify immutable source commit', env: { EXPECTED_SHA: '${{ inputs.sha }}' }, run: SHA_VERIFIER },
      ...[...INSTALLS[id], ...commands].map(run => ({ run })),
      ...(id === 'typescript' ? [{
        name: 'Preserve complete Node deadline audit and raw streams',
        if: '${{ always() }}',
        uses: 'actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a',
        with: { name: 'node-case-deadlines-${{ github.job }}-${{ inputs.sha }}',
          path: 'js/node_modules/.node-case-deadlines/', 'include-hidden-files': true,
          'if-no-files-found': 'error', 'retention-days': 7 },
      }] : []),
    ],
  }]));
  jobs.complete = {
    name: 'JavaScript fully green',
    'runs-on': 'ubuntu-24.04', 'timeout-minutes': 5,
    needs: MANUAL_STAGES.map(([id]) => id), if: '${{ always() }}',
    outputs: { rust_allowed: '${{ steps.admit.outputs.rust_allowed }}' },
    steps: [{ name: 'Require every active development stage; report suspended checks', id: 'admit',
      env: { STAGE_RESULTS: '${{ toJSON(needs) }}' }, run: MANUAL_AGGREGATE }],
  };
  return jobs;
}
