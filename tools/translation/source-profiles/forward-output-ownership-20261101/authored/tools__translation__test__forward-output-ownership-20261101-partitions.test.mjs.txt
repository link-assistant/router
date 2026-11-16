// Independent physical coordinate cases, SOURCE ONLY / UNRUN. These DATA
// descriptors do not replace actual private producer or raw-byte checks.
import test from 'node:test';
import assert from 'node:assert/strict';
import {describeForwardOutputPartitions,FORWARD_OWNERSHIP_PRODUCERS,FORWARD_SHARED_OUTPUT_ROOTS,FORWARD_OWNED_OUTPUT_ROOTS} from '../forward-output-ownership-20261101-partitions.mjs';
const first='profiles/first-'+ 'a'.repeat(64),second='profiles/second-'+ 'b'.repeat(64),index='profiles/matrix-'+ 'c'.repeat(64)+'.json',ownedIndex='profiles/owned-definitions-matrix-'+ 'c'.repeat(64)+'.json';
test('all actual ordinary/owned variants share each common canonical physical bank',()=>{
 const homes=new Set();for(const producer of FORWARD_OWNERSHIP_PRODUCERS){const scope=describeForwardOutputPartitions({producer});for(const root of FORWARD_SHARED_OUTPUT_ROOTS)homes.add(scope.locate(root+'/runtime/value.mjs').home);homes.add(scope.locate('parity/rust-source-inventory.json').home);}
 assert.equal(homes.size,1);
});
test('overlapping matrix selections reuse actual profile banks with independent owned and index banks',()=>{
 const ordinary=describeForwardOutputPartitions({producer:'bulk.mjs',prefixes:[first,second],extraPaths:[index]}),owned=describeForwardOutputPartitions({producer:'owned-definitions-bulk.mjs',prefixes:[first],extraPaths:[index,ownedIndex]});
 for(const root of FORWARD_SHARED_OUTPUT_ROOTS)assert.equal(ordinary.locate(first+'/'+root+'/x.mjs').home,owned.locate(first+'/'+root+'/x.mjs').home);
 const optional=owned.locate(first+'/'+FORWARD_OWNED_OUTPUT_ROOTS[0]+'/x.meta.json');assert.notEqual(optional.home,owned.locate(first+'/'+FORWARD_SHARED_OUTPUT_ROOTS[0]+'/x.meta.json').home);
 assert.equal(ordinary.locate(index).home,owned.locate(index).home);assert.notEqual(owned.locate(index).home,owned.locate(ownedIndex).home);
 assert.throws(()=>owned.locate(second+'/'+FORWARD_SHARED_OUTPUT_ROOTS[0]+'/x.meta.json'));
});
test('all three optional owned roots share only their actual same-profile bank',()=>{
 const scope=describeForwardOutputPartitions({producer:'retained-owned-definitions-bulk.mjs',prefixes:[first,second]});
 const homes=new Set(FORWARD_OWNED_OUTPUT_ROOTS.map(root=>scope.locate(first+'/'+root+'/x').home));assert.equal(homes.size,1);
 assert.notEqual(scope.locate(first+'/'+FORWARD_OWNED_OUTPUT_ROOTS[0]+'/x').home,scope.locate(second+'/'+FORWARD_OWNED_OUTPUT_ROOTS[0]+'/x').home);
});
test('closed producer spellings/domain and exact actual index names refuse unknown defaults',()=>{
 for(const producer of ['unknown','bulk.mjs-extra','js-first','owned-definitions'])assert.throws(()=>describeForwardOutputPartitions({producer}));
 assert.throws(()=>describeForwardOutputPartitions({producer:'bulk.mjs',prefixes:[first,first]}));
 assert.throws(()=>describeForwardOutputPartitions({producer:'bulk.mjs',prefixes:['',first]}));
 assert.throws(()=>describeForwardOutputPartitions({producer:'bulk.mjs',extraPaths:[index]}));
 const scope=describeForwardOutputPartitions({producer:'flat-native-retained-owned-field-bulk.mjs'});
 assert.throws(()=>scope.locate('js/generated/rust-owned-definitions/x.mjs'));assert.throws(()=>scope.locate('js/src/authored.mjs'));assert.throws(()=>scope.locate('tools/translation/meta-neighbor/x.meta.json'));
});
