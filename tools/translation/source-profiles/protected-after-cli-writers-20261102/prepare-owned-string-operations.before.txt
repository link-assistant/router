// Extend the existing checked reverse string family through complete CST meta.
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {prepareCurrentCoreAsciiReverseAssets} from './prepare-core-ascii-assets.mjs';
import {extendOwnedStringOperations,restoreOwnedStringOperations,OWNED_STRING_OPERATION_PATHS} from './owned-string-operation-rules.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const fail=message=>{throw TypeError('Owned string operation preparation: '+message);};
export function composeOwnedStringOperations(prior,{root=ROOT}={}){
 const ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('TypeScript 5.9.3 required');
 const sources={...prior},rows=OWNED_STRING_OPERATION_PATHS.filter(path=>Object.hasOwn(prior,path)).map(path=>{
  const before=prior[path].after,after=extendOwnedStringOperations(path,before);
  if(after===before||restoreOwnedStringOperations(path,after)!==before)fail('complete predecessor or inverse differs: '+path);
  for(const source of [before,after]){const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('complete native syntax differs: '+path);}
  const current=readFileSync(resolve(root,path),'utf8');if(restoreOwnedStringOperations(path,current)!==before)fail('complete current source differs from its pinned predecessor: '+path);
  return {path,before,after,current};
 });
 const equations=transportConcreteSourceEquations(rows.map(row=>({before:row.before,after:row.after,language:'JavaScript'})));
 rows.forEach((row,index)=>{const equation=equations[index];if(equation.before!==row.before||equation.after!==row.after||equation.inverse!==row.before)fail('complete CST inverse differs');sources[row.path]={...row,equation};});
 return {sources,layers:[{schema:'owned-string-operation-sources-v1',files:rows,semanticAuthority:false,rustExecuted:false}]};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--check','--write'].includes(args[0]))fail('use --check|--write');
 const plan=prepareCurrentCoreAsciiReverseAssets();
 if(args[0]==='--check'&&plan.files.some(row=>row.current!==row.after))fail('complete generated sources are stale');
 if(args[0]==='--write'){for(const row of plan.files)if(readFileSync(resolve(ROOT,row.path),'utf8')!==row.current)fail('source changed before write');for(const row of plan.files)writeFileSync(resolve(ROOT,row.path),row.after);}
 console.log(JSON.stringify({schema:plan.schema,files:plan.files.map(row=>row.path),rustExecuted:false}));
}
