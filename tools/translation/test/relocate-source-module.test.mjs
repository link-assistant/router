import test from 'node:test';
import assert from 'node:assert/strict';
import {relocateSourceModule} from './relocate-source-module.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
test('repeated actual module URLs retain separate native spans and a complete inverse',()=>{
 const source="import {one} from './one.mjs';\nexport {two} from '../two.mjs';\nconst first=import.meta.url,second=new URL('./data/',import.meta.url);\n";
 const result=relocateSourceModule(source,'file:///receiving/original/module.mjs');assert.equal(result.selected.length,4);assert.equal(result.selected.filter(row=>row.kind==='original-module-url').length,2);assert.equal(result.inverse,source);assert.equal(transportConcreteSyntaxMeta(result.beforeMeta).source,source);assert.equal(transportConcreteSyntaxMeta(result.afterMeta).source,result.text);assert.deepEqual(result.trace.map(row=>row.phase),['language','repository']);assert.equal(result.compilerAuthority,false);
 for(const row of result.mapping)assert.equal(result.text.slice(...row.afterSpan),row.after);
});
test('physical overrides apply to actual imports while comments, strings and embedded templates stay exact',()=>{
 const source="// from './one.mjs' import.meta.url\nconst text=\"from './one.mjs' import.meta.url\",template=`import.meta.url`;\nimport value from './one.mjs';\n",result=relocateSourceModule(source,'file:///receiving/module.mjs',new Map([['./one.mjs','file:///receiving/variant.mjs']]));
 assert.equal(result.selected.length,1);assert.ok(result.text.startsWith(source.slice(0,source.indexOf('import value'))));assert.ok(result.text.includes('file:///receiving/variant.mjs'));assert.equal(result.inverse,source);
});
test('Unicode BOM and CRLF trivia remain byte-exact across multiple adjacent module reads',()=>{
 const source='\ufeff// café Ω😀\r\nconst a=import.meta.url,b=import.meta.url;\r\n',result=relocateSourceModule(source,'file:///receiving/original.mjs');assert.equal(result.selected.length,2);assert.equal(result.inverse,source);assert.equal(result.text.slice(0,source.indexOf('const')),'\ufeff// café Ω😀\r\n');assert.ok(result.text.endsWith('\r\n'));
});
test('invalid origins and source grammar refuse before any claimed receiving source',()=>{
 for(const origin of ['https://example.com/module.mjs','file:///module.mjs?variant=1','file:///module.mjs#fragment'])assert.throws(()=>relocateSourceModule('const a=1;',origin));
 assert.throws(()=>relocateSourceModule('const broken = ;','file:///module.mjs'));assert.throws(()=>relocateSourceModule('const a=1;','file:///module.mjs',new Map([['./one.mjs',{}]])));
});
