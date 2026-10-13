import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {reviewTranslationDraft,reviewGeneratedMethods,compareGeneratedMethods} from '../review-translation-draft.mjs';
import {translateProject} from '../../tools/translation/project.mjs';
import {loadDeriveDependencyProof} from '../../tools/translation/derive-dependencies.mjs';
import {PRODUCTION_PROFILE} from '../../tools/translation/cfg-profile.mjs';
import {sourceItems} from '../../tools/translation/rust-structure.mjs';
import {HostRustParser} from '../../tools/translation/extensions/host-contracts.mjs';
import {planRegeneration} from '../../tools/translation/bulk.mjs';
const root=new URL('../../',import.meta.url),manifest=readFileSync(new URL('Cargo.toml',root),'utf8'),lock=readFileSync(new URL('Cargo.lock',root),'utf8');
const dependencies=loadDeriveDependencyProof({manifest,lock}),hash=value=>createHash('sha256').update(value).digest('hex');
const source='#[derive(Default)] pub struct Payload{flag:bool,count:u32} pub fn make()->Payload{Payload::default()}';
const compiled=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source,cargoManifest:manifest,deriveDependencies:dependencies,compilationProfile:PRODUCTION_PROFILE});
const original=JSON.parse(JSON.stringify(compiled.meta));
const vectors={source,original,observations:[]};
const save=()=>{if(process.env.ROUTER_REVIEW_VECTORS)writeFileSync(process.env.ROUTER_REVIEW_VECTORS,JSON.stringify(vectors,null,2));};
function fixture(){return structuredClone(original);}
const row=meta=>({entry:'src/lib.rs',checkedGeneratedMethods:meta.checkedGeneratedMethods?.length??0});
const review=(meta,inventory=row(meta),text=source)=>reviewGeneratedMethods(meta,inventory,{readSource:()=>text,dependencies});
const entry=meta=>meta.checkedSemanticProgram.program.declarations.$map.find(([,value])=>value.impl?.defaultSourceProof)[1];
const target=meta=>meta.targetSemanticProgram.program.declarations.$map.find(([,value])=>value.impl?.defaultSourceProof)[1];
function failure(label,mutate,pattern){const meta=fixture();mutate(meta);let error;try{review(meta);}catch(thrown){error=thrown;}assert.ok(error,label);assert.match(error.message,pattern,label);vectors.observations.push({label,meta,error:error.message});save();}

