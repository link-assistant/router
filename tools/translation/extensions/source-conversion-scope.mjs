// Genuine original caller namespace closure, independent of source body pins.
import {createHash} from 'node:crypto';
import {rustTokens,sourceItems} from '../rust-structure.mjs';
import {originalSourceModuleItems} from '../source-module-views.mjs';
import {matchesParserFacts} from '../matches-macro-context.mjs';
import {requireOriginalFromNamespaceCallbacks} from './host-contracts.mjs';
import {metadataDigest,copyMetadata} from './source-links.mjs';
import {originalNonTraitImportRole} from './primitive-import-roles.mjs';
import {originalAnonymousTraitScope} from './primitive-anonymous-traits.mjs';
import {originalLocalTraitClosure} from './primitive-trait-closure.mjs';
import {originalConversionPlan} from './source-conversion-inputs.mjs';
const hash=data=>createHash('sha256').update(data).digest('hex'),same=(a,b)=>a.length===b.length&&a.every((x,i)=>x===b[i]),issued=new Map();
const significant=tokens=>tokens.filter(token=>token.type!=='comment');
const fail=message=>{throw new TypeError('Source conversion caller: '+message);};
function noInto(closure){if(!closure||typeof closure!=='object')return;const members=closure.originalMemberNames??[];if(members.some(member=>['fn','const'].includes(member.kind)&&member.name==='into'))fail('alternative visible trait declares an into value member');for(const parent of closure.supertraits??[])noInto(parent.closure);}
export function captureSourceConversionScope(parser,start){
  requireOriginalFromNamespaceCallbacks(parser);
  const state=matchesParserFacts(parser),facts=state.facts,consumer=state.module,ancestors=facts.evidence.scopes.filter(parent=>parent.path.every((name,i)=>consumer.path[i]===name)),scope=ancestors.find(parent=>parent.file===consumer.file&&same(parent.path,consumer.path));
  if(!scope||ancestors.some(parent=>parent.configurationCondition!=='active'||parent.unresolvedTypeScope!==false||parent.unresolvedAttributeMacroScope!==false))fail('active original type/attribute scopes are unproved');
  if(!Number.isSafeInteger(start)||start<0||start>=state.sourceLength||!state.tokens.some(token=>token.start===start&&token.kind==='identifier'))fail('call point is outside original source tokens');
  const targetBindings=Object.fromEntries(['String','bool',...'iu'.split('').flatMap(prefix=>[8,16,32,64,128].map(bits=>prefix+bits))].map(name=>[name,{unshadowed:!parser.builtinShadow(name,consumer.path)&&same(parser.resolveSourceNamespace([name],consumer.path,'type'),[name])}]));
  const point=state.offset+start,containing=originalSourceModuleItems(consumer).filter(item=>item.start<=point&&item.end>point).flatMap(item=>{
    if(item.term!=='impl')return [item];const tokens=significant(item.tokens),open=tokens.findIndex(token=>token.text==='{');if(open<0)return [item];const offset=tokens[open].end;
    return sourceItems(consumer.source.slice(offset,tokens.at(-1).start)).filter(member=>member.start+offset<=point&&member.end+offset>point);
  });
  for(const item of containing){const tokens=significant(item.tokens),open=tokens.findIndex(token=>token.text==='{'),local=tokens.slice(open+1);if(open>=0&&local.some((token,i)=>['use','extern','trait','impl','type','mod','macro','macro_rules!'].includes(token.text)||token.text.length>1&&token.text.endsWith('!')||token.text==='!'&&local[i-1]?.type==='ident'&&['(','[','{'].includes(local[i+1]?.text)))fail('function-local declarations/imports/macros require original lexical trait resolution');}
  for(const module of facts.modules.filter(module=>module.path.every((name,i)=>consumer.path[i]===name))){const inner=originalSourceModuleItems(module).filter(item=>item.tokens[1]?.text==='!').flatMap(item=>significant(item.tokens)),outer=module.sourceView.declaration?significant(rustTokens(module.source.slice(module.sourceView.declaration.span.start,module.sourceView.bodySpan.start))):[];if([...inner,...outer].some((token,i,tokens)=>['no_implicit_prelude','no_core'].includes(token.text)&&tokens[i-1]?.text==='['))fail('disabled original common prelude');}
  const visibleTraits=[],conditionalNonTraitImports=[],anonymousTraits=originalAnonymousTraitScope(facts,consumer);
  const nonoverlappingOriginalImpls=[];
  // An explicit generic/standard conversion impl must not be silently replaced
  // by the selected standard body, even when Rust would reject its coherence.
  for(const module of facts.modules)for(const item of originalSourceModuleItems(module).filter(item=>item.term==='impl')){
    const tokens=significant(item.tokens),implAt=tokens.findIndex(token=>token.text==='impl'),open=tokens.findIndex((token,i)=>i>implAt&&token.text==='{'),header=tokens.slice(implAt,open),forAt=header.findIndex(token=>token.text==='for');
    if(forAt<0||!header.slice(0,forAt).some(token=>['From','Into'].includes(token.text)))continue;
    const target=header.slice(forAt+1),name=target[0]?.text,own=originalSourceModuleItems(module).filter(declaration=>['struct','enum'].includes(declaration.term)&&declaration.name===name);
    if(target.length!==1||own.length!==1||['String','str','bool','std','core','alloc'].includes(name)||/^[iu](8|16|32|64|128)$/u.test(name))fail('explicit conversion impl may overlap the selected standard source route');
    nonoverlappingOriginalImpls.push({source:module.file,sourceSha256:hash(module.source),originalSpan:{start:item.start,end:item.end},originalHeader:header.map(token=>token.text),targetOriginalSpan:{start:own[0].start,end:own[0].end},selectedStandardTarget:false});
  }
  for(const proof of anonymousTraits)noInto(proof.declaration);
  for(const binding of scope.bindings.filter(row=>row.namespace==='type')){
    if(['From','Into','String','std','core','alloc'].includes(binding.name))fail('conversion trait or standard namespace is shadowed/imported without this route');
    if(binding.status!=='resolved'){const role=originalNonTraitImportRole(facts,consumer,binding);if(!role)fail('visible type/trait alias is ambiguous or unresolved: '+binding.name+' ('+binding.status+')');conditionalNonTraitImports.push({name:binding.name,role});continue;}
    if(binding.kind!=='trait')continue;
    const declaration=binding.declaration;if(!declaration||binding.target?.[0]!=='crate')fail('visible imported trait has no original member proof');
    const candidates=facts.modules.flatMap(module=>module.file===declaration.source?originalSourceModuleItems(module).filter(item=>item.term==='trait'&&item.start===declaration.span.start&&item.end===declaration.span.end).map(item=>({module,item})):[]);if(candidates.length!==1)fail('visible trait lacks a unique original declaration');
    const {module,item}=candidates[0],closure=originalLocalTraitClosure(facts,module,item);noInto(closure);visibleTraits.push({name:binding.name,target:binding.target,source:module.file,sourceSha256:hash(module.source),span:{start:item.start,end:item.end},closure});
  }
  const plan=originalConversionPlan(),proof={schema:'original-private-source-conversion-caller-v1',source:consumer.file,module:[...consumer.path],sourceSha256:hash(consumer.source),sourceViewDigest:consumer.sourceView.digest,originalSpan:{start:state.offset+start,end:state.offset+start},visibleTraits,anonymousTraits,conditionalNonTraitImports,nonoverlappingOriginalImpls,profileSha256:plan.profileSha256,traits:plan.traits,namespace:plan.namespace,targetBindings,wholeTraitAuthority:false,runtimeParity:false},digest=metadataDigest(proof),result={...proof,digest};issued.set(digest,copyMetadata(result));return result;
}
export function requireSourceConversionScope(proof){const snapshot=copyMetadata(proof),original=snapshot&&issued.get(snapshot.digest);if(!original||metadataDigest(snapshot)!==metadataDigest(original))fail('unissued, changed or forged original caller proof');return original;}
