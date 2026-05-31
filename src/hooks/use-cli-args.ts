import { useEffect } from "react";
import { getMatches } from "@tauri-apps/plugin-cli";
import { useDatabaseStore } from "@/stores/database-store";

export function useCliArgs() {
  const { openDatabase } = useDatabaseStore();

  useEffect(() => {
    async function handleCliArgs() {
      try {
        const matches = await getMatches();
        // 获取位置参数（拖放到图标时传入的文件路径）
        const fileArg = matches.args.file;
        if (fileArg && fileArg.value && typeof fileArg.value === "string") {
          const filePath = fileArg.value;
          const ext = filePath.split(".").pop()?.toLowerCase();
          if (["db", "sqlite", "sqlite3", "db3"].includes(ext ?? "")) {
            await openDatabase(filePath);
          }
        }
      } catch (e) {
        // CLI插件在开发模式下可能报错，忽略
        console.debug("CLI args not available:", e);
      }
    }

    handleCliArgs();
  }, [openDatabase]);
}
