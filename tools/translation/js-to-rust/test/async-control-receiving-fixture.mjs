// Receiving source data and ordinary target execution helper; no Rust tools.
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {ownedCancellationReceivingData} from './owned-cancellation-receiving-data.mjs';
export function asyncControlReceivingInput(sourcePath='caller.mjs',source=''){
 const data=ownedCancellationReceivingData([{path:sourcePath,source}]),files=new Map(data.files.map(row=>[row.path,row.source]));return {data,options:{sourcePath,runtimePath:'runtime/async-control-runtime.mjs',runtimeSource:files.get('runtime/async-control-runtime.mjs'),nativeRootSource:files.get('src/lib.rs'),nativeSource:files.get('src/translation_async_control_core.rs')}};
}
export async function verifyAsyncControlTargets(result,verify){
 const root=fileURLToPath(new URL('../../../../',import.meta.url)),directory=mkdtempSync(join(tmpdir(),'router-control-inverse-')),data=asyncControlReceivingInput().data;
 try{
  const write=(path,source)=>{mkdirSync(dirname(join(directory,path)),{recursive:true});writeFileSync(join(directory,path),source);};for(const row of data.files.filter(row=>/\.(mjs|mts|ts)$/u.test(row.path)))write(row.path,row.source);write('caller.mjs',result.javascript);write('typed.mts',result.typescript);
  execFileSync(process.execPath,[join(root,'js/node_modules/typescript/bin/tsc'),'--strict','--skipLibCheck','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--outDir',join(directory,'out'),join(directory,'typed.mts')],{cwd:root,stdio:'pipe',timeout:20000});for(const row of data.files.filter(row=>row.path.startsWith('runtime/')))write('out/'+row.path,row.source);
  for(const path of ['caller.mjs','out/typed.mjs']){const api=await import(pathToFileURL(join(directory,path))),runtime=await import(pathToFileURL(join(directory,path.startsWith('out/')?'out/runtime/async-control-runtime.mjs':'runtime/async-control-runtime.mjs')));await verify(api,runtime);}
 }finally{rmSync(directory,{recursive:true,force:true});}
}
