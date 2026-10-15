// New borrow/callback profiles require the actual caller syntax captured by
// the original parser/project association, not a serialized source checksum.
import {originalParsedDeclarationEvidence,metadataDigest} from './source-links.mjs';
import {unsupported} from '../vendor/meta-language/translation/diagnostics.js';
const calls=new WeakMap();
export function captureOriginalStandardCalls(checker,surface){const nodes=new WeakMap(),visit=node=>{if(!node||typeof node!=='object')return;if(node.k==='routerPinnedStandardBodyCall'||node.k==='routerPinnedSharedBodyCall'||node.k==='routerPinnedOptionCallbackCall'||node.k==='routerIteratorOperation'&&['filter','map'].includes(node.op)||node.k==='routerDispatchMethod'&&(node.method==='map_or'||node.method==='ok'&&node.object?.k==='routerIntegerParse'&&node.object.instantiation===null))nodes.set(node,metadataDigest(node));for(const [key,value]of Object.entries(node))if(!['type','span'].includes(key))Array.isArray(value)?value.forEach(visit):visit(value);};const items=list=>{for(const item of list)if(item.k==='module')items(item.items);else if(item.k==='fn'&&originalParsedDeclarationEvidence(item))visit(item.body);};items(surface.items);calls.set(checker,nodes);}
export function requireOriginalStandardCall(checker,node){if(calls.get(checker)?.get(node)!==metadataDigest(node))throw unsupported('original standard caller','requires the unchanged actual privately captured source-call syntax',node.span);}
// Membership is only an eligibility check. Consumers must still require the
// unchanged source syntax immediately before using a new source constraint.
export const hasOriginalStandardCall=(checker,node)=>calls.get(checker)?.has(node)===true;
