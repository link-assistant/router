// Source preparation only: pinned native wrappers do not issue source authority.
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {verifyNativeCopiedSourceBindings} from './source-copy-native-bindings.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';

const ROOT=fileURLToPath(new URL('../../',import.meta.url)),BASE='tools/translation/';
const OLD=BASE+'source-profiles/attribute-owner-bulk/node-v20.19.4/';
const CURRENT=BASE+'source-profiles/attribute-owner-bulk/node-v20.20.2/';
const GUARD=BASE+'attribute-owner-bulk-crypto.mjs',DATA=BASE+'attribute-owner-bulk-crypto-node20-20-source.mjs';
const GUARD_HASH='9725a02c0c7111635f998cacfe213f529562da6cad41d1348e8702fdfc8831f9';
const PROFILES=[{path:OLD,version:'20.19.4',licenseHash:'3716cab1c1ca53b1be9481b6d20bd8e00a4b9561d1b77427fd95e17aad6fc17e',pins:{'crypto.js':'9a6dc75b3111a4d9926a58d977da58b80769010287ee5cd5ed9c558d6921615c','hash.js':'59b744195f7fec218207f7083ff420350534ebdd1a9674fc4998334c0704f191','LICENSE.gz':'42f4c42dcd1d51c0d1283df6178ac66f99e157639a6171e5e77676634c425c35'}},
 {path:CURRENT,version:'20.20.2',licenseHash:'70c7a59521f41ccfe5bb0193677b77a44ed43ad4fe59203fa408afa538214949',pins:{'crypto.js':'9a6dc75b3111a4d9926a58d977da58b80769010287ee5cd5ed9c558d6921615c','hash.js':'c5920f63623364cd5dfea5d21d6377f88ea919988ba403f706e7aca6f3dcf050','LICENSE.gz':'326ac2f3e528f3c0f7c80c354b1898700c7f4dcc01a67362d6dd95d5aad26c26'}}];
