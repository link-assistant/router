// Typed host effects and lazy Rust futures. Contracts describe standard-library
// operations; repository bodies still pass through the checker and semantic IR.
import { IteratorRustParser, IteratorChecker, IteratorEmitter } from './iterators.mjs';
import { EFFECT_DATA, EFFECT_CONTRACTS, effectContract } from './effects-contracts.mjs';
import { emitWith } from './core.mjs';
import { tokenizeRust } from './lexical.mjs';
import { sameType } from '../checked-types.mjs';
import { coerce } from '../checked-coercions.mjs';
import { typeError, unsupported } from '../vendor/meta-language/translation/diagnostics.js';
const ASYNC = Symbol('async function');
const ROOT = Symbol('effect body context');
const span = (a,b) => ({start:a.start,end:b.end});
const contains = (node,k) => node && typeof node === 'object' && (node.k === k || Object.entries(node).some(([key,value])=>key !== 'type' && (Array.isArray(value)?value.some(item=>contains(item,k)):contains(value,k))));
const builtin = value => Array.isArray(value) ? value.map(builtin) : value && typeof value === 'object' ? {...Object.fromEntries(Object.entries(value).map(([key,item])=>[key,builtin(item)])),...(['data','module'].includes(value.k)?{generated:'router-standard-effect-contract'}:{})} : value;
export const effectData = () => builtin(EFFECT_DATA);
const future = value => ({kind:'routerFuture',value});

export class EffectRustParser extends IteratorRustParser {
  file() {
    const surface = super.file();
    // Builtin Result declarations take precedence over identical generated
    // instantiations, with precisely the same named layout.
    const support = effectData();
    surface.items = [...surface.items.filter(item=>!item.generated || !support.some(entry=>entry.name === item.name)),...support];
    return surface;
  }
  fn(path) { const async = Boolean(this.cursor.eat('async')); return {...super.fn(path),async}; }
  constItem(path) {return {...super.constItem(path),constant:true};}
  awaitExpression(value,span) {return {k:'routerAwait',value,span};}
  tryExpression(value,span) {return {k:'routerTry',value,span};}
  use(path) {
    const c = this.cursor, start=c.next(), key=path.join('.');
    if (!this.aliases.has(key)) this.aliases.set(key,new Map());
    const aliases=this.aliases.get(key);
    const absolute=full=>full[0] === 'crate'?full:full[0] === 'self'?['crate',...path,...full.slice(1)]:full[0] === 'super'?['crate',...path.slice(0,-1),...full.slice(1)]:full;
    const tree=prefix=>{
      if(c.eat('{')) {while(!c.is('}')) {tree(prefix);if(!c.eat(','))break;}c.expect('}','use');return;}
      const segment=c.identifier('use').value, full=[...prefix,segment];
      if(c.eat('::')) {tree(full);return;}
      const alias=c.eat('as')?c.identifier('alias').value:segment;
      if (!['crate','self','super'].includes(full[0]) && !EFFECT_CONTRACTS.some(contract=>full.every((part,index)=>contract.rustPath[index] === part)) && !['std::io::Error','std::io::Result','std::env::VarError'].includes(full.join('::'))) throw unsupported(`use ${full.join('::')}`,'import requires a checked crate or effect contract',span(start,c.peek()));
      if(aliases.has(alias)) { aliases.set(alias, ['crate', 'ml_unresolved_import_alias', alias]); throw typeError(`ambiguous import alias ${alias}`,span(start,c.peek())); }
      aliases.set(alias,absolute(full));
    };
    tree([]);c.expect(';','use');
  }
  type() {
    const c=this.cursor, first=c.peek();let offset=1;
    if(first.kind !== 'identifier') return super.type();
    const segments=[first.value];
    while(c.is('::',offset)&&c.peek(offset+1).kind === 'identifier') {segments.push(c.peek(offset+1).value);offset+=2;}
    if(this.resolve(segments,this.modulePath).join('::') !== 'std::io::Result') return super.type();
    for(let index=0;index<offset;index++)c.next();c.expect('<','io Result');
    const ok=this.type();c.expect('>','io Result');
    return this.genericType('Result',[ok,{kind:'named',path:['std','io','Error']}],span(first,c.peek()));
  }
  primary(path,options) {
    const c=this.cursor,first=c.peek();let offset=1;
    if(first.kind !== 'identifier')return super.primary(path,options);
    const segments=[first.value];
    while(c.is('::',offset)&&c.peek(offset+1).kind === 'identifier') {segments.push(c.peek(offset+1).value);offset+=2;}
    const contract=effectContract(this.resolve(segments,path));
    if(!contract || !c.is('(',offset))return super.primary(path,options);
    if(this.shadowedEffectRoots?.has(contract.rustPath[0]) || this.shadowedEffectRoots?.has('std')) throw unsupported('shadowed effect namespace','requires actual module resolution',span(first,c.peek()));
    if (['std_env_set_var', 'std_env_remove_var'].includes(contract.id)) throw unsupported('environment mutation authorization', 'Rust 2024 unsafe call-site authorization requires checked unsafe-block lowering', span(first,c.peek()));
    for(let index=0;index<=offset;index++)c.next();
    const args=[];while(!c.is(')')) {args.push(this.expr(path));if(!c.eat(','))break;}c.expect(')','effect');
    return {k:'routerEffectCall',id:contract.id,args,span:span(first,c.peek())};
  }
}
const __routerOriginalBirth286_EffectRustParser=[EffectRustParser,EffectRustParser.prototype,IteratorRustParser,[["constructor",EffectRustParser],["file",EffectRustParser.prototype["file"]],["fn",EffectRustParser.prototype["fn"]],["constItem",EffectRustParser.prototype["constItem"]],["awaitExpression",EffectRustParser.prototype["awaitExpression"]],["tryExpression",EffectRustParser.prototype["tryExpression"]],["use",EffectRustParser.prototype["use"]],["type",EffectRustParser.prototype["type"]],["primary",EffectRustParser.prototype["primary"]]]];


