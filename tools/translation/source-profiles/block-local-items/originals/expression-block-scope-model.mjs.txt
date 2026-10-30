// Source model only. Modeled module IDs are never native resolver identities.
import {types} from 'node:util';
import {originalNamespaceHeaderExpressionFacts,ORIGINAL_NAMESPACE_PARSER_LIMITS} from './original-namespace-parser.mjs';
import {captureOriginalExpressionBlockScopeFrame,assertOriginalExpressionBlockScopeInputsCurrent} from './expression-block-scope-source.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
const fail=message=>{throw new TypeError('Original expression block scope model: '+message);};
function nativeStatementKind(node){if(['Function','Use','MacroDefinition'].includes(node.kind))return 'Item';if(node.kind==='Statement'&&node.fields.value.kind==='OpaqueBang'&&node.fields.value.fields.position==='Stmts')return 'MacCall';return 'Other';}
export function proposeOriginalHeaderExpressionBlockScopes(token,request){
 const before=originalNamespaceHeaderExpressionFacts(token,request),native=captureOriginalExpressionBlockScopeFrame();let model;
 const run=createRulePipeline([
  {phase:'language',rules:[{id:'rust:model-original-block-item-macro-trigger-child-module-and-scope-restoration',apply:()=>{
   const blocks=[],localItems=[],opaqueInvocations=[],opaqueAttributes=[],active=new Set();let cells=0,next=1,current='enclosing-module-model';
   const tick=()=>{if(++cells>200000)fail('complete original source-cell bound');};
   function walk(value,depth=0){
    tick();if(depth>ORIGINAL_NAMESPACE_PARSER_LIMITS.depth*4)fail('original positive AST depth bound');if(!value||typeof value!=='object')return;if(types.isProxy(value)||active.has(value))fail('foreign cyclic source AST');active.add(value);try{
     if(Array.isArray(value)){for(const child of value)walk(child,depth+1);return;}
     if(value.kind==='original-token-tree')return;if(value.kind==='Attribute'){opaqueAttributes.push({span:{...value.span},original:before.source.originalItem.slice(value.span.start-before.source.itemSpan.start,value.span.end-before.source.itemSpan.start),argumentAndOwnerEffectsPending:true});return;}
     if(value.kind==='OpaqueBang'){opaqueInvocations.push({span:{...value.span},position:value.fields.position,moduleModel:current,macroOwnerResolved:false,expandedSourceKnown:false,globalMacroExportsPending:true});return;}
     if(value.kind==='Block'){
      const parent=current,statementKinds=value.fields.statements.map(nativeStatementKind),needs=statementKinds.some(kind=>kind==='Item'||kind==='MacCall'),id='block-model-'+next++,scope=needs?id:parent,row={span:{...value.span},id,parentModuleModel:parent,moduleModel:scope,nativeStatementKinds:statementKinds,anonymousModuleModel:needs,restoredModuleModel:null,sourceAuthority:false,namespaceAuthority:false,runtimeAuthority:false};blocks.push(row);current=scope;
      walk(value.fields.innerAttributes,depth+1);for(const statement of value.fields.statements){tick();if(nativeStatementKind(statement)==='Item')localItems.push({span:{...statement.span},kind:statement.kind,moduleModel:current,sourceName:statement.fields.name??null,targetOwnerResolved:false});walk(statement,depth+1);}current=parent;row.restoredModuleModel=current;return;
     }
     if(value.fields){for(const child of Object.values(value.fields))walk(child,depth+1);return;}
     for(const child of Object.values(value))walk(child,depth+1);
    }finally{active.delete(value);}
   }
   walk(before.ast);if(current!=='enclosing-module-model')fail('modeled parent module failed to restore');model={blocks,localItems,opaqueInvocations,opaqueAttributes,cells,parentModuleRestoredInModel:true,actualRustNamespacePath:null,actualNativeParentScope:null,nativeVisitorDispatchQualified:false,nativeTypeNamespaceIsolationQualified:false,ordinaryImportsAndProcStubsQualified:false,attributeEffectsClosed:false,globalBangExportsClosed:false,sourceAuthority:false,namespaceAuthority:false,runtimeAuthority:false};return model;
  }}]},
  {phase:'repository',rules:[{id:'router:retain-original-header-native-programs-and-distinct-scope-model',apply:()=>({schema:'original-header-expression-block-scope-source-model-v1',source:before.source,concreteSyntax:before.concreteSyntax,ast:before.ast,nativeSources:native.facts,model,sourceModelOnly:true,originalCallerResolved:false,sourceAuthority:false,typeAuthority:false,namespaceAuthority:false,runtimeAuthority:false,wholeCompilerExecuted:false,receivingExecuted:false,crossInvocationCache:false})}]},
 ]).run(null);assertOriginalExpressionBlockScopeInputsCurrent();const current=originalNamespaceHeaderExpressionFacts(token,request);if(current!==before)fail('actual original header expression changed');return {...run.value,ruleTrace:run.trace};
}
