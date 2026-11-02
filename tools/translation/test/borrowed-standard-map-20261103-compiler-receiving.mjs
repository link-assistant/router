// Explicit future receiving workload, never automatically executed in drafting.
// Uses the complete actual production Rust tree and original Cargo inputs.
import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {readFileSync} from 'node:fs';
import {compactSparseGit} from '../compact-sparse-git-io-20261102.mjs';
import {translateProjectBorrowedStandardMaps,translateProjectFlatBorrowedStandardMaps} from '../borrowed-standard-map-20261103-project.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {loadJsonMacroSourceProof} from '../json-macro-sources.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url));
test('complete actual stream-query caller survives both original serialized semantic routes',{timeout:60000},()=>{
 const paths=compactSparseGit(root,['ls-files','-z','--','rust/src'],{maxBytes:8388608}).split('\0').filter(Boolean),files=new Map(paths.map(path=>[path.slice('rust/'.length),readFileSync(join(root,path),'utf8')]));
 assert.ok(files.has('src/openai.rs'));assert.ok(files.has('src/borrowed_standard_map_20261102.rs'));assert.ok(files.size>500);
 const manifest=readFileSync(join(root,'rust/Cargo.toml'),'utf8'),lock=readFileSync(join(root,'Cargo.lock'),'utf8');
 const options={entry:'src/lib.rs',paths:[...files.keys()],readSource:path=>{if(!files.has(path))throw Error('Missing actual production source '+path);return files.get(path);},cargoManifest:manifest,jsonMacroDependencies:loadJsonMacroSourceProof({manifest,lock}),deriveDependencies:loadDeriveDependencyProof({manifest,lock}),compilationProfile:PRODUCTION_PROFILE};
 for(const translate of [translateProjectBorrowedStandardMaps,translateProjectFlatBorrowedStandardMaps]){
  const result=translate(options);assert.ok(result.meta.executable.some(row=>row.name==='query_stream_requested'||row.name==='openai.query_stream_requested'),JSON.stringify(result.meta.refused));
  assert.match(result.javascript,/router_borrowed_text_map_matches_literals/u);assert.match(result.typescript,/ReadonlyMap<string, string>/u);
 }
});
