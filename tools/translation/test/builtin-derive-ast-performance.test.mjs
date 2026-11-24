import {repositorySourceURL} from "./fixtures/repository-paths.mjs";
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import * as actual from '../builtin-derive-ast-meta.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {originalMacroTrees} from '../macro-token-trees.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url)),commit='688bf9b9a1257a1dc58c758b50b6906ecc4eee63';
const previousBytes=readFileSync(new URL('../fixtures/static-source-performance/builtin-derive-ast-meta.mjs.txt',import.meta.url));
assert.equal(createHash('sha256').update(previousBytes).digest('hex'),'ef60bf6ce6d5f171ff62da1230490dcb3015c9b229ca7e4a22de8f46df2642d7');
const previousSource=previousBytes.toString().replace(/from '(\.\/[^']+)'/g,(_all,path)=>'from '+JSON.stringify(new URL('../'+path.slice(2),import.meta.url).href)).replace("new URL('./source-profiles/builtin-derive-bang/',import.meta.url)",JSON.stringify(new URL('../source-profiles/builtin-derive-bang/',import.meta.url).href));
const previous=await import('data:text/javascript;base64,'+Buffer.from(previousSource).toString('base64'));
const hash=value=>createHash('sha256').update(value).digest('hex');
const dependencies=()=>loadDeriveDependencyProof({manifest:readFileSync(repositorySourceURL('Cargo.toml',new URL('../../../',import.meta.url)),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',new URL('../../../',import.meta.url)),'utf8')});
const outcome=operation=>{try{return {value:operation()};}catch(error){return {error:{name:error.name,message:error.message}};}};
const profile=actual.builtinDeriveAstSourceProfile(dependencies());
test('complete original compiler recipe and definition inventory equals the immutable previous implementation',{timeout:120000},t=>{
  const deps=dependencies(),current=actual.builtinDeriveAstSourceProfile(deps),old=previous.builtinDeriveAstSourceProfile(deps),rows=[];
  assert.deepEqual(current,old);const started=performance.now();
  for(const entry of actual.BUILTIN_DERIVE_AST_PROFILE.sources){
    const origin=actual.builtinAstOriginal(current,entry.path);assert.deepEqual(origin,previous.builtinAstOriginal(old,entry.path));assert.equal(hash(origin.source),entry.sha256);
    const inventory=outcome(()=>originalMacroTrees(origin.source,{maxBytes:256000,maxTokens:32000,maxDepth:64}));
    if(inventory.error){
      for(const kind of ['fn','enum']){
        const operation=api=>kind==='fn'?api.originalAstFunction(api===actual?current:old,entry.path,'__inventory_missing'):api.originalAstDefinition(api===actual?current:old,entry.path,kind,'__inventory_missing');
        const before=outcome(()=>operation(previous)),after=outcome(()=>operation(actual));assert.deepEqual(after,before,entry.path+' entire original source refusal');assert.deepEqual(after.error,inventory.error);rows.push({path:entry.path,kind,name:'__inventory_missing',sourceSha256:origin.sha256,completeResultSha256:hash(JSON.stringify(after)),error:after.error});
      }
      continue;
    }
    const trees=inventory.value,names=new Map();
    function visit(nodes){for(let at=0;at<nodes.length;at++){const token=nodes[at],next=nodes[at+1];if(['fn','struct','enum'].includes(token.text)&&next?.kind==='token'&&/^[_\p{L}][_\p{L}\p{N}]*$/u.test(next.text))names.set(token.text+'::'+next.text,[token.text,next.text]);if(token.kind==='group')visit(token.children);}}
    visit(trees);
    for(const [kind,name]of names.values()){
      const operation=api=>kind==='fn'?api.originalAstFunction(api===actual?current:old,entry.path,name):api.originalAstDefinition(api===actual?current:old,entry.path,kind,name);
      const before=outcome(()=>operation(previous)),after=outcome(()=>operation(actual));assert.deepEqual(after,before,entry.path+'::'+kind+'::'+name+' full syntax/source/span/hash/error');
      rows.push({path:entry.path,kind,name,sourceSha256:origin.sha256,completeResultSha256:hash(JSON.stringify(after)),span:after.value?.span??null,error:after.error??null});
    }
  }
  const path='compiler/rustc_builtin_macros/src/deriving/generic/ty.rs';
  for(const selector of ['Unit =>',') -> P<ast::Ty> {\n        cx.ty_path(self.to_path','does-not-exist','']){
    const before=outcome(()=>previous.originalAstFunction(old,path,'to_ty',selector)),after=outcome(()=>actual.originalAstFunction(current,path,'to_ty',selector));assert.deepEqual(after,before,'overload selector '+selector);rows.push({path,name:'to_ty',selector,completeResultSha256:hash(JSON.stringify(after)),error:after.error??null});
  }
  const receipt={schema:'independent-original-compiler-syntax-v1',commit,previousModuleSha256:hash(previousBytes),sourceFiles:actual.BUILTIN_DERIVE_AST_PROFILE.sources.length,inventoryEntries:rows.length,elapsedMilliseconds:performance.now()-started,rows};t.diagnostic(JSON.stringify({...receipt,rows:undefined}));t.diagnostic('complete-comparison-base64:'+Buffer.from(JSON.stringify(receipt)).toString('base64'));
});
test('syntax reuse preserves existing fragment identities and independent genuine profile ownership',()=>{
  const path='compiler/rustc_builtin_macros/src/deriving/default.rs',name='expand_deriving_default',first=actual.originalAstFunction(profile,path,name);
  assert.strictEqual(actual.originalAstFunction(profile,path,name),first);assert.ok(Object.isFrozen(first.syntax));assert.throws(()=>first.syntax[0].text='forged',TypeError);
  const foreign=actual.builtinDeriveAstSourceProfile(dependencies());assert.notStrictEqual(foreign,profile);assert.deepEqual(foreign,profile);
  const another=actual.originalAstFunction(foreign,path,name);assert.notStrictEqual(another,first);assert.deepEqual(another,first);assert.throws(()=>actual.assertOriginalAstFunction(foreign,first),/Unsealed/);
  const definitionPath='compiler/rustc_ast/src/ast.rs',a=actual.originalAstDefinition(profile,definitionPath,'enum','ExprKind'),b=actual.originalAstDefinition(profile,definitionPath,'enum','ExprKind');assert.notStrictEqual(a,b);assert.notStrictEqual(a.syntax,b.syntax);assert.deepEqual(a,b);assert.strictEqual(actual.assertOriginalAstFunction(profile,a),a);
  for(const copied of [structuredClone(first),Object.freeze({...first})])assert.throws(()=>actual.assertOriginalAstFunction(profile,copied),/Unsealed/);
});
test('copied refrozen foreign accessor and proxy profiles refuse before source/cache effects',()=>{
  const path='compiler/rustc_builtin_macros/src/deriving/default.rs';actual.originalAstFunction(profile,path,'expand_deriving_default');let traps=0;
  const proxy=new Proxy(profile,{get(){traps++;throw new Error('must not inspect');},ownKeys(){traps++;throw new Error('must not inspect');},getPrototypeOf(){traps++;throw new Error('must not inspect');}}),getter=Object.defineProperty({},'sources',{get(){traps++;throw new Error('must not inspect');}});
  for(const foreign of [structuredClone(profile),Object.freeze({...profile}),previous.builtinDeriveAstSourceProfile(dependencies()),proxy,getter,null]){
    assert.throws(()=>actual.originalAstFunction(foreign,path,'expand_deriving_default'),/Unsealed/);assert.throws(()=>actual.originalAstDefinition(foreign,path,'struct','TraitDef'),/Unsealed/);assert.throws(()=>actual.builtinAstOriginal(foreign,path),/Unsealed/);
  }
  assert.equal(traps,0);const origin=actual.builtinAstOriginal(profile,path);assert.throws(()=>origin.source+=' ',TypeError);assert.throws(()=>origin.sha256='0'.repeat(64),TypeError);assert.throws(()=>profile.sourceProfileSha256='0'.repeat(64),TypeError);
  for(const pathValue of [path+' ',undefined,'missing.rs'])assert.throws(()=>actual.originalAstFunction(profile,pathValue,'expand_deriving_default'),/Unsealed|missing/);
  assert.throws(()=>actual.originalAstFunction(profile,path,'expand_deriving_default','x'.repeat(257)),/selector/);
  assert.strictEqual(actual.assertOriginalAstFunction(profile,actual.originalAstFunction(profile,path,'expand_deriving_default')),actual.originalAstFunction(profile,path,'expand_deriving_default'));
});

test('one immutable source parse is reused inside its issuer while independent profiles parse independently',async()=>{
  const bytes=readFileSync(new URL('../builtin-derive-ast-meta.mjs',import.meta.url)),instrumented=bytes.toString().replace(/from '(\.\/[^']+)'/g,(_all,path)=>'from '+JSON.stringify(new URL('../'+path.slice(2),import.meta.url).href)).replace("new URL('./source-profiles/builtin-derive-bang/',import.meta.url)",JSON.stringify(new URL('../source-profiles/builtin-derive-bang/',import.meta.url).href)).replace('import {originalMacroTrees} from ', 'import {originalMacroTrees as pinnedMacroTrees} from ')+'\nlet sourceParses=0;const originalMacroTrees=(...args)=>{sourceParses++;return pinnedMacroTrees(...args);};export const sourceParseCount=()=>sourceParses;';
  const measured=await import('data:text/javascript;base64,'+Buffer.from(instrumented).toString('base64')),first=measured.builtinDeriveAstSourceProfile(dependencies()),path='compiler/rustc_builtin_macros/src/deriving/default.rs';
  measured.originalAstFunction(first,path,'expand_deriving_default');measured.originalAstFunction(first,path,'default_struct_substructure');assert.equal(measured.sourceParseCount(),1);
  const definition='compiler/rustc_ast/src/ast.rs';measured.originalAstDefinition(first,definition,'enum','ExprKind');measured.originalAstDefinition(first,definition,'enum','TyKind');assert.equal(measured.sourceParseCount(),2);
  const second=measured.builtinDeriveAstSourceProfile(dependencies());measured.originalAstFunction(second,path,'expand_deriving_default');assert.equal(measured.sourceParseCount(),3);
  assert.throws(()=>measured.originalAstFunction({...first},path,'expand_deriving_default'),/Unsealed/);assert.equal(measured.sourceParseCount(),3);
});
