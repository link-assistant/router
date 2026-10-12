// Lazy, typed scalar iterators. Eager JavaScript Array.map/filter would change
// panic timing and short circuiting, so iterator adapters use generators.
// Written for patterns follow https://doc.rust-lang.org/reference/expressions/loop-expr.html#iterator-loops
// and https://doc.rust-lang.org/reference/patterns.html#reference-patterns.
import { DataRustParser, DataChecker, DataEmitter } from './data.mjs';
import { emitWith } from './core.mjs';
import { tokenizeRust } from './lexical.mjs';
import { BOOL, UNIT, array, fixed, isNumeric, sameType, rustFixedType } from '../checked-types.mjs';
import { coerce } from '../checked-coercions.mjs';
import { typeError, unsupported } from '../vendor/meta-language/translation/diagnostics.js';
import {canonicalResult,resultCollectionContext,checkResultMapItem,checkResultCollect} from './result-iterators.mjs';
import {checkedScalarEnumerate,requireScalarEnumerate,hasNextBasedEnumerate} from './scalar-enumerate.mjs';

// Iterator::count and size-taking adapters use the actual Rust usize type,
// even on a profile whose portable integer width also represents u64.
const USIZE = {...fixed(64, false),rustPrimitiveName:'usize'};
export const STANDARD_ITERATOR_ITEM_PROFILE=Object.freeze({id:'rust-1.89-scalar-iterator-items',rust:'1.89.0',sources:Object.freeze([
  Object.freeze({url:'https://raw.githubusercontent.com/rust-lang/rust/1.89.0/library/core/src/slice/iter.rs',sha256:'4a12a3f67f0bdc1370e5c5627aeef2a070503cedcd9127d8748ada4d8d3585e9',lines:Object.freeze([22,142])}),
  Object.freeze({url:'https://raw.githubusercontent.com/rust-lang/rust/1.89.0/library/core/src/iter/traits/iterator.rs',sha256:'d57130b6a4d3f18f8d28fedf5bd953da80492e2f809813ecd3dba0b3276b99ab',lines:Object.freeze([892,895,3417,3465])}),
  Object.freeze({url:'https://raw.githubusercontent.com/rust-lang/rust/1.89.0/library/core/src/iter/traits/accum.rs',sha256:'5d04c4da341f5a96aa9605ab1624a4e9bc745bd14b3b870fd683544b03291566',lines:Object.freeze([70,149])}),
])});
const operations = new Set(['iter', 'into_iter', 'map', 'filter', 'take', 'collect', 'count', 'any', 'all', 'fold', 'sum', 'copied', 'cloned','find_map','filter_map','find','flatten','enumerate']);
function sharedItem(type,span,source) {
  const result={...type,rustSourceType:true,patternOwnershipRefusal:'shared source reference',rustReference:{kind:'shared',pointee:structuredClone(type),source,span:{...span}}};
  if(type.rustOwnership?.kind==='owned')result.rustOwnership={kind:'borrowed',source:type.rustOwnership.source};
  delete result.rustBorrowLifetime;
  return result;
}
function copyItem(type,span,operation='copied/cloned') {
  const reference=type.rustReference,pointee=reference?.pointee;
  if(reference?.kind!=='shared'||!pointee)throw typeError(`${operation} requires actual shared reference iterator items`,span);
  const primitive=pointee.kind==='fixed'?rustFixedType(pointee.rustPrimitiveName):null;
  const scalar=primitive&&primitive.bits===pointee.bits&&primitive.signed===pointee.signed||pointee.kind==='bool'||pointee.kind==='string'&&pointee.rustOwnership?.kind==='borrowed'&&pointee.rustOwnership.source==='str';
  if(!pointee.rustReference&&(!scalar||pointee.rustGenericIdentityUnresolved))throw unsupported('iterator scalar Copy/Clone','requires an actual checked standard primitive or shared-reference Copy item',span);
  return structuredClone(pointee);
}
function optionPayload(checker,type,path,span) {
  const entry=type.kind==='data'?checker.items.get(type.name):null;
  const provenance=type.rustStandardGeneric??entry?.standardGeneric;
  if(type.rustReference||entry?.standardGeneric?.kind!=='Option'||provenance?.kind!=='Option'||provenance.arguments?.length!==1||entry.ctors.length!==2)throw unsupported('iterator Option result','requires an actual by-value registered standard Option',span);
  const some=entry.ctors.find(ctor=>ctor.name==='Some'),none=entry.ctors.find(ctor=>ctor.name==='None');
  if(!some||some.fields.length!==1||!none||none.fields.length)throw typeError('iterator Option result has an invalid actual checked layout',span);
  const element=checker.resolveType(provenance.arguments[0],entry.modulePath,span),layout=checker.resolveType(some.fields[0].type,entry.modulePath,span);
  if(!sameType(element,layout))throw typeError('iterator Option payload differs from its registered layout',span);
  checker.expectedOwnership?.(element,layout,path,span);checker.expectedPrimitiveIdentity?.(element,layout,path,span);
  return element;
}
function readonlyElement(checker,type,span,depth=0) {
  if(depth>128)throw unsupported('iterator nested view','requires a bounded source element profile',span);
  if(type.rustGenericIdentityUnresolved)throw unsupported('iterator element identity','requires an actual checked source element',span);
  if(type.kind==='array') {
    const pointee=type.rustReference?.kind==='shared'?type.rustReference.pointee:null;
    if(pointee?.kind!=='array'||!sameType(type.element,pointee.element))return false;
    checker.expectedOwnership?.(type.element,pointee.element,[],span);checker.expectedPrimitiveIdentity?.(type.element,pointee.element,[],span);
    return readonlyElement(checker,pointee.element,span,depth+1);
  }
  if(type.kind==='data') {
    const entry=checker.items.get(type.name);
    if(!entry||entry.k!=='data')throw typeError('borrowed iterator element requires its checked data declaration',span);
    return true;
  }
  return ['fixed','bool','string'].includes(type.kind);
}
const span = (start, end) => ({ start: start.start, end: end.end });
const containsExit = node => node && typeof node === 'object' && (['routerReturn', 'routerBreak', 'routerContinue', 'routerTry', 'routerAwait'].includes(node.k) || Object.entries(node).some(([key, value]) => key !== 'type' && (Array.isArray(value) ? value.some(containsExit) : containsExit(value))));