test('generated Default integrity joins real compiler/source pins and both serialized bodies without original denominator gain',()=>{
  assert.deepEqual(original.checkedMethods,[]);assert.equal(original.executable.length,1);
  const rows=review(fixture());assert.equal(rows.length,1);assert.equal(rows[0].term,'generated-method');assert.equal(rows[0].name,'Payload.default');assert.equal(rows[0].originalDeclarationTerm,'struct');
  assert.equal(rows[0].semanticAuthority,false);assert.equal(rows[0].runtimeParity,false);assert.equal(rows[0].defaultSourceProof.checkedBody,false);assert.equal(rows[0].semanticBodyChecked,true);
  assert.equal(rows[0].itemSha256,hash(source.slice(rows[0].span.start,rows[0].span.end)));assert.match(rows[0].checkedBodySha256,/^[a-f0-9]{64}$/u);
  const body=entry(original).body;assert.equal(body.value.value,false);assert.equal(body.body.value.value,'0');assert.equal(body.body.body.k,'ctor');
  vectors.observations.push({label:'genuine-default',rows,originalFnCount:1,originalMethodCount:0,generatedCount:1});save();
});
test('missing legacy arrays normalize only to empty and malformed present arrays or counts fail',()=>{
  const legacy=fixture();delete legacy.checkedGeneratedMethods;legacy.checkedSemanticProgram.program.declarations.$map=[];legacy.checkedSemanticProgram.program.items=[];legacy.targetSemanticProgram.program.declarations.$map=[];legacy.targetSemanticProgram.program.items=[];
  assert.deepEqual(review(legacy,{entry:'src/lib.rs'}),[]);
  for(const value of [null,{},'methods',0]){const meta=fixture();meta.checkedGeneratedMethods=value;assert.throws(()=>review(meta,{entry:'src/lib.rs',checkedGeneratedMethods:0}),/Malformed generated/);}
  assert.throws(()=>review(fixture(),{entry:'src/lib.rs'}),/count mismatch/);
  for(const count of [-1,NaN,1.5,'1'])assert.throws(()=>review(fixture(),{entry:'src/lib.rs',checkedGeneratedMethods:count}),/count mismatch/);
  const absent=fixture();delete absent.checkedGeneratedMethods;assert.throws(()=>review(absent,{entry:'src/lib.rs'}),/semantic count/);
});
test('one-to-one declarations refuse duplicate orphan missing and original-count overlap metadata',()=>{
  failure('duplicate-row',meta=>meta.checkedGeneratedMethods.push(structuredClone(meta.checkedGeneratedMethods[0])),/semantic count|one-to-one/);
  failure('orphan-row',meta=>meta.checkedGeneratedMethods[0].span={start:1,end:40},/hash|struct|span/);
  failure('missing-checked-entry',meta=>{meta.checkedSemanticProgram.program.declarations.$map=meta.checkedSemanticProgram.program.declarations.$map.filter(([,item])=>!item.impl?.defaultSourceProof);},/semantic count/);
  failure('missing-target-entry',meta=>{meta.targetSemanticProgram.program.declarations.$map=meta.targetSemanticProgram.program.declarations.$map.filter(([,item])=>!item.impl?.defaultSourceProof);},/target missing/);
  failure('original-method-overlap',meta=>meta.checkedMethods.push({source:'src/lib.rs',name:'Payload.default',span:meta.checkedGeneratedMethods[0].span}),/overlaps original/);
  failure('original-fn-overlap',meta=>meta.executable.push({source:'src/lib.rs',term:'fn',name:'default',span:meta.checkedGeneratedMethods[0].span}),/overlaps original/);
});
test('source span hashes generator identity and authority limitations cannot be forged',()=>{
  for(const [key,value]of [['term','method'],['origin','source-fn'],['originalDeclarationTerm','fn'],['generator','custom::Default'],['receiver','value'],['semanticBodyChecked',false],['runtimeParity',true],['semanticAuthority',true]])failure('classification-'+key,meta=>meta.checkedGeneratedMethods[0][key]=value,/classification/);
  failure('source-hash',meta=>meta.checkedGeneratedMethods[0].defaultSourceProof.sourceSha256='a'.repeat(64),/hash/);
  failure('item-hash',meta=>meta.checkedGeneratedMethods[0].defaultSourceProof.itemSha256='b'.repeat(64),/hash/);
  failure('proof-span',meta=>meta.checkedGeneratedMethods[0].defaultSourceProof.span.end--,/span/);
  for(const key of ['checkedBody','wholeCompilerExecuted','wholeTraitTranslated','runtimeParity'])failure('source-authority-'+key,meta=>meta.checkedGeneratedMethods[0].defaultSourceProof[key]=true,/authority/);
  assert.throws(()=>review(fixture(),row(original),source+' '),/hash/);
});
test('genuine standard recipe and primitive bodies reject mirrored proof or semantic mutations',()=>{
  for(const key of ['originalOutputDigest','originalCompilerPlanDigest'])failure('compiler-'+key,meta=>{for(const proof of [meta.checkedGeneratedMethods[0].defaultSourceProof,entry(meta).impl.defaultSourceProof,target(meta).impl.defaultSourceProof])proof[key]='c'.repeat(64);},/compiler plan/);
  failure('mirrored-primitive-body',meta=>{for(const proof of [meta.checkedGeneratedMethods[0].defaultSourceProof,entry(meta).impl.defaultSourceProof,target(meta).impl.defaultSourceProof])proof.fields[0].originalBody.value=true;},/primitive original body/);
  failure('mirrored-standard-selection',meta=>{for(const proof of [meta.checkedGeneratedMethods[0].defaultSourceProof,entry(meta).impl.defaultSourceProof,target(meta).impl.defaultSourceProof])proof.fields[0].selection.method.bodySource='{true}';},/standard primitive selection/);
  failure('mirrored-checked-body',meta=>{entry(meta).body.value.value=true;target(meta).body.value.value=true;},/original primitive body/);
  failure('wrong-field-binding',meta=>{entry(meta).body.body.body.args[0].name='wrong';},/field binding/);
});
test('canonical semantic documents signatures and exact flattened mapping remain independently checked',()=>{
  failure('duplicate-map-link',meta=>meta.checkedSemanticProgram.program.declarations.$map.push(meta.checkedSemanticProgram.program.declarations.$map[0]),/duplicate checked/);
  failure('wrong-language',meta=>meta.checkedSemanticProgram.program.sourceLanguage='JavaScript',/invalid checked/);
  failure('wrong-signature',meta=>entry(meta).params.push({name:'value',type:{kind:'bool'}}),/signature/);
  failure('wrong-nominal',meta=>entry(meta).ret.name='Other',/signature/);
  failure('target-body',meta=>target(meta).body.value.value=true,/flattened body/);
  failure('target-signature',meta=>target(meta).ret.name='Other',/flattened signature/);
  failure('wrong-source-symbol',meta=>entry(meta).name='forged',/symbol/);
  failure('wrong-return-loan',meta=>entry(meta).ret.rustReference={kind:'shared'},/ownership/);
  failure('wrong-source-layout',meta=>{const data=meta.checkedSemanticProgram.program.declarations.$map.find(([name])=>name==='Payload')[1];data.ctors[0].fields[0].type={kind:'fixed',bits:32,signed:false,rustPrimitiveName:'u32'};entry(meta).body.value.type={kind:'fixed',bits:32,signed:false,rustPrimitiveName:'u32'};},/source field type/);
  failure('target-proof',meta=>target(meta).impl.defaultSourceProof.contextDigest='d'.repeat(64),/flattened proof/);
});
test('generated comparisons keep source identities separate and report byte-changed bodies without semantic claims',()=>{
  const before=review(fixture()),meta=fixture(),checked=entry(meta),flattened=target(meta);checked.body.name='changed_local';checked.body.body.body.args[0].name='changed_local';flattened.body.name='changed_local';flattened.body.body.body.args[0].name='changed_local';
  const after=review(meta),comparison=compareGeneratedMethods(before,after);
  assert.equal(comparison.newlyCheckedGeneratedMethods.length,0);assert.equal(comparison.lostCheckedGeneratedMethods.length,0);assert.equal(comparison.changedGeneratedMethodBodies.length,1);
  assert.equal(compareGeneratedMethods([],after).newlyCheckedGeneratedMethods.length,1);assert.equal(compareGeneratedMethods(before,[]).lostCheckedGeneratedMethods.length,1);
  vectors.observations.push({label:'changed-body-comparison',before,after,comparison});save();
});
function projectRow(meta,count){return {entry:'src/lib.rs',sources:meta.sources.length,refused:meta.refused.length,unloweredItems:meta.unloweredItems.length,checkedMethods:meta.checkedMethods.length,checkedGeneratedMethods:count,moduleDiagnostics:meta.moduleDiagnostics.length,executableFunctions:meta.executable.filter(item=>item.term==='fn').length,executableConstants:0,targets:{meta:'tools/translation/projects/src/lib.meta.json',javascript:'packages/javascript/generated/rust-project/src/lib.mjs',typescript:'packages/typescript/generated/rust-project/src/lib.ts'}};}
function repository(meta,{legacy=false}={}){
  const directory=mkdtempSync(join(tmpdir(),'router-generated-review-'));
  const write=(name,value)=>{const path=join(directory,name);mkdirSync(dirname(path),{recursive:true});writeFileSync(path,value);};
  write('src/lib.rs',source);write('Cargo.toml',manifest);write('Cargo.lock',lock);write('compiler.mjs','// bounded compiler input fixture\n');
  const install=current=>{
    const items=sourceItems(source).filter(item=>!item.comment).map(item=>({term:item.term,name:item.name,span:{start:item.start,end:item.end},source:source.slice(item.start,item.end),sha256:hash(source.slice(item.start,item.end)),status:item.term==='fn'&&current.executable.length?'executable':'carried'}));
    const counts={executable:items.filter(item=>item.status==='executable').length,carried:items.filter(item=>item.status==='carried').length,preserved:0};
    const targets={meta:'tools/translation/meta/src/lib.meta.json',javascript:'packages/javascript/generated/rust-draft/src/lib.mjs',typescript:'packages/typescript/generated/rust-draft/src/lib.ts'};
    write(targets.meta,JSON.stringify({sourcePath:'src/lib.rs',sourceBytes:Buffer.byteLength(source),sourceSha256:hash(source),items,counts}));write(targets.javascript,'export {};\n');write(targets.typescript,'export {};\n');
    const project=projectRow(current,current.checkedGeneratedMethods?.length??0);if(legacy)delete project.checkedGeneratedMethods;
    write(project.targets.meta,JSON.stringify(current));write(project.targets.javascript,'export {};\n');write(project.targets.typescript,'export {};\n');
    write('parity/rust-source-inventory.json',JSON.stringify({sources:[{source:'src/lib.rs',sha256:hash(source),bytes:Buffer.byteLength(source),...counts,targets}],projects:[project],totals:{sources:1,...counts},implementationHashes:{'compiler.mjs':hash('// bounded compiler input fixture\n')},functionCoverage:{all:{topLevelFunctions:1},production:{topLevelFunctions:1}},runtimeParity:false}));
  };
  install(meta);const git=args=>execFileSync('git',args,{cwd:directory,encoding:'utf8',timeout:10000,env:{...process.env,GIT_AUTHOR_NAME:'Router fixture',GIT_AUTHOR_EMAIL:'fixture@example.invalid',GIT_COMMITTER_NAME:'Router fixture',GIT_COMMITTER_EMAIL:'fixture@example.invalid'}});
  git(['init','-q']);git(['add','.']);git(['-c','core.hooksPath=/dev/null','commit','-qm','bounded fixture']);
  return {directory,write,install,git,cleanup:()=>rmSync(directory,{recursive:true,force:true})};
}
test('complete bounded inventory review reports generated gains separately from original source function counts',{timeout:60000},()=>{
  const legacy=fixture();delete legacy.checkedGeneratedMethods;legacy.executable=[];
  for(const key of ['checkedSemanticProgram','targetSemanticProgram']){legacy[key].program.declarations.$map=[];legacy[key].program.items=[];}
  const repo=repository(legacy,{legacy:true});
  try{const baseline=repo.git(['rev-parse','HEAD']).trim();repo.install(fixture());const inventory=JSON.parse(readFileSync(join(repo.directory,'parity/rust-source-inventory.json')));inventory.projects[0].checkedGeneratedMethods=1;repo.write('parity/rust-source-inventory.json',JSON.stringify(inventory));const report=reviewTranslationDraft({root:repo.directory,baselineSha:baseline});
    assert.equal(report.projects[0].checkedMethods,0);assert.equal(report.projects[0].checkedGeneratedMethods,1);assert.equal(report.projects[0].comparison.newlyCheckedMethods.length,0);assert.equal(report.projects[0].comparison.newlyCheckedGeneratedMethods.length,1);assert.equal(report.projects[0].comparison.countChanges.checkedGeneratedMethods,1);assert.equal(report.functionCoverage.all.topLevelFunctions,1);assert.equal(report.totals.executable,1);
    for(const key of ['semanticAuthority','runtimeParity','fullGatePass','rustExecuted'])assert.equal(report[key],false);vectors.observations.push({label:'complete-inventory-report',report});save();
  }finally{repo.cleanup();}
});

