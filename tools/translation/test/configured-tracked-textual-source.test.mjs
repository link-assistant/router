// Independent profile-selected textual source SOURCE. Every case unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {proposeConfiguredTrackedTextualSources,proposeModuleMacroUseTrackedLocalDeclarativeSources} from '../tracked-local-declarative-source.mjs';
import {translateConfiguredTrackedLocalDeclarativeProject} from '../configured-tracked-local-declarative-project.mjs';
import {originalFreshConditionalAttributeSourceInputs} from '../conditional-attributes.mjs';
import {originalTextualConfigurationSourcePlan} from '../derive-ancestor-attribute-scope.mjs';
import {prepareConfiguredTrackedTextualSources} from '../prepare-configured-tracked-textual-sources.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const limits={timeout:60000},entry='rust/src/lib.rs',profile={flags:{test:false}};
function input(files,extra={}){return {entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:profile,...extra};}
const definition='macro_rules! chosen {($name:ident)=>{pub fn $name()->u8{7}}}\n';
function sources(){return {
 [entry]:'#[cfg(any())]unknown!();#[cfg(all())]#[macro_use]pub mod helpers;chosen!(after);pub fn answer()->u8{after()}',
 'rust/src/helpers.rs':'#[cfg(test)]macro_rules! chosen {($name:ident)=>{pub fn $name()->u8{19}}}\n#[cfg(not(test))]'+definition,
};}
test('actual explicit profile source rules retain inactive node and active attribute inverses before tracked macro expansion',limits,()=>{
 const files=sources(),conditioning=proposeConfiguredTrackedTextualSources(input(files));assert.equal(conditioning.refusals.length,0);assert.equal(conditioning.selections.filter(row=>row.kind==='inactive-original-item').length,2);assert.equal(conditioning.selections.filter(row=>row.kind==='active-original-cfg').length,2);assert.equal(conditioning.files.length,2);for(const row of conditioning.files){assert.equal(row.before,files[row.sourcePath]);assert.equal(row.history.inverse,row.before);for(const edit of row.edits)assert.equal(row.before.slice(...edit.span),edit.expected);}const selected=new Map(conditioning.files.map(row=>[row.sourcePath,row.after])),expanded=proposeModuleMacroUseTrackedLocalDeclarativeSources(input(Object.fromEntries(selected)));assert.equal(expanded.edits.length,1);assert.equal(expanded.refusals.length,0);assert.match(expanded.edits[0].after,/\{\s*7\s*\}/u);assert.equal(conditioning.namespaceAuthority,false);assert.equal(conditioning.semanticAuthority,false);assert.equal(conditioning.originalSourceEquivalenceQualified,false);assert.equal(conditioning.compilerDiagnosticTracePreserved,false);assert.equal(conditioning.receivingExecuted,false);assert.equal(conditioning.crossInvocationCache,false);
});
test('a validated false cfg_attr removes only its actual original source span and retains other passive attributes',limits,()=>{
 const source='#[cfg_attr(test, unknown::producer("original"))]#[allow(dead_code)]'+definition+'chosen!(selected);',result=proposeConfiguredTrackedTextualSources(input({[entry]:source}));assert.equal(result.selections.length,1);assert.equal(result.selections[0].kind,'absent-original-cfg-attr');assert.ok(result.files[0].after.startsWith('#[allow(dead_code)]'));assert.equal(result.files[0].history.inverse,source);assert.ok(result.originalCompilerSource);assert.ok(result.conditionalAttributeSource);assert.equal(result.refusals.length,0);
});
test('inline inactive parents remove their complete original subtree without overlapping descendant substitutions',limits,()=>{
 const source='#[cfg(any())]pub mod hidden{#[cfg(all())]unknown!();}#[cfg(all())]pub mod active{#[cfg(all())]'+definition+'chosen!(selected);}',result=proposeConfiguredTrackedTextualSources(input({[entry]:source}));assert.equal(result.selections.filter(row=>row.kind==='inactive-original-item').length,1);assert.equal(result.selections.filter(row=>row.kind==='active-original-cfg').length,2);const edits=result.files[0].edits;for(let index=1;index<edits.length;index++)assert.ok(edits[index-1].span[1]<=edits[index].span[0]);assert.doesNotMatch(result.files[0].after,/unknown!/u);assert.equal(result.files[0].history.inverse,source);
});
test('unknown conditions inner producers active conditional attributes docs and unknown outer owners retain source refusals',limits,()=>{
 for(const source of [
  '#[cfg(unix)]'+definition,
  '#[cfg_attr(unix, unknown)]'+definition,
  '#[cfg_attr(all(), unknown)]'+definition,
  '#[unknown]#[cfg(all())]'+definition,
  '#![unknown]\n#[cfg(all())]'+definition,
  '/// exact attached documentation\n#[cfg(any())]pub fn hidden()->bool{true}',
  '#[cfg(all(true))]'+definition,
 ]){const result=proposeConfiguredTrackedTextualSources(input({[entry]:source}));assert.ok(result.refusals.length>0,source);assert.equal(result.files[0].after,source,source);assert.equal(result.files[0].history.inverse,source);}
 const inactiveUnknown='#[unknown]#[cfg(any())]pub fn hidden()->bool{true}',absent=proposeConfiguredTrackedTextualSources(input({[entry]:inactiveUnknown}));assert.equal(absent.files[0].after,'');assert.equal(absent.refusals.length,0);
});
test('complete fresh conditional grammar and actual native source branches remain data without global verdict caches',limits,()=>{
 const grammar=originalFreshConditionalAttributeSourceInputs();assert.ok(grammar.sources.length>0);for(const row of grammar.sources)assert.equal(row.inverse,row.source);assert.equal(grammar.crossInvocationCache,false);assert.equal(grammar.namespaceAuthority,false);const native=originalTextualConfigurationSourcePlan();assert.match(native.selections.cfgTrue.original,/attr::cfg_matches/u);assert.match(native.selections.expandCfgAttr.original,/return vec!\[trace_attr\]/u);assert.equal(native.requiresExplicitThreeValuedProfile,true);assert.equal(native.compilerDiagnosticTracePreserved,false);assert.equal(native.namespaceAuthority,false);assert.ok(native.retainedSourceBytes+grammar.retainedSourceBytes<=8388608);
});
test('the complete copied project retains original configured and expanded histories and checks independent JS and strict TS',limits,async()=>{
 const files=sources(),result=translateConfiguredTrackedLocalDeclarativeProject(input(files));assert.equal(result.sourceExpansion.conditioning.selections.length,4);assert.equal(result.sourceExpansion.moduleExpansion.edits.length,1);for(const row of result.sourceExpansion.proposals){assert.equal(row.before,files[row.sourcePath]);assert.equal(row.history.inverse,row.before);assert.equal(row.configurationHistory.inverse,row.before);assert.equal(row.macroHistory.inverse,result.sourceExpansion.conditioning.files.find(file=>file.sourcePath===row.sourcePath).after);}assert.equal(result.sourceExpansion.originalSourceEquivalenceQualified,false);assert.equal(result.sourceExpansion.originalApplicationCoverageQualified,false);await verifyTypedTargets(result,api=>{assert.equal(api.after(),7n);assert.equal(api.answer(),7n);},{childTimeoutMs:20000});
});
test('source snapshots and explicit profiles cannot change between source selection and complete project checking',limits,()=>{
 const files=sources(),options=input(files);let reads=0;assert.throws(()=>proposeConfiguredTrackedTextualSources({...options,readSource:path=>++reads>Object.keys(files).length?files[path]+'\n':files[path]}),/changed/u);const changing={flags:{test:false}};let cfgReads=0;assert.throws(()=>proposeConfiguredTrackedTextualSources({...options,compilationProfile:changing,readSource:path=>{if(++cfgReads===Object.keys(files).length+1)changing.flags.test=true;return files[path];}}),/profile changed/u);
 const projectProfile={flags:{test:false}};let projectReads=0;assert.throws(()=>translateConfiguredTrackedLocalDeclarativeProject({...options,compilationProfile:projectProfile,readSource:path=>{if(++projectReads===Object.keys(files).length+1)projectProfile.flags.test=true;return files[path];}}),/profile changed/u);assert.throws(()=>proposeConfiguredTrackedTextualSources({...options,savedConditionalProof:{namespaceAuthority:true}}),/option/u);
});
test('six complete configured textual equations retain both source sequences native owners and full inverses',limits,()=>{
 const plan=prepareConfiguredTrackedTextualSources();assert.equal(plan.files.length,6);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
