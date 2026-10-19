// Receiving-only adaptations. Original fixture files and their pins stay exact.
import {createRulePipeline} from '../../rule-pipeline.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from '../../concrete-syntax-meta.mjs';

const pathRules=Object.freeze([
  ['javascript-native','packages/javascript/native','js/src'],
  ['typescript-native','packages/typescript/native','ts/src'],
  ['javascript-package','packages/javascript','js'],
  ['typescript-package','packages/typescript','ts'],
  ['typescript-native-export','./dist/native/','./dist/src/'],
  ['typescript-native-include','native/**/*.ts','src/**/*.ts'],
  ['typescript-native-asset-manifest',"'native/assets/admin'","'src/assets/admin'"],
  ['typescript-build-script','node ../../scripts/check-native-typescript.mjs --out-dir','node ../scripts/check-native-typescript.mjs --out-dir'],
]);
function roundtrip(source){
  const captured=transportConcreteSyntaxSource(source,{language:'JavaScript'});
  const wire=serializeConcreteSyntaxMeta(captured.document),reparsed=transportConcreteSyntaxMeta(wire);
  if(reparsed.source!==source)throw TypeError('Historical fixture CST source changed');
  return {wire,document:reparsed.document};
}
export function adaptHistoricalTypeScriptLayout(source){
  if(typeof source!=='string'||Buffer.byteLength(source)>1024*1024)throw TypeError('Bounded historical JavaScript source required');
  const original=roundtrip(source),mapping=[];
  const result=createRulePipeline([
    {phase:'language',rules:[{id:'javascript:complete-historical-cst-transport',apply:()=>transportConcreteSyntaxMeta(original.wire)}]},
    {phase:'repository',rules:pathRules.map(([id,before,after])=>({id:'router:historical-layout-'+id,apply:input=>{
      const edits=[];let at=0;
      while((at=input.source.indexOf(before,at))>=0){edits.push({span:[at,at+before.length],expected:before,replacement:after});at+=before.length;}
      // Path text can occupy the interior of a string/template CST token.
      // Pin the entire current parent instead of inventing token boundaries.
      let rewritten=input.source;
      for(const edit of [...edits].reverse())rewritten=rewritten.slice(0,edit.span[0])+edit.replacement+rewritten.slice(edit.span[1]);
      const applied=applyConcreteSyntaxSubstitutions(input.document,{languageRules:[],repositoryRules:[{id:'router:historical-layout-'+id,edits:[{span:[0,input.source.length],expected:input.source,replacement:rewritten}]}]});
      mapping.push({id,before,after,count:edits.length});
      return transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(applied.value));
    }}))},
  ]).run(source);
  const after=result.value.source,afterWire=serializeConcreteSyntaxMeta(result.value.document);
  const inverse=applyConcreteSyntaxSubstitutions(result.value.document,{languageRules:[],repositoryRules:[{id:'router:historical-layout-complete-inverse',edits:[{span:[0,after.length],expected:after,replacement:source}]}]});
  if(transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(inverse.value)).source!==source)throw TypeError('Historical layout inverse changed original bytes');
  return {source:after,beforeWire:original.wire,afterWire,mapping,trace:result.trace,wholeInverse:true};
}

// Metadata labels are preserved in the frozen baseline. Project only physical
// receiving reads; this spelling conversion grants no executable authority.
export function historicalNativeSourcePath(path){
  if(typeof path!=='string')throw TypeError('Historical native path required');
  for(const [,before,after]of pathRules.slice(0,4))if(path===before||path.startsWith(before+'/'))return after+path.slice(before.length);
  return path;
}
