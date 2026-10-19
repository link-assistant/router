// Preserve the original bool public API and private caller namespace checks.
import {createHash} from 'node:crypto';
import {rustTokens} from '../rust-structure.mjs';
import {originalSourceModuleItems} from '../source-module-views.mjs';
import {matchesParserFacts} from '../matches-macro-context.mjs';
import {requireOriginalFromNamespaceCallbacks} from './host-contracts.mjs';
import {metadataDigest,copyMetadata} from './source-links.mjs';
import {PRIMITIVE_FROM_SOURCE_PROFILE,pinnedPrimitiveFrom,parsePrimitiveFromBody,requirePrimitiveFromBody,primitiveFromNamespace} from './primitive-from-source.mjs';
import {originalNonTraitImportRole} from './primitive-import-roles.mjs';
import {originalAnonymousTraitScope} from './primitive-anonymous-traits.mjs';
import {originalLocalTraitClosure} from './primitive-trait-closure.mjs';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const significant=tokens=>tokens.filter(token=>token.type!=='comment'),same=(a,b)=>a.length===b.length&&a.every((part,index)=>part===b[index]);
const scopeProofs=new Map();
export const PRIMITIVE_BOOL_FROM_PROFILE=PRIMITIVE_FROM_SOURCE_PROFILE;
export const pinnedPrimitiveBoolFrom=target=>pinnedPrimitiveFrom({kind:'bool'},target);
export const parsePrimitiveBoolFromBody=(Parser,selection)=>{if(selection?.input?.kind!=='bool')throw new TypeError('Boolean From parsing requires its private original bool selection');return parsePrimitiveFromBody(Parser,selection);};
export const requirePrimitiveBoolFromBody=(proof,target)=>requirePrimitiveFromBody(proof,{kind:'bool'},target);
const fail=message=>{throw new TypeError('Primitive bool From namespace: '+message);};
export function capturePrimitiveBoolFromScope(parser,target,start){
  requireOriginalFromNamespaceCallbacks(parser);
  const state=matchesParserFacts(parser),facts=state.facts,consumer=state.module,scope=facts.evidence.scopes.find(scope=>scope.file===consumer.file&&same(scope.path,consumer.path)),ancestors=facts.evidence.scopes.filter(parent=>parent.path.every((name,index)=>consumer.path[index]===name));
  // Associated trait lookup consumes type/attribute scopes. An exported bang
  // macro name in an unselected child cannot shadow a trait unless invoked;
  // actual invocations/declarations in this member are rejected below, while
  // top-level expansions retain their independent type-scope uncertainty.
  if(!scope||ancestors.some(parent=>parent.configurationCondition!=='active'||parent.unresolvedTypeScope!==false||parent.unresolvedAttributeMacroScope!==false))fail('original active type/attribute scopes are unproved');
  if(!Number.isSafeInteger(start)||start<0||start>=state.sourceLength||!state.tokens.some(token=>token.start===start&&token.kind==='identifier'))fail('call point escapes its original source tokens');
  const enclosing=originalSourceModuleItems(consumer).filter(item=>item.start<=state.offset+start&&item.end>state.offset+start);
  for(const item of enclosing){
    const tokens=significant(item.tokens),body=tokens.findIndex(token=>token.text==='{');if(body<0)continue;const local=tokens.slice(body+1);
    if(local.some((token,index)=>['use','extern','trait','impl','type','mod','macro','macro_rules!'].includes(token.text)||token.text.length>1&&token.text.endsWith('!')||token.text==='!'&&local[index-1]?.type==='ident'&&local[index+1]&&['(','[','{'].includes(local[index+1].text)))fail('function-local declarations/imports/macros require their original lexical trait resolution');
  }
  const targetName=target.kind==='bool'?'bool':target.rustPrimitiveName;
  if(parser.builtinShadow(targetName,consumer.path)||!same(parser.resolveSourceNamespace([targetName],consumer.path,'type'),[targetName]))fail('actual primitive target is shadowed or unresolved');
  for(const module of facts.modules.filter(module=>module.path.every((name,index)=>consumer.path[index]===name))){
    const inner=originalSourceModuleItems(module).filter(item=>item.tokens[0]?.text==='#'&&item.tokens[1]?.text==='!').flatMap(item=>significant(item.tokens));
    const outer=module.sourceView.declaration?significant(rustTokens(module.source.slice(module.sourceView.declaration.span.start,module.sourceView.bodySpan.start))):[];
    if([...inner,...outer].some((token,index,tokens)=>['no_implicit_prelude','no_core'].includes(token.text)&&tokens[index-1]?.text==='['))fail('disabled implicit/core prelude requires an explicit proven trait route');
  }
  const traits=[],conditionalNonTraitImports=[],anonymousOriginalTraits=originalAnonymousTraitScope(facts,consumer,parser);
  for(const binding of scope.bindings.filter(binding=>binding.namespace==='type')){
    if(binding.name==='From'||['std','core'].includes(binding.name))fail('trait or standard source namespace is shadowed/imported without this proof');
    if(binding.status!=='resolved'){
      const role=originalNonTraitImportRole(facts,consumer,binding);if(!role)fail('visible type/trait alias is ambiguous or unresolved: '+binding.name+' ('+binding.status+')');
      conditionalNonTraitImports.push({name:binding.name,role});continue;
    }
    if(binding.kind!=='trait')continue;
    const declaration=binding.declaration;if(!declaration||binding.target?.[0]!=='crate')fail('visible imported trait has no original source method proof');
    const owners=facts.modules.flatMap(module=>module.file===declaration.source?originalSourceModuleItems(module).filter(item=>item.term==='trait'&&item.start===declaration.span.start&&item.end===declaration.span.end).map(item=>({module,item})):[]);if(owners.length!==1)fail('visible trait declaration has no unique original owner');
    const {module,item}=owners[0],closure=originalLocalTraitClosure(facts,module,item);
    traits.push({name:binding.name,target:binding.target,source:module.file,sourceSha256:hash(module.source),originalSpan:{start:item.start,end:item.end},fromMemberAbsent:true,closure});
  }
  const body=target.kind==='bool'&&!target.rustReference&&!target.rustOwnership&&!target.patternOwnershipRefusal&&!target.rustGenericIdentityUnresolved&&!target.rustBorrowingUnresolved&&(target.rustPrimitiveName===undefined||target.rustPrimitiveName==='bool')?{target:{kind:'bool',rustPrimitiveName:'bool'},namespace:primitiveFromNamespace()}:pinnedPrimitiveBoolFrom(target),issued={schema:'original-private-primitive-bool-from-scope-v1',target:body.target,trait:body.namespace.trait,source:consumer.file,module:[...consumer.path],sourceSha256:hash(consumer.source),sourceViewDigest:consumer.sourceView.digest,originalSpan:{start:state.offset+start,end:state.offset+start},visibleOriginalTraits:traits,conditionalNonTraitImports,anonymousOriginalTraits,commonPreludeProfileSha256:PRIMITIVE_BOOL_FROM_PROFILE.manifestSha256,callerCargoEditionInferred:false,wholeTraitAuthority:false,runtimeParity:false},digest=metadataDigest(issued),proof=freeze({...issued,digest});scopeProofs.set(digest,proof);return proof;
}
// The source witness may be serialized/relocated with ordinary checked IR;
// identical fields must replay an actually issued private original source proof.
export function requirePrimitiveBoolFromScope(proof,target){let snapshot;try{snapshot=copyMetadata(proof);}catch{throw new TypeError('Boolean From caller has no issued original trait/primitive scope proof');}const original=snapshot&&scopeProofs.get(snapshot.digest);if(!original||metadataDigest(Object.fromEntries(Object.entries(snapshot).filter(([name])=>name!=='digest')))!==snapshot.digest||snapshot.digest!==original.digest||snapshot.target.kind!==target.kind||snapshot.target.rustPrimitiveName!==(target.kind==='bool'?'bool':target.rustPrimitiveName)||snapshot.target.bits!==target.bits||snapshot.target.signed!==target.signed)throw new TypeError('Boolean From caller has no issued original trait/primitive scope proof');return original;}
