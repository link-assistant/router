// Per-program checked monomorphizations. A factory supplies only standard
// layouts and operation contracts; repository function bodies still check.
import { vectorContracts } from './vector-contracts.mjs';
import { integerContracts } from './integer-contracts.mjs';
import { encodeMonomorphicType } from '../monomorphic.mjs';
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
  vector(element, span) { return this.register('vector', element, vectorContracts, span); }
  integer(type, span) { return this.register('integer', type, integerContracts, span); }
}
