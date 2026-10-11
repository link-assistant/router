// Per-program checked monomorphizations. A factory supplies only standard
// layouts and operation contracts; repository function bodies still check.
import { vectorContracts } from './vector-contracts.mjs';
import {fixedIntegerContracts} from './fixed-integer-contracts.mjs';
import { integerContracts } from './integer-contracts.mjs';
import {sameType} from '../checked-types.mjs';
import { encodeMonomorphicType, monomorphicTypeName } from '../monomorphic.mjs';
import { typeError, unsupported } from '../vendor/meta-language/translation/diagnostics.js';

export class HostInstantiations {
  constructor(checker) {
    this.checker = checker;
    this.contracts = new Map();
    this.items = [];
    this.instances = new Map();
  }
  register(family, type, factory, span) {
    const key = `${family}:${encodeMonomorphicType(type)}`;
    if (this.instances.has(key)) return this.instances.get(key);
    let bundle;
    try { bundle = factory(type, this.checker.items, { span }); }
    catch (error) {
      if (!(error instanceof TypeError)) throw error;
      throw unsupported(`${family} instantiation`, error.message, span);
    }
    this.checker.declare(bundle.data, []);
    this.items.push(...this.checker.checkItems(bundle.data, []));
    const registered = bundle.contracts.map(contract => ({ ...contract, family }));
    for (const contract of registered) {
      const previous = this.contracts.get(contract.id);
      if (previous && JSON.stringify(previous) !== JSON.stringify(contract)) throw typeError('conflicting checked host instantiation', span);
      this.contracts.set(contract.id, contract);
    }
    const result = { ...bundle, contracts: registered };
    this.instances.set(key, result);
    return result;
  }
  option(element,span) {
    element=this.checker.resolveType(element,[],span);
    const name=monomorphicTypeName('Option',[element]),existing=this.checker.items.get(name);
    if(existing) {
      const some=existing.ctors?.find(ctor=>ctor.name==='Some'),none=existing.ctors?.find(ctor=>ctor.name==='None');
      if(existing.k!=='data'||existing.standardGeneric?.kind!=='Option'||existing.standardGeneric.arguments?.length!==1||existing.ctors.length!==2||!some||some.fields.length!==1||!none||none.fields.length||!sameType(this.checker.resolveType(some.fields[0].type,existing.modulePath,span),element)||!sameType(this.checker.resolveType(existing.standardGeneric.arguments[0],existing.modulePath,span),element))throw typeError('conflicting canonical Option provenance or layout',span);
    } else {
      const data=[{k:'data',name,ctors:[{name:'None',fields:[]},{name:'Some',fields:[{name:'field0',type:element}]}],span,generated:'router-standard-option-instantiation',standardGeneric:{kind:'Option',arguments:[element]}}];
      this.checker.declare(data,[]);this.items.push(...this.checker.checkItems(data,[]));
    }
    return {...this.checker.resolveType({kind:'named',path:[name]},[],span),rustStandardGeneric:{kind:'Option',arguments:[structuredClone(element)]}};
  }
  result(success,error,span) {
    const arguments_=[success,error].map(type=>this.checker.resolveType(type,[],span));
    const name=monomorphicTypeName('Result',arguments_),existing=this.checker.items.get(name);
    if(existing){
      if(existing.k!=='data'||existing.standardGeneric?.kind!=='Result'||existing.standardGeneric.arguments?.length!==2||existing.ctors?.length!==2)throw typeError('conflicting canonical Result provenance or layout',span);
      for(const [index,tag]of ['Ok','Err'].entries()){
        const constructors=existing.ctors.filter(ctor=>ctor.name===tag),fields=constructors[0]?.fields;
        if(constructors.length!==1||fields?.length!==1||fields[0].name!=='field0')throw typeError('conflicting canonical Result constructor layout',span);
        for(const actual of [fields[0].type,existing.standardGeneric.arguments[index]]){
          const resolved=this.checker.resolveType(actual,existing.modulePath,span);
          if(!sameType(resolved,arguments_[index]))throw typeError('conflicting canonical Result payload identity',span);
          this.checker.expectedOwnership?.(resolved,arguments_[index],[],span);this.checker.expectedPrimitiveIdentity?.(resolved,arguments_[index],[],span);
        }
      }
    }else{
      const data=[{k:'data',name,ctors:['Ok','Err'].map((tag,index)=>({name:tag,fields:[{name:'field0',type:arguments_[index]}]})),span,generated:'router-standard-result-instantiation',standardGeneric:{kind:'Result',arguments:arguments_}}];
      this.checker.declare(data,[]);this.items.push(...this.checker.checkItems(data,[]));
    }
    return {...this.checker.resolveType({kind:'named',path:[name]},[],span),rustStandardGeneric:{kind:'Result',arguments:structuredClone(arguments_)}};
  }
  vector(element, span) { return this.register('vector', element, vectorContracts, span); }
  fixed(type,span) {return this.register('fixed',type,fixedIntegerContracts,span);}
  integer(type, span) { return this.register('integer', type, integerContracts, span); }
}
