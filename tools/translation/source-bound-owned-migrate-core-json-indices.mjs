// The indices mode retains the original proposal schema, phases and binder scope.
import {proposeCoreJsonReadAdoption} from './source-bound-owned-core-json-read-adoption.mjs';
export function proposeCoreJsonIndicesCorpus(options={}){return proposeCoreJsonReadAdoption('indices',options);}
