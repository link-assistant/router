//! Importable auth import operation.
/// Execute auth import with typed arguments and scoped dependencies.
/// ```no_run
/// # async fn example(args: link_assistant_router::cli::AuthOp) -> Result<(), Box<dyn std::error::Error>> {
/// let report = link_assistant_router::auth::import::import(Default::default(), args).await?;
/// assert!(report.success);
/// # Ok(()) }
/// ```
pub async fn import(
    context: crate::operation_context::OperationContext,
    op: crate::cli::AuthOp,
) -> Result<crate::operations::OperationResult, crate::operations::OperationError> {
    crate::operations::request(context, crate::cli::Command::Auth { op }).await
}