export class IteratorRustParser extends DataRustParser {
  awaitExpression(value, span) { throw unsupported('await expression', 'async needs a checked future contract', span); }
  tryExpression(value, span) { throw unsupported('? operator', 'error propagation requires constructor conversion semantics', span); }
  expr(path, options = {}) {
    const start = super.expr(path, options);
    const c = this.cursor;
    if (!c.is('..') && !c.is('..=')) return start;
    const inclusive = c.next().value === '..=';
    const end = super.expr(path, options);
    return { k: 'routerRange', start, end, inclusive, span: { start: start.span.start, end: end.span.end } };
  }

  forStatement(path) {
    const c = this.cursor;
    const start = c.expect('for', 'iteration');
    const patternStart=c.index;
    const borrowed = Boolean(c.eat('&'));
    if (borrowed && c.is('mut')) throw unsupported('mutable iteration reference', 'aggregate reference ownership is not lowered', c.peek());
    const mutable = Boolean(c.eat('mut'));
    const patterned=borrowed||c.is('(')||c.is('_')||['true','false'].includes(c.peek().value)||['number','string'].includes(c.peek().kind)||['::','(','{'].includes(c.peek(1).value);
    if(mutable&&patterned)throw unsupported('mutable iteration pattern','requires separately checked per-binding ownership',span(start,c.peek()));
    const pattern=patterned?this.controlPattern(path,start):null;
    let name;
    if(pattern){
      this.iterationPatternNames??=new Set(c.tokens.filter(token=>token.kind==='identifier').map(token=>token.value));
      do{name=`router_for_item_${this.iterationPatternIndex??0}`;this.iterationPatternIndex=(this.iterationPatternIndex??0)+1;}while(this.iterationPatternNames.has(name));
      this.iterationPatternNames.add(name);
    }else name=c.identifier('iteration binding').value;
    const patternTokens=c.tokens.slice(patternStart,c.index);
    const sourceIterationPattern={profile:'checked-irrefutable-for-pattern-v1',reference:borrowed,mutable,span:span(patternTokens[0],patternTokens.at(-1)),tokens:patternTokens.map(token=>({kind:token.kind,value:token.value,span:span(token,token)}))};
    c.expect('in', 'iteration');
    const object = this.expr(path, { noStruct: true });
    const loopBody = this.block(path, true);
    return { k: 'routerFor', name, mutable, object, loopBody, ...(pattern?{pattern}:{}), sourceIterationPattern, span: span(start, c.peek()) };
  }

