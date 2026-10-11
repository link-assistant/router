// Source-coordinate implementation extraction for checked method lowering.
// Extraction is structural evidence; only later checked bodies are executable.
import {sourceItems} from './rust-structure.mjs';
import {tokenizeRust} from './extensions/lexical.mjs';
import {TranslationError} from './vendor/meta-language/translation/diagnostics.js';

const range = tokens => ({start:tokens[0]?.start ?? 0,end:tokens.at(-1)?.end ?? 0});
const significant = tokens => tokens.filter(token=>token.type !== 'comment');
const identifier = token => token?.type === 'ident';
function closing(tokens,start) {
  const pairs={'(':')','[':']','{':'}'},expected=[];
  if (!pairs[tokens[start]?.text]) throw new Error('balanced group must start with an opening delimiter');
  for (let at=start;at<tokens.length;at++) {
    const token=tokens[at];if (token.type !== 'punct') continue;
    if (pairs[token.text]) expected.push(pairs[token.text]);
    else if ([')',']','}'].includes(token.text)) {
      if (expected.pop() !== token.text) throw Object.assign(new Error('mismatched implementation delimiter'),{span:range([token])});
      if (!expected.length) return at;
    }
  }
  throw Object.assign(new Error('unterminated implementation delimiter'),{span:range([tokens[start]])});
}
function genericEnd(tokens,start) {
  let depth=0;
  for (let at=start;at<tokens.length;at++) {
    if (tokens[at].text === '<') depth++;
    if (tokens[at].text === '>') depth--;
    if (tokens[at].text === '>>') depth-=2;
    if (depth <= 0) return at;
  }
  return tokens.length-1;
}
function path(tokens) {
  const value=[];let expectName=true;
  if (tokens[0]?.text === '::') tokens=tokens.slice(1);
  for (const token of tokens) {
    if (expectName && identifier(token)) {value.push(token.text);expectName=false;}
    else if (!expectName && token.text === '::') expectName=true;
    else return null;
  }
  return value.length && !expectName ? value : null;
}
function prefix(tokens,start) {
  let at=start;const attributes=[];
  while (tokens[at]?.text === '#' && tokens[at+1]?.text === '[') {
    const end=closing(tokens,at+1);attributes.push({name:tokens[at+2]?.text,span:range(tokens.slice(at,end+1)),tokens:tokens.slice(at,end+1)});at=end+1;
  }
  if (tokens[at]?.text === 'pub') {at++;if (tokens[at]?.text === '(') at=closing(tokens,at)+1;}
  const modifiers=[];
  while (['async','const','unsafe','extern','default'].includes(tokens[at]?.text)) {
    modifiers.push(tokens[at++].text);if (tokens[at-1].text === 'extern' && tokens[at]?.type === 'string') at++;
  }
  return {at,attributes,modifiers};
}
function nextItem(tokens,start) {
  for (let at=start;at<tokens.length;at++) {
    if (tokens[at].text === ';') return at+1;
    if (['{','(','['].includes(tokens[at].text)) {const end=closing(tokens,at);if (tokens[at].text === '{') return tokens[end+1]?.text === ';' ? end+2 : end+1;at=end;}
  }
  return tokens.length;
}
function receiverOf(tokens) {
  const comma=tokens.findIndex(token=>token.text === ',');const first=comma < 0 ? tokens : tokens.slice(0,comma);
  if (!first.some(token=>token.text === 'self')) return {receiver:null,tokens:[]};
  const spelling=first.map(token=>token.text).join('');
  if (spelling === '&self') return {receiver:'shared',tokens:first};
  if (spelling === 'self') return {receiver:'value',tokens:first};
  if (spelling === '&mutself' || spelling === 'mutself') return {receiver:'mutable',tokens:first};
  return {receiver:spelling.startsWith('&') ? spelling.includes('mut') ? 'mutable' : 'shared' : 'value',tokens:first,unsupported:true};
}
const conditional = attributes => attributes.filter(attribute=>['cfg','cfg_attr','async_trait'].includes(attribute.name));
export function extractImplDeclarations(source,{sourcePath=null,modulePath=[]}={}) {
  const implementations=[],diagnostics=[];
  const refuse=(message,span,extra={})=>{const value={kind:'unsupported',message,span,sourcePath,...extra};diagnostics.push(value);return value;};
  let items;
  try {items=sourceItems(source);} catch (error) {return {implementations,diagnostics:[{kind:'syntax',message:error.message,span:error.span ?? null,sourcePath}]};}
  for (const item of items.filter(item=>item.term === 'impl')) {
    const tokens=significant(item.tokens),head=prefix(tokens,0),implAt=tokens.findIndex(token=>token.text === 'impl');
    if (implAt < 0) continue;
    const bodyAt=tokens.findIndex((token,index)=>index > implAt && token.text === '{');
    if (bodyAt < 0) {refuse('implementation has no body',range(tokens));continue;}
    let bodyEnd;
    try {bodyEnd=closing(tokens,bodyAt);} catch (error) {refuse(error.message,error.span ?? range(tokens));continue;}
    let header=tokens.slice(implAt+1,bodyAt),genericParameters=[];
    const obligations=[];
    if (header[0]?.text === '<') {
      const end=genericEnd(header,0);genericParameters=header.slice(1,end).map(token=>token.text);header=header.slice(end+1);
      obligations.push(refuse('generic implementation requires checked monomorphization',range(tokens.slice(implAt,bodyAt))));
    }
    const traitAt=header.findIndex(token=>token.text === 'for'),traitTokens=traitAt >= 0 ? header.slice(0,traitAt) : null,typeTokens=traitAt >= 0 ? header.slice(traitAt+1) : header;
    const typePath=path(typeTokens),traitPath=traitTokens ? path(traitTokens) : null;
    if (!typePath) obligations.push(refuse('implementation target needs a resolved monomorphic named type',range(typeTokens)));
    if (traitTokens && !traitPath) obligations.push(refuse('trait implementation needs resolved generic bounds or qualified trait syntax',range(traitTokens)));
    if (traitTokens) obligations.push(refuse('trait implementation requires declared trait and dispatch checking',range(traitTokens)));
    if (head.modifiers.includes('unsafe')) obligations.push(refuse('unsafe implementation requires a checked ownership and capability contract',range(tokens.slice(0,bodyAt))));
    for (const attribute of conditional(head.attributes)) obligations.push(refuse('conditional implementation requires compilation-condition resolution',attribute.span));
    const implementation={typePath:typePath ?? [],traitPath,genericParameters,modulePath:[...modulePath],span:range(tokens.slice(0,bodyEnd+1)),
      headerSpan:range(tokens.slice(0,bodyAt)),bodySpan:range(tokens.slice(bodyAt,bodyEnd+1)),sourcePath,attributes:head.attributes,methods:[],diagnostics:obligations};
    implementations.push(implementation);
    const members=tokens.slice(bodyAt+1,bodyEnd);
    for (let at=0;at<members.length;) {
      const start=at,methodHead=prefix(members,at);at=methodHead.at;
      if (members[at]?.text !== 'fn') {refuse('associated item needs separate constant, type or macro lowering',range(members.slice(start,nextItem(members,start))),{implementation:implementation.typePath});at=nextItem(members,start);continue;}
      const fnAt=at,nameToken=members[++at];
      if (!identifier(nameToken)) {refuse('method declaration has no identifier',range([nameToken]));at=nextItem(members,start);continue;}
      at++;const methodObligations=[];
      if (members[at]?.text === '<') {const end=genericEnd(members,at);methodObligations.push(refuse('generic method requires checked monomorphization',range(members.slice(at,end+1))));at=end+1;}
      if (members[at]?.text !== '(') {refuse('method declaration has no parameter group',range([members[at]]));at=nextItem(members,start);continue;}
      const paramsAt=at,paramsEnd=closing(members,at),params=members.slice(paramsAt+1,paramsEnd),receiver=receiverOf(params);
      at=paramsEnd+1;const returnStart=at;
      while (at < members.length && !['{',';'].includes(members[at].text)) at++;
      if (members[at]?.text !== '{') {refuse('implementation method needs a concrete body',range(members.slice(start,at+1)));at++;continue;}
      const open=at,end=closing(members,at),all=members.slice(start,end+1),bodyTokens=members.slice(open,end+1);
      if (receiver.receiver === 'mutable' || receiver.receiver === 'value') methodObligations.push(refuse('mutable or consuming receiver requires checked ownership and alias semantics',range(receiver.tokens),{method:nameToken.text}));
      if (receiver.unsupported) methodObligations.push(refuse('typed or lifetime receiver requires a resolved receiver signature',range(receiver.tokens),{method:nameToken.text}));
      if (methodHead.modifiers.includes('unsafe') || bodyTokens.some(token=>token.type === 'ident' && token.text === 'unsafe')) methodObligations.push(refuse('unsafe method construct needs a checked ownership and capability contract',range(all),{method:nameToken.text}));
      if (methodHead.modifiers.includes('extern')) methodObligations.push(refuse('foreign method ABI requires a registered effect contract',range(all),{method:nameToken.text}));
      if (members.slice(returnStart,open).some(token=>token.text === 'where')) methodObligations.push(refuse('method where clause needs resolved trait bounds',range(members.slice(returnStart,open)),{method:nameToken.text}));
      for (const attribute of conditional(methodHead.attributes)) methodObligations.push(refuse('conditional method requires compilation-condition resolution',attribute.span,{method:nameToken.text}));
      const method={name:nameToken.text,receiver:receiver.receiver,async:methodHead.modifiers.includes('async'),const:methodHead.modifiers.includes('const'),
        span:range(all),signatureSpan:range(members.slice(start,open)),bodySpan:range(bodyTokens),sourcePath,source:source.slice(all[0].start,all.at(-1).end),
        tokens:all,signatureTokens:members.slice(fnAt,open),bodyTokens,receiverSpan:receiver.tokens.length ? range(receiver.tokens) : null,
        typePath:implementation.typePath,traitPath:implementation.traitPath,modulePath:[...modulePath],attributes:methodHead.attributes,
        diagnostics:[...obligations,...methodObligations],loweringReady:!obligations.length && !methodObligations.length};
      implementation.methods.push(method);at=end+1;
    }
  }
  return {implementations,diagnostics};
}

