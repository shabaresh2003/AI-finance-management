
import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import ProfileAvatar from "./ProfileAvatar";

interface ProfileData {
  username: string;
  avatar_url: string | null;
  currency: string;
  report_frequency: "daily" | "weekly" | "monthly";
}

interface ProfileDetailsFormProps {
  isEditing: boolean;
  setIsEditing: (value: boolean) => void;
  setLoading: (value: boolean) => void;
  user: User | null;
}

const ProfileDetailsForm = ({ isEditing, setIsEditing, setLoading, user }: ProfileDetailsFormProps) => {
  const [profile, setProfile] = useState<ProfileData>({
    username: "",
    avatar_url: null,
    currency: "INR",
    report_frequency: "monthly"
  });
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        if (!user) return;

        console.log("Fetching profile data for user:", user.id);

        // First check if a profile exists
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (profileError && profileError.code !== 'PGRST116') {
          throw profileError;
        }

        console.log("Profile data from DB:", profileData);

        // Get the user metadata
        const { data: userData, error: userError } = await supabase.auth.getUser();
        
        if (userError) throw userError;
        
        console.log("User data from Auth:", userData);

        // Merge data from auth and profiles table
        setProfile({
          username: profileData?.username || userData.user?.user_metadata?.username || user.email?.split('@')[0] || "",
          avatar_url: profileData?.avatar_url || userData.user?.user_metadata?.avatar_url || null,
          currency: profileData?.currency || "INR",
          report_frequency: profileData?.report_frequency || "monthly",
        });
        
      } catch (error) {
        console.error("Error fetching user profile:", error);
        toast({
          title: "Error",
          description: "Failed to load profile data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user, setLoading, toast]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (!user) return;
      
      console.log("Saving profile data:", profile);
      
      // First update auth metadata
      const { error: metadataError } = await supabase.auth.updateUser({
        data: {
          username: profile.username,
          avatar_url: profile.avatar_url,
        }
      });
      
      if (metadataError) {
        console.error("Error updating auth metadata:", metadataError);
        throw metadataError;
      }
      
      // Then update or insert profile data
      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          username: profile.username,
          avatar_url: profile.avatar_url,
          currency: profile.currency,
          report_frequency: profile.report_frequency
        });
      
      if (upsertError) {
        console.error("Error upserting profile:", upsertError);
        throw upsertError;
      }
      
      console.log("Profile updated successfully");
      
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated",
      });
      setIsEditing(false);
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast({
        title: "Update failed",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpdate = (url: string) => {
    setProfile(prev => ({
      ...prev,
      avatar_url: url
    }));
  };

  if (!user) {
    return null;
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <ProfileAvatar
          avatarUrl={profile.avatar_url}
          username={profile.username}
          userId={user.id}
          isEditing={isEditing}
          onAvatarUpdate={handleAvatarUpdate}
        />
        
        <div className="flex-1 space-y-4">
          <div>
            <Label htmlFor="username">Username</Label>
            {isEditing ? (
              <Input
                id="username"
                value={profile.username}
                onChange={(e) => setProfile(prev => ({ ...prev, username: e.target.value }))}
                className="mt-1"
              />
            ) : (
              <p className="text-lg">{profile.username}</p>
            )}
          </div>
          
          <div>
            <Label htmlFor="email">Email</Label>
            <p className="text-lg">{user?.email || "No email found"}</p>
          </div>
        </div>
      </div>
      
      <Separator className="my-6" />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="currency">Preferred Currency</Label>
          {isEditing ? (
            <Select
              value={profile.currency}
              onValueChange={(value) => setProfile(prev => ({ ...prev, currency: value }))}
            >
              <SelectTrigger id="currency" className="mt-1">
                <SelectValue placeholder="Select a currency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INR">Indian Rupee (₹)</SelectItem>
                <SelectItem value="USD">US Dollar ($)</SelectItem>
                <SelectItem value="EUR">Euro (€)</SelectItem>
                <SelectItem value="GBP">British Pound (£)</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <p className="text-lg">
              {profile.currency === "INR" ? "Indian Rupee (₹)" : 
               profile.currency === "USD" ? "US Dollar ($)" :
               profile.currency === "EUR" ? "Euro (€)" :
               profile.currency === "GBP" ? "British Pound (£)" : profile.currency}
            </p>
          )}
        </div>
        
        <div>
          <Label htmlFor="reportFrequency">Report Frequency</Label>
          {isEditing ? (
            <Select
              value={profile.report_frequency}
              onValueChange={(value: "daily" | "weekly" | "monthly") => 
                setProfile(prev => ({ ...prev, report_frequency: value }))
              }
            >
              <SelectTrigger id="reportFrequency" className="mt-1">
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <p className="text-lg">
              {profile.report_frequency.charAt(0).toUpperCase() + profile.report_frequency.slice(1)}
            </p>
          )}
        </div>
      </div>
      
      {isEditing && (
        <div className="flex justify-end gap-2 mt-6">
          <Button
            variant="outline"
            onClick={() => setIsEditing(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      )}
    </>
  );
};

export default ProfileDetailsForm;
