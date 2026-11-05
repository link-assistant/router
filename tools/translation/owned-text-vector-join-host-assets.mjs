// Complete original host asset closure plus fresh paired join assets.
import {ownedOutcomeRuntimeAssets as originalAssets} from './owned-outcome-runtime-assets.mjs';
import {ownedTextVectorJoinRuntimeAssetPair} from './owned-text-vector-join-runtime-sources.mjs';
export function ownedJoinRuntimeAssets(){const assets=new Map(originalAssets());for(const [name,source]of ownedTextVectorJoinRuntimeAssetPair()){if(assets.has(name)&&assets.get(name)!==source)throw new TypeError('Complete original join runtime asset conflict');assets.set(name,source);}return assets;}
