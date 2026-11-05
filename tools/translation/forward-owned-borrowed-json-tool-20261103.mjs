// Whole actual emitted definitions, never template replacements for the body.
// This repository projection returns DATA and grants no reverse admission.
import {createHash} from 'node:crypto';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {assertReverseConcreteSourceHost} from './js-to-rust/concrete-source.mjs';
import {annotateRuntimeTypes} from './translate.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {prepareOwnedCorePairedTypes} from './js-to-rust/owned-core-paired-types.mjs';
import {requireBorrowedJsonToolType,reissueBorrowedJsonToolFunction} from './borrowed-json-tool-20261103-native-types.mjs';
import {metadataDigest} from './extensions/source-links.mjs';
const fail=message=>{throw TypeError('Forward borrowed JSON definition: '+message);};
const hash=value=>createHash('sha256').update(value).digest('hex');
function signature(entry){
 if(entry.k!=='fn'||entry.async||entry.ret?.kind!=='bool'||entry.ret.rustReference||!entry.params.some(parameter=>parameter.type.kind==='routerBorrowedJsonTool'))fail('complete shared JSON to boolean source required');
 for(const parameter of entry.params)if(parameter.type.kind==='routerBorrowedJsonTool')requireBorrowedJsonToolType(parameter.type);else if(parameter.type.kind!=='bool'||parameter.type.rustReference||parameter.type.rustOwnership)fail('only original JSON and boolean parameters admitted');
}
function nativeModule(ts,path,source,kind,target){
 if(typeof source!=='string'||Buffer.byteLength(source)>1048576)fail('complete original module bound');
 const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,kind);if(file.parseDiagnostics.length)fail('complete original emitted syntax');
 const functions=file.statements.filter(node=>ts.isFunctionDeclaration(node));
 if(functions.length!==1||functions[0].name?.text!==target||!functions[0].body||functions[0].asteriskToken||functions[0].typeParameters?.length)fail('one complete actual predicate caller required');
 for(const node of file.statements){
  if(ts.isEmptyStatement(node)||ts.isTypeAliasDeclaration(node)||node===functions[0])continue;
  if(!ts.isImportDeclaration(node)||!ts.isStringLiteral(node.moduleSpecifier)||!node.importClause?.namedBindings||!ts.isNamedImports(node.importClause.namedBindings)||!['../runtime/borrowed-json-tool-predicate-20261103-runtime.mjs','../runtime/borrowed-json-tool-20261103-input-runtime.mjs'].includes(node.moduleSpecifier.text))fail('unsupported startup, helper or import requires another family');
  for(const binding of node.importClause.namedBindings.elements)if(binding.isTypeOnly||!['borrowedJsonToolIsTranslatable','borrowedJsonToolInput'].includes((binding.propertyName??binding.name).text))fail('actual fixed JSON runtime import required');
 }
 return {file,fn:functions[0]};
}
/** Called from the actual private project branch; public outputs remain DATA. */
export function prepareForwardBorrowedJsonToolDefinition({project,entry,checked,target,sourceModules,lower,index,transform,format}){
 const original=checked.declarations.get(entry.name);
 if(entry.term!=='fn'||!original?.params.some(parameter=>parameter.type.kind==='routerBorrowedJsonTool'))return null;
 if(format!==undefined&&format!=='core-reader')fail('original definition format required');
 assertReverseConcreteSourceHost();signature(original);reissueBorrowedJsonToolFunction(original,checked);
 const current=target.program.declarations.get(target.names.get(entry.name));if(!current)fail('original checked flattened target required');signature(current);reissueBorrowedJsonToolFunction(current,target.program);
 const lowered=lower(entry);signature(lowered.own);reissueBorrowedJsonToolFunction(lowered.own,lowered.program);
 if(metadataDigest({params:current.params,ret:current.ret})!==metadataDigest({params:lowered.own.params,ret:lowered.own.ret}))fail('whole original lowered signature differs');
 const mappings=lowered.emitted.mappings.filter(row=>row.source===lowered.own.fullName);if(mappings.length!==1)fail('one original emitted target mapping required');const mapping=mappings[0];
 const parents=sourceModules.filter(module=>module.file===entry.file&&module.path.join('.')===entry.path.join('.'));if(parents.length!==1)fail('one complete original source parent required');const parent=parents[0];
 if(!Number.isSafeInteger(entry.span.start)||!Number.isSafeInteger(entry.span.end)||entry.span.start<0||entry.span.start>=entry.span.end||entry.span.end>parent.source.length)fail('actual complete declaration span required');
 const stem='definition_'+index,javascriptPath='app/owned-definitions/'+stem+'.mjs',typescriptPath='typed/owned-definitions/'+stem+'.mts';
 const javascript=lowered.emitted.text,ts=ownershipCompiler(),js=nativeModule(ts,javascriptPath,javascript,ts.ScriptKind.JS,mapping.target);
 const declarations=[...lowered.program.declarations.values()],typescript=annotateRuntimeTypes(javascript,new Map([[mapping.target,lowered.own.params]]),declarations.filter(row=>row.k==='data'),new Map([[mapping.target,lowered.own.ret]]),lowered.emitted.checkedLocalBindings??[]),typed=nativeModule(ts,typescriptPath,typescript,ts.ScriptKind.TS,mapping.target);
 if(js.fn.parameters.length!==original.params.length||typed.fn.parameters.length!==original.params.length||!typed.fn.type||typed.fn.parameters.some(parameter=>!parameter.type))fail('complete actual parameter annotations required');
 const pipeline=createRulePipeline([
  {phase:'language',rules:[{id:'language:whole-original-checked-predicate-emission',apply:()=>({javascript,typescript})}]},
  {phase:'repository',rules:[{id:'repository:export-complete-guarded-definition-without-body-edits',apply:value=>({javascript:transform(value.javascript,[{start:js.fn.getStart(js.file),end:js.fn.getStart(js.file),replacement:'export '}],'JavaScript'),typescript:transform(value.typescript,[{start:typed.fn.getStart(typed.file),end:typed.fn.getStart(typed.file),replacement:'export '}],'TypeScript')})}]},
 ]),result=pipeline.run(null),pair=prepareOwnedCorePairedTypes(javascriptPath,result.value.javascript.after.source,typescriptPath,result.value.typescript.after.source);
 const sourceHash=hash(parent.source),parentId=entry.file+':'+sourceHash,source=parent.source.slice(entry.span.start,entry.span.end),identity=Buffer.from(JSON.stringify([project,entry.file,sourceHash,entry.name,entry.span]),'utf8').toString('hex');
 assertReverseConcreteSourceHost();return {
  parent:{id:parentId,file:entry.file,source:parent.source,sha256:sourceHash},
  row:{identity,name:entry.name,source:entry.file,sourceSha256:sourceHash,span:entry.span,original:{parent:parentId,source,sha256:hash(source)},javascriptPath,typescriptPath,target:mapping.target,canonicalAbi:'borrowed-json-tool-definition-20261103-v1',signature:{original:{params:original.params,ret:original.ret},target:{params:current.params,ret:current.ret},lowered:{params:lowered.own.params,ret:lowered.own.ret}},javascript:result.value.javascript,typescript:result.value.typescript,pair,trace:result.trace,semanticAuthority:false,guardedReverseAdmission:false,applicationEffectCompleteness:false,moduleStartupEquivalent:false},
 };
}
