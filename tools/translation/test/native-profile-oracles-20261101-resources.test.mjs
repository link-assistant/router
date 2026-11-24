// Independent source-only receiving/resource cases. UNRUN during bulk drafting.
// No fixture creates a repository, invokes Cargo, spawns, installs or writes.
import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeOracleRustResourceEdges, selectNativeOracleCompileResources}
  from '../native-profile-oracles-20261101-resources.mjs';

const options = {timeout: 60000};
const packageText = name => `[package]\nname="${name}"\nversion="0.0.0"\n`;
function fixture(extra = []) {
  return new Map([
    ['Cargo.toml', '[workspace]\nmembers=["rust"]\n'],
    ['Cargo.lock', '# independent complete lock fixture\n'],
    ['rust/Cargo.toml', packageText('root_native')],
    ['rust/src/lib.rs', 'pub fn original() {}\n'],
    ...extra,
  ]);
}
function select(sources) {
  const reads = [];
  const rows = [...sources.keys()].map(path => ({path, mode: '100644', oid: 'a'.repeat(40)}));
  const result = selectNativeOracleCompileResources(rows, path => {
    assert.ok(sources.has(path), 'never read an unselected or guessed resource: ' + path);
    reads.push(path);
    return sources.get(path);
  });
  assert.equal(new Set(result.paths).size, result.paths.length);
  assert.equal(result.sourceAuthority, false);
  assert.equal(result.semanticAuthority, false);
  assert.equal(result.unknownDynamicProducerSupported, false);
  return {result, reads};
}

test('inactive cfg sources, target-only dependencies and tracked Cargo config all remain selected', options, () => {
  const sources = fixture([
    ['rust/Cargo.toml', packageText('root_native') +
      '[target.\'cfg(windows)\'.dependencies.windows_helper]\npath="../windows-helper"\n'],
    ['rust/src/lib.rs', '#[cfg(any())] mod dormant;\npub fn original() {}\n'],
    ['rust/src/dormant.rs', 'const DATA:&str=include_str!("../fixtures/dormant.txt");\n'],
    ['rust/fixtures/dormant.txt', 'complete inactive-branch bytes'],
    ['windows-helper/Cargo.toml', packageText('windows_helper')],
    ['windows-helper/src/lib.rs', 'pub fn windows_only() {}\n'],
    ['.cargo/config.toml', '[build]\njobs=2\n'],
    ['.cargo/other-config-data', 'retained tracked config input'],
    ['unrelated-source-banks/large.txt', 'not a Cargo dependency'],
  ]);
  const {result, reads} = select(sources);
  for (const path of ['rust/src/dormant.rs', 'rust/fixtures/dormant.txt',
    'windows-helper/Cargo.toml', 'windows-helper/src/lib.rs', '.cargo/config.toml',
    '.cargo/other-config-data']) assert.ok(result.paths.includes(path), path);
  assert.ok(reads.includes('rust/src/dormant.rs'));
  assert.equal(result.paths.includes('unrelated-source-banks/large.txt'), false);
  assert.equal(result.allOriginalCfgBranchesScanned, true);
});

test('external declared test scope includes sibling module and compile-time bytes', options, () => {
  const sources = fixture([
    ['rust/Cargo.toml', packageText('root_native') +
      '[[test]]\nname="external_oracle"\npath="../external/oracle.rs"\n'],
    ['external/oracle.rs', 'mod sibling;\nconst BYTES:&[u8]=include_bytes!("payload.bin");\n'],
    ['external/sibling.rs', 'pub fn child() {}\n'],
    ['external/payload.bin', '\0complete\0payload'],
    ['external/deeper/another.rs', 'pub fn retained_whole_scope() {}\n'],
    ['other/oracle.rs', 'unrelated scope'],
  ]);
  const {result} = select(sources);
  for (const path of ['external/oracle.rs', 'external/sibling.rs',
    'external/payload.bin', 'external/deeper/another.rs']) assert.ok(result.paths.includes(path), path);
  assert.equal(result.paths.includes('other/oracle.rs'), false);
  sources.delete('external/payload.bin');
  assert.throws(() => select(sources), /untracked|absent/u);
});

