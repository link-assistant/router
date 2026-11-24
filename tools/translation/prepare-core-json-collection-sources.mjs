// Fixed source-data proposal only. Root executes/reviews/installs the output.
import {createHash} from 'node:crypto';
import {createRulePipeline} from './rule-pipeline.mjs';
import {prepareCoreJsonUpdateSourceData} from './prepare-core-json-update-sources.mjs';
const hash=source=>createHash('sha256').update(source).digest('hex');
export function prepareCoreJsonCollectionSourceData({sourceData,originalFacade,originalPrimitives,facade,primitives,collections}){
 const edits=[];const stage=createRulePipeline([
  {phase:'language',rules:[{id:'owned-json-collections:complete-leaf-and-current-facade',apply:()=>{
   if(typeof collections!=='string'||collections.length>2_000_000||sourceData.includes('export const ROUTER_CORE_JSON_COLLECTIONS_'))throw new TypeError('Fresh complete collection leaf source required');
   const base=prepareCoreJsonUpdateSourceData({sourceData,originalFacade,originalPrimitives,facade,primitives}).value;
   edits.push(...base.substitutions);return base.after;
  }}]},
  {phase:'repository',rules:[{id:'router-core:package-collection-leaf-with-whole-inverse',apply:base=>{
   const append='\nexport const ROUTER_CORE_JSON_COLLECTIONS_SOURCE='+JSON.stringify(collections)+';\nexport const ROUTER_CORE_JSON_COLLECTIONS_SHA256='+JSON.stringify(hash(collections))+';\n';
   const after=base+append;let inverse=after.slice(0,-append.length);for(const edit of [...edits].reverse()){if(inverse.split(edit.after).length!==2)throw new TypeError('Collection source-data inverse anchor differs');inverse=inverse.replace(edit.after,()=>edit.before);}if(inverse!==sourceData)throw new TypeError('Collection source-data complete inverse differs');
   return {before:sourceData,after,substitutions:edits,append,inverse,sha256:hash(after)};
  }}]},
 ]).run(null);return stage;
}
