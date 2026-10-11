// Per-program checked monomorphizations. A factory supplies only standard
// layouts and operation contracts; repository function bodies still check.
import { vectorContracts } from './vector-contracts.mjs';
import {fixedIntegerContracts} from './fixed-integer-contracts.mjs';
import { integerContracts } from './integer-contracts.mjs';
import {sameType} from '../vendor/meta-language/translation/types.js';
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
  vector(element, span) { return this.register('vector', element, vectorContracts, span); }
  fixed(type,span) {return this.register('fixed',type,fixedIntegerContracts,span);}
  integer(type, span) { return this.register('integer', type, integerContracts, span); }
}
