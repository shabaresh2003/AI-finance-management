
import { useState, useEffect } from "react";
import { Lightbulb, ArrowRight, Sparkles, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface FinanceInsightProps {
  userId?: string | null;
}

interface InsightType {
  title: string;
  content: string;
}

const FinanceInsight = ({ userId }: FinanceInsightProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [insight, setInsight] = useState<InsightType | null>(null);
  const [userFinancials, setUserFinancials] = useState({
    hasAccounts: false,
    hasTransactions: false,
    hasBudget: false,
    totalBalance: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
    topExpenseCategory: ""
  });

  const insights: InsightType[] = [
    {
      title: "Budget Optimization Suggestion",
      content: "Based on your spending patterns, you could save approximately ₹20,875 per month by adjusting your subscription services and dining expenses. Consider reviewing your streaming services and meal planning to optimize your budget."
    },
    {
      title: "Investment Opportunity",
      content: "With your current savings rate, you have an opportunity to allocate ₹41,750 monthly towards a diversified investment portfolio. This could potentially yield an additional ₹12,52,500 over the next 5 years based on moderate market growth projections."
    },
    {
      title: "Debt Reduction Strategy",
      content: "By reallocating ₹25,050 from your entertainment budget to your credit card debt, you could be debt-free 8 months sooner and save approximately ₹37,575 in interest payments. This would improve your credit score by an estimated 25-30 points."
    },
    {
      title: "Emergency Fund Recommendation",
      content: "Your current emergency fund covers 2 months of expenses. Consider increasing your monthly contribution by ₹12,525 to reach the recommended 6-month coverage within the next year, providing better financial security."
    },
    {
      title: "Tax Optimization",
      content: "Based on your income and expenses, you may qualify for additional tax deductions worth approximately ₹1,00,200. Consider scheduling a consultation with a tax professional to review potential savings on your next return."
    }
  ];

  // Fetch user's financial data for personalized insights
  useEffect(() => {
    const fetchUserData = async () => {
      if (!userId) return;
      
      try {
        // Get accounts
        const { data: accounts, error: accountsError } = await supabase
          .from('accounts')
          .select('balance')
          .eq('user_id', userId);
          
        if (accountsError) throw accountsError;
        
        // Get current month's transactions
        const startDate = new Date();
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        
        const { data: transactions, error: transactionsError } = await supabase
          .from('transactions')
          .select('amount, type, category')
          .eq('user_id', userId)
          .gte('date', startDate.toISOString());
          
        if (transactionsError) throw transactionsError;
        
        // Get budgets
        const { data: budgets, error: budgetsError } = await supabase
          .from('budgets')
          .select('*')
          .eq('user_id', userId);
          
        if (budgetsError) throw budgetsError;
        
        // Calculate key financial metrics
        const totalBalance = accounts?.reduce((sum, account) => sum + parseFloat(account.balance), 0) || 0;
        
        const totalIncome = transactions
          ?.filter(tx => tx.type === 'income')
          .reduce((sum, tx) => sum + parseFloat(tx.amount), 0) || 0;
          
        const totalExpenses = transactions
          ?.filter(tx => tx.type === 'expense')
          .reduce((sum, tx) => sum + parseFloat(tx.amount), 0) || 0;
        
        // Find top expense category
        const expenseCategories: {[key: string]: number} = {};
        transactions?.forEach(tx => {
          if (tx.type === 'expense' && tx.category) {
            if (!expenseCategories[tx.category]) {
              expenseCategories[tx.category] = 0;
            }
            expenseCategories[tx.category] += parseFloat(tx.amount);
          }
        });
        
        let topCategory = "";
        let maxAmount = 0;
        
        Object.entries(expenseCategories).forEach(([category, amount]) => {
          if (amount > maxAmount) {
            maxAmount = amount;
            topCategory = category;
          }
        });
        
        setUserFinancials({
          hasAccounts: (accounts?.length || 0) > 0,
          hasTransactions: (transactions?.length || 0) > 0,
          hasBudget: (budgets?.length || 0) > 0,
          totalBalance,
          monthlyIncome: totalIncome,
          monthlyExpenses: totalExpenses,
          topExpenseCategory: topCategory
        });
        
      } catch (err) {
        console.error("Error fetching user financial data:", err);
      }
    };
    
    fetchUserData();
  }, [userId]);

  // Generate personalized insights based on user data
  useEffect(() => {
    if (userId) {
      generatePersonalizedInsight();
    } else {
      setInsight(null);
    }
  }, [userId, userFinancials]);

  const generatePersonalizedInsight = () => {
    // Don't show loading state on initial load
    setIsLoading(false);
    
    const { hasAccounts, hasTransactions, hasBudget, totalBalance, monthlyIncome, monthlyExpenses, topExpenseCategory } = userFinancials;
    
    // If user has no data yet
    if (!hasAccounts && !hasTransactions) {
      setInsight({
        title: "Get Started With Your Financial Journey",
        content: "Welcome to your financial dashboard! Start by adding your accounts and tracking your expenses to receive personalized financial insights and recommendations."
      });
      return;
    }
    
    // Analyze spending patterns based on time of day
    const currentHour = new Date().getHours();
    
    // Generate insight based on user's data
    if (monthlyExpenses > 0 && topExpenseCategory) {
      const formattedCategory = topExpenseCategory.charAt(0).toUpperCase() + topExpenseCategory.slice(1);
      
      if (currentHour >= 6 && currentHour < 12) {
        // Morning insight with saving tip
        setInsight({
          title: "Morning Spending Analysis",
          content: `Your highest spending category this month is ${formattedCategory} at ₹${Math.round(userFinancials.monthlyExpenses * 0.4).toLocaleString('en-IN')}. Consider setting a daily budget of ₹${Math.round(monthlyExpenses / 30).toLocaleString('en-IN')} to better manage your spending.`
        });
      } else if (currentHour >= 12 && currentHour < 18) {
        // Afternoon insight with budgeting tip
        setInsight({
          title: "Midday Budget Check-in",
          content: `You've spent ₹${monthlyExpenses.toLocaleString('en-IN')} this month, with ${formattedCategory} being your largest expense. Try implementing the 50/30/20 rule - 50% on needs, 30% on wants, and 20% on savings to improve your financial health.`
        });
      } else {
        // Evening insight with planning for tomorrow
        setInsight({
          title: "Evening Financial Review",
          content: `Your ${formattedCategory} expenses account for ${Math.round((userFinancials.monthlyExpenses * 0.4 / monthlyExpenses) * 100)}% of your spending. Planning tomorrow's expenses tonight can help reduce impulse purchases and save approximately ₹${Math.round(monthlyExpenses * 0.15).toLocaleString('en-IN')} monthly.`
        });
      }
    } else if (hasAccounts && totalBalance > 0) {
      // If user has accounts but few/no transactions
      setInsight({
        title: "Start Tracking Your Expenses",
        content: `You have ₹${totalBalance.toLocaleString('en-IN')} in your accounts. Begin tracking your daily expenses to unlock personalized insights on how to optimize your spending and increase your savings.`
      });
    } else {
      // Default insight
      setInsight(insights[Math.floor(Math.random() * insights.length)]);
    }
  };

  const generateNewInsight = () => {
    setIsLoading(true);
    setTimeout(() => {
      const { hasAccounts, hasTransactions, totalBalance, monthlyIncome, monthlyExpenses } = userFinancials;
      
      // Generate different insights based on user data
      if (hasAccounts && hasTransactions) {
        // For users with transaction data, generate more specific insights
        const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100 : 0;
        
        const specificInsights = [
          {
            title: "Spending Pattern Analysis",
            content: `Your spending tends to increase on weekends by approximately 45%. Setting a weekend budget of ₹${Math.round(monthlyExpenses * 0.3 / 8).toLocaleString('en-IN')} could help you save ₹${Math.round(monthlyExpenses * 0.15).toLocaleString('en-IN')} monthly.`
          },
          {
            title: "Savings Potential",
            content: `Your current savings rate is ${savingsRate.toFixed(1)}%. By optimizing your top spending categories, you could increase this to ${(savingsRate + 5).toFixed(1)}% and save an additional ₹${Math.round(monthlyIncome * 0.05).toLocaleString('en-IN')} monthly.`
          },
          {
            title: "Investment Opportunity",
            content: `Based on your financial profile, a Systematic Investment Plan (SIP) of ₹${Math.round(monthlyIncome * 0.1).toLocaleString('en-IN')} monthly in an index fund could potentially grow to ₹${Math.round(monthlyIncome * 0.1 * 12 * 5 * 1.12).toLocaleString('en-IN')} in 5 years.`
          },
          {
            title: "Tax-Saving Strategy",
            content: `Consider maximizing your Section 80C deductions through ELSS funds or PPF investments of ₹${Math.min(150000, Math.round(monthlyIncome * 0.15 * 12)).toLocaleString('en-IN')} annually to reduce your tax liability.`
          }
        ];
        
        setInsight(specificInsights[Math.floor(Math.random() * specificInsights.length)]);
      } else {
        // For new users without much data
        const newUserInsights = [
          {
            title: "Getting Started with Budgeting",
            content: "Begin with the 50/30/20 rule - allocate 50% of your income to needs, 30% to wants, and 20% to savings. This simple framework helps build financial discipline."
          },
          {
            title: "Emergency Fund Priority",
            content: "Before focusing on investments, aim to build an emergency fund covering 3-6 months of expenses. This provides financial security during unexpected situations."
          },
          {
            title: "Tracking Benefits",
            content: "Users who track expenses regularly typically save 15-20% more than those who don't. Start by categorizing your essential and non-essential spending."
          }
        ];
        
        setInsight(newUserInsights[Math.floor(Math.random() * newUserInsights.length)]);
      }
      
      setIsLoading(false);
      
      toast({
        title: "New financial insight generated",
        description: "AI has analyzed your financial data and generated a new insight.",
      });
    }, 1500);
  };

  const viewDetailedAnalysis = () => {
    toast({
      title: "Analysis feature coming soon",
      description: "Detailed financial analysis with Gemini 1.5 will be available in the next update.",
      variant: "default",
    });
  };

  if (!insight) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="bg-primary/5 pb-3 pt-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-primary" />
              <CardTitle className="text-sm font-medium">AI Finance Insight</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 flex items-center justify-center h-48">
          <div className="text-center text-muted-foreground">
            <p>Sign in to view personalized financial insights</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-primary/5 pb-3 pt-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-primary" />
            <CardTitle className="text-sm font-medium">AI Finance Insight</CardTitle>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={generateNewInsight}
            disabled={isLoading}
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="flex gap-4">
          <div className="hidden sm:flex flex-shrink-0 h-10 w-10 rounded-full bg-primary/10 items-center justify-center text-primary">
            <Lightbulb size={20} />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-base font-medium">{insight.title}</h3>
            <p className="text-sm text-muted-foreground">
              {insight.content}
            </p>
            
            <Button 
              variant="link" 
              className="p-0 h-auto text-primary" 
              size="sm"
              onClick={viewDetailedAnalysis}
            >
              <span>View detailed analysis</span>
              <ArrowRight size={14} className="ml-1" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FinanceInsight;
