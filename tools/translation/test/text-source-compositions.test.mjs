import {repositorySourceURL} from "./fixtures/repository-paths.mjs";
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {translateProject} from '../project.mjs';
import {sourceItems} from '../rust-structure.mjs';
import {sha256} from '../translate.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';

test('unchanged original text functions compose checked character, Option and tuple rules',async()=>{
  const fixtures=[
    {path:'src/mpp.rs',name:'escape_header_value',fileSha256:'eeeb0629ebaf10b333867903abd5eba90886d63ec11bd9a8157a13eec3c6cc01',start:3540,end:3642,bodySha256:'23fdf6f3ce023a6e7aea9d421d9de9449726c70cd40f2d5476283c1aa0d47375',observations:[
      ['',''],['plain','plain'],['"',String.raw`\"`],['\\',String.raw`\\`],
      [String.raw`a\b"c`,String.raw`a\\b\"c`],['😀Ω','😀Ω'],
    ]},
    {path:'src/provider_import.rs',name:'unquote',fileSha256:'20277b79472978275b615a15b0b8dd99f785cc18a1030337d9f11889d9d045b6',start:6714,end:6878,bodySha256:'8edfd0014e2246e36f1ac21f9cd0b8275fc977a048d3daecd4c5f93a63910577',observations:[
      ['',''],['plain','plain'],['"x"','x'],['"x','"x'],['x"','x"'],['""',''],['"""','"'],['"😀Ω"','😀Ω'],
    ]},
    {path:'src/chat_admin.rs',name:'normalise',fileSha256:'2ea36d953cacc699736b2c5e6c96dd8ac607142839db5ee3ff161b28634d90fd',start:21969,end:22154,bodySha256:'45b7193927caeb92d52102a330ce9a61195d4eed26942b0ec58edaf654f1c816',observations:[
      ['',''],['START','start'],['/START@router','start'],['//START@router','/start'],
      ['@router',''],['/A@B@C','a'],['/Ω@bot','ω'],['/😀X','😀x'],
    ]},
  ];
  for(const fixture of fixtures){
    const original=readFileSync(repositorySourceURL(fixture.path,new URL('../../../',import.meta.url)),'utf8');assert.equal(sha256(original),fixture.fileSha256);
    const item=sourceItems(original).find(item=>item.term==='fn'&&item.name===fixture.name);assert.deepEqual([item.start,item.end],[fixture.start,fixture.end]);
    const source=original.slice(item.start,item.end);assert.equal(sha256(source),fixture.bodySha256);
    const module=fixture.path.slice(4,-3),files={'src/lib.rs':`mod ${module};`,[fixture.path]:source};
    const result=translateProject({entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path]});assert.deepEqual(result.meta.refused,[]);
    const key=module+'.'+fixture.name,entry=result.meta.executable.find(entry=>entry.name===key);assert.equal(entry.source,fixture.path);assert.deepEqual(entry.span,{start:0,end:source.length});
    assert.equal(result.meta.executable.filter(entry=>entry.term==='fn').length,1);assert.equal(result.meta.runtimeParity,false);
    await verifyTypedTargets(result,api=>{for(const [input,expected] of fixture.observations)assert.equal(api[key](input),expected,input);assert.throws(()=>api[key]('\ud800'),TypeError);});
  }
});
