import test from 'node:test';
import {gzipSync} from 'node:zlib';
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
import {metadataDigest} from '../../tools/translation/extensions/source-links.mjs';
import {planRegeneration} from '../../tools/translation/bulk.mjs';
import {verifyTypedTargets} from '../../tools/translation/test/typed-targets.mjs';
import {loadJsonMacroSourceProof} from '../../tools/translation/json-macro-inputs.mjs';
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

// Closed snapshots are produced once by the sealed source-owned Clone path.
// Each review reparses original inputs rather than trusting the serialized row.
const cloneInputs=[
  ['plain','#[derive(Clone)] pub struct Payload{flag:bool,count:u32} pub fn duplicate(x:&Payload)->Payload{x.clone()}'],
  ['copy','#[derive(Clone,Copy)] pub struct Payload{first:u32,second:u32,flag:bool} pub fn duplicate(x:&Payload)->Payload{x.clone()}'],
  ['mixed','#[derive(Default,Clone)] pub struct Payload{flag:bool,count:u32} pub fn make()->Payload{Payload::default().clone()}'],
  ['nested','mod nested{#[derive(Clone,Copy)]pub struct Payload{pub count:u32}pub fn duplicate(x:&Payload)->Payload{x.clone()}}'],
];
const cloneFixtures=new Map(cloneInputs.map(([label,source])=>[label,{source,meta:JSON.parse(JSON.stringify(translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source,cargoManifest:manifest,deriveDependencies:dependencies,compilationProfile:PRODUCTION_PROFILE}).meta))}]));
const cloneChecked=meta=>meta.checkedSemanticProgram.program.declarations.$map.find(([,entry])=>entry.impl?.cloneSourceProof)[1],cloneTarget=meta=>meta.targetSemanticProgram.program.declarations.$map.find(([,entry])=>entry.impl?.cloneSourceProof)[1],cloneRow=meta=>meta.checkedGeneratedMethods.find(row=>row.generator==='core::clone::Clone');
const cloneReview=(fixture)=>reviewGeneratedMethods(fixture.meta,{entry:fixture.meta.entry,checkedGeneratedMethods:fixture.meta.checkedGeneratedMethods?.length??0},{readSource:()=>fixture.source,dependencies,...(fixture.jsonMacroDependencies?{jsonMacroDependencies:fixture.jsonMacroDependencies}:{})});
function cloneRetain(label,value){if(process.env.ROUTER_CLONE_REVIEW_VECTORS){const directory=process.env.ROUTER_CLONE_REVIEW_VECTORS;mkdirSync(directory,{recursive:true});writeFileSync(join(directory,label+'.json.gz'),gzipSync(JSON.stringify(value,null,2)+'\n'));}}
for(const [label,fixture]of cloneFixtures)test('original generated Clone '+label+' independently rejoins source AST, receiver, private proof and whole body',()=>{
  const rows=cloneReview(fixture);assert.equal(rows.filter(row=>row.generator==='core::clone::Clone').length,1);assert.equal(rows.find(row=>row.generator==='core::clone::Clone').receiver,'shared');for(const row of rows){assert.equal(row.semanticAuthority,false);assert.equal(row.runtimeParity,false);}assert.equal(fixture.meta.checkedMethods.length,0);assert.equal(fixture.meta.executable.length,1);
  const clone=cloneRow(fixture.meta);assert.equal(clone.cloneSourceProof.selectedBranch,'has_derive_copy='+(label==='copy'||label==='nested'));if(label==='copy')assert.equal(clone.cloneSourceProof.typeAssertions.length,2);if(label==='mixed')assert.deepEqual(rows.map(row=>row.generator),['core::default::Default','core::clone::Clone']);cloneRetain('positive-'+label,{...fixture,rows});
});
function cloneFailure(label,mutate,pattern=/Clone|clone/){test('generated Clone refuses '+label,()=>{const fixture=structuredClone(cloneFixtures.get(label.startsWith('copy-')?'copy':'plain'));mutate(fixture.meta,fixture);let error;try{cloneReview(fixture);}catch(thrown){error=thrown;}assert.ok(error,label);assert.match(error.message,pattern,label);cloneRetain('negative-'+label,{...fixture,error:error.message});});}
const cloneProofs=meta=>[cloneRow(meta).cloneSourceProof,cloneChecked(meta).impl.cloneSourceProof,cloneTarget(meta).impl.cloneSourceProof];
const cloneBodies=meta=>[cloneChecked(meta).body,cloneTarget(meta).body];
const walkClone=(value,visit)=>{if(!value||typeof value!=='object')return;visit(value);for(const [key,child]of Object.entries(value))if(!['type','cloneSourceProof'].includes(key))Array.isArray(child)?child.forEach(value=>walkClone(value,visit)):walkClone(child,visit);};
for(const [key,value]of [['term','method'],['origin','source-fn'],['originalDeclarationTerm','fn'],['generator','foreign::Clone'],['receiver','value'],['semanticBodyChecked',false],['semanticAuthority',true],['runtimeParity',true]])cloneFailure('classification-'+key,meta=>cloneRow(meta)[key]=value,/classification/);
cloneFailure('duplicate-row',meta=>meta.checkedGeneratedMethods.push(structuredClone(cloneRow(meta))),/semantic count/);
cloneFailure('missing-checked',meta=>meta.checkedSemanticProgram.program.declarations.$map=meta.checkedSemanticProgram.program.declarations.$map.filter(([,entry])=>!entry.impl?.cloneSourceProof),/semantic count/);
cloneFailure('missing-target',meta=>meta.targetSemanticProgram.program.declarations.$map=meta.targetSemanticProgram.program.declarations.$map.filter(([,entry])=>!entry.impl?.cloneSourceProof));
cloneFailure('original-method-overlap',meta=>meta.checkedMethods.push({source:'src/lib.rs',span:cloneRow(meta).span}),/overlaps original/);
cloneFailure('original-fn-overlap',meta=>meta.executable.push({source:'src/lib.rs',span:cloneRow(meta).span}),/overlaps original/);
cloneFailure('foreign-owner-proof',meta=>{for(const proof of cloneProofs(meta))proof.typePath=['crate','Other'];});
cloneFailure('mirrored-source-branch',meta=>{for(const proof of cloneProofs(meta))proof.selectedBranch='has_derive_copy=true';});
cloneFailure('mirrored-compiler-ast',meta=>{for(const proof of cloneProofs(meta))proof.originalAstBranch.body.slots.fields[0].ident='other';});
cloneFailure('mirrored-receiver-recipe',meta=>{for(const proof of cloneProofs(meta))proof.receiver.originalRecipe.syntax[1].text='other';});
cloneFailure('mirrored-primitive-body',meta=>{for(const proof of cloneProofs(meta))proof.fields[0].originalSyntax.value.path=['other'];});
cloneFailure('mirrored-primitive-source',meta=>{for(const proof of cloneProofs(meta))proof.fields[0].originalMember.methodSource='fn clone(&self)->Self{false}';});
cloneFailure('mirrored-no-drop-authority',meta=>{for(const proof of cloneProofs(meta))proof.noDropProof.copyAuthority=true;});
cloneFailure('mirrored-runtime-authority',meta=>{for(const proof of cloneProofs(meta))proof.runtimeParity=true;});
cloneFailure('mirrored-shared-param',meta=>{for(const entry of [cloneChecked(meta),cloneTarget(meta)])entry.params[0].type.rustReference.kind='mutable';});
cloneFailure('mirrored-loan-pointee',meta=>{for(const entry of [cloneChecked(meta),cloneTarget(meta)])entry.params[0].type.rustReference.pointee.name='Other';});
cloneFailure('mirrored-owned-return',meta=>{for(const entry of [cloneChecked(meta),cloneTarget(meta)])entry.ret.rustReference={kind:'shared',pointee:structuredClone(entry.ret)};});
cloneFailure('mirrored-param-extra',meta=>{for(const entry of [cloneChecked(meta),cloneTarget(meta)])entry.params.push({name:'extra',type:{kind:'bool'}});});
cloneFailure('mirrored-impl-header',meta=>{for(const entry of [cloneChecked(meta),cloneTarget(meta)])entry.impl.type.path=['crate','Other'];});
cloneFailure('mirrored-proof-reference',meta=>{for(const node of cloneBodies(meta))walkClone(node,value=>{if(value.k==='routerCheckedCloneFieldBorrow')value.cloneSourceProof.sourceProofDigest='f'.repeat(64);});});
cloneFailure('mirrored-proof-reference-field',meta=>{for(const node of cloneBodies(meta))walkClone(node,value=>{if(value.k==='routerCheckedCloneFieldBorrow')value.cloneSourceProof.field='other';});});
cloneFailure('mirrored-source-field-read',meta=>{for(const node of cloneBodies(meta))walkClone(node,value=>{if(value.k==='routerField')value.field='other';});});
cloneFailure('mirrored-clone-result',meta=>{for(const node of cloneBodies(meta))walkClone(node,value=>{if(value.k==='ctor')value.ctor='Other';});});
cloneFailure('mirrored-wrapper-authority',meta=>{for(const node of cloneBodies(meta))node.constEligible=true;});
cloneFailure('mirrored-checked-receiver-proof',meta=>{for(const node of cloneBodies(meta))node.cloneSourceProof.checkedReceiver.rustReference.kind='mutable';});
cloneFailure('mirrored-layout',meta=>{for(const key of ['checkedSemanticProgram','targetSemanticProgram'])meta[key].program.declarations.$map.find(([,entry])=>entry.k==='data'&&entry.record)[1].ctors[0].fields[0].type={kind:'fixed',bits:32,signed:false,rustPrimitiveName:'u32',rustSourceType:true};});
cloneFailure('copy-missing-private-token',meta=>{for(const node of cloneBodies(meta))node.cloneSourceProof.checkedCopyProof=null;});
cloneFailure('copy-foreign-private-layout',meta=>{for(const node of cloneBodies(meta))node.cloneSourceProof.checkedCopyProof.proof.layout.fullName='Other';});
cloneFailure('copy-fake-certificate',meta=>{for(const node of cloneBodies(meta))node.cloneSourceProof.checkedCopyProof.proof.certificate.verified=false;});
cloneFailure('copy-no-drop-substitution',meta=>{for(const node of cloneBodies(meta))node.cloneSourceProof.checkedCopyProof=structuredClone(cloneChecked(cloneFixtures.get('plain').meta).body.cloneSourceProof.noDropProof);});
cloneFailure('target-only-field-ref',meta=>walkClone(cloneTarget(meta).body,value=>{if(value.k==='routerCheckedCloneFieldBorrow')value.cloneSourceProof.field='other';}));
cloneFailure('target-only-owned-param',meta=>delete cloneTarget(meta).params[0].type.rustReference);
cloneFailure('source-shadow-with-mirrored-hashes',(meta,fixture)=>{fixture.source+=' trait Clone{}';const sha=hash(fixture.source);meta.sources[0].sha256=sha;for(const proof of cloneProofs(meta))proof.sourceSha256=sha;},/shadow|Clone/);
cloneFailure('source-hidden-bang-with-mirrored-hashes',(meta,fixture)=>{fixture.source+=' fn hidden(){unknown!();}';const sha=hash(fixture.source);meta.sources[0].sha256=sha;for(const proof of cloneProofs(meta))proof.sourceSha256=sha;},/bang|Clone/);
for(const file of ['src/cli/emergency_args.rs','src/cli/management_args.rs'])test('complete original '+file+' Clone review retains actual input slots and separate generated counts',()=>{
  const source=readFileSync(new URL(file,root),'utf8'),meta=JSON.parse(JSON.stringify(translateProject({entry:file,paths:[file],readSource:()=>source,cargoManifest:manifest,deriveDependencies:dependencies,compilationProfile:PRODUCTION_PROFILE}).meta)),rows=cloneReview({source,meta});assert.ok(rows.some(row=>row.generator==='core::clone::Clone'));assert.equal(rows.find(row=>row.generator==='core::clone::Clone').receiver,'shared');cloneRetain('original-'+file.replaceAll('/','_'),{source,meta,rows});
});
test('mixed original Default and Clone comparison keys include generator and retain unchanged source denominators',()=>{
  const fixture=cloneFixtures.get('mixed'),rows=cloneReview(fixture),defaults=rows.filter(row=>row.generator==='core::default::Default'),clones=rows.filter(row=>row.generator==='core::clone::Clone'),comparison=compareGeneratedMethods(defaults,clones);assert.equal(comparison.newlyCheckedGeneratedMethods.length,1);assert.equal(comparison.lostCheckedGeneratedMethods.length,1);assert.equal(comparison.changedGeneratedMethodBodies.length,0);assert.equal(fixture.meta.executable.length,1);assert.equal(fixture.meta.checkedMethods.length,0);cloneRetain('mixed-comparison',{fixture,rows,comparison});
});

