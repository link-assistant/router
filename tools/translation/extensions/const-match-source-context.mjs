import {originalOwnedUnitMatchesSource} from '../router-core-matches.mjs';
// A const match is lowered only inside its unchanged original const owner.
// The original macro proof remains separate from const permission for the
// checked, unguarded computation produced by that macro.
import {types as nodeTypes} from 'node:util';
import {HostChecker} from './host-contracts.mjs';
import {metadataDigest,originalParsedDeclarationEvidence} from './source-links.mjs';
const contexts=new WeakMap();
export function captureConstMatchSources(checker,surface){
  if(!checker||nodeTypes.isProxy(checker)||Object.getPrototypeOf(checker)!==HostChecker.prototype)return;
  const nodes=new WeakMap();
  const visit=(node,owner)=>{
    if(!node||typeof node!=='object')return;
    if(node.k==='routerOrderedMatch'&&node.sourceMacro?.owner==='original-standard-source')nodes.set(node,metadataDigest(node));
    else if(node.k==='routerOrderedMatch'&&node.sourceMacro?.owner==='owned-router-unit-source'&&originalOwnedUnitMatchesSource(owner,node))nodes.set(node,{ownedUnitEntry:owner});
    for(const [key,value]of Object.entries(node))if(!['type','span','sourceMacro'].includes(key))Array.isArray(value)?value.forEach(child=>visit(child,owner)):visit(value,owner);
  };
  const items=list=>{for(const entry of list)if(entry.k==='module')items(entry.items);else if(entry.k==='fn'&&(entry.constFunction===true||entry.constant===true)&&originalParsedDeclarationEvidence(entry))visit(entry.body,entry);};
  items(surface.items);contexts.set(checker,nodes);
}
export function originalConstMatchSource(checker,node){
  const digest=contexts.get(checker)?.get(node);
  if(digest&&typeof digest==='object')return originalOwnedUnitMatchesSource(digest.ownedUnitEntry,node);
  return !!digest&&digest===metadataDigest(node);
}
