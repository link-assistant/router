// Additive complete receiving DATA; no original fixture API is changed.
import {httpDeadlineReceivingData} from './http-deadline-receiving-data.mjs';
import {httpResourceFilesystemRuntimeSources} from '../../http-resource-filesystem-runtime-sources.mjs';
import {HTTP_DEADLINE_RESULT_NATIVE_SOURCE} from '../../http-deadline-result-native-source.mjs';
import {INTEGER_NATIVE_SOURCE} from '../../integer-native-source.mjs';
import {PRIMITIVE_OPTION_NATIVE_SOURCE} from '../../primitive-option-native-source.mjs';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
export function httpResourceReceivingData(callerFiles=[]){
 const data=httpDeadlineReceivingData(callerFiles);data.files=data.files.filter(row=>!row.path.startsWith('runtime/')).concat(httpResourceFilesystemRuntimeSources());data.files.find(row=>row.path==='src/lib.rs').source+='pub mod translation_http_deadline_results_core;\n';data.files.push({path:'src/translation_http_deadline_results_core.rs',source:HTTP_DEADLINE_RESULT_NATIVE_SOURCE});for(const [name,source]of [['translation_integer_core',INTEGER_NATIVE_SOURCE],['translation_primitive_option_core',PRIMITIVE_OPTION_NATIVE_SOURCE]]){data.files.find(row=>row.path==='src/lib.rs').source+='pub mod '+name+';\n';data.files.push({path:'src/'+name+'.rs',source});}return data;
}
// Ordinary independent receiving execution helper. Invoked only after drafting.
export async function verifyHttpResourceTargets(result,verify){
 const root=fileURLToPath(new URL('../../../../',import.meta.url)),directory=mkdtempSync(join(tmpdir(),'router-http-resource-receiving-')),data=httpResourceReceivingData();
 try{
  const write=(path,source)=>{mkdirSync(dirname(join(directory,path)),{recursive:true});writeFileSync(join(directory,path),source);};for(const row of data.files.filter(row=>/\.(mjs|mts|ts)$/u.test(row.path)))write(row.path,row.source);write('caller.mjs',result.javascript);write('typed.mts',result.typescript);
  execFileSync(process.execPath,[join(root,'js/node_modules/typescript/bin/tsc'),'--strict','--skipLibCheck','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--outDir',join(directory,'out'),join(directory,'typed.mts')],{cwd:root,stdio:'pipe',timeout:20000});for(const row of data.files.filter(row=>row.path.startsWith('runtime/')))write('out/'+row.path,row.source);
  for(const path of ['caller.mjs','out/typed.mjs']){const prefix=path.startsWith('out/')?'out/runtime/':'runtime/',api=await import(pathToFileURL(join(directory,path))),transport=await import(pathToFileURL(join(directory,prefix+'http-transport-runtime.mjs'))),control=await import(pathToFileURL(join(directory,prefix+'async-control-runtime.mjs')));const filesystem=await import(pathToFileURL(join(directory,prefix+'extensions/filesystem-effects-runtime.mjs')));await verify(api,{transport,control,filesystem});}
 }finally{rmSync(directory,{recursive:true,force:true});}
}
