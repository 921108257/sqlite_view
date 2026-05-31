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
