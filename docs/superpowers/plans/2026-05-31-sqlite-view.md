# SQLite View 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个跨平台的开源SQLite查看器，支持表格/JSON视图、表和数据的增删改查操作

**Architecture:** Tauri作为跨平台桌面框架（Rust后端处理SQLite操作，React前端渲染UI）。采用命令模式将前后端解耦，后端暴露SQLite操作命令，前端通过Tauri invoke调用。使用TanStack Table处理表格渲染和虚拟滚动。

**Tech Stack:** 
- 桌面框架: Tauri 2.x
- 前端: React 18 + TypeScript + Vite
- UI组件: shadcn/ui + Tailwind CSS
- 表格: TanStack Table v8
- SQLite: rusqlite (Rust)
- 状态管理: Zustand
- 图标: Lucide React

---

## 文件结构

```
sqlite-view/
├── src-tauri/                    # Tauri Rust 后端
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── capabilities/
│   │   └── default.json          # 权限配置
│   ├── icons/                    # 应用图标
│   └── src/
│       ├── main.rs               # 入口
│       ├── lib.rs                # 库入口，注册命令
│       ├── db/
│       │   ├── mod.rs            # 数据库模块
│       │   ├── connection.rs     # 连接管理
│       │   ├── schema.rs         # 表结构查询
│       │   └── query.rs          # 数据查询/修改
│       ├── commands/
│       │   ├── mod.rs            # 命令模块
│       │   ├── file.rs           # 文件操作命令
│       │   ├── table.rs          # 表操作命令
│       │   └── data.rs           # 数据操作命令
│       └── error.rs              # 错误处理
├── src/                          # React 前端
│   ├── main.tsx                  # React入口
│   ├── App.tsx                   # 根组件
│   ├── index.css                 # 全局样式 + Tailwind
│   ├── lib/
│   │   └── utils.ts              # 工具函数(cn等)
│   ├── hooks/
│   │   ├── use-database.ts       # 数据库状态hook
│   │   ├── use-tables.ts         # 表列表hook
│   │   └── use-table-data.ts     # 表数据hook
│   ├── stores/
│   │   └── database-store.ts     # Zustand store
│   ├── components/
│   │   ├── ui/                   # shadcn/ui 组件
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── table.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── textarea.tsx
│   │   │   ├── toast.tsx
│   │   │   ├── toaster.tsx
│   │   │   └── scroll-area.tsx
│   │   ├── layout/
│   │   │   ├── header.tsx        # 顶部栏
│   │   │   ├── sidebar.tsx       # 侧边栏(表列表)
│   │   │   └── main-content.tsx  # 主内容区
│   │   ├── table-list/
│   │   │   ├── table-list.tsx    # 表列表组件
│   │   │   └── table-item.tsx    # 单个表项
│   │   ├── data-view/
│   │   │   ├── data-table.tsx    # 数据表格视图
│   │   │   ├── json-view.tsx     # JSON视图
│   │   │   ├── view-toggle.tsx   # 视图切换
│   │   │   ├── column-header.tsx # 列头(排序)
│   │   │   └── cell-editor.tsx   # 单元格编辑器
│   │   ├── dialogs/
│   │   │   ├── create-table-dialog.tsx   # 创建表
│   │   │   ├── edit-table-dialog.tsx     # 编辑表结构
│   │   │   ├── delete-confirm-dialog.tsx # 删除确认
│   │   │   └── add-row-dialog.tsx        # 添加行
│   │   └── drop-zone.tsx         # 拖放区域
│   ├── types/
│   │   └── database.ts           # 类型定义
│   └── tauri/
│       └── commands.ts           # Tauri命令封装
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── components.json               # shadcn/ui配置
└── README.md
```

---

## Phase 1: 项目初始化

### Task 1: 创建Tauri项目

**Files:**
- Create: `package.json`
- Create: `src-tauri/Cargo.toml`
- Create: `src-tauri/tauri.conf.json`

- [ ] **Step 1: 使用pnpm创建Tauri + React + TypeScript项目**

```bash
pnpm create tauri-app sqlite-view --template react-ts --manager pnpm --yes
```

等待项目创建完成。

- [ ] **Step 2: 进入项目目录并安装依赖**

```bash
cd sqlite-view
pnpm install
```

Expected: 依赖安装成功，无错误

- [ ] **Step 3: 验证项目结构**

```bash
ls -la src-tauri/src/
```

Expected: 看到 `main.rs` 和 `lib.rs`

- [ ] **Step 4: 运行开发服务器验证**

```bash
pnpm tauri dev
```

Expected: 应用窗口打开，显示默认Tauri欢迎页面

- [ ] **Step 5: 关闭开发服务器，提交初始代码**

```bash
git init
git add .
git commit -m "chore: init tauri + react + typescript project"
```

---

### Task 2: 配置Tailwind CSS

**Files:**
- Create: `tailwind.config.js`
- Create: `postcss.config.js`
- Modify: `src/index.css`

- [ ] **Step 1: 安装Tailwind及相关依赖**

```bash
pnpm add -D tailwindcss postcss autoprefixer
pnpm dlx tailwindcss init -p
```

- [ ] **Step 2: 配置tailwind.config.js**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
```

- [ ] **Step 3: 安装tailwindcss-animate插件**

```bash
pnpm add -D tailwindcss-animate
```

- [ ] **Step 4: 替换src/index.css内容**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 221.2 83.2% 53.3%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 217.2 91.2% 59.8%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 224.3 76.3% 48%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
    font-feature-settings: "rlig" 1, "calt" 1;
  }
}
```

- [ ] **Step 5: 验证Tailwind工作正常**

修改 `src/App.tsx`:

```tsx
function App() {
  return (
    <div className="min-h-screen bg-background p-8">
      <h1 className="text-3xl font-bold text-primary">SQLite View</h1>
      <p className="text-muted-foreground mt-2">Tailwind is working!</p>
    </div>
  );
}

export default App;
```

运行 `pnpm tauri dev`，确认样式正确显示。

- [ ] **Step 6: 提交**

```bash
git add .
git commit -m "chore: configure tailwind css with shadcn theme"
```

---

### Task 3: 配置shadcn/ui

**Files:**
- Create: `components.json`
- Create: `src/lib/utils.ts`

- [ ] **Step 1: 安装shadcn/ui依赖**

```bash
pnpm add clsx tailwind-merge class-variance-authority lucide-react
```

- [ ] **Step 2: 创建utils.ts**

```bash
mkdir -p src/lib
```

创建 `src/lib/utils.ts`:

```typescript
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 3: 创建components.json**

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.js",
    "css": "src/index.css",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

- [ ] **Step 4: 配置路径别名 - 更新tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 5: 配置Vite路径别名 - 更新vite.config.ts**

```bash
pnpm add -D @types/node
```

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig(async () => ({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
}));
```

- [ ] **Step 6: 验证路径别名工作**

修改 `src/App.tsx`:

```tsx
import { cn } from "@/lib/utils";

function App() {
  return (
    <div className={cn("min-h-screen bg-background p-8")}>
      <h1 className="text-3xl font-bold text-primary">SQLite View</h1>
      <p className="text-muted-foreground mt-2">shadcn/ui configured!</p>
    </div>
  );
}

export default App;
```

运行 `pnpm tauri dev`，确认无编译错误。

- [ ] **Step 7: 提交**

```bash
git add .
git commit -m "chore: configure shadcn/ui with path aliases"
```

---

### Task 4: 添加shadcn/ui基础组件

**Files:**
- Create: `src/components/ui/button.tsx`
- Create: `src/components/ui/input.tsx`
- Create: `src/components/ui/dialog.tsx`
- Create: `src/components/ui/dropdown-menu.tsx`
- Create: `src/components/ui/table.tsx`
- Create: `src/components/ui/tabs.tsx`
- Create: `src/components/ui/textarea.tsx`
- Create: `src/components/ui/scroll-area.tsx`
- Create: `src/components/ui/toast.tsx`
- Create: `src/components/ui/toaster.tsx`

- [ ] **Step 1: 安装Radix UI依赖**

```bash
pnpm add @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-tabs @radix-ui/react-scroll-area @radix-ui/react-toast @radix-ui/react-slot
```

- [ ] **Step 2: 创建Button组件**

```bash
mkdir -p src/components/ui
```

创建 `src/components/ui/button.tsx`:

```tsx
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
```

- [ ] **Step 3: 创建Input组件**

创建 `src/components/ui/input.tsx`:

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
```

- [ ] **Step 4: 创建Dialog组件**

创建 `src/components/ui/dialog.tsx`:

```tsx
import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
```

- [ ] **Step 5: 创建Table组件**

创建 `src/components/ui/table.tsx`:

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="relative w-full overflow-auto">
      <table ref={ref} className={cn("w-full caption-bottom text-sm", className)} {...props} />
    </div>
  )
);
Table.displayName = "Table";

const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />
  )
);
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tbody ref={ref} className={cn("[&_tr:last-child]:border-0", className)} {...props} />
  )
);
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tfoot ref={ref} className={cn("border-t bg-muted/50 font-medium [&>tr]:last:border-b-0", className)} {...props} />
  )
);
TableFooter.displayName = "TableFooter";

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn("border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted", className)}
      {...props}
    />
  )
);
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th
      ref={ref}
      className={cn(
        "h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
);
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td ref={ref} className={cn("p-4 align-middle [&:has([role=checkbox])]:pr-0", className)} {...props} />
  )
);
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef<HTMLTableCaptionElement, React.HTMLAttributes<HTMLTableCaptionElement>>(
  ({ className, ...props }, ref) => (
    <caption ref={ref} className={cn("mt-4 text-sm text-muted-foreground", className)} {...props} />
  )
);
TableCaption.displayName = "TableCaption";

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };
```

