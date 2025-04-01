
import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const Settings = () => {
  const { user, userId } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    username: "",
    email: "",
    avatarUrl: "",
    currency: "INR",
    reportFrequency: "monthly", // Default to monthly reports
  });
  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    budgetNotifications: true,
    weeklyReports: true,
    newFeatures: false,
  });

  // Fetch user profile data
  useEffect(() => {
    const fetchProfileData = async () => {
      if (!userId) return;
      
      try {
        setIsLoading(true);
        
        // Fetch profile from profiles table
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
          
        if (error) throw error;
        
        if (data) {
          setProfileData({
            username: data.username || user?.user_metadata?.username || "",
            email: user?.email || "",
            avatarUrl: data.avatar_url || user?.user_metadata?.avatar_url || "",
            currency: data.currency || "INR",
            reportFrequency: data.report_frequency || "monthly",
          });
        } else {
          // If no profile exists, use auth user data
          setProfileData({
            username: user?.user_metadata?.username || user?.email?.split("@")[0] || "",
            email: user?.email || "",
            avatarUrl: user?.user_metadata?.avatar_url || "",
            currency: "INR",
            reportFrequency: "monthly",
          });
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
        toast({
          title: "Error",
          description: "Failed to fetch profile data",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProfileData();
  }, [userId, user, toast]);

  const handleSaveProfile = async () => {
    if (!userId) return;
    
    try {
      setIsLoading(true);
      
      // Update profile in profiles table
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          username: profileData.username,
          avatar_url: profileData.avatarUrl,
          currency: profileData.currency,
          report_frequency: profileData.reportFrequency,
        });
        
      if (error) throw error;
      
      toast({
        title: "Profile Updated",
        description: "Your profile settings have been saved successfully",
      });
    } catch (err) {
      console.error("Error updating profile:", err);
      toast({
        title: "Error",
        description: "Failed to update profile settings",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveNotifications = () => {
    toast({
      title: "Notification Settings Saved",
      description: "Your notification preferences have been updated",
    });
  };

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
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 opacity-0 animate-on-mount">
          <div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground mt-1">
              Manage your account settings and preferences
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="md:col-span-1 space-y-4 opacity-0 animate-on-mount animation-delay-100">
            <Card>
              <CardHeader>
                <CardTitle>Navigation</CardTitle>
              </CardHeader>
              <CardContent>
                <nav className="space-y-2">
                  <Button variant="ghost" className="w-full justify-start">
                    Account
                  </Button>
                  <Button variant="ghost" className="w-full justify-start">
                    Notifications
                  </Button>
                  <Button variant="ghost" className="w-full justify-start">
                    Security
                  </Button>
                  <Button variant="ghost" className="w-full justify-start">
                    Appearance
                  </Button>
                </nav>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Profile</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center text-center">
                <Avatar className="h-24 w-24 mb-4">
                  <AvatarImage src={profileData.avatarUrl || "https://github.com/shadcn.png"} />
                  <AvatarFallback>{profileData.username?.[0]?.toUpperCase() || "U"}</AvatarFallback>
                </Avatar>
                <h3 className="text-lg font-medium">{profileData.username}</h3>
                <p className="text-sm text-muted-foreground">{profileData.email}</p>
              </CardContent>
            </Card>
          </div>
          
          <div className="md:col-span-2 space-y-6 opacity-0 animate-on-mount animation-delay-200">
            <Card>
              <CardHeader>
                <CardTitle>Account Settings</CardTitle>
                <CardDescription>
                  Update your account information and preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input 
                    id="username" 
                    value={profileData.username} 
                    onChange={(e) => setProfileData({...profileData, username: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" value={profileData.email} disabled />
                  <p className="text-xs text-muted-foreground">
                    Email changes must be verified. Please contact support.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="avatar">Avatar URL</Label>
                  <Input 
                    id="avatar" 
                    value={profileData.avatarUrl} 
                    onChange={(e) => setProfileData({...profileData, avatarUrl: e.target.value})}
                    placeholder="https://example.com/avatar.jpg"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select 
                    value={profileData.currency} 
                    onValueChange={(value) => setProfileData({...profileData, currency: value})}
                  >
                    <SelectTrigger id="currency">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INR">Indian Rupee (₹)</SelectItem>
                      <SelectItem value="USD">US Dollar ($)</SelectItem>
                      <SelectItem value="EUR">Euro (€)</SelectItem>
                      <SelectItem value="GBP">British Pound (£)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reportFrequency">Financial Report Frequency</Label>
                  <RadioGroup 
                    value={profileData.reportFrequency} 
                    onValueChange={(value) => setProfileData({...profileData, reportFrequency: value})}
                    className="mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="weekly" id="weekly" />
                      <Label htmlFor="weekly" className="cursor-pointer">Weekly</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="monthly" id="monthly" />
                      <Label htmlFor="monthly" className="cursor-pointer">Monthly</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="quarterly" id="quarterly" />
                      <Label htmlFor="quarterly" className="cursor-pointer">Quarterly</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="half-yearly" id="half-yearly" />
                      <Label htmlFor="half-yearly" className="cursor-pointer">Half-Yearly</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yearly" id="yearly" />
                      <Label htmlFor="yearly" className="cursor-pointer">Yearly</Label>
                    </div>
                  </RadioGroup>
                  <p className="text-xs text-muted-foreground mt-1">
                    You will receive financial reports based on your selected frequency
                  </p>
                </div>
                
                <Button onClick={handleSaveProfile} disabled={isLoading}>
                  {isLoading ? "Saving..." : "Save Changes"}
                </Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>
                  Manage how and when you receive notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Email Alerts</p>
                    <p className="text-sm text-muted-foreground">
                      Receive email notifications for important updates
                    </p>
                  </div>
                  <Switch 
                    checked={notifications.emailAlerts}
                    onCheckedChange={(checked) => setNotifications({...notifications, emailAlerts: checked})}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Budget Notifications</p>
                    <p className="text-sm text-muted-foreground">
                      Get notified when you approach or exceed budget limits
                    </p>
                  </div>
                  <Switch 
                    checked={notifications.budgetNotifications}
                    onCheckedChange={(checked) => setNotifications({...notifications, budgetNotifications: checked})}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Weekly Reports</p>
                    <p className="text-sm text-muted-foreground">
                      Receive a weekly summary of your financial activity
                    </p>
                  </div>
                  <Switch 
                    checked={notifications.weeklyReports}
                    onCheckedChange={(checked) => setNotifications({...notifications, weeklyReports: checked})}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">New Features & Updates</p>
                    <p className="text-sm text-muted-foreground">
                      Get notified about new app features and improvements
                    </p>
                  </div>
                  <Switch 
                    checked={notifications.newFeatures}
                    onCheckedChange={(checked) => setNotifications({...notifications, newFeatures: checked})}
                  />
                </div>
                
                <Button onClick={handleSaveNotifications}>
                  Save Notification Settings
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <footer className="container mx-auto px-4 py-6 mt-8 border-t text-center text-muted-foreground">
        <p>© 2025 Wealth Finance App. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Settings;
