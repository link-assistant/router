import testCase from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {proposeCoreJsonUpdateCorpus} from '../migrate-core-json-updates.mjs';
import {proposeCoreJsonIndicesCorpus} from '../migrate-core-json-indices.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE} from '../router-core-source-data.mjs';
import {originalDeclarationHeader} from '../module-bindings.mjs';
import {sourceItems} from '../rust-structure.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {translateProject} from '../project.mjs';
import {loadJsonMacroSourceProof} from '../json-macro-sources.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {serde_json_from_str,serde_json_to_string} from '../extensions/json-runtime.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';

const C='crate::translation_core::',T=C+'Json',J=C+'json!';
const dependencyInputs={manifest:readFileSync(new URL('../../../rust/Cargo.toml',import.meta.url),'utf8'),lock:readFileSync(new URL('../../../Cargo.lock',import.meta.url),'utf8')};
const jsonMacroDependencies=loadJsonMacroSourceProof(dependencyInputs),deriveDependencies=loadDeriveDependencyProof(dependencyInputs);
let vectors=[];
const retain=(kind,value)=>{vectors.push({kind,value});return value;};
const test=(name,run)=>testCase(name,{timeout:60_000},async()=>{vectors=[];try{await run();}finally{const output=process.env.ROUTER_ADOPTION_VISIBILITY_VECTOR_DIR;if(output){mkdirSync(output,{recursive:true});writeFileSync(join(output,Buffer.from(name).toString('hex')+'.json'),JSON.stringify({name,vectors},(_key,value)=>typeof value==='bigint'?{$integer:String(value)}:value)+'\n');}}});
const files=(source,extra={})=>({'src/lib.rs':'pub mod translation_core;\n'+source,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,...extra});
const body=visibility=>`${visibility}fn payload()->${T}{let mut doc=${J}({});doc["x"]=${J}(true);doc}${visibility}fn pick(value:&${T})->${T}{${J}({"field":value["field"]})}`;
const count=result=>result.proposals.reduce((sum,row)=>sum+row.selections.length,0);
function inverse(row){
 assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,row.before.source);
 assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);
 let before=0,after=0,restored=row.after.source;
 for(const part of row.mapping){assert.equal(part.before[0],before);assert.equal(part.after[0],after);assert.equal(row.before.source.slice(...part.before),part.kind==='substitution'?part.expected:row.after.source.slice(...part.after));if(part.kind==='substitution')assert.equal(row.after.source.slice(...part.after),part.replacement);before=part.before[1];after=part.after[1];}
 assert.equal(before,row.before.source.length);assert.equal(after,row.after.source.length);
 for(const part of [...row.mapping].reverse())if(part.kind==='substitution')restored=restored.slice(0,part.after[0])+part.expected+restored.slice(part.after[1]);
 assert.equal(restored,row.before.source);
}
function migrate(input){
 const options={files:input,compilationProfile:PRODUCTION_PROFILE,dependencyInputs};
 const updates=proposeCoreJsonUpdateCorpus(options),indices=proposeCoreJsonIndicesCorpus({...options,files:updates.after});
 for(const result of [updates,indices]){assert.equal(result.executableAdmission,false);for(const row of result.proposals)inverse(row);}
 retain('complete-input-and-both-proposals',{input,updates,indices});return {updates,indices};
}
async function targets(input,prefix){
 const {updates,indices}=migrate(input);assert.equal(count(updates),1);assert.equal(count(indices),1);
 const result=retain('complete-checked-project',translateProject({entry:'src/lib.rs',paths:Object.keys(indices.after),readSource:path=>indices.after[path],jsonMacroDependencies,deriveDependencies,cargoManifest:dependencyInputs.manifest,compilationProfile:PRODUCTION_PROFILE}));
 for(const name of [prefix+'payload',prefix+'pick'])assert.ok(result.meta.executable.some(row=>row.name===name),name+': '+JSON.stringify(result.meta.refused));
 await verifyTypedTargets(result,api=>{const produced=serde_json_to_string(api[prefix+'payload']());assert.equal(produced.$,'Ok');assert.deepEqual(JSON.parse(produced.field0),{x:true});const input=serde_json_from_str('{"field":{"nested":[true]}}');assert.equal(input.$,'Ok');const read=serde_json_to_string(api[prefix+'pick'](input.field0));assert.equal(read.$,'Ok');assert.deepEqual(JSON.parse(read.field0),{field:{nested:[true]}});},{childTimeoutMs:20_000});
}

