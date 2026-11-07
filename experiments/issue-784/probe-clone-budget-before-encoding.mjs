// Finite resource regression: a rejected AST must not be encoded first.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadDeriveDependencyProof} from '../../tools/translation/derive-dependencies.mjs';
import {createDeriveFootprintContext} from '../../tools/translation/derive-footprints.mjs';
import {builtinDeriveDataInputs} from '../../tools/translation/builtin-derive-data-inputs.mjs';
import {builtinDeriveAstSourceProfile,originalAstFunction} from '../../tools/translation/builtin-derive-ast-meta.mjs';
import {liftBuiltinCloneAstRoute} from '../../tools/translation/builtin-clone-ast-route.mjs';
import {PRODUCTION_PROFILE} from '../../tools/translation/cfg-profile.mjs';
import {rustPackageSourcePath} from '../../tools/translation/repository-layout.mjs';
const readPackage=name=>readFileSync(rustPackageSourcePath(process.cwd(),name),'utf8');
const dependencies=loadDeriveDependencyProof({manifest:readPackage('Cargo.toml'),lock:readPackage('Cargo.lock')});
const profile=builtinDeriveAstSourceProfile(dependencies),entry=originalAstFunction(profile,'compiler/rustc_builtin_macros/src/deriving/clone.rs','expand_deriving_clone');
function request(fields){
 const source='#[derive(Clone)]pub struct Budget{'+Array.from({length:fields},(_,at)=>'f'+at+':String').join(',')+'}';
 const context=createDeriveFootprintContext({modules:[{file:'src/lib.rs',path:[],source}],dependencies,compilationProfile:PRODUCTION_PROFILE});
 const certificate=context.certificates[0],input=builtinDeriveDataInputs({source,span:certificate.span});
 return {profile,entry,certificate,input,original:{dependencies,module:{source}}};
}
liftBuiltinCloneAstRoute(request(1));
const input=request(128),stringify=JSON.stringify;
let evidenceEncodings=0,error=null;
try{
 JSON.stringify=function(...args){
  if(args[0]?.schema==='original-clone-positive-ast-output-v1')evidenceEncodings++;
  return Reflect.apply(stringify,JSON,args);
 };
 try{liftBuiltinCloneAstRoute(input);}catch(caught){error=caught;}
}finally{JSON.stringify=stringify;}
console.log(JSON.stringify({fields:128,evidenceEncodings,error:error&&{name:error.name,message:error.message},diagnosticOnly:true,semanticAuthority:false}));
assert.ok(error instanceof TypeError);
assert.match(error.message,/Clone positive AST validation budget exceeded/);
assert.equal(evidenceEncodings,0,'Rejected complete AST was encoded before its unchanged validation bound');
