// Concrete syntax is a lossless input representation, never source-owner or
// executable evidence. The existing semantic pipeline still checks its text.
import {
  createConcreteSyntaxMeta, serializeConcreteSyntaxMeta, parseConcreteSyntaxMeta,
  reconstructConcreteSyntax, applyConcreteSyntaxSubstitutions,
} from './concrete-syntax-meta.mjs';

export function readRustConcreteSyntaxMeta(serialized) {
  const document=parseConcreteSyntaxMeta(serialized);
  if(document.language!=='Rust')throw new TypeError('Forward concrete syntax requires Rust source');
  return {source:reconstructConcreteSyntax(document),document};
}

export function createRustConcreteSyntaxStage(source) {
  if(typeof source!=='string')throw new TypeError('Forward concrete syntax requires primitive source text');
  const created=createConcreteSyntaxMeta(source,{language:'Rust'});
  // These are the fixed reusable language and repository sequences. This
  // original-source ingress applies no edits and accepts no caller callbacks.
  const substituted=applyConcreteSyntaxSubstitutions(created,{languageRules:[],repositoryRules:[]}).value;
  const stage=readRustConcreteSyntaxMeta(serializeConcreteSyntaxMeta(substituted));
  if(stage.source!==source)throw new TypeError('Forward concrete syntax changed the complete original source');
  return stage;
}
