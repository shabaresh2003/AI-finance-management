
import { useEffect, useState } from "react";
import { Wallet, TrendingUp, PiggyBank, ArrowUpRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import StatCard from "@/components/StatCard";
import FinanceHeader from "@/components/FinanceHeader";
import AccountsList from "@/components/AccountsList";
import CreditScoreChart from "@/components/CreditScoreChart";
import BudgetOverview from "@/components/BudgetOverview";
import EmiBanner from "@/components/EmiBanner";
import FinanceInsight from "@/components/FinanceInsight";
import TransactionList from "@/components/TransactionList";
import IncomeExpenseChart from "@/components/IncomeExpenseChart";
import ExpenseCategoryChart from "@/components/ExpenseCategoryChart";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Dashboard = () => {
  const { userId, isAuthenticated, isLoading: authLoading } = useAuth();
  const [monthlyIncome, setMonthlyIncome] = useState<string | null>(null);
  const [monthlyExpenses, setMonthlyExpenses] = useState<string | null>(null);
  const [savingsRate, setSavingsRate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(false);
  const [incomeTrend, setIncomeTrend] = useState<{ value: number; isPositive: boolean } | undefined>(undefined);
  const [expenseTrend, setExpenseTrend] = useState<{ value: number; isPositive: boolean } | undefined>(undefined);
  const [savingsTrend, setSavingsTrend] = useState<{ value: number; isPositive: boolean } | undefined>(undefined);
  const { toast } = useToast();

  // Fetch user financial data
  useEffect(() => {
    const fetchUserFinancials = async () => {
      if (!userId) return;
      
      setLoading(true);
      try {
        // Current month data
        const currentMonth = new Date();
        const startOfCurrentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        startOfCurrentMonth.setHours(0, 0, 0, 0);
        
        // Last month data
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        const startOfLastMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
        startOfLastMonth.setHours(0, 0, 0, 0);
        const endOfLastMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 0);
        endOfLastMonth.setHours(23, 59, 59, 999);
        
        console.log("Fetching financial data for periods:");
        console.log("- Current month start:", startOfCurrentMonth.toISOString());
        console.log("- Last month start:", startOfLastMonth.toISOString());
        console.log("- Last month end:", endOfLastMonth.toISOString());
        
        // Get income transactions for the current month
        const { data: currentIncomeData, error: currentIncomeError } = await supabase
          .from('transactions')
          .select('amount')
          .eq('type', 'income')
          .eq('user_id', userId)
          .gte('date', startOfCurrentMonth.toISOString());
          
        if (currentIncomeError) throw currentIncomeError;
        
        // Get expense transactions for the current month
        const { data: currentExpenseData, error: currentExpenseError } = await supabase
          .from('transactions')
          .select('amount')
          .eq('type', 'expense')
          .eq('user_id', userId)
          .gte('date', startOfCurrentMonth.toISOString());
          
        if (currentExpenseError) throw currentExpenseError;
        
        // Get income transactions for the last month
        const { data: lastIncomeData, error: lastIncomeError } = await supabase
          .from('transactions')
          .select('amount')
          .eq('type', 'income')
          .eq('user_id', userId)
          .gte('date', startOfLastMonth.toISOString())
          .lt('date', startOfCurrentMonth.toISOString());
          
        if (lastIncomeError) throw lastIncomeError;
        
        // Get expense transactions for the last month
        const { data: lastExpenseData, error: lastExpenseError } = await supabase
          .from('transactions')
          .select('amount')
          .eq('type', 'expense')
          .eq('user_id', userId)
          .gte('date', startOfLastMonth.toISOString())
          .lt('date', startOfCurrentMonth.toISOString());
          
        if (lastExpenseError) throw lastExpenseError;
        
        // Calculate totals for current month
        const currentTotalIncome = currentIncomeData?.reduce((sum, item) => sum + parseFloat(item.amount), 0) || 0;
        const currentTotalExpenses = currentExpenseData?.reduce((sum, item) => sum + parseFloat(item.amount), 0) || 0;
        
        // Calculate totals for last month
        const lastTotalIncome = lastIncomeData?.reduce((sum, item) => sum + parseFloat(item.amount), 0) || 0;
        const lastTotalExpenses = lastExpenseData?.reduce((sum, item) => sum + parseFloat(item.amount), 0) || 0;
        
        console.log("Current month income:", currentTotalIncome);
        console.log("Current month expenses:", currentTotalExpenses);
        console.log("Last month income:", lastTotalIncome);
        console.log("Last month expenses:", lastTotalExpenses);
        
        // Format as INR
        setMonthlyIncome(`₹${currentTotalIncome.toLocaleString('en-IN')}`);
        setMonthlyExpenses(`₹${currentTotalExpenses.toLocaleString('en-IN')}`);
        
        // Calculate trends for income
        if (lastTotalIncome > 0) {
          const incomeDiff = ((currentTotalIncome - lastTotalIncome) / lastTotalIncome) * 100;
          setIncomeTrend({
            value: Math.abs(parseFloat(incomeDiff.toFixed(1))),
            isPositive: incomeDiff >= 0
          });
        }
        
        // Calculate trends for expenses
        if (lastTotalExpenses > 0) {
          const expenseDiff = ((currentTotalExpenses - lastTotalExpenses) / lastTotalExpenses) * 100;
          setExpenseTrend({
            value: Math.abs(parseFloat(expenseDiff.toFixed(1))),
            isPositive: expenseDiff <= 0 // For expenses, lower is positive
          });
        }
        
        // Calculate current savings rate
        let currentSavingsRate = 0;
        if (currentTotalIncome > 0) {
          currentSavingsRate = ((currentTotalIncome - currentTotalExpenses) / currentTotalIncome) * 100;
          setSavingsRate(`${currentSavingsRate.toFixed(1)}%`);
        } else {
          setSavingsRate("0%");
        }
        
        // Calculate last month's savings rate
        let lastSavingsRate = 0;
        if (lastTotalIncome > 0) {
          lastSavingsRate = ((lastTotalIncome - lastTotalExpenses) / lastTotalIncome) * 100;
        }
        
        // Calculate savings rate trend
        if (lastTotalIncome > 0) {
          const savingsRateDiff = currentSavingsRate - lastSavingsRate;
          setSavingsTrend({
            value: Math.abs(parseFloat(savingsRateDiff.toFixed(1))),
            isPositive: savingsRateDiff >= 0
          });
        }
        
        // Check if user has any data
        setHasData(currentTotalIncome > 0 || currentTotalExpenses > 0 || 
                  lastTotalIncome > 0 || lastTotalExpenses > 0 || 
                  (currentIncomeData?.length || 0) > 0 || 
                  (currentExpenseData?.length || 0) > 0);
      } catch (err) {
        console.error("Error fetching financial data:", err);
        toast({
          title: "Error",
          description: "Failed to fetch financial data",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserFinancials();
  }, [userId, toast]);

  // On component mount, add animation classes
  useEffect(() => {
    const elements = document.querySelectorAll('.animate-on-mount');
    elements.forEach((el, index) => {
      setTimeout(() => {
        el.classList.add('animate-fade-up');
        el.classList.remove('opacity-0');
      }, index * 100);
    });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container px-4 py-8">
        <div className="opacity-0 animate-on-mount">
          <FinanceHeader />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <StatCard
            title="Monthly Income"
            value={loading ? "Loading..." : (monthlyIncome || "₹0")}
            icon={<Wallet size={18} />}
            trend={hasData ? incomeTrend : undefined}
            trendText="vs last month"
            className="opacity-0 animate-on-mount"
          />
          <StatCard
            title="Monthly Expenses"
            value={loading ? "Loading..." : (monthlyExpenses || "₹0")}
            icon={<ArrowUpRight size={18} />}
            trend={hasData ? expenseTrend : undefined}
            trendText="vs last month"
            className="opacity-0 animate-on-mount animation-delay-100"
          />
          <StatCard
            title="Savings Rate"
            value={loading ? "Loading..." : (savingsRate || "0%")}
            icon={<PiggyBank size={18} />}
            trend={hasData ? savingsTrend : undefined}
            trendText="vs last month"
            className="opacity-0 animate-on-mount animation-delay-200"
          />
        </div>
        
        <div className="mt-8 opacity-0 animate-on-mount animation-delay-300">
          <EmiBanner />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8 opacity-0 animate-on-mount animation-delay-300">
          <IncomeExpenseChart userId={userId} />
          <ExpenseCategoryChart userId={userId} />
        </div>
        
        <div className="mt-8 opacity-0 animate-on-mount animation-delay-400">
          <AccountsList />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          <div className="lg:col-span-1 opacity-0 animate-on-mount animation-delay-200">
            <CreditScoreChart userId={userId} />
          </div>
          
          <div className="opacity-0 animate-on-mount animation-delay-300">
            <BudgetOverview />
          </div>
          
          <div className="opacity-0 animate-on-mount animation-delay-400">
            <div className="space-y-6">
              <FinanceInsight userId={userId} />
              
              <div className="bg-primary/5 rounded-xl p-6">
                <h3 className="text-base font-medium">Need Financial Advice?</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Get personalized financial advice from our AI assistant powered by Gemini 1.5.
                </p>
                <button 
                  className="mt-4 w-full bg-primary text-primary-foreground hover:bg-primary/90 py-2 rounded-md"
                  onClick={() => window.location.href = "/financial-advisor"}
                >
                  Ask the AI Assistant
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-8 opacity-0 animate-on-mount animation-delay-500">
          <TransactionList />
        </div>
      </main>
      <footer className="container mx-auto px-4 py-6 mt-8 border-t text-center text-muted-foreground">
        <p>© 2025 Wealth Finance App. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Dashboard;
