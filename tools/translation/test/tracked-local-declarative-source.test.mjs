// Independent multi-file textual scope SOURCE. Every new case remains unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {proposeTrackedLocalDeclarativeSources} from '../tracked-local-declarative-source.mjs';
import {translateTrackedLocalDeclarativeProject} from '../tracked-local-declarative-project.mjs';
import {translateAttributedScopedLocalDeclarativeProject} from '../attributed-scoped-local-declarative-project.mjs';
import {proposeTrackedLocalDeclarativeSources as publicPropose,translateTrackedLocalDeclarativeProject as publicTranslate} from '../source-synchronization.mjs';
import {prepareTrackedLocalDeclarativeSources} from '../prepare-tracked-local-declarative-sources.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const limits={timeout:60000},entry='rust/src/lib.rs';
const definition='#[allow(unused_macros)]macro_rules! chosen {($name:ident)=>{pub fn $name()->u8{7}}}\n';
function input(files,extra={}){return {entry,paths:Object.keys(files),readSource:path=>files[path],...extra};}
function sources(){return {
 [entry]:'// 🌍 full physical source\r\n'+definition+'pub mod first; pub mod second; chosen!(after); pub fn answer()->u8{first::inherited()}',
 'rust/src/first.rs':'chosen!(inherited); macro_rules! chosen {($name:ident)=>{pub fn $name()->u8{9}}} chosen!(shadowed); pub mod nested;',
 'rust/src/first/nested.rs':'chosen!(nested);',
 'rust/src/second.rs':'chosen!(separate);',
 'rust/src/unreferenced.rs':'chosen!(unreferenced);',
};}
test('external physical modules inherit only actual preceding definitions while child shadows stay scoped',limits,()=>{
 const files=sources(),result=proposeTrackedLocalDeclarativeSources(input(files));assert.equal(result.edits.length,5);assert.equal(result.refusals.length,0);assert.equal(result.status,'source-proposal');assert.deepEqual(result.edits.map(row=>row.module),[['first'],['first'],['first','nested'],['second'],[]]);const byName=new Map(result.edits.map(row=>[row.name+':'+row.before,row]));assert.equal(byName.size,5);for(const row of result.edits)assert.equal(files[row.sourcePath].slice(row.span.start,row.span.end),row.before);assert.match(result.edits[0].after,/\{\s*7\s*\}/u);assert.match(result.edits[1].after,/\{\s*9\s*\}/u);assert.match(result.edits[2].after,/\{\s*9\s*\}/u);assert.match(result.edits[3].after,/\{\s*7\s*\}/u);assert.match(result.edits[4].after,/\{\s*7\s*\}/u);assert.equal(result.files.length,Object.keys(files).length);for(const row of result.files){assert.equal(row.before,files[row.sourcePath]);assert.equal(row.history.inverse,row.before);}assert.equal(result.files.find(row=>row.sourcePath.endsWith('unreferenced.rs')).after,files['rust/src/unreferenced.rs']);assert.equal(result.originalGraph.edges.length,3);assert.equal(result.namespaceAuthority,false);assert.equal(result.semanticAuthority,false);assert.equal(result.crossInvocationCache,false);assert.equal(result.receivingExecuted,false);
});
test('mixed inline and external views retain actual full module paths and parent definition timing',limits,()=>{
 const files={[entry]:definition+'pub mod group{pub mod child;} chosen!(after);','rust/src/group/child.rs':'chosen!(selected);pub mod nested{chosen!(nested);}'},result=proposeTrackedLocalDeclarativeSources(input(files));assert.equal(result.refusals.length,0);assert.deepEqual(result.edits.map(row=>row.module),[['group','child'],['group','child','nested'],[]]);assert.equal(result.originalGraph.edges.filter(row=>row.kind==='original-inline-module').length,2);
 const early={[entry]:'pub mod early;'+definition,'rust/src/early.rs':'chosen!(missing);'},late=proposeTrackedLocalDeclarativeSources(input(early));assert.equal(late.edits.length,0);assert.equal(late.files.find(row=>row.sourcePath.endsWith('early.rs')).after,early['rust/src/early.rs']);assert.ok(late.refusals.some(row=>row.message.includes('preceding')));
});
test('ordinary external children cannot export local textual definitions to their parent or siblings',limits,()=>{
 const files={[entry]:'pub mod owner;pub mod sibling;chosen!(parent);','rust/src/owner.rs':definition+'chosen!(present);','rust/src/sibling.rs':'chosen!(missing);'},result=proposeTrackedLocalDeclarativeSources(input(files));assert.equal(result.edits.length,1);assert.deepEqual(result.edits[0].module,['owner']);assert.ok(result.files.find(row=>row.sourcePath===entry).after.includes('chosen!(parent)'));assert.ok(result.files.find(row=>row.sourcePath.endsWith('sibling.rs')).after.includes('chosen!(missing)'));
});
test('unknown child producers invalidate later parent candidates and fresh original definitions can recover',limits,()=>{
 const files={[entry]:definition+'pub mod child; chosen!(blocked);'+definition+'chosen!(recovered);','rust/src/child.rs':'unknown!();chosen!(missing);'},result=proposeTrackedLocalDeclarativeSources(input(files));assert.equal(result.edits.length,1);assert.ok(result.edits[0].before.includes('recovered'));assert.ok(result.refusals.some(row=>row.sourcePath.endsWith('child.rs')));assert.ok(result.files.find(row=>row.sourcePath===entry).after.includes('chosen!(blocked)'));
});
test('macro_use exports unknown attributes inner producers unresolved files and original cycles retain refusals',limits,()=>{
 for(const files of [
  {[entry]:definition+'#[macro_use]pub mod child; chosen!(blocked);','rust/src/child.rs':'chosen!(inside);'},
  {[entry]:definition+'#[unknown]pub mod child; chosen!(blocked);','rust/src/child.rs':'chosen!(inside);'},
  {[entry]:definition+'pub mod child; chosen!(blocked);','rust/src/child.rs':'#![unknown]chosen!(inside);'},
  {[entry]:definition+'pub mod missing; chosen!(blocked);'},
  {[entry]:definition+'#[path="lib.rs"]pub mod child; chosen!(blocked);'},
 ]){const result=proposeTrackedLocalDeclarativeSources(input(files));assert.ok(result.refusals.length>0);assert.equal(result.edits.length,0);for(const row of result.files){assert.equal(row.after,row.before);assert.equal(row.history.inverse,row.before);}}
});
test('the complete copied project checks reconstructed multi-file source and independent JS and strict TS targets',limits,async()=>{
 const files=sources(),result=translateTrackedLocalDeclarativeProject(input(files));assert.equal(result.sourceExpansion.moduleExpansion.edits.length,5);assert.equal(result.sourceExpansion.proposals.length,Object.keys(files).length);assert.equal(result.sourceExpansion.compilerSourceDomain,'expanded-source');assert.equal(result.sourceExpansion.originalSourceEquivalenceQualified,false);assert.equal(result.sourceExpansion.originalApplicationCoverageQualified,false);for(const row of result.sourceExpansion.proposals)assert.equal(row.history.inverse,files[row.sourcePath]);await verifyTypedTargets(result,api=>{assert.equal(api.answer(),7n);assert.equal(api.after(),7n);},{childTimeoutMs:20000});assert.strictEqual(publicPropose,proposeTrackedLocalDeclarativeSources);assert.strictEqual(publicTranslate,translateTrackedLocalDeclarativeProject);
 const legacy=translateAttributedScopedLocalDeclarativeProject(input({[entry]:definition+'chosen!(legacy);'}));assert.equal(legacy.sourceExpansion.moduleExpansion,undefined);assert.equal(legacy.sourceExpansion.proposals[0].edits.length,1);
});
test('source readers snapshots paths and physical multi-owner edits remain fresh and bounded',limits,()=>{
 const files=sources(),options=input(files);let reads=0;assert.throws(()=>proposeTrackedLocalDeclarativeSources({...options,readSource:path=>{if(path===entry&&++reads>1)return files[path]+'\n';return files[path];}}),/changed/u);assert.throws(()=>proposeTrackedLocalDeclarativeSources({...options,macroContext:{}}),/option/u);assert.throws(()=>proposeTrackedLocalDeclarativeSources({...options,paths:[entry,entry]}));const holes=[];holes.length=1;assert.throws(()=>proposeTrackedLocalDeclarativeSources({...options,paths:holes}));assert.throws(()=>proposeTrackedLocalDeclarativeSources({...options,entry:'../lib.rs'}));
 const shared={[entry]:definition+'#[path="shared.rs"]pub mod one;#[path="shared.rs"]pub mod two;','rust/src/shared.rs':'chosen!(same);'};const refused=proposeTrackedLocalDeclarativeSources(input(shared));assert.ok(refused.refusals.length>0);assert.equal(refused.edits.length,0);
});
test('four complete tracked textual source equations retain both sequences native owners and full inverses',limits,()=>{
 const plan=prepareTrackedLocalDeclarativeSources();assert.equal(plan.files.length,4);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
