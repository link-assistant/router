// Concrete syntax is a lossless input representation, never source-owner or
// executable evidence. The existing semantic pipeline still checks its text.
import {
  transportConcreteSyntaxSource,transportConcreteSyntaxMeta,transportConcreteSyntaxSources,
} from './concrete-syntax-meta.mjs';
import {rustTokens} from './rust-structure.mjs';

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

// Each row still crosses its complete serialized/reparsed CST boundary. Only
// native parser authentication is shared within a fresh, bounded transaction.
// These limits partition inputs; they do not enlarge any native source bound.
// A dense batch can exceed the native aggregate node/canonical bound even when
// every original file fits separately. Discard that failed transaction and
// authenticate both complete halves afresh; no partial output is admitted.
export function createRustConcreteSyntaxStages(sources) {
  if(!Array.isArray(sources)||sources.some(source=>typeof source!=='string'))throw new TypeError('Forward concrete syntax requires primitive source texts');
  const stages=[];
  let rows=[],units=0,estimatedNodes=0;
  const transport=rows=>{
    let transported;
    try{transported=transportConcreteSyntaxSources(rows);}
    catch(error){
      if(rows.length<2||Object.getOwnPropertyDescriptor(error,'message')?.value!=='Private parser execution: batch aggregate node/canonical budget')throw error;
      const middle=Math.floor(rows.length/2);
      transport(rows.slice(0,middle));transport(rows.slice(middle));return;
    }
    for(let at=0;at<rows.length;at++){
      const stage=transported.rows[at];
      if(stage.source!==rows[at].source||stage.document.language!=='Rust')throw new TypeError('Forward concrete syntax changed the complete original source');
      stages.push({source:stage.source,document:stage.document});
    }
  };
  const flush=()=>{if(rows.length)transport(rows);rows=[];units=0;estimatedNodes=0;};
  for(const source of sources){
    // A packing estimate only: every admitted row must still pass the native
    // complete source transport and its independent aggregate bounds. Include
    // room for whitespace leaves and delimiter groups; malformed text keeps a
    // dedicated transaction and its original opaque/error representation.
    let weight=180000;
    try{
      weight=1;let end=0;
      for(const token of rustTokens(source)){
        if(token.start>end)weight++;
        weight++;
        if(token.type==='punct'&&(token.text==='('||token.text==='{'||token.text==='['))weight++;
        end=token.end;
      }
      if(end<source.length)weight++;
    }catch{weight=180000;}
    if(rows.length&&(rows.length===256||units+source.length>2097152||estimatedNodes+weight>180000))flush();
    rows.push({source,language:'Rust'});units+=source.length;estimatedNodes+=weight;
  }
  flush();return stages;
}
