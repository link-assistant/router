// Complete copied receiving/bootstrap/cleanup case SOURCE. All cases UNRUN.
// Fault hooks are installed by the transaction's UUID call only AFTER both
// actual complete private producers have run. No public callback replaces them.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire,syncBuiltinESMExports} from 'node:module';
import {execFileSync} from 'node:child_process';
import {exportPartitionedTranslatorBundle} from '../partitioned-export-bundle.mjs';
import {prepareFlatNativeOutputTextRetention} from '../prepare-flat-native-output-text-retention.mjs';
import {prepareNativeOutputTextRetention} from '../prepare-native-output-text-retention.mjs';
import {installFreshFlatNativeOutputTextRetention} from '../forward-output-ownership-20261101-flat-source-install.mjs';
import {captureFlatSourceInstallationInputs} from '../forward-output-ownership-20261101-flat-source-inputs.mjs';
import {resolveForwardSourceEquation} from '../forward-output-ownership-20261101-source-equation-bank.mjs';
import {withFixedForwardWriterSources} from '../forward-output-ownership-20261101-source-history.mjs';
const SOURCE=fileURLToPath(new URL('../../../',import.meta.url)),TIMEOUT=3600000;
function fixture(t){const parent=fs.realpathSync(fs.mkdtempSync(join(tmpdir(),'router-flat-source-custody-'))),root=join(parent,'compiler');t.after(()=>fs.rmSync(parent,{recursive:true,force:true}));exportPartitionedTranslatorBundle({sourceRoot:SOURCE,output:root});fs.mkdirSync(join(root,'js/node_modules'),{recursive:true});const require=createRequire(join(SOURCE,'js/package.json'));fs.symlinkSync(dirname(require.resolve('typescript/package.json')),join(root,'js/node_modules/typescript'),'dir');for(const name of ['native-output-text-retention.test.mjs','flat-native-output-text-retention.test.mjs']){fs.mkdirSync(join(root,'tools/translation/test'),{recursive:true});fs.copyFileSync(join(SOURCE,'tools/translation/test',name),join(root,'tools/translation/test',name));}return root;}
function git(root,args){return execFileSync('git',['-C',root,'-c','core.hooksPath=/dev/null','-c','gc.auto=0','-c','maintenance.auto=false',...args],{stdio:'pipe',timeout:30000});}
function stages(root){return fs.readdirSync(join(root,'tools')).filter(name=>name.startsWith('.router-flat-source-install-'));}
function predecessor(root,plan,path='tools/translation/flat-native-retained-owned-field-bulk.mjs'){const row=plan.files.find(row=>row.path===path),before=resolveForwardSourceEquation(row,row.forwardOutputCustodySuccessor).before;assert.notEqual(before,row.after);fs.writeFileSync(join(root,path),before);return {path,before,after:row.after};}
async function rejection(run){let failed=false,primary;try{await run();}catch(error){failed=true;primary=error;}assert.equal(failed,true);return primary;}
function afterProof(t,install){const uuid=crypto.randomUUID;let used=false;crypto.randomUUID=function(){const value=uuid();if(!used){used=true;install();}return value;};syncBuiltinESMExports();t.after(()=>{crypto.randomUUID=uuid;syncBuiltinESMExports();});return ()=>used;}
for(const state of ['current','predecessor','absent','absent-never-indexed'])test('genuine complete copied flat source writer preserves '+state+' target ownership and modes',{timeout:TIMEOUT},async t=>{
 const root=fixture(t),plan=await prepareFlatNativeOutputTextRetention({root}),modePath='tools/translation/flat-native-retained-owned-field-bulk.mjs';
 if(state==='predecessor')for(const row of plan.files)fs.writeFileSync(join(root,row.path),resolveForwardSourceEquation(row,row.forwardOutputCustodySuccessor).before);
 if(state.startsWith('absent'))for(const row of plan.files){fs.unlinkSync(join(root,row.path));if(state==='absent-never-indexed')git(root,['rm','--cached','--ignore-unmatch','--',row.path]);}
 if(!state.startsWith('absent'))fs.chmodSync(join(root,modePath),0o600);
 const installed=await installFreshFlatNativeOutputTextRetention({root});assert.equal(installed.producerSchema,plan.schema);assert.deepEqual(installed.files,plan.files.map(row=>row.path));for(const row of plan.files)assert.equal(fs.readFileSync(join(root,row.path),'utf8'),row.after);if(!state.startsWith('absent'))assert.equal(fs.statSync(join(root,modePath)).mode&0o777,0o600);assert.deepEqual(stages(root),[]);
 if(state==='absent-never-indexed')git(root,['add','--',...plan.files.map(row=>row.path)]);
 const second=await installFreshFlatNativeOutputTextRetention({root});assert.deepEqual(second.changed,[]);assert.deepEqual(stages(root),[]);
});
test('complete actual native and flat bootstrap retains fresh prerequisite proofs and physical missing states',{timeout:TIMEOUT},async t=>{
 const root=fixture(t),first=await prepareFlatNativeOutputTextRetention({root}),paths=new Set([...first.files,...first.nativePrerequisites.files,...first.nativePrerequisites.prerequisites.ownedField.files].map(row=>row.path));for(const path of paths)fs.unlinkSync(join(root,path));
 const native=await prepareNativeOutputTextRetention({root});assert.equal(native.files.length,7);assert.ok(native.inputs.some(row=>row.present===false));for(const row of native.files){const equation=resolveForwardSourceEquation(row);assert.equal(row.currentSourceEquation.beforePresent,false);assert.equal(equation.before,'');assert.equal(equation.after,row.after);}
 const flat=await prepareFlatNativeOutputTextRetention({root});assert.equal(flat.files.length,8);assert.ok(flat.inputs.some(row=>row.present===false));for(const row of flat.files){assert.equal(row.currentSourceEquation.beforePresent,false);assert.equal(resolveForwardSourceEquation(row).after,row.after);}await installFreshFlatNativeOutputTextRetention({root});for(const row of flat.files)assert.equal(fs.readFileSync(join(root,row.path),'utf8'),row.after);for(const row of native.files)assert.equal(fs.existsSync(join(root,row.path)),false);
});
test('unknown or modified source targets are retained without a public adoption or override route',{timeout:TIMEOUT},async t=>{
 const root=fixture(t),plan=await prepareFlatNativeOutputTextRetention({root}),path=plan.files[1].path,unknown='// independently authored source target\nexport const authored=19;\n';fs.writeFileSync(join(root,path),unknown);await assert.rejects(()=>installFreshFlatNativeOutputTextRetention({root}));assert.equal(fs.readFileSync(join(root,path),'utf8'),unknown);assert.deepEqual(stages(root),[]);
});
test('a new selectable source in an originally unselected directory invalidates the retained census',{timeout:TIMEOUT},t=>{
 const root=fixture(t),directory=join(root,'tools/translation/fixtures-unselected-original');fs.mkdirSync(directory);fs.writeFileSync(join(directory,'ordinary.txt'),'unselected');const scope=captureFlatSourceInstallationInputs(root);try{scope.verify();fs.writeFileSync(join(directory,'new-producer.mjs'),'export const unknown=1;\n');assert.throws(()=>scope.verify(),/new untracked selectable/);assert.equal(fs.readFileSync(join(directory,'new-producer.mjs'),'utf8'),'export const unknown=1;\n');}finally{scope.release();}
});
test('canonical original listing UTF8 rejection includes excluded raw filename rows',{timeout:TIMEOUT,skip:process.platform==='win32'},t=>{
 const root=fixture(t),directory=join(root,'tools/translation/fixtures');fs.mkdirSync(directory,{recursive:true});const file=Buffer.concat([Buffer.from(directory+'/excluded-'),Buffer.from([0x80]),Buffer.from('.txt')]);fs.writeFileSync(file,'excluded');assert.throws(()=>captureFlatSourceInstallationInputs(root),/encoded|encoding|UTF|valid/i);
});
test('actual source lookup errors preserve every exact falsy or frozen primary before producer admission',{timeout:TIMEOUT},async t=>{
 const root=fixture(t),target=join(root,'tools/translation/flat-native-retained-owned-field-bulk.mjs'),lstat=fs.lstatSync;for(const primary of [undefined,null,false,0,'',Object.freeze(new Error('independent frozen lookup failure'))]){try{fs.lstatSync=function(file,...args){if(String(file)===target)throw primary;return lstat(file,...args);};assert.equal(await rejection(()=>installFreshFlatNativeOutputTextRetention({root})),primary);}finally{fs.lstatSync=lstat;}}assert.deepEqual(stages(root),[]);
});
test('own staged hardlink cleanup advances only its exact public inode fullstamp before final closing',{timeout:TIMEOUT},async t=>{
 const root=fixture(t),plan=await prepareFlatNativeOutputTextRetention({root}),row=predecessor(root,plan),unlink=fs.unlinkSync;let removed=0;const used=afterProof(t,()=>{fs.unlinkSync=function(file,...args){const value=unlink(file,...args);if(String(file).includes('/.router-flat-source-install-')&&/\/stage-[0-9]+$/u.test(String(file)))removed++;return value;};});try{await installFreshFlatNativeOutputTextRetention({root});assert.equal(used(),true);assert.ok(removed>0);assert.equal(fs.readFileSync(join(root,row.path),'utf8'),row.after);assert.deepEqual(stages(root),[]);}finally{fs.unlinkSync=unlink;}
});
test('source mutation during stage cleanup fails and retains original inode recovery before backup disposal',{timeout:TIMEOUT},async t=>{
 const root=fixture(t),plan=await prepareFlatNativeOutputTextRetention({root}),row=predecessor(root,plan),helper=join(root,'tools/translation/effect-assets.mjs'),before=fs.readFileSync(helper),unlink=fs.unlinkSync;let changed=false;afterProof(t,()=>{fs.unlinkSync=function(file,...args){const value=unlink(file,...args);if(!changed&&String(file).includes('/.router-flat-source-install-')&&/\/stage-[0-9]+$/u.test(String(file))){changed=true;fs.appendFileSync(helper,'\n// independent cleanup source edit\n');}return value;};});try{await assert.rejects(()=>installFreshFlatNativeOutputTextRetention({root}));assert.equal(changed,true);assert.equal(fs.readFileSync(join(root,row.path),'utf8'),row.before);assert.equal(stages(root).length,1);}finally{fs.unlinkSync=unlink;fs.writeFileSync(helper,before);}
});
test('late post-backup source fault reports partial state and exact independent before-byte mode recovery copies',{timeout:TIMEOUT},async t=>{
 const root=fixture(t),plan=await prepareFlatNativeOutputTextRetention({root}),row=predecessor(root,plan),helper=join(root,'tools/translation/effect-assets.mjs'),before=fs.readFileSync(helper),unlink=fs.unlinkSync;let changed=false;afterProof(t,()=>{fs.unlinkSync=function(file,...args){const value=unlink(file,...args);if(!changed&&String(file).includes('/.router-flat-source-install-')&&/\/backup-[0-9]+$/u.test(String(file))){changed=true;fs.appendFileSync(helper,'\n// independent post-backup source edit\n');}return value;};});try{const failure=await rejection(()=>installFreshFlatNativeOutputTextRetention({root}));assert.equal(changed,true);assert.equal(failure.partialInstallation,true);assert.equal(fs.readFileSync(join(root,row.path),'utf8'),row.after);const recovered=failure.copiedPreimages.find(value=>value.path===row.path);assert.ok(recovered);assert.equal(recovered.kind,'exact-byte-mode-copy-not-original-inode');assert.equal(fs.readFileSync(join(root,recovered.copyPath),'utf8'),row.before);assert.equal(fs.statSync(join(root,recovered.copyPath)).mode&0o777,recovered.mode);}finally{fs.unlinkSync=unlink;fs.writeFileSync(helper,before);}
});
test('post-proof operation failure preserves exact falsy and frozen primary through all source closers',{timeout:TIMEOUT},async t=>{
 for(const primary of [undefined,null,false,0,'',Object.freeze(new Error('independent frozen post-proof failure'))]){const root=fixture(t),plan=await prepareFlatNativeOutputTextRetention({root}),row=predecessor(root,plan),lstat=fs.lstatSync,uuid=crypto.randomUUID;let used=false;try{crypto.randomUUID=function(){const value=uuid();if(!used){used=true;fs.lstatSync=function(file,...args){if(String(file)===join(root,row.path))throw primary;return lstat(file,...args);};}return value;};syncBuiltinESMExports();assert.equal(await rejection(()=>installFreshFlatNativeOutputTextRetention({root})),primary);assert.equal(used,true);}finally{fs.lstatSync=lstat;crypto.randomUUID=uuid;syncBuiltinESMExports();}assert.equal(fs.readFileSync(join(root,row.path),'utf8'),row.before);fs.rmSync(dirname(root),{recursive:true,force:true});}
});
test('proposal-only testcase roles do not qualify missing runtime compiler modules',{timeout:TIMEOUT},t=>{const root=fixture(t);withFixedForwardWriterSources(root,history=>history.requireActive());fs.unlinkSync(join(root,'tools/translation/flat-native-retained-owned-field-bulk.mjs'));withFixedForwardWriterSources(root,history=>assert.throws(()=>history.requireActive(),/proposal-only/));});
