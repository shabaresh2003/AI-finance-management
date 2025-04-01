
import { useState } from "react";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlusCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "./AuthProvider";
import { supabase } from "@/integrations/supabase/client";

type AccountType = "bank" | "credit" | "investment" | "loan";

const AddAccountModal = () => {
  const { toast } = useToast();
  const { userId } = useAuth();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    accountType: "",
    name: "",
    balance: "",
    cardNumber: "",
  });

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.accountType || !formData.name || !formData.balance) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }
    
    if (!userId) {
      toast({
        title: "Authentication error",
        description: "You must be logged in to add an account.",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Prepare account data for insertion
      const accountType = formData.accountType as AccountType;
      const numericBalance = formData.balance.replace(/[₹,\s]/g, '');
      
      const newAccount = {
        name: formData.name,
        balance: parseFloat(numericBalance),
        type: accountType,
        card_number: formData.cardNumber || null,
        user_id: userId
      };
      
      // Insert into Supabase
      const { data, error } = await supabase
        .from('accounts')
        .insert([newAccount])
        .select();
        
      if (error) throw error;
      
      // Reset form and close dialog
      setFormData({
        accountType: "",
        name: "",
        balance: "",
        cardNumber: "",
      });
      
      setOpen(false);
      
      toast({
        title: "Account successfully added",
        description: "Your new account has been added to your profile.",
      });
      
      // Dispatch event to trigger account list refresh
      window.dispatchEvent(new Event('account-update'));
      
    } catch (err) {
      console.error("Error adding account:", err);
      toast({
        title: "Error",
        description: "Failed to add account. Please try again later.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <PlusCircle size={16} />
          <span>Add Account</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add New Account</DialogTitle>
            <DialogDescription>
              Enter the details of your financial account to add it to your Wealth dashboard.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="accountType">Account Type</Label>
              <Select 
                value={formData.accountType}
                onValueChange={(value) => handleChange("accountType", value)}
              >
                <SelectTrigger id="accountType">
                  <SelectValue placeholder="Select account type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank">Bank Account</SelectItem>
                  <SelectItem value="credit">Credit Card</SelectItem>
                  <SelectItem value="investment">Investment</SelectItem>
                  <SelectItem value="loan">Loan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="name">Account Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="e.g. Chase Checking"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="balance">Current Balance</Label>
              <Input
                id="balance"
                value={formData.balance}
                onChange={(e) => handleChange("balance", e.target.value)}
                placeholder="e.g. 5000.00"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cardNumber">Account Number (Last 4 digits)</Label>
              <Input
                id="cardNumber"
                value={formData.cardNumber}
                onChange={(e) => handleChange("cardNumber", e.target.value)}
                placeholder="e.g. 1234"
                maxLength={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Adding..." : "Add Account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddAccountModal;
