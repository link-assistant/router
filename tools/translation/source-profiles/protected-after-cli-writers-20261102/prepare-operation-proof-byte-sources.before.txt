import {guardedProofConsumerHistory} from './guarded-proof-consumer-history.mjs';
// Explicit operation-local byte composition. No default or proof issuer edits.
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {verifyNativeCopiedSourceBindings} from './source-copy-native-bindings.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const INPUT='tools/translation/private-frozen-json.mjs',OUTPUT='tools/translation/operation-proof-byte-scope.mjs';
const PIN='6da6243dd4c2d9f48ca86c5a9e13f88b3b2ea6ad8f7a79df525128c11e732c5f';
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw TypeError('Operation proof byte source: '+message);};
const BOUNDARY=String.raw`
import {createScopedPrivateNativeProofJsonSerializer as operationOriginalSerializer} from './private-native-proof-json.mjs';
const operationBoundaryReady=originalBatchedNamespaceTraversalIntrinsicsUnchanged()&&originalBatchedLexingIntrinsicsUnchanged();
const operationBoundaryGet=operationBoundaryReady?Object.getOwnPropertyDescriptor:null,operationBoundaryParent=operationBoundaryReady?Object.getPrototypeOf:null,operationBoundaryProxy=operationBoundaryReady?types.isProxy:null;
const OperationByteError=TypeError;
let activeOperationByteFrame=null;
function operationSynchronousResult(value){
 for(let depth=0;value!==null&&(typeof value==='object'||typeof value==='function');depth++){
  if(depth>160||operationBoundaryProxy(value))throw new OperationByteError('Operation byte scope requires an ordinary synchronous result');
  // No then getter is invoked, including inherited accessors and Promises.
  if(operationBoundaryGet(value,'then'))throw new OperationByteError('Operation byte scope refuses Promise and thenable results');
  value=operationBoundaryParent(value);
 }
}
/** NEW opt-in byte format; original serializers/default imports stay exact.
 * Only stock native own-DATA composition is shared inside this one operation.
 * The supplied serializer is closed before any return, throw or async result.
 */
export function withOperationProofByteComposition(run){
 if(!operationBoundaryReady||typeof run!=='function'||operationBoundaryProxy(run))throw new OperationByteError('Operation byte scope requires a qualified synchronous callback');
 const prior=activeOperationByteFrame,frame={open:true,parent:prior,clear:null};activeOperationByteFrame=frame;
 try{
  const original=operationOriginalSerializer();
  // Nested operations retain the original serializer and allocate no second
  // byte store. Outer bytes stay bounded and inaccessible until restoration.
  const compose=prior?original:createOperationByteFrame(original,frame);
  const serialize=value=>{
   if(!frame.open||activeOperationByteFrame!==frame)throw new OperationByteError('Operation byte serializer frame is closed or suspended');
   return compose(value);
  };
  const result=run(serialize);operationSynchronousResult(result);return result;
 }finally{
  frame.open=false;activeOperationByteFrame=prior;frame.parent=null;
  const clear=frame.clear;frame.clear=null;if(clear)clear();
 }
}
function createOperationByteFrame(operationByteFallback,operationFrame){
`;
const LANGUAGE_TAIL=String.raw`
 return createPrivateFrozenJsonComposer();
}
`;
const REPOSITORY_TAIL=String.raw`
 // Retire through the complete existing store policy with captured native
 // iteration. Mutated collection methods or globals cannot intercept cleanup.
 function operationClearBytes(){
  if(!qualified||storage===null)return;
  const cursor=apply(mapEntries,storage,[]);
  for(let at=0;at<ENTRIES;at++){const row=apply(next,cursor,[]);if(row.done)break;retire(row.value[0]);}
  if(entries!==0||retainedBytes!==0)throw new OperationByteError('Operation byte store did not close');
 }
 function operationLegacy(value){operationClearBytes();return operationByteFallback(value);}
 operationFrame.clear=operationClearBytes;
 return createPrivateFrozenJsonComposer();
}
`;
const rule=(before,after,id)=>({id,edits:[{span:[0,before.length],expected:before,replacement:after}]});
function applyEdits(source,edits){let result=source;for(const edit of [...edits].sort((a,b)=>b.span[0]-a.span[0])){if(result.slice(...edit.span)!==edit.expected)fail('exact native selection changed');result=result.slice(0,edit.span[0])+edit.replacement+result.slice(edit.span[1]);}return result;}
export function prepareOperationProofByteSources({root=ROOT}={}){
 const ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('actual TypeScript5.9.3 required');const before=readFileSync(resolve(root,INPUT),'utf8');if(hash(guardedProofConsumerHistory(before,INPUT,{root}).historical)!==PIN)fail('complete current immutable composer differs');
 const parse=(path,text)=>{const file=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('complete native grammar differs');return file;},file=parse(INPUT,before),imports=[],removals=[];
 for(const node of file.statements){if(ts.isImportDeclaration(node)){imports.push(node.getText(file));removals.push({span:[node.getStart(file),node.end],expected:node.getText(file),replacement:''});}for(const modifier of node.modifiers??[])if(modifier.kind===ts.SyntaxKind.ExportKeyword)removals.push({span:[modifier.getStart(file),modifier.end],expected:modifier.getText(file),replacement:''});}
 if(imports.length!==4)fail('complete original import census differs');
 const body=applyEdits(before,removals),language=imports.join('\n')+'\n'+BOUNDARY+body+LANGUAGE_TAIL,native=parse(OUTPUT,language),frames=native.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='createOperationByteFrame');if(frames.length!==1)fail('one complete lexical operation frame required');
 const composers=frames[0].body.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='createPrivateFrozenJsonComposer');if(composers.length!==1)fail('one original complete composer required');const fallbackEdits=[];
 function visit(node){if(ts.isCallExpression(node)&&node.expression.getText(native)==='JSON.stringify'&&node.arguments.length===1&&ts.isIdentifier(node.arguments[0])&&node.arguments[0].text==='value')fallbackEdits.push({span:[node.getStart(native),node.end],expected:node.getText(native),replacement:'operationLegacy(value)'});ts.forEachChild(node,visit);}visit(composers[0]);if(fallbackEdits.length!==5)fail('complete original composer fallback census differs');
 let after=applyEdits(language,fallbackEdits);if(!after.endsWith(LANGUAGE_TAIL))fail('complete lexical closing tail differs');after=after.slice(0,-LANGUAGE_TAIL.length)+REPOSITORY_TAIL;parse(OUTPUT,after);if(after.split('\n').length>=1000)fail('whole source line budget');
 const nativeBindings=verifyNativeCopiedSourceBindings(ts,resolve(root,OUTPUT),after),first=transportConcreteSyntaxSource(before,{language:'JavaScript'}),stages=[],sequence={languageRules:[rule(before,language,'javascript:copy-complete-immutable-DATA-composer-into-one-operation')],repositoryRules:[rule(language,after,'router:close-operation-bytes-before-original-hook-fallback')]};let document=first.document;
 for(const phase of ['language','repository']){const from=phase==='language'?before:language,to=phase==='language'?language:after,encoded=serializeConcreteSyntaxMeta(document),fresh=transportConcreteSyntaxMeta(encoded);if(fresh.source!==from)fail('complete current stage differs');const run=applyConcreteSyntaxSubstitutions(fresh.document,{languageRules:phase==='language'?sequence.languageRules:[],repositoryRules:phase==='repository'?sequence.repositoryRules:[]}),meta=serializeConcreteSyntaxMeta(run.value),checked=transportConcreteSyntaxMeta(meta);if(checked.source!==to)fail('whole source substitution differs');const inverse=applyConcreteSyntaxSubstitutions(checked.document,{languageRules:phase==='language'?[rule(to,from,'javascript:restore-whole-original-composer')]:[],repositoryRules:phase==='repository'?[rule(to,from,'router:restore-whole-unmodified-fallbacks')]:[]});if(transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(inverse.value)).source!==from)fail('complete phase inverse differs');stages.push({phase,before:from,after:to,beforeMeta:encoded,afterMeta:meta,trace:run.trace,completeInverse:true});document=checked.document;}
 if(readFileSync(resolve(root,INPUT),'utf8')!==before)fail('complete original input changed');let current=null;try{current=readFileSync(resolve(root,OUTPUT),'utf8');}catch(error){if(error.code!=='ENOENT')throw error;}
 return {schema:'operation-proof-byte-source-v1',typescriptVersion:ts.version,input:{path:INPUT,source:before,sha256:hash(before),historicalSha256:PIN},files:[{path:OUTPUT,before,language,after,current,beforeSha256:hash(before),afterSha256:hash(after),beforeMeta:first.meta,afterMeta:serializeConcreteSyntaxMeta(document),inverse:before,sequence,stages,removals,fallbackEdits,nativeBindings}],existingDefaultsUnchanged:true,arithmeticScopeUnchanged:true,newAcrossInvocationEncodedCache:false,semanticAuthority:false,performanceQualified:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--write','--check','--emit'].includes(args[0]))fail('use --write|--check|--emit');const plan=prepareOperationProofByteSources();
 if(args[0]==='--write'){for(const row of plan.files){let current=null;try{current=readFileSync(resolve(ROOT,row.path),'utf8');}catch(error){if(error.code!=='ENOENT')throw error;}if(current!==row.current)fail('current whole output changed');}for(const row of plan.files)writeFileSync(resolve(ROOT,row.path),row.after);}
 else if(args[0]==='--check'&&plan.files.some(row=>row.current!==row.after))fail('whole generated operation source is stale');
 console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),semanticAuthority:false,performanceQualified:false}));
}
