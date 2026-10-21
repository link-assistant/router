import testCase from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,readdirSync,rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {gzipSync} from 'node:zlib';
import zlib from 'node:zlib';
import {Buffer as NativeBuffer} from 'node:buffer';
import {createHash} from 'node:crypto';
import {prepareNativeOutputTextRetention,deriveNativeOutputTextRetention,assertNativeOutputTextInputsFresh} from '../prepare-native-output-text-retention.mjs';
import {ownershipCompiler} from '../js-to-rust/vendor/module-syntax.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from '../concrete-syntax-meta.mjs';
import * as native from '../private-native-output-text.mjs';
import * as original from '../private-output-text.mjs';
import * as oldBulk from '../owned-field-bulk.mjs';
import * as oldRetained from '../retained-owned-field-bulk.mjs';
import * as nextBulk from '../native-retained-owned-field-bulk.mjs';
const test=(name,run)=>testCase(name,{timeout:60000},run),ROOT=fileURLToPath(new URL('../../../',import.meta.url)),P='tools/translation/';
const hash=value=>createHash('sha256').update(value).digest('hex');
function retain(name,value){const output=process.env.ROUTER_NATIVE_OUTPUT_TEXT_EVIDENCE_DIR;if(output){mkdirSync(output,{recursive:true});writeFileSync(join(output,name+'.json.gz'),gzipSync(Buffer.from(JSON.stringify(value)+'\n')),{flag:'wx'});}}
function temporary(t){const path=mkdtempSync(join(tmpdir(),'router-native-output-'));t.after(()=>rmSync(path,{recursive:true,force:true}));return path;}
function fixture(t){const root=temporary(t);mkdirSync(join(root,'src'));writeFileSync(join(root,'src/lib.rs'),'\ufeff// complete Ω😀\r\npub fn answer()->u8{7} pub fn blocked()->u8{unknown!(9)}\r\n');const env=Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('GIT_'))),fixed=['-c','core.hooksPath=/dev/null','-c','gc.auto=0','-c','maintenance.auto=false'];execFileSync('git',[...fixed,'init','--quiet'],{cwd:root,env,timeout:10000});execFileSync('git',[...fixed,'add','.'],{cwd:root,env,timeout:10000});return {root,sources:['src/lib.rs'],entries:['src/lib.rs']};}
function tree(root,base=''){return readdirSync(root,{withFileTypes:true}).filter(row=>row.name!=='.git').flatMap(row=>{const path=base+row.name,full=join(root,row.name);return row.isDirectory()?tree(full,path+'/'):[{path,base64:readFileSync(full).toString('base64')}];}).sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);}
// A separate test-only source copy exposes otherwise private malformed-input
// controls and can lower the budget. The installed default constant is retained
// in the complete before/CST/inverse evidence, and is never changed on disk.
async function exposed(t,budget){
 const before=readFileSync(join(ROOT,P+'private-native-output-text.mjs'),'utf8'),ts=ownershipCompiler(),file=ts.createSourceFile('fixture.mjs',before,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);assert.deepEqual(file.parseDiagnostics,[]);const edits=[];
 for(const node of file.statements.filter(ts.isImportDeclaration))if(node.moduleSpecifier.text.startsWith('.'))edits.push({span:[node.moduleSpecifier.getStart(file),node.moduleSpecifier.end],expected:node.moduleSpecifier.getText(file),replacement:JSON.stringify(pathToFileURL(resolve(ROOT,P,node.moduleSpecifier.text)).href)});
 if(budget!==undefined){const declarations=file.statements.filter(ts.isVariableStatement).flatMap(node=>[...node.declarationList.declarations]),rows=declarations.filter(node=>ts.isIdentifier(node.name)&&node.name.text==='PACKED_BUDGET');assert.equal(rows.length,1);assert.equal(rows[0].initializer.getText(file),'134217728');edits.push({span:[rows[0].initializer.getStart(file),rows[0].initializer.end],expected:'134217728',replacement:String(budget)});}
 edits.push({span:[before.length,before.length],expected:'',replacement:'\nexport {encode as fixtureEncode,decode as fixtureDecode};\n'});
 const start=transportConcreteSyntaxSource(before,{language:'JavaScript'}),changed=applyConcreteSyntaxSubstitutions(start.document,{languageRules:[],repositoryRules:[{id:'test-only:bounded-native-codec-probe',edits}]}),afterMeta=serializeConcreteSyntaxMeta(changed.value),after=transportConcreteSyntaxMeta(afterMeta).source;
 let delta=0;const inverseEdits=[];for(const row of edits.sort((a,b)=>a.span[0]-b.span[0])){inverseEdits.push({span:[row.span[0]+delta,row.span[0]+delta+row.replacement.length],expected:row.replacement,replacement:row.expected});delta+=row.replacement.length-row.expected.length;}
 const reversed=applyConcreteSyntaxSubstitutions(transportConcreteSyntaxMeta(afterMeta).document,{languageRules:[],repositoryRules:[{id:'test-only:bounded-native-codec-probe-inverse',edits:inverseEdits}]});assert.equal(transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(reversed.value)).source,before);
 const target=join(temporary(t),'probe.mjs');writeFileSync(target,after);return {module:await import(pathToFileURL(target)),evidence:{before,beforeMeta:start.meta,after,afterMeta,inverse:before,edits,budget,installedDefaultChanged:false}};
}

