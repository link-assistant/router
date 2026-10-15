import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import parse from '../vendor/iarna-toml/parse-string.js';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {captureOriginalExternalTraitPackage,originalExternalTraitPackageInputs} from '../extensions/external-trait-sources.mjs';
const root=new URL('../../../',import.meta.url),vendor=new URL('../vendor/iarna-toml/',import.meta.url),installed=new URL('../../../packages/javascript/node_modules/@iarna/toml/',import.meta.url);
const hash=value=>createHash('sha256').update(value).digest('hex'),read=path=>readFileSync(new URL(path,root),'utf8');
const profile=JSON.parse(readFileSync(new URL('../source-profiles/external-dependency-defaults/manifest.json',import.meta.url),'utf8'));
function retain(name,value){const output=process.env.ROUTER_VENDORED_TOML_VECTOR_DIR;if(output){mkdirSync(output,{recursive:true});writeFileSync(join(output,name+'.json'),JSON.stringify(value)+'\n',{flag:'wx'});}}
// Independent authored TOML values omit the parser's internal Symbol marks;
// every original string-key field remains in this complete comparison.
function data(value){if(!value||typeof value!=='object'||value instanceof Date)return value;if(Array.isArray(value))return value.map(data);return Object.fromEntries(Object.keys(value).map(key=>[key,data(value[key])]));}

test('complete unmodified installed TOML3 source and ISC notice remain independently inspectable offline',()=>{
  const paths=[];function walk(url,prefix=''){for(const entry of readdirSync(url,{withFileTypes:true})){if(entry.isDirectory())walk(new URL(entry.name+'/',url),prefix+entry.name+'/');else{assert.equal(entry.isFile(),true);paths.push(prefix+entry.name);}}}walk(vendor);
  assert.deepEqual(paths.sort(),profile.parser.files.map(row=>row.path).sort());assert.equal(paths.length,20);let total=0;const originals=[];
  for(const row of profile.parser.files){const copied=readFileSync(new URL(row.path,vendor)),actual=readFileSync(new URL(row.path,installed));assert.equal(copied.length,row.bytes);assert.equal(hash(copied),row.sha256);assert.deepEqual(copied,actual);total+=copied.length;originals.push({...row,source:copied.toString('utf8')});}
  assert.equal(total,99960);assert.equal(total,profile.parser.totalBytes);assert.equal(JSON.parse(readFileSync(new URL('package.json',vendor),'utf8')).version,'3.0.0');assert.match(readFileSync(new URL('LICENSE',vendor),'utf8'),/Copyright \(c\) 2016, Rebecca Turner/);
  const lock=JSON.parse(read('packages/javascript/package-lock.json'));assert.deepEqual(lock.packages['node_modules/@iarna/toml'],profile.parser.lockEntry);
  assert.equal(profile.parser.upstreamLineLimitException.lines,1421);assert.match(profile.parser.sourceWitnessKind,/not independently acquired or verified/);retain('01-complete-parser-originals',{profile,originals,scope:'Complete installed source witness; no npm archive verification asserted.'});
});

test('full TOML parser handles quoted and dotted keys multiline strings arrays inline tables and array tables with independent goldens',async()=>{
  const source=['title = "Unicode λ😀"','"quoted.key" = "literal"','answer.value = 42','multiline = """','one','two"""',"literal = '''C:\\raw\\path'''",'items = [1, 2, 3,]','enabled = true','inline = { name = "α", nested = { flag = false } }','[[products]]','name = "one"','[[products]]','name = "two"'].join('\n');
  const expected={title:'Unicode λ😀','quoted.key':'literal',answer:{value:42},multiline:'one\ntwo',literal:'C:\\raw\\path',items:[1,2,3],enabled:true,inline:{name:'α',nested:{flag:false}},products:[{name:'one'},{name:'two'}]};
  const actual=parse(source),independent=(await import(new URL('parse-string.js',installed))).default(source);assert.deepEqual(data(actual),expected);assert.deepEqual(data(actual),data(independent));retain('02-independent-whole-TOML-structure',{source,expected,actual,independent});
});

test('dates exact integers alternate bases and numeric syntax use the complete parser rather than a Cargo line scanner',()=>{
  const source='date=1979-05-27\ntime=07:32:00\ninstant=1979-05-27T07:32:00Z\nlarge=9007199254740993\nhex=0xDEAD_BEEF\noctal=0o755\nbinary=0b1010\nfloat=1_000.25\n';
  const actual=parse(source);assert.equal(actual.large,9007199254740993n);assert.equal(actual.hex,3735928559);assert.equal(actual.octal,493);assert.equal(actual.binary,10);assert.equal(actual.float,1000.25);assert.equal(actual.instant.toISOString(),'1979-05-27T07:32:00.000Z');assert.equal(actual.date.toISOString(),'1979-05-27');assert.equal(actual.time.toISOString(),'07:32:00.000');
  retain('03-full-numeric-and-temporal-TOML',{source,actual:{...actual,large:actual.large.toString()},integerType:typeof actual.large});
});

test('duplicate keys tables malformed arrays mixed trailing syntax and invalid values all refuse as complete files',()=>{
  const originals=['name="one"\nname="two"','[package]\nname="one"\n[package]\nversion="1"','x=[1,,2]','x={a=1,a=2}','x="unterminated','x=1 trailing','x=01','[unfinished','x=true\nthis is not TOML','x=1\nx.child=2'];const observations=[];
  for(const source of originals){let failure;assert.throws(()=>{try{parse(source);}catch(error){failure={name:error.name,message:error.message,line:error.line,col:error.col,pos:error.pos};throw error;}});assert.equal(typeof failure.message,'string');observations.push({source,failure});}retain('04-complete-invalid-TOML',observations);
});

test('complete authentic project and locked package TOML yield actual default forwarding and preserve all original fields',()=>{
  const manifest=read('Cargo.toml'),lock=read('Cargo.lock'),dependencies=loadDeriveDependencyProof({manifest,lock}),token=captureOriginalExternalTraitPackage(dependencies,'base64'),original=originalExternalTraitPackageInputs(token),packageManifest=original.sources.find(row=>row.path==='Cargo.toml');
  const rootParsed=parse(manifest),parsed=parse(packageManifest.source);assert.equal(rootParsed.dependencies.base64,'0.23');assert.equal(parsed.package.name,'base64');assert.equal(parsed.package.version,'0.23.1');assert.equal(parsed.package.build,false);assert.deepEqual(data(parsed.features),{alloc:[],default:['std','simd-unsafe'],'simd-unsafe':[],std:['alloc']});assert.equal(parsed['dev-dependencies'].clap.features[0],'derive');assert.equal(parsed.profile.test['opt-level'],3);assert.equal(parsed.test.length,2);
  retain('05-complete-authentic-Cargo-records',{manifest,lock,packageManifest,rootParsed,parsed,scope:'Parsing does not establish Cargo dependency unit role.'});
});