export class EffectChecker extends IteratorChecker {
  program(surface) {
    this.effectBodies=new WeakMap();
    const visit=items=>items.forEach(item=>{if(item.k === 'module')visit(item.items);if(item.k === 'fn')this.effectBodies.set(item.body,{async:Boolean(item.async),constant:Boolean(item.constant)});});
    visit(surface.items);
    const program = super.program(surface);
    const effectful = (node, seen = new Set()) => {
      if (!node || typeof node !== 'object') return false;
      if (node.k === 'routerEffectCall') return true;
      if (['call', 'routerFutureCall'].includes(node.k) && !seen.has(node.fn)) { seen.add(node.fn); if (effectful(program.declarations.get(node.fn)?.body, seen)) return true; }
      return Object.entries(node).some(([key,value]) => key !== 'type' && (Array.isArray(value) ? value.some(item=>effectful(item,seen)) : effectful(value,seen)));
    };
    for (const entry of program.declarations.values()) if (entry.constant && effectful(entry.body)) throw unsupported('constant effect', 'transitive compile-time effects are not permitted', entry.span);
    return program;
  }
  contextEnvironment(node,env,expected) {
    env=super.contextEnvironment(node,env,expected);
    if(this.effectBodies.has(node)) {const context=this.effectBodies.get(node);env=new Map(env).set(ASYNC,context.async).set(ROOT,context);}
    return env;
  }
  application(head,args,env,path,expected,span) {
    const entry=head.k === 'name'?this.lookup(head.path,path,span):null;
    const result=super.application(head,args,env,path,entry?.async?undefined:expected,span);
    return entry?.async?{...result,k:'routerFutureCall',type:future(result.type)}:result;
  }
  expr(node,env,path,expected,allowLiteral=false) {
    env=this.contextEnvironment(node,env,expected);
    if(node.k === 'routerEffectCall') {
      const contract=EFFECT_CONTRACTS.find(contract=>contract.id === node.id);
      if(!contract)throw typeError('unknown semantic effect contract',node.span);
      if(env.get(ROOT)?.constant)throw unsupported('constant effect','compile-time effects are not permitted',node.span);
      if(node.args.length !== contract.params.length)throw typeError(`${contract.id} argument count`,node.span);
      const args=node.args.map((arg,index)=>coerce(this.expr(arg,env,path,contract.params[index]),contract.params[index],this.language,node.span));
      const type=this.resolveType({...contract.ret,...(contract.ret.kind === 'named'?{path:['crate',...contract.ret.path]}:{})},path,node.span);
      return {...node,args,type:contract.async?future(type):type,async:contract.async};
    }
    if(node.k === 'routerAwait') {
      if(!env.get(ASYNC))throw unsupported('await outside async function','future polling requires an async body',node.span);
      const value=this.expr(node.value,env,path);
      if(value.type.kind !== 'routerFuture')throw typeError('await requires a checked future',node.span);
      return {...node,value,type:value.type.value};
    }
    if(node.k === 'routerTry') {
      const value=this.expr(node.value,env,path),returns=this.functionResult(env);
      const input=value.type.kind === 'data'?this.items.get(value.type.name):null;
      const output=returns?.kind === 'data'?this.items.get(returns.name):null;
      const option=input?.standardGeneric?.kind==='Option';
      if(!['Option','Result'].includes(input?.standardGeneric?.kind)||input.standardGeneric.kind!==output?.standardGeneric?.kind)throw unsupported('? operand/result','requires actual standard Option/Result provenance',node.span);
      const good=option?'Some':'Ok',bad=option?'None':'Err';
      const success=input?.ctors.find(ctor=>ctor.name === good),failure=input?.ctors.find(ctor=>ctor.name === bad),outFailure=output?.ctors.find(ctor=>ctor.name === bad);
      if(!success || !failure || !outFailure || input.ctors.length !== 2 || output.ctors.length !== 2)throw unsupported('? operand/result','only checked Option/Result propagation is lowered',node.span);
      if(success.fields.length !== 1 || failure.fields.length !== outFailure.fields.length || failure.fields.some((field,index)=>!sameType(field.type,outFailure.fields[index].type)))throw unsupported('? error conversion','From conversion requires a resolved trait implementation',node.span);
      return {...node,value,option,type:success.fields[0].type};
    }
    if(node.k === 'let' && this.expr(node.value,env,path,node.type?this.resolveType(node.type,path,node.span):undefined).type.kind === 'routerFuture')throw unsupported('stored future','escaping captures and future consumption need an ownership contract',node.span);
    return super.expr(node,env,path,expected,allowLiteral);
  }
}
const __routerOriginalBirth286_EffectChecker=[EffectChecker,EffectChecker.prototype,IteratorChecker,[["constructor",EffectChecker],["program",EffectChecker.prototype["program"]],["contextEnvironment",EffectChecker.prototype["contextEnvironment"]],["application",EffectChecker.prototype["application"]],["expr",EffectChecker.prototype["expr"]]]];


