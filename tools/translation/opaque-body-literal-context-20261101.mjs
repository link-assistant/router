// Exact lexical source-candidate alignment DATA. Never a semantic issuer.
import {requireSynchronousSourceCallback,withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
import {sourceItems} from './rust-structure.mjs';
const need=(yes,message)=>{if(!yes)throw TypeError('Whole body literal source context: '+message);};
function occurrences(tokens,text,source,kind){
 const rows=[];for(let at=0;at<tokens.length;at++){
  const token=tokens[at];if(token.text===text)rows.push({start:token.start,end:token.end});
  else if(kind==='integer'&&token.text==='-'&&tokens[at+1]?.type==='number'&&source.slice(token.start,tokens[at+1].end)===text)rows.push({start:token.start,end:tokens[at+1].end});
 }return rows;
}
/**
 * Select one candidate using unchanged, unique string anchors around the real
 * checked adopted token. A fixed fresh whole-project inverse still must prove
 * complete target reproduction; neither anchors nor ordinals grant permission.
 */
export function withOpaqueBodyLiteralSourceContext(original,adopted,run){
 requireSynchronousSourceCallback(run);need(typeof original==='string'&&typeof adopted==='string'&&Buffer.byteLength(original)<=8388608&&Buffer.byteLength(adopted)<=8388608,'bounded complete original/adopted source DATA required');
 let oldItems=sourceItems(original),newItems=sourceItems(adopted),tables=new Map(),active=true;need(oldItems.length<=20000&&newItems.length<=20000,'bounded complete source item census');
 const align=selection=>{
 need(active,'source context expired');
 need(typeof original==='string'&&typeof adopted==='string'&&selection?.kind==='actual-checked-body-literal'&&typeof selection.qualifiedName==='string'&&typeof selection.before==='string'&&selection.span&&adopted.slice(selection.span.start,selection.span.end)===selection.before,'complete exact adopted body literal/source preimage required');
 const leaf=selection.qualifiedName.split('.').at(-1),oldOwners=oldItems.filter(row=>row.term==='fn'&&row.name===leaf),newOwners=newItems.filter(row=>row.term==='fn'&&row.name===leaf&&row.start<=selection.span.start&&row.end>=selection.span.end);
 need(oldOwners.length===1&&newOwners.length===1,'unique actual original/adopted top-level body owners required');
 const oldOwner=oldOwners[0],newOwner=newOwners[0];let table=tables.get(newOwner);
 if(!table){const oldTokens=oldOwner.tokens.filter(row=>row.type!=='comment'),newTokens=newOwner.tokens.filter(row=>row.type!=='comment'),oldStrings=new Map(),newStrings=new Map();for(const [tokens,strings]of [[oldTokens,oldStrings],[newTokens,newStrings]])for(const token of tokens)if(token.type==='string'){if(!strings.has(token.text))strings.set(token.text,[]);strings.get(token.text).push(token);}const anchors=newTokens.filter(token=>token.type==='string'&&oldStrings.get(token.text)?.length===1&&newStrings.get(token.text)?.length===1);table={oldOwner,oldTokens,newTokens,oldStrings,anchors};tables.set(newOwner,table);}
 need(table.oldOwner===oldOwner,'source context original owner differs');const {oldTokens,newTokens,oldStrings,anchors}=table,left=anchors.filter(token=>token.end<=selection.span.start).at(-1),right=anchors.find(token=>token.start>=selection.span.end);
 const oldLeft=left?oldStrings.get(left.text)[0]:null,oldRight=right?oldStrings.get(right.text)[0]:null;
 const oldStart=oldLeft?.end??oldOwner.start,oldEnd=oldRight?.start??oldOwner.end,newStart=left?.end??newOwner.start,newEnd=right?.start??newOwner.end;
 need(oldStart<=oldEnd&&newStart<=newEnd,'unchanged literal anchor order differs');
 const oldMatches=occurrences(oldTokens,selection.before,original,selection.literalKind).filter(row=>row.start>=oldStart&&row.end<=oldEnd),newMatches=occurrences(newTokens,selection.before,adopted,selection.literalKind).filter(row=>row.start>=newStart&&row.end<=newEnd);
 need(newMatches.length>0&&oldMatches.length===newMatches.length,'original/adopted context literal multiplicity differs; no guessed slot');
 const ordinal=newMatches.findIndex(row=>row.start===selection.span.start&&row.end===selection.span.end);need(ordinal>=0,'whole actual adopted literal token occurrence required');
 const span=oldMatches[ordinal];need(original.slice(span.start,span.end)===selection.before,'exact original context token preimage differs');
 return {span,sourceRelation:'actual-checked-body-unique-anchors-and-exact-token-multiplicity',context:{left:left?.text??null,right:right?.text??null,ordinal,multiplicity:oldMatches.length},sourceAuthority:false,semanticAuthority:false};
 };
 return withCompleteSourceClosingFence(()=>run(align),[()=>{active=false;oldItems=null;newItems=null;tables.clear();tables=null;original=null;adopted=null;}]);
}
export function alignOpaqueBodyLiteralOriginalSlot(original,adopted,selection){return withOpaqueBodyLiteralSourceContext(original,adopted,align=>align(selection));}
