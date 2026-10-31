// Complete additive receiving harness SOURCE. UNRUN during bulk drafting.
// The original fixture remains unchanged; commands, bounds and cleanup persist.
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {httpResourceReceivingData} from '../js-to-rust/test/http-resource-receiving-data.mjs';
export function networkControlReceivingInput(sourcePath='caller.mjs',source=''){
 const data=httpResourceReceivingData([{path:sourcePath,source}]);return {data,options:{sourcePath,...data}};
}
export function requireNetworkControlCompilerVersion(output){
 if(typeof output!=='string'||output.trim()!=='Version 5.9.3')throw new TypeError('Network control bulk targets require lockfile TypeScript 5.9.3; received '+(typeof output==='string'?JSON.stringify(output):typeof output));
 return '5.9.3';
}
/** Optional recorder receives version, complete argv and pass/failure diagnostics. */
export async function verifyNetworkControlTargets(result,verify,{record=()=>{},extraFiles=[]}={}){
 if(typeof verify!=='function'||typeof record!=='function')throw new TypeError('Network control target verifier and recorder must be functions');
 const root=fileURLToPath(new URL('../../../',import.meta.url)),directory=mkdtempSync(join(tmpdir(),'router-control-inverse-'));
 const compiler=join(root,'js/node_modules/typescript/bin/tsc');let version=null;
 const invoke=(stage,args)=>{
  let output;
  try{output=execFileSync(process.execPath,args,{cwd:root,stdio:'pipe',timeout:20000});}
  catch(error){record({stage,command:process.execPath,args:[...args],version,passed:false,status:error.status??null,signal:error.signal??null,stdout:error.stdout?.toString()??'',stderr:error.stderr?.toString()??'',message:error.message});throw error;}
  return output.toString();
 };
 try{
  const data=networkControlReceivingInput().data;
  const versionArgs=[compiler,'--version'],versionOutput=invoke('compiler-version',versionArgs);
  try{version=requireNetworkControlCompilerVersion(versionOutput);}
  catch(error){record({stage:'compiler-version',command:process.execPath,args:versionArgs,version:null,passed:false,stdout:versionOutput,message:error.message});throw error;}
  record({stage:'compiler-version',command:process.execPath,args:versionArgs,version,passed:true,stdout:versionOutput});
  const write=(path,source)=>{mkdirSync(dirname(join(directory,path)),{recursive:true});writeFileSync(join(directory,path),source);};for(const row of data.files.filter(row=>/\.(mjs|mts|ts)$/u.test(row.path)))write(row.path,row.source);for(const row of extraFiles)write(row.path,row.source);write('caller.mjs',result.javascript);write('typed.mts',result.typescript);
  const compileArgs=[compiler,'--strict','--skipLibCheck','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--outDir',join(directory,'out'),join(directory,'typed.mts')];
  const diagnostics=invoke('strict-typescript',compileArgs);record({stage:'strict-typescript',command:process.execPath,args:compileArgs,version,passed:true,stdout:diagnostics});
  for(const row of data.files.filter(row=>row.path.startsWith('runtime/')))write('out/'+row.path,row.source);
  for(const path of ['caller.mjs','out/typed.mjs']){
   try{const prefix=path.startsWith('out/')?'out/runtime/':'runtime/',api=await import(pathToFileURL(join(directory,path)));
    const load=name=>import(pathToFileURL(join(directory,prefix+name+'-runtime.mjs')));
    const [transport,control,protocol,json]=await Promise.all([load('http-transport'),load('async-control'),load('http-protocol'),load('json-macro')]);await verify(api,{transport,control,protocol,json});}
   catch(error){record({stage:'target-runtime',path,version,passed:false,message:String(error?.message??error)});throw error;}
   record({stage:'target-runtime',path,version,passed:true});
  }
 }finally{rmSync(directory,{recursive:true,force:true});}
}
