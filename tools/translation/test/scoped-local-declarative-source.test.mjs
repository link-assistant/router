// Independent scoped source/preprocessing cases. All remain unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {proposeLocalDeclarativeSource} from '../local-declarative-source.mjs';
import {proposeScopedLocalDeclarativeSource} from '../scoped-local-declarative-source.mjs';
import {translateScopedLocalDeclarativeProject} from '../scoped-local-declarative-project.mjs';
import {prepareScopedLocalDeclarativeSources} from '../prepare-scoped-local-declarative-sources.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const limits={timeout:60000},definition='macro_rules! chosen {($name:ident)=>{pub fn $name()->u8{7}}}\n';
const propose=source=>proposeScopedLocalDeclarativeSource({source,sourcePath:'rust/src/lib.rs'});
test('inline children inherit actual prior textual definitions while local shadows remain scoped',limits,()=>{
 const source='// 🌍 absolute spans\r\n'+definition+'pub mod first { chosen!(inherited); macro_rules! chosen {($name:ident)=>{pub fn $name()->u8{9}}} chosen!(shadowed); pub mod deep { chosen!(nested); } }\npub mod sibling { chosen!(separate); }\nchosen!(after);',result=propose(source);
 assert.equal(result.edits.length,5);assert.equal(result.refusals.length,0);assert.deepEqual(result.edits.map(row=>row.module),[['first'],['first'],['first','deep'],['sibling'],[]]);assert.match(result.edits[0].after,/\{\s*7\s*\}/u);assert.match(result.edits[1].after,/\{\s*9\s*\}/u);assert.match(result.edits[2].after,/\{\s*9\s*\}/u);assert.match(result.edits[3].after,/\{\s*7\s*\}/u);assert.match(result.edits[4].after,/\{\s*7\s*\}/u);
 for(const row of result.edits)assert.equal(source.slice(row.span.start,row.span.end),row.before);assert.equal(result.history.inverse,source);assert.equal(result.namespaceAuthority,false);assert.equal(result.semanticAuthority,false);assert.equal(result.receivingExecuted,false);assert.equal(result.crossInvocationCache,false);
 const legacy=proposeLocalDeclarativeSource({source,sourcePath:'rust/src/lib.rs'});assert.equal(legacy.edits.length,1);assert.equal(legacy.history.inverse,source);
});
test('definitions cannot appear before their source position or escape a child into parents and siblings',limits,()=>{
 for(const source of [
  'pub mod early { chosen!(missing); }\n'+definition,
  'pub mod owner {'+definition+'chosen!(present);}\nchosen!(missing);',
  'pub mod owner {'+definition+'}\npub mod other {chosen!(missing);}',
 ]){const result=propose(source);assert.ok(result.after.includes('chosen!(missing);'));assert.ok(result.refusals.some(row=>row.message.includes('preceding')));assert.equal(result.history.inverse,source);}
});
test('unknown child producers invalidate later inherited candidates until a new actual definition',limits,()=>{
 const source=definition+'pub mod one {unknown!(); chosen!(missing);}\nchosen!(later);\n'+definition+'pub mod recovered {chosen!(present);}',result=propose(source);assert.equal(result.edits.length,1);assert.deepEqual(result.edits[0].module,['recovered']);assert.ok(result.after.includes('chosen!(missing);'));assert.ok(result.after.includes('chosen!(later);'));assert.equal(result.history.inverse,source);
});
test('attributes macro_use hygiene generated binders and qualified owners retain complete original source',limits,()=>{
 for(const source of [
  definition+'#[unknown]pub mod child{chosen!(blocked);}',
  definition+'#[macro_use]pub mod child{chosen!(blocked);}',
  definition+'pub mod child{#![unknown]chosen!(blocked);}',
  definition+'/// child docs\npub mod child{chosen!(blocked);}',
  definition+'pub mod child{crate::chosen!(blocked);}',
  'mod child{macro_rules! make{($name:ident)=>{pub fn $name(value:u8)->u8{value}}}make!(value);}',
  'mod child{macro_rules! make{()=>{macro_rules! generated{()=>{}}}}make!();}',
 ]){const result=propose(source);assert.equal(result.edits.length,0,source);assert.equal(result.after,source);assert.ok(result.refusals.length>0,source);assert.equal(result.history.inverse,source);}
});
test('scoped project re-enters original semantic compiler for emitted JS and strict TS',limits,async()=>{
 const source=definition+'pub mod child{chosen!(seven);}pub fn answer()->u8{child::seven()}',result=translateScopedLocalDeclarativeProject({entry:'rust/src/lib.rs',paths:['rust/src/lib.rs'],readSource:()=>source});assert.equal(result.sourceExpansion.proposals[0].edits.length,1);assert.equal(result.sourceExpansion.compilerSourceDomain,'expanded-source');assert.equal(result.sourceExpansion.originalSourceEquivalenceQualified,false);assert.equal(result.sourceExpansion.originalApplicationCoverageQualified,false);assert.equal(result.sourceExpansion.proposals[0].history.inverse,source);await verifyTypedTargets(result,api=>assert.equal(api.answer(),7n),{childTimeoutMs:20000});
});
test('fresh source composition invalid options and complete source-copy inverses remain required',limits,()=>{
 const source=definition+'pub mod child{chosen!(seven);}',options={entry:'rust/src/lib.rs',paths:['rust/src/lib.rs'],readSource:()=>source};let reads=0;assert.throws(()=>translateScopedLocalDeclarativeProject({...options,readSource:()=>++reads===1?source:source+'\n'}),/changed/u);assert.throws(()=>translateScopedLocalDeclarativeProject({...options,macroContext:{}}),/option/u);assert.throws(()=>proposeScopedLocalDeclarativeSource({source,sourcePath:'../lib.rs'}));
 const plan=prepareScopedLocalDeclarativeSources();assert.equal(plan.files.length,3);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
