
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, UserMetadata } from "@supabase/supabase-js";
import { Pencil, Loader2, Save, Upload } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/AuthProvider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";

type ProfileData = {
  username: string;
  avatar_url: string | null;
  currency: string;
  report_frequency: "daily" | "weekly" | "monthly";
};

const Profile = () => {
  const { user, isAuthenticated } = useAuth();
  const [profile, setProfile] = useState<ProfileData>({
    username: "",
    avatar_url: null,
    currency: "INR",
    report_frequency: "monthly"
  });
  const [loading, setLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/auth");
      return;
    }

    const fetchProfile = async () => {
      setLoading(true);
      try {
        if (!user) return;

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
  }, [user, isAuthenticated, navigate, toast]);

  const handleSave = async () => {
    setLoading(true);
    try {
      if (!user) return;
      
      // First update auth metadata
      const { error: metadataError } = await supabase.auth.updateUser({
        data: {
          username: profile.username,
          avatar_url: profile.avatar_url,
        }
      });
      
      if (metadataError) throw metadataError;
      
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
      
      if (upsertError) throw upsertError;
      
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
      setLoading(false);
    }
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile || !user) return;
    
    setUploadingAvatar(true);
    try {
      // Check if storage bucket exists, if not create it
      const { data: buckets } = await supabase.storage.listBuckets();
      const bucketName = 'avatars';
      const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
      
      if (!bucketExists) {
        await supabase.storage.createBucket(bucketName, {
          public: true,
        });
      }
      
      // Upload the file
      const fileExt = avatarFile.name.split('.').pop();
      const filePath = `${user.id}-${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, avatarFile);
        
      if (uploadError) throw uploadError;
      
      // Get the public URL
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);
        
      const avatarUrl = urlData.publicUrl;
      
      // Update the profile
      setProfile(prev => ({
        ...prev,
        avatar_url: avatarUrl
      }));
      
      toast({
        title: "Avatar uploaded",
        description: "Your profile picture has been uploaded",
      });
      
    } catch (error: any) {
      console.error("Error uploading avatar:", error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload profile picture",
        variant: "destructive",
      });
    } finally {
      setUploadingAvatar(false);
      setAvatarFile(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAvatarFile(e.target.files[0]);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container max-w-3xl px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Your Profile</h1>
        
        <Card className="mb-8">
          <CardHeader className="relative">
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Manage your personal details</CardDescription>
            {!loading && !isEditing && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4"
                onClick={() => setIsEditing(true)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div className="relative">
                    <Avatar className="h-24 w-24">
                      <AvatarImage src={profile.avatar_url || ""} alt="Profile" />
                      <AvatarFallback className="text-2xl">
                        {profile.username ? profile.username[0].toUpperCase() : "U"}
                      </AvatarFallback>
                    </Avatar>
                    
                    {isEditing && (
                      <div className="mt-3">
                        <input
                          type="file"
                          id="avatar-upload"
                          className="hidden"
                          accept="image/*"
                          onChange={handleFileChange}
                        />
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => document.getElementById("avatar-upload")?.click()}
                            disabled={uploadingAvatar}
                          >
                            <Upload className="h-4 w-4 mr-1" />
                            Select
                          </Button>
                          
                          {avatarFile && (
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={handleAvatarUpload}
                              disabled={uploadingAvatar}
                            >
                              {uploadingAvatar ? (
                                <>
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                  Uploading...
                                </>
                              ) : (
                                <>
                                  <Save className="h-3 w-3 mr-1" />
                                  Upload
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                        {avatarFile && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {avatarFile.name}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  
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
              </>
            )}
          </CardContent>
          
          {isEditing && (
            <CardFooter className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsEditing(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </CardFooter>
          )}
        </Card>
      </main>
    </div>
  );
};

export default Profile;
