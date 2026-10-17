// Qualified function boundaries for complete original impl bodies. The legacy
// whole-file scanner stays unchanged; these records grant no source authority.
import {rustTokens} from './rust-structure.mjs';
const pairs={'(':')','[':']','{':'}'};
const next=(tokens,at)=>{while(tokens[at]?.type==='comment')at++;return at;};
function groupEnd(tokens,at){
 const stack=[pairs[tokens[at]?.text]];if(!stack[0])throw new TypeError('Original impl member requires a delimiter group');
 for(at++;at<tokens.length;at++){const token=tokens[at];if(token.type!=='punct')continue;if(Object.hasOwn(pairs,token.text))stack.push(pairs[token.text]);else if([')',']','}'].includes(token.text)){if(stack.pop()!==token.text)throw new TypeError('Original impl member delimiters differ');if(!stack.length)return at+1;}}
 throw new TypeError('Original impl member group is incomplete');
}
function header(tokens,begin){
 let at=next(tokens,begin);
 while(tokens[at]?.text==='#'){at=next(tokens,at+1);if(tokens[at]?.text!=='[')throw new TypeError('Original impl member attribute boundary is unsupported');at=next(tokens,groupEnd(tokens,at));}
 if(tokens[at]?.text==='pub'){at=next(tokens,at+1);if(tokens[at]?.text==='(')at=next(tokens,groupEnd(tokens,at));}
 const head=at;
 // Rust function qualifier order. Invalid combinations remain outside this
 // structural function profile; parsing their semantics is a separate task.
 if(tokens[at]?.text==='const')at=next(tokens,at+1);
 else if(tokens[at]?.text==='async')at=next(tokens,at+1);
 if(tokens[at]?.text==='unsafe')at=next(tokens,at+1);
 if(tokens[at]?.text==='extern'){at=next(tokens,at+1);if(tokens[at]?.type==='string')at=next(tokens,at+1);}
 const fn=tokens[at]?.text==='fn'?at:-1;
 return {head,fn,statementOnly:fn<0&&['const','static','type','use'].includes(tokens[head]?.text)};
}
function continues(tokens,index){const token=tokens[next(tokens,index+1)];return !!token&&(token.type==='punct'?!['}','#','@'].includes(token.text):['else','as'].includes(token.text));}
export function originalImplMemberItems(source,bodySpan){
 if(typeof source!=='string'||Buffer.byteLength(source)>256000||!Number.isSafeInteger(bodySpan?.start)||!Number.isSafeInteger(bodySpan?.end)||bodySpan.start<0||bodySpan.end<bodySpan.start||bodySpan.end>source.length)throw new TypeError('Original impl member source/span exceeds the bounded profile');
 const tokens=rustTokens(source.slice(bodySpan.start,bodySpan.end)).map(token=>({...token,start:token.start+bodySpan.start,end:token.end+bodySpan.start}));if(tokens.length>32000)throw new TypeError('Original impl member token bound exceeded');
 const rows=[];let at=0;
 while(at<tokens.length){
  const begin=at;if(tokens[at].type==='comment'){rows.push({start:tokens[at].start,end:tokens[at].end,comment:true,term:'comment',name:null,tokens:[tokens[at++]]});continue;}
  const parsed=header(tokens,begin),stack=[];let sawBlock=false,end=-1;
  for(;at<tokens.length;at++){
   const token=tokens[at];if(token.type!=='punct')continue;
   if(Object.hasOwn(pairs,token.text)){stack.push(pairs[token.text]);if(token.text==='{')sawBlock=true;}
   else if([')',']','}'].includes(token.text)){
    if(stack.pop()!==token.text)throw new TypeError('Original impl member delimiters differ');
    if(!stack.length&&token.text==='}'&&sawBlock&&!parsed.statementOnly&&!continues(tokens,at)){end=at;break;}
   }else if(token.text===';'&&!stack.length){end=at;break;}
  }
  if(end<0||stack.length)throw new TypeError('Original impl member lacks its complete body or semicolon');
  const written=tokens.slice(begin,end+1),fn=parsed.fn>=0?tokens[parsed.fn]:null;
  rows.push({start:tokens[begin].start,end:tokens[end].end,comment:false,term:fn?'fn':tokens[parsed.head]?.text??'opaque',name:fn?tokens[next(tokens,parsed.fn+1)]?.text??null:null,tokens:written});at=end+1;
 }
 return rows;
}
