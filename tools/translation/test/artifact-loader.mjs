import {mkdtempSync,mkdirSync,writeFileSync,rmSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {hostRuntimeAssets} from '../host-assets.mjs';
import {effectRuntimeAssets} from '../effect-assets.mjs';
export function writeRuntimeAssets(directory) {
  mkdirSync(join(directory,'runtime'),{recursive:true});mkdirSync(join(directory,'src'),{recursive:true});
  const assets=hostRuntimeAssets(),effects=effectRuntimeAssets();assets.set('effects.mjs',effects.javascript);assets.set('effects.d.mts',effects.declarations);
  for(const [path,content] of assets)writeFileSync(join(directory,'runtime',path),content);
  symlinkSync('../runtime',join(directory,'src/runtime'),'dir');
  writeFileSync(join(directory,'package.json'),' {"type":"module"}\n');
}
export async function loadJavaScript(text) {
  const directory=mkdtempSync(join(tmpdir(),'router-artifact-'));
  try {writeRuntimeAssets(directory);const path=join(directory,'src/module.mjs');writeFileSync(path,text);return await import(pathToFileURL(path).href);}
  finally {rmSync(directory,{recursive:true,force:true});}
}
