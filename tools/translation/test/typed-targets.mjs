import {execFileSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,writeFileSync,cpSync,rmSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {writeRuntimeAssets} from './artifact-loader.mjs';

// Execute the emitted JavaScript and the separately strict-compiled TypeScript.
export async function verifyTypedTargets(result,verify,{childTimeoutMs}={}) {
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
    execFileSync(process.execPath,['--check',javascript],childOptions);
    const compiled=join(directory,'compiled');
    execFileSync(process.env.ROUTER_TRANSLATION_TSC??'tsc',['--strict','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--skipLibCheck','--rootDir',directory,'--outDir',compiled,typescript],childOptions);
    cpSync(join(directory,'runtime'),join(compiled,'runtime'),{recursive:true});
    if(entry===undefined)symlinkSync('../runtime',join(compiled,'src/runtime'),'dir');
    for(const path of [javascript,join(compiled,relative+'.js')]) {
      const module=await import(pathToFileURL(path));
      await verify(module.translated,result,module);
    }
  } finally {rmSync(directory,{recursive:true,force:true});}
}
