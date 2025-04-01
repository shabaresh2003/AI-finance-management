
import { Button } from "@/components/ui/button";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Pencil } from "lucide-react";

interface ProfileHeaderProps {
  isEditing: boolean;
  setIsEditing: (value: boolean) => void;
  loading: boolean;
}

const ProfileHeader = ({ isEditing, setIsEditing, loading }: ProfileHeaderProps) => {
  return (
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
  );
};

export default ProfileHeader;
