// Complete independent target files; one strict compiler process per batch.
import {execFileSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,writeFileSync,cpSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {writeNamedRuntimeAssets as writeRuntimeAssets} from './artifact-loader.mjs';
export async function verifyTypedTargetsBatch(results,verify,{childTimeoutMs=20000}={}){
 if(!Array.isArray(results)||!results.length||results.length>64||typeof verify!=='function'||!Number.isSafeInteger(childTimeoutMs)||childTimeoutMs<1||childTimeoutMs>120000)throw new TypeError('Bounded complete typed target batch required');
 const childOptions={stdio:'pipe',timeout:childTimeoutMs},directory=mkdtempSync(join(tmpdir(),'router-typed-target-batch-')),entries=new Set(),paths=[];let units=0;
 try{
  writeRuntimeAssets(directory);
  for(const result of results){
   const entry=result.meta?.entry;if(typeof entry!=='string'||!entry.endsWith('.rs')||entry.includes('\\')||entry.includes('\0')||entry.includes(':')||entry.split('/').some(part=>!part||part==='.'||part==='..')||entries.has(entry)||typeof result.javascript!=='string'||typeof result.typescript!=='string')throw new TypeError('Complete unique typed target entry required');entries.add(entry);units+=result.javascript.length+result.typescript.length;if(units>33554432)throw new TypeError('Typed target batch text budget');
   const relative=entry.slice(0,-3),javascript=join(directory,relative+'.mjs'),typescript=join(directory,relative+'.ts');mkdirSync(dirname(javascript),{recursive:true});writeFileSync(javascript,result.javascript);writeFileSync(typescript,result.typescript);
   if(process.versions.bun)new Bun.Transpiler({loader:'js',target:'bun'}).scan(result.javascript);else execFileSync(process.execPath,['--check',javascript],childOptions);paths.push({result,relative,javascript,typescript});
  }
  let compiler=process.env.ROUTER_TRANSLATION_TSC,prefix=[];if(compiler===undefined){try{const require=createRequire(new URL('../../../js/package.json',import.meta.url));prefix=[require.resolve('typescript/bin/tsc')];compiler=process.execPath;}catch(error){if(error.code!=='MODULE_NOT_FOUND')throw error;compiler='tsc';}}
  const compiled=join(directory,'compiled');execFileSync(compiler,[...prefix,'--strict','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--skipLibCheck','--rootDir',directory,'--outDir',compiled,...paths.map(row=>row.typescript)],childOptions);cpSync(join(directory,'runtime'),join(compiled,'runtime'),{recursive:true});
  for(const {result,relative,javascript}of paths)for(const [file,runtimeRoot]of [[javascript,directory],[join(compiled,relative+'.js'),compiled]]){const module=await import(pathToFileURL(file)),effects=await import(pathToFileURL(join(runtimeRoot,'runtime/effects.mjs')));await verify(module.translated,result,module,{effects});}
 }finally{rmSync(directory,{recursive:true,force:true});}
}
