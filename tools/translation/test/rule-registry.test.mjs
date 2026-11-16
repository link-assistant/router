// Independent registry/order/refusal case source. All execution UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRuleRegistry,createDiscoveredRulePipeline} from '../rule-registry.mjs';
const rule=(id,phase='language',changes={})=>({id,phase,apply:value=>value,...changes});
test('repository selection discovers transitive language prerequisites and stable actual order',()=>{
 const calls=[],context={marker:7},run=id=>(value,actual)=>{assert.equal(actual,context);calls.push(id);return value+id;};
 const registry=createRuleRegistry([
  rule('package','repository',{requires:['emit'],apply:run('P')}),
  rule('parse','language',{apply:run('A')}),
  rule('emit','language',{requires:['check'],apply:run('E')}),
  rule('check','language',{requires:['parse'],apply:run('C')}),
  rule('alternative','language',{conflicts:['emit'],apply:()=>assert.fail('unselected alternative executed')}),
 ]),pipeline=registry.compile(['package']);
 assert.deepEqual(pipeline.description,[{phase:'language',rules:['parse','check','emit']},{phase:'repository',rules:['package']}]);
 assert.deepEqual(pipeline.discovery.roots,['package']);assert.deepEqual(pipeline.discovery.dependencies,['parse','emit','check']);assert.equal(pipeline.discovery.semanticAuthority,false);
 assert.equal(pipeline.run('',context).value,'ACEP');assert.deepEqual(calls,['A','C','E','P']);assert.deepEqual(pipeline.run('',context).trace.map(row=>row.id),['parse','check','emit','package']);
});
test('before/after order is deterministic and does not activate optional references',()=>{
 const registry=createRuleRegistry([rule('last','language',{after:['middle']}),rule('first','language',{before:['middle']}),rule('middle'),rule('repo','repository')]);
 assert.deepEqual(registry.compile(['last','middle','first']).discovery.selected,['first','middle','last']);
 assert.deepEqual(registry.compile(['first','middle','last']).discovery.selected,['first','middle','last']);
 assert.deepEqual(registry.compile(['last']).discovery.selected,['last']);
 assert.deepEqual(createRuleRegistry([rule('b'),rule('a')]).compile().discovery.selected,['b','a']);
});
test('source discovery runs afresh and selects prerequisites without granting a semantic verdict',()=>{
 let probes=0;const registry=createRuleRegistry([
  rule('language:double','language',{apply:value=>value*2}),
  rule('repository:add','repository',{requires:['language:double'],discover:(value,context)=>{probes++;return value>context.threshold;},apply:(value,context)=>value+context.add}),
 ]);
 const yes=registry.runDiscovered(4,{threshold:3,add:1});assert.equal(yes.value,9);assert.deepEqual(yes.discovery.selected,['language:double','repository:add']);assert.equal(yes.discovery.sourceDiscovered,true);assert.equal(yes.discovery.semanticAuthority,false);
 const no=registry.runDiscovered(2,{threshold:3,add:100});assert.equal(no.value,2);assert.deepEqual(no.discovery.selected,[]);assert.equal(probes,2);
 let getter=0;const thenable={get then(){getter++;throw Error('must not assimilate');}};
 assert.throws(()=>createRuleRegistry([rule('bad','language',{discover:()=>thenable})]).discover(null));assert.equal(getter,0);
 assert.throws(()=>createRuleRegistry([rule('async','language',{discover:async()=>true})]));
});
test('missing references, cycles, repository-before-language edges and conflicts fail before callbacks',()=>{
 let called=0;const apply=value=>{called++;return value;};
 assert.throws(()=>createRuleRegistry([rule('a','language',{requires:['missing'],apply})]));
 for(const rows of [
  [rule('a','language',{requires:['b'],apply}),rule('b','language',{requires:['a'],apply})],
  [rule('a','language',{before:['b'],apply}),rule('b','language',{before:['a'],apply})],
  [rule('a','language',{requires:['package'],apply}),rule('package','repository',{apply})],
  [rule('a','language',{apply}),rule('package','repository',{before:['a'],apply})],
  [rule('a','language',{conflicts:['b'],apply}),rule('b','language',{apply})],
  [rule('a','language',{exclusive:['whole-caller-body'],apply}),rule('b','repository',{exclusive:['whole-caller-body'],apply})],
 ])assert.throws(()=>createRuleRegistry(rows).compile());
 assert.equal(called,0);
 assert.deepEqual(createRuleRegistry([rule('a','language',{exclusive:['body']}),rule('b','language',{exclusive:['body']})]).compile(['a']).discovery.selected,['a']);
});
test('declaration mutation cannot change a compiled registry and each run uses its current input/context',()=>{
 const dependencies=['a'],a=rule('a','language',{apply:(value,context)=>value+context.increment}),b=rule('b','repository',{requires:dependencies,apply:value=>value*2});
 const registry=createRuleRegistry([b,a]);dependencies.push('missing');a.apply=()=>assert.fail('mutated declaration callback executed');b.phase='language';
 const pipeline=registry.compile(['b']);assert.equal(pipeline.run(3,{increment:4}).value,14);assert.equal(pipeline.run(10,{increment:1}).value,22);
 assert.equal(Object.isFrozen(registry.description),true);assert.equal(Object.isFrozen(pipeline.discovery.selected),true);
});
test('original runner result/exception behavior and the two empty phases remain intact',()=>{
 const marker={};assert.equal(createDiscoveredRulePipeline([],[]).run(marker).value,marker);assert.deepEqual(createDiscoveredRulePipeline([],[]).description,[{phase:'language',rules:[]},{phase:'repository',rules:[]}]);
 for(const primary of [undefined,null,false,0,'',Object.freeze(new Error('rule primary'))]){let thrown=false;try{createDiscoveredRulePipeline([rule('throw','language',{apply:()=>{throw primary;}})]).run(null);}catch(error){thrown=true;assert.equal(error,primary);}assert.equal(thrown,true);}
 let getters=0;const inherited=Object.create({get then(){getters++;throw Error('inherited then remains opaque');}});assert.equal(createDiscoveredRulePipeline([rule('opaque','language',{apply:()=>inherited})]).run(null).value,inherited);assert.equal(getters,0);
 assert.throws(()=>createDiscoveredRulePipeline([rule('promise','language',{apply:()=>Promise.resolve(1)})]).run(null));
});
test('descriptor, reference and selection bounds reject getters/proxies/sparse payloads without invoking them',()=>{
 let observed=0;const row={id:'a',phase:'language',get apply(){observed++;throw Error('getter');}};
 for(const input of [[row],new Proxy([rule('a')],{}),[,rule('a')],Array(4097),[rule('a'),rule('a')],[rule('a','third')]])assert.throws(()=>createRuleRegistry(input));
 assert.equal(observed,0);const registry=createRuleRegistry([rule('a')]);assert.throws(()=>registry.compile(['a','a']));assert.throws(()=>registry.compile(['missing']));assert.throws(()=>registry.compile(new Proxy(['a'],{})));
 const ids=Array.from({length:4096},(_,at)=>'r'+at),rows=ids.map((id,at)=>rule(id,'language',{requires:at<9?ids:[]}));assert.throws(()=>createRuleRegistry(rows),/aggregate/u);
});