test('complete seven native source equations retain every original body and both complete CST inverses',async()=>{
 const plan=await prepareNativeOutputTextRetention({root:ROOT});assert.equal(plan.files.length,7);assert.equal(plan.prerequisites.ownedField.files.length,9);assert.equal(plan.originalAPIsUnchanged,true);assert.equal(plan.compressionObservationsEquivalent,false);assert.equal(plan.performanceQualified,false);
 for(const row of plan.files){assert.equal(row.current,row.after);assert.equal(row.afterSha256,hash(row.after));assert.equal(row.inverse,row.before);assert.equal(row.nativeBindings.nativeSemanticScopeChecked,true);assert.equal(row.nativeCopies.length,2);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);for(const stage of row.stages){assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);assert.equal(stage.inverse,stage.before);assert.equal(stage.completeInverse,true);}}
 const codec=plan.files[0],ts=ownershipCompiler(),parse=text=>ts.createSourceFile('retention.mjs',text,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),functions=file=>file.statements.filter(ts.isFunctionDeclaration);const before=parse(codec.before),after=parse(codec.after);
 for(const node of functions(before))if(!['encode','decode'].includes(node.name.text)){const rows=functions(after).filter(row=>row.name.text===node.name.text);assert.equal(rows.length,1);assert.equal(rows[0].getText(after),node.getText(before));}
 assert.ok(codec.after.includes('const CHUNK=65536,THRESHOLD=16384,PACKED_BUDGET=134217728;'));assert.equal(codec.stages[0].edits.length,2);assert.equal(assertNativeOutputTextInputsFresh(plan),true);for(const changed of [codec.before.replace('CHUNK=65536','CHUNK=65537'),codec.before.replace('PACKED_BUDGET=134217728','PACKED_BUDGET=134217729'),codec.before+'\nfunction encode(source,start,end) {}\n',codec.before.replace('function decode(packed,units)','function decode(packed,other)')])assert.throws(()=>deriveNativeOutputTextRetention(changed));retain('01-complete-native-source-plan',plan);
});

test('every UTF16 code unit lone surrogate and chunk boundary restores exactly',()=>{
 let all='';for(let code=0;code<=65535;code++)all+=String.fromCharCode(code);const values=[all,all+all,'\ud800\udfff\udc00\ud800'.repeat(40000),'\0\uffff😀é'.repeat(30000)],reports=[];
 for(const source of values){const storage=native.createPrivateOutputTextRetention(),cell=storage.retain(source),restored=storage.restore(cell);assert.equal(restored,source);assert.equal(restored.length,source.length);reports.push({source,restored,observation:storage.observation(cell)});}
 retain('02-complete-UTF16-vectors',reports);
});