cloneFailure('mirrored-computation-and-rehashed-proof',meta=>{
  for(const node of cloneBodies(meta))walkClone(node,value=>{if(value.k==='routerField')value.field='other';});
  const body=cloneChecked(meta).body;for(const node of cloneBodies(meta)){node.cloneSourceProof.computationSha256=metadataDigest(body.body);node.cloneSourceProof.digest=cloneRow(meta).cloneSourceProof.digest;node.cloneSourceProof.digest=metadataDigest(node.cloneSourceProof);}
});
test('Clone alpha-renamed checked locals still join original body slots and report a changed body separately',()=>{
  const fixture=structuredClone(cloneFixtures.get('plain')),before=cloneReview(fixture),old=cloneChecked(fixture.meta).body.body.name;
  for(const node of cloneBodies(fixture.meta))walkClone(node,value=>{if(['let','var'].includes(value.k)&&value.name===old)value.name='other_checked_local';});
  for(const node of cloneBodies(fixture.meta)){node.cloneSourceProof.computationSha256=metadataDigest(cloneChecked(fixture.meta).body.body);node.cloneSourceProof.digest=cloneRow(fixture.meta).cloneSourceProof.digest;node.cloneSourceProof.digest=metadataDigest(node.cloneSourceProof);}
  const after=cloneReview(fixture),comparison=compareGeneratedMethods(before,after);assert.equal(comparison.changedGeneratedMethodBodies.length,1);assert.equal(comparison.newlyCheckedGeneratedMethods.length,0);assert.equal(comparison.lostCheckedGeneratedMethods.length,0);cloneRetain('alpha-changed-comparison',{fixture,before,after,comparison});
});
test('complete bounded mixed inventory reviews Default and Clone one-to-one without original-method growth',{timeout:60000},()=>{
  const fixture=cloneFixtures.get('mixed'),repo=repository(fixture.meta);try{repo.write('src/lib.rs',fixture.source);const items=sourceItems(fixture.source).filter(item=>!item.comment).map(item=>({term:item.term,name:item.name,span:{start:item.start,end:item.end},source:fixture.source.slice(item.start,item.end),sha256:hash(fixture.source.slice(item.start,item.end)),status:item.term==='fn'?'executable':'carried'}));
    const inventory=JSON.parse(readFileSync(join(repo.directory,'parity/rust-source-inventory.json')));inventory.sources[0].sha256=hash(fixture.source);inventory.sources[0].bytes=Buffer.byteLength(fixture.source);const standalone=JSON.parse(readFileSync(join(repo.directory,inventory.sources[0].targets.meta)));standalone.sourceBytes=Buffer.byteLength(fixture.source);standalone.sourceSha256=hash(fixture.source);standalone.items=items;repo.write(inventory.sources[0].targets.meta,JSON.stringify(standalone));repo.write('parity/rust-source-inventory.json',JSON.stringify(inventory));
    const report=reviewTranslationDraft({root:repo.directory});assert.equal(report.projects[0].checkedGeneratedMethods,2);assert.equal(report.projects[0].checkedMethods,0);assert.deepEqual(report.projects[0].checkedGeneratedMethodItems.map(row=>row.generator),['core::default::Default','core::clone::Clone']);assert.equal(report.functionCoverage.all.topLevelFunctions,1);assert.equal(report.totals.executable,1);for(const key of ['semanticAuthority','runtimeParity','fullGatePass','rustExecuted'])assert.equal(report[key],false);cloneRetain('mixed-complete-inventory',{fixture,report});
  }finally{repo.cleanup();}
});

