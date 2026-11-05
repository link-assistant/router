// Independent committed-source/native-core export cases. All execution UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,existsSync,renameSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {exportTranslatorBundle,TRANSLATOR_EXPORT_LIMITS} from '../export-bundle.mjs';
import {exportPartitionedTranslatorBundle,PARTITIONED_TRANSLATOR_EXPORT_LIMITS} from '../partitioned-export-bundle.mjs';
import {exportPairedCoreTranslatorBundle,PAIRED_CORE_TRANSLATOR_EXPORT_LIMITS,PAIRED_CORE_TRANSLATOR_NATIVE_INPUTS,PAIRED_CORE_TRANSLATOR_LICENSE_INPUTS} from '../paired-core-export-bundle.mjs';
import {preparePairedCoreCompilerExportSources} from '../prepare-paired-core-compiler-export-sources.mjs';
const limits={timeout:60000},ROOT=fileURLToPath(new URL('../../../',import.meta.url)),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const nativePaths=['rust/src/translation_primitive_sequences_core.rs','rust/src/translation_primitive_vectors_core.rs','rust/src/translation_owned_text_vectors_core.rs'];
function git(root,args){return execFileSync('git',['-C',root,'-c','core.hooksPath=/dev/null','-c','user.name=Router source fixture','-c','user.email=fixture@example.invalid',...args],{env:{...Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('GIT_'))),GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null'},encoding:'utf8',timeout:10000,maxBuffer:4*1024*1024});}
function fixture(t,{native=true,license=true,compilerFiles=null}={}){
 const temporary=mkdtempSync(join(tmpdir(),'router-paired-core-export-'));t.after(()=>rmSync(temporary,{recursive:true,force:true}));const root=join(temporary,'source');mkdirSync(root);const put=(path,source)=>{mkdirSync(dirname(join(root,path)),{recursive:true});writeFileSync(join(root,path),source);};
 const base=['scripts/translate-router.mjs','scripts/translate-router-flat-native-owned-field-meta.mjs','tools/translation/bulk.mjs','tools/translation/vendor/meta-language/package.json','tools/translation/source-profiles/independent/original.txt','tools/translation/source-profiles/independent/LICENSE'];for(const path of base)put(path,'independent source '+path+'\n');
 if(native)for(const path of nativePaths)put(path,'pub fn independent()->bool{true}\n');
 if(license)put('LICENSE','Independent complete project license bytes\n');
 if(compilerFiles!==null)for(let index=base.length;index<compilerFiles;index++)put('tools/translation/member_'+index+'.mjs','export const value='+index+';\n');
 put('rust/src/lib.rs','pub fn application_only()->bool{false}\n');put('rust/src/application_only.rs','pub fn application_only()->bool{false}\n');
 git(root,['init','--quiet','--template=']);git(root,['add','.']);git(root,['commit','--quiet','-m','Independent complete compiler source']);return {root,temporary,put,output:name=>join(temporary,name)};
}
function review(bundle){
 const {manifest,destination}=bundle,rows=[];let metadata=0;for(const [index,part]of manifest.partitions.entries()){const bytes=readFileSync(join(destination,part.file)),data=JSON.parse(bytes);metadata+=bytes.length;assert.equal(bytes.length,part.bytes);assert.equal(hash(bytes),part.sha256);assert.equal(data.index,index+1);assert.equal(data.sourceHead,manifest.sourceHead);assert.equal(data.sourceInventorySha256,manifest.sourceInventorySha256);assert.ok(data.inputs.length<=TRANSLATOR_EXPORT_LIMITS.files);assert.equal(data.sourceAuthority,false);assert.equal(data.semanticAuthority,false);rows.push(...data.inputs);}
 assert.deepEqual(rows,manifest.inputs);assert.equal(new Set(rows.map(row=>row.path)).size,rows.length);assert.ok(rows.length<=PAIRED_CORE_TRANSLATOR_EXPORT_LIMITS.logicalFiles);assert.ok(manifest.totalSourceBytes+metadata<=TRANSLATOR_EXPORT_LIMITS.totalBytes);
 assert.deepEqual(manifest.nativeCompatibilitySources.map(row=>row.path).sort(),[...nativePaths].sort());for(const row of manifest.nativeCompatibilitySources){const bytes=readFileSync(join(destination,row.path));assert.equal(bytes.length,row.bytes);assert.equal(hash(bytes),row.sha256);assert.deepEqual(rows.find(input=>input.path===row.path),row);}
 assert.deepEqual(manifest.projectLicenseSources.map(row=>row.path),['LICENSE']);const license=manifest.projectLicenseSources[0],licenseBytes=readFileSync(join(destination,license.path));assert.equal(hash(licenseBytes),license.sha256);assert.equal(licenseBytes.length,license.bytes);assert.deepEqual(rows.find(row=>row.path===license.path),license);
 assert.equal(manifest.nativeRustCompilationExecuted,false);assert.equal(manifest.nativeCallerBindingQualified,false);assert.equal(manifest.runtimeParity,false);assert.equal(manifest.compilerIndex.sourceHeadPresent,false);assert.equal(manifest.compilerIndex.namespaceAuthority,false);return rows;
}
test('new export retains exact three committed native source inputs and excludes application roots without changing old API scope',limits,t=>{
 const api=fixture(t),before=git(api.root,['ls-files','--stage','-z']),bundle=exportPairedCoreTranslatorBundle({sourceRoot:api.root,output:api.output('paired')}),rows=review(bundle);assert.equal(rows.length,10);assert.equal(git(api.root,['ls-files','--stage','-z']),before);assert.deepEqual(readFileSync(join(bundle.destination,'LICENSE')),readFileSync(join(api.root,'LICENSE')));
 for(const path of nativePaths)assert.deepEqual(readFileSync(join(bundle.destination,path)),readFileSync(join(api.root,path)));
 for(const path of ['rust/src/lib.rs','rust/src/application_only.rs'])assert.equal(existsSync(join(bundle.destination,path)),false);
 const nativeIndex=git(bundle.destination,['ls-files','--stage','-z','--',...nativePaths]);for(const path of nativePaths)assert.ok(nativeIndex.includes('\t'+path+'\0'));
 assert.throws(()=>git(bundle.destination,['rev-parse','--verify','HEAD']));
 const old=exportPartitionedTranslatorBundle({sourceRoot:api.root,output:api.output('legacy')});assert.equal(old.manifest.inputs.length,6);for(const path of nativePaths)assert.equal(existsSync(join(old.destination,path)),false);assert.equal(Object.hasOwn(old.manifest,'nativeCompatibilitySources'),false);
});
test('missing committed project license refuses before output while preserving the old export domain',limits,t=>{
 const api=fixture(t,{license:false}),output=api.output('missing-license');assert.throws(()=>exportPairedCoreTranslatorBundle({sourceRoot:api.root,output}),/missing.*license/u);assert.equal(existsSync(output),false);assert.equal(exportPartitionedTranslatorBundle({sourceRoot:api.root,output:api.output('legacy')}).manifest.files,6);
});
test('missing committed native inputs refuse before destination creation and legacy export remains available',limits,t=>{
 const api=fixture(t,{native:false}),output=api.output('missing');assert.throws(()=>exportPairedCoreTranslatorBundle({sourceRoot:api.root,output}),/missing.*native/u);assert.equal(existsSync(output),false);
 assert.equal(exportPartitionedTranslatorBundle({sourceRoot:api.root,output:api.output('legacy')}).manifest.files,6);
});
test('the existing export CLI selects the additive paired-core exporter without changing its options',limits,t=>{
 const api=fixture(t),output=api.output('cli'),text=execFileSync(process.execPath,[join(ROOT,'scripts/export-router-translator.mjs'),'--root',api.root,'--output',output],{encoding:'utf8',timeout:20000,maxBuffer:65536}),receipt=JSON.parse(text),manifest=JSON.parse(readFileSync(join(output,'translator-bundle.json'),'utf8'));
 assert.equal(receipt.destination,output);assert.equal(receipt.files,10);assert.equal(receipt.runtimeParity,false);assert.deepEqual(manifest.nativeCompatibilitySources.map(row=>row.path).sort(),[...nativePaths].sort());assert.equal(manifest.nativeRustCompilationExecuted,false);assert.deepEqual(manifest.projectLicenseSources.map(row=>row.path),['LICENSE']);
});
test('dirty staged absent and source-link native inputs cannot enter the committed export',limits,t=>{
 const api=fixture(t),path=nativePaths[0],physical=join(api.root,path),original=readFileSync(physical);
 api.put(path,'changed complete native source\n');const dirty=api.output('dirty');assert.throws(()=>exportPairedCoreTranslatorBundle({sourceRoot:api.root,output:dirty}),/committed|source bytes/u);assert.equal(existsSync(dirty),false);
 git(api.root,['add',path]);const staged=api.output('staged');assert.throws(()=>exportPairedCoreTranslatorBundle({sourceRoot:api.root,output:staged}),/index/u);assert.equal(existsSync(staged),false);git(api.root,['reset','--quiet','HEAD','--',path]);writeFileSync(physical,original);
 rmSync(physical);const absent=api.output('absent');assert.throws(()=>exportPairedCoreTranslatorBundle({sourceRoot:api.root,output:absent}));assert.equal(existsSync(absent),false);writeFileSync(physical,original);
 const outside=api.output('outside.rs');writeFileSync(outside,original);rmSync(physical);symlinkSync(outside,physical);const linked=api.output('linked');assert.throws(()=>exportPairedCoreTranslatorBundle({sourceRoot:api.root,output:linked}),/physical|regular|link/u);assert.equal(existsSync(linked),false);
});
test('a linked native source parent refuses even when the target bytes match the committed input',limits,t=>{
 const api=fixture(t),source=join(api.root,'rust/src'),outside=api.output('outside-native');renameSync(source,outside);symlinkSync(outside,source,'dir');const output=api.output('linked-parent');assert.throws(()=>exportPairedCoreTranslatorBundle({sourceRoot:api.root,output}),/directory link/u);assert.equal(existsSync(output),false);
});
test('partitioned native inputs keep all original file byte count and deadline budgets',limits,t=>{
 assert.deepEqual(PAIRED_CORE_TRANSLATOR_EXPORT_LIMITS,PARTITIONED_TRANSLATOR_EXPORT_LIMITS);assert.deepEqual(PAIRED_CORE_TRANSLATOR_NATIVE_INPUTS,nativePaths);assert.deepEqual(PAIRED_CORE_TRANSLATOR_LICENSE_INPUTS,['LICENSE']);
 const api=fixture(t,{compilerFiles:2049}),refused=api.output('original');assert.throws(()=>exportTranslatorBundle({sourceRoot:api.root,output:refused}),/file budget/u);assert.equal(existsSync(refused),false);
 const old=exportPartitionedTranslatorBundle({sourceRoot:api.root,output:api.output('partitioned')}),current=exportPairedCoreTranslatorBundle({sourceRoot:api.root,output:api.output('paired')});assert.equal(old.manifest.files,2049);assert.deepEqual(old.manifest.partitions.map(row=>row.files),[2048,1]);assert.equal(review(current).length,2053);assert.deepEqual(current.manifest.partitions.map(row=>row.files),[2048,5]);
});
test('actual copied compiler performs fresh native reads and owned-text ABI construction from its own physical core inputs',limits,t=>{
 const temporary=mkdtempSync(join(tmpdir(),'router-paired-core-receiving-'));t.after(()=>rmSync(temporary,{recursive:true,force:true}));const bundle=exportPairedCoreTranslatorBundle({sourceRoot:ROOT,output:join(temporary,'compiler')});review(bundle);
 const url=name=>pathToFileURL(join(bundle.destination,'tools/translation',name)).href;
 const script=`
 import assert from 'node:assert/strict';
 import {readFileSync,writeFileSync} from 'node:fs';
 const api=await import(${JSON.stringify(url('source-synchronization.mjs'))});
 const sequence=await import(${JSON.stringify(url('failure-aware-fresh-primitive-sequence-inputs.mjs'))});
 const primitive=await import(${JSON.stringify(url('failure-aware-fresh-primitive-owned-vector-inputs.mjs'))});
 const values=[sequence.withFreshPrimitiveSequenceInputs(frame=>frame.sources.find(row=>row.language==='Rust').source),primitive.withFreshPrimitiveOwnedVectorInputs(frame=>frame.sources.find(row=>row.path==='src/translation_primitive_vectors_core.rs').source),api.withFreshOwnedTextVectorInputs(frame=>frame.sources.find(row=>row.language==='Rust').source)];
 assert.ok(values[0].includes('pub fn slice_bool_len'));assert.ok(values[1].includes('pub fn vec_bool_new'));assert.ok(values[2].includes('pub fn vec_text_new'));
 const proposal=api.proposeOwnedTextVectorRootSource('pub fn keep(value:bool)->bool{value}\\n',{entry:'rust/src/lib.rs',runtimeRoot:'runtime',declarationRoot:'types'}),files=new Map(proposal.files.map(row=>[row.path,row.after??row.source]));
 const row=api.requireCurrentOwnedTextVectorOperationSource(files,proposal.configuration,'vec_text_get');assert.equal(row.returns,'text-owned-option');assert.equal(row.clonesOwnedText,true);assert.deepEqual(row.shared,[0]);assert.deepEqual(row.consumed,[]);assert.equal(row.privateCallerBindingQualified,false);assert.equal(row.nativeTypeOwnerQualified,false);assert.equal(row.nativeRootActivated,false);assert.equal(row.sourceRecords.length,14);
 const native=${JSON.stringify(join(bundle.destination,nativePaths[2]))},original=readFileSync(native);
 try{writeFileSync(native,Buffer.concat([original,Buffer.from('\\n')]));assert.throws(()=>api.withFreshOwnedTextVectorInputs(()=>42));}finally{writeFileSync(native,original);}
 assert.equal(api.withFreshOwnedTextVectorInputs(()=>42),42);
 process.stdout.write('copied physical native cores and fresh ABI source joins retained; parity unqualified');
 `;
 assert.equal(execFileSync(process.execPath,['--input-type=module','-e',script],{env:{...process.env,ROUTER_NATIVE_TS_SOURCE_ROOT:ROOT},encoding:'utf8',timeout:20000,maxBuffer:65536}),'copied physical native cores and fresh ABI source joins retained; parity unqualified');
});
test('three complete exporter source equations retain original APIs CLI source and full inverses',limits,()=>{
 const plan=preparePairedCoreCompilerExportSources();assert.equal(plan.files.length,3);assert.equal(plan.receivingExecuted,false);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);assert.ok(row.after.split('\n').length-1<1000);}
 const copied=plan.files.find(row=>row.path==='tools/translation/paired-core-export-bundle.mjs');assert.ok(copied.before.includes('export function exportPartitionedTranslatorBundle'));assert.ok(copied.after.includes('export function exportPairedCoreTranslatorBundle'));assert.equal(plan.sourceAuthority,false);assert.equal(plan.semanticAuthority,false);
});
