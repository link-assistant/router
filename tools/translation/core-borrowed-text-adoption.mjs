// Bounded source candidates for explicit owned-API adoption. These records do
// not establish standard trait dispatch, checked types or executable admission.
const C='crate::translation_core::';
const ident=t=>t?.type==='ident'&&/^[\p{ID_Start}_][\p{ID_Continue}_]*$/u.test(t.text);
const words=tokens=>tokens.map(t=>t.text).join('');
const reserved=new Set(['str','Option','Some','None','String','ToString','ToOwned','std','core','translation_core',...'as async await break const continue crate dyn else enum extern false fn for if impl in let loop match mod move mut pub ref return self Self static struct super trait true type unsafe use where while yield try gen'.split(' ')]);
function close(tokens,start){const pairs={'(':')','[':']','{':'}'},stack=[];for(let i=start;i<tokens.length;i++){const t=tokens[i];if(['string','char','comment'].includes(t.type))continue;if(pairs[t.text])stack.push(pairs[t.text]);else if([')',']','}'].includes(t.text)){if(stack.pop()!==t.text)return -1;if(!stack.length)return i;}}return -1;}
function split(tokens,separator=','){const groups=[];let first=0,angle=0;for(let i=0;i<tokens.length;i++){const word=tokens[i].text;if(['(','[','{'].includes(word)){const end=close(tokens,i);if(end<0)return [];i=end;}else if(word==='<')angle++;else if(word==='>')angle--;else if(word==='>>')angle-=2;else if(!angle&&word===separator){groups.push(tokens.slice(first,i));first=i+1;}}groups.push(tokens.slice(first));return groups.filter(row=>row.length);}
function typeRole(tokens){let value=tokens.map(t=>t.text+(t.text.startsWith("'")?' ':'')).join(''),optional=false;const option=/^(?:Option|std::option::Option|::std::option::Option|crate::translation_core::Maybe)<([\s\S]*)>$/u.exec(value);if(option){optional=true;value=option[1];}value=value.replace(/^&'[\p{ID_Start}_][\p{ID_Continue}_]*\s+/u,'&').replace(/\s+/gu,'');return ['&str','&::std::primitive::str','&'+C+'Str'].includes(value)?{kind:'shared-str',optional}:null;}
function literal(token,previous){return token?.type==='string'&&(/^(?:"|r#*")/u.test(token.text))&&!(previous?.type==='ident'&&previous.end===token.start);}
export function selectBorrowedTextConversions(source,item,{rows,parameters,body,macroSpans}){
 const candidates=[],skipped=[],env=new Map(),used=new Set(rows.filter(ident).map(t=>t.text));let cells=0;
 const note=reason=>({candidates:[],skipped:[{span:[item.start,item.end],reason}]});
 if(rows.length>200000)return note('borrowed-text source token bound');
 if(macroSpans.length)return note('borrowed-text binding roles do not cross unexpanded macro producers');
 if(rows.slice(body+1,-1).some((t,i)=>['for','while','loop'].includes(t.text)||t.text==='let'&&['if','while'].includes(rows[body+i]?.text)))return note('borrowed-text loop and conditional-pattern bindings require separate roles');
 // An unknown lambda introduces its own names. Do not guess captures or reuse
 // an enclosing role through it. Literal conversions keep their older route.
 for(let i=body+1;i<rows.length-1;i++)if(rows[i].text==='||'||rows[i].text==='|'&&!(literal(rows[i-1])&&literal(rows[i+1])))return note('borrowed-text callback or nonliteral alternative bindings require a separate source role');
 const name=rows.findIndex(t=>t.text==='fn'),open=rows.findIndex((t,i)=>i>name&&t.text==='(');
 for(const row of split(rows.slice(open+1,parameters))){if(!ident(row[0])||row[1]?.text!==':'||reserved.has(row[0].text)||env.has(row[0].text))return note('borrowed-text requires distinct ordinary source parameter bindings');const role=typeRole(row.slice(2));env.set(row[0].text,role?{...role,evidence:[{kind:'written-shared-str-parameter',span:[row[0].start,row.at(-1).end],source:source.slice(row[0].start,row.at(-1).end)}]}:null);}
 const macroAt=i=>macroSpans.find(([first,last])=>i>=first&&i<=last);
 const copy=current=>{cells+=current.size;return cells>100000?new Map():new Map(current);};
 const expression=(tokens,current,depth=0)=>{
  if(++cells>100000||depth>32||!tokens.length)return null;
  if(tokens[0].text==='('&&close(tokens,0)===tokens.length-1)return expression(tokens.slice(1,-1),current,depth+1);
  if(tokens.length===1){if(ident(tokens[0]))return current.get(tokens[0].text)??null;if(literal(tokens[0]))return {kind:'shared-str',optional:false,evidence:[{kind:'written-str-literal',span:[tokens[0].start,tokens[0].end]}]};return null;}
  if(tokens[0].text!=='match')return null;
  let at=1;for(;at<tokens.length&&tokens[at].text!=='{';at++)if(['(','['].includes(tokens[at].text)){const end=close(tokens,at);if(end<0)return null;at=end;}
  if(at>=tokens.length||close(tokens,at)!==tokens.length-1)return null;const subject=expression(tokens.slice(1,at),current,depth+1);if(!subject||subject.optional)return null;
  const arms=split(tokens.slice(at+1,-1));if(!arms.length||arms.length>64)return null;let fallback=false;const evidence=[...subject.evidence];
  for(let index=0;index<arms.length;index++){const arm=arms[index],arrow=arm.findIndex(t=>t.text==='=>');if(arrow<1||arm.slice(arrow+1).some(t=>t.text==='=>'))return null;const pattern=arm.slice(0,arrow),scope=copy(current);let patternKind='literal-alternatives';
   if(pattern.length===1&&ident(pattern[0])){if(index!==arms.length-1||reserved.has(pattern[0].text))return null;fallback=true;patternKind='borrowed-fallback';if(pattern[0].text!=='_')scope.set(pattern[0].text,subject);}
   else if(!pattern.every((t,i)=>i%2?t.text==='|':literal(t))||pattern.length%2!==1)return null;
   const value=expression(arm.slice(arrow+1),scope,depth+1);if(!value||value.optional)return null;evidence.push({kind:patternKind,span:[arm[0].start,arm.at(-1).end],source:source.slice(arm[0].start,arm.at(-1).end)},...value.evidence);
  }
  return fallback&&evidence.length<=256?{kind:'shared-str',optional:false,evidence}:null;
 };
 let fresh=0;const binding=()=>{let name;do{name='__router_borrowed_text_'+(++fresh);}while(used.has(name));used.add(name);return name;};
 function walk(first,last,current,depth=0){if(depth>64||cells>100000)return;
  for(let i=first;i<last;i++){
   if(++cells>100000)return;const macro=macroAt(i);if(macro){i=macro[1];continue;}
   if(rows[i].text==='let'){
    let equals=i+1;while(equals<last&&!['=',';','{','}'].includes(rows[equals].text))equals++;if(rows[equals]?.text!=='=')continue;
    let end=equals+1;for(;end<last&&rows[end].text!==';';end++)if(['(','[','{'].includes(rows[end].text)){const closeAt=close(rows,end);if(closeAt<0)return;end=closeAt;}
    const pattern=rows.slice(i+1,equals),simple=ident(pattern[0])&&pattern[0].text!=='mut'&&(pattern.length===1||pattern[1]?.text===':');
    // First examine the initializer in the enclosing scope: Rust let bindings
    // enter scope after their initializer, including same-name shadowing.
    walk(equals+1,end,copy(current),depth+1);
    if(simple){const role=expression(rows.slice(equals+1,end),current);let admitted=role;if(pattern.length>1){const declared=typeRole(pattern.slice(2));if(!declared||!role||declared.optional!==role.optional)admitted=null;}if(admitted&&admitted.evidence.length>=256)admitted=null;current.set(pattern[0].text,admitted?{...admitted,evidence:[...admitted.evidence,{kind:'immutable-lexical-alias',span:[rows[i].start,rows[Math.min(end,last-1)].end],source:source.slice(rows[i].start,rows[Math.min(end,last-1)].end)}]}:null);}
    else for(const token of pattern)if(ident(token))current.set(token.text,null);i=end;continue;
   }
   let end=i;
   if(rows[i].text==='match'){let open=i+1;for(;open<last&&rows[open].text!=='{';open++)if(['(','['].includes(rows[open].text)){const n=close(rows,open);if(n<0)return;open=n;}end=close(rows,open);if(end<0)return;}
   else if(rows[i].text==='('){end=close(rows,i);if(end<0)return;}
   else if(!ident(rows[i])||['.','::'].includes(rows[i-1]?.text)){if(rows[i].text==='{'){const n=close(rows,i);if(n<0)return;walk(i+1,n,copy(current),depth+1);i=n;}continue;}
   const role=expression(rows.slice(i,end+1),current),method=rows[end+2]?.text;
   if(role&&rows[end+1]?.text==='.'&&['to_string','to_owned'].includes(method)&&rows[end+3]?.text==='('&&rows[end+4]?.text===')'&&!role.optional){
    const span=[rows[i].start,rows[end+4].end];if(!item.tokens.some(t=>t.type==='comment'&&t.start>=rows[end].end&&t.end<=span[1]))candidates.push({kind:'shared-receiver',span,operand:source.slice(rows[i].start,rows[end].end),method,evidence:role.evidence,originalDispatchProved:false});i=end+4;continue;
   }
   if(role?.optional&&rows[end+1]?.text==='.'&&method==='map'&&rows[end+3]?.text==='('){const stop=close(rows,end+3),args=rows.slice(end+4,stop);if(stop>=0&&args.length===3&&args[0].text==='str'&&args[1].text==='::'&&['to_string','to_owned'].includes(args[2].text)){
     const span=[args[0].start,args.at(-1).end];if(!item.tokens.some(t=>t.type==='comment'&&t.start>=span[0]&&t.end<=span[1]))candidates.push({kind:'option-function-item',span,operand:binding(),method:args[2].text,evidence:role.evidence,receiverSpan:[rows[i].start,rows[end].end],originalDispatchProved:false});i=stop;continue;}}
   if(end>i){if(rows[i].text!=='match')walk(i+1,end,copy(current),depth+1);i=end;}
  }
 }
 walk(body+1,rows.length-1,env);if(cells>100000)return note('borrowed-text whole-function source work bound');return {candidates,skipped};
}
