// New borrow/callback profiles require the actual caller syntax captured by
// the original parser/project association, not a serialized source checksum.
import {originalParsedDeclarationEvidence,originalParsedSyntaxNode,metadataDigest} from './source-links.mjs';
import {unsupported} from '../vendor/meta-language/translation/diagnostics.js';
const calls=new WeakMap();
export function captureOriginalStandardCalls(checker,surface){let owner=null,sourceEntry=null;const nodes=new WeakMap(),visit=node=>{if(!node||typeof node!=='object')return;if(node.k==='routerLetElse'&&originalParsedSyntaxNode(sourceEntry,node)||node.k==='binary'&&node.op==='eq'||node.k==='routerTextPattern'&&['contains','starts_with'].includes(node.op)||node.k==='routerPinnedStandardBodyCall'||node.k==='routerPinnedSharedBodyCall'||node.k==='routerPinnedOptionCallbackCall'||node.k==='routerIteratorOperation'&&['filter','map'].includes(node.op)||node.k==='routerDispatchMethod'&&(node.method==='map_or'||node.method==='ok'&&node.object?.k==='routerIntegerParse'&&node.object.instantiation===null))nodes.set(node,{digest:metadataDigest(node),...owner});for(const [key,value]of Object.entries(node))if(!['type','span'].includes(key))Array.isArray(value)?value.forEach(visit):visit(value);};const items=(list,path=[])=>{for(const item of list)if(item.k==='module')items(item.items,[...path,item.name]);else if(item.k==='fn'){const evidence=originalParsedDeclarationEvidence(item);if(evidence){const before=owner,previousEntry=sourceEntry;owner={owner:[...path,item.name].join('.'),evidence};sourceEntry=item;visit(item.body);sourceEntry=previousEntry;owner=before;}}};items(surface.items);calls.set(checker,nodes);}
export function requireOriginalStandardCall(checker,node){if(calls.get(checker)?.get(node)?.digest!==metadataDigest(node))throw unsupported('original standard caller','requires the unchanged actual privately captured source-call syntax',node.span);}
// Membership is only an eligibility check. Consumers must still require the
// unchanged source syntax immediately before using a new source constraint.
export const hasOriginalStandardCall=(checker,node)=>calls.get(checker)?.has(node)===true;

// The immutable source record is useful only after the exact private call
// identity and its complete current syntax have been revalidated.
export function originalStandardCallContext(checker,node){requireOriginalStandardCall(checker,node);const state=calls.get(checker).get(node);return Object.freeze({owner:state.owner,evidence:state.evidence});}