cloneFailure('target-only-impl-owner',meta=>cloneTarget(meta).impl.type.path=['crate','Other']);
cloneFailure('target-only-layout-record',meta=>meta.targetSemanticProgram.program.declarations.$map.find(([,entry])=>entry.k==='data'&&entry.record)[1].record=false);
cloneFailure('mirrored-extra-implementation-authority',meta=>{for(const entry of [cloneChecked(meta),cloneTarget(meta)])entry.impl.copyCertificate={verified:true};});


// Unit enums use the same privately reconstructed original nominal/body join.
// Root producer metadata must identify the actual enum declaration separately.
const unitCases=[
  ['one',['Only']],['two',['Off','On']],['four',['First','Second','Third','Fourth']],
  ['thirty-two',Array.from({length:32},(_,index)=>'Variant'+index)],
  ['nested',['Off','On']],
];
const unitFixtures=new Map(unitCases.map(([label,variants])=>{
  const declaration='#[derive(Clone,Copy,serde::Serialize)]pub enum Mode{'+variants.join(',')+'}pub fn duplicate(value:&Mode)->Mode{value.clone()}',source=label==='nested'?'mod inner{'+declaration+'}':declaration;
  const result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source,cargoManifest:manifest,deriveDependencies:dependencies,compilationProfile:PRODUCTION_PROFILE});
  return [label,{source,variants,result,meta:JSON.parse(JSON.stringify(result.meta))}];
}));
for(const [label,fixture]of unitFixtures)test('original unit enum '+label+' review reconstructs source Copy branch and owned computation',{timeout:60000},async()=>{
  assert.deepEqual(fixture.meta.refused,[]);const rows=cloneReview(fixture),row=rows.find(value=>value.generator==='core::clone::Clone');assert.equal(rows.length,1);assert.equal(row.originalDeclarationTerm,'enum');assert.equal(fixture.result.checkedGeneratedMethodDeclarations[0].originalDeclarationTerm,'enum');assert.equal(row.receiver,'shared');assert.equal(row.cloneSourceProof.unitVariants.length,fixture.variants.length);assert.equal(fixture.meta.checkedMethods.length,0);assert.equal(fixture.meta.executable.length,1);assert.equal(row.semanticAuthority,false);assert.equal(row.runtimeParity,false);
  const body=cloneChecked(fixture.meta).body;assert.equal(body.body.k,'var');assert.equal(body.body.name,cloneChecked(fixture.meta).params[0].name);assert.equal(body.body.type.rustReference,undefined);assert.equal(body.cloneSourceProof.checkedBody,true);assert.ok(body.cloneSourceProof.checkedCopyProof);assert.equal(body.constEligible,false);
  await verifyTypedTargets(fixture.result,api=>{for(const variant of fixture.variants){const value=Object.freeze({$:variant});assert.deepEqual(api[label==='nested'?'inner.duplicate':'duplicate'](value),{$:variant});}},{childTimeoutMs:30000});
  cloneRetain('unit-positive-'+label,{source:fixture.source,result:fixture.result,rows});
});
function unitFailure(label,mutate,pattern=/Clone|clone|original|shadow|bang|Copy/){test('generated unit Clone refuses '+label,()=>{
  const original=unitFixtures.get('two'),fixture={source:original.source,variants:[...original.variants],meta:structuredClone(original.meta)};mutate(fixture.meta,fixture);let error;try{cloneReview(fixture);}catch(thrown){error=thrown;}assert.ok(error,label);assert.match(error.message,pattern,label);cloneRetain('unit-negative-'+label,{...fixture,error:error.message});
});}
unitFailure('enum-mislabelled-struct',meta=>cloneRow(meta).originalDeclarationTerm='struct',/classification/);
cloneFailure('struct-mislabelled-enum',meta=>cloneRow(meta).originalDeclarationTerm='enum',/classification/);
unitFailure('mirrored-variant-name',meta=>{for(const proof of cloneProofs(meta))proof.unitVariants[0].name='Other';});
unitFailure('mirrored-unit-source-output',meta=>{for(const proof of cloneProofs(meta))proof.unitSource.selectedBranch.output.items[0].name='other';});
unitFailure('mirrored-copy-source-authority',meta=>{for(const proof of cloneProofs(meta))proof.unitSource.copyAuthority=true;});
unitFailure('mirrored-source-variant-order',meta=>{for(const proof of cloneProofs(meta))proof.unitSource.variants.reverse();});
unitFailure('mirrored-selected-branch',meta=>{for(const proof of cloneProofs(meta))proof.selectedBranch='has_derive_copy=false';});
unitFailure('mirrored-original-receiver',meta=>{for(const proof of cloneProofs(meta))proof.receiver.originalParameter.name='other';});
unitFailure('mirrored-mutable-receiver',meta=>{for(const entry of [cloneChecked(meta),cloneTarget(meta)])entry.params[0].type.rustReference.kind='mutable';});
unitFailure('mirrored-borrowed-return',meta=>{for(const entry of [cloneChecked(meta),cloneTarget(meta)])entry.ret.rustReference={kind:'shared',pointee:structuredClone(entry.ret)};});
unitFailure('mirrored-owned-variable-name-and-rehash',meta=>{for(const body of cloneBodies(meta))body.body.name='other';for(const body of cloneBodies(meta)){body.cloneSourceProof.computationSha256=metadataDigest(cloneChecked(meta).body.body);body.cloneSourceProof.digest=cloneRow(meta).cloneSourceProof.digest;body.cloneSourceProof.digest=metadataDigest(body.cloneSourceProof);}});
unitFailure('mirrored-owned-variable-reference-type',meta=>{for(const body of cloneBodies(meta))body.body.type.rustReference={kind:'shared',pointee:structuredClone(body.body.type)};});
unitFailure('missing-checked-copy-proof',meta=>{for(const body of cloneBodies(meta))body.cloneSourceProof.checkedCopyProof=null;});
unitFailure('foreign-checked-copy-layout',meta=>{for(const body of cloneBodies(meta))body.cloneSourceProof.checkedCopyProof.proof.layout.fullName='Other';});
unitFailure('mirrored-unit-ctor-payload',meta=>{for(const key of ['checkedSemanticProgram','targetSemanticProgram'])meta[key].program.declarations.$map.find(([,entry])=>entry.k==='data'&&!entry.record)[1].ctors[0].fields.push({name:'payload',type:{kind:'bool'}});});
unitFailure('mirrored-unit-ctor-order',meta=>{for(const key of ['checkedSemanticProgram','targetSemanticProgram'])meta[key].program.declarations.$map.find(([,entry])=>entry.k==='data'&&!entry.record)[1].ctors.reverse();});
unitFailure('target-only-owned-variable-name',meta=>cloneTarget(meta).body.body.name='other');
unitFailure('target-only-unit-ctor-tag',meta=>meta.targetSemanticProgram.program.declarations.$map.find(([,entry])=>entry.k==='data'&&!entry.record)[1].ctors[0].name='Other');
unitFailure('mirrored-const-trait-authority',meta=>{for(const body of cloneBodies(meta))body.constEligible=true;});
unitFailure('checked-declaration-relocation',meta=>cloneChecked(meta).span.end++);
unitFailure('original-method-denominator-overlap',meta=>meta.checkedMethods.push({source:'src/lib.rs',span:cloneRow(meta).span}),/overlaps original/);
unitFailure('original-function-denominator-overlap',meta=>meta.executable.push({source:'src/lib.rs',span:cloneRow(meta).span}),/overlaps original/);
unitFailure('source-clone-shadow-with-mirrored-hash',(meta,fixture)=>{fixture.source+='trait Clone{}';const sha=hash(fixture.source);meta.sources[0].sha256=sha;for(const proof of cloneProofs(meta))proof.sourceSha256=sha;});
unitFailure('source-hidden-bang-with-mirrored-hash',(meta,fixture)=>{fixture.source+='fn hidden(){unknown!();}';const sha=hash(fixture.source);meta.sources[0].sha256=sha;for(const proof of cloneProofs(meta))proof.sourceSha256=sha;});
test('unit enum generated comparison remains separate from original struct identities',()=>{
  const before=cloneReview(unitFixtures.get('one')),after=cloneReview(unitFixtures.get('two')),comparison=compareGeneratedMethods(before,after);assert.equal(comparison.newlyCheckedGeneratedMethods.length,1);assert.equal(comparison.lostCheckedGeneratedMethods.length,1);assert.equal(comparison.changedGeneratedMethodBodies.length,0);assert.equal(before[0].originalDeclarationTerm,'enum');assert.equal(after[0].originalDeclarationTerm,'enum');cloneRetain('unit-distinct-original-comparison',{before,after,comparison});
});

