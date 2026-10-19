// Analysis only: no declaration checking, executable admission, file writes or
// platform selection. Each complete source graph keeps its own profile scope.
import {createHash} from 'node:crypto';
import {resolveModuleGraph} from './project.mjs';
import {resolveModuleBindings} from './module-bindings.mjs';
import {compilationMatrixDescription,profileRelativePath} from './compilation-matrix.mjs';

const hash=value=>createHash('sha256').update(value).digest('hex');
const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
const safe=path=>typeof path==='string'&&path.endsWith('.rs')&&!path.includes('\\')&&!path.includes(':')&&!path.includes('\0')&&path.split('/').every(part=>part&&part!=='.'&&part!=='..');
export const PROFILE_GRAPH_LIMITS=Object.freeze({trackedPaths:20_000,entries:16,sourceBytes:8*1024*1024,totalSourceBytes:64*1024*1024});

export function analyzeCompilationMatrix({matrix,entries,paths,readSource,namespaceOptionsForGraph}={}){
  const description=compilationMatrixDescription(matrix);
  if(!Array.isArray(paths)||!paths.length||paths.length>PROFILE_GRAPH_LIMITS.trackedPaths)throw new TypeError('analysis tracked path budget exceeds 20000 or no paths were supplied');
  if(!Array.isArray(entries)||!entries.length||entries.length>PROFILE_GRAPH_LIMITS.entries)throw new TypeError('analysis entry budget exceeds 16 or no entries were supplied');
  if(paths.some(path=>!safe(path))||new Set(paths).size!==paths.length)throw new TypeError('analysis requires distinct tracked Rust source paths');
  const tracked=new Set(paths);
  if(entries.some(entry=>!tracked.has(entry))||new Set(entries).size!==entries.length)throw new TypeError('analysis entries must be distinct tracked source paths');
  if(typeof readSource!=='function'||namespaceOptionsForGraph!==undefined&&typeof namespaceOptionsForGraph!=='function')throw new TypeError('analysis requires an original source reader and optional namespace composition');
  // Capture every original tracked byte once, including inactive/unmatched
  // files. The reader is never reconsulted under another configured profile.
  const sourceMap=new Map(),sources=[];let totalSourceBytes=0;
  for(const path of [...paths].sort()){
    const source=readSource(path);if(typeof source!=='string')throw new TypeError('original Rust sources must be strings');
    const bytes=Buffer.byteLength(source);
    if(bytes>PROFILE_GRAPH_LIMITS.sourceBytes)throw new TypeError(`analysis original source byte budget exceeds 8388608 at ${path}`);
    totalSourceBytes+=bytes;
    if(totalSourceBytes>PROFILE_GRAPH_LIMITS.totalSourceBytes)throw new TypeError(`analysis total original source byte budget exceeds 67108864 at ${path}`);
    sourceMap.set(path,source);sources.push({source:path,sha256:hash(source),bytes});
  }
  const sourceSetSha256=hash(JSON.stringify(sources)),results=[];
  for(const member of description.profiles)for(const entry of [...entries].sort()){
    const graph=freeze(resolveModuleGraph({entry,paths:[...sourceMap.keys()],readSource:path=>sourceMap.get(path),compilationProfile:member.compilationProfile}));
    // Trusted compiler composition may supply the same sealed derive/tool and
    // registered external contexts as project checking. No inferred registry
    // or attribute whitelist is created here. Default analysis is tracked-only.
    const options=namespaceOptionsForGraph?.(graph,member)??{};
    if(graph.entry!==entry||JSON.stringify(graph.compilationProfile)!==JSON.stringify(member.compilationProfile)||graph.modules.some(module=>module.source!==sourceMap.get(module.file)||!Object.isFrozen(module)||!Object.isFrozen(module.items)))throw new TypeError('namespace composition changed the original frozen graph identity');
    if(options.compilationProfile!==undefined||options.modules!==undefined)throw new TypeError('namespace composition cannot replace the matrix graph or profile');
    const bindings=resolveModuleBindings({...options,modules:graph.modules,compilationProfile:member.compilationProfile});
    const modules=graph.modules.map(module=>({source:module.file,sha256:hash(module.source),module:module.path,configurationCondition:module.configurationCondition,configurationEvidence:module.configurationEvidence,inactiveItems:module.inactiveItems}));
    const namespaceSha256=hash(JSON.stringify(bindings)),graphSha256=hash(JSON.stringify({modules,edges:graph.edges,diagnostics:graph.diagnostics}));
    const contextSha256=hash(JSON.stringify({profile:member.sha256,entry,sourceSetSha256,namespaceSha256,graphSha256}));
    results.push({profile:member.name,profileSha256:member.sha256,compilationProfile:member.compilationProfile,entry,contextSha256,namespaceSha256,graphSha256,output:profileRelativePath(matrix,member.name,`${entry.slice(0,-3)}.graph-evidence.json`),namespaceComposition:namespaceOptionsForGraph?'explicit-compiler-composition':'tracked-only-external-and-expansion-proofs-absent',
      modules,
      moduleEdges:graph.edges,moduleDiagnostics:graph.diagnostics,bindingEvidence:bindings,
      sourceScopes:bindings.scopes.map(scope=>({source:scope.file,sha256:hash(sourceMap.get(scope.file)),profile:member.name,profileSha256:member.sha256,contextSha256,compilationProfile:member.compilationProfile,configurationCondition:scope.configurationCondition,scope})),
      macroFrontier:bindings.scopes.map(scope=>({source:scope.file,module:scope.path,unresolvedBangMacroScope:scope.unresolvedBangMacroScope,unresolvedAttributeMacroScope:scope.unresolvedAttributeMacroScope,unresolvedImports:scope.unresolvedImports})),runtimeParity:false});
  }
  return freeze({schemaVersion:1,kind:'explicit-profile-module-graph-evidence',matrix,sourceSetSha256,sources,results,limits:PROFILE_GRAPH_LIMITS,totalSourceBytes,runtimeParity:false,executableAdmission:false,commonExecutableOutput:false,
    obligations:[{kind:'profile-domain-incomplete',message:'Enumerated profiles do not establish coverage of all Rust targets, features, build modes or residual platform families.'},{kind:'profile-independent-admission-unproven',message:'No common executable is produced; required profiles must each prove actual source, namespace, type, dependency and effect obligations independently.'}]});
}
