// Independent strict TypeScript DATA consumer. It issues no proof token.
type FunctionOrigin = {name: string; source: string};
type TypeContribution = {
    functions: readonly FunctionOrigin[];
    enclosingTypeContributionClosed: boolean;
    enclosingBangContributionClosed: boolean;
    bodyAdmission: boolean;
};
export function includedNames(value: TypeContribution): string[] {
    return value.functions.map(row => `${row.source}:${row.name}`);
}
export function hasTypeOnlyEffect(value: TypeContribution): boolean {
    return value.enclosingTypeContributionClosed && !value.enclosingBangContributionClosed && !value.bodyAdmission;
}
