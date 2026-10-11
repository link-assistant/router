// Structural Rust patterns over the pinned token cursor. No source rewriting,
// type guessing, expression evaluation or body lowering happens here.
import {TranslationError,unsupported} from './vendor/meta-language/translation/diagnostics.js';
const location=(first,last)=>({start:first.start,end:last.end});
const reserved=new Set(['ref','mut','box','if','else','let','fn','return','while','for','loop','match','async','await','unsafe','extern','const','static','struct','enum','trait','impl','pub','use','mod','move','in','where']);
export function parseBindingPattern(cursor,{resolvePath,parseLiteral}={}) {
  if(!cursor || !['peek','next','is','eat','expect','identifier'].every(method=>typeof cursor[method] === 'function'))throw new TypeError('Pattern syntax requires the pinned token cursor interface');
  const reject=(construct,token=cursor.peek())=>{throw unsupported(construct,'requires a separately checked pattern or ownership contract',location(token,token));};
  const checkTail=()=>{
    if(['..','..=','...'].some(token=>cursor.is(token)))reject('range or positional rest pattern');
    if(cursor.is('@'))reject('whole-value alias pattern');
    if(cursor.is('!'))reject('macro pattern');
  };
  const path=(segments,range)=>{
    const resolved=resolvePath?resolvePath([...segments],range):segments;
    if(!Array.isArray(resolved) || !resolved.length || resolved.some(name=>typeof name !== 'string' || !name.length))throw new TypeError('Pattern path resolver must return a checked syntactic path');
    return [...resolved];
  };
  const literal=()=>{
    const token=cursor.peek();
    if(parseLiteral) {
      const result=parseLiteral(cursor);
      if(result !== undefined && result !== null) {
        if(cursor.peek() === token)throw new TypeError('Pattern literal parser must consume its tokens');
        if(!result || typeof result !== 'object' || typeof result.k !== 'string' || !result.span)throw new TypeError('Pattern literal parser must return a source-spanned pattern');
        return result;
      }
      if(cursor.peek() !== token)throw new TypeError('Pattern literal parser consumed an unrecognized pattern');
    }
    if(token.kind === 'string'){cursor.next();return {k:'strLit',value:token.value,span:location(token,token)};}
    if(cursor.is('true') || cursor.is('false')){cursor.next();return {k:'boolLit',value:token.value === 'true',span:location(token,token)};}
    let negative=false,first=token;
    if(cursor.is('-')){cursor.next();negative=true;}
    const number=cursor.peek();
    if(number.kind === 'number') {
      if(!/^[0-9]+$/u.test(number.value) || number.suffix && !/^[ui](?:8|16|32|64|128|size)$/u.test(number.suffix))reject('nondecimal or unregistered literal pattern',number);
      cursor.next();return {k:'numLit',value:number.value,...(negative?{negative:true}:{}),...(number.suffix?{suffix:number.suffix}:{}),span:location(first,number)};
    }
    if(negative)throw new TranslationError('syntax','expected integer literal after pattern minus',location(first,number));
    return null;
  };
  const sequence=close=>{
    const items=[];
    while(!cursor.is(close)) {
      if(cursor.is('..'))reject('positional rest pattern');
      items.push(alternatives());
      if(!cursor.eat(','))break;
    }
    return {items,close:cursor.expect(close,'pattern')};
  };
  function atom() {
    const first=cursor.peek();
    if(cursor.is('&') || cursor.is('&&'))reject('reference pattern');
    if(cursor.is('['))reject('slice pattern');
    if(cursor.is('::'))reject('absolute pattern path');
    if(first.kind === 'macro')reject('macro pattern');
    if(reserved.has(first.value))reject(`${first.value} pattern`);
    let result=literal();
    if(result){
      if(cursor.is('..')||cursor.is('..=')) {
        const operator=cursor.next(),upper=literal();
        if(result.k!=='numLit'||upper?.k!=='numLit')reject('noninteger or open range pattern',operator);
        result={k:'routerIntegerRangePattern',lower:result,upper,inclusive:operator.value==='..=',span:{start:result.span.start,end:upper.span.end}};
      }
      checkTail();return result;
    }
    if(cursor.eat('_')){result={k:'wild',span:location(first,first)};checkTail();return result;}
    if(cursor.eat('(')) {
      if(cursor.is(')')){const end=cursor.next();result={k:'lit',value:null,span:location(first,end)};checkTail();return result;}
      const inner=alternatives();
      if(!cursor.eat(',')){const end=cursor.expect(')','parenthesized pattern');result={...inner,span:location(first,end)};checkTail();return result;}
      const rest=sequence(')');result={k:'routerTuplePattern',items:[inner,...rest.items],span:location(first,rest.close)};checkTail();return result;
    }
    const segments=[];
    const identifier=cursor.identifier('pattern');segments.push(identifier.value);let last=identifier;
    while(cursor.eat('::')){last=cursor.identifier('qualified pattern');segments.push(last.value);}
    const original=segments;
    const resolved=path(original,location(first,last));
    if(cursor.eat('(')) {
      const group=sequence(')');result={k:'ctor',path:resolved,args:group.items,span:location(first,group.close)};
    } else if(cursor.eat('{')) {
      const fields=[];let rest=false;
      while(!cursor.is('}')) {
        if(cursor.eat('..')){rest=true;cursor.eat(',');if(!cursor.is('}'))throw new TranslationError('syntax','record rest pattern must be last',location(cursor.peek(),cursor.peek()));break;}
        if(cursor.is('ref') || cursor.is('mut'))reject('record reference or mutable binding');
        const field=cursor.identifier('record pattern field');
        const pattern=cursor.eat(':')?alternatives():{k:'bind',name:field.value,span:location(field,field)};
        fields.push({name:field.value,pattern,span:{start:field.start,end:pattern.span.end}});
        if(!cursor.eat(','))break;
      }
      const end=cursor.expect('}','record pattern');result={k:'routerRecordPattern',path:resolved,fields,rest,span:location(first,end)};
    } else {
      result=original.length === 1 && resolved.length === 1?{k:'bindOrCtor',name:identifier.value,span:location(first,last)}:{k:'ctor',path:resolved,args:[],span:location(first,last)};
    }
    checkTail();return result;
  }
  function alternatives() {
    const leading=cursor.eat('|'),first=leading??cursor.peek(),patterns=[atom()];
    while(cursor.eat('|'))patterns.push(atom());
    return patterns.length === 1?{...patterns[0],span:{start:first.start,end:patterns[0].span.end}}:{k:'or',alternatives:patterns,span:{start:first.start,end:patterns.at(-1).span.end}};
  }
  return alternatives();
}
