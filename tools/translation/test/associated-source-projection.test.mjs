// Data reachability controls. Full original compiler/typed workloads remain in
// their existing whole files and deadlines; this file does not prewarm them.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {writeJsonGzip} from '../../evidence/write-json-gzip.mjs';
import {associatedOriginalInputs,associatedOriginalParentInputs,associatedOriginalDependencyInputs} from './associated-original-context.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const retain=(name,value)=>{const directory=process.env.ROUTER_ASSOCIATED_PROJECTION_VECTOR_DIR;if(directory){mkdirSync(directory,{recursive:true});writeJsonGzip(join(directory,name+'.json.gz'),value);}};

test('the existing derive capture retains only its exact four parent strings and Cargo after full validation',{timeout:60_000},()=>{
 const projected=associatedOriginalParentInputs('derive-helper-originals.test.mjs');
 assert.deepEqual(Reflect.ownKeys(projected),['source']);assert.equal(Object.isFrozen(projected),true);assert.equal(typeof projected.source,'function');
 const rows=[
  ['src/provider_acceptance.rs',7237,'10691cf39c506c67bc415d28339ec96859f2304f813411e924b13b2cda9df1fa'],
  ['src/response_affinity.rs',16649,'e8aa97145a2df74e399c3c1bc648075f0b72266ed2def6dcc6e17291579dbf41'],
  ['src/bridge_selection.rs',8466,'b1b06bd11c9567e1b0110aad0b92c28dd9ec7111563e062c78f0bb6fba8af32a'],
  ['src/accounts.rs',35044,'d1856d49f32a559ca5c464a66a7da76c2354a2f3723cc53ccb141056f646baee'],
  ['Cargo.toml',5296,'328a6026c740f42468d0752d9cea4cb4930304b45c979b03d3f3db9ce658d476'],
  ['Cargo.lock',124800,'c1cb53b3b73c3a547d362c88c400d0a81457876f4c3e5537acb2fbd3e4aececa'],
 ];
 const actual=rows.map(([path,bytes,sha256])=>{const source=projected.source(path);assert.equal(typeof source,'string');assert.equal(Buffer.byteLength(source),bytes);assert.equal(hash(source),sha256);return {path,bytes,sha256,source};});
 assert.equal(actual.reduce((sum,row)=>sum+row.bytes,0),197492);
 const dependencies=associatedOriginalDependencyInputs(projected);assert.deepEqual(dependencies,{manifest:projected.source('Cargo.toml'),lock:projected.source('Cargo.lock')});
 for(const path of ['src/lib.rs','src/telegram.rs','../Cargo.toml','src/missing.rs'])assert.throws(()=>projected.source(path),/outside the projected original parents\/Cargo/u);
 for(const key of ['sourceCurrent','inputs','current','lineage','index','association'])assert.equal(Object.hasOwn(projected,key),false);
 retain('01-complete-selected-strings',{actual,dependencies,keys:Reflect.ownKeys(projected),scope:'Validated source strings only; no compiler verdict/private proof and no measured reclamation claim.'});
});

test('unknown or copied identities cannot return a projection and another fixed association keeps its narrow domain',{timeout:60_000},()=>{
 let reads=0;const copied=Object.create(null);Object.defineProperty(copied,'id',{get(){reads++;throw new Error('copied identity getter must not run');}});
 for(const id of ['unknown.test.mjs','derive-helper-originals.test.mjs:copy',copied])assert.throws(()=>associatedOriginalParentInputs(id),/unknown explicit outside association/u);assert.equal(reads,0);
 const id='bool-then-some.test.mjs',projected=associatedOriginalParentInputs(id),full=associatedOriginalInputs(id),source=projected.source('src/output_limit.rs');
 assert.equal(source,full.source('src/output_limit.rs'));assert.equal(hash(source),'b165be6e33444a5811b33e52567de74ca144e7208a24c161b231bd332cf899e0');
 for(const path of ['Cargo.toml','Cargo.lock'])assert.equal(projected.source(path),full.source(path));
 // The full independently validated universe still contains these sources;
 // the reduced capture deliberately exposes none outside the chosen parents.
 assert.equal(typeof full.source('src/stream_termination.rs'),'string');assert.throws(()=>projected.source('src/stream_termination.rs'),/outside the projected original parents\/Cargo/u);
 assert.deepEqual(Reflect.ownKeys(projected),['source']);assert.equal(Object.isFrozen(projected),true);
 retain('02-independent-full-source-comparison',{id,source,dependencies:associatedOriginalDependencyInputs(projected),inputs:full.inputs,keys:Reflect.ownKeys(projected),scope:full.scope});
});
