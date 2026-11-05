// Canonical Node source DATA only. This never qualifies Bun's transformed
// compiler functions or enables its native runtime-import optimization.
import {execFileSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {prepareCurrentCoreAsciiReverseAssets} from '../prepare-core-ascii-assets.mjs';
import {prepareCurrentCoreAsciiBaseAssets} from '../prepare-core-ascii-base-assets.mjs';
function sourcePlan(module,name,run){
 if(!process.versions.bun)return run();
 const root=fileURLToPath(new URL('../../../',import.meta.url));
 const script="import {gzipSync} from 'node:zlib';import {"+name+"} from "+JSON.stringify(new URL(module,import.meta.url).href)+";process.stdout.write(gzipSync(JSON.stringify("+name+"()),{level:1,mtime:0}));";
 const packed=execFileSync(process.env.ROUTER_TRANSLATION_NODE??'node',['--input-type=module','--eval',script],{timeout:50000,maxBuffer:64*1024*1024,env:{...process.env,ROUTER_NATIVE_TS_SOURCE_ROOT:root}});
 return JSON.parse(gunzipSync(packed,{maxOutputLength:512*1024*1024}).toString('utf8'));
}
export const currentAsciiSourcePlan=()=>sourcePlan('../prepare-core-ascii-assets.mjs','prepareCurrentCoreAsciiReverseAssets',prepareCurrentCoreAsciiReverseAssets);
export const currentAsciiBaseSourcePlan=()=>sourcePlan('../prepare-core-ascii-base-assets.mjs','prepareCurrentCoreAsciiBaseAssets',prepareCurrentCoreAsciiBaseAssets);
