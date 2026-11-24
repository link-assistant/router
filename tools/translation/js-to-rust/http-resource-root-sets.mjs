// Structural DATA only. Original source checking must independently issue roots.
export function httpResourceValueRoots(value){return value.roots?[...value.roots]:value.root?[value.root]:[];}
