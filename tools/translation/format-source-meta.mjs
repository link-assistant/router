// Original syntax extraction -> serialized meta. These source spans/call edges
// do not implement compiler parsing, generated fmt::Arguments or I/O behavior.
import {createHash} from 'node:crypto';
import {rustTokens} from './rust-structure.mjs';
import {originalMacroTrees,freezeMacroTree} from './macro-token-trees.mjs';
import {isPinnedFormatSourceStages,formatSourceStageInput} from './format-source-profiles.mjs';
const states=new WeakMap(),hash=value=>createHash('sha256').update(value).digest('hex'),word=tree=>tree?.kind==='token'?tree.text:null;
export function formattingSourceMacros(proof,path){
  const pin=formatSourceStageInput(proof,path);if(!pin.macroOwnerHint)throw new TypeError('Original source has no macro declaration owner hint');const trees=originalMacroTrees(pin.source),rows=[];
  function visit(nodes,module=[]){for(let at=0;at<nodes.length;at++){
    if(word(nodes[at])==='mod'&&nodes[at+2]?.delimiter==='{'){visit(nodes[at+2].children,[...module,word(nodes[at+1])]);at+=2;continue;}
    if(word(nodes[at])!=='macro_rules'||word(nodes[at+1])!=='!'||nodes[at+3]?.delimiter!=='{')continue;const name=word(nodes[at+2]),body=nodes[at+3];let before=at;if(word(nodes[before-1])==='pub')before--;const attributes=[];while(nodes[before-1]?.delimiter==='['&&word(nodes[before-2])==='#'){attributes.unshift(nodes[before-1]);before-=2;}
    const span={start:nodes[at].span.start,end:body.span.end};rows.push({name,module,ownerHint:pin.macroOwnerHint,attributes,span,sha256:hash(pin.source.slice(span.start,span.end)),bodySpan:body.span,builtin:attributes.some(attr=>word(attr.children[0])==='rustc_builtin_macro'),ownerResolved:false});at+=3;
  }}visit(trees);return freezeMacroTree(rows);
}
function tokenCalls(tokens){const rows=[];for(let at=0;at<tokens.length;at++){
  const first=tokens[at];if(first.type!=='ident')continue;const written=[first.text];let end=at+1;while(['::','.'].includes(tokens[end]?.text)&&tokens[end+1]?.type==='ident'){written.push(tokens[end].text,tokens[end+1].text);end+=2;}
  const macro=written.at(-1).endsWith('!')||tokens[end]?.text==='!';if(macro||tokens[end]?.text==='('){rows.push({kind:macro?'macro-call':'call',writtenPath:written,span:{start:first.start,end:tokens[Math.min(end,tokens.length-1)].end},ownerResolved:false,effectsVerified:false,syntaxOnly:true});at=end-1;}
}return rows;}
export function compileFormatCompilerSourceMeta(proof,path){
  if(!isPinnedFormatSourceStages(proof))throw new TypeError('Compiler source meta requires private original input proof');const pin=formatSourceStageInput(proof,path),tokens=rustTokens(pin.source).filter(token=>token.type!=='comment'),functions=[];
  for(let at=0;at<tokens.length;at++)if(tokens[at].text==='fn'&&tokens[at+1]?.type==='ident'){
    let body=at+2,round=0,square=0,angle=0;for(;body<tokens.length;body++){const value=tokens[body].text;if(value==='(')round++;else if(value===')')round--;else if(value==='[')square++;else if(value===']')square--;else if(value==='<')angle++;else if(value==='>')angle--;else if(value==='>>')angle-=2;else if(value===';'&&!round&&!square&&!angle)break;else if(value==='{'&&!round&&!square&&!angle)break;if(round<0||square<0||angle<0)break;}
    if(tokens[body]?.text!=='{')continue;let end=body+1,depth=1;for(;end<tokens.length&&depth;end++){if(tokens[end].text==='{')depth++;else if(tokens[end].text==='}')depth--;}
    if(depth)throw new TypeError('Original format compiler source body is unterminated');const span={start:tokens[at].start,end:tokens[end-1].end},bodySpan={start:tokens[body].start,end:tokens[end-1].end},bodyTokens=tokens.slice(body+1,end-1);functions.push({name:tokens[at+1].text,span,sha256:hash(pin.source.slice(span.start,span.end)),signatureTokens:tokens.slice(at,body),bodySpan,bodySha256:hash(pin.source.slice(bodySpan.start,bodySpan.end)),bodyTokens,calls:tokenCalls(bodyTokens),controlTokens:bodyTokens.filter(token=>['if','else','match','while','for','return','break','continue','?'].includes(token.text)),sourceSemanticClosureVerified:false});at=end-1;
  }
  const issued={schema:'original-format-source-function-meta-v1',sourcePath:path,sourceSha256:pin.sourceSha256,functions,sourceSpanIntegrityVerified:true,semanticIRChecked:false,executable:false,builtinBuilderOwnerResolved:false,traitSelectionVerified:false,allocatorEffectsVerified:false,ioEffectsVerified:false,namespaceAuthority:false,runtimeParity:false};const encoded=JSON.stringify(issued),candidate=freezeMacroTree({...JSON.parse(encoded),privateMetaRoundtrip:true,checkedMetaSha256:hash(encoded)});states.set(candidate,{proof,path});return candidate;
}
export const isFormatCompilerSourceMeta=value=>!!value&&states.has(value);
