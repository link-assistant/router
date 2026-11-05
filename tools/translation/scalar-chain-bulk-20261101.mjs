// Eager scalar map/filter chains. Every stage materializes before the next.
// Syntax and domain selections are DATA, never callable or source authority.
import {posix} from 'node:path';
import {candidateScalarSliceParameterDomain,lowerScalarCallbackExpression} from './scalar-chain-bulk-20261101-expression.mjs';
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
const fail=message=>{throw new TypeError('Eager scalar collection chain: '+message);};
const families={outcome:{api:outcome,current:outcomeCurrent},cancellation:{api:cancellation,current:cancellationCurrent}};
const domains=new Set(['bool','u8','i8','u16','i16','u32','i32','u64','i64','u128','i128']);
const ordinary=value=>typeof value==='string'&&/^[_A-Za-z][_A-Za-z0-9]*$/u.test(value)&&!value.startsWith('__ro');
function exact(value,keys){if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==keys.length||keys.some(key=>!Object.hasOwn(value,key)))fail('exact chain request DATA required');}
function lower(source,path,root,selections){
 const ts=ownershipCompiler();if(!ownershipCompilerRuntimeNativeCurrent(ts))fail('original native compiler runtime changed');
 const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,path.endsWith('.mjs')?ts.ScriptKind.JS:ts.ScriptKind.TS);
 if(file.parseDiagnostics.length)fail('complete original native chain source required');
 const names=new Set(),imports=new Map(),operatorImports=new Map(),edits=[],vectors=[],chains=[],selected=new Set();let cells=100000,sequence=0;
 const tick=depth=>{if(--cells<0||depth>160)fail('complete native chain syntax cell/depth budget');};
 const census=(node,depth=0)=>{tick(depth);if(ts.isIdentifier(node))names.add(node.text);ts.forEachChild(node,child=>census(child,depth+1));};census(file);
 const fresh=purpose=>{for(let attempt=0;attempt<4096;attempt++){const name='routerChain'+purpose+sequence++;if(!names.has(name)){names.add(name);return name;}}fail('bounded hygienic chain identifier budget');};
 const imported=(domain,operation)=>{const name='router_vec_'+domain+'_'+operation;if(!imports.has(name))imports.set(name,fresh('Import'));return imports.get(name);};
 const operator=name=>{if(!operatorImports.has(name))operatorImports.set(name,fresh('Operator'));return operatorImports.get(name);};
 for(const selection of selections){
  exact(selection,['function','local','domains']);
  if(!ordinary(selection.function)||!ordinary(selection.local)||!Array.isArray(selection.domains)||selection.domains.length<2||selection.domains.length>8||selection.domains.some(domain=>!domains.has(domain)))fail('explicit 2..8-stage primitive chain selection required');
  const key=selection.function+':'+selection.local;if(selected.has(key))fail('duplicate chain selection');selected.add(key);
  const functions=file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text===selection.function&&node.body);
  if(functions.length!==1)fail('one complete original top-level chain caller required');
  const fn=functions[0],statements=fn.body.statements.filter(ts.isVariableStatement).filter(node=>node.declarationList.declarations.some(binding=>ts.isIdentifier(binding.name)&&binding.name.text===selection.local));
  if(statements.length!==1)fail('one original top-level chain collection local required');
  const statement=statements[0],list=statement.declarationList;
  if(statement.modifiers?.length||list.declarations.length!==1||(list.flags&ts.NodeFlags.BlockScoped)!==ts.NodeFlags.Const)fail('ordinary single const chain collection required');
  const binding=list.declarations[0];if(binding.type||binding.exclamationToken||!binding.initializer)fail('inferred chain collection initializer required');
  const reversed=[];let receiver=binding.initializer;
  while(ts.isCallExpression(receiver)){
   if(reversed.length>=8||receiver.questionDotToken||receiver.typeArguments?.length||receiver.arguments.length!==1||!ts.isPropertyAccessExpression(receiver.expression)||receiver.expression.questionDotToken||!['map','filter'].includes(receiver.expression.name.text))fail('bounded direct ordinary map/filter chain required');
   const arrow=receiver.arguments[0];if(!ts.isArrowFunction(arrow)||arrow.modifiers?.length||arrow.typeParameters?.length||arrow.type||arrow.parameters.length!==1||ts.isBlock(arrow.body))fail('one synchronous expression arrow per stage required');
   const parameter=arrow.parameters[0];if(!ts.isIdentifier(parameter.name)||parameter.type||parameter.initializer||parameter.dotDotDotToken||parameter.questionToken||parameter.modifiers?.length||!ordinary(parameter.name.text)||parameter.name.text===selection.local)fail('ordinary independent inferred callback parameter required');
   reversed.push({operation:receiver.expression.name.text,parameter:parameter.name.text,body:source.slice(arrow.body.getStart(file),arrow.body.end),expressionNode:arrow.body,span:[receiver.getStart(file),receiver.end],callbackSpan:[arrow.getStart(file),arrow.end],callbackOriginal:source.slice(arrow.getStart(file),arrow.end)});
   receiver=receiver.expression.expression;
  }
  if(reversed.length!==selection.domains.length||!ts.isIdentifier(receiver)||!ordinary(receiver.text)||receiver.text===selection.local)fail('written input parameter and exact stage-domain count required');
  const inputs=fn.parameters.filter(parameter=>ts.isIdentifier(parameter.name)&&parameter.name.text===receiver.text);
  if(inputs.length!==1||inputs[0].initializer||inputs[0].dotDotDotToken||inputs[0].questionToken)fail('ordinary original input parameter required');
  const earlier=fn.body.statements.slice(0,fn.body.statements.indexOf(statement));
  const inspect=(node,depth=0)=>{tick(depth);if(ts.isIdentifier(node)&&node.text===receiver.text)fail('chain receiver must be an unused original input before selection');ts.forEachChild(node,child=>inspect(child,depth+1));};
  for(const node of earlier)inspect(node);
  const inputDomainCandidate=candidateScalarSliceParameterDomain(ts,inputs[0]),stages=reversed.reverse(),output=[];let previous=receiver.text;
  stages.forEach((stage,index)=>{
   if(stage.parameter===receiver.text)fail('callback input shadowing needs its separate binding profile');
   const domain=selection.domains[index],local=index===stages.length-1?selection.local:fresh('Values');
   if(stage.operation==='filter'&&index>0&&domain!==selection.domains[index-1])fail('filter must retain its preceding candidate primitive domain');
   const inputDomain=index===0?inputDomainCandidate:selection.domains[index-1],loweredBody=lowerScalarCallbackExpression(stage.expressionNode,{ts,file,parameter:stage.parameter,inputDomain,outputDomain:domain,imported:operator,tick});delete stage.expressionNode;
   const action=stage.operation==='map'?local+'.push(('+loweredBody+'\n));':'if(('+loweredBody+'\n)){'+local+'.push('+stage.parameter+');}';
   output.push('const '+local+'=[];\n');vectors.push({function:selection.function,local,domain});
   if(index===0)output.push('for(const '+stage.parameter+' of '+previous+'){'+action+'}\n');
   else{
    // No owned-vector iterator override: actual shared Vec len/get admission
    // and a dominating Some tag supply copied scalar items in each iteration.
    const priorDomain=selection.domains[index-1],length=fresh('Length'),at=fresh('Index'),option=fresh('Option');
    output.push('const '+length+'='+imported(priorDomain,'len')+'('+previous+');\nfor(let '+at+'=0n;'+at+'<'+length+';'+at+'++){const '+option+'='+imported(priorDomain,'get')+'('+previous+','+at+');if('+option+'.$ === "Some"){const '+stage.parameter+'='+option+'.field0;'+action+'}}\n');
   }
   stage.domain=domain;stage.local=local;stage.input=previous;stage.inputDomainCandidate=inputDomain;stage.loweredBody=loweredBody;previous=local;
  });
  edits.push({span:[statement.getStart(file),statement.end],expected:source.slice(statement.getStart(file),statement.end),replacement:output.join('')});
  chains.push({function:selection.function,local:selection.local,receiver:receiver.text,stages,span:[statement.getStart(file),statement.end],stageOrder:'complete-stage-before-next',sourceAuthority:false,semanticAuthority:false});
 }
 let at=source.charCodeAt(0)===0xfeff?1:0;if(source.startsWith('#!',at)){const end=source.indexOf('\n',at);if(end<0)fail('complete hashbang line required');at=end+1;}
 const importLines=[['primitive-owned-vector-runtime.mjs',imports],['primitive-operator-runtime.mjs',operatorImports]].filter(([,entries])=>entries.size).map(([file,entries])=>{const relative=posix.relative(posix.dirname(path),root+'/'+file),specifier=relative.startsWith('.')?relative:'./'+relative;return 'import { '+[...entries].map(([name,local])=>name+' as '+local).join(', ')+' } from '+JSON.stringify(specifier)+';';});
 const importEdit={span:[at,at],expected:'',replacement:importLines.join('\n')+'\n'};
 if(!ownershipCompilerRuntimeNativeCurrent(ts))fail('original native compiler runtime changed');
 return {edits,importEdit,vectors,chains};
}
export function proposeScalarChainBulk(data,options){
 const original=ownedPlainData(data),request=ownedPlainData(options);exact(request,['family','modules']);
 if(!Object.hasOwn(families,request.family)||original.primitiveOperators!==true||!Array.isArray(request.modules)||request.modules.length<1||request.modules.length>16)fail('bounded actual primitive family/module profile required');
 const selected=families[request.family],contexts=[],stages=[],seen=new Set();let lowered=original;
 const close=()=>{let failed=false,first;for(const context of contexts)try{selected.current(context);}catch(error){if(!failed){failed=true;first=error;}}if(failed)throw first;};
 return withCompleteSourceClosingFence(()=>{
  contexts.push(selected.api.createOwnedOutcomeContext(original));
  const run=createRulePipeline([
   {phase:'language',rules:[
    {id:'scalar-chain:materialize-every-original-callback-stage-in-source-order-through-CST',apply:()=>{
     for(const module of request.modules){
      exact(module,['sourcePath','rustPath','chains']);ownedSourcePath(module.sourcePath);ownedSourcePath(module.rustPath);
      if(seen.has(module.sourcePath)||!Array.isArray(module.chains)||!module.chains.length||module.chains.length>16||! /\.(?:mjs|mts|ts)$/u.test(module.sourcePath))fail('bounded independent explicit chain module required');seen.add(module.sourcePath);
      const sources=original.files.filter(row=>row.path===module.sourcePath);if(sources.length!==1||typeof sources[0].source!=='string'||Buffer.byteLength(sources[0].source)>2097152)fail('one bounded complete original chain source required');
      const before=sources[0].source,language=module.sourcePath.endsWith('.mjs')?'JavaScript':'TypeScript',plan=lower(before,module.sourcePath,language==='TypeScript'?original.declarationRoot:original.runtimeRoot,module.chains),concrete=transportConcreteSyntaxSource(before,{language});
      if(transportConcreteSyntaxMeta(concrete.meta).source!==before)fail('complete original chain CST inverse differs');
      const transformed=applyConcreteSyntaxSubstitutions(concrete.document,{languageRules:[{id:'language:retain-eager-map-filter-stage-order-with-copied-primitive-iteration',edits:plan.edits}],repositoryRules:[{id:'router:import-only-original-qualified-primitive-vector-len-and-get',edits:[plan.importEdit]}]}),after=transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(transformed.value)).source;
      stages.push({sourcePath:module.sourcePath,rustPath:module.rustPath,before,lowered:after,inverse:before,chains:plan.chains,vectors:plan.vectors,trace:transformed.trace});
      lowered={...lowered,files:lowered.files.map(row=>row.path===module.sourcePath?{...row,source:after}:row)};
     }
     return lowered;
    }},
    {id:'scalar-chain:reissue-all-stage-types-ownership-meta-and-both-canonical-directions',apply:value=>proposePrimitiveVectorIteratorBulk(value,{family:request.family,modules:stages.map(stage=>({sourcePath:stage.sourcePath,rustPath:stage.rustPath,vectors:stage.vectors}))})},
   ]},
   {phase:'repository',rules:[{id:'router:retain-complete-original-chain-inverses-and-input-contract-obligations',apply:bulk=>{
    const modules=stages.map((stage,index)=>{
     const checked=bulk.modules[index];if(checked.sourcePath!==stage.sourcePath||checked.before!==stage.lowered)fail('complete chain/vector source composition differs');
     const language=stage.sourcePath.endsWith('.mjs')?'JavaScript':'TypeScript',histories=transportConcreteSourceEquations([{before:stage.before,after:stage.lowered,language},{before:stage.lowered,after:checked.after,language},{before:stage.before,after:checked.after,language}]);
     if(histories[0].inverse!==stage.before||histories[1].inverse!==stage.lowered||histories[2].inverse!==stage.before)fail('complete original chain inverse differs');
     return {...stage,after:checked.after,histories,checked};
    });
    return {schema:'eager-scalar-chain-bulk-source-proposal-v1',family:request.family,modules,bulk,files:modules.map(module=>({path:module.sourcePath,before:module.before,after:module.after,inverse:module.before})),
     evaluationOrder:'all-elements-of-each-stage-before-next-stage',callbacksFused:false,maxStages:8,maxChainsPerModule:16,maxModules:16,maxValues:4096,
     originalArrayMethodOwnerQualified:false,originalInputContractEquivalent:false,originalBodyEquivalenceQualified:false,inputEnvelopeChanged:true,resourceEnvelopeChanged:true,
     callbackCaptureSemantics:false,sourceInstalled:false,nativeInstalled:false,productionSelected:false,sourceAuthority:false,semanticAuthority:false,namespaceAuthority:false,runtimeAuthority:false,runtimeParity:false,wholeRouterSynchronization:false,receivingQualified:false,runtimeExecuted:false,rustExecuted:false,crossInvocationCache:false};
   }}]},
  ]).run(null);
  const result={...run.value,ruleTrace:run.trace};accountPrimitiveVectorIteratorBulkData(result);return result;
 },[close,()=>{contexts.length=0;stages.length=0;}]);
}