- [ ] **Step 6: 创建Tabs组件**

创建 `src/components/ui/tabs.tsx`:

```tsx
import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
      className
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
      className
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
```

- [ ] **Step 7: 创建Textarea组件**

创建 `src/components/ui/textarea.tsx`:

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
```

- [ ] **Step 8: 创建ScrollArea组件**

创建 `src/components/ui/scroll-area.tsx`:

```tsx
import * as React from "react";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import { cn } from "@/lib/utils";

const ScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root>
>(({ className, children, ...props }, ref) => (
  <ScrollAreaPrimitive.Root ref={ref} className={cn("relative overflow-hidden", className)} {...props}>
    <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit]">
      {children}
    </ScrollAreaPrimitive.Viewport>
    <ScrollBar />
    <ScrollAreaPrimitive.Corner />
  </ScrollAreaPrimitive.Root>
));
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName;

const ScrollBar = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>
>(({ className, orientation = "vertical", ...props }, ref) => (
  <ScrollAreaPrimitive.ScrollAreaScrollbar
    ref={ref}
    orientation={orientation}
    className={cn(
      "flex touch-none select-none transition-colors",
      orientation === "vertical" && "h-full w-2.5 border-l border-l-transparent p-[1px]",
      orientation === "horizontal" && "h-2.5 flex-col border-t border-t-transparent p-[1px]",
      className
    )}
    {...props}
  >
    <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-border" />
  </ScrollAreaPrimitive.ScrollAreaScrollbar>
));
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName;

export { ScrollArea, ScrollBar };
```

- [ ] **Step 9: 创建DropdownMenu组件**

创建 `src/components/ui/dropdown-menu.tsx`:

```tsx
import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { Check, ChevronRight, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

const DropdownMenu = DropdownMenuPrimitive.Root;
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
const DropdownMenuGroup = DropdownMenuPrimitive.Group;
const DropdownMenuPortal = DropdownMenuPrimitive.Portal;
const DropdownMenuSub = DropdownMenuPrimitive.Sub;
const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

const DropdownMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> & { inset?: boolean }
>(({ className, inset, children, ...props }, ref) => (
  <DropdownMenuPrimitive.SubTrigger
    ref={ref}
    className={cn(
      "flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent data-[state=open]:bg-accent",
      inset && "pl-8",
      className
    )}
    {...props}
  >
    {children}
    <ChevronRight className="ml-auto h-4 w-4" />
  </DropdownMenuPrimitive.SubTrigger>
));
DropdownMenuSubTrigger.displayName = DropdownMenuPrimitive.SubTrigger.displayName;

const DropdownMenuSubContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.SubContent
    ref={ref}
    className={cn(
      "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      className
    )}
    {...props}
  />
));
DropdownMenuSubContent.displayName = DropdownMenuPrimitive.SubContent.displayName;

const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
));
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName;

const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & { inset?: boolean }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      inset && "pl-8",
      className
    )}
    {...props}
  />
));
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName;

const DropdownMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
  <DropdownMenuPrimitive.CheckboxItem
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    checked={checked}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.CheckboxItem>
));
DropdownMenuCheckboxItem.displayName = DropdownMenuPrimitive.CheckboxItem.displayName;

const DropdownMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
  <DropdownMenuPrimitive.RadioItem
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Circle className="h-2 w-2 fill-current" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.RadioItem>
));
DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName;

const DropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> & { inset?: boolean }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Label
    ref={ref}
    className={cn("px-2 py-1.5 text-sm font-semibold", inset && "pl-8", className)}
    {...props}
  />
));
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName;

const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator ref={ref} className={cn("-mx-1 my-1 h-px bg-muted", className)} {...props} />
));
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName;

const DropdownMenuShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => {
  return <span className={cn("ml-auto text-xs tracking-widest opacity-60", className)} {...props} />;
};
DropdownMenuShortcut.displayName = "DropdownMenuShortcut";

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
};
```

- [ ] **Step 10: 创建Toast组件**

创建 `src/components/ui/toast.tsx`:

```tsx
import * as React from "react";
import * as ToastPrimitives from "@radix-ui/react-toast";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const ToastProvider = ToastPrimitives.Provider;

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]",
      className
    )}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitives.Viewport.displayName;

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full",
  {
    variants: {
      variant: {
        default: "border bg-background text-foreground",
        destructive: "destructive group border-destructive bg-destructive text-destructive-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> & VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => {
  return <ToastPrimitives.Root ref={ref} className={cn(toastVariants({ variant }), className)} {...props} />;
});
Toast.displayName = ToastPrimitives.Root.displayName;

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-muted/40 group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus:ring-destructive",
      className
    )}
    {...props}
  />
));
ToastAction.displayName = ToastPrimitives.Action.displayName;

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100 group-[.destructive]:text-red-300 group-[.destructive]:hover:text-red-50 group-[.destructive]:focus:ring-red-400 group-[.destructive]:focus:ring-offset-red-600",
      className
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitives.Close>
));
ToastClose.displayName = ToastPrimitives.Close.displayName;

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title ref={ref} className={cn("text-sm font-semibold", className)} {...props} />
));
ToastTitle.displayName = ToastPrimitives.Title.displayName;

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description ref={ref} className={cn("text-sm opacity-90", className)} {...props} />
));
ToastDescription.displayName = ToastPrimitives.Description.displayName;

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>;
type ToastActionElement = React.ReactElement<typeof ToastAction>;

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
};
```

- [ ] **Step 11: 创建useToast hook和Toaster组件**

创建 `src/hooks/use-toast.ts`:

```typescript
import * as React from "react";
import type { ToastActionElement, ToastProps } from "@/components/ui/toast";

const TOAST_LIMIT = 1;
const TOAST_REMOVE_DELAY = 1000000;

type ToasterToast = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
};

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const;

let count = 0;

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return count.toString();
}

type ActionType = typeof actionTypes;

type Action =
  | { type: ActionType["ADD_TOAST"]; toast: ToasterToast }
  | { type: ActionType["UPDATE_TOAST"]; toast: Partial<ToasterToast> }
  | { type: ActionType["DISMISS_TOAST"]; toastId?: ToasterToast["id"] }
  | { type: ActionType["REMOVE_TOAST"]; toastId?: ToasterToast["id"] };

interface State {
  toasts: ToasterToast[];
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) return;
  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId);
    dispatch({ type: "REMOVE_TOAST", toastId: toastId });
  }, TOAST_REMOVE_DELAY);
  toastTimeouts.set(toastId, timeout);
};

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST":
      return { ...state, toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT) };
    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) => (t.id === action.toast.id ? { ...t, ...action.toast } : t)),
      };
    case "DISMISS_TOAST": {
      const { toastId } = action;
      if (toastId) {
        addToRemoveQueue(toastId);
      } else {
        state.toasts.forEach((toast) => addToRemoveQueue(toast.id));
      }
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined ? { ...t, open: false } : t
        ),
      };
    }
    case "REMOVE_TOAST":
      if (action.toastId === undefined) return { ...state, toasts: [] };
      return { ...state, toasts: state.toasts.filter((t) => t.id !== action.toastId) };
  }
};

const listeners: Array<(state: State) => void> = [];
let memoryState: State = { toasts: [] };

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((listener) => listener(memoryState));
}

type Toast = Omit<ToasterToast, "id">;

function toast({ ...props }: Toast) {
  const id = genId();
  const update = (props: ToasterToast) => dispatch({ type: "UPDATE_TOAST", toast: { ...props, id } });
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id });
  dispatch({ type: "ADD_TOAST", toast: { ...props, id, open: true, onOpenChange: (open) => { if (!open) dismiss(); } } });
  return { id, dismiss, update };
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState);
  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) listeners.splice(index, 1);
    };
  }, [state]);
  return { ...state, toast, dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }) };
}

export { useToast, toast };
```

创建 `src/components/ui/toaster.tsx`:

```tsx
import { useToast } from "@/hooks/use-toast";
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";

export function Toaster() {
  const { toasts } = useToast();
  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && <ToastDescription>{description}</ToastDescription>}
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
```

- [ ] **Step 12: 验证组件工作正常**

修改 `src/App.tsx`:

```tsx
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";

function App() {
  const { toast } = useToast();

  return (
    <div className="min-h-screen bg-background p-8">
      <h1 className="text-3xl font-bold text-primary mb-4">SQLite View</h1>
      <Button onClick={() => toast({ title: "Hello!", description: "Components are working." })}>
        Test Toast
      </Button>
      <Toaster />
    </div>
  );
}

