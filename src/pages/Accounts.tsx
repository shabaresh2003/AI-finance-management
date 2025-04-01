
import Navbar from "@/components/Navbar";
import AccountsList from "@/components/AccountsList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect } from "react";
import AddAccountModal from "@/components/AddAccountModal";

const Accounts = () => {
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
          <h1 className="text-3xl font-bold">Accounts</h1>
          <p className="text-muted-foreground mt-1">
            Manage all your financial accounts in one place
          </p>
        </div>
        
        <Card className="mt-8 opacity-0 animate-on-mount animation-delay-100">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>All Accounts</CardTitle>
            <AddAccountModal />
          </CardHeader>
          <CardContent>
            <AccountsList />
          </CardContent>
        </Card>
      </main>
      <footer className="container mx-auto px-4 py-6 mt-8 border-t text-center text-muted-foreground">
        <p>© 2025 Wealth Finance App. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Accounts;