test('generated source reinspection retains the original parser class seal rather than accepting changed callbacks',()=>{
  const before=Object.getOwnPropertyDescriptor(HostRustParser.prototype,'block');
  Object.defineProperty(HostRustParser.prototype,'block',{configurable:true,value:()=>({k:'bool',value:true,span:{start:1,end:6}})});
  try{assert.throws(()=>review(fixture()),/method identity changed/);}finally{if(before)Object.defineProperty(HostRustParser.prototype,'block',before);else delete HostRustParser.prototype.block;}
  assert.equal(review(fixture()).length,1);
});
test('bounded one-source bulk inventory records generated methods separately from original fn and method coverage',{timeout:60000},()=>{
  const repo=repository(fixture());try{
    const plan=planRegeneration({root:repo.directory,sources:['src/lib.rs'],entries:['src/lib.rs']});
    const project=plan.manifest.projects[0];assert.equal(project.checkedGeneratedMethods,1);assert.equal(project.checkedMethods,0);assert.equal(project.executableFunctions,1);assert.equal(plan.manifest.functionCoverage.all.topLevelFunctions,1);assert.equal(plan.manifest.runtimeParity,false);
    vectors.observations.push({label:'bounded-bulk-inventory',manifest:plan.manifest,outputs:plan.outputs});save();
  }finally{repo.cleanup();}
});
