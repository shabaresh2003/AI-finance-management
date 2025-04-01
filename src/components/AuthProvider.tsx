
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { User, Session } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: User | null;
  userId: string | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
  session: Session | null;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  userId: null,
  isLoading: true,
  signOut: async () => {},
  isAuthenticated: false,
  session: null,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // First set up the auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("Auth state change event:", event);
        setUser(session?.user || null);
        setSession(session);
        
        // Handle sign-in and sign-out events
        if (event === 'SIGNED_IN') {
          console.log("User signed in:", session?.user?.id);
          toast({
            title: "Welcome back!",
            description: `You've successfully signed in.`,
          });
          
          // Check for profile on signin
          setTimeout(() => {
            if (session?.user) {
              checkAndCreateProfile(session.user);
            }
          }, 0);
          
        } else if (event === 'SIGNED_OUT') {
          console.log("User signed out");
          toast({
            title: "Signed out",
            description: "You've been signed out successfully.",
          });
        } else if (event === 'USER_UPDATED') {
          console.log("User updated:", session?.user?.id);
          toast({
            title: "Profile updated",
            description: "Your profile has been updated successfully.",
          });
        } else if (event === 'PASSWORD_RECOVERY') {
          navigate('/auth/reset-password');
          toast({
            title: "Password recovery",
            description: "Please check your email for password reset instructions.",
          });
        }
      }
    );

    // Then check for an existing session
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log("Initial session check:", session ? "Session found" : "No session");
        setUser(session?.user || null);
        setSession(session);
        
        // Check for profile on initial load
        if (session?.user) {
          checkAndCreateProfile(session.user);
        }
      } catch (error) {
        console.error("Error fetching session:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    return () => {
      subscription.unsubscribe();
    };
  }, [toast, navigate]);

  // Helper function to check and create profile if needed
  const checkAndCreateProfile = async (user: User) => {
    try {
      console.log("Checking profile for user:", user.id);
      
      // Check if profile exists
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();
        
      if (profileError && profileError.code === 'PGRST116') {
        console.log("No profile found, creating one...");
        
        // Profile doesn't exist, create it
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            username: user.user_metadata?.username || user.email?.split('@')[0],
            avatar_url: user.user_metadata?.avatar_url || null,
            currency: 'INR',
            report_frequency: 'monthly'
          });
          
        if (insertError) {
          console.error("Error creating profile:", insertError);
        } else {
          console.log("Created new profile for user:", user.id);
        }
      } else if (profileError) {
        console.error("Error checking for profile:", profileError);
      } else {
        console.log("Existing profile found:", profileData);
      }
    } catch (error) {
      console.error("Error in profile check/creation:", error);
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/");
    } catch (error) {
      console.error("Error signing out:", error);
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      userId: user?.id || null,
      isLoading, 
      signOut,
      isAuthenticated: !!user,
      session
    }}>
      {children}
    </AuthContext.Provider>
  );
};