  primary(path, options) {
    const c = this.cursor;
    if (c.is('move')) throw unsupported('move closure', 'capture snapshots need a separate ownership lowering', c.peek());
    if (!c.is('|') && !c.is('||')) return super.primary(path, options);
    const start = c.next();
    const params = [];
    if (start.value === '|') {
      while (!c.is('|')) {
        const pattern=this.callbackPatternParameter?.(path);
        if(pattern) {
          const type=c.eat(':')?this.type():null;
          params.push({...pattern,type});
          if(!c.eat(','))break;
          continue;
        }
        if(c.is('&'))throw unsupported('reference callback pattern','requires an explicit checked reference-pattern Copy profile',c.peek());
        if (c.is('mut')) throw unsupported('mutable closure parameter', 'only immutable scalar callback arguments are lowered', c.peek());
        const token = c.identifier('closure parameter');
        const type = c.eat(':') ? this.type() : null;
        if (params.some(param => param.name === token.value)) throw typeError('duplicate closure parameter', token);
        params.push({ name: token.value, type, span: span(token, c.peek()) });
        if (!c.eat(',')) break;
      }
      c.expect('|', 'closure');
    }
    if (c.is('->')) throw unsupported('closure return annotation', 'callback result types are inferred from checked bodies', c.peek());
    return { k: 'routerLambda', params, body: this.expr(path), span: span(start, c.peek()) };
  }

  methodInstantiation(name) {
    const c=this.cursor;
    if(!['collect','sum'].includes(name.value))throw unsupported('method turbofish','only checked generic operation instantiations are supported',name);
    c.expect('<','method type');
    // This single written hole is constrained by the checked Iterator::Item.
    // It grants no generic inference for parameter types or custom collections.
    if(name.value==='collect'&&c.is('Vec')&&c.is('<',1)&&c.is('_',2)&&c.is('>',3)) {
      const start=c.peek();
      if(this.builtinShadow('Vec'))throw unsupported('shadowed Vec generic','the standard prelude type requires actual resolution',start);
      c.next();c.next();c.next();c.expect('>','Vec');c.expect('>','method type');
      return {kind:'array',element:{kind:'routerIteratorElementInference'},rustSourceType:true,rustOwnership:{kind:'owned',source:'Vec'},iteratorCollectInference:{profile:'checked-standard-vec-item-inference-v1',span:span(start,c.peek())}};
    }
    const type=this.type();c.expect('>','method type');return type;
  }
  instantiatedMethod(object,name,args,explicit,range) {throw unsupported(`generic method ${name.value}`,'requires a checked monomorphic operation',range);}
  postfix(path, options) {
    const c = this.cursor;
    let value = this.primary(path, options);
    for (;;) {
      const start = c.peek();
      if (c.eat('[')) { const index = this.expr(path); c.expect(']', 'index'); value = { k: 'routerIndex', object: value, index, span: span(start, c.peek()) }; continue; }
      if (c.eat('.')) {
        if (c.peek().kind === 'number' && !c.peek().suffix && /^\d+$/u.test(c.peek().value)) {
          const index = Number(c.next().value);
          if (!Number.isSafeInteger(index)) throw unsupported('tuple index', 'requires a bounded literal tuple field', span(start, c.peek()));
          value = { k: 'routerTupleField', object: value, index, span: span(start, c.peek()) }; continue;
        }
        const name = c.identifier('field or method');
        if (name.value === 'await' && !c.is('(')) { value = this.awaitExpression(value, span(start, c.peek())); continue; }
        let explicit = null;
        if (c.eat('::')) {
          explicit=this.methodInstantiation(name);
        }
        if (!c.eat('(')) {
          if (explicit) throw typeError('type annotation on field', span(start, name));
          value = { k: 'routerField', object: value, field: name.value, span: span(start, name) }; continue;
        }
        const args = [];
        while (!c.is(')')) { args.push(this.expr(path)); if (!c.eat(',')) break; }
        c.expect(')', 'method');
        value = operations.has(name.value) && !(name.value === 'count' && (value.k === 'routerStringView' || value.k === 'routerDispatchMethod' && value.fallback?.k === 'routerStringView')) ? { k: 'routerIteratorOperation', op: name.value, object: value, args, explicit, span: span(start, c.peek()) } : explicit?this.instantiatedMethod(value,name,args,explicit,span(start,c.peek())):this.method(value, name, args, span(start, c.peek()));
        continue;
      }
      if (c.eat('?')) { value = this.tryExpression(value, span(start, c.peek())); continue; }
      return value;
    }
  }
}