const FUTURE = `function ml_router_future(operation) { let started = false; let pending; return { then(resolve, reject) { if (!started) { started = true; pending = globalThis.Promise.resolve().then(operation); } return (pending ?? globalThis.Promise.reject(new Error('future polling invariant'))).then(resolve, reject); } }; }
function ml_router_defer(operation, args) { return ml_router_future(() => operation(...args)); }`;
const TRY = `const ml_router_try_return = Symbol('checked Rust early return');
function ml_router_try(value, option) {
  if (option) {
    if (value.$ === 'Some') return value.field0;
    if (value.$ === 'None') throw { [ml_router_try_return]: true, value: Object.freeze({ $: 'None' }) };
  } else {
    if (value.$ === 'Ok') return value.field0;
    if (value.$ === 'Err') throw { [ml_router_try_return]: true, value: Object.freeze({ $: 'Err', field0: value.field0 }) };
  }
  throw new TypeError('checked Rust ? operand does not match its standard Option/Result mode');
}
function ml_router_propagated(error) { return error && error[ml_router_try_return] === true; }`;
export class EffectEmitter extends IteratorEmitter {
  constructor(program,state) {super(program,state);this.effects=new Set();this.effectHelpers=new Set();for(const name of ['ml_router_future','ml_router_defer','ml_router_try','ml_router_try_return','ml_router_propagated'])state.reserved.add(name);for(const contract of EFFECT_CONTRACTS)state.reserved.add(`ml_effect_${contract.id}`);}
  fn(entry) {
    this.temporaries = 0;
    const text=super.fn(entry),open=text.indexOf('{'),prefix=text.slice(0,open+1),body=text.slice(open+1,-1);
    const propagated=contains(entry.body,'routerTry');
    if(propagated)this.effectHelpers.add('try');
    const checked=propagated?`\ntry {${body}\n} catch (ml_router_error) { if (ml_router_propagated(ml_router_error)) return ml_router_error.value; throw ml_router_error; }\n`:body;
    if(!entry.async)return prefix+checked+'}';
    this.effectHelpers.add('future');
    return `${prefix}\nreturn ml_router_future(async () => {${checked}});\n}`;
  }
  expr(node) {
    if(node.k === 'routerEffectCall') {
      this.effects.add(node.id);
      this.state.encode(`host-effect-${node.id}`,EFFECT_CONTRACTS.find(contract=>contract.id === node.id).assumptions.join(' '));
      const args=node.args.map(arg=>this.expr(arg));
      if(node.async) {this.effectHelpers.add('future');return `ml_router_defer(ml_effect_${node.id}, [${args.join(', ')}])`;}
      return `ml_effect_${node.id}(${args.join(', ')})`;
    }
    if(node.k === 'routerFutureCall')return super.expr({...node,k:'call'});
    if(node.k === 'routerAwait')return `(await ${this.expr(node.value)})`;
    if(node.k === 'routerTry') {this.effectHelpers.add('try');return `ml_router_try(${this.expr(node.value)}, ${node.option})`;}
    const text=super.expr(node);
    if(contains(node,'routerAwait')&&text.startsWith('(() => {'))return `(await ${text.replace('(() => {','(async () => {')})`;
    return text;
  }
  file() {
    const result=super.file(),preludes=[...result.preludes];
    if(this.effects.size)preludes.unshift(`import { ${[...this.effects].map(id=>`${id} as ml_effect_${id}`).join(', ')} } from ${JSON.stringify(this.runtimeModule ?? './runtime/effects.mjs')};`);
    if(this.effectHelpers.has('future'))preludes.push(FUTURE);
    if(this.effectHelpers.has('try'))preludes.push(TRY);
    return {...result,preludes,text:[...preludes,...result.definitions].join('\n\n')};
  }
}
export const parseRust=(source,{shadowedEffectRoots}={})=>{const parser=new EffectRustParser(tokenizeRust(source));parser.shadowedEffectRoots=shadowedEffectRoots;return parser.file();};
export const checkProgram=surface=>new EffectChecker(surface.language,surface.externals??[]).program(surface);
export const emitJavaScript=(program,{runtimeModule,reserved=[]}={})=>emitWith(program,class extends EffectEmitter {constructor(program,state){for(const name of reserved)state.reserved.add(name);super(program,state);this.runtimeModule=runtimeModule;}});

