// Sources, never verdicts, survive an operation. Each meta/target interpretation
// reconstructs and checks the complete original caller again through real Host
// classes. This registry cannot be populated from JSON, flags or source pins.
import {HostRustParser,HostChecker,hostData,requireOriginalPrimitiveTryFromChecker} from './extensions/host-contracts.mjs';
import {matchesParserFacts,configureMatchesMacroParser} from './matches-macro-context.mjs';
import {tokenizeRust} from './extensions/lexical.mjs';
import {originalParsedDeclarationEvidence,originalParsedDeclarationSource,originalParsedSyntaxNode,linkProjectDeclaration,metadataDigest,copyMetadata} from './extensions/source-links.mjs';
import {originalSourceModuleItems} from './source-module-views.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {alphaTree,retargetCheckedCallback} from './extensions/standard-body-checker.mjs';
import {withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
const sources=new Map();
const fail=()=>{throw TypeError('Ordered map requires freshly reconstructed complete original source and checked meta');};
export function hasOrderedTextMapCaller(entry){
 let cells=100000;const visit=(node,depth=0)=>{if(!node||typeof node!=='object')return false;if(--cells<0||depth>160)fail();if(node.kind==='routerOrderedTextMap'||node.k==='routerHostCall'&&typeof node.id==='string'&&node.id.startsWith('router_text_map_'))return true;return Object.values(node).some(value=>(Array.isArray(value)?value:[value]).some(child=>visit(child,depth+1)));};return visit(copyMetadata(entry));
}
function sourceJoin(record){
 requireOriginalPrimitiveTryFromChecker(record.checker);
 const evidence=originalParsedDeclarationEvidence(record.item),source=originalParsedDeclarationSource(record.item),state=matchesParserFacts(record.parser);
 if(!evidence||!source||state!==record.state||source!==record.source||metadataDigest(record.item)!==record.snapshot||!originalSourceModuleItems(state.module).includes(record.owner)||state.module.source.slice(record.owner.start,record.owner.end)!==source)fail();
 return {evidence,source,state};
}
export function retainOrderedTextMapCallerSource(checker,item,entry){
 requireOriginalPrimitiveTryFromChecker(checker);if(!hasOrderedTextMapCaller(entry))return null;
 const evidence=originalParsedDeclarationEvidence(item),source=originalParsedDeclarationSource(item);if(!evidence||!source)fail();
 let parser=null,cells=100000;
 const visit=(node,depth=0)=>{if(!node||typeof node!=='object')return;if(--cells<0||depth>160)fail();const origin=originalParsedSyntaxNode(item,node);if(origin){if(parser&&parser!==origin.parser)fail();parser=origin.parser;}for(const [key,value]of Object.entries(node))if(key!=='span')for(const child of Array.isArray(value)?value:[value])visit(child,depth+1);};visit(item);
 if(!parser)fail();const state=matchesParserFacts(parser),owners=originalSourceModuleItems(state.module).filter(owner=>state.module.source.slice(owner.start,owner.end)===source);if(owners.length!==1)fail();
 const key=metadataDigest({file:state.module.file,path:state.module.path,name:item.name,source}),record={checker,item,parser,state,source,owner:owners[0],snapshot:metadataDigest(item)};
 sourceJoin(record);if(!sources.has(key)&&sources.size>=4096)fail();sources.set(key,record);entry.orderedTextMapSourceKey=key;return key;
}
const evidenceKeys=new Set(['copyCertificate','sourceParameterPatterns','sourceParameterPattern','sourcePattern','constantEvaluationProof','deriveNamespaceProof','toolAttributeProof','jsonMacroProof','sourceMatchesProof','pinnedStandardBodyProof','sourceMethodProof','sourceDisplayScope','sourceBoolFromScope','sourceConversionProof','sourceConversionScope']);
function relocate(node,offset){if(Array.isArray(node))return node.map(value=>relocate(value,offset));if(!node||typeof node!=='object')return node;return Object.fromEntries(Object.entries(node).map(([key,value])=>[key,evidenceKeys.has(key)?value:['span','subjectSyntaxSpan','patternSpan'].includes(key)&&value?{start:value.start+offset,end:value.end+offset}:relocate(value,offset)]));}
function semantic(entry){return alphaTree({fullName:entry.fullName,modulePath:entry.modulePath,params:entry.params,ret:entry.ret,body:entry.body,async:entry.async,constant:entry.constant,constFunction:entry.constFunction,sourceLifetimeParameters:entry.sourceLifetimeParameters});}
export function freshlyCheckOrderedTextMapCaller(candidate,{program:receivingProgram=null}={}){
 if(!hasOrderedTextMapCaller(candidate))return null;const record=sources.get(candidate.orderedTextMapSourceKey);if(!record)fail();
 return withCompleteSourceClosingFence(()=>{
  const {evidence,source,state}=sourceJoin(record);
  const pipeline=createRulePipeline([{phase:'language',rules:[{id:'ordered-map:reparse-complete-caller-lossless-CST-before-native-check',apply:()=>{
   const concrete=transportConcreteSyntaxSource(source,{language:'Rust'});if(concrete.source!==source||transportConcreteSyntaxMeta(concrete.meta).source!==source)fail();return concrete.source;
  }}]},{phase:'repository',rules:[{id:'router:reissue-actual-source-namespace-and-whole-Host-body',apply:text=>{
   const parser=new HostRustParser(tokenizeRust(text));parser.compilationProfile=state.facts.compilationProfile;
   configureMatchesMacroParser(parser,state.context,{file:state.module.file,modulePath:state.module.path,offset:record.owner.start});
   // Attributes, methods, async and helpers remain on their existing routes.
   // This receiving leaf admits complete ordinary direct-core functions only.
   const attributes=parser.attributes();if(attributes.length)fail();parser.visibility();if(!parser.cursor.is('fn'))fail();const original=parser.fn(state.module.path);if(!parser.cursor.atEnd())fail();
   const globalOffset=evidence.sourceOffset,entry=relocate(original,record.owner.start+globalOffset),scope=state.facts.evidence.scopes.find(scope=>scope.file===state.module.file&&scope.path.join('::')===state.module.path.join('::'));
   linkProjectDeclaration(parser,original,entry,{source:state.module.source,sourcePath:state.module.file,itemSpan:{start:record.owner.start,end:record.owner.end},itemOffset:record.owner.start,globalOffset,path:state.module.path,scope:{bindingEvidence:scope,compilationProfile:state.facts.compilationProfile,configurationCondition:state.module.configurationCondition}});
   let items=[entry];for(const name of [...state.module.path].reverse())items=[{k:'module',name,items}];
   const checker=new HostChecker('Rust',[]),program=checker.program({language:'Rust',items:[...hostData(),...Array.from(parser.genericTypes.values(),type=>relocate(type,record.owner.start+globalOffset)),...items],main:null}),name=[...state.module.path,original.name].join('.'),fresh=program.declarations.get(name);
   requireOriginalPrimitiveTryFromChecker(checker);if(!fresh)fail();let expected=receivingProgram?retargetCheckedCallback(fresh,receivingProgram):fresh;if(candidate.fullName==='rp_'+Buffer.from(fresh.fullName).toString('hex')&&candidate.modulePath?.length===0)expected={...expected,fullName:candidate.fullName,modulePath:[]};if(metadataDigest(semantic(expected))!==metadataDigest(semantic(candidate)))fail();return {fresh,checker,program,source:text};
  }}]}]).run(null);
  sourceJoin(record);return pipeline.value;
 },[()=>{sourceJoin(record);}]);
}
