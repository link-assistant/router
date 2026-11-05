// Ordinary item alias classification is syntax DATA, never alias expansion.
import {originalDeclarationHeader} from './module-bindings.mjs';
export function ordinaryTypeAliasDeclarationSource(item,owner=[]){
 if(item?.term!=='type'||!Array.isArray(item.tokens)||item.tokens.length>1024)return null;const header=originalDeclarationHeader(item,owner);if(header?.kind!=='type')return null;const rows=item.tokens.filter(row=>row.type!=='comment'),name=rows.findIndex(row=>row.start===header.nameSpan.start&&row.end===header.nameSpan.end);if(name<0||rows.at(-1)?.text!==';')return null;
 let at=name+1;
 // Defaults and associated equalities inside the generic header cannot stand
 // in for the alias's own equals token. Const expression groups are skipped
 // with their real delimiter stack before angle punctuation is considered.
 if(rows[at]?.text==='<'){
  let angles=0;const groups=[],pairs={'(':')','[':']','{':'}'};
  for(;at<rows.length;at++){
   const row=rows[at],text=row.text;if(row.type!=='punct')continue;
   if(pairs[text]){if(groups.length>=16)return null;groups.push(pairs[text]);continue;}
   if([')',']','}'].includes(text)){if(groups.pop()!==text)return null;continue;}
   if(groups.length)continue;
   if(text==='<'){if(++angles>16)return null;}
   else if(text==='>'||text==='>>'){angles-=text.length;if(angles<0)return null;if(angles===0){at++;break;}}
   else if(text===';')return null;
  }
  if(angles!==0||groups.length)return null;
 }
 // Bounded ordinary aliases without a where clause are selected. Trait aliases,
 // associated declarations, unknown headers and empty bodies remain outside.
 if(rows[at]?.text!=='='||at+2>=rows.length)return null;
 return {kind:'type',name:header.name,header,equalsSpan:[rows[at].start,rows[at].end],rhsSpan:[rows[at+1].start,rows.at(-1).start],aliasExpanded:false,namespaceComplete:false,semanticAuthority:false,executableAdmission:false};
}
