
import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string;
  icon: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  trendText?: string;
}

const StatCard = ({
  title,
  value,
  icon,
  trend,
  className,
  trendText
}: StatCardProps) => {
  // Convert dollar values to rupees
  const formattedValue = value.startsWith('$') 
    ? `₹${(parseFloat(value.replace('$', '').replace(/,/g, '')) * 83.5).toLocaleString('en-IN')}`
    : value;

  return (
    <Card className={cn("overflow-hidden card-transition", className)}>
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
            <h3 className="text-2xl font-bold">{formattedValue}</h3>
            
            {trend && (
              <div className="flex items-center mt-2">
                <span
                  className={cn(
                    "text-xs font-medium flex items-center",
                    trend.isPositive ? "text-green-500" : "text-red-500"
                  )}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className={cn(
                      "w-3 h-3 mr-1",
                      trend.isPositive ? "" : "transform rotate-180"
                    )}
                  >
                    <path
                      fillRule="evenodd"
                      d="M12 7a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L12 10.586V7z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {trend.value}%
                </span>
                {trendText && (
                  <span className="text-xs text-muted-foreground ml-1">
                    {trendText}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="p-2 rounded-full bg-primary/10 text-primary">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StatCard;
