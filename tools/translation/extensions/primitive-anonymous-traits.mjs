// Anonymous imports contribute trait methods without binding an identifier.
// Their original declarations and every inherited member owner remain explicit.
import {createHash} from 'node:crypto';
import {itemConfiguration} from '../cfg-profile.mjs';
import {originalSourceModuleItems} from '../source-module-views.mjs';
import {originalUseDeclarationLeaves} from '../module-bindings.mjs';
import {originalCoreTraitClosure,originalLocalTraitClosure} from './primitive-trait-closure.mjs';
import {originalExternalTraitClosure} from './external-trait-sources.mjs';
import {originalMatchesDependencyProof} from '../matches-macro-context.mjs';
const hash=data=>createHash('sha256').update(data).digest('hex');
const same=(a,b)=>a.length===b.length&&a.every((part,index)=>part===b[index]);
const fail=message=>{throw new TypeError('Original anonymous trait scope: '+message);};
const absolute=(segments,owner)=>{
  if(segments[0]==='crate')return segments.slice(1);
  let result=[...owner],at=segments[0]==='self'?1:0;
  if(segments[0]!=='self'&&segments[0]!=='super')return null;
  while(segments[at]==='super'){if(!result.length)return null;result.pop();at++;}return [...result,...segments.slice(at)];
};
export function originalAnonymousTraitScope(facts,consumer){
  const proofs=[],profile=facts.evidence.compilationProfile;
  for(const item of originalSourceModuleItems(consumer).filter(item=>item.term==='use')){
    const condition=itemConfiguration(item.tokens,profile);if(condition.status==='inactive')continue;
    for(const leaf of originalUseDeclarationLeaves(item,consumer.path).filter(leaf=>leaf.name==='_')){
      if(condition.status!=='active')fail('anonymous import compilation condition is unproved');
      let declaration;
      if(['core','std'].includes(leaf.segments[0])){
        if(leaf.segments[0]==='std'&&!same(leaf.segments.slice(1),['convert','From']))fail('standard-library anonymous trait reexport lacks its original route source');
        declaration=originalCoreTraitClosure(['core',...leaf.segments.slice(1)]);
      }
      else{
        const path=absolute(leaf.segments,consumer.path);
        if(!path){
          const ancestors=facts.evidence.scopes.filter(scope=>scope.path.every((part,index)=>consumer.path[index]===part));
          if(ancestors.some(scope=>scope.bindings.some(binding=>binding.namespace==='type'&&binding.name===leaf.segments[0])))fail('external anonymous trait root is shadowed');
          const external=originalExternalTraitClosure(originalMatchesDependencyProof(facts),leaf.segments);declaration={...external.declaration,originalDependency:external.originalDependency};
          proofs.push({originalImport:{source:consumer.file,sourceSha256:hash(consumer.source),originalSpan:{start:item.start,end:item.end},segments:leaf.segments},declaration});continue;
        }
        const owner=facts.modules.find(module=>same(module.path,path.slice(0,-1)));if(!owner)fail('anonymous trait module has no complete original source');
        const found=originalSourceModuleItems(owner).filter(item=>item.term==='trait'&&item.name===path.at(-1));if(found.length!==1)fail('anonymous trait declaration is absent or ambiguous');
        declaration=originalLocalTraitClosure(facts,owner,found[0]);
      }
      proofs.push({originalImport:{source:consumer.file,sourceSha256:hash(consumer.source),originalSpan:{start:item.start,end:item.end},segments:leaf.segments},declaration});
    }
  }
  return proofs;
}
