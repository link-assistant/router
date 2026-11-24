import {repositorySourceURL} from "./fixtures/repository-paths.mjs";
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {translateSource,sha256} from '../translate.mjs';
import {translateProject} from '../project.mjs';
import {sourceItems} from '../rust-structure.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {decodeRustCharacter} from '../extensions/rust-character.mjs';
import {tokenizeRust} from '../extensions/lexical.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE} from '../router-core-formatting.mjs';
import {ROUTER_CORE_PRIMITIVES_SOURCE} from '../router-core-primitives.mjs';
import {ROUTER_CORE_RANGES_SOURCE} from '../router-core-ranges.mjs';
import {currentCoreReceivingFiles as currentCoreFiles,currentCoreOptions,assertCurrentCoreReceivingRefusals as assertCurrentCoreRefusals,currentTextParent} from './current-core-text-fixture.mjs';
async function translate(source,verify) {
  const result=translateSource(source);assert.equal(result.ir.items.map(item=>item.source).join(''),source);
  assert.equal(result.ir.counts.carried,0,JSON.stringify(result.ir.items.filter(item=>item.status==='carried').map(item=>item.diagnostic)));
  await verifyTypedTargets(result,verify);return result;
}
test('checked scalar string patterns retain literal Unicode and empty prefix/suffix/search semantics',async()=>{
  await translate('pub fn prefix(v:&str,p:&str)->bool{v.starts_with(p)} pub fn suffix(v:&str,p:&str)->bool{v.ends_with(p)} pub fn contains(v:&str,p:&str)->bool{v.contains(p)}',api=>{
    for(const [value,pattern,expected] of [['😀Ωz','😀',true],['😀Ωz','Ω',false],['','',true],['abc','',true],['.ab','.a',true]])assert.equal(api.prefix(value,pattern),expected);
    assert.equal(api.suffix('😀Ωz','Ωz'),true);assert.equal(api.suffix('😀Ωz','Ω'),false);assert.equal(api.suffix('',''),true);
    assert.equal(api.contains('😀Ωz','Ω'),true);assert.equal(api.contains('e\u0301','é'),false);assert.equal(api.contains('abc','[a]'),false);
    assert.throws(()=>api.contains('\ud800','a'),TypeError);assert.throws(()=>api.prefix('ok',/o/),TypeError);
  });
});
test('literal delimiter and keyword payloads never become Rust source syntax',async()=>{
  await translate('pub fn delimiters(v:&str)->bool{v.starts_with("(")&&v.ends_with(")")&&v.contains("&")} pub fn character(v:&str)->bool{v.starts_with(\'(\')&&v.ends_with(\')\')&&v.contains(\'&\')} pub fn keyword()->&\'static str{"let"}',api=>{
    assert.equal(api.delimiters('(&)'),true);assert.equal(api.delimiters('(x)'),false);assert.equal(api.character('(&)'),true);assert.equal(api.keyword(),'let');
  });
  const source='pub fn bad()->String{format!("x")}';assert.equal(translateSource(source).ir.counts.carried,0);
  for(const source of ['pub fn bad()->String{format! "(" "x" )}','pub fn bad()->String{format! \'(\' "x" )}'])assert.equal(translateSource(source).ir.items.find(item=>item.name==='bad').status,'carried');
});
test('replacement text is literal and matches are nonoverlapping',async()=>{
  await translate('pub fn replace(v:&str,p:&str,t:&str)->String{v.replace(p,t)}',api=>{
    assert.equal(api.replace('aaaaa','aa','$&'),'$&$&a');assert.equal(api.replace('banana','na','[$1]'),'ba[$1][$1]');
    assert.equal(api.replace('a.b.a','.','$`'),'a$`b$`a');assert.equal(api.replace('😀Ω😀','😀','z'),'zΩz');assert.equal(api.replace('unchanged','missing','x'),'unchanged');
  });
});
test('empty replacement patterns match Unicode scalar boundaries instead of UTF16 units',async()=>{
  await translate('pub fn replace(v:&str,p:&str,t:&str)->String{v.replace(p,t)} pub fn limited(v:&str,p:&str,t:&str,n:usize)->String{v.replacen(p,t,n)}',api=>{
    assert.equal(api.replace('😀Ω','',':'),':😀:Ω:');assert.equal(api.replace('','',':'),':');assert.equal(api.replace('😀','', ''),'😀');
    for(const [count,expected] of [[0n,'😀Ω'],[1n,':😀Ω'],[2n,':😀:Ω'],[3n,':😀:Ω:'],[18446744073709551615n,':😀:Ω:']])assert.equal(api.limited('😀Ω','',':',count),expected);
    assert.equal(api.limited('','',':',0n),'');assert.equal(api.limited('','',':',1n),':');
  });
});
test('replacement limits retain exact usize domain and written occurrence order',async()=>{
  await translate('pub fn limited(v:&str,p:&str,t:&str,n:usize)->String{v.replacen(p,t,n)}',api=>{
    for(const [count,expected] of [[0n,'aaaaa'],[1n,'Xaaa'],[2n,'XXa'],[18446744073709551615n,'XXa']])assert.equal(api.limited('aaaaa','aa','X',count),expected);
    assert.equal(api.limited('foo foo 123 foo','foo','new',2n),'new new 123 foo');assert.throws(()=>api.limited('x','x','y',-1n),RangeError);assert.throws(()=>api.limited('x','x','y',18446744073709551616n),RangeError);
  });
});
test('source usize suffixes, arithmetic and explicit exact casts retain distinct primitive provenance',async()=>{
  await translate('pub fn suffix(v:&str)->String{v.replacen("x","y",1usize)} pub fn arithmetic(v:&str,n:usize)->String{v.replacen("x","y",n+1)} pub fn cast(v:&str,n:u64)->String{v.replacen("x","y",n as usize)}',api=>{
    assert.equal(api.suffix('xxx'),'yxx');assert.equal(api.arithmetic('xxx',1n),'yyx');assert.equal(api.cast('xxx',2n),'yyx');assert.throws(()=>api.arithmetic('x',18446744073709551615n),RangeError);
  });
});
test('Rust character literals retain original spans and Unicode scalar or escape identity',()=>{
  const observations=[["'a'",'a'],["'😀'",'😀'],["'\\''","'"],["'\\\"'",'"'],["'\\\\'",'\\'],["'\\n'",'\n'],["'\\r'",'\r'],["'\\t'",'\t'],["'\\0'",'\0'],["'\\x7f'",'\x7f'],["'\\u{1F_600_}'",'😀'],["'\\u{10ffff}'",'\u{10ffff}']];
  for(const [raw,value] of observations){assert.equal(decodeRustCharacter(raw,{start:3,end:3+raw.length}),value);const source='  '+raw+'  ',token=tokenizeRust(source)[0];assert.equal(token.kind,'rustChar');assert.equal(token.value,value);assert.equal(source.slice(token.start,token.end),raw);}
  for(const raw of ["''","'ab'","'\\x80'","'\\xFF'","'\\u{D800}'","'\\u{110000}'","'\\u{_41}'","'\\u{0000041}'","'\\q'","'\t'","'\n'","'\ud800'"])assert.throws(()=>decodeRustCharacter(raw,{start:0,end:raw.length}),/Unicode scalar/);
  assert.deepEqual(tokenizeRust("&'static str").slice(0,-1).map(token=>token.value),['&',"'",'static','str']);
});
test('actual character Pattern literals translate without converting byte literals or string results',async()=>{
  await translate('pub fn replace(v:&str)->String{v.replace(\'\\\'\',"Q")} pub fn unicode(v:&str)->bool{v.contains(\'\\u{1F_600}\')} pub fn suffix(v:&str)->bool{v.ends_with(\'Ω\')}',api=>{
    assert.equal(api.replace("a'b'"),'aQbQ');assert.equal(api.unicode('x😀'),true);assert.equal(api.unicode('x'),false);assert.equal(api.suffix('😀Ω'),true);
  });
  for(const source of ['pub fn bad()->String{\'x\'}','pub fn bad(v:&str)->bool{v.contains(b\'x\')}','pub fn bad(v:&str)->String{v.replace("x",\'y\')}','pub fn bad(v:&str)->bool{v.contains(\'\\x80\')}']){const result=translateSource(source);assert.equal(result.ir.items.find(item=>item.name==='bad').status,'carried');assert.equal(result.ir.items.map(item=>item.source).join(''),source);}
});
test('receiver and all pattern arguments evaluate exactly once in Rust source order',async()=>{
  await translate('fn receiver()->&\'static str{panic!("receiver first")} fn pattern()->&\'static str{panic!("pattern second")} pub fn run()->String{receiver().replace(pattern(),"x")}',api=>assert.throws(()=>api.run(),{message:'receiver first'}));
  const result=await translate('fn identity(v:&str)->&str{v} pub fn run(v:&str)->String{identity(v).replacen("x","y",1)}',api=>assert.equal(api.run('xx'),'yx'));
  let body=result.ir.items.find(item=>item.name==='run').semantic.checkedIR.body;assert.equal(body.k,'let');assert.equal(body.value.k,'call');
  let count=0;while(body.k==='let'){count++;body=body.body;}assert.equal(count,4);assert.equal(body.k,'routerTextPattern');assert.equal(body.constEligible,false);
});
test('custom Pattern types, invalid argument kinds and const method calls retain source-bearing refusals',()=>{
  for(const source of [
    'pub fn bad(v:&str)->bool{v.contains(1)}','pub fn bad(v:&str)->bool{v.starts_with(|x|true)}',
    'pub fn bad(v:&str,p:String)->bool{v.contains(p)}','pub fn bad(v:&str)->String{v.replace("x",String::from("y"))}',
    'pub fn bad(v:&str)->String{v.replacen("x","y",-1)}','pub fn bad(v:&str,n:u8)->String{v.replacen("x","y",n)}',
    'pub fn bad(v:&str,n:u64)->String{v.replacen("x","y",n)}','pub fn bad(v:&str,n:u64)->String{v.replacen("x","y",n+1)}',
    'pub fn bad(v:&str)->String{v.replacen("x","y",1u64)}','pub fn bad(v:&str,n:&usize)->String{v.replacen("x","y",n)}',
    'pub fn bad(v:&str,n:usize)->String{v.replacen("x","y",n+1u64)}','pub fn bad(v:&str,n:usize)->String{v.replacen("x","y",1u64+n)}',
    'pub fn bad(v:&str)->String{v.replacen("x","y",&1usize)}','pub fn bad(v:&str,n:&u64)->String{v.replacen("x","y",n as usize)}',
    'pub const fn bad(v:&str)->bool{v.contains("x")}','pub const fn bad(v:&str)->String{v.replace("x","y")}',
    'pub fn bad(v:&str)->u8{let text=v.replace("x","y");if let text=text {0}else{1}}',
  ]){const result=translateSource(source);assert.equal(result.ir.items.find(item=>item.name==='bad').status,'carried',source);assert.equal(result.ir.items.map(item=>item.source).join(''),source);}
});
test('unchanged original string functions translate with exact source identity in both targets',async()=>{
  const cases=[
    ['src/claude_identity.rs','is_oauth_credential',[['sk-ant-oat',true],['sk-ant-oat01',true],['xsk-ant-oat',false],['sk-ant-o',false],['',false]]],
    ['src/deploy/runtime.rs','is_absent',[['NO SUCH OBJECT: x',true],['no such container: x',true],['no such image: x',true],['No such images',true],['permission denied',false],['',false]]],
    ['src/deploy/runtime.rs','explain_unavailable',[['Permission Denied','permission denied while connecting to Docker; add this user to the Docker group'],['Docker is not installed','Docker is not installed'],['unknown 😀','the Docker daemon is not running or unreachable: unknown 😀']]],
  ];
  for(const [path,name,observations] of cases){
    const original=readFileSync(repositorySourceURL(path,new URL('../../../',import.meta.url)),'utf8'),item=sourceItems(original).find(item=>item.term==='fn'&&item.name===name);assert.ok(item);
    const source=original.slice(item.start,item.end),names=path.slice(4,-3).split('/');
    const files=currentCoreFiles(path,name,source);
    for(let depth=1;depth<names.length;depth++)files['src/'+names.slice(0,depth).join('/')+'.rs']=`mod ${names[depth]};`;
    files[path]=source;
    const result=translateProject(currentCoreOptions(files));
    // The owned library body deliberately stays generic and untranslated.
    // Assert its complete exact boundary; any additional application or
    // library refusal still fails this full-array comparison.
    assert.equal(ROUTER_CORE_RANGES_SOURCE.slice(437,445),'<\n    T:');
    assertCurrentCoreRefusals(result,path,name,source);
    const key=names.join('.')+'.'+name,entry=result.meta.executable.find(entry=>entry.name===key);assert.ok(entry,key);assert.equal(entry.source,path);assert.deepEqual(entry.span,{start:0,end:source.length});assert.equal(sha256(source.slice(entry.span.start,entry.span.end)),sha256(source));
    await verifyTypedTargets(result,api=>{for(const [value,expected] of observations)assert.equal(api[key](value),expected);});
  }
});
test('original shell quoting and XML escaping bodies recover through the same general compiler',async()=>{
  const cases=[
    {path:'src/client_command_token.rs',name:'shell_quote',fileSha256:'0fe39680b85aa8a19b905990a78020d38aaf900b2836c689e699adad638aa1cf',start:4700,end:4802,bodySha256:'c0f174cf04043392a14a39e631c129f8de6a17729d20229688029c4155ec0bc6',observations:[['',"''"],["a'b","'a'\\''b'"],['😀Ω',"'😀Ω'"],['$&',"'$&'"]]},
    {path:'src/clients/util.rs',name:'shell_quote',fileSha256:'647a97ca7c978d16b437517a396903879072ce0935abc6b78088a4b3a6f935d3',start:2678,end:2780,bodySha256:'c0f174cf04043392a14a39e631c129f8de6a17729d20229688029c4155ec0bc6',observations:[['',"''"],["a'b","'a'\\''b'"],['😀Ω',"'😀Ω'"]]},
    {path:'src/deploy_remote.rs',name:'shell_quote',fileSha256:'8e1156091bd5b9d16659d4ba4cd1e30100b615d960ef0e3af345a135b747c588',start:2667,end:2760,bodySha256:'7ff7da22029eeae2fad98f91168e3fba197c49eb7d8a4c7a3036056c3e3d57b6',observations:[['',"''"],["a'b","'a'\"'\"'b'"],['😀Ω',"'😀Ω'"]]},
    {path:'src/deploy_local/service.rs',name:'xml',fileSha256:'11acbe449d5b18fec6e4935bdbcb8414a15fa63eb1a3be6815d59218f2ab007d',start:5042,end:5208,bodySha256:'111eb7d9ca36de5200181278fc7d4cccb0325ffef04bf687a67339d391430c3d',observations:[['&<>"','&amp;&lt;&gt;&quot;'],['&lt;','&amp;lt;'],['😀Ω','😀Ω'],['','']]},
  ];
  for(const fixture of cases){
    const original=readFileSync(repositorySourceURL(fixture.path,new URL('../../../',import.meta.url)),'utf8'),evolution=currentTextParent(fixture,original);
    const item=sourceItems(original).find(item=>item.term==='fn'&&item.name===fixture.name);assert.deepEqual([item.start,item.end],evolution.span);
    const source=original.slice(item.start,item.end);assert.equal(sha256(source),evolution.bodySha256);
    const names=fixture.path.slice(4,-3).split('/'),files=evolution.requiresCore?currentCoreFiles(fixture.path,fixture.name,source):{'src/lib.rs':`mod ${names[0]};`};
    for(let depth=1;depth<names.length;depth++)files['src/'+names.slice(0,depth).join('/')+'.rs']=`mod ${names[depth]};`;
    files[fixture.path]=source;
    const result=translateProject(evolution.requiresCore?currentCoreOptions(files):{entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path]});if(evolution.requiresCore)assertCurrentCoreRefusals(result,fixture.path,fixture.name,source);else assert.deepEqual(result.meta.refused,[]);
    const key=names.join('.')+'.'+fixture.name,entry=result.meta.executable.find(entry=>entry.name===key);assert.deepEqual(entry.span,{start:0,end:source.length});assert.equal(entry.source,fixture.path);
    await verifyTypedTargets(result,api=>{for(const [value,expected] of fixture.observations)assert.equal(api[key](value),expected);assert.throws(()=>api[key]('\ud800'),TypeError);});
  }
});
