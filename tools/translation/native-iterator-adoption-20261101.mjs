// Rust-origin bounded-contract adoption. Original Rust syntax is DATA, never
// an original Iterator/Copy/borrowed namespace theorem or executable receipt.
import {posix} from 'node:path';
import {ownedPlainData,ownedSourcePath} from './js-to-rust/owned-outcome-source.mjs';
import {selectNativeScalarIterators,renderNativeScalarExpression} from './native-iterator-adoption-20261101-syntax.mjs';
import {primitiveBitwiseType} from './primitive-bitwise-types.mjs';
import {proposePrimitiveVectorIteratorBulk} from './primitive-vector-iterator-bulk-20261101.mjs';
import {withOriginalPrimitiveVectorLiteralSourceOperation} from './failure-aware-primitive-vector-literal-source.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {accountPrimitiveVectorIteratorBulkData} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
const fail=message=>{throw new TypeError('Native scalar iterator adoption: '+message);};
function bridgeModule(selection,path,root){
 const names=new Set(selection.names),imports=new Map(),vectors=[],functions=[];let sequence=0;
 const fresh=purpose=>{for(let count=0;count<4096;count++){const name='routerNative'+purpose+sequence++;if(!names.has(name)){names.add(name);return name;}}fail('bounded hygienic native adoption names');};
 const imported=name=>{if(!imports.has(name))imports.set(name,fresh('Import'));return imports.get(name);};
 const relative=file=>{const value=posix.relative(posix.dirname(path),root+'/'+file);return value.startsWith('.')?value:'./'+value;};
 const scalarType=domain=>domain==='bool'?'boolean':'import('+JSON.stringify(relative('primitive-operator-runtime.mjs'))+').'+primitiveBitwiseType(domain).alias;
 for(const fn of selection.functions){
  const output=fresh('Values'),item=fresh('Item'),lines=[];vectors.push({function:fn.name,local:output,domain:fn.outputDomain});
  if(!['bool','u64','i64'].includes(fn.inputDomain))lines.push(fn.input+' = '+imported('primitiveSliceInput')+'('+fn.input+', '+JSON.stringify(fn.inputDomain)+');');
  lines.push('const '+output+' = [];');
  function stages(index,current,domain){
   if(index===fn.stages.length){if(domain!==fn.outputDomain)fail('final original candidate differs from declared primitive Vec');return output+'.push('+current+');';}
   const stage=fn.stages[index],value=renderNativeScalarExpression(stage.body,{item:current,inputDomain:domain,outputDomain:fn.outputDomain,imported});
   if(stage.operation==='filter'){if(value.type!=='bool')fail('original filter candidate must be Boolean');return 'if('+value.source+'){'+stages(index+1,current,domain)+'}';}
   const next=fresh('Scalar');let expression=value.source;
   // The genuine checked identity addition supplies actual fixed type/literal
   // admission before storing a mapped scalar. It cannot overflow in-domain.
   if(value.type!=='bool'){const row=primitiveBitwiseType(value.type);expression=imported('integerArithmetic')+'('+expression+', 0n, '+row.bits+', '+row.signed+', "add")';}
   return 'const '+next+' = '+expression+';'+stages(index+1,next,value.type);
  }
  lines.push('for(const '+item+' of '+fn.input+'){'+stages(0,item,fn.inputDomain)+'}', 'return '+output+';');
  functions.push('/** @param {readonly ('+scalarType(fn.inputDomain)+')[]} '+fn.input+' */\n'+(fn.exported?'export ':'')+'function '+fn.name+'('+fn.input+'){\n'+lines.join('\n')+'\n}');
 }
 const header=imports.size?'import { '+[...imports].map(([name,alias])=>name+' as '+alias).join(', ')+' } from '+JSON.stringify(relative('primitive-operator-runtime.mjs'))+';\n':'';
 return {source:header+functions.join('\n\n')+'\n',vectors};
}
export function proposeNativeIteratorAdoption(data,options){
 const original=ownedPlainData(data),request=ownedPlainData(options),fields=['family','sourcePath','javascriptPath','rustPath','functions'];
 if(Object.keys(request).length!==fields.length||fields.some(key=>!Object.hasOwn(request,key))||!['outcome','cancellation'].includes(request.family)||!Array.isArray(request.functions)||!request.functions.length||request.functions.length>128||request.functions.some(name=>typeof name!=='string')||new Set(request.functions).size!==request.functions.length)fail('exact bounded full-module native adoption request required');
 for(const path of [request.sourcePath,request.javascriptPath,request.rustPath])ownedSourcePath(path);
 if(!request.sourcePath.endsWith('.rs')||!request.rustPath.endsWith('.rs')||!request.javascriptPath.endsWith('.mjs')||original.primitiveOperators!==true||original.files.some(row=>[request.javascriptPath,request.rustPath].includes(row.path)))fail('actual original Rust source and fresh canonical JS/Rust destinations required');
 const rows=original.files.filter(row=>row.path===request.sourcePath);if(rows.length!==1||typeof rows[0].source!=='string'||Buffer.byteLength(rows[0].source)>2097152)fail('one complete original Rust module/path required');const source=rows[0].source;
 return withOriginalPrimitiveVectorLiteralSourceOperation(()=>{
  let selection,bridge,proposal,concrete,candidateData;
  const run=createRulePipeline([
   {phase:'language',rules:[
    {id:'native-iterator:retain-complete-original-Rust-CST-and-conservative-whole-module-scope',apply:()=>{
     concrete=transportConcreteSyntaxSource(source,{language:'Rust'});if(transportConcreteSyntaxMeta(concrete.meta).source!==source)fail('complete original Rust source/CST inverse differs');selection=selectNativeScalarIterators(source);
     if(selection.functions.length!==request.functions.length||selection.functions.some(fn=>!request.functions.includes(fn.name)))fail('every original function must be explicitly selected; no partial source erasure');return selection;
    }},
    {id:'native-iterator:lower-lazy-adapters-to-one-fused-copied-scalar-loop-in-original-item-order',apply:value=>{
     bridge=bridgeModule(value,request.javascriptPath,original.runtimeRoot);candidateData={...original,files:[...original.files,{path:request.javascriptPath,source:bridge.source}]};return candidateData;
    }},
    {id:'native-iterator:run-genuine-complete-loop-vector-source-meta-types-and-native-inverse',apply:value=>{
     proposal=proposePrimitiveVectorIteratorBulk(value,{family:request.family,modules:[{sourcePath:request.javascriptPath,rustPath:request.rustPath,vectors:bridge.vectors}]});return proposal.modules[0];
    }},
   ]},
   {phase:'repository',rules:[{id:'router:retain-full-native-originals-declarations-canonical-inverse-and-migration-obligations',apply:module=>{
    const histories=transportConcreteSourceEquations([{before:source,after:module.canonicalRust,language:'Rust'},{before:bridge.source,after:module.after,language:'JavaScript'}]);if(histories[0].inverse!==source||histories[1].inverse!==bridge.source)fail('complete original native/adoption source inverse differs');
    const receivingData={...candidateData,files:candidateData.files.map(row=>row.path===request.javascriptPath?{...row,source:module.after}:row)};
    return {schema:'native-scalar-iterator-contract-adoption-proposal-v1',sourcePath:request.sourcePath,originalSource:source,originalConcreteSyntax:concrete.meta,originalFunctions:selection.functions,bridge:bridge.source,proposal,modules:proposal.modules,receivingData,histories,rust:module.canonicalRust,javascript:module.canonicalJavaScript,typescript:module.typescript,meta:module.meta,lazyPerElementOrderPreservedInLoweredLane:true,identityCollectSupported:true,originalCrateScopeQualified:false,originalIteratorOwnerQualified:false,originalPrimitiveTypeOwnerQualified:false,originalBorrowedCallbackEquivalence:false,originalBodyEquivalenceQualified:false,originalInputContractEquivalent:false,inputEnvelopeChanged:true,resourceEnvelopeChanged:true,checkedArithmeticProfile:true,maxValues:4096,productionSelected:false,sourceInstalled:false,nativeInstalled:false,newNativeAbi:false,sourceAuthority:false,semanticAuthority:false,namespaceAuthority:false,runtimeAuthority:false,runtimeParity:false,wholeRouterSynchronization:false,receivingQualified:false,runtimeExecuted:false,rustExecuted:false,crossInvocationCache:false};
   }}]},
  ]).run(null);const result={...run.value,ruleTrace:run.trace};accountPrimitiveVectorIteratorBulkData(result);return result;
 });
}
