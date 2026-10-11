import {execFileSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,cpSync,rmSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {writeRuntimeAssets} from './artifact-loader.mjs';

// Execute the emitted JavaScript and the separately strict-compiled TypeScript.
export async function verifyTypedTargets(result,verify) {
  const directory=mkdtempSync(join(tmpdir(),'router-typed-targets-'));
  try {
    writeRuntimeAssets(directory);
    writeFileSync(join(directory,'src/module.mjs'),result.javascript);
    writeFileSync(join(directory,'src/module.ts'),result.typescript);
    execFileSync(process.execPath,['--check',join(directory,'src/module.mjs')],{stdio:'pipe'});
    const compiled=join(directory,'compiled');
    execFileSync(process.env.ROUTER_TRANSLATION_TSC??'tsc',['--strict','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--skipLibCheck','--rootDir',directory,'--outDir',compiled,join(directory,'src/module.ts')],{stdio:'pipe'});
    cpSync(join(directory,'runtime'),join(compiled,'runtime'),{recursive:true});
    symlinkSync('../runtime',join(compiled,'src/runtime'),'dir');
    for(const path of [join(directory,'src/module.mjs'),join(compiled,'src/module.js')]) {
      const module=await import(pathToFileURL(path));
      await verify(module.translated,result,module);
    }
  } finally {rmSync(directory,{recursive:true,force:true});}
}