export default App;
```

运行 `pnpm tauri dev`，点击按钮确认Toast显示正常。

- [ ] **Step 13: 提交**

```bash
git add .
git commit -m "feat: add shadcn/ui base components"
```

---

## Phase 2: Rust后端 - SQLite操作

### Task 5: 配置Rust依赖和错误处理

**Files:**
- Modify: `src-tauri/Cargo.toml`
- Create: `src-tauri/src/error.rs`

- [ ] **Step 1: 更新Cargo.toml添加依赖**

修改 `src-tauri/Cargo.toml`，在 `[dependencies]` 部分添加:

```toml
[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-opener = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
rusqlite = { version = "0.31", features = ["bundled"] }
thiserror = "1"
parking_lot = "0.12"
```

- [ ] **Step 2: 创建错误处理模块**

创建 `src-tauri/src/error.rs`:

```rust
use serde::Serialize;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("Database error: {0}")]
    Database(#[from] rusqlite::Error),

    #[error("No database connection")]
    NoConnection,

    #[error("Table not found: {0}")]
    TableNotFound(String),

    #[error("Invalid SQL: {0}")]
    InvalidSql(String),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

pub type AppResult<T> = Result<T, AppError>;
```

- [ ] **Step 3: 验证编译通过**

```bash
cd src-tauri
cargo check
```

Expected: 编译成功，无错误

- [ ] **Step 4: 提交**

```bash
git add .
git commit -m "feat: add rust dependencies and error handling"
```

---

### Task 6: 实现数据库连接管理

**Files:**
- Create: `src-tauri/src/db/mod.rs`
- Create: `src-tauri/src/db/connection.rs`

- [ ] **Step 1: 创建db模块目录**

```bash
mkdir -p src-tauri/src/db
```

- [ ] **Step 2: 创建connection.rs**

创建 `src-tauri/src/db/connection.rs`:

```rust
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
```

- [ ] **Step 3: 创建db/mod.rs**

创建 `src-tauri/src/db/mod.rs`:

```rust
pub mod connection;
pub mod schema;
pub mod query;

pub use connection::{create_db_manager, DbManager};
```

- [ ] **Step 4: 验证编译**

```bash
cd src-tauri
cargo check
```

Expected: 编译成功（会有未使用模块警告，后续会用到）

- [ ] **Step 5: 提交**

```bash
git add .
git commit -m "feat: implement database connection manager"
```

---

### Task 7: 实现表结构查询

**Files:**
- Create: `src-tauri/src/db/schema.rs`

- [ ] **Step 1: 创建schema.rs**

创建 `src-tauri/src/db/schema.rs`:

```rust
use rusqlite::{Connection, Row};
use serde::{Deserialize, Serialize};

use crate::error::AppResult;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TableInfo {
    pub name: String,
    pub sql: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ColumnInfo {
    pub cid: i32,
    pub name: String,
    pub data_type: String,
    pub notnull: bool,
    pub default_value: Option<String>,
    pub pk: bool,
}

impl ColumnInfo {
    fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            cid: row.get(0)?,
            name: row.get(1)?,
            data_type: row.get::<_, String>(2).unwrap_or_default(),
            notnull: row.get::<_, i32>(3)? != 0,
            default_value: row.get(4)?,
            pk: row.get::<_, i32>(5)? != 0,
        })
    }
}

