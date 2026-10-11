import {execFileSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,cpSync,rmSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {writeRuntimeAssets} from './artifact-loader.mjs';

// The same literal assertions run on unchanged emitted JS and independently
// strict-compiled TS. Runtime injection uses each artifact's actual module URL.
export async function verifyCohortTargets(result,verify) {
  const directory=mkdtempSync(join(tmpdir(),'router-cohort-targets-'));
  try {
    writeRuntimeAssets(directory);
    const javascript=join(directory,'src/module.mjs'),typescript=join(directory,'src/module.ts');
    writeFileSync(javascript,result.javascript);writeFileSync(typescript,result.typescript);
    execFileSync(process.execPath,['--check',javascript],{stdio:'pipe',timeout:30_000});
    const compiled=join(directory,'compiled');
    try{execFileSync(process.env.ROUTER_TRANSLATION_TSC??'tsc',['--strict','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--skipLibCheck','--rootDir',directory,'--outDir',compiled,typescript],{stdio:'pipe',timeout:30_000});}
    catch(error){throw new Error(`strict TypeScript failed:\n${error.stdout??''}${error.stderr??''}`,{cause:error});}
    cpSync(join(directory,'runtime'),join(compiled,'runtime'),{recursive:true});
    symlinkSync('../runtime',join(compiled,'src/runtime'),'dir');
    for(const [path,runtime]of [[javascript,join(directory,'runtime/effects.mjs')],[join(compiled,'src/module.js'),join(compiled,'runtime/effects.mjs')]]) {
      const module=await import(pathToFileURL(path).href),effects=await import(pathToFileURL(runtime).href);
      await verify(module.translated,effects,result,module);
    }
  } finally {rmSync(directory,{recursive:true,force:true});}
}
