import { create } from "zustand";
import type {
  ColumnInfo,
  PageSize,
  QueryFilter,
  QueryResult,
  TableInfo,
} from "@/types/database";
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
  pageSize: PageSize;
  orderBy: string | null;
  orderDir: "ASC" | "DESC";
  filters: QueryFilter[];

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
  setPageSize: (size: PageSize) => void;
  setOrderBy: (column: string | null, dir?: "ASC" | "DESC") => void;
  setColumnFilter: (filter: QueryFilter) => void;
  clearColumnFilter: (column: string) => void;
  clearFilters: () => void;
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
  filters: [],
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
        filters: [],
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
      filters: [],
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
    const { selectedTable, currentPage, pageSize, orderBy, orderDir, filters } = get();
    if (!selectedTable) return;

    set({ isLoading: true, error: null });
    try {
      const paged = pageSize !== "all";
      const result = await commands.queryTableData({
        table: selectedTable,
        limit: paged ? pageSize : undefined,
        offset: paged ? currentPage * pageSize : undefined,
        order_by: orderBy ?? undefined,
        order_dir: orderBy ? orderDir : undefined,
        filters: filters.length ? filters : undefined,
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

  setPageSize: (size: PageSize) => {
    set({ pageSize: size, currentPage: 0 });
    get().refreshData();
  },

  setOrderBy: (column: string | null, dir: "ASC" | "DESC" = "ASC") => {
    const { orderBy, orderDir } = get();
    if (column === orderBy) {
      if (orderDir === "ASC") {
        set({ orderDir: "DESC", currentPage: 0 });
      } else {
        set({ orderBy: null, orderDir: "ASC", currentPage: 0 });
      }
    } else {
      set({ orderBy: column, orderDir: dir, currentPage: 0 });
    }
    get().refreshData();
  },

  setColumnFilter: (filter: QueryFilter) => {
    const filters = get().filters.filter((item) => item.column !== filter.column);
    const hasSearch = Boolean(filter.search?.trim());
    const hasValues = Boolean(filter.values?.length);

    set({
      filters: hasSearch || hasValues ? [...filters, filter] : filters,
      currentPage: 0,
    });
    get().refreshData();
  },

  clearColumnFilter: (column: string) => {
    set({
      filters: get().filters.filter((filter) => filter.column !== column),
      currentPage: 0,
    });
    get().refreshData();
  },

  clearFilters: () => {
    set({ filters: [], currentPage: 0 });
    get().refreshData();
  },

  clearError: () => set({ error: null }),
}));