const fail=message=>{throw TypeError('Attribute owner Node profile: '+message);};
const hash=value=>createHash('sha256').update(value).digest('hex');
function unique(rows,label){if(rows.length!==1)fail('one complete native '+label+' required');return rows[0];}
function once(source,before,after){if(source.split(before).length!==2)fail('one source anchor required');return source.replace(before,()=>after);}
function parse(ts,path,source){const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('complete native grammar differs: '+path);return file;}
function functions(ts,path,raw){
 const crypto=parse(ts,path+'crypto.js',raw['crypto.js']),file=parse(ts,path+'hash.js',raw['hash.js']);
 const result={},spans=[];
 for(const [name,parent]of [['createHash',crypto],['Hash',file]]){
  const node=unique(parent.statements.filter(row=>ts.isFunctionDeclaration(row)&&row.name?.text===name),name);
  result[name]=node.getText(parent);spans.push({name,path:path+(name==='Hash'?'hash.js':'crypto.js'),span:[node.getStart(parent),node.end],source:result[name]});
 }
 for(const name of ['copy','_transform','_flush','update','digest']){
  const nodes=[];function visit(node){if(ts.isBinaryExpression(node)&&node.operatorToken.kind===ts.SyntaxKind.EqualsToken&&node.left.getText(file)==='Hash.prototype.'+name&&ts.isFunctionExpression(node.right))nodes.push(node.right);ts.forEachChild(node,visit);}visit(file);
  const node=unique(nodes,name);result[name]=node.getText(file);spans.push({name,path:path+'hash.js',span:[node.getStart(file),node.end],source:result[name]});
 }
 return {values:result,spans};
}
export function prepareAttributeOwnerNodeProfile({root=ROOT}={}){
 root=resolve(root);const ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('lockfile TypeScript 5.9.3 required');
 const inputs=[],profiles=[];
 function input(path,pin,compressed=false){const bytes=readFileSync(resolve(root,path));if(bytes.length>524288||pin&&hash(bytes)!==pin)fail('complete physical pin differs: '+path);if(!inputs.some(row=>row.path===path))inputs.push({path,bytes:bytes.length,sha256:hash(bytes),base64:bytes.toString('base64')});return compressed?gunzipSync(bytes,{maxOutputLength:524288}):bytes;}
 for(const profile of PROFILES){
  const raw={};for(const [name,pin]of Object.entries(profile.pins))raw[name]=input(profile.path+name,pin).toString('utf8');
  const license=input(profile.path+'LICENSE.gz',profile.pins['LICENSE.gz'],true);if(hash(license)!==profile.licenseHash)fail('complete original upstream license differs');
  profiles.push({version:profile.version,...functions(ts,profile.path,raw),licenseSha256:profile.licenseHash});
 }
 const legacy=input(BASE+'attribute-owner-bulk-crypto-source.mjs').toString('utf8');
 const expectedLegacy='// Generated from complete pinned official Node v20.19.4 sources; immutable primitive DATA only.\n'+Object.entries(profiles[0].values).map(([name,source])=>'export const '+name+'='+JSON.stringify(source)+';').join('\n')+'\n';
 if(legacy!==expectedLegacy)fail('complete original generated function source differs');
 const original=input(OLD+'attribute-owner-bulk-crypto.mjs.gz','46738aaeb77c6770edc62c4cfcc42eea92e73d7d58e447b7cac651480b6fb132',true).toString('utf8');if(hash(original)!==GUARD_HASH)fail('complete original qualification guard differs');
 const nodeSources=profiles[1].values;
 const data='// Generated from complete pinned official Node v20.20.2 sources; immutable primitive DATA only.\n'+Object.entries(nodeSources).map(([name,source])=>'export const '+name+'='+JSON.stringify(source)+';').join('\n')+'\n';
 const language=once(once(original,"value(nodeVersionField)==='20.19.4'","(value(nodeVersionField)==='20.19.4'||value(nodeVersionField)==='20.20.2')"),"let qualified=", "const nodeBulkCryptoFunctionSources=value(nodeVersionField)==='20.20.2'?nodeBulkCryptoCurrentFunctionSources:nodeBulkCryptoLegacyFunctionSources;\nlet qualified=");
 const after=once(language,"import * as nodeBulkCryptoFunctionSources from './attribute-owner-bulk-crypto-source.mjs';","import * as nodeBulkCryptoLegacyFunctionSources from './attribute-owner-bulk-crypto-source.mjs';\nimport * as nodeBulkCryptoCurrentFunctionSources from './attribute-owner-bulk-crypto-node20-20-source.mjs';");
 const files=[];
 function whole(path,before,middle,last){
  const rule=(from,to,id)=>({id,edits:[{span:[0,from.length],expected:from,replacement:to}]});
  const sequence={languageRules:[rule(before,middle,'javascript:retain-complete-native-version-profile')],repositoryRules:[rule(middle,last,'router:qualify-actual-version-profile-imports')]};
  const start=transportConcreteSyntaxSource(before,{language:'JavaScript'}),result=applyConcreteSyntaxSubstitutions(start.document,sequence),afterMeta=serializeConcreteSyntaxMeta(result.value),end=transportConcreteSyntaxMeta(afterMeta);
  if(end.source!==last)fail('complete source transport differs');
  const inverseSequence={languageRules:[rule(last,middle,'javascript:restore-qualified-native-profile-imports')],repositoryRules:[rule(middle,before,'router:restore-complete-original-native-source')]};
  const inverse=transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(applyConcreteSyntaxSubstitutions(end.document,inverseSequence).value)).source;
  if(inverse!==before||last.split('\n').length>=1000)fail('complete inverse or file bound differs');
  parse(ts,path,last);const nativeBindings=verifyNativeCopiedSourceBindings(ts,resolve(root,path),last);
  files.push({path,before,language:middle,after:last,beforeMeta:start.meta,afterMeta,sequence,inverseSequence,inverse,nativeBindings,current:existsSync(resolve(root,path))?readFileSync(resolve(root,path),'utf8'):null});
 }
 whole(DATA,input(CURRENT+'hash.js',PROFILES[1].pins['hash.js']).toString('utf8'),data,data);
 whole(GUARD,original,language,after);
 for(const row of inputs)if(hash(readFileSync(resolve(root,row.path)))!==row.sha256)fail('complete source changed during preparation');
 return {schema:'attribute-owner-node-profile-source-v1',typescriptVersion:ts.version,inputs,profiles,files,originalProfilePreserved:true,privateIssuersUnchanged:true,performanceQualified:false,sourceAuthority:false,runtimeParity:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))fail('use --emit|--write|--check');
 const result=prepareAttributeOwnerNodeProfile();if(args[0]==='--emit')console.log(JSON.stringify(result));else if(args[0]==='--write'){for(const row of result.files)writeFileSync(resolve(ROOT,row.path),row.after);console.log('Prepared two complete separately pinned Node profiles.');}else{if(result.files.some(row=>row.current!==row.after))fail('complete profile source is stale or ungenerated');console.log('Both complete pinned Node profiles and qualification equations are current.');}
}