pub fn get_tables(conn: &Connection) -> AppResult<Vec<TableInfo>> {
    let mut stmt = conn.prepare(
        "SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    )?;

    let tables = stmt
        .query_map([], |row| {
            Ok(TableInfo {
                name: row.get(0)?,
                sql: row.get(1)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(tables)
}

pub fn get_table_columns(conn: &Connection, table_name: &str) -> AppResult<Vec<ColumnInfo>> {
    let mut stmt = conn.prepare(&format!("PRAGMA table_info(\"{}\")", table_name))?;

    let columns = stmt
        .query_map([], |row| ColumnInfo::from_row(row))?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(columns)
}

pub fn table_exists(conn: &Connection, table_name: &str) -> AppResult<bool> {
    let count: i32 = conn.query_row(
        "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?",
        [table_name],
        |row| row.get(0),
    )?;
    Ok(count > 0)
}
```

- [ ] **Step 2: 验证编译**

```bash
cd src-tauri
cargo check
```

Expected: 编译成功

- [ ] **Step 3: 提交**

```bash
git add .
git commit -m "feat: implement table schema queries"
```

---

### Task 8: 实现数据查询和修改

**Files:**
- Create: `src-tauri/src/db/query.rs`

- [ ] **Step 1: 创建query.rs**

创建 `src-tauri/src/db/query.rs`:

```rust
use rusqlite::{Connection, params_from_iter, types::Value};
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value as JsonValue};

use crate::error::{AppError, AppResult};

#[derive(Debug, Serialize, Deserialize)]
pub struct QueryResult {
    pub columns: Vec<String>,
    pub rows: Vec<Vec<JsonValue>>,
    pub total_count: i64,
}

#[derive(Debug, Deserialize)]
pub struct QueryParams {
    pub table: String,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
    pub order_by: Option<String>,
    pub order_dir: Option<String>,
}

fn sqlite_value_to_json(value: Value) -> JsonValue {
    match value {
        Value::Null => JsonValue::Null,
        Value::Integer(i) => JsonValue::Number(i.into()),
        Value::Real(f) => serde_json::Number::from_f64(f)
            .map(JsonValue::Number)
            .unwrap_or(JsonValue::Null),
        Value::Text(s) => JsonValue::String(s),
        Value::Blob(b) => JsonValue::String(format!("[BLOB: {} bytes]", b.len())),
    }
}

pub fn query_table(conn: &Connection, params: &QueryParams) -> AppResult<QueryResult> {
    // Get total count
    let count_sql = format!("SELECT COUNT(*) FROM \"{}\"", params.table);
    let total_count: i64 = conn.query_row(&count_sql, [], |row| row.get(0))?;

    // Build query
    let mut sql = format!("SELECT * FROM \"{}\"", params.table);

    if let Some(ref order_by) = params.order_by {
        let dir = params.order_dir.as_deref().unwrap_or("ASC");
        sql.push_str(&format!(" ORDER BY \"{}\" {}", order_by, dir));
    }

    if let Some(limit) = params.limit {
        sql.push_str(&format!(" LIMIT {}", limit));
    }

    if let Some(offset) = params.offset {
        sql.push_str(&format!(" OFFSET {}", offset));
    }

    let mut stmt = conn.prepare(&sql)?;
    let columns: Vec<String> = stmt
        .column_names()
        .iter()
        .map(|s| s.to_string())
        .collect();

    let column_count = columns.len();
    let rows: Vec<Vec<JsonValue>> = stmt
        .query_map([], |row| {
            let mut values = Vec::with_capacity(column_count);
            for i in 0..column_count {
                let value: Value = row.get(i)?;
                values.push(sqlite_value_to_json(value));
            }
            Ok(values)
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(QueryResult {
        columns,
        rows,
        total_count,
    })
}

pub fn insert_row(conn: &Connection, table: &str, data: &Map<String, JsonValue>) -> AppResult<i64> {
    if data.is_empty() {
        return Err(AppError::InvalidSql("No data provided".to_string()));
    }

    let columns: Vec<&str> = data.keys().map(|s| s.as_str()).collect();
    let placeholders: Vec<&str> = vec!["?"; columns.len()];

    let sql = format!(
        "INSERT INTO \"{}\" ({}) VALUES ({})",
        table,
        columns.iter().map(|c| format!("\"{}\"", c)).collect::<Vec<_>>().join(", "),
        placeholders.join(", ")
    );

    let values: Vec<Box<dyn rusqlite::ToSql>> = data
        .values()
        .map(|v| json_to_sql_value(v))
        .collect();

    let params: Vec<&dyn rusqlite::ToSql> = values.iter().map(|b| b.as_ref()).collect();
    conn.execute(&sql, params.as_slice())?;

    Ok(conn.last_insert_rowid())
}

pub fn update_row(
    conn: &Connection,
    table: &str,
    data: &Map<String, JsonValue>,
    pk_column: &str,
    pk_value: &JsonValue,
) -> AppResult<usize> {
    if data.is_empty() {
        return Err(AppError::InvalidSql("No data provided".to_string()));
    }

    let set_clause: Vec<String> = data
        .keys()
        .map(|k| format!("\"{}\" = ?", k))
        .collect();

    let sql = format!(
        "UPDATE \"{}\" SET {} WHERE \"{}\" = ?",
        table,
        set_clause.join(", "),
        pk_column
    );

    let mut values: Vec<Box<dyn rusqlite::ToSql>> = data
        .values()
        .map(|v| json_to_sql_value(v))
        .collect();
    values.push(json_to_sql_value(pk_value));

    let params: Vec<&dyn rusqlite::ToSql> = values.iter().map(|b| b.as_ref()).collect();
    let affected = conn.execute(&sql, params.as_slice())?;

    Ok(affected)
}

pub fn delete_row(
    conn: &Connection,
    table: &str,
    pk_column: &str,
    pk_value: &JsonValue,
) -> AppResult<usize> {
    let sql = format!("DELETE FROM \"{}\" WHERE \"{}\" = ?", table, pk_column);
    let value = json_to_sql_value(pk_value);
    let affected = conn.execute(&sql, [value.as_ref()])?;
    Ok(affected)
}

fn json_to_sql_value(value: &JsonValue) -> Box<dyn rusqlite::ToSql> {
    match value {
        JsonValue::Null => Box::new(Option::<String>::None),
        JsonValue::Bool(b) => Box::new(*b as i32),
        JsonValue::Number(n) => {
            if let Some(i) = n.as_i64() {
                Box::new(i)
            } else if let Some(f) = n.as_f64() {
                Box::new(f)
            } else {
                Box::new(n.to_string())
            }
        }
        JsonValue::String(s) => Box::new(s.clone()),
        _ => Box::new(value.to_string()),
    }
}
```

- [ ] **Step 2: 验证编译**

```bash
cd src-tauri
cargo check
```

Expected: 编译成功

- [ ] **Step 3: 提交**

```bash
git add .
git commit -m "feat: implement data query and modification"
```

---

### Task 9: 实现表操作（创建、删除、重命名）

**Files:**
- Modify: `src-tauri/src/db/schema.rs`

- [ ] **Step 1: 在schema.rs中添加表操作函数**

在 `src-tauri/src/db/schema.rs` 文件末尾添加:

```rust
#[derive(Debug, Deserialize)]
pub struct CreateColumnDef {
    pub name: String,
    pub data_type: String,
    pub notnull: bool,
    pub default_value: Option<String>,
    pub pk: bool,
}

pub fn create_table(conn: &Connection, table_name: &str, columns: &[CreateColumnDef]) -> AppResult<()> {
    if columns.is_empty() {
        return Err(crate::error::AppError::InvalidSql("At least one column is required".to_string()));
    }

    let column_defs: Vec<String> = columns
        .iter()
        .map(|col| {
            let mut def = format!("\"{}\" {}", col.name, col.data_type);
            if col.pk {
                def.push_str(" PRIMARY KEY");
            }
            if col.notnull && !col.pk {
                def.push_str(" NOT NULL");
            }
            if let Some(ref default) = col.default_value {
                def.push_str(&format!(" DEFAULT {}", default));
            }
            def
        })
        .collect();

    let sql = format!(
        "CREATE TABLE \"{}\" ({})",
        table_name,
        column_defs.join(", ")
    );

    conn.execute(&sql, [])?;
    Ok(())
}

pub fn drop_table(conn: &Connection, table_name: &str) -> AppResult<()> {
    let sql = format!("DROP TABLE \"{}\"", table_name);
    conn.execute(&sql, [])?;
    Ok(())
}

pub fn rename_table(conn: &Connection, old_name: &str, new_name: &str) -> AppResult<()> {
    let sql = format!("ALTER TABLE \"{}\" RENAME TO \"{}\"", old_name, new_name);
    conn.execute(&sql, [])?;
    Ok(())
}

pub fn add_column(conn: &Connection, table_name: &str, column: &CreateColumnDef) -> AppResult<()> {
    let mut def = format!("\"{}\" {}", column.name, column.data_type);
    if column.notnull {
        if let Some(ref default) = column.default_value {
            def.push_str(&format!(" NOT NULL DEFAULT {}", default));
        } else {
            return Err(crate::error::AppError::InvalidSql(
                "NOT NULL column requires a default value".to_string()
            ));
        }
    }
    if let Some(ref default) = column.default_value {
        if !column.notnull {
            def.push_str(&format!(" DEFAULT {}", default));
        }
    }

    let sql = format!("ALTER TABLE \"{}\" ADD COLUMN {}", table_name, def);
    conn.execute(&sql, [])?;
    Ok(())
}

pub fn drop_column(conn: &Connection, table_name: &str, column_name: &str) -> AppResult<()> {
    let sql = format!("ALTER TABLE \"{}\" DROP COLUMN \"{}\"", table_name, column_name);
    conn.execute(&sql, [])?;
    Ok(())
}
```

- [ ] **Step 2: 验证编译**

```bash
cd src-tauri
cargo check
```

Expected: 编译成功

- [ ] **Step 3: 提交**

```bash
git add .
git commit -m "feat: implement table operations (create, drop, rename, alter)"
```

---

### Task 10: 实现Tauri命令

**Files:**
- Create: `src-tauri/src/commands/mod.rs`
- Create: `src-tauri/src/commands/file.rs`
- Create: `src-tauri/src/commands/table.rs`
- Create: `src-tauri/src/commands/data.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: 创建commands目录**

```bash
mkdir -p src-tauri/src/commands
```

- [ ] **Step 2: 创建file.rs - 文件操作命令**

创建 `src-tauri/src/commands/file.rs`:

```rust
use tauri::State;

use crate::db::DbManager;
use crate::error::AppResult;

#[tauri::command]
pub fn open_database(path: String, db: State<DbManager>) -> AppResult<()> {
    db.open(&path)
}

#[tauri::command]
pub fn close_database(db: State<DbManager>) -> AppResult<()> {
    db.close()
}

#[tauri::command]
pub fn get_database_path(db: State<DbManager>) -> Option<String> {
    db.current_path()
}

#[tauri::command]
pub fn is_database_connected(db: State<DbManager>) -> bool {
    db.is_connected()
}
```

- [ ] **Step 3: 创建table.rs - 表操作命令**

创建 `src-tauri/src/commands/table.rs`:

```rust
use tauri::State;

use crate::db::schema::{
    add_column, create_table, drop_column, drop_table, get_table_columns, get_tables,
    rename_table, ColumnInfo, CreateColumnDef, TableInfo,
};
use crate::db::DbManager;
use crate::error::AppResult;

#[tauri::command]
pub fn list_tables(db: State<DbManager>) -> AppResult<Vec<TableInfo>> {
    db.with_connection(|conn| get_tables(conn))
}

#[tauri::command]
pub fn get_columns(table: String, db: State<DbManager>) -> AppResult<Vec<ColumnInfo>> {
    db.with_connection(|conn| get_table_columns(conn, &table))
}

#[tauri::command]
pub fn create_new_table(
    name: String,
    columns: Vec<CreateColumnDef>,
    db: State<DbManager>,
) -> AppResult<()> {
    db.with_connection(|conn| create_table(conn, &name, &columns))
}

#[tauri::command]
pub fn delete_table(name: String, db: State<DbManager>) -> AppResult<()> {
    db.with_connection(|conn| drop_table(conn, &name))
}

#[tauri::command]
pub fn rename_existing_table(
    old_name: String,
    new_name: String,
    db: State<DbManager>,
) -> AppResult<()> {
    db.with_connection(|conn| rename_table(conn, &old_name, &new_name))
}

#[tauri::command]
pub fn add_table_column(
    table: String,
    column: CreateColumnDef,
    db: State<DbManager>,
) -> AppResult<()> {
    db.with_connection(|conn| add_column(conn, &table, &column))
}

#[tauri::command]
pub fn drop_table_column(
    table: String,
    column: String,
    db: State<DbManager>,
) -> AppResult<()> {
    db.with_connection(|conn| drop_column(conn, &table, &column))
}
```

- [ ] **Step 4: 创建data.rs - 数据操作命令**

创建 `src-tauri/src/commands/data.rs`:

```rust
use serde_json::{Map, Value as JsonValue};
use tauri::State;

use crate::db::query::{delete_row, insert_row, query_table, update_row, QueryParams, QueryResult};
use crate::db::DbManager;
use crate::error::AppResult;

#[tauri::command]
pub fn query_table_data(params: QueryParams, db: State<DbManager>) -> AppResult<QueryResult> {
    db.with_connection(|conn| query_table(conn, &params))
}

#[tauri::command]
pub fn insert_table_row(
    table: String,
    data: Map<String, JsonValue>,
    db: State<DbManager>,
) -> AppResult<i64> {
    db.with_connection(|conn| insert_row(conn, &table, &data))
}

#[tauri::command]
pub fn update_table_row(
    table: String,
    data: Map<String, JsonValue>,
    pk_column: String,
    pk_value: JsonValue,
    db: State<DbManager>,
) -> AppResult<usize> {
    db.with_connection(|conn| update_row(conn, &table, &data, &pk_column, &pk_value))
}

#[tauri::command]
pub fn delete_table_row(
    table: String,
    pk_column: String,
    pk_value: JsonValue,
    db: State<DbManager>,
) -> AppResult<usize> {
    db.with_connection(|conn| delete_row(conn, &table, &pk_column, &pk_value))
}
```

- [ ] **Step 5: 创建commands/mod.rs**

创建 `src-tauri/src/commands/mod.rs`:

```rust
pub mod data;
pub mod file;
pub mod table;

pub use data::*;
pub use file::*;
pub use table::*;
```

- [ ] **Step 6: 更新lib.rs注册命令**

替换 `src-tauri/src/lib.rs` 内容:

```rust
mod commands;
mod db;
mod error;

use db::create_db_manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(create_db_manager())
        .invoke_handler(tauri::generate_handler![
            // File commands
            commands::open_database,
            commands::close_database,
            commands::get_database_path,
            commands::is_database_connected,
            // Table commands
            commands::list_tables,
            commands::get_columns,
            commands::create_new_table,
            commands::delete_table,
            commands::rename_existing_table,
            commands::add_table_column,
            commands::drop_table_column,
            // Data commands
            commands::query_table_data,
            commands::insert_table_row,
            commands::update_table_row,
            commands::delete_table_row,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 7: 验证编译**

```bash
cd src-tauri
cargo build
```

Expected: 编译成功

- [ ] **Step 8: 提交**

```bash
git add .
git commit -m "feat: implement tauri commands for database operations"
```

---

## Phase 3: 前端类型和API封装

### Task 11: 定义TypeScript类型

**Files:**
- Create: `src/types/database.ts`

- [ ] **Step 1: 创建types目录**

```bash
mkdir -p src/types
```

- [ ] **Step 2: 创建database.ts**

创建 `src/types/database.ts`:

```typescript
export interface TableInfo {
  name: string;
  sql: string | null;
}

export interface ColumnInfo {
  cid: number;
  name: string;
  data_type: string;
  notnull: boolean;
  default_value: string | null;
  pk: boolean;
}

export interface QueryParams {
  table: string;
  limit?: number;
  offset?: number;
  order_by?: string;
  order_dir?: "ASC" | "DESC";
}

export interface QueryResult {
  columns: string[];
  rows: unknown[][];
  total_count: number;
}

export interface CreateColumnDef {
  name: string;
  data_type: string;
  notnull: boolean;
  default_value: string | null;
  pk: boolean;
}

export type CellValue = string | number | boolean | null;

export interface RowData {
  [key: string]: CellValue;
}
```

- [ ] **Step 3: 提交**

```bash
git add .
git commit -m "feat: add typescript type definitions"
```

---

### Task 12: 封装Tauri命令调用

**Files:**
- Create: `src/tauri/commands.ts`

- [ ] **Step 1: 创建tauri目录**

```bash
mkdir -p src/tauri
```

- [ ] **Step 2: 创建commands.ts**

创建 `src/tauri/commands.ts`:

```typescript
import { invoke } from "@tauri-apps/api/core";
import type {
  TableInfo,
  ColumnInfo,
  QueryParams,
  QueryResult,
  CreateColumnDef,
  RowData,
} from "@/types/database";

// File commands
export async function openDatabase(path: string): Promise<void> {
  return invoke("open_database", { path });
}

export async function closeDatabase(): Promise<void> {
  return invoke("close_database");
}

export async function getDatabasePath(): Promise<string | null> {
  return invoke("get_database_path");
}

export async function isDatabaseConnected(): Promise<boolean> {
  return invoke("is_database_connected");
}

// Table commands
export async function listTables(): Promise<TableInfo[]> {
  return invoke("list_tables");
}

export async function getColumns(table: string): Promise<ColumnInfo[]> {
  return invoke("get_columns", { table });
}

export async function createNewTable(
  name: string,
  columns: CreateColumnDef[]
): Promise<void> {
  return invoke("create_new_table", { name, columns });
}

export async function deleteTable(name: string): Promise<void> {
  return invoke("delete_table", { name });
}

export async function renameExistingTable(
  oldName: string,
  newName: string
): Promise<void> {
  return invoke("rename_existing_table", { oldName, newName });
}

export async function addTableColumn(
  table: string,
  column: CreateColumnDef
): Promise<void> {
  return invoke("add_table_column", { table, column });
}

export async function dropTableColumn(
  table: string,
  column: string
): Promise<void> {
  return invoke("drop_table_column", { table, column });
}

// Data commands
export async function queryTableData(params: QueryParams): Promise<QueryResult> {
  return invoke("query_table_data", { params });
}

export async function insertTableRow(
  table: string,
  data: RowData
): Promise<number> {
  return invoke("insert_table_row", { table, data });
}

export async function updateTableRow(
  table: string,
  data: RowData,
  pkColumn: string,
  pkValue: unknown
): Promise<number> {
  return invoke("update_table_row", { table, data, pkColumn, pkValue });
}

export async function deleteTableRow(
  table: string,
  pkColumn: string,
  pkValue: unknown
): Promise<number> {
  return invoke("delete_table_row", { table, pkColumn, pkValue });
}
```

- [ ] **Step 3: 提交**

```bash
git add .
git commit -m "feat: add tauri command wrappers"
```

---

### Task 13: 创建Zustand状态管理

**Files:**
- Create: `src/stores/database-store.ts`

- [ ] **Step 1: 安装Zustand**

```bash
pnpm add zustand
```

- [ ] **Step 2: 创建stores目录**

```bash
mkdir -p src/stores
```

- [ ] **Step 3: 创建database-store.ts**

创建 `src/stores/database-store.ts`:

```typescript
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
```

- [ ] **Step 4: 提交**

```bash
git add .
git commit -m "feat: add zustand database store"
```

---

## Phase 4: 前端UI组件

### Task 14: 创建布局组件

**Files:**
- Create: `src/components/layout/header.tsx`
- Create: `src/components/layout/sidebar.tsx`
- Create: `src/components/layout/main-content.tsx`

- [ ] **Step 1: 创建layout目录**

```bash
mkdir -p src/components/layout
```

- [ ] **Step 2: 创建header.tsx**

创建 `src/components/layout/header.tsx`:

```tsx
import { Database, FolderOpen, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDatabaseStore } from "@/stores/database-store";
import { open } from "@tauri-apps/plugin-dialog";

export function Header() {
  const { isConnected, databasePath, openDatabase, closeDatabase } = useDatabaseStore();

  const handleOpenFile = async () => {
    const selected = await open({
      multiple: false,
      filters: [
        { name: "SQLite Database", extensions: ["db", "sqlite", "sqlite3", "db3"] },
        { name: "All Files", extensions: ["*"] },
      ],
    });
    if (selected) {
      await openDatabase(selected);
    }
  };

  const fileName = databasePath?.split(/[/\\]/).pop() ?? "";

  return (
    <header className="h-14 border-b bg-background flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <Database className="h-6 w-6 text-primary" />
        <h1 className="text-lg font-semibold">SQLite View</h1>
        {isConnected && (
          <span className="text-sm text-muted-foreground ml-2">
            — {fileName}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={handleOpenFile}>
          <FolderOpen className="h-4 w-4 mr-2" />
          Open Database
        </Button>
        {isConnected && (
          <Button variant="ghost" size="sm" onClick={closeDatabase}>
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
        )}
      </div>
    </header>
  );
}
```

- [ ] **Step 3: 安装dialog插件**

```bash
pnpm add @tauri-apps/plugin-dialog
```

更新 `src-tauri/Cargo.toml`，在 `[dependencies]` 添加:

```toml
tauri-plugin-dialog = "2"
```

更新 `src-tauri/src/lib.rs`，添加插件:

```rust
.plugin(tauri_plugin_dialog::init())
```

- [ ] **Step 4: 创建sidebar.tsx**

创建 `src/components/layout/sidebar.tsx`:

```tsx
import { Table2, Plus, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDatabaseStore } from "@/stores/database-store";
import { cn } from "@/lib/utils";

interface SidebarProps {
  onCreateTable: () => void;
  onRenameTable: (name: string) => void;
  onDeleteTable: (name: string) => void;
}

export function Sidebar({ onCreateTable, onRenameTable, onDeleteTable }: SidebarProps) {
  const { tables, selectedTable, selectTable, isConnected } = useDatabaseStore();

  if (!isConnected) {
    return (
      <aside className="w-64 border-r bg-muted/30 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">No database connected</p>
      </aside>
    );
  }

  return (
    <aside className="w-64 border-r bg-muted/30 flex flex-col">
      <div className="p-3 border-b flex items-center justify-between">
        <span className="text-sm font-medium">Tables ({tables.length})</span>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onCreateTable}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {tables.map((table) => (
            <div
              key={table.name}
              className={cn(
                "flex items-center justify-between rounded-md px-2 py-1.5 text-sm cursor-pointer group",
                selectedTable === table.name
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              )}
              onClick={() => selectTable(table.name)}
            >
              <div className="flex items-center gap-2 truncate">
                <Table2 className="h-4 w-4 shrink-0" />
                <span className="truncate">{table.name}</span>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-6 w-6 opacity-0 group-hover:opacity-100",
                      selectedTable === table.name && "opacity-100"
                    )}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onRenameTable(table.name)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => onDeleteTable(table.name)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      </ScrollArea>
    </aside>
  );
}
```

- [ ] **Step 5: 创建main-content.tsx**

创建 `src/components/layout/main-content.tsx`:

```tsx
import { useDatabaseStore } from "@/stores/database-store";
import { Database } from "lucide-react";

interface MainContentProps {
  children: React.ReactNode;
}

export function MainContent({ children }: MainContentProps) {
  const { isConnected, selectedTable } = useDatabaseStore();

  if (!isConnected) {
    return (
      <main className="flex-1 flex items-center justify-center bg-muted/10">
        <div className="text-center">
          <Database className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
          <h2 className="text-xl font-medium text-muted-foreground">No Database Open</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Open a SQLite database file to get started
          </p>
        </div>
      </main>
    );
  }

  if (!selectedTable) {
    return (
      <main className="flex-1 flex items-center justify-center bg-muted/10">
        <div className="text-center">
          <h2 className="text-xl font-medium text-muted-foreground">Select a Table</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Choose a table from the sidebar to view its data
          </p>
        </div>
      </main>
    );
  }

  return <main className="flex-1 overflow-hidden flex flex-col">{children}</main>;
}
```

- [ ] **Step 6: 提交**

```bash
git add .
git commit -m "feat: add layout components (header, sidebar, main-content)"
```

---

### Task 15: 创建数据表格视图

**Files:**
- Create: `src/components/data-view/data-table.tsx`
- Create: `src/components/data-view/column-header.tsx`

- [ ] **Step 1: 安装TanStack Table**

```bash
pnpm add @tanstack/react-table
```

- [ ] **Step 2: 创建data-view目录**

```bash
mkdir -p src/components/data-view
```

- [ ] **Step 3: 创建column-header.tsx**

创建 `src/components/data-view/column-header.tsx`:

```tsx
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDatabaseStore } from "@/stores/database-store";
import { cn } from "@/lib/utils";

interface ColumnHeaderProps {
  column: string;
}

export function ColumnHeader({ column }: ColumnHeaderProps) {
  const { orderBy, orderDir, setOrderBy } = useDatabaseStore();
  const isActive = orderBy === column;

  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8 data-[state=open]:bg-accent"
      onClick={() => setOrderBy(column)}
    >
      <span>{column}</span>
      {isActive ? (
        orderDir === "ASC" ? (
          <ArrowUp className="ml-2 h-4 w-4" />
        ) : (
          <ArrowDown className="ml-2 h-4 w-4" />
        )
      ) : (
        <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
      )}
    </Button>
  );
}
```

- [ ] **Step 4: 创建data-table.tsx**

创建 `src/components/data-view/data-table.tsx`:

```tsx
import { useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { useDatabaseStore } from "@/stores/database-store";
import { ColumnHeader } from "./column-header";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

export function DataTable() {
  const {
    queryResult,
    currentPage,
    pageSize,
    setPage,
    isLoading,
  } = useDatabaseStore();

  const columns: ColumnDef<unknown[]>[] = useMemo(() => {
    if (!queryResult) return [];
    return queryResult.columns.map((col, index) => ({
      id: col,
      accessorFn: (row: unknown[]) => row[index],
      header: () => <ColumnHeader column={col} />,
      cell: ({ getValue }) => {
        const value = getValue();
        if (value === null) {
          return <span className="text-muted-foreground italic">NULL</span>;
        }
        if (typeof value === "boolean") {
          return value ? "true" : "false";
        }
        return String(value);
      },
    }));
  }, [queryResult]);

  const table = useReactTable({
    data: queryResult?.rows ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: Math.ceil((queryResult?.total_count ?? 0) / pageSize),
  });

  const totalPages = Math.ceil((queryResult?.total_count ?? 0) / pageSize);

  if (!queryResult) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <ScrollArea className="flex-1">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="whitespace-nowrap">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="whitespace-nowrap">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No data
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Pagination */}
      <div className="border-t p-2 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {queryResult.total_count} rows total
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Page {currentPage + 1} of {totalPages || 1}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage(0)}
              disabled={currentPage === 0 || isLoading}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage(currentPage - 1)}
              disabled={currentPage === 0 || isLoading}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage(currentPage + 1)}
              disabled={currentPage >= totalPages - 1 || isLoading}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage(totalPages - 1)}
              disabled={currentPage >= totalPages - 1 || isLoading}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: 提交**

```bash
git add .
git commit -m "feat: add data table component with pagination"
```

---

### Task 16: 创建JSON视图

**Files:**
- Create: `src/components/data-view/json-view.tsx`
- Create: `src/components/data-view/view-toggle.tsx`

- [ ] **Step 1: 创建json-view.tsx**

创建 `src/components/data-view/json-view.tsx`:

```tsx
import { useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDatabaseStore } from "@/stores/database-store";

export function JsonView() {
  const { queryResult } = useDatabaseStore();

  const jsonData = useMemo(() => {
    if (!queryResult) return [];
    return queryResult.rows.map((row) => {
      const obj: Record<string, unknown> = {};
      queryResult.columns.forEach((col, index) => {
        obj[col] = row[index];
      });
      return obj;
    });
  }, [queryResult]);

  if (!queryResult) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <pre className="p-4 text-sm font-mono">
        {JSON.stringify(jsonData, null, 2)}
      </pre>
    </ScrollArea>
  );
}
```

- [ ] **Step 2: 创建view-toggle.tsx**

创建 `src/components/data-view/view-toggle.tsx`:

```tsx
import { Table2, Braces } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ViewToggleProps {
  value: "table" | "json";
  onChange: (value: "table" | "json") => void;
}

export function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as "table" | "json")}>
      <TabsList className="h-8">
        <TabsTrigger value="table" className="h-7 px-3 text-xs">
          <Table2 className="h-3.5 w-3.5 mr-1.5" />
          Table
        </TabsTrigger>
        <TabsTrigger value="json" className="h-7 px-3 text-xs">
          <Braces className="h-3.5 w-3.5 mr-1.5" />
          JSON
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
```

- [ ] **Step 3: 提交**

```bash
git add .
git commit -m "feat: add json view and view toggle"
```

---

### Task 17: 创建对话框组件

**Files:**
- Create: `src/components/dialogs/create-table-dialog.tsx`
- Create: `src/components/dialogs/delete-confirm-dialog.tsx`
- Create: `src/components/dialogs/add-row-dialog.tsx`

- [ ] **Step 1: 创建dialogs目录**

```bash
mkdir -p src/components/dialogs
```

- [ ] **Step 2: 创建create-table-dialog.tsx**

创建 `src/components/dialogs/create-table-dialog.tsx`:

```tsx
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createNewTable } from "@/tauri/commands";
import { useDatabaseStore } from "@/stores/database-store";
import { useToast } from "@/hooks/use-toast";
import type { CreateColumnDef } from "@/types/database";

interface CreateTableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const defaultColumn: CreateColumnDef = {
  name: "",
  data_type: "TEXT",
  notnull: false,
  default_value: null,
  pk: false,
};

export function CreateTableDialog({ open, onOpenChange }: CreateTableDialogProps) {
  const [tableName, setTableName] = useState("");
  const [columns, setColumns] = useState<CreateColumnDef[]>([
    { ...defaultColumn, name: "id", data_type: "INTEGER", pk: true },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { refreshTables } = useDatabaseStore();
  const { toast } = useToast();

  const addColumn = () => {
    setColumns([...columns, { ...defaultColumn }]);
  };

  const removeColumn = (index: number) => {
    setColumns(columns.filter((_, i) => i !== index));
  };

  const updateColumn = (index: number, field: keyof CreateColumnDef, value: unknown) => {
    const updated = [...columns];
    updated[index] = { ...updated[index], [field]: value };
    setColumns(updated);
  };

  const handleSubmit = async () => {
    if (!tableName.trim()) {
      toast({ title: "Error", description: "Table name is required", variant: "destructive" });
      return;
    }
    if (columns.length === 0) {
      toast({ title: "Error", description: "At least one column is required", variant: "destructive" });
      return;
    }
    if (columns.some((c) => !c.name.trim())) {
      toast({ title: "Error", description: "All columns must have a name", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      await createNewTable(tableName, columns);
      await refreshTables();
      toast({ title: "Success", description: `Table "${tableName}" created` });
      onOpenChange(false);
      setTableName("");
      setColumns([{ ...defaultColumn, name: "id", data_type: "INTEGER", pk: true }]);
    } catch (e) {
      toast({ title: "Error", description: String(e), variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Table</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Table Name</label>
            <Input
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              placeholder="my_table"
              className="mt-1"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Columns</label>
              <Button variant="outline" size="sm" onClick={addColumn}>
                <Plus className="h-4 w-4 mr-1" />
                Add Column
              </Button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {columns.map((col, index) => (
                <div key={index} className="flex items-center gap-2 p-2 border rounded-md">
                  <Input
                    value={col.name}
                    onChange={(e) => updateColumn(index, "name", e.target.value)}
                    placeholder="column_name"
                    className="flex-1"
                  />
                  <select
                    value={col.data_type}
                    onChange={(e) => updateColumn(index, "data_type", e.target.value)}
                    className="h-10 px-3 border rounded-md bg-background"
                  >
                    <option value="INTEGER">INTEGER</option>
                    <option value="TEXT">TEXT</option>
                    <option value="REAL">REAL</option>
                    <option value="BLOB">BLOB</option>
                  </select>
                  <label className="flex items-center gap-1 text-sm">
                    <input
                      type="checkbox"
                      checked={col.pk}
                      onChange={(e) => updateColumn(index, "pk", e.target.checked)}
                    />
                    PK
                  </label>
                  <label className="flex items-center gap-1 text-sm">
                    <input
                      type="checkbox"
                      checked={col.notnull}
                      onChange={(e) => updateColumn(index, "notnull", e.target.checked)}
                    />
                    NOT NULL
                  </label>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => removeColumn(index)}
                    disabled={columns.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Table"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: 创建delete-confirm-dialog.tsx**

创建 `src/components/dialogs/delete-confirm-dialog.tsx`:

```tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  isLoading,
}: DeleteConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isLoading}>
            {isLoading ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: 创建add-row-dialog.tsx**

创建 `src/components/dialogs/add-row-dialog.tsx`:

```tsx
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { insertTableRow } from "@/tauri/commands";
import { useDatabaseStore } from "@/stores/database-store";
import { useToast } from "@/hooks/use-toast";
import type { RowData } from "@/types/database";

interface AddRowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddRowDialog({ open, onOpenChange }: AddRowDialogProps) {
  const { selectedTable, tableColumns, refreshData } = useDatabaseStore();
  const [formData, setFormData] = useState<RowData>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      const initial: RowData = {};
      tableColumns.forEach((col) => {
        if (!col.pk) {
          initial[col.name] = col.default_value ?? "";
        }
      });
      setFormData(initial);
    }
  }, [open, tableColumns]);

  const handleSubmit = async () => {
    if (!selectedTable) return;

    setIsSubmitting(true);
    try {
      const data: RowData = {};
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== "" && value !== null) {
          data[key] = value;
        }
      });

      await insertTableRow(selectedTable, data);
      await refreshData();
      toast({ title: "Success", description: "Row added successfully" });
      onOpenChange(false);
    } catch (e) {
      toast({ title: "Error", description: String(e), variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const nonPkColumns = tableColumns.filter((col) => !col.pk);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Row</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {nonPkColumns.map((col) => (
            <div key={col.name}>
              <label className="text-sm font-medium">
                {col.name}
                <span className="text-muted-foreground ml-1">({col.data_type})</span>
                {col.notnull && <span className="text-destructive ml-1">*</span>}
              </label>
              {col.data_type === "TEXT" ? (
                <Textarea
                  value={String(formData[col.name] ?? "")}
                  onChange={(e) => setFormData({ ...formData, [col.name]: e.target.value })}
                  className="mt-1"
                  rows={2}
                />
              ) : (
                <Input
                  type={col.data_type === "INTEGER" || col.data_type === "REAL" ? "number" : "text"}
                  value={String(formData[col.name] ?? "")}
                  onChange={(e) => {
                    const val = col.data_type === "INTEGER" 
                      ? (e.target.value ? parseInt(e.target.value) : "")
                      : col.data_type === "REAL"
                      ? (e.target.value ? parseFloat(e.target.value) : "")
                      : e.target.value;
                    setFormData({ ...formData, [col.name]: val });
                  }}
                  className="mt-1"
                />
              )}
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Adding..." : "Add Row"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 5: 提交**

```bash
git add .
git commit -m "feat: add dialog components for table and row operations"
```

---

### Task 18: 实现文件打开功能（拖放到图标 + 窗口内拖放）

**Files:**
- Create: `src/components/drop-zone.tsx`
- Create: `src/hooks/use-cli-args.ts`
- Modify: `src-tauri/src/main.rs`
- Modify: `src-tauri/src/lib.rs`

本任务实现两种打开方式：
1. **拖放文件到应用图标**（软件未运行时）：通过命令行参数接收文件路径
2. **拖放文件到窗口内**（软件已运行时）：通过Tauri拖放事件处理

- [ ] **Step 1: 添加Tauri CLI插件依赖**

更新 `src-tauri/Cargo.toml`，在 `[dependencies]` 添加:

```toml
tauri-plugin-cli = "2"
```

- [ ] **Step 2: 更新tauri.conf.json添加CLI配置**

在 `src-tauri/tauri.conf.json` 的 `app` 部分添加 CLI 配置:

```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "SQLite View",
  "version": "1.0.0",
  "identifier": "com.sqliteview.app",
  "build": {
    "beforeDevCommand": "pnpm dev",
    "devUrl": "http://localhost:1420",
    "beforeBuildCommand": "pnpm build",
    "frontendDist": "../dist"
  },
  "app": {
    "withGlobalTauri": false,
    "windows": [
      {
        "title": "SQLite View",
        "width": 1200,
        "height": 800,
        "minWidth": 800,
        "minHeight": 600,
        "resizable": true,
        "fullscreen": false,
        "dragDropEnabled": true
      }
    ],
    "security": {
      "csp": null
    }
  },
  "plugins": {
    "cli": {
      "args": [
        {
          "name": "file",
          "index": 1,
          "takesValue": true,
          "multiple": false
        }
      ]
    }
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ],
    "fileAssociations": [
      {
        "ext": ["db", "sqlite", "sqlite3", "db3"],
        "name": "SQLite Database",
        "description": "SQLite Database File",
        "role": "Viewer"
      }
    ]
  }
}
```

- [ ] **Step 3: 更新lib.rs注册CLI插件**

修改 `src-tauri/src/lib.rs`，添加CLI插件:

```rust
mod commands;
mod db;
mod error;

