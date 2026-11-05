//! Independent native child environment oracle. SOURCE ONLY; UNRUN. CI after all JS gates.
use link_assistant_router::operation_context::{OperationContext, client_command};
#[test]
fn administrative_environment_is_removed_before_the_scoped_client_carrier_is_installed() {
    let root = tempfile::tempdir().expect("isolated state");
    let mut context = OperationContext::isolated(root.path());
    context.set_env("LINK_ASSISTANT_ROUTER_TOKEN", "private-admin");
    context.set_env("LINK_ASSISTANT_TOKEN", "private-other-admin");
    context.set_env("TOKEN_SECRET", "private-issuer");
    context.set_env("KEEP_USER_SETTING", "retain");
    context.scope(|| {
        let mut command = client_command("not-executed-vendor");
        for name in ["LINK_ASSISTANT_ROUTER_TOKEN", "LINK_ASSISTANT_TOKEN", "TOKEN_SECRET"] {
            let entry = command.get_envs().find(|(key, _)| *key == std::ffi::OsStr::new(name)).expect("explicit removal");
            assert_eq!(entry.1, None);
            assert!(link_assistant_router::operation_context::var(name).is_ok());
        }
        command.env("LINK_ASSISTANT_TOKEN", "scoped-client-run");
        let carrier = command.get_envs().find(|(key, _)| *key == std::ffi::OsStr::new("LINK_ASSISTANT_TOKEN")).expect("client carrier");
        assert_eq!(carrier.1, Some(std::ffi::OsStr::new("scoped-client-run")));
        assert_eq!(link_assistant_router::operation_context::var("KEEP_USER_SETTING").expect("user setting"), "retain");
    });
}
