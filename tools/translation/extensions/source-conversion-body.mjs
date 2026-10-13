// Bind the privately selected original Into/From bodies to checked types.
// The emitted computation is ordinary let/to_owned IR, not a function port.
import {types as nodeTypes} from 'node:util';
import {HostRustParser,HostChecker,originalHostParserIdentitySnapshot} from './host-contracts.mjs';
import {tokenizeRust} from './lexical.mjs';
import {metadataDigest,copyMetadata,originalParsedDeclarationEvidence,checkedSourceEvidence,checkedSourceContext,ownData,snapshotMap} from './source-links.mjs';
import {assertOriginalParserIdentity} from '../original-parser-identity.mjs';
import {TokenCursor} from '../vendor/meta-language/translation/lexer.js';
import {originalTextCursorGuard} from './text.mjs';
import {originalConversionPlan,requireOriginalConversionMember} from './source-conversion-inputs.mjs';
import {requireSourceConversionScope} from './source-conversion-scope.mjs';
import {sameType} from '../checked-types.mjs';
import {pinnedPrimitiveIdentityFrom,parsePrimitiveIdentityFromBody,requirePrimitiveIdentityFromEvidence} from './primitive-identity-from-source.mjs';
import {typeError,unsupported} from '../vendor/meta-language/translation/diagnostics.js';
import {renameFunction} from '../vendor/meta-language/translation/ir.js';
const issued=new Map(),originalCalls=new WeakMap(),emitterFunctions=new WeakMap(),checkerOrigins=new WeakMap();let parsed;
const fail=message=>{throw new TypeError('Original conversion body: '+message);};
// Preserve exact checker identity without retaining failed whole-program graphs.
function checkerOrigin(checker){let origin=checkerOrigins.get(checker);if(!origin){origin=Object.freeze({});checkerOrigins.set(checker,origin);}return origin;}
const ownedString=type=>type?.kind==='string'&&type.rustSourceType===true&&type.rustOwnership?.kind==='owned'&&type.rustOwnership.source==='String'&&!type.rustReference&&!type.rustBorrowingUnresolved&&!type.rustGenericIdentityUnresolved;
const borrowedStr=type=>type?.kind==='string'&&type.rustOwnership?.kind==='borrowed'&&type.rustOwnership.source==='str'&&!type.rustReference&&!type.rustBorrowingUnresolved&&!type.rustGenericIdentityUnresolved&&(type.rustSourceType===true||type.rustBorrowLifetime?.kind==='static'||type.rustStandardSignature);
function primitive(type){try{return pinnedPrimitiveIdentityFrom(type).type;}catch(error){if(!(error instanceof TypeError))throw error;return null;}}
function parser(source){const result=new HostRustParser(tokenizeRust(source)),identity=originalHostParserIdentitySnapshot();assertOriginalParserIdentity(result,HostRustParser.prototype,new Map(identity.parserMethods));assertOriginalParserIdentity(result.cursor,TokenCursor.prototype,new Map(identity.cursorMethods),{originalGuard:originalTextCursorGuard(result.cursor)});return result;}
export function parseOriginalConversionBodies(Parser=HostRustParser){
  if(Parser!==HostRustParser)fail('requires actual original Host parser');
  const plan=originalConversionPlan();for(const member of [plan.into,plan.identity,plan.string])requireOriginalConversionMember(member);
  // Recheck definition-time parser/cursor identities even when syntax is cached.
  const intoParser=parser(plan.into.bodySource);if(parsed)return copyMetadata(parsed);
  const into=intoParser.block([]);if(!intoParser.cursor.atEnd()||into.k!=='app'||into.fn?.k!=='name'||into.fn.path?.join('::')!=='U::from'||into.args?.length!==1||into.args[0]?.k!=='name'||into.args[0].path?.join('::')!=='self')fail('actual Into AST is not its sole original U::from(self) call');
  const fromParser=parser(plan.string.parsedMemberSource),from=fromParser.fn([]);
  if(!fromParser.cursor.atEnd()||from.name!=='from'||from.params.length!==1||from.params[0].name!=='s'||!borrowedStr(from.params[0].type)||!ownedString(from.ret)||from.constFunction)fail('actual From<&str> parsed signature differs');
  const receiver=from.body.object;
  if(from.body.k!=='routerStringOwnership'||from.body.operation!=='to_owned'||from.body.args?.length||receiver?.k!=='name'||receiver.path?.join('::')!=='s')fail('actual From body is not its original to_owned receiver');
  // Identity is selected, parsed and retained, but owned String moves need an
  // independent single-use ownership proof before this binder can be executed.
  const identityParser=parser(plan.identity.bodySource),identity=identityParser.block([]);
  if(!identityParser.cursor.atEnd()||identity.k!=='name'||identity.path?.join('::')!=='t')fail('actual generic identity body differs');
  parsed={into,from,identity,intoSyntaxSha256:metadataDigest(into),fromSyntaxSha256:metadataDigest(from),identitySyntaxSha256:metadataDigest(identity)};return copyMetadata(parsed);
}
function rename(tree,from,to){if(Array.isArray(tree))return tree.map(item=>rename(item,from,to));if(!tree||typeof tree!=='object')return tree;if(tree.k==='name'&&tree.path?.length===1&&tree.path[0]===from)return {...tree,path:[to]};return Object.fromEntries(Object.entries(tree).map(([key,value])=>[key,rename(value,from,to)]));}
// Normalize only exact project spellings of privately captured original
// references. A source name resembling rp_hex remains its own original name.
function originalReferences(tree,original){if(Array.isArray(tree))return tree.map((value,index)=>originalReferences(value,original?.[index]));if(!tree||typeof tree!=='object')return tree;const result=Object.fromEntries(Object.entries(tree).map(([key,value])=>[key,originalReferences(value,original?.[key])]));for(const key of ['fn','data',...(tree.kind==='data'?['name']:[])])if(typeof tree[key]==='string'&&typeof original?.[key]==='string'&&tree[key]==='rp_'+Buffer.from(original[key]).toString('hex'))result[key]=original[key];if(tree.kind==='named'&&original?.kind==='named'&&tree.path?.length===2&&tree.path[0]==='crate'&&tree.path[1]==='rp_'+Buffer.from(original.path.filter((part,index)=>index!==0||part!=='crate').join('.')).toString('hex'))result.path=original.path;return result;}
function canonical(tree){if(Array.isArray(tree))return tree.map(canonical);if(!tree||typeof tree!=='object')return tree;return Object.fromEntries(Object.entries(tree).filter(([key])=>key!=='span').map(([key,value])=>[key,canonical(value)]));}
const treeDigest=tree=>metadataDigest(canonical(tree));
export function captureOriginalConversions(checker,surface){
  const nodes=new WeakMap(),visit=node=>{if(!node||typeof node!=='object')return;if(node.k==='routerSourceIntoCall')nodes.set(node,metadataDigest(node));for(const [key,value]of Object.entries(node))if(!['type','span','sourceConversionScope'].includes(key))Array.isArray(value)?value.forEach(visit):visit(value);};
  const items=list=>{for(const item of list)if(item.k==='module')items(item.items);else if(item.k==='fn'&&originalParsedDeclarationEvidence(item))visit(item.body);};items(surface.items);originalCalls.set(checker,nodes);
}
export function checkOriginalSourceInto(checker,node,receiver,env,path,expected){
  if(!checker||nodeTypes.isProxy(checker)||Object.getPrototypeOf(checker)!==HostChecker.prototype||Object.hasOwn(checker,'expr'))fail('requires actual original Host checker');
  if(originalCalls.get(checker)?.get(node)!==metadataDigest(node))throw unsupported('original conversion caller','requires the unchanged actual privately captured source-call syntax',node.span);
  if(node.args?.length)throw typeError('Into::into takes no arguments',node.span);
  const targetPrimitive=primitive(expected),identity=targetPrimitive&&primitive(receiver.type);
  if(!ownedString(expected)&&!targetPrimitive)throw unsupported('Into target inference','requires one actual checked expected standard String or by-value fixed/bool identity result',node.span);
  if(!identity&&!borrowedStr(receiver.type)||identity&&(identity.rustPrimitiveName!==targetPrimitive.rustPrimitiveName||!sameType(receiver.type,expected)))throw unsupported('source Into receiver','requires actual checked &str to String or matching primitive identity; owned moves, shared String, custom conversions and allocator bodies remain unproved',node.span);
  if(targetPrimitive&&!identity)throw unsupported('source Into receiver','requires the same actual primitive identity',node.span);
  if(node.sourceConversionRefusal)throw unsupported('source conversion namespace',node.sourceConversionRefusal,node.span);
  let caller;try{caller=requireSourceConversionScope(node.sourceConversionScope);}catch(error){if(!(error instanceof TypeError))throw error;throw unsupported('source conversion namespace',error.message,node.span);}
  const targetName=identity?targetPrimitive.rustPrimitiveName:'String';if(caller.targetBindings[targetName]?.unshadowed!==true)throw unsupported('source conversion target','actual selected standard target is shadowed or unresolved',node.span);
  const plan=originalConversionPlan(),syntax=parseOriginalConversionBodies(),reserved=new Set(env.keys());let name;do{name=checker.freshName('ml_conversion_source_');}while(reserved.has(name));
  // Resolve the original U::from(self) callee only after T/U and the actual
  // source From<&str> member are selected. Its original parameter binder is
  // renamed hygienically to the single evaluated caller receiver binding.
  const originalArgument=syntax.into.args[0].path[0];if(originalArgument!=='self')fail('original delegate argument binding differs');
  const identitySelection=identity?pinnedPrimitiveIdentityFrom(receiver.type):null,identityBodyProof=identity?parsePrimitiveIdentityFromBody(HostRustParser,checker,identitySelection):null;
  const bodySurface=identity?rename(syntax.identity,'t',name):rename(syntax.from.body,syntax.from.params[0].name,name),body=checker.expr(bodySurface,new Map([[name,receiver.type]]),[],expected);
  if(!sameType(body.type,expected)||identity&&(body.k!=='var'||body.name!==name)||!identity&&(body.k!=='toString'||body.arg?.k!=='var'||body.arg.name!==name||body.sourceOwnershipOperation?.profile!=='checked-standard-string-ownership-v1'||body.sourceOwnershipOperation.operation!=='to_owned'||body.sourceOwnershipOperation.verified!==true))fail('original checked conversion capability differs');
  checker.expectedOwnership(body.type,expected,path,node.span);
  const computation={k:'let',name,value:receiver,body,type:body.type,span:node.span},proof={schema:'original-checked-source-conversion-v1',route:identity?'Into<T> for T via From<T> identity':'Into<String> for &str via From<&str>',profileSha256:plan.profileSha256,caller,selectedInto:plan.into,selectedFrom:identity?plan.identity:plan.string,identityBodyProof,bindings:{T:receiver.type,U:expected,Self:expected},syntax:{into:syntax.into,from:identity?syntax.identity:syntax.from,intoSha256:syntax.intoSyntaxSha256,fromSha256:identity?syntax.identitySyntaxSha256:syntax.fromSyntaxSha256},allocationBoundary:identity?null:plan.allocationBoundary,ownershipOperation:body.sourceOwnershipOperation??null,evaluationOrder:'receiver once; original delegate; selected original From body',constTraitCall:false,wholeTraitTranslated:false,wholeAllocTranslated:false,runtimeParity:false,computationSha256:treeDigest(computation)},digest=metadataDigest(proof),result={k:'routerSourceConversion',body:computation,type:body.type,sourceConversionProof:{...proof,digest},constEligible:false,span:node.span};issued.set(digest,{checkerOrigin:checkerOrigin(checker),proof:copyMetadata(result.sourceConversionProof),computation:copyMetadata(computation),finalized:[]});return result;
}
export function requireOriginalConversionEmission(node,emitter=null){const proof=copyMetadata(node.sourceConversionProof),original=proof&&issued.get(proof.digest),computationValid=original&&(emitter?emitterFunctions.get(emitter)?.get(proof.digest)?.has(treeDigest(node.body)):[original.computation,...original.finalized].some(computation=>treeDigest(originalReferences(node.body,computation))===treeDigest(computation)));if(!original||metadataDigest(proof)!==metadataDigest(original.proof)||!computationValid||node.constEligible!==false||!sameType(node.type,node.body.type)||!ownedString(node.type)&&!primitive(node.type))fail('unissued, changed or forged checked conversion computation');requireSourceConversionScope(proof.caller);if(proof.identityBodyProof)requirePrimitiveIdentityFromEvidence(proof.identityBodyProof,node.body.value.type);return node.body;}
function conversions(tree,result=[]){if(!tree||typeof tree!=='object')return result;if(tree.k==='routerSourceConversion')result.push(tree);for(const [key,value]of Object.entries(tree))if(!['type','sourceConversionProof'].includes(key)){if(Array.isArray(value))value.forEach(child=>conversions(child,result));else conversions(value,result);}return result;}
// The core checker's structural-recursion pass can rewrite a recursive
// argument inside an already checked conversion. Only its genuine whole
// original declaration seal can bind that exact post-pass computation.
export function finalizeOriginalConversions(checker,program,sourceLinks){
  if(!checker||nodeTypes.isProxy(checker)||Object.getPrototypeOf(checker)!==HostChecker.prototype||Object.hasOwn(checker,'expr'))fail('finalization requires actual original Host checker');
  if(!checkedSourceContext(program))fail('finalization requires the genuine checked program identity');
  for(const originalEntry of snapshotMap(ownData(program,'declarations')).values()){
    const entry=copyMetadata(originalEntry),nodes=conversions(entry.body);if(!nodes.length)continue;
    if(!checkedSourceEvidence(sourceLinks,entry))fail('finalization requires its genuine complete original checked declaration');
    for(const node of nodes){
      const proof=copyMetadata(node.sourceConversionProof),state=proof&&issued.get(proof.digest);
      if(!state||state.checkerOrigin!==checkerOrigins.get(checker)||metadataDigest(proof)!==metadataDigest(state.proof)||node.constEligible!==false||!sameType(node.type,node.body.type)||!ownedString(node.type)&&!primitive(node.type))fail('finalization requires its own unchanged privately issued conversion proof');
      requireSourceConversionScope(proof.caller);
      if(proof.identityBodyProof)requirePrimitiveIdentityFromEvidence(proof.identityBodyProof,node.body.value.type);
      const computation=copyMetadata(node.body);
      if(!state.finalized.some(prior=>treeDigest(prior)===treeDigest(computation)))state.finalized.push(computation);
    }
  }
}
export function prepareOriginalConversionFunction(emitter,entry){const nodes=conversions(entry.body);if(!nodes.length)return null;for(const node of nodes)requireOriginalConversionEmission(node);const prior=emitterFunctions.get(emitter),renamed=renameFunction(entry,emitter.state.ident,emitter.state.localReserved()),expected=new Map();for(const node of conversions(renamed.body)){const digest=node.sourceConversionProof.digest;if(!expected.has(digest))expected.set(digest,new Set());expected.get(digest).add(treeDigest(node.body));}emitterFunctions.set(emitter,expected);return ()=>{if(prior)emitterFunctions.set(emitter,prior);else emitterFunctions.delete(emitter);};}
