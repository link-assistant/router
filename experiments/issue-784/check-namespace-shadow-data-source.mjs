// Complete source proposal and inverse; no semantic or executable authority.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {createRulePipeline} from '../../tools/translation/rule-pipeline.mjs';
import {exactLiteralSubstitutionRule} from '../../tools/translation/literal-substitution-rule.mjs';
import {transportConcreteNamedSourcePhases} from '../../tools/translation/concrete-source-origin-phases.mjs';
import {ownershipCompiler} from '../../tools/translation/js-to-rust/vendor/module-syntax.mjs';
import {writeCompleteEvidenceJson} from './complete-evidence-json.mjs';

const path='tools/translation/source-scopes.mjs',sourceHead='beda7848b29a499f5cf3d1a7792d7353e62f12ca';
const before=execFileSync('git',['show',sourceHead+':'+path],{encoding:'utf8',maxBuffer:65536}),after=readFileSync(path,'utf8');
const ts=ownershipCompiler();assert.equal(ts.version,'5.9.3');
const parse=source=>{
 const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 assert.equal(file.parseDiagnostics.length,0);return file;
};
const old=parse(before),current=parse(after);
const declaration=(file,name)=>{
 const nodes=file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name);
 assert.equal(nodes.length,1);return nodes[0];
};
for(const name of ['parserSourceScope','cloneSourceNamespaces','requestImmutableNamespaceTargets'])
 assert.equal(declaration(current,name).getText(current),declaration(old,name).getText(old));
const helper=declaration(current,'configuredScopeEvidence');
assert.equal(old.statements.some(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='configuredScopeEvidence'),false);
const insertion=after.slice(helper.getStart(current),helper.end)+'\n';
const edits=[
 ['retain-private-shadow-data',
  'const immutableTargets=immutableBootstrap?new WeakMap():null;',
  'const immutableTargets=immutableBootstrap?new WeakMap():null;\nconst immutableScopeShadows=immutableBootstrap?new WeakMap():null;'],
 ['join-genuine-template',
  '    immutableTemplates.add(template);',
  "    immutableTemplates.add(template);\n    for(const candidate of scopes)immutableScopeShadows.set(candidate,{template,shadows:ownedScopes.get(candidate.path.join('.')).namespaceShadows});"],
 ['prepare-configuration-data',
  'export function configureParserSourceScope(parser,scope,scopes=[scope],path=scope.path){',
  insertion+'export function configureParserSourceScope(parser,scope,scopes=[scope],path=scope.path){'],
 ['select-internal-setup',
  '  const evidence=parserSourceScope(scope,scopes);',
  '  const evidence=configuredScopeEvidence(parser,scope,scopes);'],
];
const phases=[{phase:'language',rules:edits.map(([id,anchor,replacement])=>
 exactLiteralSubstitutionRule('language:'+id,anchor,replacement,'Complete namespace source anchor changed'))},
 {phase:'repository',rules:[]}];
const transformed=createRulePipeline(phases).run(before);assert.equal(transformed.value,after);
let inverse=after;
for(const [,anchor,replacement]of [...edits].reverse()){
 assert.equal(inverse.split(replacement).length,2);inverse=inverse.replace(replacement,()=>anchor);
}
assert.equal(inverse,before);
const [equation]=transportConcreteNamedSourcePhases([{before,middle:after,after,language:'JavaScript',rules:[
 'language:prepare-private-shadow-data','repository:retain-complete-parser-maps',
 'language:restore-original-setup','repository:restore-original-source']}]);
assert.equal(equation.inverse,before);
const output=writeCompleteEvidenceJson('ci-logs/issue-784-restart-2/namespace-shadow-data-source-equation.json',
 Buffer.from(JSON.stringify({path,sourceHead,before,middle:after,after,inverse,edits,equation,
 trace:transformed.trace,typescriptVersion:ts.version,publicScopeFunctionUnchanged:true,
 completeCloneFunctionUnchanged:true,semanticAuthority:false,runtimeParity:false,fullGateQualified:false,rustExecuted:false})));
console.log(JSON.stringify({output,typescriptVersion:ts.version,passed:true}));