/** Token-only self/Self substitution; literal and comment contents never change. */
export function lowerSharedMethodTokens(method,typePath=method.typePath) {
  if (!method.loweringReady || ![null,'shared'].includes(method.receiver)) throw new TranslationError('unsupported','method receiver, trait or capability obligations remain unresolved',method.span);
  if (!Array.isArray(typePath) || !typePath.length || typePath.some(name=>typeof name !== 'string' || !/^(?:r#)?[\p{L}_][\p{L}\p{N}_]*$/u.test(name))) throw new TranslationError('syntax','method lowering requires a resolved type path',method.span);
  let tokens=tokenizeRust(method.source).map(token=>({...token,start:token.start+method.span.start,end:token.end+method.span.start}));
  const rewrites=[];
  const freshName='router_self';
  if (tokens.some(token=>token.kind === 'identifier' && token.value === freshName)) throw new TranslationError('unsupported','receiver lowering name collides with a source identifier',method.span);
  const typeTokens=origin=>typePath.flatMap((value,index)=>[...(index ? [{kind:'punct',value:'::',raw:'::',...origin,generated:true}] : []),{kind:'identifier',value,raw:value,...origin,generated:true}]);
  if (method.receiver === 'shared') {
    const fn=tokens.findIndex(token=>token.value === 'fn'),open=tokens.findIndex((token,index)=>index > fn && token.value === '(');
    if (tokens[open+1]?.value !== '&' || tokens[open+2]?.value !== 'self') throw new TranslationError('syntax','shared receiver tokens differ from extracted signature',method.receiverSpan ?? method.span);
    const origin={start:tokens[open+1].start,end:tokens[open+2].end};
    const explicit=[{kind:'identifier',value:freshName,raw:freshName,...origin,generated:true},{kind:'punct',value:':',raw:':',...origin,generated:true},...typeTokens(origin)];
    tokens.splice(open+1,2,...explicit);rewrites.push({kind:'shared-receiver',span:origin,name:freshName,typePath:[...typePath]});
  }
  tokens=tokens.flatMap((token,index)=>{
    if (token.kind !== 'identifier') return [token];
    if (token.value === 'Self') {rewrites.push({kind:'self-type',span:{start:token.start,end:token.end},typePath:[...typePath]});return typeTokens({start:token.start,end:token.end});}
    if (token.value === 'self' && tokens[index+1]?.value !== '::') return [{...token,value:freshName,raw:freshName,generated:true}];
    return [token];
  });
  return {tokens,rewrites,receiver:method.receiver,receiverName:method.receiver ? freshName : null,typePath:[...typePath],
    assumptions:['Shared receivers pass immutable checked values; mutation, consuming receivers, trait dispatch and unsafe operations remain frontend refusals until their own semantics are checked.']};
}
