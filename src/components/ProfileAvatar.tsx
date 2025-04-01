
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Save, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ProfileAvatarProps {
  avatarUrl: string | null;
  username: string;
  userId: string;
  isEditing: boolean;
  onAvatarUpdate: (url: string) => void;
}

const ProfileAvatar = ({ avatarUrl, username, userId, isEditing, onAvatarUpdate }: ProfileAvatarProps) => {
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const { toast } = useToast();

  const handleAvatarUpload = async () => {
    if (!avatarFile || !userId) return;
    
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
      const filePath = `${userId}-${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, avatarFile);
        
      if (uploadError) throw uploadError;
      
      // Get the public URL
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);
        
      const newAvatarUrl = urlData.publicUrl;
      
      // Update local state via callback
      onAvatarUpdate(newAvatarUrl);
      
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

  const avatarFallback = username ? username[0].toUpperCase() : "U";

  return (
    <div className="relative">
      <Avatar className="h-24 w-24">
        <AvatarImage src={avatarUrl || ""} alt="Profile" />
        <AvatarFallback className="text-2xl">
          {avatarFallback}
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
  );
};

export default ProfileAvatar;
