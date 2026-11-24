// Fixed complete-source synchronizer. It grants no parser/type authority.
import {createHash} from 'node:crypto';
import {createRulePipeline} from './rule-pipeline.mjs';
const hash=text=>createHash('sha256').update(text).digest('hex');
const unique=(source,before,after)=>{if(source.split(before).length!==2)throw new TypeError('Owned JSON source-data anchor is not unique');return source.replace(before,()=>after);};
export function prepareCoreJsonUpdateSourceData({sourceData,originalFacade,originalPrimitives,facade,primitives}){
  for(const source of [sourceData,originalFacade,originalPrimitives,facade,primitives])if(typeof source!=='string'||source.length>2_000_000)throw new TypeError('Bounded full primitive source data required');
  const substitutions=[];
  const pipeline=createRulePipeline([
    {phase:'language',rules:[{id:'owned-json-update:complete-current-source-literals',apply:()=>{
      for(const [name,before,after] of [['ROUTER_FORMATTING_FACADE',originalFacade,facade],['ROUTER_CORE_PRIMITIVES',originalPrimitives,primitives]])for(const suffix of ['SOURCE','SHA256']){
        const value=text=>suffix==='SOURCE'?text:hash(text);substitutions.push({before:'export const '+name+'_'+suffix+'='+JSON.stringify(value(before))+';',after:'export const '+name+'_'+suffix+'='+JSON.stringify(value(after))+';'});
      }return substitutions;
    }}]},
    {phase:'repository',rules:[{id:'router-core:package-exact-source-data-and-inverse',apply:edits=>{
      let after=sourceData;for(const edit of edits)after=unique(after,edit.before,edit.after);let inverse=after;for(const edit of [...edits].reverse())inverse=unique(inverse,edit.after,edit.before);if(inverse!==sourceData)throw new TypeError('Owned JSON source-data complete inverse differs');return {before:sourceData,after,substitutions:edits,inverse,sha256:hash(after)};
    }}]},
  ]);return pipeline.run(null);
}
