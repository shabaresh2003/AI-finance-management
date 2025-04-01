
import { cn } from "@/lib/utils";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import AccountCard from "./AccountCard";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "./AuthProvider";
import { supabase } from "@/integrations/supabase/client";

interface AccountsListProps {
  className?: string;
}

// Define a type for the account
type AccountType = "bank" | "credit" | "investment";

interface BaseAccount {
  id: string;
  name: string;
  balance: string;
  user_id: string;
}

interface BankAccount extends BaseAccount {
  type: "bank";
  cardNumber: string;
}

interface CreditAccount extends BaseAccount {
  type: "credit";
  cardNumber: string;
}

interface InvestmentAccount extends BaseAccount {
  type: "investment";
  cardNumber?: string;
}

type Account = BankAccount | CreditAccount | InvestmentAccount;

const AccountsList = ({ className }: AccountsListProps) => {
  const { toast } = useToast();
  const { userId } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user-specific accounts
  const fetchAccounts = async () => {
    if (!userId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', userId);
        
      if (error) throw error;
      
      if (data) {
        // Format data to match our Account type
        const formattedAccounts = data.map(account => {
          // Format balance to INR
          const formattedBalance = `₹${parseFloat(account.balance).toLocaleString('en-IN')}`;
          
          if (account.type === 'investment') {
            return {
              id: account.id,
              name: account.name,
              balance: formattedBalance,
              type: account.type as AccountType,
              user_id: account.user_id
            } as InvestmentAccount;
          } else {
            return {
              id: account.id,
              name: account.name,
              balance: formattedBalance,
              type: account.type as AccountType,
              cardNumber: account.card_number || "0000",
              user_id: account.user_id
            } as BankAccount | CreditAccount;
          }
        });
        
        setAccounts(formattedAccounts);
      }
    } catch (err) {
      console.error("Error fetching accounts:", err);
      toast({
        title: "Error fetching accounts",
        description: "Failed to load your accounts. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
    
    // Listen for account updates
    const handleAccountUpdate = () => {
      fetchAccounts();
    };
    
    window.addEventListener('account-update', handleAccountUpdate);
    window.addEventListener('transaction-update', handleAccountUpdate);
    
    return () => {
      window.removeEventListener('account-update', handleAccountUpdate);
      window.removeEventListener('transaction-update', handleAccountUpdate);
    };
  }, [userId]);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">My Accounts</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full flex justify-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : accounts.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-8">
            <p className="text-muted-foreground">You don't have any accounts yet.</p>
            <Button 
              variant="outline" 
              className="mt-4 gap-1"
              onClick={() => {
                // Find the add account button by its aria-label and trigger it
                const addAccountButton = document.querySelector('[aria-label="Add Account"]');
                if (addAccountButton instanceof HTMLElement) {
                  addAccountButton.click();
                }
              }}
            >
              <PlusCircle size={16} />
              <span>Add Your First Account</span>
            </Button>
          </div>
        ) : (
          accounts.map((account) => (
            <AccountCard
              key={account.id}
              type={account.type}
              name={account.name}
              balance={account.balance}
              cardNumber={account.cardNumber}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default AccountsList;
