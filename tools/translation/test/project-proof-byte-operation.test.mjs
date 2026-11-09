import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {repositorySourceURL} from './fixtures/repository-paths.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {translateProject,translateProjectOwnedDefinitions} from '../project.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';

const root=new URL('../../../',import.meta.url);
const manifest=readFileSync(repositorySourceURL('Cargo.toml',root),'utf8');
const lock=readFileSync(repositorySourceURL('Cargo.lock',root),'utf8');
const deriveDependencies=loadDeriveDependencyProof({manifest,lock});
const source='#[derive(Default,Clone)]pub struct Record{value:u8}pub fn value()->u8{7}';
const options={entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source,
 cargoManifest:manifest,deriveDependencies,compilationProfile:PRODUCTION_PROFILE};
const nestedOptions={entry:'src/lib.rs',paths:['src/lib.rs'],
 readSource:()=> 'pub fn nested(v:u8)->u8{v}'};

for(const [name,compile,phase]of [
 ['ordinary',translateProject,'complete-bindings'],
 ['owned definitions',translateProjectOwnedDefinitions,'enclosing-bindings'],
])test(name+' project byte operation closes after observer throws and nested translation',
 {timeout:60000},async()=>{
 const expected=compile(options),nestedExpected=translateProject(nestedOptions);
 const sentinel=new Error('original observer throw'),records=[];
 assert.throws(()=>compile({...options,progress:row=>{
  records.push(row);if(row.stage==='namespace'&&row.phase===phase)throw sentinel;
 }}),error=>error===sentinel);
 assert.equal(records.at(-1).phase,phase);
 assert.equal(records.some(row=>row.stage==='module-parse'),false);
 let entered=0,nested;
 const actual=compile({...options,progress:row=>{
  if(row.stage==='namespace'&&row.phase===phase){
   entered++;nested=translateProject(nestedOptions);
  }
 }});
 assert.equal(entered,1);assert.deepEqual(nested.meta,nestedExpected.meta);
 assert.equal(nested.javascript,nestedExpected.javascript);
 assert.equal(nested.typescript,nestedExpected.typescript);
 assert.deepEqual(actual.meta,expected.meta);
 assert.equal(actual.javascript,expected.javascript);
 assert.equal(actual.typescript,expected.typescript);
 assert.deepEqual(actual.sourceScopes,expected.sourceScopes);
 assert.equal(actual.meta.runtimeParity,false);
 await verifyTypedTargets(actual,api=>assert.equal(api.value(),7n),{childTimeoutMs:20000});
});
