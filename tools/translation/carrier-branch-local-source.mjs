// A complete pure branch body, using the original chronological local reader.
import {createPrimitiveCarrierLocalSource} from './primitive-carrier-local-source.mjs';
import {localAliasDeclaration} from './local-alias-binding-source.mjs';
export function readCarrierBranchLocalSource(rows,scope,wanted,{readExpression,readWrittenRole}={}){
 if(!Array.isArray(rows)||!rows.length||rows.length>256||typeof readExpression!=='function'||typeof readWrittenRole!=='function')return null;const initial=new Map(scope),locals=createPrimitiveCarrierLocalSource(rows,initial,new Set(initial.keys()),{readWrittenRole});if(!locals)return null;const groups=[],pairs={'(':')','[':']','{':'}'};let from=0,work=0;
 for(let at=0;at<rows.length;at++){
  if(++work>2048)return null;const word=rows[at].text;
  if(pairs[word]){if(groups.length>=64)return null;groups.push(pairs[word]);}
  else if([')',']','}'].includes(word)){if(groups.pop()!==word)return null;}
  else if(word===';'&&!groups.length){
   const declaration=localAliasDeclaration(rows,from);if(rows[from]?.text!=='let'||!declaration||declaration.mutable)return null;
   const visible=locals.at(rows[at].end);if(!visible.has(declaration.name)||!locals.evidence(declaration.name))return null;from=at+1;
  }
 }
 if(groups.length||from>=rows.length||['return','let'].includes(rows[from].text))return null;const tail=rows.slice(from),actual=readExpression(tail,locals.at(tail[0].start),wanted);if(!actual)return null;
 return {...actual,binding:null,bridge:'complete-immutable-branch-local-source',sourceAuthority:false,semanticAuthority:false,executableAdmission:false};
}