test('inline pub super declarations use their genuine containing module',async()=>{
 await targets(files('mod nested{'+body('pub(super) ')+'}'),'nested.');
});
test('physical child declarations retain parent visibility and typed behavior',async()=>{
 await targets(files('mod nested;',{'src/nested.rs':body('pub(super) ')}),'nested.');
});
test('nested explicit crate ancestor restrictions preserve complete substitutions',()=>{
 const input=files('mod outer{mod inner{'+body('pub(in crate::outer) ')+'}}'),{updates,indices}=migrate(input);assert.equal(count(updates),1);assert.equal(count(indices),1);assert.equal(indices.after['src/lib.rs'].split('pub(in crate::outer) ').length,3);
});
test('relative super and self restrictions keep separate nested declaration identities',()=>{
 for(const visibility of ['pub(in super) ','pub(self) ','pub(in self) ']){const {updates,indices}=migrate(files('mod outer{mod inner{'+body(visibility)+'}}'));assert.equal(count(updates),1,visibility);assert.equal(count(indices),1,visibility);assert.ok(indices.after['src/lib.rs'].includes(visibility+'fn payload'));}
});
test('crate public and private root headers preserve existing admission and idempotence',()=>{
 for(const visibility of ['pub(crate) ','pub ','']){const {updates,indices}=migrate(files(body(visibility)));assert.equal(count(updates),1);assert.equal(count(indices),1);const again=migrate(indices.after);assert.equal(count(again.updates),0);assert.equal(count(again.indices),0);assert.deepEqual(again.indices.after,indices.after);}
});
test('invalid root or unrelated visibility still fails the original ancestor check',()=>{
 const header=source=>sourceItems(source).find(item=>item.term==='fn');
 for(const [visibility,owner]of [['pub(super) ',[]],['pub(in crate::sibling) ',['outer']],['pub(in missing) ',['outer']]])assert.throws(()=>originalDeclarationHeader(header(visibility+'fn bad(){}'),owner),/visibility does not resolve to an ancestor module/);
 const valid=originalDeclarationHeader(header('pub(super) fn valid(){}'),['outer','inner']);assert.equal(valid.kind,'fn');assert.equal(valid.name,'valid');assert.equal(valid.namespaceAuthority,false);
});
test('complete actual restricted tool parent retains every original body and outcome',()=>{
 const source=readFileSync(new URL('../../../rust/src/bridge_request_tools.rs',import.meta.url),'utf8');assert.ok(source.includes('pub(super) fn translate_tools'));
 const input=files('mod captured;',{'src/captured.rs':source}),result=migrate(input);retain('complete-current-restricted-parent',{source,...result});
 for(const proposal of [result.updates,result.indices]){assert.equal(proposal.before['src/captured.rs'],source);for(const row of proposal.proposals)inverse(row);assert.equal(proposal.executableAdmission,false);}
});
test('cold standalone CLI completes both restricted module proposals with full packets',()=>{
 const directory=mkdtempSync(join(tmpdir(),'router-adoption-visibility-'));
 try{const root=join(directory,'receiving'),input=files('mod nested;',{'src/nested.rs':body('pub(super) ')});for(const [path,source]of Object.entries(input)){mkdirSync(dirname(join(root,path)),{recursive:true});writeFileSync(join(root,path),source);}writeFileSync(join(root,'Cargo.toml'),dependencyInputs.manifest);writeFileSync(join(root,'Cargo.lock'),dependencyInputs.lock);
  for(const sequence of ['json-updates','json-indices']){const output=join(directory,sequence),command=['tools/translation/propose-core-adoption-corpus.mjs','--root',root,'--output',output,'--sequence',sequence],child=spawnSync(process.execPath,command,{cwd:fileURLToPath(new URL('../../../',import.meta.url)),encoding:'utf8',timeout:20_000,maxBuffer:8*1024*1024});retain('complete-cold-cli',{sequence,command,status:child.status,signal:child.signal,stdout:child.stdout,stderr:child.stderr,error:child.error?.message});assert.equal(child.status,0,child.stderr);const index=JSON.parse(readFileSync(join(output,'index.json'),'utf8'));assert.equal(index.complete,true);assert.equal(index.sequence,sequence);assert.equal(index.stages[0].summary.selections,1);const packets=[];for(const packet of index.packets){const source=readFileSync(join(output,packet.path));assert.equal(source.length,packet.bytes);assert.equal(createHash('sha256').update(source).digest('hex'),packet.sha256);packets.push({path:packet.path,source:source.toString('utf8')});}retain('complete-cli-index-and-packets',{index,packets});}
 }finally{rmSync(directory,{recursive:true,force:true});}
});
