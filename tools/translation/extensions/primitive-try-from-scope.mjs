// Actual caller trait lookup. Source body selections never imply a visible
// prelude, an unshadowed primitive or absence of competing trait members.
import {createHash} from 'node:crypto';
import {itemConfiguration} from '../cfg-profile.mjs';
import {originalCargoEditionEvidence} from '../cargo-edition-context.mjs';
import {originalUseDeclarationLeaves} from '../module-bindings.mjs';
import {sourceItems,rustTokens} from '../rust-structure.mjs';
import {originalSourceModuleItems} from '../source-module-views.mjs';
import {matchesParserFacts} from '../matches-macro-context.mjs';
import {originalNestedImplementationObligations} from '../nested-implementation-obligations.mjs';
import {requireOriginalFromNamespaceCallbacks} from './host-contracts.mjs';
import {originalNonTraitImportRole} from './primitive-import-roles.mjs';
import {originalCoreTraitClosure,originalLocalTraitClosure} from './primitive-trait-closure.mjs';
import {primitiveTryFromNamespace,primitiveTryFromOriginalSource} from './primitive-try-from-source.mjs';
import {metadataDigest,copyMetadata} from './source-links.mjs';
const issued=new Map(),hash=value=>createHash('sha256').update(value).digest('hex');
const same=(a,b)=>a.length===b.length&&a.every((value,index)=>value===b[index]);
const significant=tokens=>tokens.filter(token=>token.type!=='comment');
const fail=message=>{throw new TypeError('Original primitive TryFrom caller: '+message);};
function excludesTryFrom(closure){
 if(!closure||typeof closure!=='object'||!Array.isArray(closure.originalMemberNames))fail('alternative trait has no complete source member closure');
 if(closure.originalMemberNames.some(member=>['fn','const'].includes(member.kind)&&member.name==='try_from'))fail('alternative visible trait declares try_from');
 for(const parent of closure.supertraits??[])excludesTryFrom(parent.closure);
}
function standardTrait(path){
 if(!['std','core'].includes(path[0])||path.length<3)fail('anonymous external trait has no original owner route');
 let reexport=null;
 if(path[0]==='std'){
  const input=primitiveTryFromOriginalSource('library/std/src/lib.rs'),candidates=[];
  for(const item of sourceItems(input.source).filter(item=>item.term==='use')){
   for(const leaf of originalUseDeclarationLeaves(item))if(!leaf.glob&&leaf.name===path[1]&&same(leaf.segments,['core',path[1]])){
    const tokens=significant(item.tokens),pub=tokens.findIndex(token=>token.text==='pub');
    if(pub<0||tokens.slice(0,pub).some(token=>['cfg','cfg_attr'].includes(token.text)))fail('standard trait reexport has an unresolved compilation condition');
    candidates.push({source:input.path,sourceSha256:input.sha256,span:{start:item.start,end:item.end},original:input.source.slice(item.start,item.end)});
   }
  }
  if(candidates.length!==1)fail('standard trait requires a unique original core reexport');reexport=candidates[0];
 }
 const declaration=originalCoreTraitClosure(['core',...path.slice(1)]);excludesTryFrom(declaration);return {path,reexport,declaration};
}
function originalLocalTrait(facts,target){
 if(target?.[0]!=='crate')fail('local trait target has no complete original crate route');
 const module=facts.modules.find(module=>same(module.path,target.slice(1,-1))),items=module&&originalSourceModuleItems(module).filter(item=>item.term==='trait'&&item.name===target.at(-1));
 if(items?.length!==1)fail('local trait declaration is absent or ambiguous');
 const declaration=originalLocalTraitClosure(facts,module,items[0]);excludesTryFrom(declaration);return declaration;
}
export function capturePrimitiveTryFromScope(parser,target,start){
 requireOriginalFromNamespaceCallbacks(parser);
 const state=matchesParserFacts(parser),facts=state.facts,consumer=state.module,ancestors=facts.evidence.scopes.filter(scope=>scope.path.every((part,index)=>consumer.path[index]===part)),scope=ancestors.find(scope=>scope.file===consumer.file&&same(scope.path,consumer.path));
 if(!scope||ancestors.some(scope=>scope.configurationCondition!=='active'||scope.unresolvedTypeScope!==false||scope.unresolvedAttributeMacroScope!==false))fail('active original ancestor type/attribute scopes are unproved');
 const edition=originalCargoEditionEvidence(facts.cargoEditionContext);
 if(edition?.status!=='explicit-package-edition'||!['2021','2024'].includes(edition.edition))fail('TryFrom prelude requires the actual original Cargo2021/2024 edition');
 if(!Number.isSafeInteger(start)||start<0||start>=state.sourceLength||!state.tokens.some(token=>token.start===start&&token.kind==='identifier'))fail('call point escapes its actual original source');
 const name=target?.rustPrimitiveName;if(!/^[iu](8|16|32|64|128)$/u.test(name)||parser.builtinShadow(name,consumer.path)||!same(parser.resolveSourceNamespace([name],consumer.path,'type'),[name]))fail('actual fixed primitive target is shadowed or unresolved');
 for(const owner of facts.modules.filter(module=>module.path.every((part,index)=>consumer.path[index]===part))){
  const inner=originalSourceModuleItems(owner).filter(item=>item.tokens[0]?.text==='#'&&item.tokens[1]?.text==='!').flatMap(item=>significant(item.tokens)),outer=owner.sourceView.declaration?significant(rustTokens(owner.source.slice(owner.sourceView.declaration.span.start,owner.sourceView.bodySpan.start))):[];
  if([...inner,...outer].some((token,index,tokens)=>['no_core','no_implicit_prelude'].includes(token.text)&&tokens[index-1]?.text==='['))fail('original implicit prelude is disabled');
 }
 const point=state.offset+start,enclosing=originalSourceModuleItems(consumer).filter(item=>item.start<=point&&item.end>point);
 for(const item of enclosing){const tokens=significant(item.tokens),open=tokens.findIndex(token=>token.text==='{'),body=tokens.slice(open+1);if(open>=0&&body.some((token,index)=>['use','extern','trait','impl','type','mod','macro','macro_rules!'].includes(token.text)||token.text.length>1&&token.text.endsWith('!')||token.text==='!'&&body[index-1]?.type==='ident'&&['(','[','{'].includes(body[index+1]?.text)))fail('original function-local owner declarations or macros require separate lexical resolution');}
 const writtenImplementations=[];
 for(const module of facts.modules){
  if(originalNestedImplementationObligations(module).length)fail('nested implementation coherence remains unproved');
  for(const item of originalSourceModuleItems(module).filter(item=>item.term==='impl')){
   const tokens=significant(item.tokens),open=tokens.findIndex(token=>token.text==='{'),header=tokens.slice(0,open);
   if(header.some(token=>token.text==='TryFrom'))fail('written TryFrom implementation overlap needs separate original trait/target resolution');
  }
 }
 const visibleTraits=[],nonTraitImports=[];
 for(const binding of scope.bindings.filter(binding=>binding.namespace==='type')){
  if(['TryFrom','std','core'].includes(binding.name))fail('trait or standard owner is shadowed/imported without this route');
  if(binding.status!=='resolved'){const role=originalNonTraitImportRole(facts,consumer,binding);if(!role)fail('visible original type/trait binding is unresolved: '+binding.name);nonTraitImports.push({name:binding.name,role});continue;}
  if(binding.kind==='trait')visibleTraits.push({name:binding.name,target:binding.target,declaration:originalLocalTrait(facts,binding.target)});
 }
 const anonymousTraits=[];
 for(const item of originalSourceModuleItems(consumer).filter(item=>item.term==='use')){
  const condition=itemConfiguration(item.tokens,facts.evidence.compilationProfile);if(condition.status==='inactive')continue;
  for(const leaf of originalUseDeclarationLeaves(item,consumer.path).filter(leaf=>leaf.name==='_')){
   if(condition.status!=='active')fail('anonymous original trait import has unknown cfg');
   let declaration;
   if(['std','core'].includes(leaf.segments[0]))declaration=standardTrait(leaf.segments);
   else if(leaf.segments[0]==='crate')declaration={declaration:originalLocalTrait(facts,leaf.segments)};
   else fail('anonymous trait alias route is unproved');
   anonymousTraits.push({originalImport:{source:consumer.file,sourceSha256:hash(consumer.source),span:{start:item.start,end:item.end},segments:leaf.segments},...declaration});
  }
 }
 const namespace=primitiveTryFromNamespace(),evidence={schema:'original-private-fixed-try-from-scope-v1',source:consumer.file,module:[...consumer.path],sourceSha256:hash(consumer.source),sourceViewDigest:consumer.sourceView.digest,originalSpan:{start:point,end:point},target,edition,trait:namespace.trait,preludeRoutes:namespace.preludeRoutes.filter(row=>row.edition===edition.edition),visibleTraits,anonymousTraits,nonTraitImports,writtenImplementations,wholeTraitAuthority:false,constTraitCall:false,runtimeParity:false},proof={...evidence,digest:metadataDigest(evidence)};issued.set(proof.digest,copyMetadata(proof));return proof;
}
export function requirePrimitiveTryFromScope(proof,target){const snapshot=copyMetadata(proof),original=snapshot&&issued.get(snapshot.digest);if(!original||metadataDigest(snapshot)!==metadataDigest(original)||metadataDigest(target)!==metadataDigest(original.target))fail('copied, changed or unissued original caller witness');return original;}
