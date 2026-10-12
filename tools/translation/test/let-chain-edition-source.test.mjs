import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {planRegeneration,applyRegenerationPlan} from '../bulk.mjs';
import {captureSourceCorpus} from '../source-corpus.mjs';
import {translateProject} from '../project.mjs';
import {translateSource} from '../translate.mjs';
import {parseProgram} from '../semantic-meta.mjs';
import {verifyTypedTargets as verifyActualTypedTargets} from './typed-targets.mjs';
const verifyTypedTargets=(result,verify)=>verifyActualTypedTargets(result,verify,{childTimeoutMs:30_000});
const cargo=edition=>`[package]\nname="edition-fixture"\nversion="0.1.0"\nedition="${edition}"\n`;
const hash=source=>createHash('sha256').update(source).digest('hex');
const some=field0=>Object.freeze({$:'Some',field0}),none=Object.freeze({$:'None'});
const project=(files,cargoManifest)=>translateProject({entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path],cargoManifest});
const chains=(value,found=[])=>{if(!value||typeof value!=='object')return found;if(value.patternControl?.kind==='let-chain')found.push(value);for(const [key,child]of Object.entries(value))if(!['type','span','patternControl'].includes(key))if(Array.isArray(child))child.forEach(item=>chains(item,found));else chains(child,found);return found;};

test('the original Cargo2024 context follows real inline and external module parsing',{timeout:30_000},async()=>{
  const files={'src/lib.rs':'mod external;mod inline{pub fn choose(v:Option<u8>)->u8{if let Some(n)=v && n>1u8{return n;}1u8}}pub fn left(v:Option<u8>)->u8{inline::choose(v)}pub fn right(v:Option<u8>)->u8{external::choose(v)}',
    'src/external.rs':'pub fn choose(v:Option<u8>)->u8{if let Some(n)=v && n>2u8{return n;}2u8}'};
  const manifest=cargo('2024'),result=project(files,manifest);assert.deepEqual(result.meta.refused,[]);
  const program=parseProgram(JSON.stringify(result.meta.checkedSemanticProgram));
  for(const name of ['inline.choose','external.choose']){
    const conditions=chains(program.declarations.get(name).body);assert.equal(conditions.length,1);
    assert.equal(conditions[0].patternControl.sourceCondition.editionInput.sourceSha256,hash(manifest));
    assert.equal(conditions[0].patternControl.sourceCondition.editionInput.edition,'2024');
    const declaration=conditions[0].patternControl.sourceCondition.editionInput.declaration;
    assert.equal(declaration.sha256,hash(manifest.slice(declaration.originalSpan.start,declaration.originalSpan.end)));
  }
  await verifyTypedTargets(result,api=>{assert.equal(api.left(some(3n)),3n);assert.equal(api.left(none),1n);assert.equal(api.right(some(3n)),3n);assert.equal(api.right(some(2n)),2n);assert.equal(api.right(none),2n);});
});

test('different absent and inherited source editions refuse only the compound let owner',()=>{
  const source='pub fn plain()->u8{7u8}pub fn bad(v:Option<u8>)->u8{if let Some(n)=v && n>0u8{return n;}0u8}';
  for(const manifest of [undefined,cargo('2015'),cargo('2018'),cargo('2021'),'[package]\nname="fixture"\n','[workspace.package]\nedition="2024"\n[package]\nname="fixture"\nedition.workspace=true\n']){
    const result=project({'src/lib.rs':source},manifest);assert.equal(result.meta.executable.some(entry=>entry.name==='bad'),false);
    assert.equal(result.meta.executable.some(entry=>entry.name==='plain'),true);
    assert.ok(result.meta.refused.some(entry=>entry.name==='bad'&&/source crate edition|original Cargo/u.test(entry.message)));
  }
});

test('genuine independently parsed original Copy method bodies receive the same Cargo source context',{timeout:30_000},async()=>{
  const source='#[derive(Clone,Copy)]pub struct Limit{base:u8}impl Limit{pub fn choose(self,v:Option<u8>)->u8{let mut answer:u8=self.base;if let Some(n)=v && n>self.base{answer=n;}answer}}pub fn run(base:u8,v:Option<u8>)->u8{Limit{base}.choose(v)}';
  const manifest=cargo('2024'),result=project({'src/lib.rs':source},manifest);assert.deepEqual(result.meta.refused,[]);
  assert.ok(result.meta.checkedMethods.some(entry=>entry.name==='Limit.choose'&&entry.receiver==='value'));
  const program=parseProgram(JSON.stringify(result.meta.checkedSemanticProgram)),method=[...program.declarations.values()].find(entry=>entry.impl?.method==='choose');
  assert.ok(method.sourceMethodProof);assert.equal(method.sourceMethodProof.copyAuthority,false);
  assert.equal(chains(method.body)[0].patternControl.sourceCondition.editionInput.sourceSha256,hash(manifest));
  await verifyTypedTargets(result,api=>{assert.equal(api.run(3n,some(8n)),8n);assert.equal(api.run(3n,some(2n)),3n);assert.equal(api.run(3n,none),3n);});
  const other=project({'src/lib.rs':source},cargo('2021'));assert.equal(other.meta.checkedMethods.some(entry=>entry.name==='Limit.choose'),false);assert.equal(other.meta.executable.some(entry=>entry.name==='run'),false);
});

