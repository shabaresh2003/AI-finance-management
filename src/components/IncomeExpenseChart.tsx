
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface MonthlyData {
  name: string;
  income: number;
  expenses: number;
}

interface IncomeExpenseChartProps {
  userId?: string | null;
}

const IncomeExpenseChart = ({ userId }: IncomeExpenseChartProps) => {
  const [chartData, setChartData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(false);
  const { toast } = useToast();
  
  useEffect(() => {
    const fetchChartData = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }
      
      try {
        // Get transactions for the last 6 months
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 5);
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        
        const { data: transactions, error } = await supabase
          .from('transactions')
          .select('amount, type, date')
          .eq('user_id', userId)
          .gte('date', startDate.toISOString())
          .lte('date', endDate.toISOString());
          
        if (error) throw error;
        
        if (transactions && transactions.length > 0) {
          // Group by month
          const monthlyData: { [key: string]: { income: number, expenses: number } } = {};
          
          // Initialize last 6 months
          for (let i = 0; i < 6; i++) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const monthYear = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
            monthlyData[monthYear] = { income: 0, expenses: 0 };
          }
          
          // Add transaction data
          transactions.forEach(tx => {
            const date = new Date(tx.date);
            const monthYear = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
            
            if (!monthlyData[monthYear]) {
              monthlyData[monthYear] = { income: 0, expenses: 0 };
            }
            
            const amount = parseFloat(tx.amount);
            if (tx.type === 'income') {
              monthlyData[monthYear].income += amount;
            } else {
              monthlyData[monthYear].expenses += amount;
            }
          });
          
          // Convert to array format for chart
          const formattedData: MonthlyData[] = Object.keys(monthlyData)
            .map(month => ({
              name: month.split(' ')[0], // Just use month abbreviation
              income: monthlyData[month].income,
              expenses: monthlyData[month].expenses
            }))
            .reverse(); // Show oldest to newest
          
          setChartData(formattedData);
          setHasData(true);
        } else {
          // No transactions, show empty state
          setHasData(false);
        }
      } catch (err) {
        console.error("Error fetching chart data:", err);
        toast({
          title: "Error",
          description: "Failed to fetch income and expense data",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchChartData();
  }, [userId, toast]);

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center h-[300px]">
      <p className="text-muted-foreground text-center">No transaction data available</p>
      <button
        className="mt-4 text-sm text-primary"
        onClick={() => window.location.href = "/transactions"}
      >
        Add your first transaction
      </button>
    </div>
  );

  return (
    <Card className="w-full h-full">
      <CardHeader>
        <CardTitle className="text-lg font-medium">Income vs Expenses</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-[300px]">
            <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : !hasData ? (
          renderEmptyState()
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={chartData}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip 
                formatter={(value) => [`₹${Number(value).toLocaleString('en-IN')}`, undefined]}
                labelFormatter={(label) => `Month: ${label}`}
              />
              <Legend />
              <Bar dataKey="income" fill="#8884d8" name="Income" />
              <Bar dataKey="expenses" fill="#82ca9d" name="Expenses" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default IncomeExpenseChart;
