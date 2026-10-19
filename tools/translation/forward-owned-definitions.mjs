// Repository projection of genuine current checked declarations. These sources
// form a new definition-only receiving corpus, never module-startup equivalence.
import {createHash} from 'node:crypto';
import {JSON_DATA} from './extensions/json-contracts.mjs';
import {valueSchema,typeScriptAliases} from './type-layout.mjs';
import {annotateRuntimeTypes} from './translate.mjs';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {prepareOwnedCorePairedTypes} from './js-to-rust/owned-core-paired-types.mjs';
import {assertReverseConcreteSourceHost} from './js-to-rust/concrete-source.mjs';
import {transportConcreteSyntaxSources} from './concrete-syntax-meta.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {prepareForwardJsonReaderDefinition} from './forward-owned-json-reader-definitions.mjs';
import {prepareForwardJsonCompositionDefinition,prepareForwardJsonNonemptyFieldDefinition} from './forward-owned-json-composition.mjs';
import {prepareForwardJsonScalarFoldDefinition} from './forward-owned-json-scalar-folds.mjs';
import {prepareForwardJsonConstructorDefinition} from './forward-owned-json-constructors.mjs';
const hash=value=>{assertReverseConcreteSourceHost();const result=createHash('sha256').update(value).digest('hex');assertReverseConcreteSourceHost();return result;};
const fail=message=>{throw TypeError('Forward owned definition: '+message);};
const roles=['Value','Number','MapEntry','Map_String_Value'];
function schemaInRegisteredNames(declarations,names){
 const schema=valueSchema(declarations);
 const visit=value=>Array.isArray(value)?value.map(visit):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([key,child])=>[key,key==='name'&&typeof child==='string'&&names.has(child)?names.get(child):visit(child)])):value;
 return {schemaVersion:schema.schemaVersion,types:Object.fromEntries([...names].map(([name,registered])=>[registered,visit(schema.types[name])]).sort(([a],[b])=>a<b?-1:a>b?1:0))};
}
// Called only on the actual current private compile branch. Detached public
// saved metadata is not read here and cannot supply a source/type permit.
function canonicalReturn(entry,checked,target,lowered){
 const expected=new Map(JSON_DATA[0].items.filter(item=>roles.includes(item.name)).map(item=>['serde_json.'+item.name,{...item,fullName:'serde_json.'+item.name}]));
 const original=checked.declarations.get(entry.name),actual=target.program.declarations.get(target.names.get(entry.name));
 const closed=type=>type?.kind==='data'&&!type.rustReference&&!type.rustOwnership&&!type.patternOwnershipRefusal&&!type.rustBorrowingUnresolved&&!type.rustGenericIdentityUnresolved;
 if(!original||!actual||original.k!=='fn'||actual.k!=='fn'||original.params.length||actual.params.length||!closed(original.ret)||!closed(actual.ret)||!closed(lowered.own.ret))fail('requires actual owned canonical Json return');
 const sourceNames=new Map(),targetNames=new Map(),sourceData=new Map(),targetData=new Map();
 for(const role of roles){
  const path=['serde_json',role],candidates=[...checked.declarations.values()].filter(item=>item.k==='data'&&item.generated==='router-json-contract'&&item.hostTypePath?.join('::')===path.join('::'));
  if(candidates.length!==1)fail('canonical source owner is absent or ambiguous');
  const source=candidates[0],name=target.names.get(source.fullName),current=target.program.declarations.get(name),emitted=lowered.program.declarations.get(name);
  if(!current||!emitted||current.generated!=='router-project-flattened'||emitted.generated!=='router-project-flattened'||current.hostTypePath?.join('::')!==path.join('::')||emitted.hostTypePath?.join('::')!==path.join('::'))fail('canonical target owner changed');
  sourceNames.set(source.fullName,'serde_json.'+role);targetNames.set(name,'serde_json.'+role);sourceData.set(source.fullName,source);targetData.set(name,current);
 }
 const identities=new Map([...expected.keys()].map(name=>[name,name])),wanted=JSON.stringify(schemaInRegisteredNames(expected,identities));
 if(JSON.stringify(schemaInRegisteredNames(sourceData,sourceNames))!==wanted||JSON.stringify(schemaInRegisteredNames(targetData,targetNames))!==wanted||JSON.stringify(schemaInRegisteredNames(new Map([...lowered.program.declarations].filter(([name])=>targetNames.has(name))),targetNames))!==wanted)fail('complete canonical JSON ABI layout differs');
 if(sourceNames.get(original.ret.name)!=='serde_json.Value'||targetNames.get(actual.ret.name)!=='serde_json.Value'||targetNames.get(lowered.own.ret.name)!=='serde_json.Value')fail('return is not the actual registered canonical Value');
 return actual;
}
function transform(source,edits,language){
 edits.sort((a,b)=>a.start-b.start||a.end-b.end);let previous=0,offset=0,after='',mapping=[];
 for(const edit of edits){if(!Number.isSafeInteger(edit.start)||!Number.isSafeInteger(edit.end)||edit.start<previous||edit.end<edit.start||edit.end>source.length)fail('source edit boundary');
  if(edit.start>previous){const text=source.slice(previous,edit.start);mapping.push({kind:'unchanged',before:[previous,edit.start],after:[offset,offset+text.length]});after+=text;offset+=text.length;}
  const expected=source.slice(edit.start,edit.end);mapping.push({kind:'substitution',before:[edit.start,edit.end],after:[offset,offset+edit.replacement.length],expected,replacement:edit.replacement});after+=edit.replacement;offset+=edit.replacement.length;previous=edit.end;
 }
 if(previous<source.length){const text=source.slice(previous);mapping.push({kind:'unchanged',before:[previous,source.length],after:[offset,offset+text.length]});after+=text;}
 let inverse=after;for(const row of [...mapping].reverse())if(row.kind==='substitution')inverse=inverse.slice(0,row.after[0])+row.expected+inverse.slice(row.after[1]);if(inverse!==source)fail('whole source inverse differs');
 const batch=transportConcreteSyntaxSources([{source,language},{source:after,language}]);if(batch.rows[0].source!==source||batch.rows[1].source!==after)fail('complete CST reconstruction differs');
 return {before:{source,sha256:hash(source),meta:batch.rows[0].meta},after:{source:after,sha256:hash(after),meta:batch.rows[1].meta},edits,mapping,trace:batch.rows.map(row=>row.trace)};
}
function nativeModule(ts,path,source,language,target){
 const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,language==='JavaScript'?ts.ScriptKind.JS:ts.ScriptKind.TS);if(file.parseDiagnostics.length)fail('native standalone syntax');
 const functions=file.statements.filter(ts.isFunctionDeclaration);if(functions.length!==1||functions[0].name?.text!==target||functions[0].parameters.length||!functions[0].body||functions[0].asteriskToken||functions[0].typeParameters?.length)fail('requires one ordinary zero-parameter definition');
 for(const statement of file.statements){
  if(ts.isFunctionDeclaration(statement)||ts.isEmptyStatement(statement)||language==='TypeScript'&&ts.isTypeAliasDeclaration(statement))continue;
  if(!ts.isImportDeclaration(statement)||statement.importClause?.isTypeOnly||!statement.importClause?.namedBindings||!ts.isNamedImports(statement.importClause.namedBindings)||!ts.isStringLiteral(statement.moduleSpecifier)||statement.moduleSpecifier.text!=='../runtime/json-macro-runtime.mjs')fail('definition has startup, helper or unrelated import');
 }
 if(functions[0].body.statements.length!==1||!ts.isReturnStatement(functions[0].body.statements[0]))fail('definition requires its complete ordinary return body');
 return {file,fn:functions[0]};
}
function literalTree(tree,budget={nodes:0},depth=0){
 if(!tree||++budget.nodes>4096||depth>32)return false;
 if(['null','bool','string','u64','i64'].includes(tree.kind))return true;
 if(tree.kind==='array')return tree.items.length<=4096&&tree.items.every(child=>literalTree(child,budget,depth+1));
 if(tree.kind==='object')return tree.entries.length<=4096&&new Set(tree.entries.map(entry=>entry.key)).size===tree.entries.length&&tree.entries.every(entry=>typeof entry.key==='string'&&literalTree(entry.value,budget,depth+1));
 return false;
}
/** Internal repository phase; inputs are supplied by the private compiler. */
export function prepareForwardOwnedDefinitions({project,entries,checked,genuineOrigin,target,sourceModules,lower,readerFormat}){
 assertReverseConcreteSourceHost();
 const definitions=[],unsupported=[],parents=new Map();let bytes=0;
 if(entries.length>4096)fail('definition count bound');
 for(const entry of entries){
  const current=target.program.declarations.get(target.names.get(entry.name));
  // Candidate filtering only. The actual lower() rechecks original source/calls.
  if(entry.term!=='fn'||!current||current.params.length||current.async||current.body.k!=='routerJsonMacro'||current.body.args.length||!literalTree(current.body.jsonTree)){
   try{
    const candidate=prepareForwardJsonReaderDefinition({project,entry,checked,target,sourceModules,lower,index:definitions.length,transform,format:readerFormat})??prepareForwardJsonCompositionDefinition({project,entry,checked,target,sourceModules,lower,index:definitions.length,transform,format:readerFormat})??prepareForwardJsonNonemptyFieldDefinition({project,entry,checked,target,sourceModules,lower,index:definitions.length,transform,format:readerFormat})??prepareForwardJsonScalarFoldDefinition({project,entry,checked,target,sourceModules,lower,index:definitions.length,transform,format:readerFormat})??prepareForwardJsonConstructorDefinition({project,entry,checked,genuineOrigin,target,sourceModules,lower,index:definitions.length,transform,format:readerFormat});
    if(candidate){const {row,parent}=candidate,freshParent=!parents.has(parent.id),retained=Buffer.byteLength(JSON.stringify(row))+(freshParent?Buffer.byteLength(parent.source):0);if(bytes+retained>16*1024*1024)fail('definition evidence byte bound');bytes+=retained;if(freshParent)parents.set(parent.id,parent);definitions.push(row);continue;}
    unsupported.push({name:entry.name,source:entry.file,reason:'outside zero-parameter literal JSON definition domain'});
   }catch(error){if(!(error instanceof TypeError))throw error;unsupported.push({name:entry.name,source:entry.file,reason:error.message});}
   continue;
  }
  try{
   const lowered=lower(entry);canonicalReturn(entry,checked,target,lowered);const ts=ownershipCompiler(),mapping=lowered.emitted.mappings.find(row=>row.source===lowered.own.fullName);
   if(!mapping)fail('actual emitted definition mapping absent');
   const parent=sourceModules.find(module=>module.file===entry.file&&module.path.join('.')===entry.path.join('.'));if(!parent)fail('actual physical source parent absent');
   const sourceHash=hash(parent.source),identity=Buffer.from(JSON.stringify([project,entry.file,sourceHash,entry.name,entry.span]),'utf8').toString('hex'),stem='definition_'+definitions.length,javascriptPath='app/owned-definitions/'+stem+'.mjs',typescriptPath='typed/owned-definitions/'+stem+'.mts';
   const original=lowered.emitted.text,js=nativeModule(ts,javascriptPath,original,'JavaScript',mapping.target);
   const data=[...lowered.program.declarations.values()].filter(item=>item.k==='data'),returns=new Map([[mapping.target,lowered.own.ret]]),legacyTyped=annotateRuntimeTypes(original,new Map([[mapping.target,[]]]),data,returns,lowered.emitted.checkedLocalBindings??[]),prefix=typeScriptAliases(new Map(data.map(item=>[item.fullName,item])))+'\n';
   if(!legacyTyped.startsWith(prefix))fail('complete generated alias prefix differs');
   const typed=nativeModule(ts,typescriptPath,legacyTyped,'TypeScript',mapping.target);if(!typed.fn.type)fail('actual checked return annotation absent');
   for(const statement of typed.file.statements)if(ts.isTypeAliasDeclaration(statement)&&statement.end>prefix.length)fail('unexpected standalone type declaration');
   if(js.fn.name.text==='JsonValue'||[...js.file.statements].some(statement=>ts.isImportDeclaration(statement)&&statement.importClause.namedBindings.elements.some(spec=>spec.name.text==='JsonValue')))fail('canonical imported type name collides');
   const pipeline=createRulePipeline([
    {phase:'language',rules:[{id:'forward-owned-definition:complete-checked-source-cst',apply:()=>({javascript:original,typescript:legacyTyped})}]},
    {phase:'repository',rules:[{id:'forward-owned-definition:canonical-json-abi-and-export',apply:()=>({
     javascript:transform(original,[{start:js.fn.getStart(js.file),end:js.fn.getStart(js.file),replacement:'export '}],'JavaScript'),
     typescript:transform(legacyTyped,[{start:0,end:prefix.length,replacement:'import type {JsonValue} from "../runtime/json-macro-runtime.mjs";\n'},{start:typed.fn.getStart(typed.file),end:typed.fn.getStart(typed.file),replacement:'export '},{start:typed.fn.type.getStart(typed.file),end:typed.fn.type.end,replacement:'JsonValue'}],'TypeScript'),
    })}]},
   ]),result=pipeline.run(null),pair=prepareOwnedCorePairedTypes(javascriptPath,result.value.javascript.after.source,typescriptPath,result.value.typescript.after.source);
   const source=parent.source.slice(entry.span.start,entry.span.end);if(!source.length)fail('actual source declaration range absent');
   const parentId=entry.file+':'+sourceHash,freshParent=!parents.has(parentId);
   const row={identity,name:entry.name,source:entry.file,sourceSha256:sourceHash,span:entry.span,original:{parent:parentId,source,sha256:hash(source)},javascriptPath,typescriptPath,target:mapping.target,canonicalAbi:'registered-json-value-v1',javascript:result.value.javascript,typescript:result.value.typescript,pair,trace:result.trace,applicationEffectCompleteness:false,moduleStartupEquivalent:false};
   const retained=Buffer.byteLength(JSON.stringify(row))+(freshParent?Buffer.byteLength(parent.source):0);if(bytes+retained>16*1024*1024)fail('definition evidence byte bound');bytes+=retained;if(freshParent)parents.set(parentId,{id:parentId,file:entry.file,source:parent.source,sha256:sourceHash});definitions.push(row);
  }catch(error){if(!(error instanceof TypeError))throw error;unsupported.push({name:entry.name,source:entry.file,reason:error.message});}
 }
 assertReverseConcreteSourceHost();return {schema:'forward-owned-json-definitions-v1',definitions,unsupported,parents:[...parents.values()],checkedFunctions:entries.filter(entry=>entry.term==='fn').length,definitionFunctions:definitions.length,moduleStartupEquivalent:false,runtimeParity:false};
}
