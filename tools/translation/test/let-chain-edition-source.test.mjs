import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
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