test('large repeated JSON incompressible text thresholds and private copied cells keep exact strings',()=>{
 const storage=native.createPrivateOutputTextRetention(),legacy=original.createPrivateOutputTextRetention(),values=['x'.repeat(16383),'x'.repeat(16384),JSON.stringify({source:'Ω\ud800😀'.repeat(40000),array:Array.from({length:2000},(_,at)=>({at,value:'fixed'}))})];let state=7,incompressible='';for(let at=0;at<100000;at++){state=(Math.imul(state,1664525)+1013904223)>>>0;incompressible+=String.fromCharCode(state>>>16);}values.push(incompressible);const reports=[];
 for(const source of values){const cell=storage.retain(source),old=legacy.retain(source);assert.equal(storage.restore(cell),source);assert.equal(legacy.restore(old),source);const observed=storage.observation(cell);if(source.length<16384)assert.equal(observed.mode,'raw');reports.push({source,restored:storage.restore(cell),native:observed,legacy:legacy.observation(old)});if(observed.mode==='packed'){assert.throws(()=>storage.restore(Object.assign({},cell)),/Foreign retained/);assert.throws(()=>native.createPrivateOutputTextRetention().restore(cell),/Foreign retained/);}}
 assert.ok(reports.some(row=>row.native.mode==='packed'));assert.equal(reports.at(-1).native.mode,'raw');const map=native.createPrivateOutputTextMap();map.set('whole',values[2]);assert.equal(map.get('whole'),values[2]);assert.deepEqual([...map],[['whole',values[2]]]);assert.equal(map.delete('whole'),true);assert.equal(map.has('whole'),false);retain('03-complete-storage-vectors',reports);
});

test('explicit smaller-budget source fixture exercises nonrefundable fallback and bounded malformed decode',async t=>{
 const probe=await exposed(t,2048),storage=probe.module.createPrivateOutputTextRetention(),source='compressibleΩ'.repeat(4000),observations=[];for(let at=0;at<32;at++){const cell=storage.retain(source);assert.equal(storage.restore(cell),source);observations.push(storage.observation(cell));}assert.ok(observations.some(row=>row.mode==='packed'));assert.equal(observations.at(-1).mode,'raw');
 const packed=probe.module.fixtureEncode(source,0,source.length);assert.equal(probe.module.fixtureDecode(packed,source.length),source);
 for(const [value,units]of [[packed,source.length-1],[packed,source.length+1],[packed+'!',source.length],['%%%!',1],['',0],[packed,65537]])assert.throws(()=>probe.module.fixtureDecode(value,units));assert.throws(()=>probe.module.fixtureEncode(source,0,source.length+1));retain('04-bounded-domain-and-full-source-copy',{evidence:probe.evidence,source,packed,observations});
});

