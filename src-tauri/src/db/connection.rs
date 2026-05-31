use parking_lot::Mutex;
use rusqlite::Connection;
use std::path::PathBuf;
use std::sync::Arc;

use crate::error::{AppError, AppResult};

pub struct DatabaseManager {
    connection: Mutex<Option<Connection>>,
    current_path: Mutex<Option<PathBuf>>,
}

impl DatabaseManager {
    pub fn new() -> Self {
        Self {
            connection: Mutex::new(None),
            current_path: Mutex::new(None),
        }
    }

    pub fn open(&self, path: &str) -> AppResult<()> {
        let path = PathBuf::from(path);
        let conn = Connection::open(&path)?;

        // Enable foreign keys
        conn.execute_batch("PRAGMA foreign_keys = ON;")?;

        *self.connection.lock() = Some(conn);
        *self.current_path.lock() = Some(path);

        Ok(())
    }

    pub fn close(&self) -> AppResult<()> {
        *self.connection.lock() = None;
        *self.current_path.lock() = None;
        Ok(())
    }

    pub fn is_connected(&self) -> bool {
        self.connection.lock().is_some()
    }

    pub fn current_path(&self) -> Option<String> {
        self.current_path
            .lock()
            .as_ref()
            .map(|p| p.to_string_lossy().to_string())
    }

    pub fn with_connection<F, T>(&self, f: F) -> AppResult<T>
    where
        F: FnOnce(&Connection) -> AppResult<T>,
    {
        let guard = self.connection.lock();
        let conn = guard.as_ref().ok_or(AppError::NoConnection)?;
        f(conn)
    }
}

impl Default for DatabaseManager {
    fn default() -> Self {
        Self::new()
    }
}

pub type DbManager = Arc<DatabaseManager>;

pub fn create_db_manager() -> DbManager {
    Arc::new(DatabaseManager::new())
}
