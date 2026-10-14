import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {translateProject} from '../project.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {parseProgram} from '../semantic-meta.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const root=new URL('../../../',import.meta.url),manifest=readFileSync(new URL('Cargo.toml',root),'utf8'),lock=readFileSync(new URL('Cargo.lock',root),'utf8');
const dependencies=loadDeriveDependencyProof({manifest,lock}),hash=value=>createHash('sha256').update(value).digest('hex');
const pins=new Map([
  ['src/token.rs','7ca5ba2669621a395ddf9f9fbc3ce32c9c033be6fc8acea5b6ec264c233e53be'],
  ['src/token_constant_time.rs','5d4153c0badcfdf405532e56b0c97a5a87e1304e1f2b4b794add9fbd8bab2915'],
  ['src/token_run_lease.rs','e78dc5a26aab3a6a88a8d373696af530950a1abe73d55644f8d2bd8156e91447'],
  ['src/token_validate.rs','18f8c47dea08dca31c905576173d9ce9a7716bcf31cb51a646b70e0900144112'],
  ['src/token_error.rs','7461c7d04125715cbf5355778a10ba275d0af3742c61f12b99d37368af090353'],
]);
const sources=new Map([...pins].map(([path,digest])=>{const source=readFileSync(new URL(path,root),'utf8');assert.equal(hash(source),digest);return [path,source];}));
const project=()=>translateProject({entry:'src/token.rs',paths:[...sources.keys()],readSource:path=>sources.get(path),cargoManifest:manifest,deriveDependencies:dependencies,compilationProfile:PRODUCTION_PROFILE});
const tag=($,fields={})=>Object.freeze({$,...fields});

test('whole original token module translates signed-token carrier selection and claim selectors',{timeout:60000},async()=>{
  const result=project();
  assert.equal(result.meta.sources.length,5);for(const entry of result.meta.sources)assert.equal(entry.sha256,pins.get(entry.source));
  assert.equal(result.meta.runtimeParity,false);assert.ok(result.meta.refused.length,'JWT issuance, storage and generated traits remain unimplemented');
  const alias=result.executableDeclarations.find(entry=>entry.name==='codex_token_alias');assert.ok(alias);assert.equal(alias.sourceSha256,pins.get('src/token.rs'));assert.equal(alias.source,'src/token.rs');assert.equal(result.meta.refused.some(entry=>entry.name==='codex_token_alias'),false);
  const selector=result.meta.executable.find(entry=>entry.name==='token_jwt');assert.deepEqual(selector.span,{start:1536,end:1698});
  const certificate=result.meta.deriveNamespaceFootprints.certificates.find(entry=>entry.name==='TokenClaims');assert.ok(certificate);assert.equal(certificate.sourceSha256,pins.get('src/token.rs'));assert.equal(certificate.dimensions.bangMacroComplete,false);
  const standardDiagnostics=result.meta.deriveNamespaceFootprints.diagnostics.filter(entry=>['IssueRequest','RotateOverrides'].includes(entry.name));assert.deepEqual(standardDiagnostics.map(entry=>({name:entry.name,span:entry.span,message:entry.message})),[{name:'IssueRequest',span:{start:4827,end:6220},message:'Standard-only input retains a generic, helper, configuration or layout obligation'},{name:'RotateOverrides',span:{start:6488,end:7042},message:'Standard-only input retains a generic, helper, configuration or layout obligation'}]);assert.ok(standardDiagnostics.every(entry=>entry.source==='src/token.rs'));assert.equal(result.meta.deriveNamespaceFootprints.certificates.some(entry=>['IssueRequest','RotateOverrides'].includes(entry.name)),false);
  const target=parseProgram(JSON.stringify(result.meta.targetSemanticProgram)),aliases=[];
  for(const [method,alias,span]of [['may_reach_repository','originalMayReach',{start:4132,end:4400}],['is_admin','originalIsAdmin',{start:4467,end:4555}]]){
    assert.deepEqual(result.meta.checkedMethods.find(entry=>entry.name==='TokenClaims.'+method)?.span,span);
    const emitted=[...target.declarations.values()].find(entry=>entry.impl?.method===method);assert.ok(emitted);aliases.push(emitted.name+' as '+alias);
  }
  const suffix='\nexport {'+aliases.join(',')+'};';
  await verifyTypedTargets({...result,javascript:result.javascript+suffix,typescript:result.typescript+suffix},(api,_result,module)=>{
    for(const [written,expected]of [['la_sk_signed.jwt','at-signed.jwt'],['la_sk_','at-'],['la_sk_at-x','at-at-x'],['la_sk_Ω😀','at-Ω😀']])assert.deepEqual(api.codex_token_alias(written),tag('Some',{field0:expected}));
    for(const written of ['','la_sk','at-signed.jwt','LA_SK_x',' la_sk_x','prefix-la_sk_x','other'])assert.deepEqual(api.codex_token_alias(written),tag('None'));
    for(const written of [null,undefined,0,new String('la_sk_x'),'la_sk_\ud800'])assert.throws(()=>api.codex_token_alias(written),TypeError);
    for(const [written,expected]of [['la_sk_signed.jwt','signed.jwt'],['at-signed.jwt','signed.jwt'],['la_sk_',''],['at-',''],['la_sk_at-x','at-x'],['at-la_sk_x','la_sk_x'],['la_sk_Ω😀','Ω😀'],['at-Ω😀','Ω😀']])assert.deepEqual(api.token_jwt(written),tag('Some',{field0:expected}));
    for(const written of ['','la_sk','at','LA_SK_x','AT-x',' la_sk_x','prefix-la_sk_x','other'])assert.deepEqual(api.token_jwt(written),tag('None'));
    for(const written of [null,undefined,0,new String('la_sk_x'),'la_sk_\ud800'])assert.throws(()=>api.token_jwt(written),TypeError);
    const claims=(scope,repositories)=>tag('TokenClaims',{sub:'token-fixture',iat:0n,exp:9223372036854775807n,label:'fixture',scope,github_repos:Object.freeze(repositories),client_kind:tag('None'),principal_id:tag('None')});
    for(const [scope,expected]of [['admin',true],['',false],['ADMIN',false],[' admin ',false],['admin-read',false]])assert.equal(module.originalIsAdmin(claims(scope,[])),expected);
    for(const [repositories,requested,expected]of [[[],'anything/anywhere',true],[['Owner/Repo'],'owner/repo',true],[['Owner/Repo'],'OWNER/REPO',true],[['Owner/Repo'],'owner/other',false],[['One/A','Two/B'],'two/b',true],[['Ä/Repo'],'ä/repo',false]])assert.equal(module.originalMayReach(claims('',repositories),requested),expected);
    assert.throws(()=>module.originalMayReach(claims('',[]),'\ud800'),TypeError);
    assert.throws(()=>module.originalIsAdmin(claims('',[1])),TypeError);
  },{childTimeoutMs:30000});
});