// Method-precedence probes need the same contextual collection Item as the
// iterator checker. This grants no expected type to a map's input stream.
export function iteratorReceiverExpected(checker,node,path,expected) {
  if(node.k!=='routerIteratorOperation'||node.op!=='collect')return undefined;
  const infer=node.explicit?.element?.kind==='routerIteratorElementInference'&&node.explicit.iteratorCollectInference?.profile==='checked-standard-vec-item-inference-v1';
  const wanted=node.explicit&&!infer?checker.resolveType(node.explicit,path,node.span):expected;
  return resultCollectionContext(checker,wanted,path,node.span)??(wanted?.kind==='array'?{kind:'routerIterator',element:wanted.element}:undefined);
}

export class IteratorChecker extends DataChecker {
  iteratorOptionExpected(node,env,path) {
    // Infer only a genuinely resolved standard Some constructor. Its actual
    // checked argument supplies the monomorphic payload, never a user enum's
    // shape or a consuming operation's unrelated accumulator type.
    if(node.k==='if')return this.iteratorOptionExpected(node.then,env,path)??this.iteratorOptionExpected(node.else,env,path);
    if(node.k==='let') {
      const value=this.expr(node.value,env,path,node.type?this.resolveType(node.type,path,node.span):undefined);
      return this.iteratorOptionExpected(node.body,this.bindingEnvironment(env,node.name,value.type),path);
    }
    const registered=node.k==='routerRegisteredConstructor'&&node.kind==='Option'&&node.constructor==='Some';
    const callee=node.k==='app'?node.fn:null;
    if(!registered&&(callee?.k!=='name'||callee.path.at(-1)!=='Some'))return undefined;
    if(node.args.length!==1)return undefined;
    const value=this.expr(node.args[0],env,path),option=this.instantiations?.option(value.type,node.span);
    return option&&(registered||this.standardConstructor(callee.path,option,path,env,node.span))?option:undefined;
  }
  lambda(node, argumentTypes, env, path, expected, context) {
    if (node.k !== 'routerLambda' || node.params.length !== argumentTypes.length) throw typeError(`iterator callback needs ${argumentTypes.length} scalar parameters`, node.span);
    if (containsExit(node.body)) throw unsupported('closure exit', 'callback bodies must use tail values', node.span);
    if(node.params.some(param=>param.pattern)) {
      if(typeof this.patternLambda!=='function')throw unsupported('callback pattern','requires a checked pattern binding extension',node.span);
      return this.patternLambda(node,argumentTypes,env,path,expected,context);
    }
    let inner = new Map(env);
    node.params.forEach((param, index) => {
      if(param.type) {
        const declared=this.resolveType(param.type,path,param.span);
        if(!sameType(declared,argumentTypes[index]))throw typeError('callback parameter type differs from iterator element',param.span);
        this.expectedOwnership?.(argumentTypes[index],declared,path,param.span);this.expectedPrimitiveIdentity?.(argumentTypes[index],declared,path,param.span);
      }
      inner = this.bindingEnvironment(inner, param.name, argumentTypes[index]);
    });
    if(!expected&&context?.source==='iterator')expected=this.iteratorOptionExpected(node.body,inner,path);
    let body = this.expr(node.body, inner, path, expected);
    if (expected) body = coerce(body, expected, this.language, node.span);
    const result = body.type;
    // Bindings use the standard checked let vocabulary so upstream capture-
    // avoiding renaming also handles callback shadowing and reserved names.
    for (let index = node.params.length - 1; index >= 0; index--) body = { k: 'let', name: node.params[index].name, value: { k: 'routerLambdaInput', position: index, type: argumentTypes[index] }, body, type: result };
    return { k: 'routerLambda', binding: body, arity: argumentTypes.length, type: { kind: 'routerCallback', result }, span: node.span };
  }

