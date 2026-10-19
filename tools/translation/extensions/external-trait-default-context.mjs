// One source-bound predicate refinement, never caller or prelude authority.
// Language sequence: genuine parser -> original Cargo defaults -> exact source
// attribute -> old unknown / std-only false. Repository sequence is empty.
import {matchesParserFacts,originalMatchesDependencyProof} from '../matches-macro-context.mjs';
import {captureOriginalExternalTraitPackage,originalExternalTraitPackageInputs} from './external-trait-sources.mjs';
import {registerOriginalExternalDefaultProfile,captureOriginalExternalDependencyDefaults,originalExternalDependencyDefaultsFacts,observeOriginalExternalDefaultConditions} from '../external-dependency-defaults.mjs';
import {assertPrivateOriginalCargoTomlExecution} from '../private-cargo-toml.mjs';
import {throwOriginalCapturedTypeError} from '../original-json-intrinsics.mjs';
import {sourceItems} from '../rust-structure.mjs';
import {itemConfiguration,compilationProfile,evaluateConfiguration,isAbsentConditionalAttribute} from '../cfg-profile.mjs';
import {inspectConditionalAttribute} from '../conditional-attributes.mjs';
import {copyMetadata} from './source-links.mjs';

// Deliberately no import-time captures, weak allocation, source/JSON/hash work.
let contexts=null;
const fail=message=>throwOriginalCapturedTypeError('Original external default namespace: '+message);
const samePath=(left,right)=>Array.isArray(right)&&left.length===right.length&&left.every((part,index)=>part===right[index]);
function guarded(){assertPrivateOriginalCargoTomlExecution();contexts??=new WeakMap();}
function frame(parser){const state=matchesParserFacts(parser),dependencies=originalMatchesDependencyProof(state.facts);return {state,dependencies};}
function exactFrame(prior){
 const now=frame(prior.parser);
 if(now.state!==prior.state||now.dependencies!==prior.dependencies||now.state.facts!==prior.facts||now.state.module!==prior.module)fail('original parser context changed');
 return now;
}
function projection(state){
 exactFrame(state);
 const facts=originalExternalDependencyDefaultsFacts(state.defaults,state.options),observed=observeOriginalExternalDefaultConditions(state.defaults,state.options,{path:state.originals.crateRoot});
 if(!facts.positiveFeatures.includes('std')||observed.source!==state.root)fail('genuine std fact or complete original root differs');
 const profile=compilationProfile({values:{feature:['std']}}),matches=[];
 for(const item of sourceItems(state.root.source)){
  const tokens=item.tokens.filter(token=>token.type!=='comment');
  if(tokens[0]?.text!=='#'||tokens[1]?.text!=='!'||tokens[2]?.text!=='['||tokens.at(-1)?.text!==']'||tokens[3]?.text!=='cfg_attr')continue;
  const input=inspectConditionalAttribute(tokens.slice(3,-1));
  if(input.attributes.length!==1||input.attributes[0].tokens.length!==1||input.attributes[0].tokens[0]!=='no_std')continue;
  const rows=observed.conditions.filter(row=>row.kind==='cfg_attr'&&row.attributeSpan.start===item.start&&row.attributeSpan.end===item.end);
  if(rows.length!==1)fail('exact original attribute observation absent');
  const observation=rows[0],predicate=input.predicate.map(({text,type,start,end})=>({text,type,start,end}));
  if(observation.tokens.length!==predicate.length||predicate.some((token,index)=>['text','type','start','end'].some(key=>observation.tokens[index][key]!==token[key]))||observation.span.start!==input.predicate[0].start||observation.span.end!==input.predicate.at(-1).end||observation.original!==state.root.source.slice(observation.span.start,observation.span.end))fail('predicate token/span source join differs');
  const before=evaluateConfiguration(input.predicate,null),after=evaluateConfiguration(input.predicate,profile);
  if(before.value!==null||before.diagnostics.length||after.value!==false||after.diagnostics.length)continue;
  const condition=itemConfiguration(item.tokens,profile);
  if(condition.status!=='active'||condition.diagnostics.length||condition.attributes.length!==1||!isAbsentConditionalAttribute(condition.attributes[0])||condition.attributes[0].span.start!==item.start||condition.attributes[0].span.end!==item.end)fail('one exact absent original conditional attribute required');
  matches.push({pin:state.root,item:copyMetadata(item),condition,before,after,observation,payload:copyMetadata(input.attributes),original:state.root.source.slice(item.start,item.end)});
 }
 if(matches.length!==1)fail('one complete unknown-to-false original no_std predicate required');
 exactFrame(state);assertPrivateOriginalCargoTomlExecution();
 const refinement=matches[0],evidence={schema:'source-bound-external-default-namespace-v1',source:state.root,features:['std'],refinement:{item:refinement.item,original:refinement.original,before:refinement.before,after:refinement.after,observation:refinement.observation,payload:refinement.payload},project:{file:facts.project.file,path:facts.project.path,sourceViewDigest:facts.project.sourceViewDigest,compilationProfile:facts.project.compilationProfile},dependency:facts.dependency,packageManifest:facts.packageManifest,packageSourceDomainSha256:facts.packageSourceDomainSha256,parserExecution:facts.parserExecution,attributeOwnerResolved:false,stdPreludeAuthority:false,namespaceAuthority:false,runtimeAuthority:false};
 // Full Cargo/lock/caller bytes remain in the privately reissued record and
 // complete test vectors. The IR need not repeat those large inputs per call.
 return {source:state.root,features:['std'],refinement,defaults:facts,observed,evidence,attributeOwnerResolved:false,stdPreludeAuthority:false,namespaceAuthority:false,runtimeAuthority:false};
}
export function captureOriginalExternalTraitDefaultContext(parser,path){
 guarded();const {state,dependencies}=frame(parser),selected=copyMetadata(path);
 if(!Array.isArray(selected)||selected.length<2||selected.some(part=>typeof part!=='string'))fail('complete actual external trait path required');
 const packageToken=captureOriginalExternalTraitPackage(dependencies,selected[0]),originals=originalExternalTraitPackageInputs(packageToken),roots=originals.sources.filter(row=>row.path===originals.crateRoot);
 if(roots.length!==1)fail('one complete original package root required');
 const module=state.module,options={module:{source:module.source,file:module.file,path:[...module.path],sourceView:module.sourceView,compilationProfile:state.facts.compilationProfile},dependencies,packageToken};
 const registered=registerOriginalExternalDefaultProfile(options),defaults=captureOriginalExternalDependencyDefaults(registered,options),record={parser,state,facts:state.facts,module,dependencies,path:selected,packageToken,originals,root:roots[0],options,registered,defaults};
 projection(record);exactFrame(record);guarded();
 const token=Object.freeze({schema:'private-source-bound-external-default-namespace-v1'});contexts.set(token,record);return token;
}
export function requireOriginalExternalTraitDefaultContext(token,dependencies,path){
 guarded();const state=contexts.get(token);
 if(!state||state.dependencies!==dependencies||!samePath(state.path,copyMetadata(path)))fail('copied foreign or changed original default context');
 return projection(state);
}