test('live native host mutations refuse without invoking replacements and private collections stay isolated',()=>{
 const source='guarded compressed Ω'.repeat(4000),storage=native.createPrivateOutputTextRetention(),cell=storage.retain(source),reports=[];
 for(const [owner,key]of [[zlib,'deflateRawSync'],[zlib,'inflateRawSync'],[NativeBuffer,'from'],[NativeBuffer.prototype,'toString']]){const descriptor=Object.getOwnPropertyDescriptor(owner,key);let called=0;try{Object.defineProperty(owner,key,{...descriptor,value(){called++;throw Error('unexpected native host hook');}});assert.throws(()=>key==='inflateRawSync'?storage.restore(cell):storage.retain(source),/host changed/);}finally{Object.defineProperty(owner,key,descriptor);}assert.equal(called,0);reports.push({key,called});}
 const deflate=Object.getOwnPropertyDescriptor(zlib,'deflateRawSync');let getters=0;try{Object.defineProperty(zlib,'deflateRawSync',{configurable:true,get(){getters++;throw Error('unproved accessor');}});assert.throws(()=>storage.retain(source),/host changed/);}finally{Object.defineProperty(zlib,'deflateRawSync',deflate);}assert.equal(getters,0);
 for(const [key,field]of [['Number','isSafeInteger'],['Math','ceil']]){const descriptor=Object.getOwnPropertyDescriptor(globalThis,key);let called=0;const poisoned=Object.create(null);Object.defineProperty(poisoned,field,{get(){called++;throw Error('unexpected replacement global hook');}});let another,restored;try{Object.defineProperty(globalThis,key,{...descriptor,value:poisoned});another=storage.retain(source);restored=storage.restore(another);}finally{Object.defineProperty(globalThis,key,descriptor);}assert.equal(called,0);assert.equal(restored,source);reports.push({global:key,called});}
 const map=Object.getOwnPropertyDescriptor(Map.prototype,'set'),weak=Object.getOwnPropertyDescriptor(WeakMap.prototype,'set');let observations=0;try{Object.defineProperty(Map.prototype,'set',{...map,value(){observations++;throw Error('public Map hook');}});Object.defineProperty(WeakMap.prototype,'set',{...weak,value(){observations++;throw Error('public WeakMap hook');}});const another=storage.retain(source);assert.equal(storage.restore(another),source);}finally{Object.defineProperty(Map.prototype,'set',map);Object.defineProperty(WeakMap.prototype,'set',weak);}assert.equal(observations,0);assert.equal(storage.restore(cell),source);retain('05-native-host-refusals',{reports,getters,observations,source});
});

test('ordinary retained and native full plans have identical implementation hashes every byte and original refusals',t=>{
 const options=fixture(t),reports=[];let expected,files;
 for(const [label,backend]of [['ordinary',oldBulk],['retained',oldRetained],['native',nextBulk]]){const plan=backend.planRegeneration(options);assert.deepEqual(backend.applyRegenerationPlan(plan).failures,[]);const bytes=tree(options.root);if(expected){assert.deepEqual(plan,expected);assert.deepEqual(bytes,files);}else{expected=plan;files=bytes;}assert.deepEqual(backend.applyRegenerationPlan(plan,{check:true}).failures,[]);const project=plan.manifest.projects[0],meta=JSON.parse(readFileSync(join(options.root,project.targets.meta),'utf8'));assert.ok(meta.refused.some(row=>row.name==='blocked'));assert.equal(project.executableFunctions,1);reports.push({label,plan,bytes});}retain('06-complete-same-root-plans-and-output-bytes',reports);
});

test('explicit canonical and isolated profile CLI preserve outputs write check and required option refusal',t=>{
 const options=fixture(t),old=join(ROOT,'scripts/translate-router-owned-field-meta.mjs'),next=join(ROOT,'scripts/translate-router-native-owned-field-meta.mjs'),env=Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('GIT_'))),reports=[];
 const run=(cli,args)=>JSON.parse(execFileSync(process.execPath,[cli,'--root',options.root,...args],{env,encoding:'utf8',timeout:20000,maxBuffer:8388608}));
 assert.throws(()=>run(next,[]));assert.throws(()=>run(next,['--retain-output-text','--owned-core-definitions']));
 for(const profile of [[],['--profile-matrix']]){const args=['--retain-output-text',...profile],before=run(old,args),bytes=tree(options.root),after=run(next,args);assert.deepEqual(after,before);assert.deepEqual(tree(options.root),bytes);const checked=run(next,[...args,'--check']);assert.deepEqual(checked,{...before,mode:'check'});reports.push({profile,before,after,checked,bytes});}retain('07-complete-canonical-and-profile-cli',reports);
});
