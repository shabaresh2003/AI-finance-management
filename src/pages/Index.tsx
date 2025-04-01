
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-background border-b">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-xl font-bold">Financial Dashboard</h1>
        </div>
      </header>
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div>
            <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
              Take Control of Your <span className="text-primary">Finances</span>
            </h2>
            <p className="mt-6 text-xl text-muted-foreground max-w-3xl mx-auto">
              Track expenses, manage budgets, and get personalized insights to make smarter financial decisions.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild className="text-lg px-8">
              <Link to="/auth">Get Started</Link>
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8">
              Learn More
            </Button>
          </div>
          
          <div className="pt-12 space-y-6">
            <img 
              src="https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&q=80&w=1000"
              alt="Financial Planning" 
              className="rounded-xl shadow-xl mx-auto max-w-full h-auto"
              width={1000}
              height={600}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
              <div className="text-left">
                <h3 className="text-xl font-bold mb-2">Track Expenses</h3>
                <p className="text-muted-foreground">Easily record and categorize your spending to understand where your money is going.</p>
              </div>
              <div className="text-left">
                <h3 className="text-xl font-bold mb-2">Budget Smart</h3>
                <p className="text-muted-foreground">Set realistic budgets and get alerts when you're approaching your spending limits.</p>
              </div>
              <div className="text-left">
                <h3 className="text-xl font-bold mb-2">AI Insights</h3>
                <p className="text-muted-foreground">Receive personalized financial advice powered by advanced AI to optimize your finances.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <footer className="border-t bg-muted/40">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          © 2025 Financial Dashboard. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default Index;
