// Complete additive strict receiving harness SOURCE. All execution UNRUN.
import {execFileSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,writeFileSync,cpSync,rmSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {writeNamedRuntimeAssets as writeRuntimeAssets} from './text-artifact-loader.mjs';

// Execute the emitted JavaScript and the separately strict-compiled TypeScript.
export async function verifyCrossModuleHelperTargets(result,verify,{childTimeoutMs=20000,record=()=>{}}={}) {
  if(childTimeoutMs!==undefined&&(!Number.isSafeInteger(childTimeoutMs)||childTimeoutMs<1||childTimeoutMs>120_000))throw new TypeError('Typed target child timeout must be a bounded positive integer');
  const childOptions={stdio:'pipe',...(childTimeoutMs!==undefined?{timeout:childTimeoutMs}:{})};
  const entry=result.meta?.entry;
  if(entry!==undefined&&(typeof entry!=='string'||!entry.endsWith('.rs')||entry.includes('\\')||entry.includes('\0')||entry.includes(':')||entry.split('/').some(part=>!part||part==='.'||part==='..')))throw new TypeError('Typed target entry must be a safe repository-relative Rust path');
  const relative=entry===undefined?'src/module':entry.slice(0,-3);
  const directory=mkdtempSync(join(tmpdir(),'router-typed-targets-'));
  try {
    writeRuntimeAssets(directory);
    const javascript=join(directory,relative+'.mjs'),typescript=join(directory,relative+'.ts');
    mkdirSync(dirname(javascript),{recursive:true});
    writeFileSync(javascript,result.javascript);
    writeFileSync(typescript,result.typescript);
    // Bun's --check is not Node's syntax-only command. Scan the complete module
    // without executing it or resolving imports; both targets execute below.
    if(process.versions.bun)new Bun.Transpiler({loader:'js',target:'bun'}).scan(result.javascript);
    else execFileSync(process.execPath,['--check',javascript],childOptions);
    const compiled=join(directory,'compiled');
    const require=createRequire(new URL('../../../js/package.json',import.meta.url)),compiler=process.execPath,prefix=[require.resolve('typescript/bin/tsc')];
    const version=execFileSync(compiler,[...prefix,'--version'],childOptions).toString();
    if(version.trim()!=='Version 5.9.3')throw new TypeError('Cross-module helper requires lockfile TypeScript5.9.3');
    record({stage:'compiler-version',version:'5.9.3',output:version});
    const args=[...prefix,'--strict','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--skipLibCheck','--rootDir',directory,'--outDir',compiled,typescript];
    try{const stdout=execFileSync(compiler,args,childOptions).toString();record({stage:'strict-typescript',version:'5.9.3',args,stdout,passed:true});}
    catch(error){record({stage:'strict-typescript',version:'5.9.3',args,stdout:error.stdout?.toString()??'',stderr:error.stderr?.toString()??'',passed:false});throw error;}
    cpSync(join(directory,'runtime'),join(compiled,'runtime'),{recursive:true});
    if(entry===undefined)symlinkSync('../runtime',join(compiled,'src/runtime'),'dir');
    for(const [path,runtimeRoot] of [[javascript,directory],[join(compiled,relative+'.js'),compiled]]) {
      const module=await import(pathToFileURL(path));
      const effects=await import(pathToFileURL(join(runtimeRoot,'runtime/effects.mjs')));
      await verify(module.translated,result,module,{effects});
    }
  } finally {rmSync(directory,{recursive:true,force:true});}
}