  expr(node, env, path, expected, allowLiteral = false) {
    env = this.contextEnvironment(node, env, expected);
    if (node.k === 'let' && this.expr(node.value, env, path, node.type ? this.resolveType(node.type, path, node.span) : undefined).type.kind === 'routerIterator') throw unsupported('stored iterator', 'consumption and escaping captures need an ownership contract', node.span);
    if (node.k === 'routerRange') {
      const [start, end] = this.operands(node.start, node.end, env, path, node.span);
      if (start.type.kind !== 'fixed') throw unsupported('range domain', 'only bounded primitive integer ranges are lowered', node.span);
      return { k: 'routerRange', start, end, inclusive: node.inclusive, type: { kind: 'routerIterator', element: start.type }, span: node.span };
    }
    if (node.k === 'routerFor') {
      let object = this.expr(node.object, env, path);
      if (object.type.kind === 'array') object = this.expr({ k: 'routerIteratorOperation', op: 'into_iter', object: node.object, args: [], span: node.span }, env, path);
      if (object.type.kind !== 'routerIterator') throw typeError('for needs a supported scalar iterator', node.span);
      // A written reference pattern consumes one actual shared reference;
      // portable encoding equality alone never turns an owned Item into one.
      const element=node.sourceIterationPattern?.reference?copyItem(object.type.element,node.sourceIterationPattern.span,'for reference pattern'):object.type.element;
      const inner = this.bindingEnvironment(this.loopEnvironment(env), node.name, element, node.mutable);
      const originalBody=node.pattern?{k:'routerLetPattern',pattern:node.pattern,subject:{k:'name',path:[node.name],span:node.sourceIterationPattern.span},body:node.loopBody,span:node.sourceIterationPattern.span}:node.loopBody;
      const loopBody = this.expr(originalBody, inner, path, UNIT);
      if (!sameType(loopBody.type, UNIT)) throw typeError('for body must evaluate to unit', node.span);
      const referencePattern=node.sourceIterationPattern?.reference?{kind:'checked-shared-reference-pattern-copy',itemType:structuredClone(object.type.element),bindingType:structuredClone(element),sourceSpan:{...node.sourceIterationPattern.span}}:null;
      const binding = { k: 'let', name: node.name, mutable: node.mutable, value: { k: 'routerLoopInput', type: element, ...(referencePattern?{sourceReferencePattern:referencePattern}:{} ) }, body: loopBody, type: UNIT };
      const body = this.expr(node.body, env, path, expected, allowLiteral);
      return { k: 'routerFor', object, loopBody: binding, body, type: body.type, sourceIterationPattern:structuredClone(node.sourceIterationPattern), span: node.span };
    }
    if (node.k === 'routerLambda') throw unsupported('standalone closure', 'closures need a typed iterator callback context', node.span);
    if (node.k !== 'routerIteratorOperation') return super.expr(node, env, path, expected, allowLiteral);
    const op = node.op;
    const count = { map: 1, filter: 1, take: 1, any: 1, all: 1, fold: 2,find_map:1,filter_map:1,find:1 }[op] ?? 0;
    if (node.args.length !== count) throw typeError(`${op} expects ${count} arguments`, node.span);
    const inferElement=node.op==='collect'&&node.explicit?.kind==='array'&&node.explicit.element?.kind==='routerIteratorElementInference'&&node.explicit.iteratorCollectInference?.profile==='checked-standard-vec-item-inference-v1'&&node.explicit.rustOwnership?.kind==='owned'&&node.explicit.rustOwnership.source==='Vec';
    const wanted = node.explicit&&!inferElement ? this.resolveType(node.explicit, path, node.span) : expected;
    const resultContext=op==='collect'?resultCollectionContext(this,wanted,path,node.span):null;
    const itemExpected = resultContext??(op === 'collect' && wanted?.kind === 'array' ? { kind: 'routerIterator', element: wanted.element } : expected?.kind === 'routerIterator' ? expected : undefined);
    const object = this.expr(node.object, env, path, op==='map'?undefined:itemExpected);
    if (op === 'iter' || op === 'into_iter') {
      if (object.type.kind !== 'array') throw unsupported('iterator receiver', 'only immutable typed scalar arrays have an iterator adapter', node.span);
      const borrowed=op==='iter'||object.type.rustReference||object.type.rustOwnership?.kind==='borrowed';
      if(!readonlyElement(this,object.type.element,node.span)||object.type.element.kind==='data'&&!borrowed)throw unsupported('iterator element','only actual immutable borrowed aggregates or scalar values have a checked adapter',node.span);
      const element=borrowed?sharedItem(object.type.element,node.span,op==='iter'?'slice::iter':'borrowed-IntoIterator'):object.type.element;
      return { k: 'routerIteratorOperation', op: 'iter', object, args: [], type: { kind: 'routerIterator', element }, sourceIteratorProof:{profile:STANDARD_ITERATOR_ITEM_PROFILE.id,operation:op,borrowed:Boolean(borrowed),receiverType:structuredClone(object.type),span:{...node.span}},span: node.span };
    }
    if (object.type.kind !== 'routerIterator') throw typeError(`${op} requires a supported iterator`, node.span);
    if(hasNextBasedEnumerate(object)&&!['map','filter','take','enumerate'].includes(op))throw unsupported('Iterator::enumerate specialized consumption','requires the actual terminal/fold/count implementation; the current profile only lowers forward next-based for loops and adapters',node.span);
    const element = object.type.element;
    if(op==='enumerate')return checkedScalarEnumerate(this,node,object,USIZE);
    const callback=(node,types,expected)=>typeof this.hostLambda==='function'?this.hostLambda(node,types,env,path,expected,{source:'iterator',receiverType:object.type}):this.lambda(node,types,env,path,expected,{source:'iterator',receiverType:object.type});
    if(['find_map','filter_map'].includes(op)) {
      const wantedElement=op==='find_map'&&wanted?optionPayload(this,wanted,path,node.span):itemExpected?.element;
      const expectedOption=wantedElement?this.instantiations?.option(wantedElement,node.span):undefined;
      const transform=callback(node.args[0],[element],expectedOption),result=optionPayload(this,transform.type.result,path,node.span);
      if(!readonlyElement(this,result,node.span)&&result.kind!=='array')throw unsupported('filtered iterator payload','requires an actual checked scalar or borrowed aggregate',node.span);
      if(['array','data'].includes(result.kind)&&!result.rustReference)throw unsupported('filtered aggregate move','requires an actual shared source payload, not an owned aggregate move',node.span);
      const type=op==='find_map'?transform.type.result:{kind:'routerIterator',element:result};
      return {k:'routerIteratorOperation',op,object,args:[transform],type,sourceIteratorProof:{profile:STANDARD_ITERATOR_ITEM_PROFILE.id,operation:op,callbackOption:transform.type.result,span:{...node.span}},span:node.span};
    }
    if(op==='find') {
      const predicate=callback(node.args[0],[sharedItem(element,node.span,'Iterator::find')],BOOL);
      if(!this.instantiations?.option)throw unsupported('Iterator::find','requires canonical checked standard Option instantiation',node.span);
      return {k:'routerIteratorOperation',op,object,args:[predicate],type:this.instantiations.option(element,node.span),sourceIteratorProof:{profile:STANDARD_ITERATOR_ITEM_PROFILE.id,operation:op,itemType:element,span:{...node.span}},span:node.span};
    }
    if(op==='flatten') {
      const reference=element.rustReference,pointee=reference?.pointee;
      if(element.kind!=='array'||reference?.kind!=='shared'||pointee?.kind!=='array'||!sameType(element.element,pointee.element)||!readonlyElement(this,pointee.element,node.span))throw unsupported('Iterator::flatten','only actual shared checked slice/Vec views have an IntoIterator profile',node.span);
      const result=sharedItem(pointee.element,node.span,'borrowed-IntoIterator');
      return {k:'routerIteratorOperation',op,object,args:[],type:{kind:'routerIterator',element:result},sourceIteratorProof:{profile:STANDARD_ITERATOR_ITEM_PROFILE.id,operation:op,itemType:element,borrowed:true,span:{...node.span}},span:node.span};
    }
    if (['copied', 'cloned'].includes(op))return {...object,type:{kind:'routerIterator',element:copyItem(element,node.span)},sourceIteratorCopy:{profile:STANDARD_ITERATOR_ITEM_PROFILE.id,operation:op,itemType:structuredClone(element),span:{...node.span}}};
    if (op === 'map' || op === 'filter') {
      if(op==='filter'&&canonicalResult(this,element,path,node.span,false))throw unsupported('Result iterator filter','discarding an arbitrary Err needs a separate destruction contract',node.span);
      const transform = callback(node.args[0], [op==='filter'?sharedItem(element,node.span,'Iterator::filter'):element], op === 'filter' ? BOOL : itemExpected?.element);
      const result = op === 'map' ? transform.type.result : element;
      if(op==='map'&&canonicalResult(this,result,path,node.span,false))return {k:'routerIteratorOperation',op,object,args:[transform],type:{kind:'routerIterator',element:result},resultIteratorProof:checkResultMapItem(this,result,itemExpected,path,node.span),span:node.span};
      if (!['fixed', 'bool', 'string'].includes(result.kind)) throw unsupported('mapped iterator result', 'only scalar iterator values have a checked contract', node.span);
      return { k: 'routerIteratorOperation', op, object, args: [transform], type: { kind: 'routerIterator', element: result }, span: node.span };
    }
    if (op === 'take') {
      const limit = coerce(this.expr(node.args[0], env, path, USIZE), USIZE, this.language, node.span);
      return { k: 'routerIteratorOperation', op, object, args: [limit], type: object.type, span: node.span };
    }
    if (op === 'collect') {
      if(resultContext)return checkResultCollect(this,node,object,wanted,path);
      const type = inferElement?{...array(element),rustSourceType:true,rustOwnership:{kind:'owned',source:'Vec'}}:array(element);
      if (wanted && !sameType(type, wanted)) throw typeError('collect element does not match its expected array type', node.span);
      return { k: 'routerIteratorOperation', op, object, args: [], type,...(inferElement?{iteratorCollectInference:{profile:'checked-standard-vec-item-inference-v1',itemType:structuredClone(element),span:node.span}}:{}), span: node.span };
    }
    if (op === 'count') {
      if(wanted?.patternOwnershipRefusal||wanted?.rustPrimitiveName&&wanted.rustPrimitiveName!=='usize')throw typeError('Iterator::count returns actual by-value usize, not an equal-width Rust primitive or reference',node.span);
      return { k: 'routerIteratorOperation', op, object, args: [], type: USIZE, span: node.span };
    }
    if (op === 'any' || op === 'all') return { k: 'routerIteratorOperation', op, object, args: [callback(node.args[0], [element], BOOL)], type: BOOL, span: node.span };
    if (op === 'fold') {
      let initial = this.expr(node.args[0], env, path, wanted);
      if (wanted) initial = coerce(initial, wanted, this.language, node.span);
      if (!['fixed', 'bool', 'string'].includes(initial.type.kind)) throw unsupported('fold accumulator', 'only scalar accumulators have a checked contract', node.span);
      const combine = callback(node.args[1], [initial.type, element], initial.type);
      return { k: 'routerIteratorOperation', op, object, args: [initial, combine], type: initial.type, span: node.span };
    }
    if (op === 'sum') {
      const result=element.rustReference?copyItem(element,node.span):element;
      if (!isNumeric(result) || wanted && !sameType(result, wanted)) throw typeError('sum requires a matching checked integer element type', node.span);
      return { k: 'routerIteratorOperation', op, object, args: [], type: result,...(element.rustReference?{sourceIteratorSum:{profile:STANDARD_ITERATOR_ITEM_PROFILE.id,itemType:structuredClone(element),span:{...node.span}}}:{}),span: node.span };
    }
    throw unsupported(`iterator ${op}`, 'no checked operation', node.span);
  }
}

