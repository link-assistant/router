// Whole paired-kernel/native-helper observations only. Private original source,
// namespace, types, moves, loan and caller checks remain independent.
import {withFreshOwnedTextVectorJoinInputs,requireFreshOwnedTextVectorJoinHost} from './fresh-owned-text-vector-join-inputs.mjs';
import {withOriginalOwnedTextVectorSourceOperation,requireCurrentOwnedTextVectorOriginalOperationSource,requireCurrentOwnedTextVectorOperationSource} from './current-owned-text-vector-source.mjs';
import {withCompleteSourceClosingFence,requireSynchronousSourceCallback} from './complete-source-closing-fence.mjs';
import {withSourceFailureOperation,withSourceInputValidation,invalidateActiveSourceOperations} from './source-failure-operations.mjs';
import {ownershipCompiler,ownershipCompilerRuntimeNativeCurrent} from './js-to-rust/vendor/module-syntax.mjs';
import {JOIN_RUNTIME_SOURCE,JOIN_DECLARATIONS_SOURCE,JOIN_NATIVE_HELPER_SOURCE,ownedTextVectorJoinOperationShape} from './owned-text-vector-join-contracts.mjs';
import {ownedTextVectorJoinHelperSources,defaultOwnedTextVectorJoinHelperNames} from './owned-text-vector-join-helper-sources.mjs';
import {ownedTextVectorReceivingConfiguration} from './owned-text-vector-receiving-paths.mjs';
import {requireOwnedTextSources} from './js-to-rust/owned-text-contracts.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {sourceItems,rustTokens} from './rust-structure.mjs';
const fail=message=>{invalidateActiveSourceOperations();throw new TypeError('Current owned String vector join kernel: '+message);};
let active=null;
function guard(){return withSourceInputValidation(()=>{requireFreshOwnedTextVectorJoinHost();if(!ownershipCompilerRuntimeNativeCurrent(ownershipCompiler()))fail('original native syntax runtime changed');});}
export function withOriginalOwnedTextVectorJoinSourceOperation(run){
 requireSynchronousSourceCallback(run);return withSourceFailureOperation(()=>{guard();if(active){const frame=active;if(frame.depth>=64)fail('bounded synchronous join source nesting required');frame.depth++;try{return withCompleteSourceClosingFence(run,[guard]);}finally{frame.depth--;}}
  return withOriginalOwnedTextVectorSourceOperation(()=>withFreshOwnedTextVectorJoinInputs(inputs=>{const frame={inputs,depth:1,program:null};active=frame;try{return withCompleteSourceClosingFence(run,[guard,()=>{frame.program=null;frame.inputs=null;}]);}finally{active=null;frame.depth=0;}}));
 });
}
function tokens(ts,source){const scanner=ts.createScanner(ts.ScriptTarget.Latest,true,ts.LanguageVariant.Standard,source),result=[];for(let kind=scanner.scan();kind!==ts.SyntaxKind.EndOfFileToken;kind=scanner.scan()){if(result.length>=20000)fail('complete kernel source token bound');result.push([kind,scanner.getTokenText()]);}return result;}
function program(){return withSourceInputValidation(()=>{
 if(!active)fail('active original join source operation required');if(active.program)return active.program;const ts=ownershipCompiler(),records=[];
 for(const [path,language,expected]of [['owned-text-vector-join-runtime.mjs','JavaScript',JOIN_RUNTIME_SOURCE],['owned-text-vector-join-runtime.d.mts','TypeScript',JOIN_DECLARATIONS_SOURCE]]){
  const rows=active.inputs.sources.filter(row=>row.path===path);if(rows.length!==1||rows[0].language!==language)fail('one complete current kernel source required');const row=rows[0],file=ts.createSourceFile(path,row.source,ts.ScriptTarget.Latest,true,language==='TypeScript'?ts.ScriptKind.TS:ts.ScriptKind.JS);if(file.parseDiagnostics.length||JSON.stringify(tokens(ts,row.source))!==JSON.stringify(tokens(ts,expected)))fail('whole kernel import/body/strict declaration differs');records.push(Object.freeze({path,source:row.source,concreteSyntax:row.concreteSyntax,inverse:row.source}));
 }
 const templates=ownedTextVectorJoinHelperSources(defaultOwnedTextVectorJoinHelperNames()),native=templates.sources.find(row=>row.language==='Rust');if(!native||native.source!==JOIN_NATIVE_HELPER_SOURCE||transportConcreteSyntaxMeta(native.concreteSyntax).source!==native.source)fail('whole native fold helper source or CST differs');const items=sourceItems(native.source);if(items.length!==1||items[0].term!=='fn'||items[0].name!=='router_rule_owned_text_join')fail('one complete original helper function required');const signature=rustTokens(native.source).filter(token=>token.type!=='comment');let at=signature.findIndex(token=>token.text==='{');if(at<0||signature.slice(0,at).map(token=>token.text).join('')!=='fnrouter_rule_owned_text_join(values:&::std::vec::Vec<::std::string::String>,separator:&str)->::std::string::String')fail('complete actual shared String vector, str and owned String native signature differs');
 const length=requireCurrentOwnedTextVectorOriginalOperationSource('vec_text_len'),get=requireCurrentOwnedTextVectorOriginalOperationSource('vec_text_get');if(length.parameters.join('|')!=='vec:text-owned-ref'||length.returns!=='u64'||get.parameters.join('|')!=='vec:text-owned-ref|u64'||get.returns!=='text-owned-option'||get.clonesOwnedText!==true)fail('complete native helper vector ABI differs');
 guard();active.program=Object.freeze({records:Object.freeze(records),nativeHelper:Object.freeze({...native}),inputFiles:Object.freeze([...active.inputs.inputFiles])});return active.program;
});}
function operation(name){return withSourceInputValidation(()=>{const shape=ownedTextVectorJoinOperationShape(name);if(!shape)fail('one fixed original join operation required');const data=program();guard();return {...shape,kernelSources:data.records,nativeHelper:data.nativeHelper,inputFiles:[...data.inputFiles],nativeHelperSourceMatched:true,runtimeSourceMatched:true,declarationAbiSourceMatched:true,originalBodyEquivalenceQualified:false,nativeTypeOwnerQualified:false,privateCallerBindingQualified:false,sourceAuthority:false,namespaceAuthority:false,semanticAuthority:false,runtimeAuthority:false,crossInvocationCache:false};});}
export function requireCurrentOwnedTextVectorJoinOriginalOperationSource(name){return withOriginalOwnedTextVectorJoinSourceOperation(()=>operation(name));}
export function requireCurrentOwnedTextVectorJoinOperationSource(files,configuration,name){return withOriginalOwnedTextVectorJoinSourceOperation(()=>withSourceInputValidation(()=>{
 const row=operation(name),config=ownedTextVectorReceivingConfiguration(configuration),base=requireCurrentOwnedTextVectorOperationSource(files,config,'vec_text_get'),records=[...base.sourceRecords],textPaths=['src/lib.rs','src/translation_text_core.rs',config.runtimeRoot+'/text-runtime.mjs',config.declarationRoot+'/text-runtime.d.mts'],textFiles=new Map(textPaths.map(path=>[path,Map.prototype.get.call(files,path)])),textSourceRecords=requireOwnedTextSources(textFiles,config);
 for(const source of row.kernelSources)for(const root of new Set([config.runtimeRoot,config.declarationRoot])){const path=root+'/'+source.path;if(Map.prototype.get.call(files,path)!==source.source)fail('complete actual receiving join kernel source differs: '+path);records.push({...source,path});}
 guard();return {...row,sourceRecords:records,textSourceRecords};
}));}
