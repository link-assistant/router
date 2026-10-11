import {assertDeriveFootprintCertificate} from './derive-footprints.mjs';
import {STANDARD_LAYOUT_DERIVES} from './derive-inputs.mjs';
import {capturedRustTokenSource} from './extensions/lexical.mjs';

const parserSources=new WeakMap();
// A source certificate cannot authorize a fresh, caller-authored token array.
export function configureDeriveLayout(parser,certificate,source,offset=0) {
  assertDeriveFootprintCertificate(certificate,source,offset);
  const original=capturedRustTokenSource(parser.cursor.tokens);
  if(!original||original.source!==source)throw new TypeError('Derive layout requires unchanged tokenizer source');
  parserSources.set(parser,{certificate,source,offset,tokens:parser.cursor.tokens});return parser;
}

export function readCertifiedDeriveAttribute(parser,{allowDefault=false}={}) {
  const state=parserSources.get(parser);if(!state)return null;
  const c=parser.cursor,start=c.peek(),attribute=state.certificate.attributes.find(entry=>entry.span.start===state.offset+start.start);
  if(!attribute)return null;
  // Revalidate the private token/source association before every consumption.
  const original=capturedRustTokenSource(state.tokens);
  if(!original||original.source!==state.source)throw new TypeError('Certified derive source changed while parsing');
  const end=attribute.span.end-state.offset,begin=c.index;
  while(!c.atEnd()&&c.peek().start<end)c.next();
  const consumed=c.tokens.slice(begin,c.index);
  if(!consumed.length||consumed.at(-1).end!==end||consumed[0].start!==attribute.span.start-state.offset)throw new TypeError('Certified derive attribute token span mismatch');
  const expected=original.tokens.filter(token=>token.start>=consumed[0].start&&token.end<=end&&token.kind!=='eof');
  if(JSON.stringify(consumed)!==JSON.stringify(expected))throw new TypeError('Certified attribute differs from original tokenizer tokens');
  const standard=(attribute.derives??[]).filter(path=>path.length===1&&STANDARD_LAYOUT_DERIVES.has(path[0])).map(path=>path[0]);
  if(!allowDefault&&standard.includes('Default'))throw new TypeError('Certified Default remains a data-layout-only capability');
  return {kind:attribute.derives?'derive':'attribute',name:attribute.name,...(attribute.derives?{traits:standard,unimplementedDerives:attribute.derives.filter(path=>!(path.length===1&&STANDARD_LAYOUT_DERIVES.has(path[0])))}:{}),tokens:[...attribute.tokens],span:{start:attribute.span.start-state.offset,end},deriveNamespaceProof:state.certificate};
}