const HELPERS = {
  range: 'function* ml_router_range(start, end, inclusive) { for (let value = start; value < end || inclusive && value === end;) { yield value; if (value === end) return; value += 1n; } }',
  iter: 'function ml_router_iter(values, immutable) { if (immutable) ml_assert_immutable_iterator(values); return Array.prototype.values.call(values); }',
  map: 'function* ml_router_map(values, transform) { for (const value of values) yield transform(value); }',
  enumerate: 'function* ml_router_enumerate(values, advance) { let count = 0n; for (const value of values) { const index = count; count = advance(count); yield Object.freeze({ $: "Tuple", field0: index, field1: value }); } }',
  filter: 'function* ml_router_filter(values, predicate) { for (const value of values) if (predicate(value)) yield value; }',
  find_map:'function ml_router_find_map(values, transform) { for (const value of values) { const result = transform(value); if (result.$ === "Some") return result; } return Object.freeze({ $: "None" }); }',
  filter_map:'function* ml_router_filter_map(values, transform) { for (const value of values) { const result = transform(value); if (result.$ === "Some") yield result.field0; } }',
  find:'function ml_router_find(values, predicate) { for (const value of values) if (predicate(value)) return Object.freeze({ $: "Some", field0: value }); return Object.freeze({ $: "None" }); }',
  flatten:'function* ml_router_flatten(values) { for (const value of values) { ml_assert_immutable_iterator(value); yield* Array.prototype.values.call(value); } }',
  take: 'function* ml_router_take(values, limit) { while (limit > 0n) { const next = values.next(); if (next.done) return; limit -= 1n; yield next.value; } }',
  collect: 'function ml_router_collect(values) { return Object.freeze(Array.from(values)); }',
  count: 'function ml_router_count(values) { let count = 0n; for (const value of values) { void value; count += 1n; } return count; }',
  any: 'function ml_router_any(values, predicate) { for (const value of values) if (predicate(value)) return true; return false; }',
  all: 'function ml_router_all(values, predicate) { for (const value of values) if (!predicate(value)) return false; return true; }',
  fold: 'function ml_router_fold(values, initial, combine) { let result = initial; for (const value of values) result = combine(result, value); return result; }',
};

