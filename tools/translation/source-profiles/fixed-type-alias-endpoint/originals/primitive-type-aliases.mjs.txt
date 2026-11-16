// Expand only monomorphic primitive aliases in the private original module
// context. A shadowed name keeps the width of its actual written RHS.
import {matchesParserFacts} from '../matches-macro-context.mjs';
import {originalSourceModuleItems} from '../source-module-views.mjs';
import {rustFixedType} from '../checked-types.mjs';
import {metadataDigest} from './source-links.mjs';
import {requireOriginalFromNamespaceCallbacks} from './host-contracts.mjs';
import {unsupported} from '../vendor/meta-language/translation/diagnostics.js';
export function sourcePrimitiveAlias(parser,segments,span){
  requireOriginalFromNamespaceCallbacks(parser);
  let state;try{state=matchesParserFacts(parser);}catch(error){if(error instanceof TypeError)return null;throw error;}
  const scopes=state.facts.evidence.scopes;
  const target=parser.resolveSourceNamespace(segments,state.module.path,'type');
  if(target[0]!=='crate')return null;
  const aliases=[],seen=new Set();
  const resolve=(route,depth=0)=>{
    if(depth>=32)throw unsupported('primitive type alias','original alias chain exceeds its bound',span);
    const path=route.slice(1,-1),name=route.at(-1),scope=scopes.find(scope=>JSON.stringify(scope.path)===JSON.stringify(path));
    const binding=scope?.bindings.find(binding=>binding.namespace==='type'&&binding.name===name);
    if(!binding)return null;
    if(binding.kind!=='type'||binding.status!=='resolved'||scope.unresolvedTypeScope!==false||scope.configurationCondition!=='active')return null;
    const key=route.join('::');if(seen.has(key))throw unsupported('primitive type alias','cyclic original alias',span);seen.add(key);
    const module=state.facts.modules.find(module=>module.file===scope.file&&JSON.stringify(module.path)===JSON.stringify(path));
    const item=module&&originalSourceModuleItems(module).find(item=>item.term==='type'&&item.name===name&&item.start===binding.span?.start&&item.end===binding.span?.end);
    if(!item)return null;
    const tokens=item.tokens.filter(token=>token.type!=='comment'),at=tokens.findIndex(token=>token.text==='type');
    if(at<0||!['type','pub'].includes(tokens[0]?.text)||tokens[at+1]?.text!==name||tokens[at+2]?.text!=='='||tokens.at(-1)?.text!==';')return null;
    const rhs=tokens.slice(at+3,-1);if(!rhs.length||rhs.some((token,index)=>index%2===0?token.type!=='ident':token.text!=='::'))return null;
    const names=rhs.filter((_,index)=>index%2===0).map(token=>token.text);
    aliases.push({source:module.file,sourceSha256:module.sourceView.sourceSha256,originalSpan:{start:item.start,end:item.end},name,originalRhs:names});
    if(names.length===1){
      const masked=scope.bindings.find(binding=>binding.namespace==='type'&&binding.name===names[0]);
      if(masked)return masked.target?resolve(masked.target,depth+1):null;
      const primitive=rustFixedType(names[0]);if(primitive&&/^([iu])(8|16|32|64|128)$/u.test(names[0]))return {...primitive,rustPrimitiveName:names[0]};
      if(names[0]==='bool')return {kind:'bool',rustPrimitiveName:'bool'};
      return null;
    }
    const owner=names[0]==='crate'?names:names[0]==='self'?['crate',...path,...names.slice(1)]:null;
    return owner?resolve(owner,depth+1):null;
  };
  const type=resolve(target);return type?{...type,primitiveAliasSource:{schema:'original-monomorphic-primitive-alias-v1',aliases,digest:metadataDigest(aliases),runtimeParity:false}}:null;
}
