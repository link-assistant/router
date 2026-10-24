// Language helpers only; the original caller/frame and emission issuers still
// authenticate every complete function, call, source span and dependency.
import {createHash} from 'node:crypto';
import {jsonStateContract} from './owned-forward-contracts.mjs';
import {checkForwardOwnedExtra} from './owned-forward-domain.mjs';
import {BOOL,fixed,sameType} from './checked-types.mjs';
import {JSON_TYPES} from './extensions/json-contracts.mjs';
import {sourceVector} from './extensions/source-contract-types.mjs';
import {requireBorrowedString} from './extensions/string-iterators.mjs';
import {requireOriginalPrimitiveTryFromChecker} from './extensions/host-contracts.mjs';
import {matchesParserFacts} from './matches-macro-context.mjs';
import {requireRouterCoreFacade,requireRouterCoreFacadeCurrent} from './router-core-formatting.mjs';
import {originalSourceModuleItems} from './source-module-views.mjs';
import {crateModuleSourcePath} from './repository-layout.mjs';
import {originalDataFreezeIntrinsicsUnchanged} from './original-json-intrinsics.mjs';
import {transportConcreteSyntaxSource} from './concrete-syntax-meta.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {unsupported,typeError} from './vendor/meta-language/translation/diagnostics.js';
const fail=()=>{throw new TypeError('Owned JSON state requires its actual complete native leaf and source frame');};
export function forwardJsonStateContract(name){const row=jsonStateContract(name);return row?{...row,source:row.source,sourceSha256:createHash('sha256').update(row.source).digest('hex')}:null;}
function leaf(state,row){
 const rows=state.facts.modules.filter(module=>module.path.join('::')===row.rustModule);
 if(rows.length!==1||rows[0].file!==crateModuleSourcePath(state.facts.modules,row.rustSource)||rows[0].source!==row.source||rows[0].configurationCondition!=='active'||!rows[0].sourceView)fail();
 const items=originalSourceModuleItems(rows[0]),members=items.filter(item=>item.term==='fn'&&item.name===row.rustName);if(members.length!==1)fail();return rows[0];
}
export function parseRouterCoreJsonState(parser,path){
 const c=parser.cursor,row=jsonStateContract(c.peek(4).value);if(!row||!['crate','::',row.rustModule,'::'].every((word,index)=>c.is(word,index))||[0,2,4].some(index=>c.peek(index).kind!=='identifier'))return null;
 if(!originalDataFreezeIntrinsicsUnchanged())fail();const state=matchesParserFacts(parser),facade=requireRouterCoreFacade(parser),original=leaf(state,row),view=original.sourceView,tokens=c.tokens,start=c.index,first=c.peek();
 const stage=createRulePipeline([{phase:'language',rules:[{id:'owned-json-state:serialize-reparse-complete-actual-native-leaf-CST',apply:()=>{const concrete=transportConcreteSyntaxSource(original.source,{language:'Rust'});if(concrete.source!==row.source)fail();return concrete;}}]},{phase:'repository',rules:[{id:'router:bind-actual-qualified-owned-state-operation',apply:value=>value}]}]).run(null);
 const current=index=>{if(!originalDataFreezeIntrinsicsUnchanged())fail();requireRouterCoreFacadeCurrent(parser,facade);if(matchesParserFacts(parser)!==state||leaf(state,row)!==original||original.sourceView!==view||parser.cursor!==c||c.tokens!==tokens||c.index!==index)fail();};
 current(start);c.index+=5;c.expect('(','owned JSON state');const args=[];while(!c.is(')')){args.push(parser.expr(path));if(!c.eat(','))break;}const last=c.expect(')','owned JSON state');current(c.index);
 return {node:{k:'routerCoreJsonUpdateCall',operation:row.rustName,args,span:{start:first.start,end:last.end}},trace:stage.trace};
}
function jsonList(checker,type,path,span,canonical,owned){
 if(type?.kind!=='array'||type.rustSourceType!==true||type.rustFixedArray||type.rustGenericIdentityUnresolved||type.rustBorrowingUnresolved)throw unsupported('owned JSON state list','requires an actual canonical JSON Vec or shared slice',span);
 if(owned){if(type.rustReference||type.rustOwnership?.kind!=='owned'||type.rustOwnership.source!=='Vec'||type.patternOwnershipRefusal&&!['ownership-bearing Vec type'].includes(type.patternOwnershipRefusal))throw unsupported('owned JSON state Vec','requires its actual by-value Vec<Json> source identity',span);}
 else{
  const pointee=type.rustReference?.pointee;
  const reference=type.rustReference;
  if(reference?.kind!=='shared'||type.rustOwnership?.kind!=='borrowed'||type.rustOwnership.source!=='slice'||type.patternOwnershipRefusal!=='shared source reference'||reference.tokens?.[0]?.value!=='&'||!Number.isInteger(reference.span?.start)||!Number.isInteger(reference.span?.end)||reference.span.start<0||reference.span.end<reference.span.start||!pointee||pointee.kind!=='array'||pointee.rustSourceType!==true||pointee.rustReference||pointee.rustFixedArray||pointee.patternOwnershipRefusal||pointee.rustGenericIdentityUnresolved||pointee.rustBorrowingUnresolved||pointee.rustOwnership?.kind!=='borrowed'||pointee.rustOwnership.source!=='slice'||!sameType(type.element,pointee.element))throw unsupported('owned JSON state slice','requires its actual checked shared slice origin',span);
  canonical(checker,pointee.element,span,false);checker.expectedOwnership(type.element,pointee.element,path,span);
 }
 canonical(checker,type.element,span,false);
}
export function checkForwardJsonState(checker,node,env,path,expected,{canonical,current}){
 const row=forwardJsonStateContract(node.operation);if(row&&row.family!=='state')return checkForwardOwnedExtra(checker,node,env,path,expected,row,{canonical,current});if(!row||node.args.length!==row.parameters.length)throw typeError('actual JSON state operation argument count differs',node.span);
 const args=node.args.map((syntax,index)=>{
  const role=row.parameters[index],borrow=role==='shared-json'&&syntax.k==='routerTextReference',wanted=role==='u64'?{...fixed(64,false),rustPrimitiveName:'u64',rustSourceType:true}:undefined,value=checker.expr(borrow?syntax.value:syntax,env,path,wanted);current();
  if(role==='owned-json')canonical(checker,value.type,syntax.span,false);
  else if(role==='shared-json'){canonical(checker,value.type,syntax.span,true);if(!borrow&&!value.type.rustReference)throw unsupported('owned JSON state borrow','requires the actual written shared reference or shared Json input',syntax.span);}
  else if(role==='shared-json-list'||role==='owned-json-list')jsonList(checker,value.type,path,syntax.span,canonical,role==='owned-json-list');
  else if(role==='str'){requireBorrowedString(value.type,syntax.span);if(value.type.patternOwnershipRefusal)throw unsupported('owned JSON state text','requires its actual unresolved-refusal-free borrowed str',syntax.span);}
  else if(role==='u64'){const type=value.type;if(type.kind!=='fixed'||type.bits!==64||type.signed!==false||type.rustPrimitiveName!=='u64'||type.rustReference||type.rustOwnership||type.patternOwnershipRefusal||type.rustGenericIdentityUnresolved||type.rustBorrowingUnresolved)throw unsupported('owned JSON state index','requires the actual by-value u64 source identity',syntax.span);checker.expectedPrimitiveIdentity(type,{...fixed(64,false),rustPrimitiveName:'u64'},path,syntax.span);}
  else throw typeError('unregistered actual JSON state operand domain',syntax.span);
  return value;
 });
 const json=checker.hostType(JSON_TYPES.value,path,node.span),type=row.returns==='owned-json'?{...json,rustSourceType:true}:row.returns==='owned-json-list'?{...sourceVector(json),rustSourceType:true}:row.returns==='bool'?BOOL:{...fixed(64,false),rustPrimitiveName:'u64',rustSourceType:true};
 if(expected){if(!sameType(type,expected))throw typeError('actual JSON state output differs',node.span);checker.expectedOwnership(type,expected,path,node.span);checker.expectedPrimitiveIdentity(type,expected,path,node.span);}
 requireOriginalPrimitiveTryFromChecker(checker);current();return {k:'routerHostCall',id:row.javascriptName,args,type,span:node.span,constEligible:false};
}