export class IteratorEmitter extends DataEmitter {
  constructor(program, state) { super(program, state); this.iteratorHelpers = new Set(); }
  fn(entry) {
    const previous=this.iteratorAggregateFunction;
    const contains=node=>node&&typeof node==='object'&&(node.k==='routerIteratorOperation'&&(['find_map','filter_map','find','flatten'].includes(node.op)||node.op==='iter'&&node.type.element.kind==='data')||Object.entries(node).some(([key,value])=>!['type','sourceIteratorProof'].includes(key)&&(Array.isArray(value)?value.some(contains):contains(value))));
    this.iteratorAggregateFunction=Boolean(contains(entry.body));
    try{return super.fn(entry);}finally{this.iteratorAggregateFunction=previous;}
  }
  iteratorParameterGuards(param) {
    if(!this.iteratorAggregateFunction||!['array','data'].includes(param.type.kind))return [];
    this.iteratorImmutability=true;return [`ml_assert_immutable_iterator(${param.name});`];
  }
  file() {
    const result = super.file();
    const helpers = [...this.iteratorHelpers].map(name => HELPERS[name]);
    if(this.iteratorImmutability||this.iteratorHelpers.has('flatten'))helpers.unshift(`import { assertImmutableIterator as ml_assert_immutable_iterator } from ${JSON.stringify((this.runtimeModule??'./runtime/effects.mjs').replace(/effects\.mjs$/u,'iterator-runtime.mjs'))};`);
    return { ...result, preludes: [...result.preludes, ...helpers], text: [...helpers, result.text].join('\n') };
  }
  statements(node, unit = false) {
    if (node.k === 'routerFor') {
      const binding = node.loopBody;
      return [`for (${binding.mutable ? 'let' : 'const'} ${binding.name} of ${this.expr(node.object)}) {`, ...this.statements(binding.body, true).map(line => '  ' + line), '}', ...this.statements(node.body, unit)];
    }
    return super.statements(node, unit);
  }
  expr(node) {
    if (node.k === 'routerRange') { this.iteratorHelpers.add('range'); return `ml_router_range(${this.expr(node.start)}, ${this.expr(node.end)}, ${node.inclusive})`; }
    if (node.k === 'routerFor') return `(() => {\n${this.statements(node).join('\n')}\n})()`;
    if (node.k === 'routerLambda') {
      const params = [];
      let body = node.binding;
      for (let index = 0; index < node.arity; index++) { params.push(body.name); body = body.body; }
      return `(${params.join(', ')}) => { ${this.statements(body).join('\n')} }`;
    }
    if (node.k !== 'routerIteratorOperation') return super.expr(node);
    const object = this.expr(node.object);
    if(node.op==='iter'){this.iteratorImmutability=true;this.iteratorHelpers.add('iter');return `ml_router_iter(${object}, ${node.type.element.kind==='data'})`;}
    if(node.op==='enumerate'){
      requireScalarEnumerate(node,USIZE);this.iteratorHelpers.add('enumerate');
      return `ml_router_enumerate(${object}, count => ${this.checked('(count + 1n)',USIZE,'add')})`;
    }
    this.state.encode('rust-lazy-checked-iterators', 'lazy checked callbacks preserve iteration order and short circuiting; shared aggregate views require immutable descriptor-only runtime guards, while owned aggregate moves and consuming an iterator twice remain unsupported');
    if (node.op === 'sum') {
      this.iteratorHelpers.add('fold');
      const addition = this.checked('(left + right)', node.type, 'add');
      return `ml_router_fold(${object}, 0n, (left, right) => ${addition})`;
    }
    this.iteratorHelpers.add(node.op);
    return `ml_router_${node.op}(${[object, ...node.args.map(arg => this.expr(arg))].join(', ')})`;
  }
}

export const parseRust = source => new IteratorRustParser(tokenizeRust(source)).file();
export const checkProgram = surface => new IteratorChecker(surface.language, surface.externals ?? []).program(surface);
export const emitJavaScript = program => emitWith(program, IteratorEmitter);
