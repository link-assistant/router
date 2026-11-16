// SOURCE candidate grammar only. No original closure/type/capture authority.
import {rustTokens} from './rust-structure.mjs';
import {readInlineClosureSourceTokens} from './inline-closure-source-tokens.mjs';
import {primitiveOptionCallbackContract} from './primitive-option-callback-contracts.mjs';
const ident=t=>t?.type==='ident'&&/^[\p{ID_Start}_][\p{ID_Continue}_]*$/u.test(t.text);
const fail=reason=>{throw TypeError('Local closure candidate: '+reason);};
const primitive=new Set(['u64','i64','bool']);
export function closeLocalCandidateTokens(tokens,at){
 const pairs={'(':')','[':']','{':'}'},stack=[];if(!pairs[tokens[at]?.text])return -1;
 for(let i=at;i<tokens.length;i++){const word=tokens[i].text;if(pairs[word])stack.push(pairs[word]);else if([')',']','}'].includes(word)&&stack.pop()!==word)return -1;if(!stack.length)return i;}return -1;
}
function split(tokens){const result=[];let start=0;for(let at=0;at<=tokens.length;at++){if(at===tokens.length||tokens[at].text===','){if(at>start)result.push(tokens.slice(start,at));else if(at!==tokens.length)return null;start=at+1;}else if(['(','[','{'].includes(tokens[at].text)){const end=closeLocalCandidateTokens(tokens,at);if(end<0)return null;at=end;}}return result;}
function header(item){
 const tokens=item.tokens.filter(t=>t.type!=='comment'),fn=tokens.findIndex(t=>t.text==='fn');
 if(tokens.length>200000)return null;
 if(fn<0||!ident(tokens[fn+1])||tokens.slice(0,fn).some(t=>['async','unsafe','const','extern'].includes(t.text))||tokens[fn+2]?.text!=='(')return null;
 const end=closeLocalCandidateTokens(tokens,fn+2),rows=end<0?null:split(tokens.slice(fn+3,end));if(!rows)return null;
 let body=end+1;while(body<tokens.length&&tokens[body].text!=='{')body++;
 if(body>=tokens.length||closeLocalCandidateTokens(tokens,body)!==tokens.length-1)return null;
 const params=new Map();for(const row of rows){if(!ident(row[0])||row[1]?.text!==':'||params.has(row[0].text))return null;params.set(row[0].text,row.slice(2).map(t=>t.text).join(''));}
 return {tokens,body,end:tokens.length-1,params};
}
function scalarBody(tokens,names,{format=false}={}){
 let body=tokens;if(body[0]?.text==='{'&&closeLocalCandidateTokens(body,0)===body.length-1)body=body.slice(1,-1);
 if(!body.length||body.length>4096)return {reason:'bounded nonempty primitive expression required'};
 if(body.length===1&&body[0].type==='string')return {body};
 if(format&&body.slice(0,6).map(t=>t.text).join('')==='crate::translation_core::format!'){
  if(body[6]?.text!=='('||closeLocalCandidateTokens(body,6)!==body.length-1)return {reason:'one complete explicit owned formatter required'};
  const args=split(body.slice(7,-1));if(!args?.length||args[0].length!==1||args[0][0].type!=='string')return {reason:'one actual format literal and explicit operands required'};
  // A named capture would require a genuine format-token provenance rewrite.
  // Leave literal bytes untouched; only empty/positional slots are candidates.
  const literal=args[0][0].text;if(/(?<!\{)\{\s*[\p{ID_Start}_]/u.test(literal))return {reason:'named formatter capture needs its private original format provenance'};
  for(const arg of args.slice(1)){const result=scalarBody(arg,names);if(result.reason)return result;}
  return {body,format:true};
 }
 const punctuation=new Set(['(',')','+','-','*','/','%','!','==','!=','<','>','<=','>=','&&','||','&','|','^','<<','>>']);
 for(const token of body){if(ident(token)){if(!names.has(token.text)&&!['true','false'].includes(token.text))return {reason:'free capture or unknown producer needs the missing private closure issuer'};}else if(token.type!=='number'&&!punctuation.has(token.text))return {reason:'only capture-free primitive expression tokens are candidates'};}
 return {body};
}
function freshNames(source){const names=new Set(rustTokens(source).filter(ident).map(t=>t.text));let serial=0;return ()=>{let name;do{if(++serial>4096)fail('hygienic fresh binding budget');name='__router_local_closure_'+serial;}while(names.has(name));names.add(name);return name;};}
function rewriteReferences(source,rows,bindings){let end=rows[0].start,out='';for(const token of rows){out+=source.slice(end,token.start)+(ident(token)&&bindings.has(token.text)?bindings.get(token.text):token.text);end=token.end;}return out;}
// Lexical source DATA only: original body names and named format captures stay
// unchanged. All call arguments evaluate before the new parameter block binds.
function bodyReferences(rows,visible,rootNames,earlier){
 const captures=new Set(),dependencies=new Set();let work=0;
 function visit(part,scope,depth=0){if(++work>200000||depth>32)fail('bounded local body lexical work');
  for(let at=0;at<part.length;at++){if(++work>200000)fail('complete lexical closure body work bound');const token=part[at],word=token.text;
   if(['=','+=','-=','*=','/=','%=','&=','|=','^=','<<=','>>='].includes(word))return 'assignment or captured mutation requires its separate original effect proof';
   if(['move','mut','unsafe','async','await','yield','fn','mod','use','extern','trait','impl','macro_rules','static','const','for','while','loop','match'].includes(word))return 'unknown control, mutable capture or producer scope';
   if(word==='let'){
    if(!ident(part[at+1])||part[at+2]?.text!=='=')return 'ordinary immutable local initializer required';if(earlier.has(part[at+1].text))return 'local initializer shadows an earlier closure dependency';let stop=at+3;for(;stop<part.length&&part[stop].text!==';';stop++)if(['(','[','{'].includes(part[stop].text)){const end=closeLocalCandidateTokens(part,stop);if(end<0)return 'local initializer delimiters differ';stop=end;}if(stop===part.length)return 'complete local initializer terminator required';const error=visit(part.slice(at+3,stop),new Set(scope),depth+1);if(error)return error;scope.add(part[at+1].text);at=stop;continue;
   }
   if(['(','[','{'].includes(word)){const end=closeLocalCandidateTokens(part,at);if(end<0)return 'complete lexical delimiters required';const error=visit(part.slice(at+1,end),new Set(scope),depth+1);if(error)return error;at=end;continue;}
   if(word==='|'||word==='||'){
    let begin=at+1,stop=at,parameters=[];if(word==='|'){for(stop=at+1;stop<part.length&&part[stop].text!=='|';stop++);if(stop===part.length)return 'complete inline callback parameters required';const groups=split(part.slice(at+1,stop));if(!groups||groups.some(row=>!ident(row[0])||row.length!==1))return 'ordinary inline callback parameter required';parameters=groups.map(row=>row[0].text);begin=stop+1;}
    let end=begin;for(;end<part.length&&part[end].text!==',';end++)if(['(','[','{'].includes(part[end].text)){const last=closeLocalCandidateTokens(part,end);if(last<0)return 'complete callback body delimiters required';end=last;}
    if(parameters.some(name=>earlier.has(name)||rootNames.has(name)))return 'inline callback shadows an earlier closure or captured source root';const error=visit(part.slice(begin,end),new Set([...scope,...parameters]),depth+1);if(error)return error;at=end-1;continue;
   }
   if(token.type==='string'){
    // Named placeholders remain original bytes. This census is selection DATA;
    // the real FormatChecker alone determines format and capture semantics.
    for(const match of token.text.matchAll(/(?<!\{)\{([\p{ID_Start}_][\p{ID_Continue}_]*)(?=[:}])/gu)){if(!scope.has(match[1]))return 'format capture has no unambiguous lexical source binding';if(rootNames.has(match[1]))captures.add(match[1]);}continue;
   }
   if(!ident(token)||['true','false','return','if','else'].includes(word))continue;
   if(part[at-1]?.text==='.'||part[at-1]?.text==='::'||part[at+1]?.text==='::')continue;
   if(part[at+1]?.text==='!')return 'unqualified or unknown macro requires its separate source producer';
   if(earlier.has(word)){if(part[at+1]?.text!=='(')return 'local closure escapes direct call position';dependencies.add(word);continue;}
   if(!scope.has(word))return 'free capture lacks an original lexical source binding';if(rootNames.has(word))captures.add(word);
  }return null;
 }const reason=visit(rows,new Set(visible));return {reason,captures:[...captures],dependencies:[...dependencies]};
}
export function selectLocalClosureCandidates(source,item){
 const h=header(item),residuals=[],selections=[],edits=[];if(!h)return {edits,selections,residuals:[{reason:'one ordinary complete function header required'}]};
 const {tokens,body,end,params}=h,closures=new Map(),declarations=[],allocate=freshNames(source);
 const refused=reason=>({edits:[],selections:[],residuals:[...residuals,{reason}]});
 // Only function-body top-level declarations participate. A nested declaration
 // can never authorize a same-name outer/module invocation.
 let declarationDepth=0;
 for(let at=body+1;at<end;at++){
  if(tokens[at].text==='{'){declarationDepth++;continue;}if(tokens[at].text==='}'){declarationDepth--;if(declarationDepth<0)return refused('original body block structure differs');continue;}
  if(tokens[at].text!=='let'||!ident(tokens[at+1])||tokens[at+2]?.text!=='='||!['|','||','move'].includes(tokens[at+3]?.text))continue;
  if(declarationDepth!==0)return refused('nested closure declaration needs its separate complete lexical scope');
  const name=tokens[at+1].text;if(params.has(name)||closures.has(name))return refused('local closure shadowing needs separate lexical source selection');
  let stop=at+3;for(;stop<end&&tokens[stop].text!==';';stop++)if(['(','[','{'].includes(tokens[stop].text)){const last=closeLocalCandidateTokens(tokens,stop);if(last<0)return refused('complete original closure delimiters required');stop=last;}
  if(stop>=end)return refused('complete closure declaration terminator required');
  const closureTokens=tokens.slice(at+3,stop),syntax=readInlineClosureSourceTokens(closureTokens);if(!syntax||syntax.move)return refused('plain non-move fixed-arity closure required');
  const types=[];for(const param of syntax.parameters){const type=param.tokens.slice(2).map(token=>token.text).join('');if(closures.has(param.name)||param.tokens[1]?.text!==':'||!['u64','i64','bool','&str','&crate::translation_core::Str'].includes(type))return refused('explicit unshadowed immutable primitive/shared str closure parameters required');types.push(type);}
  const references=bodyReferences(syntax.body,new Set([...params.keys(),...syntax.parameters.map(p=>p.name)]),new Set([...params.keys()].filter(name=>!syntax.parameters.some(p=>p.name===name))),closures);if(references.reason)return refused(references.reason);if(references.captures.some(name=>!primitive.has(params.get(name))&&(!params.get(name)?.startsWith('&')||params.get(name).startsWith('&mut'))))return refused('capture source role must be written Copy primitive or immutable shared reference; actual types remain unchecked');
  const row={name,start:at,stop,syntax,types,references,bodySpan:[closureTokens[syntax.bodyStart-1].end,tokens[stop].start],calls:[]};closures.set(name,row);declarations.push(row);if(closures.size>128)return refused('local candidate declaration count bound');at=stop;
 }
 if(!closures.size)return {edits,selections,residuals};
 const roots=new Set(declarations.flatMap(row=>row.references.captures)),protectedNames=new Set([...closures.keys(),...roots]);
 // Reject outer shadowing anywhere, rather than guessing which nested lexical
 // binding a moved body would see. Closure-internal locals remain intact.
 for(let at=body+1;at<end;at++){
  const declaration=declarations.find(row=>at>=row.start&&at<=row.stop);if(declaration){at=declaration.stop;continue;}
  const word=tokens[at].text;
  if(['fn','mod','use','extern','macro_rules','macro','trait','impl','struct','enum','union','type'].includes(word))return refused('nested item or producer scope needs separate lexical resolution');
  if(word==='let'||word==='for'){
   let stop=at+1;for(;stop<end&&!['=',';','{','in'].includes(tokens[stop].text);stop++);
   if(stop===end)return refused('complete original binding pattern required');
   if(tokens.slice(at+1,stop).some(token=>ident(token)&&protectedNames.has(token.text)))return refused('ordinary or pattern binding shadows a captured root/closure');
  }
  if(word==='|'||word==='||'){
   if(word==='||')continue;let stop=at+1;for(;stop<end&&tokens[stop].text!=='|';stop++);
   if(stop===end)return refused('complete ordinary callback parameter census required');
   const parameters=split(tokens.slice(at+1,stop));if(!parameters||parameters.some(part=>!ident(part[0])||part.length>1&&part[1].text!==':'))return refused('unknown callback pattern needs separate original lexical selection');
   if(parameters.some(part=>protectedNames.has(part[0].text)))return refused('callback binder shadows a captured root or closure binding');at=stop;
  }
 }
 let expansions=0,expansionBytes=0;
 function expand(row,args,depth=0){if(++expansions>512||depth>32)fail('bounded acyclic candidate instantiation');const temporary=[],binders=[];for(let n=0;n<args.length;n++){const name=allocate();temporary.push('let '+name+':'+row.types[n]+' = ('+args[n]+');');binders.push('let '+row.syntax.parameters[n].name+' = '+name+';');}
  const inner=row.syntax.body,changes=[];for(let at=0;at<inner.length;at++){const target=closures.get(inner[at].text);if(!target||!row.references.dependencies.includes(target.name))continue;if(inner[at+1]?.text!=='(')fail('original dependency direct call differs');const stop=closeLocalCandidateTokens(inner,at+1),parts=stop<0?null:split(inner.slice(at+2,stop));if(!parts||parts.length!==target.types.length)fail('original dependency argument arity differs');changes.push({span:[inner[at].start,inner[stop].end],replacement:expand(target,parts.map(part=>source.slice(part[0].start,part.at(-1).end)),depth+1)});at=stop;}
  let value=source.slice(...row.bodySpan),offset=row.bodySpan[0];for(const change of changes.reverse())value=value.slice(0,change.span[0]-offset)+change.replacement+value.slice(change.span[1]-offset);
  const result='{ '+temporary.join(' ')+' '+binders.join(' ')+' '+value+' }';if(result.length>2097152||(expansionBytes+=Buffer.byteLength(result))>2097152)fail('bounded total source candidate instantiation bytes');return result;
 }
 for(let at=body+1;at<end;at++){
  const declaration=declarations.find(row=>at>=row.start&&at<=row.stop);if(declaration){at=declaration.stop;continue;}const row=closures.get(tokens[at].text);if(!row)continue;
  if(at<row.stop||['.','::'].includes(tokens[at-1]?.text)||tokens[at+1]?.text!=='(')return refused('closure escapes, shadows, or precedes its original declaration');const stop=closeLocalCandidateTokens(tokens,at+1),args=stop<0?null:split(tokens.slice(at+2,stop));if(!args||args.length!==row.types.length)return refused('direct original invocation arity differs');if(args.some(part=>part.some(token=>closures.has(token.text))))return refused('nested closure invocation requires separate nonoverlapping expansion proof');
  edits.push({span:[tokens[at].start,tokens[stop].end],expected:source.slice(tokens[at].start,tokens[stop].end),replacement:expand(row,args.map(part=>source.slice(part[0].start,part.at(-1).end)))});row.calls.push([tokens[at].start,tokens[stop].end]);at=stop;
 }
 const referenced=new Set(declarations.flatMap(row=>row.references.dependencies));for(const row of declarations){if(!row.calls.length&&!referenced.has(row.name))return refused('unused closure declaration retained until original destruction proof');edits.push({span:[tokens[row.start].start,tokens[row.stop].end],expected:source.slice(tokens[row.start].start,tokens[row.stop].end),replacement:''});selections.push({binding:row.name,declarationSpan:[tokens[row.start].start,tokens[row.stop].end],callSpans:row.calls,parameters:row.syntax.parameters.map((param,index)=>({name:param.name,writtenType:row.types[index]})),lexicalCaptures:row.references.captures,lexicalDependencies:row.references.dependencies,captureTypesChecked:false,originalClosureEquivalence:false,executableAdmission:false});}
 return {edits:edits.sort((a,b)=>a.span[0]-b.span[0]),selections,residuals};
}
// Balanced original token intervals and lexical binding DATA; never a typed
// original capture, standard Option owner or library-admission receipt.
function delimiters(tokens){const opens=new Map(),stack=[],pairs={'(':')','[':']','{':'}'};for(let at=0;at<tokens.length;at++){const word=tokens[at].text;if(pairs[word])stack.push({at,end:pairs[word]});else if([')',']','}'].includes(word)){const row=stack.pop();if(!row||row.end!==word)return null;opens.set(at,row.at);}}return stack.length?null:opens;}
function receiverStart(tokens,dot,opens){let start=dot-1;const last=tokens[start]?.text;if([')',']','}'].includes(last)){start=opens.get(start);if(!Number.isInteger(start))return null;if(tokens[start].text==='('&&ident(tokens[start-1])){start--;while(tokens[start-1]?.text==='::'&&ident(tokens[start-2]))start-=2;}}else if(ident(tokens[start])){while(tokens[start-1]?.text==='::'&&ident(tokens[start-2]))start-=2;}else return null;if(['.','::'].includes(tokens[start-1]?.text))return null;return start;}
function lexicalAt(h,target){
 const {tokens,body,params}=h,root={bindings:new Map([...params].map(([name,writtenType])=>[name,{name,writtenType,kind:'parameter',declarationSpan:null}])),unknown:false},stack=[root],events=new Map();let work=0;
 for(let at=body+1;at<target;at++){
  if(++work>200000)return {reason:'bounded complete lexical receiver environment required'};const word=tokens[at].text;
  if(word==='{'){stack.push({bindings:new Map(),unknown:stack.at(-1).unknown});continue;}if(word==='}'){if(stack.length===1)return {reason:'original block environment differs'};stack.pop();continue;}
  if(word==='|'||word==='||'){
   let begin=at+1;if(word==='|'){let bar=at+1;for(;bar<tokens.length&&tokens[bar].text!=='|';bar++);if(bar===tokens.length)return {reason:'complete enclosing callback parameter scope required'};begin=bar+1;}
   let stop=begin;if(tokens[begin]?.text==='{'){stop=closeLocalCandidateTokens(tokens,begin);if(stop<0)return {reason:'complete enclosing callback body required'};}else{for(;stop<tokens.length&&![';',',',')','}'].includes(tokens[stop].text);stop++)if(['(','[','{'].includes(tokens[stop].text)){const last=closeLocalCandidateTokens(tokens,stop);if(last<0)return {reason:'complete enclosing callback expression required'};stop=last;}stop--;}
   if(target>=begin&&target<=stop)return {reason:'receiver inside an unissued callback scope needs its separate original lexical binder closure'};at=Math.max(at,stop);continue;
  }
  if(word==='let'){
   let equal=at+1;for(;equal<tokens.length&&!['=',';','{'].includes(tokens[equal].text);equal++);
   const name=tokens[at+1],plain=ident(name)&&tokens[at+2]?.text==='='||ident(name)&&tokens[at+2]?.text===':';
   if(!plain||tokens[equal]?.text!=='='){stack.at(-1).unknown=true;continue;}
   let stop=equal+1;for(;stop<tokens.length&&tokens[stop].text!==';';stop++)if(['(','[','{'].includes(tokens[stop].text)){const last=closeLocalCandidateTokens(tokens,stop);if(last<0)return {reason:'initializer source interval differs'};stop=last;}
   if(stop===tokens.length)return {reason:'complete original immutable initializer required'};
   const row={name:name.text,writtenType:tokens[at+2].text===':'?tokens.slice(at+3,equal).map(token=>token.text).join(''):null,kind:'local',declarationSpan:[tokens[at].start,tokens[stop].end],initializerSpan:[tokens[equal].end,tokens[stop].start]},event={frame:stack.at(-1),row};if(!events.has(stop))events.set(stop,[]);events.get(stop).push(event);
  }
  for(const event of events.get(at)??[]){if(!stack.includes(event.frame))return {reason:'initializer binding scope exited before publication'};event.frame.bindings.set(event.row.name,event.row);}
 }
 if(stack.some(frame=>frame.unknown))return {reason:'pattern/mutable/unknown scope at receiver needs separate lexical proof'};
 const bindings=new Map();for(const frame of stack)for(const [name,row]of frame.bindings)bindings.set(name,row);return {bindings};
}
function originalCallbackParts(source,tokens,open,stop){let start=open+1,boundary=tokens[open].end;const parts=[];for(let at=open+1;at<=stop;at++){if(at===stop||tokens[at].text===','){if(at>start)parts.push({tokens:tokens.slice(start,at),source:source.slice(boundary,tokens[at].start),span:[boundary,tokens[at].start]});else if(at!==stop)return null;start=at+1;boundary=tokens[at].end;}else if(['(','[','{'].includes(tokens[at].text)){const last=closeLocalCandidateTokens(tokens,at);if(last<0)return null;at=last;}}return parts;}
export function selectLazyOptionCandidates(source,item){
 const h=header(item),edits=[],selections=[],residuals=[];if(!h)return {edits,selections,residuals};const {tokens,body,end}=h,opens=delimiters(tokens);if(!opens)return {edits,selections,residuals:[{reason:'complete balanced original function tokens required'}]};
 for(let at=body+1;at<end;at++){
  if(tokens[at].text!=='.'||tokens[at+1]?.text!=='map_or_else')continue;const start=receiverStart(tokens,at,opens),stop=tokens[at+2]?.text==='('?closeLocalCandidateTokens(tokens,at+2):-1;
  const refuse=reason=>residuals.push({span:[tokens[start??at].start,stop>=0?tokens[stop].end:tokens[at+1].end],reason});
  if(start===null||stop<0){refuse('one complete balanced original receiver block/call/name required');continue;}
  const lexical=lexicalAt(h,at);if(lexical.reason){refuse(lexical.reason);continue;}
  const receiver=tokens.slice(start,at),binding=receiver.length===1?lexical.bindings.get(receiver[0].text):null,written=binding?.writtenType;
  if(written&&!['Option<u64>','std::option::Option<u64>','::std::option::Option<u64>','core::option::Option<u64>','::core::option::Option<u64>','crate::translation_core::Maybe<u64>'].includes(written)){refuse('written receiver type is not the explicit Option<u64> candidate source role');continue;}
  const pieces=originalCallbackParts(source,tokens,at+2,stop),fallback=pieces?.length===2&&readInlineClosureSourceTokens(pieces[0].tokens,{arity:0}),mapper=pieces?.length===2&&readInlineClosureSourceTokens(pieces[1].tokens,{arity:1});
  if(!fallback||!mapper||fallback.move||mapper.move||mapper.parameters[0].tokens.length!==1){refuse('two complete ordinary non-move zero/one-parameter callbacks required');continue;}
  const known=new Set(lexical.bindings.keys()),parameter=mapper.parameters[0].name,left=bodyReferences(fallback.body,known,known,new Map()),rightNames=new Set([...known,parameter]),right=bodyReferences(mapper.body,rightNames,new Set([...known].filter(name=>name!==parameter)),new Map());
  if(left.reason||right.reason){refuse(left.reason??right.reason);continue;}
  const captures=[...new Set([...left.captures,...right.captures])].map(name=>lexical.bindings.get(name));if(captures.some(row=>!row)){refuse('every source capture must rejoin its current original lexical binding');continue;}
  const map=primitiveOptionCallbackContract('u64_to_text_owned_map'),otherwise=primitiveOptionCallbackContract('text_owned_unwrap_or_else');if(!map||!otherwise)fail('complete existing owned Option operation descriptions required');const receiverSource=source.slice(tokens[start].start,tokens[at-1].end);
  const replacement=otherwise.rustPath+'('+map.rustPath+'('+receiverSource+',\n'+pieces[1].source+'\n),\n'+pieces[0].source+'\n)';
  if(edits.some(edit=>edit.span[0]<tokens[stop].end&&tokens[start].start<edit.span[1])){refuse('overlapping nested two-arm candidate requires a separate source stage');continue;}if(Buffer.byteLength(replacement)>2097152)fail('unchanged complete source replacement bound');edits.push({span:[tokens[start].start,tokens[stop].end],expected:source.slice(tokens[start].start,tokens[stop].end),replacement});selections.push({span:[tokens[start].start,tokens[stop].end],receiverSpan:[tokens[start].start,tokens[at-1].end],callbackSpans:pieces.map(piece=>piece.span),lexicalCaptures:captures,operations:[map.rustName,otherwise.rustName],receiverOnce:true,selectedBranchLazy:true,actualSourceIntervals:true,sourceRoleOnly:true,typedOriginalCaptureAuthority:false,originalClosureConstructionOrderProved:false,originalStandardOwnerProved:false,executableAdmission:false});at=stop;if(edits.length>512)fail('bounded original two-arm source selection count');
 }
 return {edits,selections,residuals};
}
