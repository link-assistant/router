// Literal message extraction only. No Display evaluation or formatting.
import {acceptRustCompletionPanicArguments} from './rust-completion-rules.js';

export function readRustCompletionPanicMessage(model,macroName,args) {
  if(!acceptRustCompletionPanicArguments(model,macroName,args[0]?.k??'',args[0]?.value??'',args[1]?.k??'',String(args.length)))return null;
  return args[1].value;
}
