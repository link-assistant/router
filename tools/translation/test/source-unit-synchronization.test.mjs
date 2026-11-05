// Complete behavioral source; all execution deferred until bulk drafting ends.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,mkdirSync,readFileSync,rmSync,existsSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {planUnitSynchronization,applyUnitSynchronization} from '../synchronize-units.mjs';
import {prepareUnitSyncExports} from '../prepare-unit-sync-exports.mjs';
import {TRANSLATOR_ENTRYPOINTS} from '../translator-entrypoints.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';

const limits={timeout:60000};
test('complete reusable packaging retains every original command and includes the source-unit CLI through native CST rules',limits,()=>{
 const plan=prepareUnitSyncExports();assert.equal(plan.files.length,3);assert.equal(plan.existingGateCommandsChanged,false);assert.equal(plan.receivingExecuted,false);assert.ok(TRANSLATOR_ENTRYPOINTS.includes('scripts/sync-router.mjs'));assert.ok(TRANSLATOR_ENTRYPOINTS.includes('scripts/sync-router-units.mjs'));
 for(const row of plan.files){assert.equal(row.current,row.after);assert.equal(row.inverse,row.before);assert.equal(row.stages[0].inverse,row.before);assert.equal(row.stages[1].inverse,row.language);assert.equal(transportConcreteSyntaxMeta(row.stages[0].beforeMeta).source,row.before);assert.equal(transportConcreteSyntaxMeta(row.stages[1].afterMeta).source,row.after);assert.equal(row.nativeBindings.nativeSemanticScopeChecked,true);}
});
function fixture(t){
 const root=mkdtempSync(join(tmpdir(),'router-unit-sync-'));t.after(()=>rmSync(root,{recursive:true,force:true}));const git=args=>execFileSync('git',['-C',root,'-c','core.hooksPath=/dev/null','-c','user.name=Router fixture','-c','user.email=fixture@example.invalid',...args],{stdio:'pipe'}),write=(path,value)=>{mkdirSync(dirname(join(root,path)),{recursive:true});writeFileSync(join(root,path),value);};
 git(['init','--quiet']);write('seed.txt','independent baseline\n');git(['add','seed.txt']);git(['commit','--quiet','-m','Independent source baseline']);const descriptor={schema:'router-source-unit-sync-v1',units:[{id:'identity',profile:'portable',authority:'auto',paths:{Rust:'rust/src/generated/identity.rs',JavaScript:'js/src/identity.mjs',TypeScript:'ts/src/identity.ts'},runtimes:{JavaScript:'js/runtime',TypeScript:'ts/runtime'},meta:'tools/translation/unit-meta/identity.json'}]};
 write('units.json',JSON.stringify(descriptor));return {root,git,write,descriptor,options:{root,manifestPath:'units.json'}};
}
test('fresh JavaScript authority drafts both targets through complete source proposals and installs only a freshly recomputed plan',limits,t=>{
 const {root,write,options}=fixture(t),source='/** @param {number} value @returns {number} */\nexport function identity(value){return value;}\n';write('js/src/identity.mjs',source);
 const plan=planUnitSynchronization(options);assert.equal(plan.units[0].authority,'JavaScript');assert.equal(plan.crossInvocationCache,false);assert.equal(plan.rustExecuted,false);assert.equal(plan.outputs.some(row=>row.path==='js/src/identity.mjs'),false);assert.ok(plan.outputs.find(row=>row.path==='rust/src/generated/identity.rs').after.includes('fn identity'));assert.ok(plan.outputs.find(row=>row.path==='ts/src/identity.ts').after.includes('number'));
 const receipt=applyUnitSynchronization(JSON.stringify(plan),options);assert.ok(receipt.changed.includes('rust/src/generated/identity.rs'));assert.equal(readFileSync(join(root,'js/src/identity.mjs'),'utf8'),source);assert.equal(existsSync(join(root,'ts/src/identity.ts')),true);assert.equal(receipt.runtimeParity,false);
});
test('typed authority uses retained TypeScript constraints and does not overwrite authored TypeScript',limits,t=>{
 const {root,write,options}=fixture(t),source='type Count=number; export function identity(value: Count): Count {return value;}';write('ts/src/identity.ts',source);const plan=planUnitSynchronization(options);assert.equal(plan.units[0].authority,'TypeScript');assert.equal(plan.outputs.some(row=>row.path==='ts/src/identity.ts'),false);assert.equal(readFileSync(join(root,'ts/src/identity.ts'),'utf8'),source);assert.ok(plan.outputs.find(row=>row.path==='js/src/identity.mjs').after.includes('@param {number}'));
});
test('concurrent language edits refuse before any target mutation',limits,t=>{
 const {root,write,options}=fixture(t);write('js/src/identity.mjs','/** @param {number} value */ export function identity(value){return value;}');write('ts/src/identity.ts','export function identity(value: number): number {return value + 1;}');assert.throws(()=>planUnitSynchronization(options),/concurrent source edits/);assert.equal(existsSync(join(root,'rust/src/generated/identity.rs')),false);
});
test('a changed physical module dependency selects its owning language and retains the complete original module history',limits,t=>{
 const {root,git,write,descriptor,options}=fixture(t);descriptor.units[0].profile='portable-project';descriptor.units[0].dependencies={JavaScript:['js/src/helper.mjs']};write('units.json',JSON.stringify(descriptor));write('js/src/identity.mjs','import {twice} from "./helper.mjs";\n/** @param {number} value @returns {number} */\nexport function identity(value){return twice(value);}');write('js/src/helper.mjs','/** @param {number} value @returns {number} */\nexport function twice(value){return value*2;}');git(['add','units.json','js/src/identity.mjs','js/src/helper.mjs']);git(['commit','--quiet','-m','Complete pure module baseline']);const changed='/** @param {number} value @returns {number} */\nexport function twice(value){return value*3;}';write('js/src/helper.mjs',changed);
 const plan=planUnitSynchronization(options);assert.equal(plan.units[0].authority,'JavaScript');const metadata=JSON.parse(plan.outputs.find(row=>row.path==='tools/translation/unit-meta/identity.json').after);assert.equal(metadata.semanticMeta.moduleSourceHistory.modules.find(row=>row.path==='js/src/helper.mjs').before,changed);assert.equal(readFileSync(join(root,'js/src/helper.mjs'),'utf8'),changed);assert.equal(existsSync(join(root,'rust/src/generated/identity.rs')),false);
});
test('changed source and forged target proposals require complete retranslation and refuse installation',limits,t=>{
 const {root,write,options}=fixture(t);write('js/src/identity.mjs','/** @param {number} value */ export function identity(value){return value;}');const first=planUnitSynchronization(options),forged=JSON.parse(JSON.stringify(first));forged.outputs.find(row=>row.path.endsWith('.rs')).after='pub fn forged() {}';assert.throws(()=>applyUnitSynchronization(JSON.stringify(forged),options),/complete fresh source translation/);assert.equal(existsSync(join(root,'rust/src/generated/identity.rs')),false);
 write('js/src/identity.mjs','/** @param {number} value */ export function identity(value){return value + 1;}');assert.throws(()=>applyUnitSynchronization(JSON.stringify(first),options),/complete fresh source translation/);assert.equal(existsSync(join(root,'rust/src/generated/identity.rs')),false);
});
test('linked inputs and overlapping source targets retain their refusal boundaries',limits,t=>{
 const {root,write,descriptor,options}=fixture(t);write('actual.mjs','/** @param {number} value */ export function identity(value){return value;}');mkdirSync(join(root,'js/src'),{recursive:true});symlinkSync('../../actual.mjs',join(root,'js/src/identity.mjs'));assert.throws(()=>planUnitSynchronization(options),/ordinary source file/);
 descriptor.units[0].meta=descriptor.units[0].paths.JavaScript;write('units.json',JSON.stringify(descriptor));assert.throws(()=>planUnitSynchronization(options),/metadata cannot overwrite/);
});