test('the same included source resolves manifest-relative edges separately for each actual package', options, () => {
  const sources = fixture([
    ['Cargo.toml', '[workspace]\nmembers=["rust","second"]\n'],
    ['rust/src/lib.rs', 'include!("../../shared/oracle.rs");\n'],
    ['second/Cargo.toml', packageText('second')],
    ['second/src/lib.rs', 'include!("../../shared/oracle.rs");\n'],
    ['shared/oracle.rs', 'const TEXT:&str=include_str!(concat!(env!("CARGO_MANIFEST_DIR"),"/payload.txt"));\n'],
    ['rust/payload.txt', 'first package original bytes'],
    ['second/payload.txt', 'second package original bytes'],
  ]);
  const {result, reads} = select(sources);
  assert.ok(result.paths.includes('rust/payload.txt'));
  assert.ok(result.paths.includes('second/payload.txt'));
  assert.equal(reads.filter(path => path === 'shared/oracle.rs').length, 2);
  assert.equal(result.paths.filter(path => path === 'shared/oracle.rs').length, 1);
});

test('cyclic local Cargo dependencies retain each complete package without recursive duplication', options, () => {
  const sources = fixture([
    ['rust/Cargo.toml', packageText('root_native') + '[dependencies.second]\npath="../second"\n'],
    ['second/Cargo.toml', packageText('second') + '[dependencies.root_native]\npath="../rust"\n'],
    ['second/src/lib.rs', 'pub fn second() {}\n'],
  ]);
  const {result, reads} = select(sources);
  assert.deepEqual(new Set(result.manifests), new Set(['Cargo.toml', 'rust/Cargo.toml', 'second/Cargo.toml']));
  for (const path of result.manifests) assert.equal(reads.filter(name => name === path).length, 1);
  // This is complete resource DATA only: it never claims Cargo accepts a cycle.
  assert.equal(result.semanticAuthority, false);
});

test('literal paths ignore comment/string decoys and retain raw-string delimiters and Unicode', options, () => {
  const source = [
    'const DECOY:&str = "include_str!(\\\"missing.txt\\\")";',
    '/* include_bytes!("outside.bin") /* nested */ */',
    'include_str /* original trivia */ ! { r##"../fixtures/λ.txt"##, };',
    'include_bytes! [concat!(env!("CARGO_MANIFEST_DIR"), "/fixtures/bytes.bin"),];',
  ].join('\n');
  assert.deepEqual(nativeOracleRustResourceEdges(source, 'rust/src/lib.rs', 'rust'), [
    {path: 'rust/fixtures/λ.txt', kind: 'file', manifest: 'rust'},
    {path: 'rust/fixtures/bytes.bin', kind: 'file', manifest: 'rust'},
  ]);
});

test('malformed or unresolved resource producers fail before claiming a complete compile closure', options, () => {
  for (const source of [
    'include_str!(concat!());',
    'include_str!(concat!("prefix",env!("CARGO_MANIFEST_DIR")));',
    'include_str!(env!("NOT_A_PINNED_MANIFEST_INPUT"));',
    'include_str!("one" "two");',
    'include_str!(concat!("one",unknown()));',
    'include_str!("one"]);',
    'include_str!("one";',
    'include_str!("C:/outside");',
    'include_str!("../../../outside");',
    '#[derive(RustEmbed)] struct MissingFolder;',
    '#[derive(RustEmbed)] #[folder=dynamic()] struct UnknownFolder;',
  ]) assert.throws(() => nativeOracleRustResourceEdges(source, 'rust/src/lib.rs', 'rust'),
    undefined, source);
});

test('missing folder cohorts and unknown workspace globs stay explicit refusals', options, () => {
  const missingFolder = fixture([
    ['rust/src/lib.rs', '#[derive(RustEmbed)] #[folder="assets"] struct Assets;'],
  ]);
  assert.throws(() => select(missingFolder), /folder.*cohort/u);
  missingFolder.set('rust/assets/index.html', '<!doctype html>');
  assert.ok(select(missingFolder).result.paths.includes('rust/assets/index.html'));
  for (const member of ['packages/**', 'packages/[ab]', 'packages/{a,b}', 'missing-*']) {
    const sources = fixture([['Cargo.toml', `[workspace]\nmembers=["rust","${member}"]\n`]]);
    assert.throws(() => select(sources), /glob|tracked|absent/u, member);
  }
});
