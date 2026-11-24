// Independent macro expansion and refusal SOURCE. Nothing runs in draft phase.
import test from 'node:test';
import assert from 'node:assert/strict';
import {proposeLocalDeclarativeSource} from '../local-declarative-source.mjs';
import {translateLocalDeclarativeProject} from '../local-declarative-project.mjs';
import {prepareLocalDeclarativeSources} from '../prepare-local-declarative-sources.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const limits={timeout:60000};
const definition='macro_rules! make { ($name:ident,$ty:ty,$value:literal) => {pub fn $name()->$ty{$value}} }\n';
const propose=source=>proposeLocalDeclarativeSource({source,sourcePath:'rust/src/lib.rs'});
test('actual ident type and literal captures expand complete root calls and preserve original definitions',limits,()=>{
 const source='// keep source\r\n'+definition+'make!(seven,u8,7);\r\nmake!{enabled,bool,true}\n',result=propose(source);
 assert.equal(result.edits.length,2);assert.equal(result.refusals.length,0);assert.ok(result.after.includes(definition));assert.match(result.after,/pub fn seven\s*\(\)\s*->\s*u8\s*\{\s*7\s*\}/u);assert.match(result.after,/pub fn enabled\s*\(\)\s*->\s*bool\s*\{\s*true\s*\}/u);assert.equal(result.history.inverse,source);assert.equal(result.namespaceAuthority,false);assert.equal(result.semanticAuthority,false);assert.equal(result.receivingExecuted,false);assert.deepEqual(result.ruleTrace.map(row=>row.phase),['language','language','language','repository']);
});
test('private recursive forwarding expands only surviving inputs before considering inner calls',limits,()=>{
 const source='macro_rules! ignore { ($input:tt) => {} }\nmacro_rules! outer { ($name:ident,$value:literal) => {make!($name,u8,$value);} }\n'+definition+'ignore!((unresolved!(never_run)));\nouter!(nine,9);\n',result=propose(source);
 assert.equal(result.edits.length,2);assert.equal(result.edits[0].after,';');assert.equal(result.edits[1].expansion.receipts.length,1);assert.equal(result.edits[1].expansion.receipts[0].lineage.sourceAssociationKind,'checked-nested-macro-input');assert.match(result.after,/pub fn nine\s*\(\)\s*->\s*u8\s*\{\s*9\s*\}/u);assert.equal(result.history.inverse,source);
});
test('latest preceding textual definition wins and unresolved producers invalidate earlier lexical candidates',limits,()=>{
 const source=definition+'make!(one,u8,1);\nexternal!();\nmake!(two,u8,2);\n'+definition+'make!(three,u8,3);\n',result=propose(source);
 assert.deepEqual(result.edits.map(row=>row.before),['make!(one,u8,1);','make!(three,u8,3);']);assert.ok(result.after.includes('make!(two,u8,2);'));assert.equal(result.refusals.length,2);assert.equal(result.status,'partial-source-proposal');
});
test('captured identifier collisions generated binders attributes unknown recursive macros and dollar-crate stay original',limits,()=>{
 for(const source of [
  'macro_rules! m {($name:ident)=>{pub fn $name(x:u8)->u8{x}}}\nm!(x);',
  'macro_rules! m {($name:ident)=>{#[unknown]pub fn $name()->bool{true}}}\nm!(chosen);',
  'macro_rules! m {()=>{unknown!();}}\nm!();',
  'macro_rules! m {()=>{$crate::unknown!();}}\nm!();',
  'macro_rules! m {()=>{macro_rules! nested {()=>{}}}}\nm!();',
  '#![unknown]\n'+definition+'make!(one,u8,1);',
  definition+'#[unknown]make!(one,u8,1);',
  definition+'/// attached documentation\nmake!(one,u8,1);',
  definition+'crate::make!(one,u8,1);',
 ]){const result=propose(source);assert.equal(result.edits.length,0,source);assert.equal(result.after,source);assert.ok(result.refusals.length>0,source);assert.equal(result.history.inverse,source);}
});
test('nested original function calls and macro definitions stay unchanged rather than becoming eager root expansions',limits,()=>{
 const source=definition+'pub fn original()->u8{make!(local,u8,1);local()}\npub mod child{make!(nested,u8,2);}\n',result=propose(source);assert.equal(result.after,source);assert.equal(result.edits.length,0);assert.equal(result.history.inverse,source);
});
test('complete macro input containing ordinary item keywords remains a root macro call',limits,()=>{
 const source='macro_rules! identity {($item:item)=>{$item}}\nidentity!(pub fn answer()->u8{42});',result=propose(source);assert.equal(result.edits.length,1);assert.match(result.after,/pub fn answer/u);assert.equal(result.history.inverse,source);
});
test('original compiler checks expanded source and emitted JavaScript plus strict TypeScript independently',limits,async()=>{
 const source=definition+'make!(seven,u8,7);\nmake!(enabled,bool,true);\n',options={entry:'rust/src/lib.rs',paths:['rust/src/lib.rs'],readSource:()=>source},result=translateLocalDeclarativeProject(options);
 assert.equal(result.sourceExpansion.originalSourceEquivalenceQualified,false);assert.equal(result.sourceExpansion.compilerSourceDomain,'expanded-source');assert.equal(result.sourceExpansion.sourceInputs[0].source,source);assert.equal(result.sourceExpansion.proposals[0].history.inverse,source);assert.equal(result.meta.runtimeParity,false);
 await verifyTypedTargets(result,api=>{assert.equal(api.seven(),7n);assert.equal(api.enabled(),true);},{childTimeoutMs:20000});
});
test('source freshness changed readers unknown options sparse paths and caller proof injection refuse',limits,()=>{
 const source=definition+'make!(seven,u8,7);',options={entry:'rust/src/lib.rs',paths:['rust/src/lib.rs'],readSource:()=>source};let reads=0;
 assert.throws(()=>translateLocalDeclarativeProject({...options,readSource:()=>++reads===1?source:source+'\n'}),/changed/u);assert.throws(()=>translateLocalDeclarativeProject({...options,macroContext:{}}),/option/u);assert.throws(()=>translateLocalDeclarativeProject({...options,paths:Array(1)}),/own/u);assert.throws(()=>proposeLocalDeclarativeSource({source,sourcePath:'../lib.rs'}));assert.throws(()=>proposeLocalDeclarativeSource({source:'\ud800',sourcePath:'rust/src/lib.rs'}),/well-formed/u);
});
test('complete original engine copy retains native function selections both rule sequences and full inverse',limits,()=>{
 const plan=prepareLocalDeclarativeSources();assert.equal(plan.files.length,3);assert.equal(plan.receivingExecuted,false);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}
 const engine=plan.files.find(row=>row.path==='tools/translation/local-declarative-macro-engine.mjs');assert.equal(engine.originalPath,'tools/translation/source-profiles/local-declarative/originals/declarative-macro-engine.mjs.txt');assert.ok(engine.before.includes('export function createDeclarativeMacroEngine'));assert.ok(engine.after.includes('renderLocalDeclarativeExpansion'));assert.ok(engine.after.includes('disjoint captured and literal identifiers'));
});
