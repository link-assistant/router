// Finite source-only investigation. Run through the task memory observer.
// Complete owner records are compared; this script issues no compiler authority.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {resolveModuleGraph} from '../../tools/translation/project.mjs';
import {resolveModuleBindings,resolveEnclosingNamespaceModuleBindings} from '../../tools/translation/module-bindings.mjs';
import {createDeriveFootprintContext,deriveFootprintExternalModules} from '../../tools/translation/derive-footprints.mjs';
import {createDeriveBangContext} from '../../tools/translation/derive-bang-context.mjs';
import {createDeriveEnclosingNamespaceContext} from '../../tools/translation/derive-enclosing-namespace-context.mjs';
import {registeredStandardHostBindings} from '../../tools/translation/standard-host-bindings.mjs';
import {originalMatchesNamespaceBindings,createMatchesMacroContext,configureMatchesMacroParser,matchesParserFacts} from '../../tools/translation/matches-macro-context.mjs';
import {HostRustParser} from '../../tools/translation/extensions/host-contracts.mjs';
import {tokenizeRust} from '../../tools/translation/extensions/lexical.mjs';
import {lockedTomlValueNamespaceBindings} from '../../tools/translation/toml-value-namespace.mjs';
import {loadDeriveDependencyProof} from '../../tools/translation/derive-dependencies.mjs';
import {createToolAttributeContext} from '../../tools/translation/tool-attributes.mjs';
import {PRODUCTION_PROFILE} from '../../tools/translation/cfg-profile.mjs';
import {metadataDigest} from '../../tools/translation/extensions/source-links.mjs';
import {sourceItems} from '../../tools/translation/rust-structure.mjs';

const args=process.argv.slice(2);
assert.ok(args.length===1&&['--fixture','--client-kind','--clients-tree','--main-tree','--lib-tree'].includes(args[0]),'use --fixture|--client-kind|--clients-tree|--main-tree|--lib-tree');
const root=process.cwd(),hash=value=>createHash('sha256').update(value).digest('hex');
const dependencyInputs={manifest:readFileSync(resolve(root,'rust/Cargo.toml'),'utf8'),lock:readFileSync(resolve(root,'Cargo.lock'),'utf8')};
const physicalClientSource=readFileSync(resolve(root,'rust/src/clients.rs'),'utf8');
const clientOwners=sourceItems(physicalClientSource).filter(row=>row.term==='enum'&&row.name==='ClientKind');assert.equal(clientOwners.length,1);
const owner=clientOwners[0],enumSource=args[0]==='--client-kind'?physicalClientSource.slice(owner.start,owner.end):'#[derive(Clone,Copy,Debug,PartialEq,Eq)]pub enum ClientKind{Codex,ClaudeCode}';
const actualTree=['--clients-tree','--main-tree','--lib-tree'].includes(args[0]);
const files=actualTree?Object.fromEntries(execFileSync('git',['ls-files','-z','rust/src'],{encoding:'utf8'}).split('\0').filter(path=>path.endsWith('.rs')).map(path=>[path,readFileSync(resolve(root,path),'utf8')])):{'src/lib.rs':enumSource+'impl ClientKind{pub fn from_str_opt(value:&str)->Option<Self>{match value{"codex"=>Some(Self::Codex),_=>None}}}'};
const dependencies=loadDeriveDependencyProof(dependencyInputs);
const entry=args[0]==='--main-tree'?'rust/src/main.rs':args[0]==='--clients-tree'?'rust/src/clients.rs':args[0]==='--lib-tree'?'rust/src/lib.rs':'src/lib.rs';
const graph=resolveModuleGraph({entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE});
const externalModules=registeredStandardHostBindings([...originalMatchesNamespaceBindings(),...lockedTomlValueNamespaceBindings(dependencies)]);
const deriveContext=createDeriveFootprintContext({modules:graph.modules,dependencies,externalModules,compilationProfile:graph.compilationProfile});
const resolvedExternal=deriveFootprintExternalModules(deriveContext);
const toolContext=createToolAttributeContext({modules:graph.modules,externalModules:resolvedExternal,deriveContext,compilationProfile:graph.compilationProfile});
const common={modules:graph.modules,externalModules:resolvedExternal,deriveContext,toolContext,compilationProfile:graph.compilationProfile};
const complete=resolveModuleBindings({...common,deriveBangContext:createDeriveBangContext({deriveContext})});
const enclosing=resolveEnclosingNamespaceModuleBindings({...common,deriveBangContext:createDeriveEnclosingNamespaceContext({deriveContext})});
const matches=createMatchesMacroContext({modules:graph.modules,compilationProfile:graph.compilationProfile,deriveDependencies:dependencies});
const rootModule=graph.modules.find(module=>module.file===entry&&module.path.length===0);assert.ok(rootModule);
const parser=new HostRustParser(tokenizeRust(rootModule.source));parser.compilationProfile=graph.compilationProfile;
configureMatchesMacroParser(parser,matches,{file:rootModule.file});
const captured=matchesParserFacts(parser).facts.evidence;
const differences=[];
for(const [comparison,evidence]of [['same-graph',complete],['independently-captured',captured]])for(const original of evidence.scopes){
 const current=enclosing.scopes.find(row=>row.file===original.file&&JSON.stringify(row.path)===JSON.stringify(original.path));
 assert.ok(current,'same complete physical scope set');
 for(const key of [...new Set([...Object.keys(original),...Object.keys(current)])]){
  if(metadataDigest(original[key])!==metadataDigest(current[key]))differences.push({comparison,file:original.file,path:original.path,key,complete:original[key],enclosing:current[key]});
 }
}
const result={schema:'finite-original-method-owner-scope-comparison-v1',runtime:process.versions,entry,files,dependencyInputs,physicalClientSource,selectedOwner:{span:[owner.start,owner.end],source:physicalClientSource.slice(owner.start,owner.end)},graphDiagnostics:graph.diagnostics,complete,enclosing,captured,differences,sourceAuthority:false,runtimeAuthority:false,scope:actualTree?'All physical tracked Rust files with the module graph rooted at the recorded entry. A clients.rs or main.rs root is not the library module graph. Original independently captured scope and same-graph scope remain separate comparisons.':'One complete controlled enum/method source. Complete and enclosing-name formats remain distinct; no cross-issuer method equivalence claim.'};
const raw=Buffer.from(JSON.stringify(result));assert.ok(raw.length<32*1024*1024);
const output=resolve(root,'ci-logs/issue-784-restart-2/current-method-owner-scope-comparison'+(args[0]==='--fixture'?'':args[0].slice(1))+'.json.gz');
writeFileSync(output,gzipSync(raw),{flag:'wx'});assert.ok(gunzipSync(readFileSync(output)).equals(raw));
console.log(JSON.stringify({output,logicalBytes:raw.length,sha256:hash(raw),scopes:complete.scopes.length,graphDiagnostics:graph.diagnostics?.length,differences:differences.map(({comparison,file,path,key})=>({comparison,file,path,key})),sourceAuthority:false,runtimeAuthority:false}));