function assertCurrentOriginalModelCensus(meta,rows){
 const expected={"executable":[{"source":"src/model_contract.rs","name":"is_false","term":"fn","span":{"start":4217,"end":4317}},{"source":"src/model_contract.rs","name":"served_model_from","term":"fn","span":{"start":11726,"end":12145}}],"checkedMethods":[{"source":"src/model_contract.rs","name":"ModelSelectorKind.from_wire","span":{"start":1828,"end":2179},"receiver":null},{"source":"src/model_contract.rs","name":"ModelSelectorKind.from_catalog_value","span":{"start":2303,"end":2510},"receiver":null},{"source":"src/model_contract.rs","name":"ModelSelectorKind.as_wire","span":{"start":2574,"end":2874},"receiver":"value"},{"source":"src/model_contract.rs","name":"ModelSelectorKind.permits_resolution","span":{"start":2952,"end":3094},"receiver":"value"},{"source":"src/model_contract.rs","name":"ModelAccessError.policy_unavailable","span":{"start":7577,"end":7826},"receiver":null}],"refused":[{"file":"src/model_contract.rs","name":"ModelSelectorKind.deserialize","term":"method","span":{"start":1453,"end":1681},"kind":"unsupported","message":"generic implementation requires checked monomorphization; trait implementation needs resolved generic bounds or qualified trait syntax; trait implementation requires declared trait and dispatch checking; generic method requires checked monomorphization"},{"file":"src/model_contract.rs","name":"ModelAccessPolicy.exact","term":"method","kind":"syntax","message":"expected ) in function but found \"Into\"","span":{"start":5351,"end":5355}},{"file":"src/model_contract.rs","name":"ModelAccessError.fmt","term":"method","span":{"start":7880,"end":8456},"kind":"unsupported","message":"trait implementation requires declared trait and dispatch checking"},{"file":"src/model_contract.rs","name":"ServedModelError.fmt","term":"method","span":{"start":8845,"end":9377},"kind":"unsupported","message":"trait implementation requires declared trait and dispatch checking"},{"file":"src/model_contract.rs","name":"ModelTruthDescriptor.default","term":"generated-method","kind":"unsupported","span":{"start":3636,"end":4148},"message":"Original Default AST lowering: external field Default original module/prelude/attribute owner closure remains unproved"},{"file":"src/model_contract.rs","name":"ModelRouteScope.clone","term":"generated-method","kind":"unsupported","span":{"start":3161,"end":3418},"message":"Original Option Clone fields: requires actual primitive Clone/Copy payload: Option<String>"},{"file":"src/model_contract.rs","name":"ModelTruthDescriptor.clone","term":"generated-method","kind":"unsupported","span":{"start":3636,"end":4148},"message":"Original Option Clone fields: requires actual primitive Clone/Copy payload: Option<String>"},{"file":"src/model_contract.rs","name":"ModelAccessPolicy.clone","term":"generated-method","kind":"unsupported","span":{"start":4598,"end":5231},"message":"Original Option Clone fields: requires actual primitive Clone/Copy payload: Vec<String>"},{"file":"src/model_contract.rs","name":"ModelAccessError.clone","term":"generated-method","kind":"unsupported","span":{"start":7059,"end":7267},"message":"Original Option Clone fields: requires actual primitive Clone/Copy payload: String"},{"file":"src/model_contract.rs","name":"ServedModelError.clone","term":"generated-method","kind":"unsupported","span":{"start":8584,"end":8793},"message":"Original Option Clone fields: requires actual primitive Clone/Copy payload: String"},{"file":"src/model_contract.rs","name":"validate_served_model_for_selector","term":"fn","kind":"unsupported","message":"method ok_or_else: outside the portable core","span":{"start":10461,"end":10701}},{"file":"src/model_contract.rs","name":"validate_translated_response","term":"fn","kind":"unsupported","message":"pinned standard body owner: requires an actual by-value canonical Option with a checked scalar, borrowed str, or privately certified Copy nominal payload","span":{"start":12630,"end":12763}},{"file":"src/model_contract.rs","name":"validate_translated_response_for_selector","term":"fn","kind":"unsupported","message":"pinned standard body owner: requires an actual by-value canonical Option with a checked scalar, borrowed str, or privately certified Copy nominal payload","span":{"start":13068,"end":13237}},{"file":"src/model_contract.rs","name":"ml_impl_63726174652e4d6f64656c416363657373506f6c696379_7065726d697473","term":"method","kind":"unsupported","message":"standard string equality: requires an actual registered String/str PartialEq pair and checked source reference or field-place evidence","span":{"start":5816,"end":5823}},{"file":"src/model_contract.rs","name":"ml_impl_63726174652e4d6f64656c416363657373506f6c696379_76616c6964617465","term":"method","kind":"unsupported","message":"mutable aggregate: mutable aggregate ownership and aliases need a separate runtime contract","span":{"start":6164,"end":6224}},{"file":"src/model_contract.rs","name":"ml_impl_63726174652e4d6f64656c4163636573734572726f72_6e6577","term":"method","kind":"type","message":"Rust source reference depth differs from the expected value type","span":{"start":7531,"end":7546}},{"file":"src/model_contract.rs","name":"validate_served_model","term":"fn","kind":"type","message":"unknown name crate.validate_served_model_for_selector","span":{"start":9728,"end":9870}}]};
 assert.deepEqual(meta.executable,expected.executable);assert.deepEqual(meta.checkedMethods,expected.checkedMethods);assert.deepEqual(meta.refused,expected.refused);
 assert.deepEqual(rows.map(item=>item.name).sort(),['ModelAccessPolicy.default','ModelRouteScope.default','ModelSelectorKind.clone','ModelSelectorKind.default']);
 assert.equal(meta.executable.length,2);assert.equal(meta.checkedMethods.length,5);assert.equal(meta.checkedGeneratedMethods.length,4);assert.equal(meta.refused.length,17);
}
test('complete original model unit Clone review preserves original function method and blocked-record census',{timeout:60000},()=>{
  const source=readFileSync(new URL('src/model_contract.rs',root),'utf8'),jsonMacroDependencies=loadJsonMacroSourceProof({manifest,lock}),result=translateProject({entry:'src/model_contract.rs',paths:['src/model_contract.rs'],readSource:()=>source,cargoManifest:manifest,deriveDependencies:dependencies,jsonMacroDependencies,compilationProfile:PRODUCTION_PROFILE}),meta=JSON.parse(JSON.stringify(result.meta)),rows=cloneReview({source,meta,jsonMacroDependencies});
  assertCurrentOriginalModelCensus(meta,rows);const clone=rows.find(row=>row.name==='ModelSelectorKind.clone');assert.ok(clone);assert.equal(clone.originalDeclarationTerm,'enum');assert.equal(clone.cloneSourceProof.unitVariants.length,4);assert.equal(meta.refused.filter(row=>row.term==='generated-method'&&row.name.endsWith('.clone')).length,5);assert.equal(clone.semanticAuthority,false);assert.equal(clone.runtimeParity,false);cloneRetain('unit-complete-original-model',{source,result,rows});
});

