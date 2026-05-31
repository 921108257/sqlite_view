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
