// Storage-only native source snapshots use the existing private native closure.
// No live util/global reflection is reacquired here, and no snapshot is accepted
// by a semantic entry as an authority/skip token. Only new corpus APIs use this.
import {capturePrivateParserCorpusSources} from '../private-parser-execution.mjs';
export function captureNativeCorpusSources(input,options){return capturePrivateParserCorpusSources(input,options);}
