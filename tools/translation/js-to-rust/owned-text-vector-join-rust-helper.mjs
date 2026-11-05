// Complete canonical native helper selection DATA, never an original owner permit.
import {sameRustSourceSyntax} from '../rust-syntax-cells.mjs';
import {ownedTextVectorJoinRustHelperName,ownedTextVectorJoinRustHelperSource} from './owned-text-vector-join-emission.mjs';
export function selectCanonicalOwnedTextVectorJoinHelper(source,items){
 const candidates=[];for(const item of items){if(item.term!=='fn'||!/^router_kernel_text_join(?:_[0-9]+)?$/u.test(item.name))continue;const expected=ownedTextVectorJoinRustHelperSource(item.name);if(sameRustSourceSyntax(source.slice(item.start,item.end),expected))candidates.push(item);}
 if(candidates.length>1)throw new TypeError('Canonical join helper requires exactly one complete generated helper');if(!candidates.length)return {items,helperNames:[]};const selected=candidates[0],functions=items.filter(item=>item!==selected);if(ownedTextVectorJoinRustHelperName(functions)!==selected.name||items.at(-1)!==selected)throw new TypeError('Canonical join helper must retain its exact fresh module name and final source position');return {items:functions,helperNames:[selected.name],helperSource:source.slice(selected.start,selected.end),sourceAuthority:false,semanticAuthority:false,namespaceAuthority:false};
}
