// Receiving-only adaptations. Original fixture files and their pins stay exact.
import {createRulePipeline} from '../../rule-pipeline.mjs';
import {createHash} from 'node:crypto';
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

// A pinned complete bulk snapshot keeps its original package labels. Derive
// the receiving source explicitly; never edit that snapshot or its hash pin.
export function adaptHistoricalBulkLayout(source){
 if(typeof source!=='string'||Buffer.byteLength(source)>1048576)throw TypeError('Bounded original bulk source required');
 if(createHash('sha256').update(source).digest('hex')!=='b960233f07581c46b15f3bb6bb5b5d9987bc2881914ef84481393cf108f89b5e')throw TypeError('Complete pinned original bulk source required');
 const rows=[
  ['javascript-package','packages/javascript','js',2],
  ['typescript-package','packages/typescript','ts',2],
  ['layout-import',"import { execFileSync } from 'node:child_process';","import { execFileSync } from 'node:child_process';\nimport {repositoryRustLayout} from './repository-layout.mjs';",1],
  ['layout-capture','  root = resolve(root);','  root = resolve(root);\n  const rustLayout=repositoryRustLayout(root);',1],
  ['manifest-read',"readSource('Cargo.toml')",'readSource(rustLayout.manifest)',8],
  ['manifest-path',"join(root,'Cargo.toml')",'join(root,rustLayout.manifest)',4],
  ['lock-read',"readSource('Cargo.lock')",'readSource(rustLayout.lock)',6],
  ['lock-path',"join(root,'Cargo.lock')",'join(root,rustLayout.lock)',3],
  ['production-description',"'src/ paths excluding names containing tests or test_support'","rustLayout.productionPrefix+' paths excluding names containing tests or test_support'",1],
  ['entries',"['src/lib.rs', 'src/main.rs']",'rustLayout.entries',1],
  ['manifest-label','cargoManifest,progress:progressInput','cargoManifest,cargoManifestPath:rustLayout.manifest,progress:progressInput',1],
  ['production-prefix',"path.startsWith('src/')",'path.startsWith(rustLayout.productionPrefix)',1],
 ];
 const before=roundtrip(source),mapping=[];
 const result=createRulePipeline([
  {phase:'language',rules:[{id:'javascript:complete-original-bulk-cst',apply:()=>transportConcreteSyntaxMeta(before.wire)}]},
  {phase:'repository',rules:[{id:'router:historical-bulk-physical-layout',apply:input=>{
   let after=input.source;
   for(const [id,expected,replacement,count]of rows){if(after.split(expected).length-1!==count)throw TypeError('Historical bulk layout anchor changed: '+id);after=after.split(expected).join(replacement);mapping.push({id,expected,replacement,count});}
   const applied=applyConcreteSyntaxSubstitutions(input.document,{languageRules:[],repositoryRules:[{id:'router:complete-original-bulk-layout',edits:[{span:[0,source.length],expected:source,replacement:after}]}]});return transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(applied.value));
  }}]},
 ]).run(source);
 const inverse=applyConcreteSyntaxSubstitutions(result.value.document,{languageRules:[],repositoryRules:[{id:'router:complete-historical-bulk-inverse',edits:[{span:[0,result.value.source.length],expected:result.value.source,replacement:source}]}]});
 if(transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(inverse.value)).source!==source)throw TypeError('Complete historical bulk inverse differs');
 return {source:result.value.source,beforeWire:before.wire,afterWire:serializeConcreteSyntaxMeta(result.value.document),mapping,trace:result.trace,wholeInverse:true};
}

export function adaptHistoricalMatrixLayout(source){
 if(typeof source!=='string'||Buffer.byteLength(source)>1048576||createHash('sha256').update(source).digest('hex')!=='555154e85b9faf5df061d501be34b5e628d3517bb98371a040f393d89e4b3e46')throw TypeError('Complete pinned original matrix source required');
 const original=roundtrip(source),before="entries=entryPaths(entries??['src/lib.rs','src/main.rs'].filter(path=>tracked.has(path)),tracked);",after='entries=entryPaths(entries??repositoryRustLayout(root).entries.filter(path=>tracked.has(path)),tracked);';
 if(source.split(before).length!==2)throw TypeError('Historical matrix entry anchor changed');
 const result=createRulePipeline([
  {phase:'language',rules:[{id:'javascript:complete-original-matrix-cst',apply:()=>transportConcreteSyntaxMeta(original.wire)}]},
  {phase:'repository',rules:[{id:'router:historical-matrix-physical-layout',apply:input=>{
   const target="import {repositoryRustLayout} from './repository-layout.mjs';\n"+source.replace(before,()=>after);
   const applied=applyConcreteSyntaxSubstitutions(input.document,{languageRules:[],repositoryRules:[{id:'router:complete-original-matrix-layout',edits:[{span:[0,source.length],expected:source,replacement:target}]}]});return transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(applied.value));
  }}]},
 ]).run(source);
 const inverse=applyConcreteSyntaxSubstitutions(result.value.document,{languageRules:[],repositoryRules:[{id:'router:complete-historical-matrix-inverse',edits:[{span:[0,result.value.source.length],expected:result.value.source,replacement:source}]}]});
 if(transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(inverse.value)).source!==source)throw TypeError('Complete historical matrix inverse differs');
 return {source:result.value.source,beforeWire:original.wire,afterWire:serializeConcreteSyntaxMeta(result.value.document),trace:result.trace,wholeInverse:true};
}
