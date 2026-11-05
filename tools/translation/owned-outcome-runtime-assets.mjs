import {readFileSync} from 'node:fs';
import {hostRuntimeAssetsNamedDataAliases} from './host-assets.mjs';
export function ownedOutcomeRuntimeAssets(){
 const assets=hostRuntimeAssetsNamedDataAliases();for(const name of ['owned-outcome-runtime.mjs','owned-outcome-runtime.d.mts','integer-runtime.mjs','integer-runtime.d.mts','text-runtime.mjs','text-runtime.d.mts','primitive-option-runtime.mjs','primitive-option-runtime.d.mts','primitive-option-callback-runtime.mjs','primitive-option-callback-runtime.d.mts','primitive-result-runtime.mjs','primitive-result-runtime.d.mts','owned-result-runtime.mjs','owned-result-runtime.d.mts','http-protocol-runtime.mjs','http-protocol-runtime.d.mts','async-control-runtime.mjs','async-control-runtime.d.mts','http-transport-runtime.mjs','http-transport-runtime.d.mts','http-network-policy-runtime.mjs'])assets.set(name,readFileSync(new URL('./'+name,import.meta.url),'utf8'));for(const [name,source]of primitiveSequenceRuntimeAssetPair())assets.set(name,source);return assets;
}

import {primitiveSequenceRuntimeAssetPair} from './primitive-sequence-runtime-sources.mjs';
