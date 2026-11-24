// Explicit maintainer-owned API adoption; no original Clone dispatch authority.
import {proposeCoreJsonReadAdoption} from './core-json-read-adoption.mjs';
export function proposeCoreJsonCopiesCorpus(options={}){return proposeCoreJsonReadAdoption('copies',options);}
