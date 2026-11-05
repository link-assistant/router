// Fixed original exporter composition; metadata and hashes grant no admission.
import {execFileSync} from 'node:child_process';
import {realpathSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {withSelectedTrackedSourceOperation,readSelectedTrackedSourceBytes} from './selected-source-reader-20261101.mjs';
import {exportCompactCommittedSourceVault} from './compact-committed-source-vault-20261102.mjs';
import {exportPairedCoreTranslatorBundle} from './paired-core-export-bundle.mjs';
import {TRANSLATION_PROVENANCE_PATH,withTranslationProvenanceData} from './translation-provenance-20261102.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const fail=message=>{throw TypeError('Provenance-preserving translator export: '+message);};
function vendorPaths(root){
 const empty=process.platform==='win32'?'NUL':'/dev/null',env={...Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('GIT_'))),GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:empty,GIT_CONFIG_SYSTEM:empty,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};
 const raw=execFileSync('git',['-C',root,'ls-files','--stage','-z','--','tools/translation/vendor','tools/translation/js-to-rust/vendor'],{env,timeout:10000,maxBuffer:4194304});
 const text=raw.toString('utf8');if(!Buffer.from(text).equals(raw))fail('exact vendor index UTF-8 required');const paths=[];
 for(const row of text.split('\0').filter(Boolean)){const match=/^(100644|100755) ([a-f0-9]{40}|[a-f0-9]{64}) 0\t(.+)$/u.exec(row);if(!match||paths.length===8192)fail('bounded ordinary unmerged-free vendor index required');paths.push(match[3]);}return paths;
}
export function exportProvenanceTranslatorBundle({sourceRoot=ROOT,output,storage='compact'}={}){
 if(typeof sourceRoot!=='string'||typeof output!=='string'||!['compact','physical'].includes(storage))fail('explicit source/output roots and closed storage profile required');const root=realpathSync(resolve(sourceRoot));
 return withSelectedTrackedSourceOperation(root,()=>{
  const raw=readSelectedTrackedSourceBytes(root,TRANSLATION_PROVENANCE_PATH,{maxBytes:1048576}),text=raw.toString('utf8');if(!Buffer.from(text).equals(raw))fail('complete exact provenance catalogue UTF-8 required');
  return withTranslationProvenanceData(JSON.parse(text),view=>{
   const files=view.files(),indexed=vendorPaths(root),selected=[...new Set([...indexed,...files])],summary=view.paths(selected);
   // Each original is physically/current-index source joined by the real reader.
   // One invocation-local index avoids cloning the whole catalogue per file.
   for(const name of files)view.bytes(name,readSelectedTrackedSourceBytes(root,name,{maxBytes:4194304}));
   const result=storage==='compact'?exportCompactCommittedSourceVault({sourceRoot:root,output,extraPaths:[TRANSLATION_PROVENANCE_PATH,...files]}):exportPairedCoreTranslatorBundle({sourceRoot:root,output});
   if(storage==='physical'){
    // The report is from the fixed original exporter above, not caller data.
    view.paths(result.manifest.inputs.map(row=>row.path));if(!result.manifest.inputs.some(row=>row.path===TRANSLATION_PROVENANCE_PATH))fail('actual copied compiler lacks its complete provenance catalogue');
   }
   // Rejoin the actual complete originals after the exporter has done its own
   // independent HEAD/index/byte/mode/closing checks. Outer failure stays fatal.
   for(const name of files)view.bytes(name,readSelectedTrackedSourceBytes(root,name,{maxBytes:4194304}));
   if(JSON.stringify(indexed)!==JSON.stringify(vendorPaths(root)))fail('complete vendor source index changed');
   return {...result,provenance:{...summary,catalogue:TRANSLATION_PROVENANCE_PATH,storage,declaredOriginalBytesCompared:true,completeDependencyResolution:false,compilerQualified:false,semanticAuthority:false,runtimeParity:false}};
  });
 },{limits:{paths:8192,bytes:33554432}});
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2),options={};for(let at=0;at<args.length;at++){const flag=args[at],key=flag==='--root'?'sourceRoot':flag==='--output'?'output':flag==='--storage'?'storage':null;if(!key||Object.hasOwn(options,key)||typeof args[at+1]!=='string'||args[at+1].startsWith('--'))fail('Use --output NEW_DIRECTORY [--root SOURCE_ROOT] [--storage compact|physical]');options[key]=args[++at];}
 const result=exportProvenanceTranslatorBundle(options);console.log(JSON.stringify({sourceHead:result.sourceHead??result.manifest?.sourceHead,provenance:result.provenance,executionQualification:false}));
}
