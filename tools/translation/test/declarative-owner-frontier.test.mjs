import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {compileDeclarativeMacro,expandDeclarativeMacro,declarativeSubInput,declarativeDefinitionHeader} from '../declarative-macros.mjs';
import {loadDeclarativeSourceProof,taskLocalSourceDefinitions,standardThreadLocalSourceDefinitions} from '../declarative-source-profile.mjs';
import {originalMacroTrees} from '../macro-token-trees.mjs';
import {inspectDeclarativeExpansionClosure} from '../declarative-closure.mjs';
import {extractDeclarativeOwnerFrontier,isDeclarativeOwnerFrontier} from '../declarative-owner-frontier.mjs';
const root=new URL('../../../',import.meta.url);
function dependencies(){return loadDeclarativeSourceProof({manifest:readFileSync(new URL('Cargo.toml',root),'utf8'),lock:readFileSync(new URL('Cargo.lock',root),'utf8')});}
function nestedPath(expansion,name){const index=expansion.trees.findIndex((tree,index)=>tree.text===name&&expansion.trees[index+1]?.text==='!');assert.ok(index>=0);return [index+2];}

test('original macro headers retain custom attributes without self-authorizing their export or hygiene',()=>{
  const source='#[unknown] #[macro_export] macro_rules! named {()=>{}}';
  const definition=compileDeclarativeMacro(source,{name:'named',owner:['fixture']}),header=declarativeDefinitionHeader(definition);
  assert.equal(header.kind,'macro_rules');assert.equal(header.name,'named');assert.equal(header.span.start,0);assert.equal(header.span.end,source.length);
  assert.deepEqual(header.attributes.map(entry=>entry.tokens[0].text),['unknown','macro_export']);assert.equal(header.hygieneVerified,false);assert.equal(header.attributeOwnersResolved,false);
  assert.throws(()=>declarativeDefinitionHeader(structuredClone(definition)),/Unsealed/);
});

test('actual Tokio and standard leaf candidates preserve phase attributes and reject supplied closed scopes',()=>{
  const proof=dependencies(),defs=taskLocalSourceDefinitions(proof),front=expandDeclarativeMacro(defs.get('task_local'),originalMacroTrees('static VALUE:u8;'));
  const inner=expandDeclarativeMacro(defs.get('__task_local_inner'),declarativeSubInput(front,nestedPath(front,'__task_local_inner')));
  const closure=inspectDeclarativeExpansionClosure({dependencies:proof,root:front,expansions:[front,inner]}),candidate=extractDeclarativeOwnerFrontier({dependencies:proof,closure});
  assert.equal(isDeclarativeOwnerFrontier(candidate),true);assert.equal(isDeclarativeOwnerFrontier(structuredClone(candidate)),false);
  assert.ok(candidate.definitions.every(entry=>entry.writtenMacroExport&&entry.exportOwnerVerified===false));
  assert.ok(candidate.definitions.find(entry=>entry.name==='task_local').attributes.some(entry=>entry.name==='cfg_attr'));
  assert.equal(candidate.calls[0].candidates[0].writtenFinalNameMatches,true);assert.equal(candidate.calls[0].callOwnerResolved,false);
  const standard=standardThreadLocalSourceDefinitions(proof);
  for(const branch of ['no_threads','native','os']) {
    const header=declarativeDefinitionHeader(standard.get(branch));assert.equal(header.kind,'macro');assert.ok(header.visibility);
    assert.ok(header.attributes.some(attribute=>attribute.tokens[0].text==='rustc_macro_transparency'&&attribute.tokens[2].text==='"semitransparent"'));
    assert.equal(header.hygieneVerified,false);
  }
  assert.throws(()=>extractDeclarativeOwnerFrontier({dependencies:proof,closure,closedScope:true}),/Caller-supplied/);
  assert.throws(()=>extractDeclarativeOwnerFrontier({dependencies:proof,closure:structuredClone(closure)}),/privately sealed/);
  assert.equal(candidate.ownerVerified,false);assert.equal(candidate.generatedBehavior,false);assert.ok(Object.values(candidate.dimensions).every(value=>value===false));
});
