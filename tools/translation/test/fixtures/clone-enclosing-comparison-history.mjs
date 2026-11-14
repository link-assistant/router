// Original Clone proposal receiving DATA. Current ordering has a separate equation.
import {readFileSync,mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ownershipCompiler} from '../../js-to-rust/vendor/module-syntax.mjs';
import {deriveStructOrderingSourceHistory} from '../../struct-ordering-source-history.mjs';
import {transportConcreteNamedSourcePhases} from '../../concrete-source-origin-phases.mjs';
import {prepareCloneEnclosingSources} from '../../prepare-clone-enclosing-source-history.mjs';
const ROOT=new URL('../../../../',import.meta.url);
const PATH='tools/translation/builtin-derive-bang-footprints.mjs',URL_PATH=new URL(PATH,ROOT);
const PATHS=['builtin-clone-ast-route.mjs','builtin-derive-bang-footprints.mjs',
 'derive-enclosing-namespace-context.mjs'].map(name=>'tools/translation/'+name);
const fail=message=>{throw new TypeError('Clone comparison receiving DATA: '+message);};

export function cloneEnclosingComparisonHistory(){
 const current=readFileSync(URL_PATH,'utf8');
 const history=deriveStructOrderingSourceHistory(ownershipCompiler(),{path:PATH,source:current});
 const [equation]=transportConcreteNamedSourcePhases([{before:history.before,middle:history.before,
  after:current,language:'JavaScript',rules:['javascript:complete-Clone-comparison-grammar',
   'router:installed-struct-ordering-source','javascript:restore-Clone-comparison-grammar',
   'router:restore-complete-Clone-comparison-source']}]);
 if(equation.before!==history.before||equation.middle!==history.before||
    equation.after!==current||equation.inverse!==history.before||
    readFileSync(URL_PATH,'utf8')!==current)fail('complete current source/CST inverse differs');
 return {path:PATH,current,historical:history.before,history,equation,
  sourceAuthority:false,runtimeAuthority:false,productionExecutableGain:0};
}

// Perform the original physical operation before viewing one exact predecessor.
// Other paths, encodings, errors and buffer results are left to the original fs API.
export function readCloneEnclosingComparisonSource(...args){
 const source=readFileSync(...args),path=args[0];
 if(typeof source!=='string'||!(path===fileURLToPath(URL_PATH)||path instanceof URL&&path.href===URL_PATH.href))return source;
 const history=cloneEnclosingComparisonHistory();
 if(source!==history.current)fail('physical input changed before comparison');
 return history.historical;
}

export function prepareCloneEnclosingComparisonSources(){
 const history=cloneEnclosingComparisonHistory(),physical=PATHS.map(path=>({path,
  current:readFileSync(new URL(path,ROOT),'utf8')}));
 const root=mkdtempSync(join(tmpdir(),'router-clone-comparison-'));
 try{
  for(const row of physical){const target=join(root,row.path);mkdirSync(dirname(target),{recursive:true});
   writeFileSync(target,row.path===PATH?history.historical:row.current,{flag:'wx'});}
  const plan=prepareCloneEnclosingSources({root});
  for(const row of physical)if(readFileSync(new URL(row.path,ROOT),'utf8')!==row.current)fail('complete physical source changed');
  return {...plan,comparisonScope:'exact complete predecessor of installed struct ordering',
   physicalSourceHistory:history};
 }finally{rmSync(root,{recursive:true,force:true});}
}
