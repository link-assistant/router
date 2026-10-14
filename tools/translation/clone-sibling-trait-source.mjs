// Complete private generated outputs are inspected, not executed. Every impl
// must resolve to an original non-Drop trait and the caller or a lexical helper.
import {createHash} from 'node:crypto';
import {deriveFootprintOriginalContext,deriveFootprintOriginalModule} from './derive-footprints.mjs';
import {inspectQuoteFragment} from './derive-quote-meta.mjs';
import {originalCloneSiblingTraitInputs,requireCloneSiblingTraitInputs} from './clone-sibling-trait-inputs.mjs';
import {proveSerdeSerializeBangFootprint,assertSerdeSerializeBangFootprint,originalSerdeSerializeOutput,emptySerdeMacro} from './serde-bang-footprints.mjs';
import {proveSerdeDeserializeBangFootprint,assertSerdeDeserializeBangFootprint,originalSerdeDeserializeOutputs} from './serde-deserialize-bang-footprints.mjs';
import {proveSchemarsBangFootprint,assertSchemarsBangFootprint,originalSchemarsOutput} from './schemars-bang-footprints.mjs';
import {assertSchemarsStringMacroNamespace,assertSchemarsDataMacroNamespace,originalSchemarsDataMacroExpansions} from './schemars-macro-inputs.mjs';
const issued=new WeakMap(),hash=value=>createHash('sha256').update(value).digest('hex'),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const fail=message=>{throw new TypeError('Original Clone sibling output: '+message);};
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const text=nodes=>nodes.map(node=>node.tag==='group'?node.delimiter+text(node.nodes)+({'(':')','[':']','{':'}'}[node.delimiter]):node.text).join('');
function skipAttributes(nodes,start){while(nodes[start]?.text==='#'&&nodes[start+1]?.tag==='group'&&nodes[start+1].delimiter==='[')start+=2;return start;}
function lifetimeParameters(nodes){if(!nodes.length)return [];const written=text(nodes);if(!/^<'[A-Za-z_][A-Za-z_0-9]*(?:,'[A-Za-z_][A-Za-z_0-9]*)*>$/.test(written))fail('implementation/helper generics are not complete lifetime-only parameters');const names=written.slice(1,-1).split(',');if(new Set(names).size!==names.length)fail('duplicate lifetime parameter');return names;}
function genericEnd(nodes,start){if(nodes[start]?.text!=='<')return start;const end=nodes.findIndex((node,index)=>index>start&&node.text==='>');if(end<0)fail('unclosed original lifetime parameters');return end+1;}
function inspectOutput(output,{owner,feature,name,traits,proof}){
 const observation=inspectQuoteFragment(output),nodes=output.syntax,start=skipAttributes(nodes,0),body=nodes[start+5];
 if(nodes[start]?.text!=='const'||nodes[start+1]?.text!=='_'||nodes[start+2]?.text!==':'||nodes[start+3]?.tag!=='group'||nodes[start+3].delimiter!=='('||nodes[start+3].nodes.length||nodes[start+4]?.text!=='='||body?.tag!=='group'||body.delimiter!=='{'||nodes[start+6]?.text!==';'||start+7!==nodes.length)fail('output is not the complete original anonymous unit const');
 if(observation.definitions.length||observation.macroExports.length)fail('generated definition/export remains unresolved');
 const headers=[],declarations=[];let rootImpls=0,aliases=0;
 function visit(scope,path=[],ancestors=[],depth=0){
  if(depth>64)fail('output lexical nesting exceeds bound');const locals=new Map();
  for(let at=0;at<scope.length;at++)if(['struct','enum'].includes(scope[at].text)){
   const nameNode=scope[at+1],end=genericEnd(scope,at+2),lifetimes=lifetimeParameters(scope.slice(at+2,end));if(nameNode?.tokenType!=='ident'||locals.has(nameNode.text))fail('local generated type declaration is ambiguous');
   const declaration={name:nameNode.text,kind:scope[at].text,lifetimes,path:[...path,at],nameSpan:nameNode.span??null};locals.set(nameNode.text,declaration);declarations.push(declaration);
  }
  for(let at=0;at<scope.length;at++){
   const node=scope[at];if(['macro_rules','macro','mod','union'].includes(node.text))fail('generated item/export-producing syntax remains unresolved');
   if(['extern','use'].includes(node.text)){
    const written=text(scope.slice(at,scope.findIndex((part,index)=>index>at&&part.text===';')+1));
    if(owner==='schemars::JsonSchema'||path.length!==1||written!=='externcrateserdeas_serde;'||name==='_serde'||++aliases!==1)fail('generated namespace alias is not the original sealed Serde wrapper');
   }
   if(node.text==='impl'){
    const end=scope.findIndex((part,index)=>index>at&&part.tag==='group'&&part.delimiter==='{');if(end<0)fail('implementation body absent');const header=scope.slice(at+1,end),generic=genericEnd(header,0),lifetimes=lifetimeParameters(header.slice(0,generic)),forAt=header.findIndex((part,index)=>index>=generic&&part.text==='for');if(forAt<0||header.slice(0,forAt).some(part=>['unsafe','!','default','where'].includes(part.text)))fail('inherent/negative/unsafe/conditional implementation remains unresolved');
    const traitSyntax=text(header.slice(generic,forAt)),base=traitSyntax.replace(/<'[A-Za-z_][A-Za-z_0-9]*(?:,'[A-Za-z_][A-Za-z_0-9]*)*>$/,''),identity=base.startsWith('_serde::')?'serde::'+base.slice(8):base,trait=traits[identity];const traitLifetimes=lifetimeParameters(header.slice(generic+base.split('::').length*2-1,forAt));if(!trait||!same(traitLifetimes,['serde::Deserialize','serde::de::Visitor'].includes(identity)?["'de"]:[])||traitLifetimes.some(lifetime=>!lifetimes.includes(lifetime)))fail('implementation trait/lifetime identity is not source-proven: '+traitSyntax);
    if(owner==='schemars::JsonSchema'&&identity!==owner||owner==='serde::Serialize'&&identity!==owner||owner==='serde::Deserialize'&&!['serde::Deserialize','serde::de::Visitor'].includes(identity))fail('trait is foreign to the selected original callback');
    const target=text(header.slice(forAt+1)),match=/^([A-Za-z_][A-Za-z_0-9]*)(<'[A-Za-z_][A-Za-z_0-9]*(?:,'[A-Za-z_][A-Za-z_0-9]*)*>)?$/.exec(target);if(!match)fail('implementation target is not a bounded original nominal path');let declaration=null;
    for(const group of [locals,...ancestors])if(group.has(match[1])){declaration=group.get(match[1]);break;}
    if(declaration){if(!same(declaration.lifetimes,match[2]?match[2].slice(1,-1).split(','):[])||declaration.lifetimes.some(lifetime=>!lifetimes.includes(lifetime)))fail('local target lifetime/lexical declaration differs');}
    else if(match[1]!==name||match[2]||path.length!==1)fail('implementation has an unknown or misplaced nominal target: '+target);
    else rootImpls++;
    headers.push({path:[...path,at],header:text(scope.slice(at,end)),traitIdentity:identity,traitSource:trait,target,localDeclaration:declaration,relation:declaration?'actual lexical helper non-Drop trait':'actual original caller non-Drop trait'});
   }
   if(node.tag==='group')visit(node.nodes,[...path,at],[locals,...ancestors],depth+1);
  }
 }
 visit(body.nodes,[start+5]);if(aliases!==(owner.startsWith('serde::')?1:0))fail('exact original wrapper alias is absent/ambiguous');if(rootImpls!==1)fail('original caller implementation is absent/ambiguous');
 if(owner.startsWith('serde::')){const fixed=emptySerdeMacro(deriveFootprintOriginalContext(proof.context,proof.certificate).dependencies);if(!same(fixed,proof.outputProof.fixedMacro)||observation.bangCalls.length!==1||observation.bangCalls[0].writtenPath.join('::')!=='_serde::__require_serde_not_serde_core')fail('whole original Serde empty macro closure changed');}
 return {feature,outputGrammarDigest:observation.fragmentSha256,outputSyntaxSha256:output.provenance.syntaxSha256,headers,declarations,completeAnonymousConst:true};
}
function macroClosure(outputProof,dependencies){
 const rows=[];for(const row of outputProof.macros){
  if(row.data){assertSchemarsDataMacroNamespace(row.proof,{dependencies,source:row.source});const expansions=originalSchemarsDataMacroExpansions(row.proof,{dependencies,source:row.source});if(expansions.length!==row.proof.calls.length)fail('full data macro recursion is not exhaustively retained');
   const scan=nodes=>{for(const node of nodes){if(['impl','macro','macro_rules'].includes(node.text))fail('data macro output has an implementation/definition obligation');if(node.kind==='opaque')fail('opaque data macro output requires an independent complete inspection');if(node.kind==='group')scan(node.children);}};
   for(const expansion of expansions)scan(expansion.trees);rows.push({path:row.path,source:row.source,proof:row.proof,expansions:expansions.map(expansion=>({digest:expansion.digest,rule:expansion.rule,definitionDigest:expansion.definitionDigest}))});
  }else{assertSchemarsStringMacroNamespace(row.proof,{dependencies,source:row.source});if(row.proof.sourcePlan.outputKind!=='ExprKind::Lit(token::Str)'||row.proof.outputAttributes.length)fail('source-selected literal AST macro sink differs');rows.push(row);}
 }return rows;
}
export function proveCloneSiblingTraitOutput({context,certificate,module,item,owner}={}){
 const original=deriveFootprintOriginalContext(context,certificate),canonical=deriveFootprintOriginalModule(context,certificate),dependencies=original.dependencies,inputs=originalCloneSiblingTraitInputs(dependencies);requireCloneSiblingTraitInputs(inputs,dependencies);
 if(!module||module.source!==canonical.source||module.sourceView!==canonical.sourceView||!same(module.path,canonical.path)||module.file!==canonical.file||!item||item.name!==certificate.name||item.term!==certificate.kind||item.start!==certificate.span.start||item.end!==certificate.span.end||certificate.owners.filter(row=>row.target.join('::')===owner).length!==1)fail('requires exact original caller, span and locked invocation owner');
 let outputProof,outputs;
 if(owner==='serde::Serialize'){outputProof=proveSerdeSerializeBangFootprint({context,certificate});assertSerdeSerializeBangFootprint(outputProof,context,certificate);outputs=[{feature:'selected',output:originalSerdeSerializeOutput(outputProof,context,certificate,module,item)}];}
 else if(owner==='serde::Deserialize'){outputProof=proveSerdeDeserializeBangFootprint({context,certificate});assertSerdeDeserializeBangFootprint(outputProof,context,certificate);outputs=originalSerdeDeserializeOutputs(outputProof,context,certificate,module,item);if(!same(outputs.map(row=>row.feature),['disabled','enabled']))fail('both actual Deserialize feature branches are required');}
 else if(owner==='schemars::JsonSchema'){outputProof=proveSchemarsBangFootprint({context,certificate});assertSchemarsBangFootprint(outputProof,context,certificate);outputs=[{feature:'selected',output:originalSchemarsOutput(outputProof,context,certificate,module,item)}];}
 else fail('trait owner is not covered by complete original output/source declarations');
 const routes=outputs.map(row=>inspectOutput(row.output,{owner,feature:row.feature,name:item.name,traits:inputs.traits,proof:{context,certificate,outputProof}})),macros=owner==='schemars::JsonSchema'?macroClosure(outputProof,dependencies):[],evidence={schema:'original-clone-sibling-trait-output-v1',owner,source:certificate.source,sourceSha256:certificate.sourceSha256,span:certificate.span,itemSha256:certificate.itemSha256,certificateDigest:certificate.digest,inputs,outputProof,routes,macros,traitBehavior:false,noDropAuthority:false,copyAuthority:false,namespaceAuthority:false},value=freeze({...evidence,digest:hash(JSON.stringify(evidence))});
 issued.set(value,{context,certificate,module:canonical,item,owner,outputs,outputProof,inputs,dependencies});return value;
}
export function requireCloneSiblingTraitOutput(value,context,certificate,module,item){const state=issued.get(value);if(!state||state.context!==context||state.certificate!==certificate||state.module.source!==module.source||state.module.sourceView!==module.sourceView||state.module.file!==module.file||!same(state.module.path,module.path)||state.item.name!==item.name||state.item.term!==item.term||state.item.start!==item.start||state.item.end!==item.end)fail('copied, foreign or rebound sibling output proof');requireCloneSiblingTraitInputs(state.inputs,state.dependencies);for(const row of state.outputs)inspectQuoteFragment(row.output);deriveFootprintOriginalContext(context,certificate);return value;}
