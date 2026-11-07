// GC observations are diagnostic and never a timing or semantic qualification.
import assert from 'node:assert/strict';
import {serializeProgram} from '../../tools/translation/semantic-meta.mjs';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {loadDeriveDependencyProof} from '../../tools/translation/derive-dependencies.mjs';
const {translateProject}=await import(process.argv[2]);
const actualConfig=process.argv[4]==='actual-config';
assert.ok(process.argv[4]===undefined||actualConfig);
const entry=actualConfig?'rust/src/config.rs':'src/lib.rs';
const source=actualConfig?readFileSync(entry,'utf8'):'pub fn root(x:u8)->u8{child::add(x)} pub mod child {pub fn add(x:u8)->u8{x+1}} pub mod other {pub fn same(x:u8)->u8{x}}';
assert.ok(Buffer.byteLength(source)<=64*1024);
const cargo=actualConfig?{cargoManifest:readFileSync('rust/Cargo.toml','utf8'),cargoManifestPath:'rust/Cargo.toml'}:{};
if(actualConfig)cargo.deriveDependencies=loadDeriveDependencyProof({manifest:cargo.cargoManifest,lock:readFileSync('Cargo.lock','utf8')});
let retained,refs,callables;
function capture(){
 const readSource=()=>source,progress=()=>{};
 const result=translateProject({entry,paths:[entry],readSource,progress,...cargo});
 if(!actualConfig)assert.equal(result.meta.refused.length,0);
 refs={readSource:new WeakRef(readSource),progress:new WeakRef(progress),view:new WeakRef(result.sourceScopes[0].sourceView)};
 if(result.meta.deriveNamespaceFootprints)refs.deriveContext=new WeakRef(result.meta.deriveNamespaceFootprints);
 const facade=result.executableDeclarations.find(row=>row.qualifiedName===(actualConfig?'DEFAULT_MAX_PROXY_REQUEST_BYTES':'root'));
 assert.ok(facade);
 const sha=value=>createHash('sha256').update(value).digest('hex');
 callables={lowerName:facade.lower.name,checkedSourceName:facade.checkedSource.name,lowerLength:facade.lower.length,checkedSourceLength:facade.checkedSource.length,lowerSourceSha256:sha(Function.prototype.toString.call(facade.lower)),checkedSourceFunctionSha256:sha(Function.prototype.toString.call(facade.checkedSource))};
 assert.equal(callables.lowerName,'');assert.equal(callables.checkedSourceName,'checkedSource');assert.equal(callables.lowerLength,0);assert.equal(callables.checkedSourceLength,0);
 if(!actualConfig){
  const nested=result.executableDeclarations.find(row=>row.qualifiedName==='child.add'),first=nested.checkedSource();
  const child=result.meta.sources.find(row=>row.module.join('.')==='child'),other=result.meta.sources.find(row=>row.module.join('.')==='other');
  child.module.push('moved');const moved=nested.checkedSource();assert.deepEqual(moved.module,['child','moved']);assert.equal(moved.qualifiedName,first.qualifiedName);child.module.pop();
  other.module[0]='child';assert.throws(()=>nested.checkedSource(),/association differs/);other.module[0]='other';
  nested.span.start++;assert.throws(()=>nested.checkedSource(),/association differs/);nested.span.start--;
  assert.deepEqual(nested.checkedSource(),first);callables.pathObservationSha256=sha(JSON.stringify({first,moved}));
 }
 retained=process.argv[3]==='lower'?facade.lower:facade;
}
capture();
for(let round=0;round<8;round++){
 await new Promise(resolve=>setImmediate(resolve));globalThis.gc();
}
const lowered=typeof retained==='function'?retained():retained.lower(),wire=serializeProgram(lowered.program);
assert.equal(lowered.own.k,'fn');assert.equal(lowered.own.params.length,actualConfig?0:1);
const sha=value=>createHash('sha256').update(value).digest('hex');
let checkedSourceSha256=null;
if(typeof retained!=='function'&&!actualConfig){
 const first=retained.checkedSource(),second=retained.checkedSource();
 assert.notEqual(first,second);assert.deepEqual(first,second);assert.ok(Object.isFrozen(first.declaration));
 retained.span.start++;assert.throws(()=>retained.checkedSource(),/association differs/);retained.span.start--;
 checkedSourceSha256=sha(JSON.stringify(retained.checkedSource()));
}
if(typeof retained!=='function'&&actualConfig)assert.throws(()=>retained.checkedSource(),/association differs/);
console.log(JSON.stringify({scope:actualConfig?'One complete current config parent in a one-file diagnostic graph; no complete-library qualification.':'One complete finite original inline-module graph; no current production matrix qualification.',sourceSha256:sha(source),callables,alive:Object.fromEntries(Object.entries(refs).map(([name,ref])=>[name,!!ref.deref()])),programSha256:sha(wire),javascriptSha256:sha(lowered.emitted.text),checkedSourceSha256,heapUsed:process.memoryUsage().heapUsed}));
