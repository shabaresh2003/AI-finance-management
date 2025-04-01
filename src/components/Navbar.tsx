import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronDown, Menu, X, Home, PieChart, CreditCard, Wallet, Clock, Settings, Bell, Moon, Sun, User, LogOut } from "lucide-react";
import { 
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "./AuthProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  created_at?: string;
  createdAt?: string;
}

const Navbar = () => {
  const isMobile = useIsMobile();
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { userId } = useAuth();

  useEffect(() => {
    if (!userId) return;
    
    const fetchNotifications = async () => {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        
        if (data) {
          setNotifications(data);
          setUnreadCount(data.filter(n => !n.read).length);
        }
      } catch (err) {
        console.error("Error fetching notifications:", err);
      }
    };
    
    fetchNotifications();
    
    // Set up a subscription for new notifications
    const notificationsChannel = supabase
      .channel('public:notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        const newNotification = payload.new as Notification;
        setNotifications(prev => [newNotification, ...prev]);
        setUnreadCount(prev => prev + 1);
        
        toast({
          title: newNotification.title,
          description: newNotification.message,
        });
      })
      .subscribe();
      
    // Refresh notifications periodically
    const interval = setInterval(fetchNotifications, 30000);
    
    return () => {
      supabase.removeChannel(notificationsChannel);
      clearInterval(interval);
    };
  }, [userId, toast]);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    document.documentElement.classList.toggle("dark");
  };

  const markAllAsRead = async () => {
    if (!userId) return;
    
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false);
        
      if (error) throw error;
      
      setNotifications(notifications.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Error marking notifications as read:", err);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);
        
      if (error) throw error;
      
      setNotifications(notifications.map(n => 
        n.id === id ? { ...n, read: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Signed out successfully",
      description: "You have been signed out of your account",
    });
    navigate("/auth");
  };

  const handleProfileClick = () => {
    toast({
      title: "Profile",
      description: "Navigating to profile page",
    });
    navigate("/profile");
  };

  const handleSettingsClick = () => {
    toast({
      title: "Settings",
      description: "Navigating to settings page",
    });
    navigate("/settings");
  };

  const formatNotificationTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 60) {
      return `${diffMins} min${diffMins === 1 ? '' : 's'} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    } else {
      return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    }
  };

  const NavLinks = () => (
    <div className="flex items-center gap-6">
      <Link to="/dashboard" className="flex items-center gap-2 text-sm font-medium text-foreground/80 hover:text-primary transition-colors">
        <Home size={18} />
        <span>Dashboard</span>
      </Link>
      <Link to="/accounts" className="flex items-center gap-2 text-sm font-medium text-foreground/80 hover:text-primary transition-colors">
        <Wallet size={18} />
        <span>Accounts</span>
      </Link>
      <Link to="/transactions" className="flex items-center gap-2 text-sm font-medium text-foreground/80 hover:text-primary transition-colors">
        <CreditCard size={18} />
        <span>Transactions</span>
      </Link>
      <Link to="/budgets" className="flex items-center gap-2 text-sm font-medium text-foreground/80 hover:text-primary transition-colors">
        <PieChart size={18} />
        <span>Budgets</span>
      </Link>
      <Link to="/payments" className="flex items-center gap-2 text-sm font-medium text-foreground/80 hover:text-primary transition-colors">
        <Clock size={18} />
        <span>EMI & Payments</span>
      </Link>
    </div>
  );

  return (
    <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="relative w-8 h-8 rounded-full bg-primary flex items-center justify-center overflow-hidden">
              <div className="absolute w-5 h-5 bg-primary-foreground rounded-full" style={{ top: -2, right: -2 }}></div>
            </div>
            <span className="text-xl font-semibold tracking-tight">Wealth</span>
          </Link>
          
          {!isMobile && <NavLinks />}
        </div>
        
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleTheme} 
            className="rounded-full"
          >
            {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
          </Button>
          
          <DropdownMenu open={notificationsOpen} onOpenChange={setNotificationsOpen}>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="rounded-full relative"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 w-4 h-4 bg-primary rounded-full flex items-center justify-center text-[10px] text-white font-semibold">{unreadCount}</span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 max-h-[400px] overflow-auto">
              <DropdownMenuLabel className="flex justify-between items-center">
                <span>Notifications</span>
                {unreadCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs">
                    Mark all as read
                  </Button>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {notifications.length === 0 ? (
                <div className="py-4 text-center text-muted-foreground">
                  No notifications
                </div>
              ) : (
                notifications.map((notification) => (
                  <DropdownMenuItem key={notification.id} className="flex flex-col items-start px-4 py-3 cursor-default" onClick={() => markAsRead(notification.id)}>
                    <div className="flex items-start justify-between w-full">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${notification.read ? 'bg-gray-300' : 'bg-primary'}`}></div>
                        <span className="font-medium">{notification.title}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatNotificationTime(notification.created_at || notification.createdAt || new Date().toISOString())}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 pl-4">{notification.message}</p>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          
          {isMobile ? (
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Menu size={18} />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[250px] sm:w-[300px]">
                <div className="flex flex-col gap-6 pt-6">
                  <Link to="/" className="flex items-center gap-2">
                    <div className="relative w-8 h-8 rounded-full bg-primary flex items-center justify-center overflow-hidden">
                      <div className="absolute w-5 h-5 bg-primary-foreground rounded-full" style={{ top: -2, right: -2 }}></div>
                    </div>
                    <span className="text-xl font-semibold tracking-tight">Wealth</span>
                  </Link>
                  
                  <div className="flex flex-col gap-4">
                    <Link to="/dashboard" className="flex items-center gap-3 px-2 py-2 text-sm font-medium rounded-md text-foreground/80 hover:bg-accent hover:text-primary transition-colors">
                      <Home size={18} />
                      <span>Dashboard</span>
                    </Link>
                    <Link to="/accounts" className="flex items-center gap-3 px-2 py-2 text-sm font-medium rounded-md text-foreground/80 hover:bg-accent hover:text-primary transition-colors">
                      <Wallet size={18} />
                      <span>Accounts</span>
                    </Link>
                    <Link to="/transactions" className="flex items-center gap-3 px-2 py-2 text-sm font-medium rounded-md text-foreground/80 hover:bg-accent hover:text-primary transition-colors">
                      <CreditCard size={18} />
                      <span>Transactions</span>
                    </Link>
                    <Link to="/budgets" className="flex items-center gap-3 px-2 py-2 text-sm font-medium rounded-md text-foreground/80 hover:bg-accent hover:text-primary transition-colors">
                      <PieChart size={18} />
                      <span>Budgets</span>
                    </Link>
                    <Link to="/payments" className="flex items-center gap-3 px-2 py-2 text-sm font-medium rounded-md text-foreground/80 hover:bg-accent hover:text-primary transition-colors">
                      <Clock size={18} />
                      <span>EMI & Payments</span>
                    </Link>
                    <Link to="/settings" className="flex items-center gap-3 px-2 py-2 text-sm font-medium rounded-md text-foreground/80 hover:bg-accent hover:text-primary transition-colors">
                      <Settings size={18} />
                      <span>Settings</span>
                    </Link>
                    <button 
                      onClick={handleSignOut}
                      className="flex items-center gap-3 px-2 py-2 text-sm font-medium rounded-md text-destructive hover:bg-accent transition-colors text-left"
                    >
                      <LogOut size={18} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.user_metadata?.avatar_url || "https://github.com/shadcn.png"} />
                    <AvatarFallback>{user?.user_metadata?.username?.[0]?.toUpperCase() || "U"}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{user?.user_metadata?.username || user?.email?.split("@")[0] || "User"}</span>
                  <ChevronDown size={16} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleProfileClick}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSettingsClick}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
