
import { Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useAuth } from "./AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface EmiBannerProps {
  nextPayment?: {
    amount: string;
    date: string;
    description: string;
  };
}

const EmiBanner = ({ nextPayment }: EmiBannerProps) => {
  const { userId } = useAuth();
  const { toast } = useToast();
  const [paymentData, setPaymentData] = useState<EmiBannerProps["nextPayment"] | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch upcoming EMI payments for the user
  useEffect(() => {
    const fetchUpcomingPayment = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        // First check if there are any transactions with EMI category
        const { data: emiTransactions, error: transactionError } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', userId)
          .or('category.eq.emi,category.eq.loan,category.eq.payment')
          .gt('date', new Date().toISOString()) // Only future payments
          .order('date', { ascending: true })
          .limit(1);

        if (transactionError) throw transactionError;

        if (emiTransactions && emiTransactions.length > 0) {
          const emiTransaction = emiTransactions[0];
          setPaymentData({
            amount: `₹${parseFloat(emiTransaction.amount).toLocaleString('en-IN')}`,
            date: new Date(emiTransaction.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
            description: emiTransaction.name
          });
        } else {
          // Check for any accounts with negative balance (loans)
          const { data: accounts, error } = await supabase
            .from('accounts')
            .select('*')
            .eq('user_id', userId)
            .lt('balance', 0)
            .order('balance', { ascending: true })
            .limit(1);

          if (error) throw error;

          if (accounts && accounts.length > 0) {
            // Calculate a fictional EMI based on the negative balance
            const loan = accounts[0];
            const loanAmount = Math.abs(parseFloat(loan.balance));
            const emiAmount = (loanAmount * 0.05).toFixed(2); // 5% of loan as EMI
            
            // Next payment date is 1 month from now
            const nextDate = new Date();
            nextDate.setMonth(nextDate.getMonth() + 1);
            
            setPaymentData({
              amount: `₹${parseFloat(emiAmount).toLocaleString('en-IN')}`,
              date: nextDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
              description: `EMI payment for ${loan.name}`
            });
          } else {
            // No loans found
            setPaymentData(null);
          }
        }
      } catch (err) {
        console.error("Error fetching upcoming payments:", err);
        toast({
          title: "Error",
          description: "Failed to load EMI data",
          variant: "destructive" 
        });
        setPaymentData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUpcomingPayment();
  }, [userId, toast]);

  // Use provided nextPayment prop if available, otherwise use fetched data
  const displayPayment = nextPayment || paymentData;

  if (loading) {
    return (
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-16">
            <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Don't render anything if no payment data is available
  if (!displayPayment) {
    return null;
  }

  return (
    <Card className="bg-primary/5 border-primary/20">
      <CardContent className="p-6">
        <div className="flex flex-wrap md:flex-nowrap justify-between items-center gap-4">
          <div className="flex items-start gap-4">
            <div className="rounded-full bg-primary/10 p-3 text-primary">
              <Clock size={24} />
            </div>
            
            <div>
              <h3 className="text-lg font-medium">Upcoming EMI Payment</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {displayPayment.description}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Due Date</p>
              <p className="text-lg font-medium">{displayPayment.date}</p>
            </div>
            
            <div>
              <p className="text-sm text-muted-foreground">Amount</p>
              <p className="text-lg font-bold">{displayPayment.amount}</p>
            </div>
            
            <Button className="whitespace-nowrap">Pay Now</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EmiBanner;
