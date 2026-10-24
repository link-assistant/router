import {readFileSync} from 'node:fs';
import {hostRuntimeAssetsNamedDataAliases} from './host-assets.mjs';
export function ownedOutcomeRuntimeAssets(){
 const assets=hostRuntimeAssetsNamedDataAliases();for(const name of ['owned-outcome-runtime.mjs','owned-outcome-runtime.d.mts'])assets.set(name,readFileSync(new URL('./'+name,import.meta.url),'utf8'));return assets;
}
