// Full original source DATA only. No historical source grants execution authority.
import {readFileSync,writeFileSync,mkdirSync,lstatSync,realpathSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {resolve,join,relative,isAbsolute,dirname,basename} from 'node:path';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
export const SCHEMARS_ENCLOSING_ORIGINAL='tools/translation/derive-enclosing-namespace-context.mjs';
export const SCHEMARS_ENCLOSING_TEST='tools/translation/test/schemars-with-output.test.mjs';
export const SCHEMARS_ENCLOSING_OLD_CONTROL='tools/translation/schemars-enclosing-original-control.mjs';
const SELF='tools/translation/schemars-enclosing-history.mjs',PREFIX='tools/translation/source-profiles/schemars-enclosing-history/',SCHEMA='complete-schemars-enclosing-original-history-v1',LIMIT=1048576;
const PINS=[
 {path:SCHEMARS_ENCLOSING_ORIGINAL,revision:'d37b18917c33ef1584e5790cfa4c610230db55d0',gitBlob:'36de9adbbd20076b9d73ac8d1d4e9dcce76230cf',bytes:26523,sha256:'65109370660c0c64885831baadfa71f6be5d03698a5a9591229be5d2910b5d9a'},
 {path:SCHEMARS_ENCLOSING_TEST,revision:'1af75698c2af44a5fad95f9470932988dc19e85e',gitBlob:'def7d1ccb98c285bb6fa541c591bfb17f8436785',bytes:13640,sha256:'86336f4fae094eb0607c1b7cc892527978a67b5b9fbaba4242a23fdac4cd6c10'},
];
const NOTICE='Complete original Router enclosing issuer and Schemars candidate controls from actual pinned Git objects. Original Router LICENSE applies. Full source and original assertion bodies remain available. Archive DATA grants no type, ownership, namespace, semantic or execution authority.\n';
const hash=value=>createHash('sha256').update(value).digest('hex'),blob=value=>createHash('sha1').update(Buffer.from('blob '+Buffer.byteLength(value)+'\0')).update(value).digest('hex');
const fail=message=>{throw new TypeError('Schemars enclosing source history: '+message);};
function fields(value,names){if(!value||JSON.stringify(Object.keys(value))!==JSON.stringify(names))fail('complete exact history fields required');}
function validate(packet){
 fields(packet,['schema','files','authority']);if(packet.schema!==SCHEMA||!Array.isArray(packet.files)||packet.files.length!==2||JSON.stringify(packet.authority)!==JSON.stringify({source:false,semantic:false,execution:false}))fail('complete original source history differs');
 return packet.files.map((row,index)=>{fields(row,['path','revision','gitBlob','source']);const pin=PINS[index];if(row.path!==pin.path||row.revision!==pin.revision||row.gitBlob!==pin.gitBlob||typeof row.source!=='string'||Buffer.byteLength(row.source)!==pin.bytes||hash(row.source)!==pin.sha256||blob(row.source)!==pin.gitBlob)fail('full genuine original Git source differs');return {...row,bytes:pin.bytes,sha256:pin.sha256};});
}
export function readSchemarsEnclosingHistory({root}={}){
 root=resolve(root);const archivePath=PREFIX+'originals.json.gz',manifestPath=PREFIX+'manifest.json',noticePath=PREFIX+'NOTICE',packed=readFileSync(join(root,archivePath)),manifestSource=readFileSync(join(root,manifestPath),'utf8'),notice=readFileSync(join(root,noticePath),'utf8');if(packed.length>LIMIT||notice!==NOTICE)fail('bounded complete original packet/notice required');
 const manifest=JSON.parse(manifestSource);fields(manifest,['schema','archive','bytes','sha256','rawBytes','rawSha256']);if(manifest.schema!==SCHEMA||manifest.archive!=='originals.json.gz'||manifest.bytes!==packed.length||manifest.sha256!==hash(packed))fail('complete archive manifest differs');
 const raw=gunzipSync(packed,{maxOutputLength:LIMIT});if(raw.length!==manifest.rawBytes||hash(raw)!==manifest.rawSha256)fail('complete original logical bytes differ');const packet=JSON.parse(raw);if(JSON.stringify(packet)+'\n'!==raw.toString('utf8'))fail('canonical full history DATA required');const files=validate(packet),reader=readFileSync(join(root,SELF),'utf8');
 return {schema:SCHEMA,files,inputs:[{path:SELF,source:reader,sha256:hash(reader)},{path:manifestPath,source:manifestSource,sha256:hash(manifestSource)},{path:noticePath,source:notice,sha256:hash(notice)}],archiveInput:{path:archivePath,source:packed.toString('base64'),encoding:'base64',bytes:packed.length,sha256:hash(packed)},authority:packet.authority};
}
export function assertSchemarsEnclosingHistoryFresh({root,history}){
 for(const row of history.inputs)if(readFileSync(resolve(root,row.path),'utf8')!==row.source)fail('actual history text input changed');const row=history.archiveInput,actual=readFileSync(resolve(root,row.path));if(actual.length!==row.bytes||actual.toString('base64')!==row.source)fail('actual complete original archive changed');
}
export function captureSchemarsEnclosingHistory({root,output}={}){
 root=realpathSync(resolve(root));output=join(realpathSync(dirname(resolve(output))),basename(output));const outside=value=>value==='..'||value.startsWith('../')||isAbsolute(value);if(!outside(relative(root,output))||!outside(relative(output,root)))fail('fresh capture output must be outside original source');try{lstatSync(output);fail('fresh capture output required');}catch(error){if(error.code!=='ENOENT')throw error;}
 const env=Object.fromEntries(Object.entries(process.env).filter(([name])=>!name.startsWith('GIT_')));Object.assign(env,{GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null',GIT_CONFIG_SYSTEM:'/dev/null'});const git=args=>execFileSync('/usr/bin/git',['--no-replace-objects',...args],{cwd:root,env,encoding:'utf8',timeout:10000,maxBuffer:LIMIT});
 const packet={schema:SCHEMA,files:PINS.map(pin=>{if(git(['rev-parse',pin.revision+':'+pin.path]).trim()!==pin.gitBlob)fail('actual original Git blob differs');return {path:pin.path,revision:pin.revision,gitBlob:pin.gitBlob,source:git(['show',pin.revision+':'+pin.path])};}),authority:{source:false,semantic:false,execution:false}};validate(packet);const raw=Buffer.from(JSON.stringify(packet)+'\n');if(raw.length>LIMIT)fail('complete original capture bound');const packed=gzipSync(raw,{level:9});if(!gunzipSync(packed,{maxOutputLength:LIMIT}).equals(raw))fail('independent complete original archive readback differs');
 const manifest={schema:SCHEMA,archive:'originals.json.gz',bytes:packed.length,sha256:hash(packed),rawBytes:raw.length,rawSha256:hash(raw)};mkdirSync(output,{recursive:false});for(const [name,value]of [['originals.json.gz',packed],['manifest.json',JSON.stringify(manifest,null,2)+'\n'],['NOTICE',NOTICE]])writeFileSync(join(output,name),value,{flag:'wx'});return {output,manifest,files:packet.files.map(row=>row.path),sourceInstalled:false,runtimeAuthority:false};
}

// Recognize only the exact one-import equation against complete genuine source.
export function deriveSchemarsEnclosingImportHistory({original,source}){
 const ts=ownershipCompiler();if(ts.version!=='5.9.3'||typeof original!=='string'||typeof source!=='string'||hash(original)!==PINS[0].sha256)fail('complete genuine original issuer required');
 const file=ts.createSourceFile(SCHEMARS_ENCLOSING_ORIGINAL,original,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('complete original native grammar differs');const selected=file.statements.filter(node=>ts.isImportDeclaration(node)&&node.moduleSpecifier.text==='./schemars-bang-footprints.mjs');if(selected.length!==1)fail('one actual original Schemars import required');const declaration=selected[0],names=declaration.importClause?.namedBindings?.elements;
 if(!names||names.length!==3||names.some(node=>node.propertyName)||JSON.stringify(names.map(node=>node.name.text))!==JSON.stringify(['proveSchemarsBangFootprint','assertSchemarsBangFootprint','originalSchemarsOutput']))fail('complete original local import bindings differ');
 const node=declaration.moduleSpecifier,span=[node.getStart(file),node.end],expected=original.slice(...span),replacement="'./schemars-enclosing-output-dispatch.mjs'",after=original.slice(0,span[0])+replacement+original.slice(span[1]);
 const actual=ts.createSourceFile(SCHEMARS_ENCLOSING_ORIGINAL,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(actual.parseDiagnostics.length)fail('complete physical native grammar differs');if(source!==original&&source!==after)fail('physical issuer is neither exact original nor exact import adoption');
 const restored=source===after?source.slice(0,span[0])+expected+source.slice(span[0]+replacement.length):source;if(restored!==original)fail('independent whole native import inverse differs');return {path:SCHEMARS_ENCLOSING_ORIGINAL,before:original,after,current:source,adopted:source===after,edit:{span,expected,replacement},inverseEdit:{span:[span[0],span[0]+replacement.length],expected:replacement,replacement:expected},restored};
}
