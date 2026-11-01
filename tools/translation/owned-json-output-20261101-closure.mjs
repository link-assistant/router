// Complete original-JSON/owned-String closure implementation, SOURCE UNRUN.
// Only the private singleton in the installed JSON module supplies real maps.
// Another factory instance cannot register proofs/resolvers into that singleton.
import {types} from 'node:util';
import {sameType} from './checked-types.mjs';
import {originalParsedDeclarationEvidence,originalParsedDeclarationSource,originalParsedSyntaxNode,checkedSourceContext,bindCheckedSourceLinks,checkedSourceEvidence,copyMetadata,metadataDigest} from './extensions/source-links.mjs';
import {capturedRustTokenSource} from './extensions/lexical.mjs';
import {rustTokens} from './rust-structure.mjs';
import {captureBorrowedLayouts,requireBorrowedLayouts} from './extensions/standard-borrowed-body.mjs';
import {CONSTANT_EVALUATION_PROFILE} from './extensions/constant-evaluation.mjs';
import {forwardOwnedString} from './owned-forward-domain.mjs';
import {SOURCE_STRING} from './extensions/source-contract-types.mjs';
import {withSourceFailureOperation,withSourceInputValidation} from './source-failure-operations.mjs';
import {withCompleteSourceClosingFence,requireSynchronousSourceCallback} from './complete-source-closing-fence.mjs';
import {unsupported,TranslationError} from './vendor/meta-language/translation/diagnostics.js';
const fail=message=>{throw TypeError('Original JSON output closure: '+message);
  };
const reject=(message,node)=>{throw unsupported('original JSON output',message,node?.span);
  };
