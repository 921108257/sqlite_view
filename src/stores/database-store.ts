import { create } from "zustand";
import type { TableInfo, ColumnInfo, QueryResult } from "@/types/database";
import * as commands from "@/tauri/commands";

interface DatabaseState {
  // Connection state
  isConnected: boolean;
  databasePath: string | null;

  // Tables state
  tables: TableInfo[];
  selectedTable: string | null;
  tableColumns: ColumnInfo[];

  // Data state
  queryResult: QueryResult | null;
  currentPage: number;
  pageSize: number;
  orderBy: string | null;
  orderDir: "ASC" | "DESC";

  // Loading states
  isLoading: boolean;
  error: string | null;

  // Actions
  openDatabase: (path: string) => Promise<void>;
  closeDatabase: () => Promise<void>;
  refreshTables: () => Promise<void>;
  selectTable: (tableName: string | null) => Promise<void>;
  refreshData: () => Promise<void>;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setOrderBy: (column: string | null, dir?: "ASC" | "DESC") => void;
  clearError: () => void;
}

export const useDatabaseStore = create<DatabaseState>((set, get) => ({
  // Initial state
  isConnected: false,
  databasePath: null,
  tables: [],
  selectedTable: null,
  tableColumns: [],
  queryResult: null,
  currentPage: 0,
  pageSize: 50,
  orderBy: null,
  orderDir: "ASC",
  isLoading: false,
  error: null,

  openDatabase: async (path: string) => {
    set({ isLoading: true, error: null });
    try {
      await commands.openDatabase(path);
      set({ isConnected: true, databasePath: path });
      await get().refreshTables();
    } catch (e) {
      set({ error: String(e) });
    } finally {
      set({ isLoading: false });
    }
  },

  closeDatabase: async () => {
    set({ isLoading: true, error: null });
    try {
      await commands.closeDatabase();
      set({
        isConnected: false,
        databasePath: null,
        tables: [],
        selectedTable: null,
        tableColumns: [],
        queryResult: null,
        currentPage: 0,
      });
    } catch (e) {
      set({ error: String(e) });
    } finally {
      set({ isLoading: false });
    }
  },

  refreshTables: async () => {
    if (!get().isConnected) return;
    set({ isLoading: true, error: null });
    try {
      const tables = await commands.listTables();
      set({ tables });
    } catch (e) {
      set({ error: String(e) });
    } finally {
      set({ isLoading: false });
    }
  },

  selectTable: async (tableName: string | null) => {
    set({
      selectedTable: tableName,
      tableColumns: [],
      queryResult: null,
      currentPage: 0,
      orderBy: null,
      orderDir: "ASC",
    });

    if (!tableName) return;

    set({ isLoading: true, error: null });
    try {
      const columns = await commands.getColumns(tableName);
      set({ tableColumns: columns });
      await get().refreshData();
    } catch (e) {
      set({ error: String(e) });
    } finally {
      set({ isLoading: false });
    }
  },

  refreshData: async () => {
    const { selectedTable, currentPage, pageSize, orderBy, orderDir } = get();
    if (!selectedTable) return;

    set({ isLoading: true, error: null });
    try {
      const result = await commands.queryTableData({
        table: selectedTable,
        limit: pageSize,
        offset: currentPage * pageSize,
        order_by: orderBy ?? undefined,
        order_dir: orderDir,
      });
      set({ queryResult: result });
    } catch (e) {
      set({ error: String(e) });
    } finally {
      set({ isLoading: false });
    }
  },

  setPage: (page: number) => {
    set({ currentPage: page });
    get().refreshData();
  },

  setPageSize: (size: number) => {
    set({ pageSize: size, currentPage: 0 });
    get().refreshData();
  },

  setOrderBy: (column: string | null, dir: "ASC" | "DESC" = "ASC") => {
    const { orderBy, orderDir } = get();
    if (column === orderBy) {
      set({ orderDir: orderDir === "ASC" ? "DESC" : "ASC" });
    } else {
      set({ orderBy: column, orderDir: dir });
    }
    get().refreshData();
  },

  clearError: () => set({ error: null }),
}));
