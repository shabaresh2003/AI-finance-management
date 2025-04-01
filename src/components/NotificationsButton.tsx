
import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
}

const NotificationsButton = () => {
  const { userId } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  // Fetch notifications
  useEffect(() => {
    if (!userId) return;
    
    const fetchNotifications = async () => {
      try {
        console.log("Fetching notifications for user:", userId);
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(20);
          
        if (error) throw error;
        
        if (data) {
          console.log("Fetched notifications:", data);
          setNotifications(data as Notification[]);
          setUnreadCount(data.filter(n => !n.read).length);
        }
      } catch (err) {
        console.error("Error fetching notifications:", err);
        toast({
          title: "Error",
          description: "Failed to load notifications",
          variant: "destructive",
        });
      }
    };
    
    fetchNotifications();
    
    // Set up a subscription to listen for new notifications
    const channel = supabase
      .channel('public:notifications')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications',
          filter: `user_id=eq.${userId}` 
        }, 
        (payload) => {
          console.log("New notification received:", payload);
          setNotifications(prev => [payload.new as Notification, ...prev]);
          setUnreadCount(prevCount => prevCount + 1);
          
          // Show a toast for new notifications
          toast({
            title: payload.new.title,
            description: payload.new.message,
          });
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, toast]);
  
  // Mark notifications as read when opening the popover
  const handleOpenChange = async (open: boolean) => {
    setIsOpen(open);
    
    if (open && unreadCount > 0 && userId) {
      try {
        const unreadIds = notifications
          .filter(n => !n.read)
          .map(n => n.id);
          
        if (unreadIds.length === 0) return;
        
        // Mark all as read in the database
        const { error } = await supabase
          .from('notifications')
          .update({ read: true })
          .in('id', unreadIds);
          
        if (error) throw error;
        
        // Update local state
        setNotifications(prev => 
          prev.map(n => unreadIds.includes(n.id) ? { ...n, read: true } : n)
        );
        setUnreadCount(0);
      } catch (err) {
        console.error("Error marking notifications as read:", err);
        toast({
          title: "Error",
          description: "Failed to mark notifications as read",
          variant: "destructive",
        });
      }
    }
  };
  
  // Get color based on notification type
  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'error': return 'text-red-500';
      case 'warning': return 'text-amber-500';
      case 'success': return 'text-green-500';
      case 'budget': return 'text-blue-500';
      default: return 'text-primary';
    }
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 px-1 min-w-[18px] h-[18px] flex items-center justify-center text-[10px]"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="px-4 py-3 border-b">
          <h4 className="text-sm font-medium">Notifications</h4>
        </div>
        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            <div>
              {notifications.map((notification, index) => (
                <div key={notification.id}>
                  <div className={`px-4 py-3 ${!notification.read ? 'bg-muted/50' : ''}`}>
                    <div className="flex justify-between items-start">
                      <h5 className={`text-sm font-medium ${getNotificationColor(notification.type)}`}>
                        {notification.title}
                      </h5>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(notification.created_at)}
                      </span>
                    </div>
                    <p className="text-sm mt-1">{notification.message}</p>
                  </div>
                  {index < notifications.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationsButton;
