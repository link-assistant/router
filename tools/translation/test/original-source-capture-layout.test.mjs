import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';import {join} from 'node:path';
import {originalCsvContext} from './original-csv-context.mjs';
import {currentOriginalRustPaths} from './original-rust-census.mjs';
import {repositorySourcePath,repositoryWorkspaceManifestURL} from './fixtures/repository-paths.mjs';
const rootURL=new URL('../../../',import.meta.url),root=fileURLToPath(rootURL),hash=value=>createHash('sha256').update(value).digest('hex');
const physical=()=>execFileSync('git',['ls-files','-z','--','*.rs'],{cwd:root,encoding:'utf8',timeout:10000,maxBuffer:4*1024*1024}).split('\0').filter(Boolean);

test('the complete current Rust census keeps every physical row and every original logical path',{timeout:30000},()=>{
 const paths=currentOriginalRustPaths(rootURL),textPaths=currentOriginalRustPaths(root),original=physical();assert.deepEqual(paths,textPaths);assert.equal(paths.length,original.length);assert.equal(new Set(paths).size,paths.length);assert.ok(paths.includes('src/lib.rs'));assert.equal(paths.includes('rust/src/lib.rs'),false);
 assert.deepEqual(paths.map(path=>repositorySourcePath(path,root)).sort(),original.sort());
 const bytes=readFileSync(new URL('../fixtures/static-source-performance/original-rust-inputs.json',import.meta.url));assert.equal(hash(bytes),'dd3d5e25091c74e980a5529f33a6d5b311264e32769efce669a0e3efd6a1bff4');for(const row of JSON.parse(bytes).rustSources)assert.ok(paths.includes(row.path),row.path);
});

test('original source capture rejoins every complete Rust byte and all three physical Cargo inputs without translating',{timeout:30000},()=>{
 const context=originalCsvContext(),inputs=context.inputs,paths=physical(),rust=inputs.sources.filter(row=>row.source.endsWith('.rs'));assert.equal(rust.length,paths.length);assert.deepEqual(rust.map(row=>row.physicalSource).sort(),paths.sort());
 for(const row of inputs.sources){const raw=readFileSync(join(root,repositorySourcePath(row.physicalSource,root)));assert.equal(raw.length,row.bytes);assert.equal(hash(raw),row.sha256);assert.equal(context.source(row.source),raw.toString('utf8'));}
 assert.equal(inputs.entry,'src/lib.rs');assert.equal(context.source('Cargo.toml'),readFileSync(join(root,'rust/Cargo.toml'),'utf8'));assert.equal(context.source('Cargo.lock'),readFileSync(join(root,repositorySourcePath('Cargo.lock',root)),'utf8'));
 const workspace=inputs.workspaceManifest,raw=readFileSync(repositoryWorkspaceManifestURL(rootURL));assert.equal(workspace.source,'Cargo.toml');assert.equal(workspace.bytes,raw.length);assert.equal(workspace.sha256,hash(raw));assert.equal(workspace.content,raw.toString('utf8'));assert.notEqual(workspace.content,context.source('Cargo.toml'));
 assert.equal(inputs.originalBytes,inputs.sources.reduce((sum,row)=>sum+row.bytes,0)+workspace.bytes);assert.equal(typeof Object.getOwnPropertyDescriptor(context,'result').get,'function');assert.throws(()=>context.source('src/__absent_original__.rs'),/no captured tracked source/);
 assert.equal(context.source('src/lib.rs'),readFileSync(join(root,'rust/src/lib.rs'),'utf8'));
});
