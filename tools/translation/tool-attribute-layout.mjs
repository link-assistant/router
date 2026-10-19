import {assertToolAttributeCertificate,isToolAttributeContext,toolAttributeAt} from './tool-attributes.mjs';
import {itemConfiguration} from './cfg-profile.mjs';
import {capturedRustTokenSource} from './extensions/lexical.mjs';
const parserSources=new WeakMap();
export function configureToolAttributes(parser,context,module,item,source,offset=item.start){
  if(!isToolAttributeContext(context))throw new TypeError('Unsealed tool attribute parser context');
  const proofs=itemConfiguration(item.tokens.filter(token=>token.type!=='comment'),context.compilationProfile).attributes.map(attribute=>toolAttributeAt(context,module,item,attribute)).filter(Boolean);
  if(!proofs.length)return parser;
  for(const proof of proofs)assertToolAttributeCertificate(proof,source,offset);
  const original=capturedRustTokenSource(parser.cursor.tokens);
  if(!original||original.source!==source)throw new TypeError('Tool attributes require unchanged tokenizer source');
  parserSources.set(parser,{proofs,source,offset,tokens:parser.cursor.tokens});return parser;
}
export function readCertifiedToolAttribute(parser){
  const state=parserSources.get(parser);if(!state)return null;
  const c=parser.cursor,proof=state.proofs.find(proof=>proof.attribute.span.start===state.offset+c.peek().start);
  if(!proof)return null;
  assertToolAttributeCertificate(proof,state.source,state.offset);
  const original=capturedRustTokenSource(state.tokens);
  if(!original||original.source!==state.source)throw new TypeError('Certified tool tokenizer source changed');
  const begin=c.index,end=proof.attribute.span.end-state.offset;
  while(!c.atEnd()&&c.peek().start<end)c.next();
  const consumed=c.tokens.slice(begin,c.index),expected=original.tokens.filter(token=>token.start>=proof.attribute.span.start-state.offset&&token.end<=end&&token.kind!=='eof');
  if(!consumed.length||consumed.at(-1).end!==end||JSON.stringify(consumed)!==JSON.stringify(expected))throw new TypeError('Certified tool attribute token span mismatch');
  return {kind:'tool',name:'rustfmt',path:['rustfmt','skip'],tokens:[...proof.attribute.tokens],span:{start:proof.attribute.span.start-state.offset,end},toolAttributeProof:proof};
}
