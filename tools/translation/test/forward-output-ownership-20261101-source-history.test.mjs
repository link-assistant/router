// Independent complete runtime-import/current-source chronology case SOURCE.
// UNRUN. Actual original producers/checkers run only when this case is invoked.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {exportPartitionedTranslatorBundle} from '../partitioned-export-bundle.mjs';
import {prepareOwnedRuntimeImportEdges} from '../prepare-owned-runtime-import-edges.mjs';
import {withFixedForwardWriterSources,proposeForwardOutputOwnershipSourceHistory} from '../forward-output-ownership-20261101-source-history.mjs';
import {resolveForwardSourceEquation} from '../forward-output-ownership-20261101-source-equation-bank.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const ROOT=fileURLToPath(new URL('../../../',import.meta.url)),P='tools/translation/source-profiles/forward-output-ownership-20261101/',LIMIT=3600000;
function receiving(t){const parent=fs.realpathSync(fs.mkdtempSync(join(tmpdir(),'router-forward-current-source-'))),root=join(parent,'receiver');t.after(()=>fs.rmSync(parent,{recursive:true,force:true}));exportPartitionedTranslatorBundle({sourceRoot:ROOT,output:root});fs.mkdirSync(join(root,'js/node_modules'),{recursive:true});const require=createRequire(join(ROOT,'js/package.json'));fs.symlinkSync(dirname(require.resolve('typescript/package.json')),join(root,'js/node_modules/typescript'),'dir');return root;}
function profile(root){return JSON.parse(fs.readFileSync(join(root,P,'complete-source-equations.json'),'utf8'));}
for(const state of ['birth','predecessor','current'])test('complete original runtime-import producer retains four historical rows and exact '+state+' successor equations',{timeout:LIMIT},t=>{
 const root=receiving(t),cohort=profile(root),targets=cohort.files.filter(row=>Object.hasOwn(row,'originalProducerSource'));assert.equal(targets.length,3);
 for(const row of targets)fs.writeFileSync(join(root,row.path),state==='birth'?row.originalProducerSource:state==='predecessor'?row.before:row.after);
 const plan=prepareOwnedRuntimeImportEdges({root});assert.equal(plan.files.length,4);assert.equal(plan.currentFiles.length,4);assert.equal(plan.allOriginalFreshSourceAndHashSitesRetained,true);
 for(const old of plan.files){assert.equal(old.inverse,old.before);assert.deepEqual(old.stages.map(row=>row.phase),['language','repository']);assert.deepEqual(old.trace,old.stages.flatMap(row=>row.trace));let source=old.before;for(const stage of old.stages){assert.equal(stage.before,source);assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,source);source=stage.after;assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,source);}assert.equal(source,old.after);assert.ok(old.nativeCopies.every(row=>row.completeNativeAstCopy));}
 for(const fixed of targets){const old=plan.files.find(row=>row.path===fixed.path),current=plan.currentFiles.find(row=>row.path===fixed.path);assert.equal(old.before,fixed.originalProducerSource);assert.equal(old.after,fixed.before);assert.equal(current.after,fixed.after);assert.equal(old.currentAfter,fixed.after);assert.ok(current.currentSourceDataBank);assert.ok(current.currentSourceEquation);const target=resolveForwardSourceEquation(current);assert.equal(target.before,state==='birth'?fixed.originalProducerSource:state==='predecessor'?fixed.before:fixed.after);assert.equal(target.after,fixed.after);assert.deepEqual(target.trace.map(row=>row.phase),['language','repository']);assert.equal(target.inverse,target.before);assert.equal(current.currentSourceEquation.proposalOnly,true);assert.equal(current.currentSourceEquation.activeCompilerQualification,false);}
 withFixedForwardWriterSources(root,history=>state==='current'?history.requireActive():assert.throws(()=>history.requireActive(),/proposal-only/));
});
test('unknown compiler successor source refuses before any target mutation',{timeout:LIMIT},t=>{
 const root=receiving(t),fixed=profile(root).files.find(row=>Object.hasOwn(row,'originalProducerSource')),unknown='// independent authored loader replacement\nexport const authored=23;\n';fs.writeFileSync(join(root,fixed.path),unknown);assert.throws(()=>prepareOwnedRuntimeImportEdges({root}),/unknown compiler source/);assert.equal(fs.readFileSync(join(root,fixed.path),'utf8'),unknown);
});
test('complete source-history opening closes restored identity changes instead of trusting matching bytes',{timeout:LIMIT},t=>{
 const root=receiving(t),target=join(root,'tools/translation/bulk.mjs'),bytes=fs.readFileSync(target);assert.throws(()=>withFixedForwardWriterSources(root,()=>{const replacement=target+'.independent';fs.writeFileSync(replacement,bytes);fs.renameSync(replacement,target);}),/identity|ancestor|changed/);assert.deepEqual(fs.readFileSync(target),bytes);
});
test('full current bank remains required and revalidated after source DATA serialization',{timeout:LIMIT},t=>{
 const root=receiving(t),plan=prepareOwnedRuntimeImportEdges({root}),row=plan.currentFiles.find(row=>row.currentSourceDataBank),copy=JSON.parse(JSON.stringify(row));assert.equal(resolveForwardSourceEquation(copy).after,row.after);copy.currentSourceDataBank.entries[copy.currentSourceEquation.afterRef].source+='\n// independently corrupted full source\n';assert.throws(()=>resolveForwardSourceEquation(copy));
});
test('source-history self author and all complete original case workloads have explicit full-source inverses',{timeout:LIMIT},t=>{
 const root=receiving(t);fs.mkdirSync(join(root,'tools/translation/test'),{recursive:true});const cohort=profile(root);for(const row of [...cohort.cases,...cohort.preparerCaseSources])fs.copyFileSync(join(ROOT,row.path),join(root,row.path));const plan=proposeForwardOutputOwnershipSourceHistory({root});assert.equal(plan.executionEvidence,'UNRUN');assert.equal(plan.sourceAuthority,false);const self=plan.files.find(row=>row.path==='tools/translation/forward-output-ownership-20261101-source-history.mjs');assert.ok(self);assert.equal(self.before,'');assert.equal(self.inverse,'');assert.deepEqual(self.trace.map(row=>row.phase),['language','repository']);assert.equal(transportConcreteSyntaxMeta(self.afterMeta).source,self.after);for(const row of cohort.cases)assert.ok(plan.files.some(value=>value.path===row.path&&value.before===row.before&&value.after===row.after));
});
