
import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import TransactionList from "@/components/TransactionList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarDays, Download, Filter, Search, Plus } from "lucide-react";
import { format, subDays } from "date-fns";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import AddTransactionDialog from "@/components/AddTransactionDialog";
import { useToast } from "@/hooks/use-toast";

const Transactions = () => {
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [account, setAccount] = useState("all");
  const [category, setCategory] = useState("all");
  const [type, setType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);

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

  // Apply filters when date range changes
  useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      applyDateFilter();
    }
  }, [dateRange]);

  // Apply date filter to transactions
  const applyDateFilter = async () => {
    if (!dateRange?.from || !dateRange?.to) return;
    
    setIsFiltering(true);
    try {
      // Create ISO format date strings
      const fromDate = dateRange.from.toISOString();
      const toDate = dateRange.to.toISOString();
      
      // Dispatch a custom event that TransactionList will listen for
      const filterEvent = new CustomEvent('filter-transactions', { 
        detail: { 
          dateFrom: fromDate,
          dateTo: toDate,
          account,
          category,
          type,
          searchQuery
        } 
      });
      window.dispatchEvent(filterEvent);
      
    } catch (error) {
      console.error("Error applying filters:", error);
      toast({
        title: "Error",
        description: "Failed to apply filters. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsFiltering(false);
    }
  };

  // Handle adding a new transaction
  const handleAddTransaction = (newTransaction: any) => {
    setDialogOpen(false);
    // Dispatch event to refresh the transaction list
    const refreshEvent = new CustomEvent('refresh-transactions');
    window.dispatchEvent(refreshEvent);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container px-4 py-8">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 opacity-0 animate-on-mount">
          <div>
            <h1 className="text-3xl font-bold">Transactions</h1>
            <p className="text-muted-foreground mt-1">
              View and manage all your financial transactions
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-1">
                  <CalendarDays size={15} />
                  <span className="hidden sm:inline">
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "LLL d, y")} - {format(dateRange.to, "LLL d, y")}
                        </>
                      ) : (
                        format(dateRange.from, "LLL d, y")
                      )
                    ) : (
                      "Select date range"
                    )}
                  </span>
                  <span className="sm:hidden">Date Range</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
            <Button 
              variant="outline" 
              size="icon" 
              className="h-9 w-9"
              onClick={() => {
                // Trigger download in TransactionList component by simulating a click event
                const downloadEvent = new CustomEvent('download-transactions');
                window.dispatchEvent(downloadEvent);
              }}
            >
              <Download size={16} />
            </Button>
            <Button 
              variant="default" 
              size="sm" 
              className="h-9 gap-1"
              onClick={() => setDialogOpen(true)}
            >
              <Plus size={16} />
              <span>Add Transaction</span>
            </Button>
          </div>
        </div>
        
        <div className="mt-6 opacity-0 animate-on-mount animation-delay-100">
          <div className="bg-card rounded-lg border p-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search transactions..."
                    className="w-full pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        applyDateFilter();
                      }
                    }}
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Select value={account} onValueChange={setAccount}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Account" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Accounts</SelectItem>
                    <SelectItem value="chase">Chase Checking</SelectItem>
                    <SelectItem value="amex">Amex Platinum</SelectItem>
                    <SelectItem value="vanguard">Vanguard 401k</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="shopping">Shopping</SelectItem>
                    <SelectItem value="food">Food</SelectItem>
                    <SelectItem value="housing">Housing</SelectItem>
                    <SelectItem value="transport">Transport</SelectItem>
                    <SelectItem value="healthcare">Healthcare</SelectItem>
                    <SelectItem value="education">Education</SelectItem>
                    <SelectItem value="entertainment">Entertainment</SelectItem>
                    <SelectItem value="personal">Personal</SelectItem>
                    <SelectItem value="emi">EMI</SelectItem>
                    <SelectItem value="salary">Salary</SelectItem>
                    <SelectItem value="investments">Investments</SelectItem>
                    <SelectItem value="freelance">Freelance</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button 
                  variant="outline" 
                  className="gap-2"
                  onClick={applyDateFilter}
                  disabled={isFiltering}
                >
                  <Filter size={16} />
                  <span>Apply Filters</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-6 opacity-0 animate-on-mount animation-delay-200">
          <TransactionList />
        </div>
      </main>
      <footer className="container mx-auto px-4 py-6 mt-8 border-t text-center text-muted-foreground">
        <p>© 2025 Wealth Finance App. All rights reserved.</p>
      </footer>

      <AddTransactionDialog 
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onAddTransaction={handleAddTransaction}
      />
    </div>
  );
};

export default Transactions;
