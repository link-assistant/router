import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ownershipCompiler} from '../js-to-rust/vendor/module-syntax.mjs';
import {originalDeriveAdditionalSourceClosure} from '../canonical-trial-source-closure.mjs';
import {isCanonicalTrialBaseSourcePath,discoverCanonicalTrialInputs} from '../prepare-builtin-canonical-trial.mjs';

const root=resolve('/original-derive-input'),entry='test/derive.mjs',head='1'.repeat(40);
function closure(sources,options={}){
 const rows=new Map(Object.entries(sources));
 return originalDeriveAdditionalSourceClosure({ts:ownershipCompiler(),root,entry,head,trackedRustPaths:[],inventory:[...rows.keys()],retained:[],readSource:path=>{assert.ok(rows.has(path),path);return rows.get(path);},...options});
}

test('native imports exports and literal reads retain complete helper sources while unrelated archives stay outside the closure',{timeout:60000},()=>{
 const sources={
  [entry]:"import './helper.mjs'; import '../compiler.mjs'; import {readFileSync as read} from 'node:fs'; read(new URL('./fixtures/original.bin',import.meta.url));",
  'test/helper.mjs':"export {original} from './other.mjs';",
  'test/other.mjs':'export const original=true;',
  'test/fixtures/original.bin':'original bytes',
  'test/fixtures/unrelated.tar.gz':'unrelated archive',
  'compiler.mjs':'complete compiler input',
 };
 const proof=closure(sources,{retained:['compiler.mjs']});
 assert.deepStrictEqual(proof.paths,['test/derive.mjs','test/fixtures/original.bin','test/helper.mjs','test/other.mjs']);assert.equal(proof.modules.length,3);assert.equal(proof.compilerInputsRetainedInFull,true);assert.equal(proof.compilerBoundaries.length,1);assert.equal(proof.compilerBoundaries[0].to,'compiler.mjs');assert.equal(proof.sourceAuthority,false);assert.equal(proof.runtimeAuthority,false);assert.deepStrictEqual(proof.uncertainDependencies,[]);
 for(const row of proof.modules)assert.equal(row.source,sources[row.path]);
 for(const row of proof.edges)assert.equal(sources[row.from].slice(...row.span),row.source);
 assert.deepStrictEqual(proof.reads[0].targets,['test/fixtures/original.bin']);assert.equal(sources[entry].slice(...proof.reads[0].span),proof.reads[0].source);
 const wire=JSON.parse(JSON.stringify(proof));assert.deepStrictEqual(wire,proof);wire.modules[0].source+='corruption';assert.notDeepStrictEqual(wire,proof);
});

test('original direct parameter call sites retain every dynamic path alternative',{timeout:60000},()=>{
 const proof=closure({[entry]:"import {readFileSync} from 'node:fs'; const capture=file=>readFileSync(new URL(file,import.meta.url)); for(const file of ['./a.txt','./b.txt'])capture(file); capture('./c.txt');",'test/a.txt':'a','test/b.txt':'b','test/c.txt':'c','test/unrelated.txt':'outside'});
 assert.deepStrictEqual(proof.reads[0].targets,['test/a.txt','test/b.txt','test/c.txt']);assert.equal(proof.paths.includes('test/unrelated.txt'),false);
});

test('unknown dynamic paths nonliteral imports and escaped file input aliases refuse instead of omitting inputs',{timeout:60000},()=>{
 for(const source of ["import {readFileSync} from 'node:fs'; readFileSync(process.env.INPUT);","import(process.env.MODULE);","import {readFileSync} from 'node:fs'; const alias=readFileSync; alias('./input');","import {readFileSync} from 'node:fs'; const capture=file=>readFileSync(file); const alias=capture; alias('./input');","import {readFileSync} from 'node:fs'; const capture=file=>{file='./changed'; return readFileSync(file);}; capture('./original');","import fs from 'node:fs'; fs.readFileSync('./input');","import {readFile} from 'node:fs/promises'; readFile('./input');","const fs=require('node:fs'); fs.readFileSync('./input');"]){assert.throws(()=>closure({[entry]:source}),/Original derive source closure:/);}
});

