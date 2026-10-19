// B1 is a source proposal, not a private compiler implementation. No public
// class census, copied metadata or caller request can activate this boundary.
import {
  originalPrivateParserIngressUnchanged,
  originalPrivateParserCommonIntrinsicsUnchanged,
  throwOriginalCapturedTypeError,
} from './original-json-intrinsics.mjs';
import {privateParserHostAvailable} from './private-parser-execution.mjs';

const initial=originalPrivateParserIngressUnchanged()
  &&originalPrivateParserCommonIntrinsicsUnchanged()&&privateParserHostAvailable();
// Only an independently reviewed future source producer may replace this.
// There is deliberately no registration, callback or caller-selected loader.
const PROGRAM=null;

function checked(){
  if(!initial||!originalPrivateParserIngressUnchanged()
    ||!originalPrivateParserCommonIntrinsicsUnchanged()||!privateParserHostAvailable()){
    throwOriginalCapturedTypeError('Private Rust compiler: original host operations changed');
  }
}
function unavailable(){
  throwOriginalCapturedTypeError('Private Rust compiler: complete module semantics and native escape closure remain unproved');
}

/** B1 has no prepared program. This is not an execution or ownership permit. */
export function originalPrivateRustCompilerProgram(){
  checked();if(PROGRAM!==null)unavailable();return null;
}

/** Fixed future preparation entry. B1 never imports or evaluates a graph. */
export async function preparePrivateRustCompiler(){checked();unavailable();}

/**
 * No caller data is read before refusal in the unprepared B1 domain.
 * @param {object} context
 * @param {object} request
 */
export function executePrivateRustCompiler(context,request){
  checked();unavailable();
}