use db::create_db_manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_cli::init())
        .manage(create_db_manager())
        .invoke_handler(tauri::generate_handler![
            // File commands
            commands::open_database,
            commands::close_database,
            commands::get_database_path,
            commands::is_database_connected,
            // Table commands
            commands::list_tables,
            commands::get_columns,
            commands::create_new_table,
            commands::delete_table,
            commands::rename_existing_table,
            commands::add_table_column,
            commands::drop_table_column,
            // Data commands
            commands::query_table_data,
            commands::insert_table_row,
            commands::update_table_row,
            commands::delete_table_row,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 4: 安装前端CLI插件**

```bash
pnpm add @tauri-apps/plugin-cli
```

- [ ] **Step 5: 创建use-cli-args.ts处理启动参数**

创建 `src/hooks/use-cli-args.ts`:

```typescript
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
```

- [ ] **Step 6: 创建drop-zone.tsx处理窗口内拖放**

创建 `src/components/drop-zone.tsx`:

```tsx
import { useState, useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { Upload } from "lucide-react";
import { useDatabaseStore } from "@/stores/database-store";

interface DropZoneProps {
  children: React.ReactNode;
}

interface FileDropPayload {
  paths: string[];
}

export function DropZone({ children }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const { openDatabase, isConnected } = useDatabaseStore();

  useEffect(() => {
    const unlistenDrop = listen<FileDropPayload>("tauri://drag-drop", async (event) => {
      setIsDragging(false);
      const paths = event.payload.paths;
      if (paths.length > 0) {
        const path = paths[0];
        const ext = path.split(".").pop()?.toLowerCase();
        if (["db", "sqlite", "sqlite3", "db3"].includes(ext ?? "")) {
          await openDatabase(path);
        }
      }
    });

    const unlistenEnter = listen("tauri://drag-enter", () => {
      setIsDragging(true);
    });

    const unlistenLeave = listen("tauri://drag-leave", () => {
      setIsDragging(false);
    });

    return () => {
      unlistenDrop.then((fn) => fn());
      unlistenEnter.then((fn) => fn());
      unlistenLeave.then((fn) => fn());
    };
  }, [openDatabase]);

  return (
    <div className="relative h-full">
      {children}
      {isDragging && (
        <div className="absolute inset-0 bg-primary/10 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-background border-2 border-dashed border-primary rounded-lg p-8 text-center">
            <Upload className="h-12 w-12 text-primary mx-auto mb-4" />
            <p className="text-lg font-medium">Drop SQLite file here</p>
            <p className="text-sm text-muted-foreground mt-1">
              Supports .db, .sqlite, .sqlite3, .db3
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 7: 配置Tauri权限**

更新 `src-tauri/capabilities/default.json`:

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "Capability for the main window",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "opener:default",
    "dialog:default",
    "cli:default",
    "core:window:allow-start-dragging",
    "core:event:default"
  ]
}
```

- [ ] **Step 8: 提交**

```bash
git add .
git commit -m "feat: support opening files via drag-to-icon and window drop"
```

---

### Task 19: 组装App组件

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: 更新App.tsx**

替换 `src/App.tsx` 内容:

```tsx
import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { MainContent } from "@/components/layout/main-content";
import { DataTable } from "@/components/data-view/data-table";
import { JsonView } from "@/components/data-view/json-view";
import { ViewToggle } from "@/components/data-view/view-toggle";
import { DropZone } from "@/components/drop-zone";
import { CreateTableDialog } from "@/components/dialogs/create-table-dialog";
import { DeleteConfirmDialog } from "@/components/dialogs/delete-confirm-dialog";
import { AddRowDialog } from "@/components/dialogs/add-row-dialog";
import { Toaster } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw } from "lucide-react";
import { useDatabaseStore } from "@/stores/database-store";
import { deleteTable, renameExistingTable } from "@/tauri/commands";
import { useToast } from "@/hooks/use-toast";
import { useCliArgs } from "@/hooks/use-cli-args";

function App() {
  // 处理启动时的命令行参数（拖放文件到图标打开）
  useCliArgs();

  const [viewMode, setViewMode] = useState<"table" | "json">("table");
  const [createTableOpen, setCreateTableOpen] = useState(false);
  const [addRowOpen, setAddRowOpen] = useState(false);
  const [deleteTableOpen, setDeleteTableOpen] = useState(false);
  const [tableToDelete, setTableToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { selectedTable, refreshTables, refreshData, selectTable } = useDatabaseStore();
  const { toast } = useToast();

  const handleCreateTable = () => {
    setCreateTableOpen(true);
  };

  const handleRenameTable = async (name: string) => {
    const newName = prompt("Enter new table name:", name);
    if (newName && newName !== name) {
      try {
        await renameExistingTable(name, newName);
        await refreshTables();
        if (selectedTable === name) {
          selectTable(newName);
        }
        toast({ title: "Success", description: `Table renamed to "${newName}"` });
      } catch (e) {
        toast({ title: "Error", description: String(e), variant: "destructive" });
      }
    }
  };

  const handleDeleteTable = (name: string) => {
    setTableToDelete(name);
    setDeleteTableOpen(true);
  };

  const confirmDeleteTable = async () => {
    if (!tableToDelete) return;
    setIsDeleting(true);
    try {
      await deleteTable(tableToDelete);
      await refreshTables();
      if (selectedTable === tableToDelete) {
        selectTable(null);
      }
      toast({ title: "Success", description: `Table "${tableToDelete}" deleted` });
      setDeleteTableOpen(false);
      setTableToDelete(null);
    } catch (e) {
      toast({ title: "Error", description: String(e), variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <DropZone>
      <div className="h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex overflow-hidden">
          <Sidebar
            onCreateTable={handleCreateTable}
            onRenameTable={handleRenameTable}
            onDeleteTable={handleDeleteTable}
          />
          <MainContent>
            {/* Toolbar */}
            <div className="border-b p-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="font-medium">{selectedTable}</h2>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={refreshData}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setAddRowOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Row
                </Button>
                <ViewToggle value={viewMode} onChange={setViewMode} />
              </div>
            </div>
            {/* Data View */}
            {viewMode === "table" ? <DataTable /> : <JsonView />}
          </MainContent>
        </div>
      </div>

      {/* Dialogs */}
      <CreateTableDialog open={createTableOpen} onOpenChange={setCreateTableOpen} />
      <AddRowDialog open={addRowOpen} onOpenChange={setAddRowOpen} />
      <DeleteConfirmDialog
        open={deleteTableOpen}
        onOpenChange={setDeleteTableOpen}
        title="Delete Table"
        description={`Are you sure you want to delete table "${tableToDelete}"? This action cannot be undone.`}
        onConfirm={confirmDeleteTable}
        isLoading={isDeleting}
      />
      <Toaster />
    </DropZone>
  );
}

export default App;
```

- [ ] **Step 2: 验证应用运行**

```bash
pnpm tauri dev
```

Expected: 应用启动，显示空状态界面，可以打开SQLite文件

- [ ] **Step 3: 提交**

```bash
git add .
git commit -m "feat: assemble main app with all components"
```

---

## Phase 5: 数据编辑功能

### Task 20: 实现单元格编辑

**Files:**
- Create: `src/components/data-view/cell-editor.tsx`
- Modify: `src/components/data-view/data-table.tsx`

- [ ] **Step 1: 创建cell-editor.tsx**

创建 `src/components/data-view/cell-editor.tsx`:

```tsx
import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface CellEditorProps {
  value: unknown;
  onSave: (value: unknown) => void;
  onCancel: () => void;
  dataType: string;
}

export function CellEditor({ value, onSave, onCancel, dataType }: CellEditorProps) {
  const [editValue, setEditValue] = useState(value === null ? "" : String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      onCancel();
    }
  };

  const handleSave = () => {
    let finalValue: unknown = editValue;
    if (editValue === "" || editValue === "NULL") {
      finalValue = null;
    } else if (dataType === "INTEGER") {
      finalValue = parseInt(editValue);
      if (isNaN(finalValue as number)) finalValue = editValue;
    } else if (dataType === "REAL") {
      finalValue = parseFloat(editValue);
      if (isNaN(finalValue as number)) finalValue = editValue;
    }
    onSave(finalValue);
  };

  return (
    <Input
      ref={inputRef}
      value={editValue}
      onChange={(e) => setEditValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={handleSave}
      className="h-8 w-full min-w-[100px]"
    />
  );
}
```

- [ ] **Step 2: 更新data-table.tsx支持编辑**

修改 `src/components/data-view/data-table.tsx`，添加编辑功能:

```tsx
import { useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Trash2,
} from "lucide-react";
import { useDatabaseStore } from "@/stores/database-store";
import { ColumnHeader } from "./column-header";
import { CellEditor } from "./cell-editor";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { updateTableRow, deleteTableRow } from "@/tauri/commands";
import { useToast } from "@/hooks/use-toast";
import type { RowData } from "@/types/database";

export function DataTable() {
  const {
    queryResult,
    tableColumns,
    selectedTable,
    currentPage,
    pageSize,
    setPage,
    refreshData,
    isLoading,
  } = useDatabaseStore();
  const { toast } = useToast();

  const [editingCell, setEditingCell] = useState<{
    rowIndex: number;
    colIndex: number;
  } | null>(null);

  const pkColumn = tableColumns.find((c) => c.pk);

  const handleCellDoubleClick = (rowIndex: number, colIndex: number) => {
    setEditingCell({ rowIndex, colIndex });
  };

  const handleCellSave = async (
    rowIndex: number,
    colIndex: number,
    newValue: unknown
  ) => {
    if (!selectedTable || !pkColumn || !queryResult) return;

    const row = queryResult.rows[rowIndex];
    const pkColIndex = queryResult.columns.indexOf(pkColumn.name);
    const pkValue = row[pkColIndex];
    const columnName = queryResult.columns[colIndex];

    try {
      const data: RowData = { [columnName]: newValue };
      await updateTableRow(selectedTable, data, pkColumn.name, pkValue);
      await refreshData();
      toast({ title: "Success", description: "Cell updated" });
    } catch (e) {
      toast({ title: "Error", description: String(e), variant: "destructive" });
    }
    setEditingCell(null);
  };

  const handleDeleteRow = async (rowIndex: number) => {
    if (!selectedTable || !pkColumn || !queryResult) return;

    const row = queryResult.rows[rowIndex];
    const pkColIndex = queryResult.columns.indexOf(pkColumn.name);
    const pkValue = row[pkColIndex];

    if (!confirm("Are you sure you want to delete this row?")) return;

    try {
      await deleteTableRow(selectedTable, pkColumn.name, pkValue);
      await refreshData();
      toast({ title: "Success", description: "Row deleted" });
    } catch (e) {
      toast({ title: "Error", description: String(e), variant: "destructive" });
    }
  };

  const columns: ColumnDef<unknown[]>[] = useMemo(() => {
    if (!queryResult) return [];

    const dataCols: ColumnDef<unknown[]>[] = queryResult.columns.map((col, index) => {
      const colInfo = tableColumns.find((c) => c.name === col);
      return {
        id: col,
        accessorFn: (row: unknown[]) => row[index],
        header: () => <ColumnHeader column={col} />,
        cell: ({ row, getValue }) => {
          const value = getValue();
          const rowIndex = row.index;

          if (
            editingCell?.rowIndex === rowIndex &&
            editingCell?.colIndex === index
          ) {
            return (
              <CellEditor
                value={value}
                dataType={colInfo?.data_type ?? "TEXT"}
                onSave={(newValue) => handleCellSave(rowIndex, index, newValue)}
                onCancel={() => setEditingCell(null)}
              />
            );
          }

          return (
            <div
              className="cursor-pointer hover:bg-muted/50 px-1 -mx-1 rounded"
              onDoubleClick={() => handleCellDoubleClick(rowIndex, index)}
            >
              {value === null ? (
                <span className="text-muted-foreground italic">NULL</span>
              ) : typeof value === "boolean" ? (
                value ? "true" : "false"
              ) : (
                String(value)
              )}
            </div>
          );
        },
      };
    });

    // Add actions column
    if (pkColumn) {
      dataCols.push({
        id: "_actions",
        header: () => null,
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100"
            onClick={() => handleDeleteRow(row.index)}
          >
            <Trash2 className="h-3 w-3 text-destructive" />
          </Button>
        ),
      });
    }

    return dataCols;
  }, [queryResult, tableColumns, editingCell, pkColumn]);

  const table = useReactTable({
    data: queryResult?.rows ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: Math.ceil((queryResult?.total_count ?? 0) / pageSize),
  });

  const totalPages = Math.ceil((queryResult?.total_count ?? 0) / pageSize);

  if (!queryResult) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <ScrollArea className="flex-1">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="whitespace-nowrap">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="group">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="whitespace-nowrap">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No data
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Pagination */}
      <div className="border-t p-2 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {queryResult.total_count} rows total
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Page {currentPage + 1} of {totalPages || 1}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage(0)}
              disabled={currentPage === 0 || isLoading}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage(currentPage - 1)}
              disabled={currentPage === 0 || isLoading}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage(currentPage + 1)}
              disabled={currentPage >= totalPages - 1 || isLoading}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage(totalPages - 1)}
              disabled={currentPage >= totalPages - 1 || isLoading}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 验证编辑功能**

```bash
pnpm tauri dev
```

打开一个SQLite文件，双击单元格进行编辑，验证保存功能。

- [ ] **Step 4: 提交**

```bash
git add .
git commit -m "feat: implement inline cell editing and row deletion"
```

---

## Phase 6: 应用配置和打包

### Task 21: 生成应用图标

**Files:**
- Modify: `src-tauri/icons/`

注意：`tauri.conf.json` 的完整配置（包括CLI插件、文件关联等）已在 Task 18 中完成。

- [ ] **Step 1: 生成应用图标**

使用Tauri图标生成工具（需要一个1024x1024的PNG源图标）:

```bash
pnpm tauri icon path/to/your/icon.png
```

或者暂时使用默认图标，后续替换。如果没有自定义图标，可以跳过此步骤。

- [ ] **Step 2: 提交**

```bash
git add .
git commit -m "chore: add app icons"
```

---

### Task 22: 创建README文档

**Files:**
- Create: `README.md`

- [ ] **Step 1: 创建README.md**

创建 `README.md`:

```markdown
# SQLite View

A modern, cross-platform SQLite database viewer built with Tauri, React, and TypeScript.

![SQLite View Screenshot](docs/screenshot.png)

## Features

- 🗂️ **Table Management**: Create, rename, and delete tables
- 📊 **Data Viewing**: View data in table or JSON format
- ✏️ **Inline Editing**: Double-click cells to edit values
- ➕ **Data Operations**: Add and delete rows
- 🔄 **Sorting & Pagination**: Sort by columns, navigate through pages
- 📁 **Drag & Drop**: Drop SQLite files directly onto the app
- 🎨 **Modern UI**: Clean, responsive interface with dark mode support

## Installation

### Download

Download the latest release for your platform from the [Releases](https://github.com/yourusername/sqlite-view/releases) page.

### Build from Source

Prerequisites:
- Node.js 18+
- pnpm
- Rust (latest stable)

```bash
# Clone the repository
git clone https://github.com/yourusername/sqlite-view.git
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
```

- [ ] **Step 2: 提交**

```bash
git add .
git commit -m "docs: add README"
```

---

### Task 23: 最终测试和构建

**Files:** None (testing only)

- [ ] **Step 1: 运行开发模式完整测试**

```bash
pnpm tauri dev
```

测试以下功能:
1. 打开SQLite文件（通过按钮和拖放）
2. 查看表列表
3. 选择表查看数据
4. 切换表格/JSON视图
5. 分页和排序
6. 创建新表
7. 重命名表
8. 删除表
9. 添加新行
10. 编辑单元格
11. 删除行
12. 关闭数据库

- [ ] **Step 2: 构建生产版本**

```bash
pnpm tauri build
```

Expected: 在 `src-tauri/target/release/bundle/` 目录下生成安装包

- [ ] **Step 3: 测试生产版本**

运行生成的安装包，验证所有功能正常工作。

- [ ] **Step 4: 最终提交**

```bash
git add .
git commit -m "chore: ready for v1.0.0 release"
git tag v1.0.0
```

---

## 总结

本计划实现了一个功能完整的跨平台SQLite查看器，包含:

1. **Phase 1**: 项目初始化 - Tauri + React + Tailwind + shadcn/ui
2. **Phase 2**: Rust后端 - SQLite连接、表结构查询、数据操作
3. **Phase 3**: 前端API封装 - TypeScript类型、Tauri命令、Zustand状态管理
4. **Phase 4**: UI组件 - 布局、数据表格、JSON视图、对话框
5. **Phase 5**: 数据编辑 - 单元格编辑、行删除
6. **Phase 6**: 打包发布 - 配置、文档、构建

所有功能均支持:
- ✅ 表的增删改查
- ✅ 数据的增删改查
- ✅ 表格和JSON视图
- ✅ 拖放打开文件
- ✅ 文件关联打开
