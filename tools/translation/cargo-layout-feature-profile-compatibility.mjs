// Historical receiving DATA only. This grants no dependency/compiler authority.
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {types} from 'node:util';
import {cargoLayoutManifestMatches} from './cargo-layout-input-compatibility.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {exactLiteralSubstitutionRule} from './literal-substitution-rule.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
const root=new URL('./source-profiles/',import.meta.url),hash=value=>createHash('sha256').update(value).digest('hex');
const specifications=[
 {file:'json-macro-features.mjs',path:'json-macro/features/manifest.json',before:'a2c8d8a3e73ff7bafd7a27214270aa1be07bf4f51539b48560974172cc6ad982',after:'7593739464a03be25451c7214257332fbc604f1a39fe38681c85cb10e40919ce',source:'9910504694794d03c12a82c136772c8085e250490c0eb9e30a7c750d4cca47c3'},
 {file:'json-capabilities.mjs',path:'json-capabilities/manifest.json',before:'4b329929001961cd6cdb221ba83f97698ccad8ca1de2b43d73641027e018f02d',after:'b31b059ad69822aebe097347a55dfbf590aa209085750f3821b5bd0cf8ff94cd',source:'c81363b52b561ce7b0553efd5a2000417f4c133268312a8706d7d625ce702e9b'},
];
const fail=message=>{throw new TypeError('Historical Cargo feature layout: '+message);};
const requireValue=(value,message)=>{if(!value)fail(message);};
function concrete(source){const meta=serializeConcreteSyntaxMeta(transportConcreteSyntaxSource(source,{language:'JavaScript'}).document);requireValue(transportConcreteSyntaxMeta(meta).source===source,'complete source CST differs');return meta;}
function decoded(value){requireValue(typeof value==='string','complete archived bytes required');const bytes=Buffer.from(value,'base64');requireValue(bytes.toString('base64')===value,'canonical complete archive required');return bytes;}
export function cargoLayoutFeatureProfileMatches(bytes,expected,path){
 if(!Buffer.isBuffer(bytes)||types.isProxy(bytes)||typeof expected!=='string'||typeof path!=='string')return false;
 const spec=specifications.find(row=>row.path===path&&row.before===expected);if(!spec)return false;
 const digest=hash(bytes);if(digest!==spec.before&&digest!==spec.after)return false;
 const container=readFileSync(new URL('cargo-layout-before/inputs.json.gz',root));requireValue(hash(container)==='1d0713d968e969a06efccf1e0b4a9581ad8d30224fca7c3723ec3e7a86c24eff','complete historical container differs');
 const history=JSON.parse(gunzipSync(container,{maxOutputLength:1048576})),original=decoded(history.profiles['tools/translation/source-profiles/'+path]);requireValue(hash(original)===expected,'complete original profile differs');
 const profile=JSON.parse(original),packages=profile.packages.filter(row=>row.name==='link-assistant-router');requireValue(packages.length===1,'one original Router package required');const pin=packages[0].manifest,archivePath=path.slice(0,path.lastIndexOf('/')+1)+pin.path;
 const beforeArchive=decoded(history.archives['tools/translation/source-profiles/'+archivePath]),afterArchive=readFileSync(new URL(archivePath,root));
 requireValue(hash(beforeArchive)===pin.archiveSha256&&hash(afterArchive)==='dd965d46bb2cfb452dd545e1782e7bd680771a90d4b8ec07aac963ca635c2c06','complete original/current Cargo archives differ');
 const before=gunzipSync(beforeArchive,{maxOutputLength:100000}),after=gunzipSync(afterArchive,{maxOutputLength:100000});requireValue(before.equals(decoded(history.manifest))&&hash(before)===pin.sha256&&hash(before)===profile.manifestSha256&&before.length===pin.bytes&&profile.lockSha256===history.lockSha256,'complete original Cargo/profile joins differ');
 requireValue(cargoLayoutManifestMatches(after.toString('utf8'),hash(before)),'complete actual Cargo layout equation differs');
 const source=original.toString('utf8');requireValue(Buffer.from(source).equals(original),'lossless complete original JSON required');
 const document=JSON.parse(concrete(source)),tokens=document.nodes.filter(node=>node[0]==='token'),literal=node=>document.source.slice(node[2],node[3]),selected=[];
 for(const [key,oldValue,newValue]of [['manifestSha256',hash(before),hash(after)],['sha256',hash(before),hash(after)],['archiveSha256',hash(beforeArchive),hash(afterArchive)],['bytes',before.length,after.length]]){
  const candidates=[];for(let at=0;at+2<tokens.length;at++)if(literal(tokens[at])===JSON.stringify(key)&&literal(tokens[at+1])===':'&&literal(tokens[at+2])===JSON.stringify(oldValue))candidates.push(tokens[at+2]);
  requireValue(candidates.length===1,'one original profile field required: '+key);selected.push({key,start:candidates[0][2],end:candidates[0][3],before:JSON.stringify(oldValue),after:JSON.stringify(newValue)});
 }
 const inverses=[];let inverseFormatting;
 const pipeline=createRulePipeline([{phase:'language',rules:[...selected].sort((a,b)=>b.start-a.start).map(edit=>({id:'json-cst:literal-substitution:'+edit.key,apply:value=>{requireValue(value.slice(edit.start,edit.end)===edit.before,'original JSON token span differs');const next=value.slice(0,edit.start)+edit.after+value.slice(edit.end);inverses.push({...edit,source:value,text:next});return next;}}))},{phase:'repository',rules:[{id:'router-profile:exact-pretty-json-with-lossless-trivia-inverse',apply:value=>{
  const text=JSON.stringify(JSON.parse(value),null,2)+'\n',beforeDocument=JSON.parse(concrete(value)),afterDocument=JSON.parse(concrete(text)),actualTokens=afterDocument.nodes.filter(node=>node[0]==='token').map(node=>text.slice(node[2],node[3]));let at=0,restored='';
  for(const node of beforeDocument.nodes)if(!['root','group'].includes(node[0])){const originalToken=value.slice(node[2],node[3]);if(node[0]==='trivia'){requireValue(node[1]==='whitespace','only original JSON whitespace can be reformatted');restored+=originalToken;}else{requireValue(node[0]==='token'&&actualTokens[at]===originalToken,'complete original JSON tokens differ');restored+=actualTokens[at++];}}
  requireValue(at===actualTokens.length&&restored===value,'complete profile formatting inverse differs');inverseFormatting=restored;return text;
 }}]}]);
 const projected=pipeline.run(source).value;requireValue(hash(projected)===spec.after,'complete projected current profile differs');let inverse=inverseFormatting;
 for(const edit of inverses.reverse()){requireValue(inverse===edit.text&&inverse.slice(edit.start,edit.start+edit.after.length)===edit.after,'complete inverse token differs');inverse=inverse.slice(0,edit.start)+edit.before+inverse.slice(edit.start+edit.after.length);requireValue(inverse===edit.source,'complete inverse source step differs');}requireValue(inverse===source,'complete original profile inverse differs');
 return bytes.equals(original)||bytes.equals(Buffer.from(projected));
}
export function adaptHistoricalCargoFeatureConsumer(source,file){
 if(typeof source!=='string'||typeof file!=='string')fail('complete original source and filename required');const spec=specifications.find(row=>row.file===file);requireValue(spec&&hash(source)===spec.source,'complete pinned original consumer differs');
 const guard="hash(bytes)!=='"+spec.before+"'",replacement='('+guard+'&&!cargoLayoutFeatureProfileMatches(bytes,'+JSON.stringify(spec.before)+','+JSON.stringify(spec.path)+'))',anchor="import {readFileSync} from 'node:fs';",imported="import {cargoLayoutFeatureProfileMatches} from './cargo-layout-feature-profile-compatibility.mjs';\n"+anchor;
 const language=[['profile-input:preserve-original-checksum-with-exact-layout-alternative',guard,replacement]],repository=[['router-receiver:exact-layout-data-import',anchor,imported]],make=rows=>rows.map(([id,before,after])=>exactLiteralSubstitutionRule(id,before,after,'Complete original consumer anchor differs: '+id));
 const result=createRulePipeline([{phase:'language',rules:make(language)},{phase:'repository',rules:make(repository)}]).run(source),text=result.value;let inverse=text;for(const [,before,after]of [...language,...repository].reverse()){requireValue(inverse.split(after).length===2,'complete receiving inverse differs');inverse=inverse.replace(after,()=>before);}requireValue(inverse===source,'complete original receiving source differs');
 return {file,source,text,sourceSha256:hash(source),sha256:hash(text),beforeMeta:concrete(source),afterMeta:concrete(text),inverse,language,repository,literalSubstitutions:true,trace:result.trace,sourceDataOnly:true,compilerAuthority:false};
}