export function originalClassDefinitionBirths(){return {records:[__routerOriginalBirth286_EffectRustParser?[__routerOriginalBirth286_EffectRustParser[0],__routerOriginalBirth286_EffectRustParser[1],__routerOriginalBirth286_EffectRustParser[2],[[__routerOriginalBirth286_EffectRustParser[3][0][0],__routerOriginalBirth286_EffectRustParser[3][0][1]],[__routerOriginalBirth286_EffectRustParser[3][1][0],__routerOriginalBirth286_EffectRustParser[3][1][1]],[__routerOriginalBirth286_EffectRustParser[3][2][0],__routerOriginalBirth286_EffectRustParser[3][2][1]],[__routerOriginalBirth286_EffectRustParser[3][3][0],__routerOriginalBirth286_EffectRustParser[3][3][1]],[__routerOriginalBirth286_EffectRustParser[3][4][0],__routerOriginalBirth286_EffectRustParser[3][4][1]],[__routerOriginalBirth286_EffectRustParser[3][5][0],__routerOriginalBirth286_EffectRustParser[3][5][1]],[__routerOriginalBirth286_EffectRustParser[3][6][0],__routerOriginalBirth286_EffectRustParser[3][6][1]],[__routerOriginalBirth286_EffectRustParser[3][7][0],__routerOriginalBirth286_EffectRustParser[3][7][1]],[__routerOriginalBirth286_EffectRustParser[3][8][0],__routerOriginalBirth286_EffectRustParser[3][8][1]]]]:null,__routerOriginalBirth286_EffectChecker?[__routerOriginalBirth286_EffectChecker[0],__routerOriginalBirth286_EffectChecker[1],__routerOriginalBirth286_EffectChecker[2],[[__routerOriginalBirth286_EffectChecker[3][0][0],__routerOriginalBirth286_EffectChecker[3][0][1]],[__routerOriginalBirth286_EffectChecker[3][1][0],__routerOriginalBirth286_EffectChecker[3][1][1]],[__routerOriginalBirth286_EffectChecker[3][2][0],__routerOriginalBirth286_EffectChecker[3][2][1]],[__routerOriginalBirth286_EffectChecker[3][3][0],__routerOriginalBirth286_EffectChecker[3][3][1]],[__routerOriginalBirth286_EffectChecker[3][4][0],__routerOriginalBirth286_EffectChecker[3][4][1]]]]:null],bindings:[],factoryCalls:[0,0]};}
