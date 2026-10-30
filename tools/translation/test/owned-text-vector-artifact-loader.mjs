// Explicit paired family writer; original text artifact writers stay unchanged.
import {mkdirSync,writeFileSync,symlinkSync} from 'node:fs';
import {join} from 'node:path';
import {hostRuntimeAssetsNamedDataAliases} from '../text-host-assets.mjs';
import {ownedTextVectorForwardRuntimeAssets} from '../owned-text-vector-forward-domain.mjs';
import {effectRuntimeAssets} from '../effect-assets.mjs';
export function writeOwnedTextVectorRuntimeAssets(directory){
 mkdirSync(join(directory,'runtime'),{recursive:true});mkdirSync(join(directory,'src'),{recursive:true});const assets=hostRuntimeAssetsNamedDataAliases(),effects=effectRuntimeAssets();
 for(const [name,source]of ownedTextVectorForwardRuntimeAssets()){
  // This explicit profile selects the complete original scalar declarations
  // instead of the legacy writer's two-function declaration projection.
  if(assets.has(name)&&assets.get(name)!==source&&name!=='primitive-operator-runtime.d.mts')throw new TypeError('Conflicting complete owned text vector artifact source');assets.set(name,source);
 }
 assets.set('effects.mjs',effects.javascript);assets.set('effects.d.mts',effects.declarations);for(const [name,source]of assets)writeFileSync(join(directory,'runtime',name),source);symlinkSync('../runtime',join(directory,'src/runtime'),'dir');writeFileSync(join(directory,'package.json'),'{"type":"module"}\n');
}
