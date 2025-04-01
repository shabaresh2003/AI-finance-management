
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Coffee, Home, ShoppingBag, Car, School, PlusCircle, Pencil, Briefcase, Film, Heart, User, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "./ui/button";
import { useNavigate } from "react-router-dom";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "./ui/alert-dialog";

interface BudgetCategory {
  id: string;
  name: string;
  spent: number;
  total: number;
  icon: React.ReactNode;
  percentage: number;
}

const BudgetOverview = () => {
  const { toast } = useToast();
  const { userId } = useAuth();
  const [budgets, setBudgets] = useState<BudgetCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Fetch budget data 
  useEffect(() => {
    const fetchBudgetData = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        // Fetch budget data from Supabase
        const { data, error } = await supabase
          .from('budgets')
          .select('*')
          .eq('user_id', userId);
          
        if (error) throw error;
        
        console.log("Fetched budget data in BudgetOverview:", data);
        
        if (data && data.length > 0) {
          // Update spent amount for each budget by fetching related transactions
          const updatedBudgets = await Promise.all(data.map(async (budget) => {
            // Get all transactions for this category in the current month
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);
            
            const { data: transactions, error: txError } = await supabase
              .from('transactions')
              .select('amount')
              .eq('user_id', userId)
              .eq('category', budget.category.toLowerCase())
              .eq('type', 'expense')
              .gte('date', startOfMonth.toISOString());
              
            if (txError) {
              console.error("Error fetching transactions for budget:", txError);
              return budget; // Return budget without updated spent amount
            }
            
            // Calculate total spent from transactions
            let totalSpent = 0;
            if (transactions && transactions.length > 0) {
              totalSpent = transactions.reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
              console.log(`Total spent for ${budget.category}: ${totalSpent}`);
            }
            
            // Update the budget with the spent amount
            const { data: updatedBudget, error: updateError } = await supabase
              .from('budgets')
              .update({ spent: totalSpent })
              .eq('id', budget.id)
              .select()
              .single();
              
            if (updateError) {
              console.error("Error updating budget spent amount:", updateError);
              return {
                ...budget,
                spent: totalSpent
              };
            }
            
            return updatedBudget || {
              ...budget,
              spent: totalSpent
            };
          }));
          
          // Format budget data
          const formattedBudgets: BudgetCategory[] = updatedBudgets.map(budget => {
            const icon = getBudgetIcon(budget.category);
            const percentage = (budget.spent / budget.total) * 100;
            
            return {
              id: budget.id,
              name: budget.category,
              spent: budget.spent,
              total: budget.total,
              icon,
              percentage
            };
          });
          
          setBudgets(formattedBudgets);
        } else {
          // Set empty state when no budgets are found
          setBudgets([]);
        }
      } catch (err) {
        console.error("Error fetching budget data:", err);
        toast({
          title: "Error",
          description: "Could not load budget data",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchBudgetData();
    
    // Set up event listeners
    const handleTransactionUpdate = () => {
      console.log("Transaction update detected, refreshing budget data");
      fetchBudgetData();
    };
    
    const handleBudgetUpdate = () => {
      console.log("Budget update detected, refreshing budget data");
      fetchBudgetData();
    };
    
    window.addEventListener('transaction-update', handleTransactionUpdate);
    window.addEventListener('budget-update', handleBudgetUpdate);
    
    // Set up a refresh interval to update budget data periodically
    const refreshInterval = setInterval(fetchBudgetData, 30000); // Refresh every 30 seconds
    
    return () => {
      window.removeEventListener('transaction-update', handleTransactionUpdate);
      window.removeEventListener('budget-update', handleBudgetUpdate);
      clearInterval(refreshInterval);
    };
  }, [userId, toast]);

  // Helper function to get the appropriate icon for each budget category
  const getBudgetIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'food':
        return <Coffee size={16} />;
      case 'housing':
        return <Home size={16} />;
      case 'shopping':
        return <ShoppingBag size={16} />;
      case 'transport':
        return <Car size={16} />;
      case 'education':
        return <School size={16} />;
      case 'healthcare':
        return <Heart size={16} />;
      case 'entertainment':
        return <Film size={16} />;
      case 'personal':
        return <User size={16} />;
      default:
        return <Briefcase size={16} />;
    }
  };

  const handleSetupBudget = () => {
    navigate("/budgets");
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
        description: "The budget has been removed successfully.",
      });
      
      // Trigger a budget update event
      window.dispatchEvent(new Event('budget-update'));
    } catch (err) {
      console.error("Error deleting budget:", err);
      toast({
        title: "Error",
        description: "Could not delete the budget. Please try again.",
        variant: "destructive"
      });
    }
  };

  // If there are no budgets yet, show a message
  if (!loading && budgets.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Budget Overview</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-6">
          <p className="text-muted-foreground text-center">
            No budget data available yet.
          </p>
          <Button 
            className="mt-4 gap-2"
            onClick={handleSetupBudget}
          >
            <PlusCircle size={16} />
            Set up your first budget
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-medium">Budget Overview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : (
          budgets.map((budget) => (
            <div key={budget.id} className="space-y-1">
              <div className="flex justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    {budget.icon}
                  </div>
                  <span className="font-medium">{budget.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={budget.percentage > 90 ? "destructive" : "default"}>
                    {budget.percentage > 90 ? "Over Budget" : `${budget.percentage.toFixed(0)}%`}
                  </Badge>
                  
                  {budget.percentage >= 100 && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <Trash2 size={14} className="text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete this budget?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently remove this budget from your dashboard. 
                            This action cannot be undone.
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
                  )}
                </div>
              </div>
              <Progress 
                value={budget.percentage} 
                className={budget.percentage > 90 ? "bg-destructive" : ""} 
              />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  ₹{budget.spent.toLocaleString('en-IN')} spent
                </span>
                <span className="text-muted-foreground">
                  ₹{budget.total.toLocaleString('en-IN')} budget
                </span>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default BudgetOverview;