unitFailure('mirrored-unit-source-profile-flag',meta=>{for(const proof of cloneProofs(meta))proof.unitSource.sourceOutput.compilationProfile.flags.test=true;});
unitFailure('mirrored-unit-copy-profile-values',meta=>{for(const proof of cloneProofs(meta))proof.unitSource.sourceCopyOutput.compilationProfile.values.foreign=['value'];});
unitFailure('mirrored-unit-source-profile-extra-field',meta=>{for(const proof of cloneProofs(meta))proof.unitSource.sourceOutput.compilationProfile.authority=true;});
unitFailure('mirrored-unit-attribute-owner-profile',meta=>{for(const proof of cloneProofs(meta))proof.unitSource.sourceOutput.attributeOwners.compilationProfile.flags.test=true;});

unitFailure('mirrored-unit-copy-profile-missing-flag',meta=>{for(const proof of cloneProofs(meta))delete proof.unitSource.sourceCopyOutput.compilationProfile.flags.test;});
unitFailure('mirrored-unit-source-profile-missing-values',meta=>{for(const proof of cloneProofs(meta))delete proof.unitSource.sourceOutput.compilationProfile.values;});
test('complete original model source requires genuine independent JSON/Serde proof for its manual non-Drop trait',{timeout:60000},()=>{
  const source=readFileSync(new URL('src/model_contract.rs',root),'utf8'),jsonMacroDependencies=loadJsonMacroSourceProof({manifest,lock}),result=translateProject({entry:'src/model_contract.rs',paths:['src/model_contract.rs'],readSource:()=>source,cargoManifest:manifest,deriveDependencies:dependencies,jsonMacroDependencies,compilationProfile:PRODUCTION_PROFILE}),meta=JSON.parse(JSON.stringify(result.meta));
  for(const proof of [undefined,structuredClone(jsonMacroDependencies),dependencies]){assert.throws(()=>cloneReview({source,meta,jsonMacroDependencies:proof}),/genuine original private Copy/);cloneRetain(proof===dependencies?'unit-model-foreign-serde-proof':proof?'unit-model-copied-serde-proof':'unit-model-missing-serde-proof',{source,result,suppliedJsonMacroDependencies:proof??null});}
});
unitFailure('foreign-original-source-scope',meta=>meta.sources[0].module=['foreign']);
unitFailure('mirrored-copy-source-scope-uncertainty',meta=>{for(const body of cloneBodies(meta))body.cloneSourceProof.checkedCopyProof.proof.certificate.proofs.find(proof=>proof.kind==='source-derived').attributeMacroProvenance.sourceScopes[0].unresolvedTypeScope=true;});
for(const [label,proof]of [['absent',null],['copied',structuredClone(dependencies)],['foreign',loadJsonMacroSourceProof({manifest,lock})]])test('unit enum review refuses '+label+' derive dependency issuer',()=>{
  const fixture=unitFixtures.get('two');assert.throws(()=>reviewGeneratedMethods(fixture.meta,{entry:fixture.meta.entry,checkedGeneratedMethods:1},{readSource:()=>fixture.source,dependencies:proof}),/derive|Derive|unsealed|dependencies|Clone/);cloneRetain('unit-negative-derive-issuer-'+label,{source:fixture.source,meta:fixture.meta,suppliedDependencies:proof});
});
unitFailure('source-caller-profile-with-original-proofs',meta=>meta.compilationProfile.flags.test=true);
test('complete bounded enum inventory uses actual Cargo proofs and separates generated rows',{timeout:60000},()=>{
  const fixture=unitFixtures.get('two'),repo=repository(fixture.meta);try{
    repo.write('src/lib.rs',fixture.source);const items=sourceItems(fixture.source).filter(item=>!item.comment).map(item=>({term:item.term,name:item.name,span:{start:item.start,end:item.end},source:fixture.source.slice(item.start,item.end),sha256:hash(fixture.source.slice(item.start,item.end)),status:item.term==='fn'?'executable':'carried'}));
    const inventory=JSON.parse(readFileSync(join(repo.directory,'parity/rust-source-inventory.json')));inventory.sources[0].sha256=hash(fixture.source);inventory.sources[0].bytes=Buffer.byteLength(fixture.source);const standalone=JSON.parse(readFileSync(join(repo.directory,inventory.sources[0].targets.meta)));standalone.sourceBytes=Buffer.byteLength(fixture.source);standalone.sourceSha256=hash(fixture.source);standalone.items=items;repo.write(inventory.sources[0].targets.meta,JSON.stringify(standalone));repo.write('parity/rust-source-inventory.json',JSON.stringify(inventory));
    const report=reviewTranslationDraft({root:repo.directory});assert.equal(report.projects[0].checkedGeneratedMethods,1);assert.equal(report.projects[0].checkedMethods,0);assert.equal(report.projects[0].checkedGeneratedMethodItems[0].originalDeclarationTerm,'enum');assert.equal(report.functionCoverage.all.topLevelFunctions,1);assert.equal(report.totals.executable,1);for(const key of ['semanticAuthority','runtimeParity','fullGatePass','rustExecuted'])assert.equal(report[key],false);cloneRetain('unit-complete-inventory',{source:fixture.source,meta:fixture.meta,report});
  }finally{repo.cleanup();}
});

