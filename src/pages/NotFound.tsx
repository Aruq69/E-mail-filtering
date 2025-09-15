import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Shield, Flame } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-6">
        {/* Flaming Shield Icon */}
        <div className="flex justify-center">
          <div className="relative">
            {/* Flame Effects Behind Shield */}
            <div className="absolute inset-0 flex items-center justify-center">
              <Flame className="h-20 w-20 text-orange-500/30 animate-pulse [animation-duration:2s]" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center rotate-12">
              <Flame className="h-18 w-18 text-red-500/20 animate-pulse [animation-duration:2.5s] [animation-delay:0.5s]" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center -rotate-12">
              <Flame className="h-16 w-16 text-yellow-500/25 animate-pulse [animation-duration:1.8s] [animation-delay:1s]" />
            </div>
            
            {/* Main Shield */}
            <div className="relative z-10">
              <Shield className="h-16 w-16 text-primary" />
            </div>
          </div>
        </div>
        
        <div>
          <h1 className="mb-4 text-4xl font-bold text-foreground">404</h1>
          <p className="mb-4 text-xl text-muted-foreground">Oops! Page not found</p>
          <Link to="/" className="text-primary underline hover:text-primary/80">
            Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
