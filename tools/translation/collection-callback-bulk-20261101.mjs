// Additive scalar collection callback lowering. Syntax selection is DATA only;
// complete native source/type/ownership/meta reissue grants target admission.
import {ownershipCompiler,ownershipCompilerRuntimeNativeCurrent} from './js-to-rust/vendor/module-syntax.mjs';
import {ownedPlainData,ownedSourcePath,requireOwnedCoreSourceCurrent as outcomeCurrent} from './js-to-rust/owned-outcome-source.mjs';
import {requireOwnedCoreSourceCurrent as cancellationCurrent} from './js-to-rust/owned-cancellation-source.mjs';
import * as outcome from './js-to-rust/owned-outcome.mjs';
import * as cancellation from './js-to-rust/owned-cancellation.mjs';
import {proposePrimitiveVectorIteratorBulk} from './primitive-vector-iterator-bulk-20261101.mjs';
import {accountPrimitiveVectorIteratorBulkData} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
const fail=message=>{throw new TypeError('Collection scalar callback bulk: '+message);};
const families={outcome:{api:outcome,current:outcomeCurrent},cancellation:{api:cancellation,current:cancellationCurrent}};
const domains=new Set(['bool','u8','i8','u16','i16','u32','i32','u64','i64','u128','i128']);
const name=value=>typeof value==='string'&&/^[_A-Za-z][_A-Za-z0-9]*$/u.test(value)&&!value.startsWith('__ro');
function exact(value,keys){if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==keys.length||keys.some(key=>!Object.hasOwn(value,key)))fail('exact request DATA fields required');}
function syntaxPlan(source,path,callbacks){
 const ts=ownershipCompiler();if(!ownershipCompilerRuntimeNativeCurrent(ts))fail('original native compiler runtime changed');
 const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,path.endsWith('.mjs')?ts.ScriptKind.JS:ts.ScriptKind.TS);
 if(file.parseDiagnostics.length)fail('complete original native source grammar required');
 let remaining=100000;const tick=depth=>{if(--remaining<0||depth>160)fail('complete callback syntax cell/depth budget');};
 const census=(node,depth=0)=>{tick(depth);ts.forEachChild(node,child=>census(child,depth+1));};census(file);
 const binary=new Set(['+','-','*','/','%','<','<=','>','>=','===','!==','&&','||','&','|','^','<<','>>']);
 const unary=new Set([ts.SyntaxKind.MinusToken,ts.SyntaxKind.PlusToken,ts.SyntaxKind.ExclamationToken,ts.SyntaxKind.TildeToken]);
 function expression(node,parameter,depth=0){
  tick(depth);
  if(ts.isIdentifier(node)){if(node.text!==parameter)fail('callback captures require their separate actual ownership profile');return;}
  if(ts.isNumericLiteral(node)||ts.isBigIntLiteral(node)||node.kind===ts.SyntaxKind.TrueKeyword||node.kind===ts.SyntaxKind.FalseKeyword)return;
  if(ts.isParenthesizedExpression(node)){expression(node.expression,parameter,depth+1);return;}
  if(ts.isPrefixUnaryExpression(node)&&unary.has(node.operator)){expression(node.operand,parameter,depth+1);return;}
  if(ts.isBinaryExpression(node)&&binary.has(node.operatorToken.getText(file))){expression(node.left,parameter,depth+1);expression(node.right,parameter,depth+1);return;}
  if(ts.isConditionalExpression(node)){expression(node.condition,parameter,depth+1);expression(node.whenTrue,parameter,depth+1);expression(node.whenFalse,parameter,depth+1);return;}
  fail('callback requires a capture-free scalar expression without calls writes references or suspension');
 }
 const edits=[],vectors=[],rows=[],seen=new Set();
 for(const request of callbacks){
  exact(request,['function','local','domain']);if(!name(request.function)||!name(request.local)||!domains.has(request.domain))fail('explicit portable callback/local/domain selection required');
  const key=request.function+':'+request.local;if(seen.has(key))fail('duplicate callback selection');seen.add(key);
  const functions=file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text===request.function&&node.body);
  if(functions.length!==1)fail('one complete original top-level callback caller required');
  const fn=functions[0],statements=fn.body.statements.filter(ts.isVariableStatement).filter(node=>node.declarationList.declarations.some(binding=>ts.isIdentifier(binding.name)&&binding.name.text===request.local));
  if(statements.length!==1)fail('one original top-level collection local required');
  const statement=statements[0],list=statement.declarationList;
  if(statement.modifiers?.length||list.declarations.length!==1||(list.flags&ts.NodeFlags.BlockScoped)!==ts.NodeFlags.Const)fail('one ordinary const collection declaration required');
  const binding=list.declarations[0],call=binding.initializer;
  if(binding.type||binding.exclamationToken||!call||!ts.isCallExpression(call)||call.questionDotToken||call.typeArguments?.length||call.arguments.length!==1||!ts.isPropertyAccessExpression(call.expression)||call.expression.questionDotToken||!ts.isIdentifier(call.expression.expression)||!['map','filter'].includes(call.expression.name.text))fail('one direct ordinary scalar map/filter initializer required');
  const receiver=call.expression.expression.text,parameters=fn.parameters.filter(parameter=>ts.isIdentifier(parameter.name)&&parameter.name.text===receiver);
  if(parameters.length!==1||parameters[0].initializer||parameters[0].dotDotDotToken||parameters[0].questionToken||!name(receiver)||receiver===request.local)fail('ordinary written input parameter receiver required');
  const arrow=call.arguments[0];
  if(!ts.isArrowFunction(arrow)||arrow.modifiers?.length||arrow.typeParameters?.length||arrow.type||arrow.parameters.length!==1||ts.isBlock(arrow.body))fail('one synchronous scalar expression arrow required');
  const parameter=arrow.parameters[0];
  if(!ts.isIdentifier(parameter.name)||parameter.type||parameter.initializer||parameter.dotDotDotToken||parameter.questionToken||parameter.modifiers?.length||!name(parameter.name.text)||[receiver,request.local].includes(parameter.name.text))fail('one inferred independent immutable scalar callback parameter required');
  const item=parameter.name.text;expression(arrow.body,item);
  // Receiver reassignment before the selected statement would make a spelling
  // selector ambiguous. The complete target checker still owns every binding.
  const before=fn.body.statements.slice(0,fn.body.statements.indexOf(statement));
  const inspect=(node,depth=0)=>{tick(depth);if(ts.isIdentifier(node)&&node.text===receiver)fail('callback receiver must remain an original unused input before collection');ts.forEachChild(node,child=>inspect(child,depth+1));};
  for(const node of before)inspect(node);
  const body=source.slice(arrow.body.getStart(file),arrow.body.end),operation=call.expression.name.text;
  const loop=operation==='map'?request.local+'.push(('+body+'\n));':'if(('+body+'\n)){'+request.local+'.push('+item+');}';
  const replacement='const '+request.local+'=[];\nfor(const '+item+' of '+receiver+'){'+loop+'}\n';
  edits.push({span:[statement.getStart(file),statement.end],expected:source.slice(statement.getStart(file),statement.end),replacement});
  vectors.push(request);rows.push({function:request.function,local:request.local,domain:request.domain,operation,receiver,parameter:item,span:[statement.getStart(file),statement.end],callbackSpan:[arrow.getStart(file),arrow.end],callbackOriginal:source.slice(arrow.getStart(file),arrow.end),captureFreeSyntax:true,scalarTypesQualified:false,sourceAuthority:false,semanticAuthority:false});
 }
 if(!ownershipCompilerRuntimeNativeCurrent(ts))fail('original native compiler runtime changed');
 return {edits,vectors,callbacks:rows};
}
/** Explicit input-contract migration; no original Array method authority. */
export function proposeCollectionCallbackBulk(data,options){
 const original=ownedPlainData(data),request=ownedPlainData(options);exact(request,['family','modules']);
 if(!Object.hasOwn(families,request.family)||original.primitiveOperators!==true||!Array.isArray(request.modules)||request.modules.length<1||request.modules.length>16)fail('bounded actual family and primitive caller profile required');
 const selected=families[request.family],contexts=[],stages=[],seen=new Set();let lowered=original;
 const close=()=>{let first,failed=false;for(const context of contexts)try{selected.current(context);}catch(error){if(!failed){failed=true;first=error;}}if(failed)throw first;};
 return withCompleteSourceClosingFence(()=>{
  contexts.push(selected.api.createOwnedOutcomeContext(original));
  const run=createRulePipeline([
   {phase:'language',rules:[
    {id:'collection-callback:lower-capture-free-scalar-map-filter-through-complete-CST',apply:()=>{
     for(const module of request.modules){
      exact(module,['sourcePath','rustPath','callbacks']);ownedSourcePath(module.sourcePath);ownedSourcePath(module.rustPath);
      if(seen.has(module.sourcePath)||!Array.isArray(module.callbacks)||!module.callbacks.length||module.callbacks.length>128||! /\.(?:mjs|mts|ts)$/u.test(module.sourcePath))fail('independent bounded original callback module selections required');seen.add(module.sourcePath);
      const sources=original.files.filter(row=>row.path===module.sourcePath);if(sources.length!==1||typeof sources[0].source!=='string'||Buffer.byteLength(sources[0].source)>2097152)fail('one complete bounded original callback source required');
      const before=sources[0].source,language=module.sourcePath.endsWith('.mjs')?'JavaScript':'TypeScript',plan=syntaxPlan(before,module.sourcePath,module.callbacks),concrete=transportConcreteSyntaxSource(before,{language});
      if(transportConcreteSyntaxMeta(concrete.meta).source!==before)fail('complete original callback CST inverse differs');
      const transformed=applyConcreteSyntaxSubstitutions(concrete.document,{languageRules:[{id:'language:lower-selected-capture-free-scalar-callbacks-to-eager-loops',edits:plan.edits}],repositoryRules:[{id:'router:retain-existing-primitive-vector-collection-profile',edits:[]}]});
      const after=transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(transformed.value)).source;
      stages.push({sourcePath:module.sourcePath,rustPath:module.rustPath,before,lowered:after,inverse:before,callbacks:plan.callbacks,vectors:plan.vectors,trace:transformed.trace});
      lowered={...lowered,files:lowered.files.map(row=>row.path===module.sourcePath?{...row,source:after}:row)};
     }
     return lowered;
    }},
    {id:'collection-callback:reissue-complete-scalar-loops-owned-vectors-meta-types-and-native-inverse',apply:value=>proposePrimitiveVectorIteratorBulk(value,{family:request.family,modules:stages.map(stage=>({sourcePath:stage.sourcePath,rustPath:stage.rustPath,vectors:stage.vectors}))})},
   ]},
   {phase:'repository',rules:[{id:'router:retain-original-callback-equations-and-explicit-input-contract-change',apply:bulk=>{
    const modules=stages.map((stage,index)=>{
     const checked=bulk.modules[index];if(checked.sourcePath!==stage.sourcePath||checked.before!==stage.lowered)fail('complete callback/vector source composition differs');
     const language=stage.sourcePath.endsWith('.mjs')?'JavaScript':'TypeScript',histories=transportConcreteSourceEquations([{before:stage.before,after:stage.lowered,language},{before:stage.lowered,after:checked.after,language},{before:stage.before,after:checked.after,language}]);
     if(histories[0].inverse!==stage.before||histories[1].inverse!==stage.lowered||histories[2].inverse!==stage.before)fail('complete original callback history inverse differs');
     return {...stage,after:checked.after,histories,checked};
    });
    return {schema:'scalar-collection-callback-bulk-source-proposal-v1',family:request.family,modules,bulk,
     files:modules.map(module=>({path:module.sourcePath,before:module.before,after:module.after,inverse:module.before})),
     eagerCallbackOrder:'source-input-left-to-right',callbacksPerElement:1,maxModules:16,maxCallbacksPerModule:128,maxValues:4096,
     callbackCaptureSemantics:false,originalArrayMethodOwnerQualified:false,originalInputContractEquivalent:false,originalBodyEquivalenceQualified:false,
     inputEnvelopeChanged:true,resourceEnvelopeChanged:true,sourceInstalled:false,nativeInstalled:false,productionSelected:false,
     sourceAuthority:false,semanticAuthority:false,namespaceAuthority:false,runtimeAuthority:false,runtimeParity:false,
     wholeRouterSynchronization:false,receivingQualified:false,runtimeExecuted:false,rustExecuted:false,crossInvocationCache:false};
   }}]},
  ]).run(null);
  const result={...run.value,ruleTrace:run.trace};accountPrimitiveVectorIteratorBulkData(result);return result;
 },[close,()=>{contexts.length=0;stages.length=0;}]);
}
