// Invocation-local structural graph plumbing. Callback results are not parser,
// source/type/body/namespace permission; the original private reader owns those.
import {requireSynchronousSourceCallback,withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
const fail=message=>{throw TypeError('Ordered helper layout graph: '+message);};
export function createOrderedScalarHelperLayoutGraph20261104(options){
 let inspect=requireSynchronousSourceCallback(options.inspect),resolve=requireSynchronousSourceCallback(options.resolve),current=requireSynchronousSourceCallback(options.current),charge=requireSynchronousSourceCallback(options.charge);
 let alive=true,failed=false,primary,draining=false,cells=0,position=0;const modules=new Map(),queue=[];
 const tick=()=>{if(++cells>100000)fail('original complete helper work bound');charge(0);};
 function invoke(run){try{return withCompleteSourceClosingFence(run,[]);}catch(error){if(!failed){failed=true;primary=error;}throw error;}}
 function require(){if(!alive)fail('expired structural graph');if(failed)throw primary;invoke(()=>current());}
 function ensure(file,path){
  tick();require();const known=modules.get(file);if(known){if(known.path!==path)fail('one original native file has competing paths');return known.layout;}
  if(modules.size>=4096)fail('original complete source-file bound');
  const layout=invoke(()=>inspect(file,path));if(!layout||!(layout.functions instanceof Map)||!(layout.exports instanceof Map)||!Array.isArray(layout.imports))fail('complete original module layout required');
  if(queue.length+layout.imports.length>100000)fail('complete original import work bound');
  modules.set(file,{path,layout});for(const job of layout.imports){tick();queue.push(job);}return layout;
 }
 function drain(){
  if(draining)return;draining=true;
  try{while(position<queue.length){tick();require();const job=queue[position];queue[position++]=null;invoke(()=>resolve(job));}require();}finally{draining=false;}
 }
 return Object.freeze({
  withSelection(file,path,run){
   requireSynchronousSourceCallback(run);require();
   return invoke(()=>withCompleteSourceClosingFence(()=>{const layout=ensure(file,path);drain();return run(layout);},[()=>current()]));
  },
  close(){
   if(!alive)return;
   return withCompleteSourceClosingFence(()=>{if(failed)throw primary;},[()=>current(),()=>{alive=false;modules.clear();queue.length=0;position=0;primary=undefined;inspect=null;resolve=null;current=null;charge=null;}]);
  },
 });
}
/** Syntax/pointer DATA only. A native caller must establish actual compiler,
 * file/source identity and real import/export symbol joins independently. */
export function inspectOrderedScalarHelperModule20261104({ts,file,path,source,charge}){
 if(file.fileName!==path||file.text!==source||file.parseDiagnostics?.length)fail('complete original native module differs');
 const functions=new Map(),exports=new Map(),imports=[];
 for(const statement of file.statements){
  charge(0);
  if(ts.isEmptyStatement(statement))continue;
  if(ts.isImportDeclaration(statement)){
   const clause=statement.importClause;
   if(!clause||clause.name||!clause.namedBindings||!ts.isNamedImports(clause.namedBindings)||!ts.isStringLiteral(statement.moduleSpecifier)||statement.attributes||statement.assertClause)fail('actual ordinary named helper import required');
   for(const spec of clause.namedBindings.elements){charge(0);imports.push({file,path,spec,typeOnly:clause.isTypeOnly||spec.isTypeOnly});}
   continue;
  }
  if(!ts.isFunctionDeclaration(statement)||statement.parent!==file||!statement.name||!statement.body||statement.asteriskToken||statement.typeParameters||statement.modifiers?.some(mod=>mod.kind!==ts.SyntaxKind.ExportKeyword)||functions.has(statement.name.text))fail('distinct ordinary top-level helper functions without effects required');
  functions.set(statement.name.text,statement);if(statement.modifiers?.some(mod=>mod.kind===ts.SyntaxKind.ExportKeyword))exports.set(statement.name.text,statement);
 }
 return {functions,exports,imports,sourceAuthority:false,semanticAuthority:false,nativeBindingQualified:false};
}
