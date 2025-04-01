
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Coffee, Home, ShoppingBag, Car, Briefcase, School, Heart, User, Film, PlusCircle, Trash2 } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface BudgetItem {
  id: string;
  category: string;
  total: number;
  spent: number;
  percentage: number;
}

const Budgets = () => {
  const { userId } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [budgets, setBudgets] = useState<BudgetItem[]>([]);
  const [newBudgetDialogOpen, setNewBudgetDialogOpen] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [newTotal, setNewTotal] = useState("");
  
  // Fetch budgets data
  useEffect(() => {
    const fetchBudgets = async () => {
      if (!userId) return;
      
      setLoading(true);
      try {
        // Fetch budgets from Supabase
        const { data, error } = await supabase
          .from('budgets')
          .select('*')
          .eq('user_id', userId);
          
        if (error) throw error;
        
        console.log("Fetched budgets data:", data);

        // Process budgets data
        if (data) {
          // Calculate percentage for each budget
          const processedBudgets = data.map(budget => ({
            ...budget,
            percentage: (budget.spent / budget.total) * 100
          }));
          
          setBudgets(processedBudgets);
        }
      } catch (err) {
        console.error("Error fetching budgets:", err);
        toast({
          title: "Error",
          description: "Failed to load budget data",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchBudgets();
    
    // Listen for budget updates
    window.addEventListener('budget-update', fetchBudgets);
    
    return () => {
      window.removeEventListener('budget-update', fetchBudgets);
    };
  }, [userId, toast]);
  
  // Create a new budget
  const handleCreateBudget = async () => {
    if (!userId) return;
    
    if (!newCategory || !newTotal) {
      toast({
        title: "Missing information",
        description: "Please select a category and enter a budget amount",
        variant: "destructive"
      });
      return;
    }
    
    const budgetAmount = parseFloat(newTotal);
    if (isNaN(budgetAmount) || budgetAmount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid budget amount",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('budgets')
        .insert({
          user_id: userId,
          category: newCategory,
          total: budgetAmount,
          spent: 0
        })
        .select();
        
      if (error) throw error;
      
      console.log("Created new budget:", data);
      
      // Add the new budget to the state
      if (data && data[0]) {
        setBudgets([...budgets, {
          ...data[0],
          percentage: 0
        }]);
      }
      
      // Reset form and close dialog
      setNewCategory("");
      setNewTotal("");
      setNewBudgetDialogOpen(false);
      
      toast({
        title: "Budget created",
        description: "Your new budget has been created successfully"
      });
      
      // Trigger budget update event
      window.dispatchEvent(new Event('budget-update'));
    } catch (err) {
      console.error("Error creating budget:", err);
      toast({
        title: "Error",
        description: "Failed to create budget",
        variant: "destructive"
      });
    }
  };
  
  // Delete a budget
  const handleDeleteBudget = async (id: string) => {
    try {
      const { error } = await supabase
        .from('budgets')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      // Remove the budget from the state
      setBudgets(budgets.filter(budget => budget.id !== id));
      
      toast({
        title: "Budget deleted",
        description: "The budget has been removed successfully"
      });
      
      // Trigger budget update event
      window.dispatchEvent(new Event('budget-update'));
    } catch (err) {
      console.error("Error deleting budget:", err);
      toast({
        title: "Error",
        description: "Could not delete the budget",
        variant: "destructive"
      });
    }
  };
  
  // Get icon for budget category
  const getBudgetIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'food':
        return <Coffee className="h-5 w-5" />;
      case 'housing':
        return <Home className="h-5 w-5" />;
      case 'shopping':
        return <ShoppingBag className="h-5 w-5" />;
      case 'transport':
        return <Car className="h-5 w-5" />;
      case 'education':
        return <School className="h-5 w-5" />;
      case 'healthcare':
        return <Heart className="h-5 w-5" />;
      case 'entertainment':
        return <Film className="h-5 w-5" />;
      case 'personal':
        return <User className="h-5 w-5" />;
      default:
        return <Briefcase className="h-5 w-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Budgets</h1>
            <p className="text-muted-foreground">Manage and track your spending limits</p>
          </div>
          <Button onClick={() => setNewBudgetDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            New Budget
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : budgets.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No budgets found</CardTitle>
              <CardDescription>
                You haven't set any budget targets yet. Create a budget to start tracking your spending.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button onClick={() => setNewBudgetDialogOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Create New Budget
              </Button>
            </CardFooter>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Your Budgets</CardTitle>
              <CardDescription>
                Track your spending against your budget targets
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Budget</TableHead>
                    <TableHead>Spent</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {budgets.map((budget) => (
                    <TableRow key={budget.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            {getBudgetIcon(budget.category)}
                          </div>
                          <span>{budget.category}</span>
                        </div>
                      </TableCell>
                      <TableCell>₹{budget.total.toLocaleString('en-IN')}</TableCell>
                      <TableCell>₹{budget.spent.toLocaleString('en-IN')}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress 
                            value={budget.percentage} 
                            className={budget.percentage > 90 ? "bg-destructive" : ""}
                          />
                          <span className="w-12 text-xs">
                            {budget.percentage.toFixed(0)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete budget</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this budget? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteBudget(budget.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* New Budget Dialog */}
        <Dialog open={newBudgetDialogOpen} onOpenChange={setNewBudgetDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Budget</DialogTitle>
              <DialogDescription>
                Set a spending limit for a specific category.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <Select value={newCategory} onValueChange={setNewCategory}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="food">Food</SelectItem>
                    <SelectItem value="housing">Housing</SelectItem>
                    <SelectItem value="transport">Transport</SelectItem>
                    <SelectItem value="entertainment">Entertainment</SelectItem>
                    <SelectItem value="shopping">Shopping</SelectItem>
                    <SelectItem value="healthcare">Healthcare</SelectItem>
                    <SelectItem value="education">Education</SelectItem>
                    <SelectItem value="personal">Personal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="amount">Budget Amount (₹)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="10000"
                  value={newTotal}
                  onChange={(e) => setNewTotal(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNewBudgetDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={handleCreateBudget}>Create Budget</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default Budgets;
