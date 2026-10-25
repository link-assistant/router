// Independent complete export partition SOURCE. Every case remains unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {exportTranslatorBundle,TRANSLATOR_EXPORT_LIMITS} from '../export-bundle.mjs';
import {exportPartitionedTranslatorBundle,PARTITIONED_TRANSLATOR_EXPORT_LIMITS} from '../partitioned-export-bundle.mjs';
import {COMPILER_SOURCE_INPUT_LIMITS,discoverCompilerSourceInputs} from '../compiler-source-inputs.mjs';
import {preparePartitionedCompilerExportSources} from '../prepare-partitioned-compiler-export-sources.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url)),limits={timeout:60000},hash=value=>createHash('sha256').update(value).digest('hex');
function review(bundle){
 const {manifest,destination}=bundle,rows=[];let metadataBytes=0;
 assert.equal(manifest.partitionSchema,'committed-translator-input-partitions-v1');assert.ok(manifest.partitions.length>0);assert.ok(manifest.partitions.length<=PARTITIONED_TRANSLATOR_EXPORT_LIMITS.partitions);
 for(const [index,part]of manifest.partitions.entries()){const bytes=readFileSync(join(destination,part.file)),data=JSON.parse(bytes);assert.equal(part.index,index+1);assert.equal(part.bytes,bytes.length);assert.equal(part.sha256,hash(bytes));assert.equal(data.sourceHead,manifest.sourceHead);assert.equal(data.sourceInventorySha256,manifest.sourceInventorySha256);assert.equal(data.index,index+1);assert.equal(data.files,data.inputs.length);assert.ok(data.files<=TRANSLATOR_EXPORT_LIMITS.files);assert.equal(data.totalSourceBytes,data.inputs.reduce((sum,row)=>sum+row.bytes,0));assert.equal(data.sourceAuthority,false);assert.equal(data.semanticAuthority,false);rows.push(...data.inputs);metadataBytes+=bytes.length;}
 assert.deepEqual(rows,manifest.inputs);assert.ok(manifest.totalSourceBytes+metadataBytes<=TRANSLATOR_EXPORT_LIMITS.totalBytes);assert.equal(new Set(rows.map(row=>row.path)).size,rows.length);assert.equal(manifest.runtimeParity,false);return rows;
}
test('all current compiler originals licenses and synchronization dependencies retain exact complete partition membership',limits,t=>{
 const directory=mkdtempSync(join(tmpdir(),'router-partitioned-export-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));const bundle=exportPartitionedTranslatorBundle({sourceRoot:root,output:join(directory,'compiler')}),rows=review(bundle),paths=new Set(rows.map(row=>row.path));for(const row of discoverCompilerSourceInputs({root}))assert.ok(paths.has(row.path),row.path);for(const row of rows){const bytes=readFileSync(join(bundle.destination,row.path));assert.equal(bytes.length,row.bytes);assert.equal(hash(bytes),row.sha256);assert.ok(row.bytes<=TRANSLATOR_EXPORT_LIMITS.fileBytes);}assert.ok(rows.some(row=>row.path.includes('http-resource-type-alias-templates.mjs')));assert.ok(rows.some(row=>row.path.includes('http-resource-cold-type-source.mjs')));assert.ok(rows.some(row=>row.path.includes('http-resource-unit-type-aliases.mjs')));assert.ok(rows.some(row=>row.path.includes('/source-profiles/partitioned-compiler-export/')));
});
test('partition bounds reuse original per-file global-byte and actual compiler logical-count budgets',()=>{
 assert.equal(TRANSLATOR_EXPORT_LIMITS.files,2048);assert.equal(PARTITIONED_TRANSLATOR_EXPORT_LIMITS.filesPerPartition,2048);assert.equal(PARTITIONED_TRANSLATOR_EXPORT_LIMITS.logicalFiles,COMPILER_SOURCE_INPUT_LIMITS.files);assert.equal(PARTITIONED_TRANSLATOR_EXPORT_LIMITS.fileBytes,TRANSLATOR_EXPORT_LIMITS.fileBytes);assert.equal(PARTITIONED_TRANSLATOR_EXPORT_LIMITS.totalBytes,TRANSLATOR_EXPORT_LIMITS.totalBytes);assert.equal(PARTITIONED_TRANSLATOR_EXPORT_LIMITS.partitions,4);
});
test('the original exporter still refuses its exact file-count boundary while complete partitions retain every extra original',limits,t=>{
 const directory=mkdtempSync(join(tmpdir(),'router-partitioned-export-boundary-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));const source=join(directory,'source');mkdirSync(source);const put=(path,value)=>{mkdirSync(dirname(join(source,path)),{recursive:true});writeFileSync(join(source,path),value);},git=args=>execFileSync('git',['-C',source,'-c','core.hooksPath=/dev/null','-c','user.name=Router fixture','-c','user.email=fixture@example.invalid',...args],{stdio:'pipe',timeout:10000});
 const base=['scripts/translate-router.mjs','scripts/translate-router-flat-native-owned-field-meta.mjs','tools/translation/bulk.mjs','tools/translation/vendor/meta-language/package.json','tools/translation/source-profiles/original/source.txt','tools/translation/source-profiles/original/LICENSE'];for(const path of base)put(path,'original '+path+'\n');for(let index=0;index<2049-base.length;index++)put('tools/translation/part_'+index+'.mjs','export const value='+index+';\n');git(['init','--quiet','--template=']);git(['add','.']);git(['commit','--quiet','-m','All original inputs']);
 const refused=join(directory,'bounded');assert.throws(()=>exportTranslatorBundle({sourceRoot:source,output:refused}),/file budget/u);assert.equal(existsSync(refused),false);const bundle=exportPartitionedTranslatorBundle({sourceRoot:source,output:join(directory,'complete')}),rows=review(bundle);assert.equal(rows.length,2049);assert.deepEqual(bundle.manifest.partitions.map(row=>row.files),[2048,1]);for(const row of rows)assert.ok(readFileSync(join(source,row.path)).equals(readFileSync(join(bundle.destination,row.path))));
});
test('complete original exporter CLI and receiving source copies retain all original inverse phases',limits,()=>{
 const plan=preparePartitionedCompilerExportSources();assert.equal(plan.files.length,8);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
