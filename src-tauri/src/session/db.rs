//! SQLite database wrapper. Migrations are embedded at compile time.

use crate::error::AppResult;
use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
use sqlx::SqlitePool;
use std::path::Path;
use std::str::FromStr;

#[derive(Clone)]
pub struct Db {
    pub pool: SqlitePool,
}

impl Db {
    pub async fn open(path: &Path) -> AppResult<Self> {
        let url = format!("sqlite://{}", path.display());
        let opts = SqliteConnectOptions::from_str(&url)?
            .create_if_missing(true)
            .foreign_keys(true);
        let pool = SqlitePoolOptions::new()
            .max_connections(5)
            .connect_with(opts)
            .await?;
        Ok(Self { pool })
    }

    pub async fn migrate(&self) -> AppResult<()> {
        // Log pre-migration state so we can diagnose "migrations didn't apply"
        // bugs after the fact. The v1.0.0 → v1.1.0 upgrade exposed exactly this:
        // migrations were embedded in the binary but didn't reach the DB, with
        // no error surface anywhere. From here on, every startup logs the
        // migration ledger so silent failures become loud failures.
        let pre = sqlx::query_as::<_, (i64, String, bool)>(
            "SELECT version, description, success FROM _sqlx_migrations ORDER BY version",
        )
        .fetch_all(&self.pool)
        .await
        .unwrap_or_default();
        tracing::info!(
            "Migration ledger before run: {} applied",
            pre.len()
        );
        for (v, d, ok) in &pre {
            tracing::info!("  applied: {} {} success={}", v, d, ok);
        }

        match sqlx::migrate!("./migrations").run(&self.pool).await {
            Ok(()) => {
                let post = sqlx::query_as::<_, (i64, String, bool)>(
                    "SELECT version, description, success FROM _sqlx_migrations ORDER BY version",
                )
                .fetch_all(&self.pool)
                .await
                .unwrap_or_default();
                let new_count = post.len().saturating_sub(pre.len());
                if new_count > 0 {
                    tracing::info!("Migrations applied this run: {}", new_count);
                    for (v, d, ok) in post.iter().skip(pre.len()) {
                        tracing::info!("  new:     {} {} success={}", v, d, ok);
                    }
                } else {
                    tracing::info!("Migration ledger unchanged (all migrations already applied)");
                }
                Ok(())
            }
            Err(e) => {
                tracing::error!(
                    "Migration FAILED — this is the silent v1.0.0→v1.1.0 upgrade bug. Error: {e:?}"
                );
                Err(e.into())
            }
        }
    }
}
