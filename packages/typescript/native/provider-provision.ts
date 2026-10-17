// GENERATED JavaScript -> structured syntax AST -> TypeScript draft.
// Meta sha256=6bf7ce84e7e013fcf7fa94146b3e3c196df4ea6f0834f0e37f31ad1d4f507ae8; dynamic any annotations are explicit draft gaps.
import { providerProvisionResponse } from "./provider-manifest.js";
const failure: any = (outcome?: any, message?: any): any => (Object as any).assign(new (Error as any)(message), { code: 'provider_acceptance', outcome, exitCode: 1 });
export async function provisionLocalProvider(core?: any, input?: any): Promise<any> {
    const kind: any = (input.kind ?? 'openai-compatible').toLowerCase();
    if (!['openai-compatible', 'openai', 'openai_like', 'litellm', 'open-a-i-compatible'].includes(kind))
        throw failure('unverified', 'Specialized provider acceptance requires its reviewed live catalog probe');
    try {
        if (!core.installProvider && !core.providers?.install)
            throw failure('unverified', 'Injected provider store cannot confirm atomic installation');
        const installed: any = core.installProvider ? await (core.installProvider as any)(input) : await (core.providers.install as any)(input);
        return providerProvisionResponse({ ...installed.record, outcome: installed.outcome });
    }
    catch (error: any) {
        if (error.outcome)
            throw error;
        if (error.code === 'invalid_provider' || error.code === 'invalid_config')
            throw failure('invalid_candidate', 'Provider candidate is invalid');
        throw failure('persistence_uncertain', 'Provider store could not confirm installation');
    }
}
export async function importLocalProviders(core?: any, records?: any): Promise<any> {
    const report: any = { complete: true, results: [] };
    for (const record of records as any) {
        try {
            report.results.push(await provisionLocalProvider(core, record));
        }
        catch (error: any) {
            report.complete = false;
            report.results.push({ name: record.name, outcome: error.outcome ?? 'unverified' });
            break;
        }
    }
    return report;
}
