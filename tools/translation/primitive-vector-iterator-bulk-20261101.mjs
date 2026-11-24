// Additive source-only draft. No installation, runtime execution or new permit.
// Compose the actual literal/push/length proposer with complete loop checking,
// semantic meta reissue, typed projection and the canonical Rust inverse.
import {posix} from 'node:path';
import * as outcome from './js-to-rust/owned-outcome.mjs';
import * as cancellation from './js-to-rust/owned-cancellation.mjs';
import {translateOwnedOutcomeRust} from './js-to-rust/owned-outcome-rust.mjs';
import {translateOwnedCancellationRust} from './js-to-rust/owned-cancellation-rust.mjs';
import {ownedPlainData,ownedSourcePath,requireOwnedCoreSourceCurrent as outcomeCurrent} from './js-to-rust/owned-outcome-source.mjs';
import {requireOwnedCoreSourceCurrent as cancellationCurrent} from './js-to-rust/owned-cancellation-source.mjs';
import {proposePrimitiveVectorLiteralCalls} from './js-to-rust/primitive-vector-literal-proposals.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {sameRustSourceSyntax} from './rust-syntax-cells.mjs';
import {withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
import {accountPrimitiveVectorIteratorBulkData} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
const fail=message=>{throw new TypeError('Primitive vector iterator bulk: '+message);};
const families={
 outcome:{api:outcome,current:outcomeCurrent,inverse:translateOwnedOutcomeRust},
 cancellation:{api:cancellation,current:cancellationCurrent,inverse:translateOwnedCancellationRust},
};
function exact(value,keys){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==keys.length||keys.some(key=>!Object.hasOwn(value,key)))fail('exact request fields required');
}
function sourceOf(data,path){
 const rows=data.files.filter(row=>row.path===path);
 if(rows.length!==1||typeof rows[0].source!=='string'||Buffer.byteLength(rows[0].source)>2097152)fail('one complete bounded source required: '+path);
 return rows[0].source;
}
function replace(data,path,source){
 return {...data,files:data.files.filter(row=>row.path!==path).concat([{path,source}])};
}
function concrete(source,language){
 const result=transportConcreteSyntaxSource(source,{language});
 if(transportConcreteSyntaxMeta(result.meta).source!==source)fail('complete serialized CST source inverse differs');
 return result.meta;
}
function pathPair(path,data){
 const typed=/\.(?:mts|ts)$/u.test(path),root=posix.dirname(typed?data.declarationRoot:data.runtimeRoot);
 if(root!=='.'&&!path.startsWith(root+'/'))fail('caller must stay in its actual receiving source root');
 const suffix=root==='.'?path:path.slice(root.length+1),stem=suffix.replace(/\.(?:mjs|mts|ts)$/u,'');
 const under=(base,extension)=>(base==='.'?'':base+'/')+stem+extension;
 return {javascript:under(posix.dirname(data.runtimeRoot),'.mjs'),typescript:under(posix.dirname(data.declarationRoot),'.mts'),otherTypeScript:under(posix.dirname(data.declarationRoot),'.ts')};
}
/**
 * DATA transaction over 1..16 complete independent caller modules. Each request
 * is {sourcePath,rustPath,vectors}; vectors use the existing exact
 * {function,local,domain} selections. No callback, cache, file write or supplied
 * verdict participates. A later failing caller returns no partial transaction.
 * Existing same-stem JS/TS files are refused rather than silently overwritten.
 */
