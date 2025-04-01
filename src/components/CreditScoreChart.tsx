
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CreditScoreChartProps {
  userId?: string | null;
  score?: number;
  maxScore?: number;
  className?: string;
}

const CreditScoreChart = ({
  userId,
  score: propScore,
  maxScore = 850,
  className
}: CreditScoreChartProps) => {
  const [score, setScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentHistory, setPaymentHistory] = useState("N/A");
  const [creditUtilization, setCreditUtilization] = useState("N/A");
  const [accountAge, setAccountAge] = useState("N/A");
  const { toast } = useToast();
  
  useEffect(() => {
    const fetchCreditScore = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('credit_scores')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
          
        if (error) throw error;
        
        if (data) {
          setScore(data.score);
          setPaymentHistory(data.payment_history || "Excellent");
          setCreditUtilization(data.credit_utilization || "Very Good");
          setAccountAge(data.account_age || "Good");
        } else {
          // If no data, use default or prop score
          setScore(propScore || null);
        }
      } catch (err) {
        console.error("Error fetching credit score:", err);
        toast({
          title: "Error",
          description: "Failed to fetch credit score data",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchCreditScore();
  }, [userId, propScore, toast]);
  
  const percentage = score ? (score / maxScore) * 100 : 0;
  
  const getCreditLabel = () => {
    if (!score) return "N/A";
    if (score >= 750) return "Excellent";
    if (score >= 700) return "Good";
    if (score >= 650) return "Fair";
    if (score >= 600) return "Poor";
    return "Very Poor";
  };
  
  const getCreditColor = () => {
    if (!score) return "text-muted-foreground";
    if (score >= 750) return "text-green-500";
    if (score >= 700) return "text-green-400";
    if (score >= 650) return "text-yellow-500";
    if (score >= 600) return "text-orange-500";
    return "text-red-500";
  };

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center py-6">
      <p className="text-muted-foreground text-center">No credit score data available</p>
      <button
        className="mt-4 text-sm text-primary"
        onClick={() => toast({
          title: "Feature coming soon",
          description: "Credit score tracking will be available in the next update.",
        })}
      >
        Set up credit monitoring
      </button>
    </div>
  );
  
  if (loading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-medium">Credit Score</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-10">
          <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full"></div>
        </CardContent>
      </Card>
    );
  }
  
  if (!score && !loading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-medium">Credit Score</CardTitle>
        </CardHeader>
        <CardContent>
          {renderEmptyState()}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-medium">Credit Score</CardTitle>
      </CardHeader>
      <CardContent>
        {score ? (
          <>
            <div className="flex justify-between items-center mb-2">
              <span className="text-3xl font-bold">{score}</span>
              <span className={`text-sm font-medium ${getCreditColor()}`}>
                {getCreditLabel()}
              </span>
            </div>
            
            <div className="space-y-3">
              <Progress 
                value={percentage} 
                className="h-2 credit-score-gradient" 
              />
              
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>300</span>
                <span>580</span>
                <span>670</span>
                <span>740</span>
                <span>850</span>
              </div>
            </div>
            
            <div className="mt-6 pt-6 border-t">
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Payment History</span>
                  <span className="text-sm font-medium">{paymentHistory}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Credit Utilization</span>
                  <span className="text-sm font-medium">{creditUtilization}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Account Age</span>
                  <span className="text-sm font-medium">{accountAge}</span>
                </div>
              </div>
            </div>
          </>
        ) : renderEmptyState()}
      </CardContent>
    </Card>
  );
};

export default CreditScoreChart;