test('standalone translation requires its explicit original manifest or genuine captured project scope',()=>{
  const source='pub fn select(v:Option<u8>)->u8{if let Some(n)=v && n>0u8{return n;}0u8}',path='src/lib.rs',manifest=cargo('2024');
  const unknown=translateSource(source,path);assert.equal(unknown.ir.items.find(entry=>entry.name==='select').status,'carried');
  assert.equal(unknown.ir.items.map(entry=>entry.source).join(''),source);assert.equal(unknown.ir.sourceSha256,hash(source));
  const explicit=translateSource(source,path,{cargoManifest:manifest});assert.equal(explicit.ir.items.find(entry=>entry.name==='select').status,'executable');
  const original=project({[path]:source},manifest),scoped=translateSource(source,path,{projectSourceScopes:original.sourceScopes,projectDeclarations:original.executableDeclarations});
  assert.equal(scoped.ir.items.find(entry=>entry.name==='select').status,'executable');assert.equal(scoped.ir.items.map(entry=>entry.source).join(''),source);
  const different=translateSource(source,path,{cargoManifest:cargo('2021')});assert.equal(different.ir.items.find(entry=>entry.name==='select').status,'carried');
});
test('bulk original project scopes inherit Cargo edition while unrelated tracked source keeps it unknown',{timeout:60_000},async()=>{
  const folder=mkdtempSync(join(tmpdir(),'router-let-chain-cargo-boundary-'));
  const primary='pub fn primary(v:Option<u8>)->u8{if let Some(n)=v && n>0u8{return n;}0u8}';
  const foreign='pub fn plain()->u8{7u8}pub fn unrelated(v:Option<u8>)->u8{if let Some(n)=v && n>0u8{return n;}0u8}';
  const files={'Cargo.toml':cargo('2024'),'src/lib.rs':primary,'archive/foreign.rs':foreign};
  try{
    for(const [path,source]of Object.entries(files)){mkdirSync(dirname(join(folder,path)),{recursive:true});writeFileSync(join(folder,path),source);}
    execFileSync('git',['init','--quiet'],{cwd:folder,stdio:'pipe',timeout:30_000});
    execFileSync('git',['add','--',...Object.keys(files)],{cwd:folder,stdio:'pipe',timeout:30_000});
    const paths=execFileSync('git',['ls-files','-z','--','*.rs'],{cwd:folder,encoding:'utf8',timeout:30_000}).split('\0').filter(Boolean);
    assert.deepEqual(paths,['archive/foreign.rs','src/lib.rs']);
    const corpus=captureSourceCorpus({root:folder,paths}),plan=planRegeneration({root:folder,sourceCorpus:corpus});
    assert.equal(plan.manifest.projects.length,1);assert.equal(plan.manifest.projects[0].entry,'src/lib.rs');
    assert.equal(plan.manifest.projects[0].executableFunctions,1);
    assert.deepEqual(applyRegenerationPlan(plan).failures,[]);
    const readTarget=(path,key)=>readFileSync(join(folder,plan.manifest.sources.find(item=>item.source===path).targets[key]),'utf8');
    const original=JSON.parse(readTarget('src/lib.rs','meta')),unrelated=JSON.parse(readTarget('archive/foreign.rs','meta'));
    assert.equal(original.items.find(item=>item.name==='primary').status,'executable');
    assert.equal(unrelated.items.find(item=>item.name==='plain').status,'executable');
    const carried=unrelated.items.find(item=>item.name==='unrelated');assert.equal(carried.status,'carried');
    assert.match(carried.diagnostic.message,/source crate edition|original Cargo/u);
    assert.equal(unrelated.items.map(item=>item.source).join(''),foreign);assert.equal(unrelated.sourceSha256,hash(foreign));
    for(const [path,verify]of [['src/lib.rs',api=>{assert.equal(api.primary(some(9n)),9n);assert.equal(api.primary(none),0n);}],['archive/foreign.rs',api=>{assert.equal(api.plain(),7n);assert.equal('unrelated' in api,false);}]]){
      await verifyTypedTargets({meta:{entry:path},javascript:readTarget(path,'javascript'),typescript:readTarget(path,'typescript')},verify);
    }
    assert.deepEqual(applyRegenerationPlan(plan,{check:true}).failures,[]);
  }finally{rmSync(folder,{recursive:true,force:true});}
});
