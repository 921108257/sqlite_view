# SQLite View

A modern, cross-platform SQLite database viewer built with Tauri, React, and TypeScript.

## Features

- 🗂️ **Table Management**: Create, rename, delete, and alter tables (add/drop columns)
- 📊 **Data Viewing**: View data in table or JSON format
- ✏️ **Inline Editing**: Press Enter (or double-click) on a cell to edit it in place
- ➕ **Data Operations**: Add, edit, and delete rows (single or multi-select)
- 🔍 **Filtering & Search**: Per-column filters plus a search across every column
- 🧭 **Sorting & Pagination**: Sort by columns, page through data or load every row
- 📤 **Export**: Write the whole table to CSV or JSON; copy a row as a SQL `INSERT`
- 📁 **Drag & Drop**: Drop SQLite files directly onto the app
- ⌨️ **Keyboard Support**: Arrow keys move between cells, Enter edits, Escape cancels
- 🌐 **Internationalization**: 7 UI languages with locale-aware number formatting
- 🎨 **Modern UI**: Clean, responsive interface with dark mode support

## Installation

### Download

Download the latest release for your platform from the [Releases](https://github.com/921108257/sqlite-view/releases) page.

### Build from Source

Prerequisites:
- Node.js 18+
- pnpm
- Rust (latest stable)

```bash
# Clone the repository
git clone https://github.com/921108257/sqlite-view.git
cd sqlite-view

# Install dependencies
pnpm install

# Run in development mode
pnpm tauri dev

# Build for production
pnpm tauri build
```

## Usage

1. **Open a Database**: Click "Open Database" or drag a `.db`, `.sqlite`, `.sqlite3`, or `.db3` file onto the window
2. **Browse Tables**: Select a table from the sidebar to view its data
3. **Edit Data**: Double-click any cell to edit its value
4. **Add Rows**: Click "Add Row" to insert new data
5. **Delete Rows**: Hover over a row and click the trash icon
6. **Switch Views**: Toggle between Table and JSON views

## Tech Stack

- **Framework**: [Tauri 2.x](https://tauri.app/)
- **Frontend**: React 18 + TypeScript + Vite
- **UI**: [shadcn/ui](https://ui.shadcn.com/) + Tailwind CSS
- **Table**: [TanStack Table](https://tanstack.com/table)
- **State**: [Zustand](https://zustand-demo.pmnd.rs/)
- **Database**: [rusqlite](https://github.com/rusqlite/rusqlite)

## License

MIT License - see [LICENSE](LICENSE) for details.
