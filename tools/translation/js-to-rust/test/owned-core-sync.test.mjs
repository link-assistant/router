import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,existsSync,rmSync,symlinkSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {buildOwnedCoreArtifacts,captureOwnedCoreCorpus} from '../owned-core-corpus.mjs';
import {ownedCoreRuntimeSources,createOwnedCoreSourceContext} from '../owned-core-source.mjs';
import {serializeOwnedCoreDocument} from '../owned-core-document.mjs';
import {encodeWord} from '../vendor/lino.mjs';
import {buildArtifacts,regenerate} from '../../../../scripts/regenerate-js-first.mjs';
import {synchronizationSteps} from '../../../../scripts/sync-router.mjs';
import {parseOwnedCoreMeta,emitRust} from '../translator.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE} from '../../router-core-source-data.mjs';
const root=fileURLToPath(new URL('../../../../',import.meta.url));
const limits={timeout:60000},base='packages/javascript/generated/rust-project',typed='packages/typescript/generated/rust-project';
const source='import {router_core_json_copy as copy} from "../runtime/json-update-runtime.mjs";\n/** @param {import("../runtime/json-macro-runtime.mjs").JsonValue} value */\nexport function copied(value){return copy(value);}\n';
function original(path){return existsSync(join(root,path))?readFileSync(join(root,path),'utf8'):execFileSync('git',['show','HEAD:'+path],{cwd:root,encoding:'utf8',timeout:30000,maxBuffer:16777216});}
function fixture(t){
 const directory=mkdtempSync(join(tmpdir(),'owned-sync-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));
 const write=(path,text)=>{mkdirSync(dirname(join(directory,path)),{recursive:true});writeFileSync(join(directory,path),text);};
 for(const row of ownedCoreRuntimeSources(base+'/runtime',typed+'/runtime'))write(row.path,row.source);
 write('src/lib.rs','pub mod translation_core;\n');write('src/translation_core.rs',ROUTER_FORMATTING_FACADE_SOURCE);write('src/translation_core/primitives.rs',ROUTER_CORE_PRIMITIVES_SOURCE);
 write('tests/translation_core_reverse_owned_oracle.rs',original('tests/translation_core_reverse_owned_oracle.rs'));
 write('Cargo.toml',original('Cargo.toml'));write('Cargo.lock',original('Cargo.lock'));write(base+'/src/lib.mjs',source);
 write('packages/javascript/portable/policy.mjs','/** @param {boolean} value @returns {boolean} */\nexport function identity(value){return value;}');
 write('parity/fixtures/js-first/policy.json',JSON.stringify({cases:[{id:'yes',function:'identity',args:[true],expected:true}]}));write('parity/fixtures/js-first/unsupported.json','[]');return {directory,write};
}
test('registered default regeneration discovers actual forward application paths',limits,t=>{
 const {directory}=fixture(t),draft=buildArtifacts(directory),manifest=JSON.parse(draft.get('parity/js-owned-core-reverse-draft.json'));
 assert.equal(manifest.discoveryRoot,base);assert.equal(manifest.totals.modules,1);assert.equal(manifest.totals.translatedItems,1);assert.equal(manifest.runtimeParity,false);
 assert.equal(manifest.profile,'router-owned-core-source-document-v1');assert.ok(draft.get('tools/translation/js-to-rust/generated/owned-core/src/lib.lino').startsWith('# GENERATED: owned-core source/checked Links.\n(owned-source-document '+encodeWord('{"profile":"router-owned-core-source-document-v1","context":')));
 assert.ok(draft.has('src/generated_js_first/policy.rs'));assert.ok(draft.has('tools/translation/js-to-rust/generated/owned-core-witness.rs'));assert.equal(manifest.witness.applicationItems,0);assert.ok(draft.has('tools/translation/js-to-rust/generated/owned-core/src/lib.lino'));
});
test('every explicit source and full refusal remains in the owned corpus inventory',limits,t=>{
 const {directory,write}=fixture(t);write(base+'/src/refused.mjs','export function rejected(value){return value.clone();}');
 const result=buildOwnedCoreArtifacts(directory),row=result.manifest.modules.find(row=>row.path.endsWith('refused.mjs'));
 assert.equal(row.sourceItems,1);assert.equal(row.translatedItems,0);assert.equal(row.unsupportedItems,1);assert.ok(row.diagnostics.length);
 const inputs=JSON.parse(result.artifacts.get('tools/translation/js-to-rust/generated/owned-core/inputs.json'));assert.equal(inputs.files.find(row=>row.path===base+'/src/refused.mjs').source,'export function rejected(value){return value.clone();}');
});
test('CST and serialized checked source meta reissue before both packaged targets',limits,async t=>{
 const {directory}=fixture(t),result=buildOwnedCoreArtifacts(directory),text=result.artifacts.get('tools/translation/js-to-rust/generated/owned-core/src/lib.lino'),meta=text.slice(text.indexOf('\n')+1),program=parseOwnedCoreMeta(meta);
 assert.equal(result.artifacts.get('tools/translation/js-to-rust/generated/owned-core/src/lib.rs.txt').split('\n').slice(1).join('\n'),emitRust(program));
 assert.throws(()=>parseOwnedCoreMeta(meta.replace('copied','forged')));assert.deepEqual(result.manifest.trace.map(row=>row.phase),['language','repository']);
 const witness=JSON.parse(result.artifacts.get('tools/translation/js-to-rust/generated/owned-core-witness-inputs.json'));assert.equal(witness.applicationItems,0);assert.equal(witness.stagedReceivingInputs.files.find(row=>row.path==='src/lib.rs').source,'pub mod translation_core;\n');assert.ok(witness.oracle.source.includes('reverse_generated::nested'));
 for(const [path,content]of result.artifacts){mkdirSync(dirname(join(directory,path)),{recursive:true});writeFileSync(join(directory,path),content);}
 const prefix='tools/translation/js-to-rust/generated/owned-core-witness',out=join(directory,'compiled');
 try{execFileSync(process.execPath,[join(root,'packages/javascript/node_modules/typescript/bin/tsc'),'--strict','--skipLibCheck','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--outDir',out,join(directory,prefix,'witness.mts')],{cwd:root,timeout:20000,stdio:'pipe'});}catch(error){assert.fail('strict actual witness TypeScript failed\n'+String(error.stdout??'')+'\n'+String(error.stderr??''));}
 mkdirSync(join(out,'runtime'),{recursive:true});for(const [path,content]of result.artifacts)if(path.startsWith(prefix+'/runtime/'))writeFileSync(join(out,'runtime',path.slice((prefix+'/runtime/').length)),content);
 const api=await import(pathToFileURL(join(out,'witness.mjs')).href);assert.deepEqual(api.copied(Object.freeze({$:'Null'})),{$:'Null'});assert.equal(api.nested(Object.freeze({$:'Null'})).$,'Object');
});
test('exclusive original source capture refuses linked leaves and ancestors',limits,t=>{
 const {directory,write}=fixture(t),external=join(directory,'external.mjs');write('external.mjs',source);symlinkSync(external,join(directory,base,'src/linked.mjs'));
 assert.throws(()=>captureOwnedCoreCorpus(directory),/linked/u);
});
test('captured runtime changes and actual source edits cannot reuse an old receiving verdict',limits,t=>{
 const {directory,write}=fixture(t),capture=captureOwnedCoreCorpus(directory);write(base+'/src/lib.mjs',source+'// changed\n');assert.throws(()=>capture.requireCurrent(),/complete input changed/u);
 write(base+'/runtime/json-update-runtime.mjs','export const router_core_json_copy = value=>value;');const draft=buildOwnedCoreArtifacts(directory);assert.equal(draft.manifest.totals.translatedItems,0);assert.ok(draft.manifest.diagnostics.some(row=>row.message.includes('runtime differs')));
});
test('old portable outputs and owned draft outputs participate in the same freshness check',limits,t=>{
 const {directory}=fixture(t);regenerate(directory,{check:false});assert.deepEqual(regenerate(directory,{check:true}).changed,[]);
 writeFileSync(join(directory,'tools/translation/js-to-rust/generated/owned-core/src/lib.rs.txt'),'// GENERATED: changed\n');assert.ok(regenerate(directory,{check:true}).changed.includes('tools/translation/js-to-rust/generated/owned-core/src/lib.rs.txt'));
 const steps=synchronizationSteps({root:directory,direction:'javascript-to-rust'});assert.ok(steps.some(row=>row.id==='javascript-meta-rust'));assert.ok(steps.every(row=>Number.isFinite(row.timeoutMs)));
 // Preserve the original drift assertions above, then repair that fixture's
 // target before independently exercising the fixed stale witness path.
 regenerate(directory,{check:false});
 const prefix='tools/translation/js-to-rust/generated/owned-core-witness',path=prefix+'.lino',absolute=join(directory,path),legacy=readFileSync(absolute,'utf8');
 const inputs=JSON.parse(readFileSync(join(directory,prefix+'-inputs.json'),'utf8')),context=createOwnedCoreSourceContext(inputs.stagedReceivingInputs);
 const document=serializeOwnedCoreDocument(parseOwnedCoreMeta(legacy,{context}),{context}),profile=encodeWord('router-owned-core-source-document-v1');
 assert.ok(document.startsWith('(owned-source-document '+encodeWord('{"profile":"router-owned-core-source-document-v1","context":')));assert.equal(document.split(profile).length,2);
 const oracle='tests/translation_core_reverse_owned_oracle.rs';assert.equal(readFileSync(join(directory,oracle),'utf8'),inputs.oracle.source);
 // The temporary oracle disappears. Remove its other temporary generated
 // files explicitly so this control isolates sibling .lino recognition.
 rmSync(join(directory,oracle));rmSync(join(directory,prefix),{recursive:true});rmSync(join(directory,prefix+'.rs'));rmSync(join(directory,prefix+'-inputs.json'));
 const unknownVersion=document.replace(profile,encodeWord('router-owned-core-source-document-v2'));
 for(const unknown of [unknownVersion,JSON.stringify({profile:'router-owned-core-source-document-v1',context:inputs.stagedReceivingInputs})]){
  writeFileSync(absolute,unknown);assert.throws(()=>regenerate(directory,{check:false}),/Unknown old owned witness output/u);assert.equal(readFileSync(absolute,'utf8'),unknown);
 }
 writeFileSync(absolute,document);assert.ok(regenerate(directory,{check:true}).changed.includes(path));assert.equal(readFileSync(absolute,'utf8'),document);
 assert.ok(regenerate(directory,{check:false}).changed.includes(path));assert.equal(existsSync(absolute),false);assert.deepEqual(regenerate(directory,{check:true}).changed,[]);
 writeFileSync(absolute,legacy);assert.ok(regenerate(directory,{check:false}).changed.includes(path));assert.equal(existsSync(absolute),false);
});
test('missing forward corpus is explicit unavailable input, never a successful coverage claim',limits,t=>{
 const directory=mkdtempSync(join(tmpdir(),'owned-empty-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));const result=buildOwnedCoreArtifacts(directory);
 assert.equal(result.manifest.sourceAvailable,false);assert.equal(result.manifest.totals.modules,0);assert.equal(result.manifest.wholeSourceSynchronization,false);assert.equal(result.manifest.rustExecuted,false);
});
test('complete current application inputs retain their independent real parent outcomes',limits,()=>{
 const result=buildOwnedCoreArtifacts(root),input=JSON.parse(result.artifacts.get('tools/translation/js-to-rust/generated/owned-core/inputs.json'));
 assert.equal(result.manifest.totals.sourceItems,result.manifest.totals.translatedItems+result.manifest.totals.unsupportedItems);
 for(const row of result.manifest.modules){assert.equal(input.files.find(input=>input.path===row.path).source,original(row.path));assert.equal(row.sourceItems,row.translatedItems+row.unsupportedItems);}
 assert.equal(result.manifest.runtimeParity,false);assert.equal(result.manifest.rustExecuted,false);
});
