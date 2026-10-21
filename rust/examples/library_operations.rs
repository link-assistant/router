//! Import operations directly; never execute the Router binary.
use link_assistant_router::{cli, contracts, operation_context::OperationContext, operations};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let home = tempfile::tempdir()?;
    let mut context = OperationContext::isolated(home.path());
    context.set_env("TOKEN_SECRET", "example-isolated-secret");
    context.set_env("STORAGE_POLICY", "text");
    let version = operations::request(context.clone(), cli::Command::Version).await?;
    assert_eq!(version.data["version"], link_assistant_router::VERSION);
    let issued = context.scope(|| {
        cli::try_parse_arguments(vec![
            "router".into(),
            "tokens".into(),
            "issue".into(),
            "--label".into(),
            "example".into(),
        ])
    })?;
    let issued = operations::execute(context.clone(), issued).await?;
    assert!(issued.data["token"].as_str().unwrap().starts_with("la_sk_"));
    // Use the same entry point for every catalog operation. Each command's
    // help supplies a complete invocation without executing that operation.
    for operation in contracts::operations() {
        let mut arguments = vec!["router".into()];
        arguments.extend(
            operation["command"]
                .as_array()
                .unwrap()
                .iter()
                .map(|argument| argument.as_str().unwrap().into()),
        );
        arguments.push("--help".into());
        assert!(
            context
                .scope(|| cli::try_parse_arguments(arguments))
                .is_err()
        );
    }
    Ok(())
}