export function proposePrimitiveVectorIteratorBulk(data,options){
 const original=ownedPlainData(data),request=ownedPlainData(options);
 exact(request,['family','modules']);
 if(!Object.hasOwn(families,request.family)||original.primitiveOperators!==true||!Array.isArray(original.files)||!Array.isArray(request.modules)||request.modules.length<1||request.modules.length>16)fail('bounded explicit modules and existing primitive profile required');
 const selected=families[request.family],seen=new Set(),originalPaths=new Set();
 for(const row of original.files){if(originalPaths.has(row.path))fail('duplicate original source path');originalPaths.add(row.path);}
 const plans=request.modules.map(row=>{
  exact(row,['sourcePath','rustPath','vectors']);ownedSourcePath(row.sourcePath);ownedSourcePath(row.rustPath);
  if(!/\.(?:mjs|mts|ts)$/u.test(row.sourcePath)||!row.rustPath.endsWith('.rs')||!Array.isArray(row.vectors)||!row.vectors.length||row.vectors.length>256)fail('explicit bounded caller/vector selections required');
  const pair=pathPair(row.sourcePath,original);
  for(const path of [pair.javascript,pair.typescript,pair.otherTypeScript,row.rustPath]){if(seen.has(path))fail('overlapping caller/paired/native destinations');seen.add(path);}
  if(originalPaths.has(row.rustPath))fail('native output destination already authored');
  for(const path of [pair.javascript,pair.typescript,pair.otherTypeScript])if(path!==row.sourcePath&&originalPaths.has(path))fail('existing paired source needs explicit conflict resolution');
  return {...row,pair,before:sourceOf(original,row.sourcePath)};
 });
 let current=original;
 const contexts=[],results=[],keep=context=>{contexts.push(context);return context;};
 const close=()=>{let failed=false,first;for(const context of contexts)try{selected.current(context);}catch(error){if(!failed){failed=true;first=error;}}if(failed)throw first;};
 return withCompleteSourceClosingFence(()=>{
  keep(selected.api.createOwnedOutcomeContext(original));
  const run=createRulePipeline([
   {phase:'language',rules:[
    {id:'primitive-vector-iterator-bulk:compose-complete-existing-caller-substitutions',apply:()=>{
     for(const plan of plans){
      const proposal=proposePrimitiveVectorLiteralCalls(current,{family:request.family,sourcePath:plan.sourcePath,vectors:plan.vectors});
      if(proposal.files.length!==1||proposal.files[0].path!==plan.sourcePath||proposal.files[0].before!==plan.before||proposal.files[0].inverse!==plan.before)fail('complete migration source equation differs');
      current=replace(current,plan.sourcePath,proposal.files[0].after);
      const context=keep(selected.api.createOwnedOutcomeContext(current));
      const typed=/\.(?:mts|ts)$/u.test(plan.sourcePath),checked=selected.api[typed?'translateOwnedOutcomeTypeScript':'translateOwnedOutcomeJavaScript'](proposal.files[0].after,{context,sourcePath:plan.sourcePath,typescriptOutputPath:plan.pair.typescript});
      if(!sameRustSourceSyntax(checked.rust,proposal.rustCandidate))fail('fresh complete migrated Rust differs');
      results.push({plan,proposal,checked});
     }
     return results;
    }},
    {id:'primitive-vector-iterator-bulk:reissue-strict-typed-projections-and-complete-native-inverses',apply:rows=>{
     for(const row of rows){
      const {plan,checked}=row;
      // Independent target input; keep authoritative application files in the
      // transaction, but remove this pair in the isolated projection context.
      const paths=[plan.pair.javascript,plan.pair.typescript,plan.pair.otherTypeScript];
      const isolated={...current,files:current.files.filter(file=>!paths.includes(file.path))};
      const typedData=replace(isolated,plan.pair.typescript,checked.typescript),typedContext=keep(selected.api.createOwnedOutcomeContext(typedData));
      const typed=selected.api.translateOwnedOutcomeTypeScript(checked.typescript,{context:typedContext,sourcePath:plan.pair.typescript,typescriptOutputPath:plan.pair.typescript});
      if(!sameRustSourceSyntax(typed.rust,checked.rust))fail('complete written TypeScript projection changes canonical Rust');
      const nativeData=replace(isolated,plan.rustPath,checked.rust),nativeContext=keep(selected.api.createOwnedOutcomeContext(nativeData));
      const inverse=selected.inverse(checked.rust,{context:nativeContext,sourcePath:plan.rustPath,javascriptPath:plan.pair.javascript,typescriptOutputPath:plan.pair.typescript});
      if(!sameRustSourceSyntax(inverse.rust,checked.rust))fail('complete canonical Rust inverse does not reproduce its source');
      const reverseData=replace(isolated,plan.pair.javascript,inverse.javascript),reverseContext=keep(selected.api.createOwnedOutcomeContext(reverseData));
      const reissued=selected.api.translateOwnedOutcomeConcreteSyntaxMeta(inverse.concreteSyntax.meta,{context:reverseContext,sourcePath:plan.pair.javascript,typescriptOutputPath:plan.pair.typescript});
      if(!sameRustSourceSyntax(reissued.rust,checked.rust))fail('complete inverse JavaScript/meta reissue differs');
      row.typed=typed;row.inverse=inverse;row.reissued=reissued;
     }
     return rows;
    }},
   ]},
   {phase:'repository',rules:[{id:'router:retain-complete-batch-inverses-and-unqualified-runtime-obligations',apply:rows=>{
    const modules=rows.map(({plan,proposal,checked,inverse,reissued})=>{
     const after=proposal.files[0].after,language=plan.sourcePath.endsWith('.mjs')?'JavaScript':'TypeScript';
     const equations=transportConcreteSourceEquations([
      {before:plan.before,after,language},
      {before:checked.rust,after:inverse.rust,language:'Rust'},
      {before:inverse.javascript,after:reissued.javascript,language:'JavaScript'},
     ]);
     if(equations[0].inverse!==plan.before||equations[1].inverse!==checked.rust||equations[2].inverse!==inverse.javascript)fail('complete batch source history differs');
     const artifacts=[
      {path:plan.rustPath,language:'Rust',source:checked.rust},
      {path:plan.pair.typescript,language:'TypeScript',source:checked.typescript},
      {path:plan.pair.javascript,language:'JavaScript',source:inverse.javascript},
     ].map(file=>({...file,concreteSyntax:concrete(file.source,file.language),inverse:file.source}));
     return {sourcePath:plan.sourcePath,rustPath:plan.rustPath,before:plan.before,after,inverse:plan.before,equations,artifacts,migration:proposal,program:checked.program,meta:checked.meta,canonicalRust:checked.rust,typescript:checked.typescript,canonicalJavaScript:inverse.javascript,canonicalReproductionSyntaxMatched:true};
    });
    return {schema:'primitive-vector-iterator-bulk-source-proposal-v1',family:request.family,modules,
     files:modules.map(row=>({path:row.sourcePath,before:row.before,after:row.after,inverse:row.before})),
     maxModules:16,maxVectorsPerModule:256,maxValues:4096,maxLiteralElements:64,
     originalInputContractEquivalent:false,originalBodyEquivalenceQualified:false,
     inputEnvelopeChanged:true,resourceEnvelopeChanged:true,lengthRepresentationChanged:rows.some(row=>row.proposal.lengthRepresentationChanged),
     sourceInstalled:false,nativeInstalled:false,productionSelected:false,sourceAuthority:false,
     semanticAuthority:false,namespaceAuthority:false,runtimeAuthority:false,runtimeParity:false,
     wholeRouterSynchronization:false,receivingQualified:false,runtimeExecuted:false,rustExecuted:false,
     crossInvocationCache:false};
   }}]},
  ]).run(null);
  const result={...run.value,ruleTrace:run.trace};
  // Account every retained field, including migration histories, source
  // equations, semantic programs/meta and all aliases, before publication.
  accountPrimitiveVectorIteratorBulkData(result);
  return result;
 },[close,()=>{contexts.length=0;results.length=0;}]);
}
