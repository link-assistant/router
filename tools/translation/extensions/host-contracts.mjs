import {createHash} from 'node:crypto';
// Crate contracts select operations by resolved paths and checked value types.
// They never supply a repository function body or waive a body obligation.
import {MethodRustParser,MethodChecker} from './methods.mjs';
import {EffectEmitter,effectData} from './effects.mjs';
import {JSON_DATA,JSON_CONTRACTS,JSON_TYPES} from './json-contracts.mjs';
import {TIME_DATA,TIME_CONTRACTS} from './time-contracts.mjs';
import {EFFECT_CONTRACTS} from './effects-contracts.mjs';
import {emitWith} from './core.mjs';
import {tokenizeRust} from './lexical.mjs';
import {sameType} from '../vendor/meta-language/translation/types.js';
import {coerce} from '../vendor/meta-language/translation/check.js';
import {TranslationError,typeError,unsupported} from '../vendor/meta-language/translation/diagnostics.js';
import {valueSchema} from '../type-layout.mjs';
import {BOOL,FLOAT} from '../vendor/meta-language/translation/types.js';
import {HostInstantiations} from './host-instantiations.mjs';
import {macroProvenance} from '../macro-provenance.mjs';

export const HOST_CONTRACTS=[...JSON_CONTRACTS.map(contract=>({...contract,family:'json',pure:true,constEligible:false})),...TIME_CONTRACTS.map(contract=>({...contract,family:'time'}))];
const pathKey=path=>path.filter((part,index)=>index!==0||part!=='crate').join('::');
const span=(start,end)=>({start:start.start,end:end.end});
export function hostData() {
  const result=[];
  const merge=(target,items,path=[])=>{for(const item of items){
    const existing=target.find(entry=>entry.name===item.name && entry.k===item.k);
    if(item.k==='module') {
      const module=existing??{...item,items:[]};if(!existing)target.push(module);
      merge(module.items,item.items,[...path,item.name]);
    } else if(!existing)target.push({...item,hostTypePath:[...path,item.name],generated:item.generated??'router-host-contract'});
  }};
  merge(result,effectData());merge(result,JSON_DATA);merge(result,TIME_DATA);return result;
}
const builtins=()=>new Set([...HOST_CONTRACTS,...EFFECT_CONTRACTS].flatMap(contract=>contract.rustPath.map((_,index)=>pathKey(contract.rustPath.slice(0,index+1)))).concat(Object.values(JSON_TYPES).map(type=>pathKey(type.path)),['serde_json::json']));
export class HostRustParser extends MethodRustParser {
  resolve(segments,path) {
    const resolved=super.resolve(segments,path);
    if(this.shadowedImportedBindings?.has(segments[0]) && resolved.length===segments.length && resolved.every((part,index)=>part===segments[index]))return ['crate','ml_unresolved_source_import',...segments];
    return resolved;
  }
  expressionMacro(token,path) {
    if(this.unresolvedMacroScope || this.unresolvedImportScope || this.shadowedBuiltinMacros?.has(token.value))throw unsupported(`macro ${token.value}!`,'requires actual source macro expansion and binding resolution',token);
    return super.expressionMacro(token,path);
  }
  type(){
    if(this.cursor.is('f64')&&!this.builtinShadow('f64')){this.cursor.next();return FLOAT;}
    const start=this.cursor.peek(),type=super.type();
    const visit=type=>{if(type.kind==='array')return visit(type.element);if(type.kind==='named'&&this.shadowedEffectRoots?.has(type.path[0]))throw unsupported('shadowed host type namespace','requires actual crate type resolution',span(start,this.cursor.peek()));};visit(type);return type;
  }
  file() {
    const surface=super.file(),support=hostData();
    const generic=surface.items.filter(item=>!item.generated||!support.some(entry=>entry.name===item.name));
    return {...surface,items:[...generic,...support]};
  }
  use(path) {
    const c=this.cursor,start=c.next(),key=path.join('.');if(!this.aliases.has(key))this.aliases.set(key,new Map());const aliases=this.aliases.get(key);
    const registered=builtins();
    const resolve=full=>full[0]==='self'?['crate',...path,...full.slice(1)]:full[0]==='super'?['crate',...path.slice(0,-1),...full.slice(1)]:full;
    const tree=prefix=>{
      if(c.eat('{')){while(!c.is('}')){tree(prefix);if(!c.eat(','))break;}c.expect('}','use');return;}
      const segment=c.identifier('use').value,full=[...prefix,segment];if(c.eat('::')){tree(full);return;}
      const alias=c.eat('as')?c.identifier('alias').value:segment;
      if(!['crate','self','super'].includes(full[0]) && !registered.has(pathKey(full)) && !['std::io::Error','std::io::Result','std::env::VarError'].includes(pathKey(full)))throw unsupported(`use ${pathKey(full)}`,'import requires a checked crate or registered host contract',span(start,c.peek()));
      if(aliases.has(alias)){aliases.set(alias,['crate','ml_unresolved_import_alias',alias]);throw typeError(`ambiguous import alias ${alias}`,span(start,c.peek()));}
      aliases.set(alias,resolve(full));
    };
    tree([]);c.expect(';','use');
  }
  primary(path,options) {
    const c=this.cursor,first=c.peek();if(first.kind!=='identifier')return super.primary(path,options);
    let offset=1;const segments=[first.value];while(c.is('::',offset)&&c.peek(offset+1).kind==='identifier'){segments.push(c.peek(offset+1).value);offset+=2;}
    const resolved=this.resolve(segments,path),contracts=HOST_CONTRACTS.filter(contract=>pathKey(contract.rustPath)===pathKey(resolved));
    if(!contracts.length)return super.primary(path,options);
    if(!c.is('(',offset)&&!(c.is('::',offset)&&c.is('<',offset+1)))return super.primary(path,options);
    if(this.shadowedEffectRoots?.has(resolved[0]))throw unsupported('shadowed host namespace','requires actual crate resolution',span(first,c.peek()));
    for(let index=0;index<offset;index++)c.next();let instantiation;
    if(c.eat('::')){c.expect('<','host type instantiation');instantiation=this.type();c.expect('>','host type instantiation');}
    c.expect('(','host operation');const args=[];while(!c.is(')')){args.push(this.expr(path));if(!c.eat(','))break;}c.expect(')','host operation');
    return {k:'routerHostCall',path:resolved,args,instantiation,span:span(first,c.peek())};
  }
}
export class HostChecker extends MethodChecker {
  constructor(language,externals){super(language,externals);this.instantiations=new HostInstantiations(this);}
  hostLambda(node,types,env,path,expected) {
    if(node.k==='routerLambda')return this.lambda(node,types,env,path,expected);
    if(node.k!=='name')throw unsupported('callback value','only checked closures or resolved function items are supported',node.span);
    const names=types.map((_,index)=>`ml_host_callback_${this.fresh++}_${index}`);
    return this.lambda({k:'routerLambda',params:names.map(name=>({name,span:node.span})),body:{k:'app',fn:node,args:names.map(name=>({k:'name',path:[name],span:node.span})),span:node.span},span:node.span},types,env,path,expected);
  }
  hostType(type,path,span) {
    const root=type=>type.kind==='named'?{...type,path:['crate',...type.path.filter((part,index)=>index!==0||part!=='crate')]}:type.kind==='array'?{...type,element:root(type.element)}:type;
    return this.resolveType(root(type),path,span);
  }
  hostCall(contracts,args,env,path,expected,range,instantiation) {
    const checked=[],errors=[];
    for(const contract of contracts) {
      if(contract.params.length!==args.length)continue;
      try {
        if(instantiation && (!contract.instantiation||!sameType(this.hostType(contract.instantiation,path,range),this.resolveType(instantiation,path,range))))throw typeError('unsupported host generic instantiation',range);
        const values=args.map((arg,index)=>{const type=this.hostType(contract.params[index],path,range);return coerce(this.expr(arg,env,path,type),type,this.language,range);});
        const type=this.hostType(contract.ret,path,range);if(expected && !sameType(type,expected))throw typeError('host operation return type mismatch',range);
        const resolved=this.instantiations.contracts.has(contract.id)?{...contract,params:contract.params.map(type=>this.hostType(type,path,range)),ret:type,runtimeInstantiation:{...contract.runtimeInstantiation,...(contract.runtimeInstantiation.validatorType?{validatorType:this.hostType(contract.runtimeInstantiation.validatorType,path,range)}:{})}}:null;
        checked.push({k:'routerHostCall',id:contract.id,args:values,type,span:range,...(resolved?{contract:resolved}:{})});
      }catch(error){if(!(error instanceof TranslationError))throw error;errors.push(error);}
    }
    if(checked.length>1)throw typeError('ambiguous registered host overload; an explicit argument type is required',range);
    if(!checked.length)throw errors[0]??typeError('no checked registered host overload',range);
    return checked[0];
  }
  application(head,args,env,path,expected,range) {
    const contracts=head.k==='name'?HOST_CONTRACTS.filter(contract=>pathKey(contract.rustPath)===pathKey(head.path)):[];
    return contracts.length?this.hostCall(contracts,args,env,path,expected,range):super.application(head,args,env,path,expected,range);
  }
  expr(node,env,path,expected,allowLiteral=false) {
    env=this.contextEnvironment(node,env,expected);
    if(node.k==='routerHostCall')return this.hostCall(HOST_CONTRACTS.filter(contract=>node.id?contract.id===node.id:pathKey(contract.rustPath)===pathKey(node.path)),node.args,env,path,expected,node.span,node.instantiation);
    if(['routerDispatchMethod','routerIteratorOperation'].includes(node.k)) {
      if(node.k==='routerDispatchMethod'&&node.object.k==='routerDispatchMethod'&&node.object.fallback?.k==='routerStringView'&&this.expr(node.object.object,env,path).type.kind==='string')return super.expr(node,env,path,expected,allowLiteral);
      const receiver=this.expr(node.object,env,path),method=node.method??node.op;
      const inherent=this.resolvedMethod(receiver.type,method,'shared');if(inherent)return this.methodCall(inherent,node.object,node.args,env,path,expected,node.span);
      const contracts=HOST_CONTRACTS.filter(contract=>contract.kind==='method'&&contract.rustPath.at(-1)===method&&sameType(this.hostType(contract.receiver,path,node.span),receiver.type));
      if(contracts.length)return this.hostCall(contracts,[node.object,...node.args],env,path,expected,node.span);
      if(receiver.type.kind==='array'&&['get','first','last'].includes(method)) {
        const instance=this.instantiations.vector(receiver.type.element,node.span);
        return this.hostCall(instance.contracts.filter(contract=>contract.rustPath.at(-1)===method),[node.object,...node.args],env,path,expected,node.span);
      }
      if(receiver.type.kind==='data'&&['and_then','or_else','is_some_and'].includes(method)) {
        const data=this.items.get(receiver.type.name),some=data?.ctors.find(ctor=>ctor.name==='Some'),none=data?.ctors.find(ctor=>ctor.name==='None');
        if(data?.standardGeneric?.kind!=='Option'||!some||!none||data.ctors.length!==2||some.fields.length!==1||none.fields.length)throw typeError('checked Option callback receiver required',node.span);
        if(node.args.length!==1)throw typeError('Option callback needs one argument',node.span);
        const element=this.resolveType(some.fields[0].type,data.modulePath,node.span);
        const callback=this.hostLambda(node.args[0],method==='or_else'?[]:[element],env,path,method==='or_else'?receiver.type:method==='is_some_and'?BOOL:expected);
        const type=method==='is_some_and'?BOOL:callback.type.result;
        if(method==='and_then') {
          const result=type.kind==='data'?this.items.get(type.name):null;
          if(result?.standardGeneric?.kind!=='Option'||result.ctors.length!==2||!result.ctors.some(ctor=>ctor.name==='None'&&ctor.fields.length===0)||!result.ctors.some(ctor=>ctor.name==='Some'&&ctor.fields.length===1))throw typeError('Option and_then callback must return a checked Option',node.span);
        }
        return {k:'routerOptionCallback',op:method,value:receiver,callback,type,span:node.span};
      }
    }
    return super.expr(node,env,path,expected,allowLiteral);
  }
  program(surface) {
    const program=super.program(surface);
    program.items.push(...this.instantiations.items);
    const forbidden=(node,seen=new Set())=>{
      if(!node||typeof node!=='object')return false;
      if(node.k==='routerHostCall'&&!(node.contract??HOST_CONTRACTS.find(contract=>contract.id===node.id))?.constEligible)return true;
      if(['call','routerFutureCall'].includes(node.k)&&!seen.has(node.fn)){seen.add(node.fn);const entry=program.declarations.get(node.fn);if(!entry||!entry.constant&&!entry.constFunction||forbidden(entry.body,seen))return true;}
      return Object.entries(node).some(([key,value])=>key!=='type'&&(Array.isArray(value)?value.some(item=>forbidden(item,seen)):forbidden(value,seen)));
    };
    for(const entry of program.declarations.values())if((entry.constant||entry.constFunction)&&forbidden(entry.body))throw unsupported('non-const host operation','pure does not imply Rust const eligibility',entry.span);
    return program;
  }
}
export class HostEmitter extends EffectEmitter {
  constructor(program,state){const reserve=node=>{if(!node||typeof node!=='object')return;if(node.k==='routerHostCall'&&node.contract)state.reserved.add('ml_host_'+node.id);for(const value of Object.values(node))Array.isArray(value)?value.forEach(reserve):reserve(value);};program.items.forEach(reserve);super(program,state);this.hosts=new Set();this.schemas=new Map();this.instantiations=new Map();this.optionCallbacks=false;for(const name of ['ml_validate_rust_value','ml_validate_json_number','ml_validate_json_map','ml_validate_duration','ml_host_duration_as_secs','ml_host_option_bind','ml_create_vector_runtime'])state.reserved.add(name);for(const contract of HOST_CONTRACTS)state.reserved.add('ml_host_'+contract.id);}
  parameterGuard(param) {
    const hasData=type=>type.kind==='data'||type.kind==='named'||type.kind==='array'&&hasData(type.element);
    if(!hasData(param.type)&&param.type.kind!=='float')return super.parameterGuard(param);
    // A helper's guard must depend only on its actual reachable parameter
    // layout, not on unrelated callers in another checked dependency closure.
    return [this.valueGuard(param.name,param.type)+';'];
  }
  valueGuard(value,type) {
    const all=valueSchema(this.program.declarations),types={};
    const visit=type=>{
      if(type.kind==='array')return visit(type.element);
      if(type.kind==='named')type={kind:'data',name:(type.path[0]==='crate'?type.path.slice(1):type.path).join('.')};
      if(type.kind!=='data'||types[type.name])return;
      const entry=all.types[type.name];if(!entry)throw new Error('missing checked value layout');types[type.name]=entry;
      for(const ctor of entry.ctors)for(const field of ctor.fields)visit(field.type);
    };visit(type);
    const schema={schemaVersion:1,types:Object.fromEntries(Object.entries(types).sort(([a],[b])=>a.localeCompare(b)))};
    const key=createHash('sha256').update(JSON.stringify(schema)).digest('hex');this.schemas.set(key,schema);
    const schemaName='ml_host_value_schema_'+key,refinementsName='ml_host_value_refinements_'+key;this.state.reserved.add(schemaName).add(refinementsName);
    return `ml_validate_rust_value(${value}, ${JSON.stringify(type)}, ${schemaName}, { refinements: ${refinementsName} })`;
  }
  expr(node) {
    if(node.k==='routerOptionCallback'){this.optionCallbacks=true;return `ml_host_option_bind(${this.expr(node.value)}, ${this.expr(node.callback)}, ${JSON.stringify(node.op)})`;}
    if(node.k!=='routerHostCall')return super.expr(node);
    const contract=node.contract??HOST_CONTRACTS.find(contract=>contract.id===node.id);if(!contract)throw new Error('missing checked host contract');
    if(contract.family==='vector') {
      const guard=this.valueGuard('values',contract.runtimeInstantiation.validatorType);
      this.instantiations.set(contract.id,`const ml_host_${contract.id} = ml_create_vector_runtime(values => ${guard}).${contract.jsExport};`);
    }
    this.hosts.add(contract.id);this.state.encode('host-contract-'+contract.id,contract.assumptions.join(' '));
    return `ml_host_${contract.id}(${node.args.map(arg=>this.expr(arg)).join(', ')})`;
  }
  file() {
    const result=super.file(),preludes=[...result.preludes];
    if(this.instantiations.size)preludes.unshift(`import { createVectorRuntime as ml_create_vector_runtime } from ${JSON.stringify((this.runtimeModule??'./runtime/effects.mjs').replace(/effects\.mjs$/u,'vector-runtime.mjs'))};`);
    for(const family of ['json','time']) {
      const used=HOST_CONTRACTS.filter(contract=>contract.family===family&&this.hosts.has(contract.id));
      if(used.length)preludes.unshift(`import { ${used.map(contract=>`${contract.jsExport} as ml_host_${contract.id}`).join(', ')} } from ${JSON.stringify((this.runtimeModule??'./runtime/effects.mjs').replace(/effects\.mjs$/u,`${family}-runtime.mjs`))};`);
    }
    if(this.schemas.size){
      preludes.unshift(`import { validateRustValue as ml_validate_rust_value } from ${JSON.stringify((this.runtimeModule??'./runtime/effects.mjs').replace(/effects\.mjs$/u,'type-layout-runtime.mjs'))};`);
      let json=false,time=false;
      for(const [schemaKey,schema] of this.schemas){
        const refinements=[];
        // Explicit contract metadata survives qualified and flattened paths.
        for(const entry of this.program.declarations.values())if(entry.k==='data'&&Object.hasOwn(schema.types,entry.fullName)) {
          const key=pathKey(entry.hostTypePath??[]);
          if(key===pathKey(JSON_TYPES.number.path)){json=true;refinements.push(`[${JSON.stringify(entry.fullName)}, ml_validate_json_number]`);}
          if(key===pathKey(JSON_TYPES.map.path)){json=true;refinements.push(`[${JSON.stringify(entry.fullName)}, ml_validate_json_map]`);}
          if(key==='std::time::Duration'){time=true;refinements.push(`[${JSON.stringify(entry.fullName)}, ml_validate_duration]`);}
        }
        preludes.push(`const ml_host_value_schema_${schemaKey} = ${JSON.stringify(schema)};`);
        preludes.push(`const ml_host_value_refinements_${schemaKey} = new Map([${refinements.join(', ')}]);`);
      }
      if(json)preludes.unshift(`import { validateJsonNumber as ml_validate_json_number, validateJsonMap as ml_validate_json_map } from ${JSON.stringify((this.runtimeModule??'./runtime/effects.mjs').replace(/effects\.mjs$/u,'json-values.mjs'))};`);
      if(time){preludes.unshift(`import { std_time_duration_as_secs as ml_host_duration_as_secs } from ${JSON.stringify((this.runtimeModule??'./runtime/effects.mjs').replace(/effects\.mjs$/u,'time-runtime.mjs'))};`);preludes.push('function ml_validate_duration(value) { ml_host_duration_as_secs(value); return true; }');}
    }
    if(this.optionCallbacks)preludes.push(`function ml_host_option_bind(value, operation, mode) { if (mode === 'or_else') return value.$ === 'Some' ? value : operation(); if (value.$ === 'Some') return operation(value.field0); return mode === 'is_some_and' ? false : Object.freeze({ $: 'None' }); }`);
    preludes.push(...this.instantiations.values());
    return {...result,preludes,text:[...preludes,...result.definitions].join('\n\n')};
  }
}
export const parseRust=(source,{shadowedEffectRoots,shadowedPreludeTypes,macroEvidence=macroProvenance(source)}={})=>{const parser=new HostRustParser(tokenizeRust(source));parser.shadowedEffectRoots=shadowedEffectRoots;parser.shadowedPreludeTypes=shadowedPreludeTypes;parser.shadowedBuiltinMacros=new Set(macroEvidence.shadowedNames);parser.shadowedImportedBindings=new Set(macroEvidence.importedNames);parser.unresolvedImportScope=macroEvidence.unresolvedImportScope;return parser.file();};
export const checkProgram=surface=>new HostChecker(surface.language,surface.externals??[]).program(surface);
export const emitJavaScript=(program,{runtimeModule,reserved=[]}={})=>emitWith(program,class extends HostEmitter{constructor(program,state){for(const name of reserved)state.reserved.add(name);super(program,state);this.runtimeModule=runtimeModule;}});
