// Reusable inline closure grammar DATA. Body, captures and types stay unchecked.
const ident=row=>row?.type==='ident'&&/^[\p{ID_Start}_][\p{ID_Continue}_]*$/u.test(row.text)&&!['mut','ref','self','Self'].includes(row.text);
export function readInlineClosureSourceTokens(rows,{arity=null}={}){
 if(!Array.isArray(rows)||rows.length<2||rows.length>128||arity!==null&&(!Number.isSafeInteger(arity)||arity<0||arity>16))return null;let at=rows[0]?.text==='move'?1:0,body=-1;const parameters=[];
 if(rows[at]?.text==='||')body=at+1;
 else if(rows[at]?.text==='|'){
  const from=++at;for(;at<rows.length&&rows[at].text!=='|';at++);if(at===rows.length)return null;const groups=[],pairs={'(':')','[':']','{':'}'};let start=from;
  for(let index=from;index<=at;index++){
   const word=rows[index]?.text;if(index<at&&pairs[word]){if(groups.length>=16)return null;groups.push(pairs[word]);}else if(index<at&&[')',']','}'].includes(word)){if(groups.pop()!==word)return null;}
   if(index===at||word===','&&!groups.length){if(index===start){if(index!==from||index!==at)return null;}else{const part=rows.slice(start,index);if(!ident(part[0])||part.length>1&&(part[1].text!==':'||part.length===2))return null;parameters.push({name:part[0].text,tokens:part});}start=index+1;}
  }if(groups.length||parameters.length>16||new Set(parameters.map(row=>row.name)).size!==parameters.length)return null;body=at+1;
 }else return null;
 if(body>=rows.length||arity!==null&&parameters.length!==arity)return null;const groups=[],pairs={'(':')','[':']','{':'}'};for(const row of rows.slice(body)){if(pairs[row.text]){if(groups.length>=16)return null;groups.push(pairs[row.text]);}else if([')',']','}'].includes(row.text)&&groups.pop()!==row.text)return null;}if(groups.length)return null;
 return {parameters,bodyStart:body,body:rows.slice(body),span:[rows[0].start,rows.at(-1).end],bodySpan:[rows[body].start,rows.at(-1).end],move:rows[0].text==='move',callbackBodyChecked:false,callbackTypesChecked:false,capturesChecked:false,sourceAuthority:false,semanticAuthority:false};
}
