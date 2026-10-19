// Concrete syntax is a lossless input representation, never source-owner or
// executable evidence. The existing semantic pipeline still checks its text.
import {
  transportConcreteSyntaxSource,transportConcreteSyntaxMeta,
} from './concrete-syntax-meta.mjs';

export function readRustConcreteSyntaxMeta(serialized) {
  const stage=transportConcreteSyntaxMeta(serialized),document=stage.document;
  if(document.language!=='Rust')throw new TypeError('Forward concrete syntax requires Rust source');
  return {source:stage.source,document};
}

export function createRustConcreteSyntaxStage(source) {
  if(typeof source!=='string')throw new TypeError('Forward concrete syntax requires primitive source text');
  // These are the fixed reusable language and repository sequences. This
  // original-source ingress applies no edits and accepts no caller callbacks.
  const transported=transportConcreteSyntaxSource(source,{language:'Rust'});
  const stage={source:transported.source,document:transported.document};
  if(stage.source!==source)throw new TypeError('Forward concrete syntax changed the complete original source');
  return stage;
}