const text=type=>forwardOwnedString(type);
export function createOriginalJsonOutputClosure(access){
 const {issued,completedFunctions,functions,activeFunctions,currentFunction,canonical,same,requireChecker,validateFlow,contractFor,withOutputFlow}=access;
 let operation=null;
 const guarded=run=>withSourceFailureOperation(()=>{try{return withCompleteSourceClosingFence(run,[]);
  }catch(error){if(error instanceof TranslationError)throw error;
  return withSourceInputValidation(()=>{throw error;
  });
  }});
 const signature=entry=>({params:entry.params,ret:entry.ret,body:entry.body});
 // This is a source worklist only. Admission still requires completion-time
 // identity, the original checked project, complete callees and whole flow.
 function capture(checker,surface){
  if(!operation)return;
  requireChecker(checker);
  const captured=functions.get(checker),originals=[];
  if(!captured||operation.originals.has(checker))fail('one actual original source capture per checker required');
  const field=(value,key)=>{if(!value||typeof value!=='object'||types.isProxy(value)||![Object.prototype,null,Array.prototype].includes(Object.getPrototypeOf(value)))fail('ordinary original source DATA required');const descriptor=Object.getOwnPropertyDescriptor(value,key);if(descriptor&&!Object.hasOwn(descriptor,'value'))fail('original source getters refused before invocation');return descriptor?.value;};
  function items(list,depth=0){
   if(!Array.isArray(list)||types.isProxy(list)||Object.getPrototypeOf(list)!==Array.prototype)fail('ordinary original source item array required');
   const length=field(list,'length');
   // Match original Root capture's source-list envelope. Exceeding it cannot
   // create a worklist or admit an output closure; unrelated old checking is
   // left to the original checker rather than a new aggregate selection quota.
   if(depth>160||!Number.isSafeInteger(length)||length>200000)return;
   if(Reflect.ownKeys(list).length!==length+1)fail('dense original source item array required');
   for(let at=0;at<length;at++){const item=field(list,String(at)),kind=field(item,'k');
    if(kind==='fn'){const receipt=captured.get(item);if(receipt){currentFunction(checker,item,receipt);originals.push(item);}}
    else if(kind==='module')items(field(item,'items'),depth+1);
   }
  }items(field(surface,'items'));
  operation.originals.set(checker,originals);
 }
 function needed(checker){
  let selected=operation.candidates.get(checker);
  if(selected)return selected;
  selected=new WeakSet();
  operation.candidates.set(checker,selected);
  const originals=operation.originals.get(checker)??[],queue=[];
  const key=item=>JSON.stringify([item.name,item.span?.start,item.span?.end]),byLocation=new Map(),typed=new WeakMap();
  for(const item of originals){const receipt=functions.get(checker)?.get(item);if(!receipt)fail('actual original capture membership changed');currentFunction(checker,item,receipt);const name=key(item);
  if(!byLocation.has(name))byLocation.set(name,[]);
  byLocation.get(name).push(item);
  }const targetItem=target=>{const found=byLocation.get(key(target))??[];
  return found.length===1&&target.fullName===[...(target.modulePath??[]),found[0].name].join('.')?found[0]:null;
  };
  for(const entry of checker.items.values())if(entry.k==='fn'){const item=targetItem(entry);
  if(item)typed.set(item,entry);
  }
  function scan(owner,edge){const receipt=functions.get(checker)?.get(owner);if(!receipt)fail('actual original scan membership changed');currentFunction(checker,owner,receipt);let cells=0;
  function visit(node,depth=0){if(!node||typeof node!=='object')return;
  if(++cells>100000||depth>160)return;
  if(edge&&node.k==='app'&&node.fn?.k==='name'){try{const enclosing=typed.get(owner),target=enclosing&&checker.lookup(node.fn.path,enclosing.modulePath,node.span),item=target?.k==='fn'&&text(target.ret)&&targetItem(target);
  if(item&&!selected.has(item)){selected.add(item);
  queue.push(item);
  }}catch(error){if(!(error instanceof TranslationError))throw error;
  }}if(!edge&&node.k==='outputTextCoreCall'){const origin=originalParsedSyntaxNode(owner,node);
  if(origin?.actual===node&&same(node,origin.relocated)&&!selected.has(owner)){selected.add(owner);
  queue.push(owner);
  }}for(const [key,value]of Object.entries(node))if(!['type','span','sourceFunctionItem','sourceLexicalBinding'].includes(key))for(const child of Array.isArray(value)?value:[value])visit(child,depth+1);
  }visit(owner.body);currentFunction(checker,owner,receipt);
  }
  for(const owner of originals)scan(owner,false);
  for(let at=0;
  at<queue.length;
  at++)scan(queue[at],true);
  return selected;
 }
 const identity=entry=>copyMetadata({name:entry.name,fullName:entry.fullName,modulePath:entry.modulePath,span:entry.span,async:entry.async,constant:entry.constant,constFunction:entry.constFunction,sourceLifetime:entry.sourceLifetime,sourceLifetimes:entry.sourceLifetimes,sourceLifetimeParameters:entry.sourceLifetimeParameters,sourceParameterPatterns:entry.sourceParameterPatterns});
 function completion(checker,item,path,entry){if(!operation||!needed(checker).has(item))return;
  requireChecker(checker);
  const receipt=activeFunctions.get(checker);
  if(!receipt||receipt.activeItem!==item||functions.get(checker)?.get(item)!==receipt||checker.items.get(entry.fullName)!==entry||entry.fullName!==[...path,item.name].join('.')||!same(entry.modulePath,path)||!same(entry.span,item.span))fail('actual original successful completion namespace/source span required');
  currentFunction(checker,item,receipt);
  operation.namespaces.set(entry,{checker,item,receipt,path:[...path],identity:identity(entry)});
  }
 function fact(checker,entry,program=null){
  requireChecker(checker);
  if(!entry||typeof entry!=='object'||types.isProxy(entry))fail('ordinary actual function identity required');
  const current=completedFunctions.get(checker)?.get(entry?.fullName),namespace=operation?.namespaces.get(entry);
  if(!namespace||namespace.checker!==checker||namespace.item!==current?.item||namespace.receipt!==current?.receipt||current?.receipt.functionName!==entry.fullName||!same(namespace.identity,identity(entry))||!same(entry.modulePath,namespace.path))fail('actual completion-time namespace/name/span/lifetime changed');
  if(!current||current.entry!==entry||checker.items.get(entry.fullName)!==entry||functions.get(checker)?.get(current.item)!==current.receipt||program&&program.declarations!==checker.items)fail('same actual checker/program and completed original function required');
  currentFunction(checker,current.item,current.receipt);
  if(!originalParsedDeclarationSource(current.item)||!same(signature(entry),current.snapshot)||entry.k!=='fn'||entry.generated||entry.async||entry.constant||entry.constFunction||current.item.params.length!==entry.params.length||entry.fullName!==[...(entry.modulePath??[]),current.item.name].join('.'))fail('complete current original native function/body required');
  for(let at=0;
  at<entry.params.length;
  at++){const written=current.item.params[at],actual=entry.params[at],resolved=checker.resolveType(written.type,entry.modulePath,entry.span);
  if(written.name!==actual.name||!sameType(resolved,actual.type))fail('actual original parameter signature differs');
  checker.expectedOwnership(resolved,actual.type,entry.modulePath,entry.span);
  checker.expectedPrimitiveIdentity(resolved,actual.type,entry.modulePath,entry.span);
  }
  const ret=checker.resolveType(current.item.ret,entry.modulePath,entry.span);
  if(!sameType(ret,entry.ret))fail('actual original result signature differs');
  checker.expectedOwnership(ret,entry.ret,entry.modulePath,entry.span);
  checker.expectedPrimitiveIdentity(ret,entry.ret,entry.modulePath,entry.span);
  return current;
 }
 function role(checker,type,node){
  if(!type||type.rustGenericIdentityUnresolved||type.rustBorrowingUnresolved)return null;
  if(type.kind==='data'&&type.rustReference?.kind==='shared'&&type.rustReference.pointee?.kind==='data'){canonical(checker,type,node.span,true);
  return 'json-ref';
  }
  if(type.kind==='array'&&type.rustReference?.kind==='shared'&&type.rustOwnership?.kind==='borrowed'&&type.rustOwnership.source==='slice'&&!type.rustFixedArray){const point=type.rustReference.pointee;
  if(point?.kind!=='array'||point.rustReference||point.rustFixedArray||point.rustOwnership?.kind!=='borrowed'||point.rustOwnership.source!=='slice'||!sameType(type.element,point.element))return null;
  canonical(checker,type.element,node.span,false);
  canonical(checker,point.element,node.span,false);
  checker.expectedOwnership(type.element,point.element,[],node.span);
  return 'json-slice';
  }
  if(type.rustReference)return null;
  if(type.kind==='string'&&type.rustOwnership?.kind==='borrowed'&&type.rustOwnership.source==='str'&&!type.patternOwnershipRefusal)return 'str';
  if(!type.rustOwnership&&!type.patternOwnershipRefusal&&(type.kind==='bool'||type.kind==='fixed'&&type.rustSourceType===true&&typeof type.rustPrimitiveName==='string'))return 'copy';
  return null;
 }
 function candidate(checker,entry,receipt){return !!operation&&entry?.k==='fn'&&!entry.async&&entry.ret?.kind==='unit'&&entry.params.length<=128&&entry.params.every(param=>role(checker,param.type,entry))&&(entry.params.some(param=>['json-ref','json-slice'].includes(role(checker,param.type,entry)))||receipt?.owns===true||(operation.applicationOwners.get(receipt?.activeItem??entry)?.length??0)>0);
  }
 function sourceFormats(owner){
  const prior=operation?.scopeIndexes.get(owner);
  if(prior)return prior;
  const result=new WeakMap();
  let cells=0;
  function visit(node,scope,depth=0){if(!node||typeof node!=='object')return;
  if(++cells>100000||depth>160)fail('whole original format lexical census bound');
  if(node.k==='routerConstObligation'&&node.sourceFeature==='router-core-format')result.set(node,new Map(scope));
  if(node.k==='let'){visit(node.value,scope,depth+1);
  visit(node.body,new Map(scope).set(node.name,{kind:'let',node}),depth+1);
  return;
  }if(node.k==='routerFor'){visit(node.object,scope,depth+1);
  visit(node.loopBody,new Map(scope).set(node.name,{kind:'for',node}),depth+1);
  visit(node.body,scope,depth+1);
  return;
  }for(const [key,value]of Object.entries(node))if(!['type','span','sourceLexicalBinding'].includes(key))for(const child of Array.isArray(value)?value:[value])visit(child,scope,depth+1);
  }visit(owner.body,new Map(owner.params.map(node=>[node.name,{kind:'parameter',node}])));
  operation.scopeIndexes.set(owner,result);
  return result;
 }
 function formatRecord(checker,current,node){
  const found=(current.receipt.formatted??[]).filter(record=>same(record.value,node)&&same(record.syntax,record.original));
  if(found.length!==1)return null;
  const record=found[0],origin=originalParsedSyntaxNode(current.item,record.original);
  if(origin?.actual!==record.original||!same(record.original,origin.relocated)||record.original.sourceFeature!=='router-core-format'||!current.receipt.formats.has(record.original))fail('actual original qualified formatter identity differs');
  const native=capturedRustTokenSource(origin.parser.cursor.tokens)?.source,span=origin.original.span;
  if(typeof native!=='string'||!/^crate\s*::\s*translation_core\s*::\s*format\s*!/u.test(native.slice(span.start,span.end)))fail('actual contiguous owned formatter source required');
  const inner=node.k==='routerConstObligation'?node.value:node;
  if(!text(node.type)||inner?.formatProvenance?.profile!=='checked-primitive-format-v1'||inner.formatProvenance.sourceDisplayClosures?.length)reject('actual primitive formatter/String ownership required',node);
  const scopes=sourceFormats(current.item),scope=scopes.get(record.original),offset=origin.relocated.span.start-origin.original.span.start;
  if(!scope)fail('formatter does not belong to original lexical scope');
  function lexical(name){const binding=scope.get(name);
  if(!binding)reject('global/static producer needs a separately completed original const dependency witness',record.original);
  let range=binding.node.span;
  const raw=binding.node;
  if(binding.kind==='let'){const link=originalParsedSyntaxNode(current.item,raw);
  if(link?.actual!==raw||link.parser!==origin.parser||!same(raw,link.relocated)||raw.sourceLexicalBinding?.name!==name)fail('original lexical let custody differs');
  range=link.original.span;
  }else if(binding.kind==='for'){const pattern=raw.sourceIterationPattern;
  if(raw.pattern||raw.mutable||pattern?.reference||pattern?.mutable||pattern?.tokens?.length!==1||pattern.tokens[0].value!==name||pattern.tokens[0].kind!=='identifier')reject('ordinary original immutable loop binding required',raw);
  range={start:pattern.span.start-offset,end:pattern.span.end-offset};
  }else range={start:range.start-offset,end:range.end-offset};
  if(!Number.isSafeInteger(range?.start)||!Number.isSafeInteger(range?.end)||range.start<0||range.end>native.length||range.end<=range.start)fail('original lexical source interval differs');
  const tokens=rustTokens(native.slice(range.start,range.end)).filter(token=>token.type!=='comment');
  let at=binding.kind==='let'?1:0;
  if(binding.kind==='let'&&tokens[0]?.text!=='let')fail('original let token differs');
  if(tokens[at]?.text==='mut')at++;
  if(tokens[at]?.text!==name||binding.kind==='parameter'&&tokens[at+1]?.text!==':'||binding.kind==='for'&&tokens.length!==1)fail('actual original lexical binder tokens differ');
  }
  let rawCells=0;
  function raw(value,depth=0){if(!value||typeof value!=='object'||++rawCells>100000||depth>160)fail('bounded complete formatter source operands required');
  if(value.k==='name'){if(value.path?.length!==1)reject('qualified/global values need their separate source producer proof',value);
  lexical(value.path[0]);
  return;
  }if(['str','num','bool'].includes(value.k))return;
  if(value.k==='app'&&value.fn?.k==='name'){for(const argument of value.args)raw(argument,depth+1);
  return;
  }if(value.k==='routerConstObligation'&&value.sourceFeature==='router-core-format')return;
  if(!['binary','unary','cast'].includes(value.k))reject('field/index/trait/global producer has no completed original witness in this domain',value);
  for(const key of ['arg','left','right','value'])if(value[key]&&typeof value[key]==='object')raw(value[key],depth+1);
  }
  for(const argument of origin.original.value.args)raw(argument.value);
  for(const piece of origin.original.value.pieces)if(piece.capture)lexical(piece.capture.name);
  let body=node.k==='routerConstObligation'?node.value:node;
  const operands=[],locals=new Set();
  while(body?.k==='let'){if(body.mutable)fail('actual formatter generated mutable operand');
  operands.push(body.value);
  locals.add(body.name);
  body=body.body;
  }
  let count=0;
  function pieces(value,depth=0){if(++count>100000||depth>160)fail('bounded complete actual format pieces');
  if(value.k==='binary'&&value.op==='concat'){pieces(value.left,depth+1);
  pieces(value.right,depth+1);
  return;
  }if(value.k==='lit'&&typeof value.value==='string')return;
  const argument=value.k==='toString'?value.arg:['routerFormatString','routerFormatInteger'].includes(value.k)?value.value:null;
  if(!argument)reject('actual primitive formatter output changed',value);
  if(!(argument.k==='var'&&locals.has(argument.name)))operands.push(argument);
  }pieces(body);
  return operands;
 }
 function currentGraph(record){
  if(!operation||record.operation!==operation||record.program.declarations!==record.checker.items||checkedSourceContext(record.program)!==record.context)fail('expired/foreign actual JSON source program');
  for(const entry of record.entries.values()){if(entry.params.some(param=>!role(record.checker,param.type,entry)))fail('actual original shared/scalar signature changed');const current=fact(record.checker,entry,record.program),evidence=checkedSourceEvidence(record.links,entry),original=originalParsedDeclarationEvidence(current.item);
  if(!evidence||!original||Object.keys(original).some(key=>!same(original[key],evidence[key])))fail('actual complete original declaration/source context differs');
  }
  for(const call of record.calls)callJoin(record,call.node,call.owner,call.target);for(const host of record.hostCalls)hostProof(record,host.node,host.owner);
  return record;
 }
 function callJoin(record,node,owner,target){
  const checker=record.checker,caller=fact(checker,owner,record.program),callee=fact(checker,target,record.program);
  if(node.k!=='call'||node.fn!==target.fullName||!text(target.ret)||!sameType(target.ret,node.type)||target.params.length!==node.args.length)reject('actual owned String helper signature required',node);
  let observation=operation.applications.get(node);
  if(!observation){const matches=(operation.applicationOwners.get(caller.item)??[]).filter(row=>row.checker===checker&&same({...row.value,type:null},{...node,type:null}));
  if(matches.length!==1)fail('one actual original observed helper call required; ambiguous copies refuse');
  observation=matches[0];
  }if(observation.checker!==checker||observation.owner!==caller.item||metadataDigest({...observation.value,type:null})!==observation.digest||!same({...observation.value,type:null},{...node,type:null}))fail('actual checked helper/source observation differs');
  const raw=observation.raw,origin=originalParsedSyntaxNode(caller.item,raw);
  if(origin?.actual!==raw||origin.original!==observation.origin.original||origin.parser!==observation.origin.parser||!same(raw,origin.relocated)||checker.lookup(raw.fn.path,owner.modulePath,raw.span)!==target||raw.args.length!==node.args.length||new Set(raw.args).size!==raw.args.length)fail('original raw helper/callee/argument membership differs');
  for(let at=0;
  at<node.args.length;
  at++){const actual=node.args[at].type,wanted=target.params[at].type,domain=role(checker,wanted,node);
  if(!domain||domain!==role(checker,actual,node)||!sameType(actual,wanted))reject('only identical actual shared Json/slice, borrowed str and copied primitive helper arguments',node);
  checker.expectedOwnership(actual,wanted,target.modulePath,node.span);
  checker.expectedPrimitiveIdentity(actual,wanted,target.modulePath,node.span);
  }
  checker.expectedOwnership(target.ret,node.type,target.modulePath,node.span);
  checker.expectedPrimitiveIdentity(target.ret,node.type,target.modulePath,node.span);
  fact(checker,owner,record.program);
  fact(checker,target,record.program);
  const again=originalParsedSyntaxNode(caller.item,raw);
  if(again?.original!==origin.original||again?.actual!==raw||again.parser!==origin.parser||checker.lookup(raw.fn.path,owner.modulePath,raw.span)!==target)fail('actual helper namespace/source changed');
  return callee.entry;
 }
 function hostProof(record,node,entry){
  const proof=issued.get(node.compatibilityCore)??issued.get(node),observed=operation.hosts.get(node),current=fact(record.checker,entry,record.program),contract=contractFor(node.id);
  if(!proof||!observed||observed.proof!==proof||proof.checker!==record.checker||proof.frame!==current.receipt||proof.id!==node.id||!same(node.args,proof.args)||!same(node,observed.call)||!contract||contract!==observed.contract||contract.pure!==true||metadataDigest(contract)!==observed.contractDigest)reject('every JSON host needs its original private issuer/checker/frame/full call/contract custody; unissued std readers refuse',node);
  if(proof.call&&!same(node,proof.call))fail('original private host call changed');
  requireBorrowedLayouts(observed.layouts,record.checker,record.program,observed.roots);
  return proof;
 }
 function observeHost(checker,node,value){
  if(!operation||value?.k!=='routerHostCall')return value;
  const receipt=activeFunctions.get(checker),proof=issued.get(value.compatibilityCore)??issued.get(value),contract=contractFor(value.id);
  if(!receipt?.activeItem||!needed(checker).has(receipt.activeItem)||!proof||proof.checker!==checker||proof.frame!==receipt||proof.id!==value.id||!same(value.args,proof.args)||!contract||contract.pure!==true)return value;
  // Existing issuer ownership is necessary BEFORE retaining a full read-only
  // call/layout snapshot. A registered standard contract ID cannot create it.
  currentFunction(checker,receipt.activeItem,receipt);
  const roots=[...value.args.map(argument=>argument.type),value.type],layouts=copyMetadata(captureBorrowedLayouts(checker,roots));
  operation.hosts.set(value,{proof,call:copyMetadata(value),contract,contractDigest:metadataDigest(contract),roots:copyMetadata(roots),layouts});
  return value;
 }
 function graph(checker,program,entry){
  requireChecker(checker);
  const context=checkedSourceContext(program);
  if(!operation||!context||program.declarations!==checker.items)fail('original checked source context/program required');
  const record={operation,checker,program,context,links:bindCheckedSourceLinks(program,context,{targetProfile:CONSTANT_EVALUATION_PROFILE}),root:entry,entries:new Map(),calls:[],hostCalls:[],resolver:null};
  function visit(current,path=[]){if(path.length>=32||path.includes(current.fullName)||record.calls.length>128||record.entries.size>=256&&!record.entries.has(current.fullName))reject('bounded acyclic original owned-Text helper closure required',current);
  fact(checker,current,program);
  if(record.entries.has(current.fullName)){if(record.entries.get(current.fullName)!==current)fail('one actual helper identity per native name');
  return;
  }if(current.params.length>128||current!==entry&&!text(current.ret)||current.params.some(param=>!role(checker,param.type,current)))reject('complete exact synchronous shared/scalar/String helper signature required',current);
  record.entries.set(current.fullName,current);
  let cells=0;
  function body(node,depth=0){if(!node||typeof node!=='object')return;
  if(++cells>100000||depth>160)fail('bounded complete original helper body census');
  if(['match','routerOrderedMatchArms','routerOriginalSharedPatternMatch','routerLambda','routerOptionCallback','routerAwait','routerFutureCall','routerEffectCall'].includes(node.k))reject('original standard/Option/trait/async closure requires its separately complete pinned proof',node);
  if(node.k==='call'){const target=checker.items.get(node.fn);
  if(!target||record.calls.length>=128)reject('actual bounded completed owned String callee required',node);
  callJoin(record,node,current,target);
  record.calls.push({node,owner:current,target});
  visit(target,[...path,current.fullName]);
  }
    if(node.k==='routerHostCall'&&!(current===entry&&['output_text_write','output_text_result','output_text_passthrough'].includes(node.id))){hostProof(record,node,current);if(record.hostCalls.length>=512)fail('bounded actual JSON host closure');record.hostCalls.push({node,owner:current});}
    for(const [key,value]of Object.entries(node))if(!['type','span','compatibilityCore','dynamicOwnedFormat','formatProvenance','sourceFunctionItem'].includes(key))for(const child of Array.isArray(value)?value:[value])body(child,depth+1);
   }body(current.body);
  }
  if(!candidate(checker,entry,{...fact(checker,entry,program).receipt,activeItem:fact(checker,entry,program).item}))reject('actual original JSON output candidate required',entry);
  visit(entry);
  return currentGraph(record);
 }
 function runFlow(record){
  currentGraph(record);
  const previous=operation.flow,resolver=(node,owner)=>{if(operation?.flow?.record!==record||operation.flow.resolver!==resolver||!record.entries.has(owner.fullName))fail('actual original resolver scope required');
  const matches=record.calls.filter(call=>call.node===node&&call.owner===owner);
  if(matches.length!==1)fail('actual observed original owned-Text call required');
  return callJoin(record,node,owner,matches[0].target);
  };
  const active={record,resolver};
  operation.flow=active;
  try{return withOutputFlow(record.checker,record.root,()=>withCompleteSourceClosingFence(()=>{validateFlow(record.checker,record.root,{ownedOutputTextCallee:resolver,genuine:(node,entry)=>{const receipt=completedFunctions.get(record.checker)?.get(entry.fullName)?.receipt,proof=issued.get(node.compatibilityCore);
  return proof?.checker===record.checker&&proof.frame===receipt&&proof.id===node.id&&same(node.args,proof.args);
  },genuineTextMatch:()=>false});
  },[()=>currentGraph(record)]));
  }finally{operation.flow=previous;
  }
 }
 function validate(checker,program,entry){return guarded(()=>{const record=graph(checker,program,entry);
  runFlow(record);
  if(operation.validations.size>=256)fail('bounded actual JSON output source closures');
  operation.validations.add(record);
  operation.entries.set(entry,record);
  return undefined;
  });
  }
 function requireClosure(checker,entry){return guarded(()=>{const record=operation?.entries.get(entry);
  if(!record||record.checker!==checker)fail('actual completed private JSON output closure missing');
  runFlow(record);
  return record;
  });
  }
 function resolverCurrent(checker,entry,resolver){const active=operation?.flow;
  return !!active&&active.resolver===resolver&&active.record.checker===checker&&active.record.entries.get(entry.fullName)===entry&&active.record.program.declarations===checker.items&&checkedSourceContext(active.record.program)===active.record.context;
  }
 function formatOperands(checker,node,entry,resolver){if(!resolverCurrent(checker,entry,resolver))return null;
  const record=operation.flow.record,current=fact(checker,entry,record.program);
  return guarded(()=>formatRecord(checker,current,node));
  }
 function domain(checker,entry,type,resolver){if(!resolverCurrent(checker,entry,resolver)||!text(type))return null;
  fact(checker,entry,operation.flow.record.program);
  checker.expectedOwnership(type,SOURCE_STRING,entry.modulePath,entry.span);
  return 'owned-text';
  }
 function observeApplication(checker,node,value){
  if(!operation||node?.k!=='app'||value?.k!=='call'||!text(value.type))return value;
  const receipt=activeFunctions.get(checker),owner=receipt?.activeItem,entry=receipt&&checker.items.get(receipt.functionName),possible=type=>!type?.rustGenericIdentityUnresolved&&!type?.rustBorrowingUnresolved&&(type?.kind==='bool'||type?.kind==='fixed'||type?.kind==='string'&&type.rustOwnership?.kind==='borrowed'&&type.rustOwnership.source==='str'||type?.kind==='array'&&type.rustReference?.kind==='shared'&&type.rustOwnership?.source==='slice'||type?.kind==='data'&&type.rustReference?.kind==='shared'&&checker.items.get(type.rustReference.pointee?.name)?.hostTypePath?.join('::')==='serde_json::Value');
  if(!owner||!entry||!needed(checker).has(owner)||!['unit','string'].includes(entry.ret?.kind)||!entry.params.every(param=>possible(param.type))||functions.get(checker)?.get(owner)!==receipt)return value;
  const origin=originalParsedSyntaxNode(owner,node);
  if(origin?.actual!==node||!same(node,origin.relocated)||node.fn?.k!=='name')return value;
  requireChecker(checker);
  currentFunction(checker,owner,receipt);
  let rows=operation.applicationOwners.get(owner);
  if(!rows){rows=[];
  operation.applicationOwners.set(owner,rows);
  }if(rows.length>=128)return value;
  const record={checker,owner,raw:node,origin,value,digest:metadataDigest({...value,type:null})};
  operation.applications.set(value,record);
  rows.push(record);
  return value;
 }
 function observe(checker,node,value){
  if(!operation)return null;
  const receipt=activeFunctions.get(checker),entry=receipt&&checker.items.get(receipt.functionName);
  if(!receipt?.activeItem||!candidate(checker,entry,receipt)||functions.get(checker)?.get(receipt.activeItem)!==receipt)return null;
  return guarded(()=>{currentFunction(checker,receipt.activeItem,receipt);
  const records=(receipt.formatted??[]).filter(record=>record.original===node&&same(record.value,value)&&same(record.syntax,node));
  if(records.length!==1)fail('actual original formatter observation required');
  formatRecord(checker,{item:receipt.activeItem,receipt,entry},value);
  return value;
  });
 }
 function isCandidate(checker,entry){if(!operation)return false;
  const current=fact(checker,entry);
  return candidate(checker,entry,{...current.receipt,activeItem:current.item});
  }
 function qualified(checker,entry){const record=operation?.entries.get(entry)??operation?.flow?.record;
  return !!record&&record.checker===checker&&record.entries.get(entry.fullName)===entry&&checkedSourceContext(record.program)===record.context;
  }
 function publish(checker,program,entry,links){return guarded(()=>{const record=requireClosure(checker,entry);
  if(record.program!==program)fail('original native program changed before helper publication');
  for(const target of record.entries.values()){const current=fact(checker,target,program),source=originalParsedDeclarationEvidence(current.item),evidence=checkedSourceEvidence(links,target);
  if(!evidence||Object.keys(source).some(key=>!same(source[key],evidence[key])))fail('entire original helper source handoff differs');
  operation.published.set(target.fullName,{record,target});
  }return undefined;
  });
  }
 // Exact project.mjs flatten/sourceEvidence rewrite over this signature only.
 // Names are looked up lazily in the SAME actual current declaration Map:
 // this is its exact names Map equation without cloning all N declarations
 // for every emitted function. There is no retained mapping/verdict cache.
 const sourceEvidence=key=>['copyCertificate', 'sourceParameterPatterns', 'sourceParameterPattern', 'sourcePattern', 'constantEvaluationProof','deriveNamespaceProof','toolAttributeProof','jsonMacroProof','sourceMatchesProof','pinnedStandardBodyProof','sourceMethodProof','sourceDisplayScope','sourceBoolFromScope','defaultSourceProof','sourceConversionProof','sourceSharedPatternProof','sourcePatternProjectionProof','sourceSharedStringViewProof','cloneSourceProof','sourceConversionScope'].includes(key);
 function flattenedSignature(record,entry){
  const declarations=record.program.declarations;
  const names={has:name=>declarations.has(name),get:name=>declarations.has(name)?`rp_${Buffer.from(name).toString('hex')}`:undefined};
  let cells=0;
  const visit=(node,depth=0)=>{
   if(++cells>200000||depth>160)fail('bounded complete original flattened signature');
   if(Array.isArray(node))return node.map(value=>visit(value,depth+1));
   if(!node||typeof node!=='object')return node;
   const result=Object.fromEntries(Object.entries(node).map(([key,value])=>[key,sourceEvidence(key)?value:visit(value,depth+1)]));
   if(node.kind==='data'&&names.has(node.name))result.name=names.get(node.name);
   if(node.kind==='named'&&Array.isArray(node.path)){const owner=node.path.filter((part,index)=>index!==0||part!=='crate').join('.');if(names.has(owner))result.path=['crate',names.get(owner)];}
   if(['call','routerFutureCall'].includes(node.k))result.fn=names.get(node.fn)??node.fn;
   if(['ctor','routerPatternTag'].includes(node.k))result.data=names.get(node.data)??node.data;
   return result;
  };
  return visit(signature(entry));
 }
 function emissionSignature(emitter,entry){
  if(!operation||!entry||typeof entry.fullName!=='string')return false;
  const plain=entry.fullName.startsWith('rp_')?Buffer.from(entry.fullName.slice(3),'hex').toString():entry.fullName,row=operation.published.get(plain);
  if(!row||emitter.program.declarations.get(entry.fullName)!==entry)return false;
  return guarded(()=>{currentGraph(row.record);const original=entry.fullName===row.target.fullName;
   if(!original&&(entry.fullName!=='rp_'+Buffer.from(row.target.fullName).toString('hex')||entry.name!==entry.fullName||entry.generated!=='router-project-flattened'||!same(entry.modulePath,[])))return false;
   const expected=original?signature(row.target):flattenedSignature(row.record,row.target),wanted=identity(row.target),actual=identity(entry);
   if(!original){wanted.name=entry.fullName;wanted.fullName=entry.fullName;wanted.modulePath=[];}
   return same(signature(entry),expected)&&same(actual,wanted);
  });
 }
 function emission(emitter,entry){
  if(!operation)return null;
  const plain=entry.fullName.startsWith('rp_')?Buffer.from(entry.fullName.slice(3),'hex').toString():entry.fullName,row=operation.published.get(plain);
  if(!row)return null;
  return guarded(()=>{if(!emissionSignature(emitter,entry))fail('complete actual helper emission/signature/body differs');
  requireClosure(row.record.checker,row.record.root);
  if(operation.emissionStates.size>=512)fail('bounded complete source emission closures');
  const state={epoch:operation,row,snapshot:copyMetadata(signature(entry))};
  operation.emissionStates.add(state);
  return ()=>guarded(()=>{if(operation!==state.epoch||!state.row||!same(signature(entry),state.snapshot)||!emissionSignature(emitter,entry))fail('original helper emission changed/expired');
  try{requireClosure(state.row.record.checker,state.row.record.root);
  }finally{state.epoch.emissionStates.delete(state);
  state.snapshot=null;
  state.row=null;
  }});
  });
 }
 function withOperation(run){requireSynchronousSourceCallback(run);
  if(operation)fail('one synchronous original JSON output operation required');
  const frame={validations:new Set(),entries:new WeakMap(),originals:new WeakMap(),candidates:new WeakMap(),namespaces:new WeakMap(),published:new Map(),applications:new WeakMap(),applicationOwners:new WeakMap(),scopeIndexes:new WeakMap(),hosts:new WeakMap(),emissionStates:new Set(),flow:null};
  return withSourceFailureOperation(()=>{operation=frame;
  try{return withCompleteSourceClosingFence(run,[()=>{let failed=false,error;
  for(const record of frame.validations)try{currentGraph(record);
  }catch(thrown){if(!failed){failed=true;
  error=thrown;
  }}if(failed)throw error;
  }]);
  }finally{for(const state of frame.emissionStates){state.snapshot=null;
  state.row=null;
  }frame.emissionStates.clear();
  for(const row of frame.published.values())row.target=null;
  for(const record of frame.validations){record.entries.clear();
  record.calls.length=0;
  record.hostCalls.length=0;
  record.program=null;
  record.checker=null;
  record.links=null;
  record.root=null;
  record.operation=null;
  }frame.validations.clear();
  frame.published.clear();
  frame.flow=null;
  operation=null;
  }});
  }
 return Object.freeze({withOperation,capture:(checker,surface)=>{if(operation)return guarded(()=>capture(checker,surface));},completion:(checker,item,path,entry)=>{if(operation)return guarded(()=>completion(checker,item,path,entry));},observe,observeApplication:(checker,node,value)=>operation?guarded(()=>observeApplication(checker,node,value)):value,observeHost:(checker,node,value)=>operation?guarded(()=>observeHost(checker,node,value)):value,isCandidate:(checker,entry)=>operation?guarded(()=>isCandidate(checker,entry)):false,validate,requireClosure:(checker,entry)=>{requireClosure(checker,entry);
  return undefined;
  },resolverCurrent,formatOperands,domain,qualified,publish,emissionSignature,emission});
}
