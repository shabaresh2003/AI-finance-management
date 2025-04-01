
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CategoryData {
  name: string;
  value: number;
}

interface ExpenseCategoryChartProps {
  userId?: string | null;
}

const ExpenseCategoryChart = ({ userId }: ExpenseCategoryChartProps) => {
  const [chartData, setChartData] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(false);
  const { toast } = useToast();
  
  const COLORS = ["#8884d8", "#83a6ed", "#8dd1e1", "#82ca9d", "#a4de6c", "#d0ed57"];
  
  useEffect(() => {
    const fetchCategoryData = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }
      
      try {
        // Get current month's start date
        const startDate = new Date();
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        
        const { data: transactions, error } = await supabase
          .from('transactions')
          .select('amount, category')
          .eq('user_id', userId)
          .eq('type', 'expense')
          .gte('date', startDate.toISOString());
          
        if (error) throw error;
        
        if (transactions && transactions.length > 0) {
          // Group by category
          const categoryTotals: { [key: string]: number } = {};
          
          transactions.forEach(tx => {
            const category = tx.category || 'Other';
            if (!categoryTotals[category]) {
              categoryTotals[category] = 0;
            }
            categoryTotals[category] += parseFloat(tx.amount);
          });
          
          // Convert to array format for chart
          const formattedData: CategoryData[] = Object.keys(categoryTotals).map(category => ({
            name: category.charAt(0).toUpperCase() + category.slice(1),
            value: categoryTotals[category]
          }));
          
          setChartData(formattedData);
          setHasData(formattedData.length > 0);
        } else {
          // No transactions, show empty state
          setHasData(false);
        }
      } catch (err) {
        console.error("Error fetching category data:", err);
        toast({
          title: "Error",
          description: "Failed to fetch expense category data",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchCategoryData();
  }, [userId, toast]);

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center h-[300px]">
      <p className="text-muted-foreground text-center">No expense data available</p>
      <button
        className="mt-4 text-sm text-primary"
        onClick={() => window.location.href = "/transactions"}
      >
        Add your first expense
      </button>
    </div>
  );

  return (
    <Card className="w-full h-full">
      <CardHeader>
        <CardTitle className="text-lg font-medium">Expense Breakdown</CardTitle>
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
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Amount']} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default ExpenseCategoryChart;