const defaultUnitFixtures=new Map([
  ['one',['Only']],['two',['First','Last']],['four',['A','B','C','D']],['nested',['Before','Selected','After']],['thirty-two',Array.from({length:32},(_,i)=>'Variant'+i)],
].map(([label,variants])=>{
  const selected=variants[Math.floor(variants.length/2)],declaration='#[derive(Default,Clone,Copy,serde::Serialize)]pub enum Choice{'+variants.map(name=>(name===selected?'#[default]':'')+name).join(',')+'}pub fn make()->Choice{Choice::default()}',source=label==='nested'?'mod inner{'+declaration+'}':declaration,result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source,cargoManifest:manifest,deriveDependencies:dependencies,compilationProfile:PRODUCTION_PROFILE});
  return [label,{source,selected,variants,result,meta:JSON.parse(JSON.stringify(result.meta))}];
}));
const defaultUnitRow=meta=>meta.checkedGeneratedMethods.find(row=>row.generator==='core::default::Default'),defaultUnitChecked=meta=>meta.checkedSemanticProgram.program.declarations.$map.find(([,entry])=>entry.impl?.defaultSourceProof)[1],defaultUnitTarget=meta=>meta.targetSemanticProgram.program.declarations.$map.find(([,entry])=>entry.impl?.defaultSourceProof)[1];
const defaultUnitProofs=meta=>[defaultUnitRow(meta).defaultSourceProof,defaultUnitChecked(meta).impl.defaultSourceProof,defaultUnitTarget(meta).impl.defaultSourceProof];
for(const [label,fixture]of defaultUnitFixtures)test('unit Default '+label+' rejoins actual compiler selected path and fresh owned JS/strict TS constructor',{timeout:60000},async()=>{
  assert.deepEqual(fixture.meta.refused,[]);const rows=cloneReview(fixture),row=rows.find(row=>row.generator==='core::default::Default');assert.equal(rows.length,2);assert.equal(row.originalDeclarationTerm,'enum');assert.equal(row.receiver,null);assert.equal(row.defaultSourceProof.schema,'original-generated-unit-default-ir-v1');assert.equal(row.defaultSourceProof.unitSourceProof.selectedVariant.variant.name,fixture.selected);assert.equal(fixture.meta.executable.length,1);assert.equal(fixture.meta.checkedMethods.length,0);assert.equal(row.runtimeParity,false);assert.equal(row.semanticAuthority,false);
  assert.deepEqual(defaultUnitChecked(fixture.meta).params,[]);assert.equal(defaultUnitChecked(fixture.meta).body.k,'ctor');assert.equal(defaultUnitChecked(fixture.meta).body.ctor,fixture.selected);
  await verifyTypedTargets(fixture.result,api=>{const make=api[label==='nested'?'inner.make':'make'],a=make(),b=make();assert.deepEqual(a,{$:fixture.selected});assert.deepEqual(b,a);assert.notStrictEqual(a,b);assert.ok(Object.isFrozen(a));},{childTimeoutMs:30000});cloneRetain('unit-default-positive-'+label,{...fixture,rows});
});
function defaultUnitFailure(label,mutate,pattern=/Default|default|original|Clone|source|shadow|bang/){test('unit Default refuses '+label,()=>{
  const original=defaultUnitFixtures.get('two'),fixture={source:original.source,selected:original.selected,meta:structuredClone(original.meta)};mutate(fixture.meta,fixture);let error;try{cloneReview(fixture);}catch(thrown){error=thrown;}assert.ok(error,label);assert.match(error.message,pattern,label);cloneRetain('unit-default-negative-'+label,{...fixture,error:error.message});
});}
defaultUnitFailure('enum-mislabelled-struct',meta=>defaultUnitRow(meta).originalDeclarationTerm='struct',/Generated source|schema|hash/);
defaultUnitFailure('mirrored-selected-variant',meta=>{for(const proof of defaultUnitProofs(meta))proof.unitSourceProof.selectedVariant.variant.name='First';});
defaultUnitFailure('mirrored-original-path',meta=>{for(const proof of defaultUnitProofs(meta))proof.unitSourceProof.originalOutput.items[0].body.statements[0].expr.slots.path.segments=['Self','First'];});
defaultUnitFailure('mirrored-compiler-plan',meta=>{for(const proof of defaultUnitProofs(meta))proof.unitSourceProof.originalCompilerPlanDigest='a'.repeat(64);});
defaultUnitFailure('mirrored-original-zero-argument-descriptor',meta=>{for(const proof of defaultUnitProofs(meta))proof.unitSourceProof.methodDescriptor.fields.find(field=>field.name==='explicit_self').name='other';});
for(const key of ['namespaceAuthority','copyAuthority','noDropAuthority','constAuthority','generatedImplBehavior','runtimeParity'])defaultUnitFailure('mirrored-unit-authority-'+key,meta=>{for(const proof of defaultUnitProofs(meta))proof.unitSourceProof[key]=true;});
for(const key of ['checkedBody','wholeCompilerExecuted','wholeTraitTranslated','runtimeParity'])defaultUnitFailure('mirrored-source-authority-'+key,meta=>{for(const proof of defaultUnitProofs(meta))proof[key]=true;});
defaultUnitFailure('mirrored-profile-flag',meta=>{for(const proof of defaultUnitProofs(meta))proof.unitSourceProof.sourceOutput.compilationProfile.flags.test=true;});
defaultUnitFailure('mirrored-profile-values',meta=>{for(const proof of defaultUnitProofs(meta))proof.unitSourceProof.sourceOutput.compilationProfile.values.foreign=['value'];});
defaultUnitFailure('mirrored-profile-extra',meta=>{for(const proof of defaultUnitProofs(meta))proof.unitSourceProof.sourceOutput.compilationProfile.extra=true;});
defaultUnitFailure('mirrored-profile-missing',meta=>{for(const proof of defaultUnitProofs(meta))delete proof.unitSourceProof.sourceOutput.compilationProfile.flags.test;});
defaultUnitFailure('caller-profile',meta=>meta.compilationProfile.flags.test=true);
defaultUnitFailure('foreign-source-scope',meta=>meta.sources[0].module=['foreign']);
defaultUnitFailure('mirrored-wrong-constructor',meta=>{for(const entry of [defaultUnitChecked(meta),defaultUnitTarget(meta)])entry.body.ctor='First';});
defaultUnitFailure('mirrored-constructor-argument',meta=>{for(const entry of [defaultUnitChecked(meta),defaultUnitTarget(meta)])entry.body.args.push({k:'lit',value:true,type:{kind:'bool'}});});
defaultUnitFailure('mirrored-return-loan',meta=>{for(const entry of [defaultUnitChecked(meta),defaultUnitTarget(meta)])entry.ret.rustReference={kind:'shared',pointee:structuredClone(entry.ret)};});
defaultUnitFailure('mirrored-receiver',meta=>{for(const entry of [defaultUnitChecked(meta),defaultUnitTarget(meta)])entry.impl.receiver='shared';});
defaultUnitFailure('mirrored-zero-argument',meta=>{for(const entry of [defaultUnitChecked(meta),defaultUnitTarget(meta)])entry.params.push({name:'self',type:{kind:'bool'}});});
defaultUnitFailure('mirrored-const-function',meta=>{for(const entry of [defaultUnitChecked(meta),defaultUnitTarget(meta)])entry.constFunction=true;});
defaultUnitFailure('mirrored-owned-result-type',meta=>{for(const entry of [defaultUnitChecked(meta),defaultUnitTarget(meta)])entry.body.type={kind:'bool'};});
defaultUnitFailure('mirrored-layout-order',meta=>{for(const key of ['checkedSemanticProgram','targetSemanticProgram'])meta[key].program.declarations.$map.find(([,entry])=>entry.k==='data'&&entry.ctors?.some(ctor=>ctor.name==='Last'))[1].ctors.reverse();});
defaultUnitFailure('mirrored-layout-payload',meta=>{for(const key of ['checkedSemanticProgram','targetSemanticProgram'])meta[key].program.declarations.$map.find(([,entry])=>entry.k==='data'&&entry.ctors?.some(ctor=>ctor.name==='Last'))[1].ctors[0].fields.push({name:'value',type:{kind:'bool'}});});
defaultUnitFailure('target-only-body',meta=>defaultUnitTarget(meta).body.ctor='First');
defaultUnitFailure('checked-relocation',meta=>defaultUnitChecked(meta).span.end++);
defaultUnitFailure('original-method-overlap',meta=>meta.checkedMethods.push({source:'src/lib.rs',span:defaultUnitRow(meta).span}));
defaultUnitFailure('original-fn-overlap',meta=>meta.executable.push({source:'src/lib.rs',span:defaultUnitRow(meta).span}));
for(const [label,change]of [['trait-shadow',source=>source+'trait Default{}'],['manual-coherence',source=>source+'impl Default for Choice{fn default()->Self{Self::First}}'],['changed-marker',source=>source.replace('#[default]Last','#[default]First').replace('First,#[default]First','First,Last')]])defaultUnitFailure('mirrored-source-'+label,(meta,fixture)=>{
  fixture.source=change(fixture.source);const sha=hash(fixture.source);meta.sources[0].sha256=sha;for(const proof of defaultUnitProofs(meta)){proof.sourceSha256=sha;proof.unitSourceProof.sourceSha256=sha;}
});
for(const [label,proof]of [['absent',null],['copied',structuredClone(dependencies)],['foreign',loadJsonMacroSourceProof({manifest,lock})]])test('unit Default refuses '+label+' dependency issuer',()=>{
 const fixture=defaultUnitFixtures.get('two');assert.throws(()=>reviewGeneratedMethods(fixture.meta,row(fixture.meta),{readSource:()=>fixture.source,dependencies:proof}),/derive|Derive|unsealed|dependencies|Clone/);cloneRetain('unit-default-negative-dependency-'+label,{source:fixture.source,meta:fixture.meta,suppliedDependencies:proof});
});
test('complete original Model Default and Clone review retains exact original fn and method denominators',{timeout:60000},()=>{
 const source=readFileSync(new URL('src/model_contract.rs',root),'utf8'),jsonMacroDependencies=loadJsonMacroSourceProof({manifest,lock}),result=translateProject({entry:'src/model_contract.rs',paths:['src/model_contract.rs'],readSource:()=>source,cargoManifest:manifest,deriveDependencies:dependencies,jsonMacroDependencies,compilationProfile:PRODUCTION_PROFILE}),meta=JSON.parse(JSON.stringify(result.meta)),rows=cloneReview({source,meta,jsonMacroDependencies});assertCurrentOriginalModelCensus(meta,rows);const row=rows.find(row=>row.name==='ModelSelectorKind.default');assert.ok(row);assert.equal(row.originalDeclarationTerm,'enum');assert.equal(row.defaultSourceProof.unitSourceProof.selectedVariant.variant.name,'Unknown');assert.ok(rows.some(row=>row.name==='ModelSelectorKind.clone'));cloneRetain('unit-default-complete-original-model',{source,result,rows});
});
test('unit Default independently reconstructs its own source context without a Clone declaration',()=>{
 const source='trait Clone{}#[derive(Default)]pub enum Choice{Before,#[default]Selected}pub fn make()->Choice{Choice::default()}',result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source,cargoManifest:manifest,deriveDependencies:dependencies,compilationProfile:PRODUCTION_PROFILE}),meta=JSON.parse(JSON.stringify(result.meta)),rows=cloneReview({source,meta});assert.equal(rows.length,1);assert.equal(rows[0].generator,'core::default::Default');assert.equal(rows[0].defaultSourceProof.unitSourceProof.selectedVariant.variant.name,'Selected');cloneRetain('unit-default-independent-context',{source,result,rows});
});
defaultUnitFailure('mirrored-source-aliased-overlap',(meta,fixture)=>{
 fixture.source+='use Choice as Alias;impl Alias{fn default()->Self{Self::First}}';const sha=hash(fixture.source);meta.sources[0].sha256=sha;for(const proof of defaultUnitProofs(meta)){proof.sourceSha256=sha;proof.unitSourceProof.sourceSha256=sha;}
});
defaultUnitFailure('mirrored-missing-unit-source-proof',meta=>{for(const proof of defaultUnitProofs(meta))delete proof.unitSourceProof;});
defaultUnitFailure('mirrored-foreign-unit-source-proof',meta=>{
 const foreign=defaultUnitRow(defaultUnitFixtures.get('four').meta).defaultSourceProof.unitSourceProof;for(const proof of defaultUnitProofs(meta))proof.unitSourceProof=structuredClone(foreign);
});
defaultUnitFailure('mirrored-copied-clone-source-in-default-proof',meta=>{for(const proof of defaultUnitProofs(meta))proof.unitSourceProof=structuredClone(cloneRow(meta).cloneSourceProof.unitSource);});
defaultUnitFailure('metadata-receiver-claim',meta=>defaultUnitRow(meta).receiver='shared');
defaultUnitFailure('metadata-runtime-authority',meta=>defaultUnitRow(meta).runtimeParity=true);
defaultUnitFailure('metadata-semantic-authority',meta=>defaultUnitRow(meta).semanticAuthority=true);
defaultUnitFailure('target-only-implementation-owner',meta=>defaultUnitTarget(meta).impl.type.path=['crate','Other']);
