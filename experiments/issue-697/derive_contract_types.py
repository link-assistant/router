from pathlib import Path
import re
p=Path('Cargo.toml');s=p.read_text();s=s.replace('serde_json = ', 'schemars = { version = "1.2", features = ["chrono04"] }\njsonschema = { version = "0.33", default-features = false }\nserde_json = ',1);p.write_text(s)
for filename in ['storage.rs','model_contract.rs','providers.rs','subscription_usage_types.rs','admin.rs','token_admin.rs','admin_api.rs','operations.rs']:
 p=Path('src')/filename;s=p.read_text()
 s=re.sub(r'#\[derive\(([^\n]+)\)\]',lambda m:m.group(0) if not re.search(r'(Serialize|Deserialize)',m[1]) else '#[derive('+m[1]+', schemars::JsonSchema)]',s)
 p.write_text(s)
p=Path('src/deploy/operations.rs');s=p.read_text().replace('let root = args.root.clone().unwrap_or_else(|| crate::deploy_cli::default_root(&data));','let root = args.root.as_ref().map_or_else(|| Ok(crate::deploy_cli::default_root(&data)), |root| crate::deploy_config::expand_home(root))?;');s=s.replace('let root = args\n            .root\n            .clone()\n            .unwrap_or_else(|| crate::deploy_cli::default_root(&data));','let root = args.root.as_ref().map_or_else(|| Ok(crate::deploy_cli::default_root(&data)), |root| crate::deploy_config::expand_home(root))?;');p.write_text(s)
p=Path('src/contracts.rs');s=p.read_text().replace('"languages":["rust","javascript","typescript","python"]','"languages":["rust","javascript","typescript","python"], "types": types()');s+='''
/// JSON Schemas derived from public HTTP and CLI data types.
#[must_use]
pub fn types() -> Value {
    json!({
        "OperationResult":schemars::schema_for!(crate::operations::OperationResult),
        "TokenRecord":schemars::schema_for!(crate::storage::TokenRecord),
        "ProviderRecord":schemars::schema_for!(crate::providers::RedactedProviderRecord),
        "ProviderUpsert":schemars::schema_for!(crate::providers::ProviderUpsert),
        "UsageEnvelope":schemars::schema_for!(crate::subscription_usage::UsageEnvelope),
        "AdminStatus":schemars::schema_for!(crate::admin::AdminStatus),
        "TtlRequest":schemars::schema_for!(crate::admin_api::TtlRequest),
        "ConfirmRequest":schemars::schema_for!(crate::admin_api::ConfirmRequest),
        "IssueTokenRequest":schemars::schema_for!(crate::token_admin::IssueTokenRequest),
        "IssueClientTokenRequest":schemars::schema_for!(crate::token_admin::IssueClientTokenRequest),
        "RevokeTokenRequest":schemars::schema_for!(crate::token_admin::RevokeTokenRequest),
        "RotateTokenRequest":schemars::schema_for!(crate::token_admin::RotateTokenRequest),
        "RotateClientTokenRequest":schemars::schema_for!(crate::token_admin::RotateClientTokenRequest)
    })
}
''';p.write_text(s)
