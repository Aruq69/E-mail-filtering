import { Card, CardContent } from "@/components/ui/card";
import { InfoIcon } from "lucide-react";

interface InfoCardProps {
  children: React.ReactNode;
  className?: string;
}

export function InfoCard({ children, className = "" }: InfoCardProps) {
  return (
    <Card className={`bg-blue-50 border-blue-200 ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          <InfoIcon className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            {children}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}