test('unknown missing and escaping literal dependencies refuse rather than silently shrinking the original closure',{timeout:60000},()=>{
 for(const source of ["import './missing.mjs';","import 'unregistered-package';","import {readFileSync} from 'node:fs'; readFileSync(new URL('../../outside',import.meta.url));"]){assert.throws(()=>closure({[entry]:source}),/Original derive source closure:/);}
});

test('Git input selection joins exact original HEAD and tracked Rust paths and rejects other commands or cwd',{timeout:60000},()=>{
 const source="import {execFileSync} from 'node:child_process'; const root='/original-derive-input'; execFileSync('git',['rev-parse','HEAD'],{cwd:root}); execFileSync('git',['ls-files','-z','--','*.rs'],{cwd:root}); execFileSync('git',['show','"+head+":src/lib.rs'],{cwd:root});";
 const proof=closure({[entry]:source,'src/lib.rs':'original Rust'},{trackedRustPaths:['src/lib.rs']});assert.equal(proof.processInputs.length,3);assert.deepStrictEqual(proof.processInputs[2].targets,['src/lib.rs']);
 for(const changed of [source.replace("['rev-parse','HEAD']","['status']"),source.replace("cwd:root","cwd:'/another-input'"),source.replace(head+':src/lib.rs','0'.repeat(40)+':src/lib.rs')])assert.throws(()=>closure({[entry]:changed,'src/lib.rs':'original Rust'}),/Original derive source closure:/);
});

test('actual discovery base retains complete compiler contracts Rust Cargo scripts and vendors without retaining every test archive',{timeout:60000},()=>{
 for(const path of ['rust/src/lib.rs','rust/Cargo.toml','Cargo.lock','scripts/run-node-tests.mjs','tools/translation/project.mjs','tools/translation/vendor/archive.bin','tools/translation/source-profiles/derive/original.crate','js/package-lock.json'])assert.equal(isCanonicalTrialBaseSourcePath(path),true,path);
 for(const path of ['tools/translation/test/derive-bang-context.test.mjs','tools/translation/test/fixtures/unrelated.tar.gz','tools/translation/js-to-rust/test/unexecuted.test.mjs','tools/translation/meta/large.json','tools/translation/projects/lib.meta.json'])assert.equal(isCanonicalTrialBaseSourcePath(path),false,path);
});

test('fresh actual trial vector retains the whole original derive test helper and resource closure and inventories all omissions as DATA',{timeout:60000},()=>{
 const actualRoot=fileURLToPath(new URL('../../../',import.meta.url)),vector=discoverCanonicalTrialInputs(actualRoot),proof=vector.sourceClosure,paths=new Set(vector.files.map(row=>row.path));
 assert.equal(proof.entry,'tools/translation/test/derive-bang-context.test.mjs');assert.equal(proof.head,vector.head);assert.equal(proof.compilerInputsRetainedInFull,true);assert.deepStrictEqual(proof.uncertainDependencies,[]);
 for(const path of ['tools/translation/test/derive-bang-context.test.mjs','tools/translation/test/original-csv-context.mjs','tools/translation/test/fixtures/repository-paths.mjs']){assert.ok(paths.has(path),path);assert.equal(proof.modules.find(row=>row.path===path).source,readFileSync(new URL('../../../'+path,import.meta.url),'utf8'));}
 assert.ok(proof.reads.some(row=>row.from==='tools/translation/test/original-csv-context.mjs'&&row.targets.some(path=>path.endsWith('.rs'))));assert.ok(proof.processInputs.some(row=>row.targets.some(path=>path.endsWith('.rs'))));
 assert.ok(vector.omitted.length>0);for(const row of vector.omitted){assert.equal(paths.has(row.path),false);assert.equal(row.compilerSourceInput,false);assert.equal(row.isolatedCompilerSourceInput,false);assert.equal(row.originalTestClosureInput,false);assert.equal(row.sourceAuthority,false);}
 assert.ok(vector.omitted.some(row=>row.path==='tools/translation/test/builtin-canonical-trial.test.mjs'));assert.ok(vector.totalBytes<=256*1024*1024);assert.equal(vector.sourceAuthority,false);assert.equal(vector.semanticAuthority,false);assert.equal(vector.runtimeAuthority,false);
});
