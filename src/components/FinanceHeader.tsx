
import { Card, CardContent } from "@/components/ui/card";
import { Wallet, ArrowUpRight, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";
import { supabase } from "@/integrations/supabase/client";

const FinanceHeader = () => {
  const { user } = useAuth();
  const [balance, setBalance] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchTotalBalance = async () => {
      if (!user?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('accounts')
          .select('balance')
          .eq('user_id', user.id);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          const totalBalance = data.reduce((sum, account) => {
            return sum + parseFloat(account.balance);
          }, 0);
          
          setBalance(`₹${totalBalance.toLocaleString('en-IN')}`);
        } else {
          setBalance("₹0");
        }
      } catch (err) {
        console.error("Error fetching total balance:", err);
        setBalance("₹0");
      }
    };
    
    fetchTotalBalance();
  }, [user]);
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-2">
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="relative">
              <img 
                src="/finance-header.jpg" 
                alt="Finance Dashboard" 
                className="w-full h-48 object-cover"
                onError={(e) => {
                  e.currentTarget.src = "https://images.unsplash.com/photo-1579621970588-a35d0e7ab9b6?auto=format&fit=crop&q=80&w=1200&ixlib=rb-4.0.3";
                  e.currentTarget.style.height = "200px";
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/70 flex flex-col justify-end p-6">
                <div className="text-white">
                  <h1 className="text-2xl font-bold">Welcome, {user?.user_metadata?.full_name || user?.email?.split('@')[0] || "User"}</h1>
                  <p className="text-white/80 mt-1">Your financial dashboard at a glance</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div>
        <Card>
          <CardContent className="p-6 flex flex-col h-full justify-center">
            <div className="flex items-center justify-between">
              <div className="rounded-full bg-primary/10 p-3">
                <Wallet className="h-6 w-6 text-primary" />
              </div>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </div>
            
            <div className="mt-3">
              <p className="text-sm text-muted-foreground">Total Balance</p>
              <h2 className="text-3xl font-bold mt-1">
                {balance || <span className="animate-pulse">...</span>}
              </h2>
              <div className="flex items-center mt-1">
                <div className="flex items-center text-green-500 text-sm">
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  <span>4.3%</span>
                </div>
                <span className="text-xs text-muted-foreground ml-2">vs last month</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FinanceHeader;
