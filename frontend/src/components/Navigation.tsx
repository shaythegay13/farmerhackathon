import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { HelpCircle, Menu, X, Sparkles, Truck, UtensilsCrossed } from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "@/hooks/use-toast";
import { yieldlyApi } from "@/services/api";
import logo from "@/assets/logo.png";

export function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const useSampleData = async () => {
    setLoading(true);
    try {
      // Load sample data into backend
      const response = await yieldlyApi.loadSampleData();
      if (response.success) {
        // Navigate to restaurant portal (default) and trigger sample data loading
        navigate("/restaurant?loadSample=true");
        
        toast({
          title: "✅ Sample data loaded!",
          description: "Sample data loaded and navigating to Restaurant Portal.",
        });
      } else {
        toast({
          title: "❌ Error loading sample data",
          description: response.error || "Failed to load sample data",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "❌ Error loading sample data",
        description: "Failed to connect to backend",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-lg shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative">
              <img 
                src={logo} 
                alt="Yieldly Logo" 
                className="w-10 h-10 transition-all group-hover:scale-110 group-hover:rotate-3"
              />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-background animate-pulse"></div>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Yieldly
              </span>
              <span className="text-xs text-muted-foreground -mt-1">Local Food Sourcing</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2 bg-muted/30 rounded-full p-1 shadow-inner border border-border/50">
            <Link to="/farmer">
              <Button
                variant={isActive("/farmer") ? "default" : "ghost"}
                className={`rounded-full transition-all duration-200 flex items-center gap-2 ${
                  isActive("/farmer") ? "shadow-md" : "hover:bg-primary/10 hover:text-primary"
                }`}
                size="sm"
              >
                <Truck className="h-4 w-4" />
                Farmer Portal
              </Button>
            </Link>
            <Link to="/restaurant">
              <Button
                variant={isActive("/restaurant") ? "default" : "ghost"}
                className={`rounded-full transition-all duration-200 flex items-center gap-2 ${
                  isActive("/restaurant") ? "shadow-md" : "hover:bg-primary/10 hover:text-primary"
                }`}
                size="sm"
              >
                <UtensilsCrossed className="h-4 w-4" />
                Restaurant Portal
              </Button>
            </Link>
          </div>

          {/* Desktop Right Actions */}
          <div className="hidden md:flex items-center gap-3">
            <Button 
              onClick={useSampleData} 
              size="sm" 
              className="rounded-full gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md"
              disabled={loading}
            >
              <Sparkles className="h-4 w-4" />
              {loading ? "Loading..." : "Sample Data"}
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-muted">
              <HelpCircle className="h-5 w-5" />
            </Button>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-semibold text-sm shadow-md hover:shadow-lg transition-shadow cursor-pointer">
              JD
            </div>
          </div>

          {/* Mobile Menu */}
          <div className="md:hidden">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  {mobileMenuOpen ? <X /> : <Menu />}
                </Button>
              </SheetTrigger>
              <SheetContent className="w-[280px] rounded-l-2xl">
                <div className="flex flex-col gap-3 mt-8">
                  <Link to="/farmer" onClick={() => setMobileMenuOpen(false)}>
                    <Button
                      variant={isActive("/farmer") ? "default" : "outline"}
                      className="w-full justify-start rounded-full gap-2"
                    >
                      <Truck className="h-4 w-4" />
                      Farmer Portal
                    </Button>
                  </Link>
                  <Link to="/restaurant" onClick={() => setMobileMenuOpen(false)}>
                    <Button
                      variant={isActive("/restaurant") ? "default" : "outline"}
                      className="w-full justify-start rounded-full gap-2"
                    >
                      <UtensilsCrossed className="h-4 w-4" />
                      Restaurant Portal
                    </Button>
                  </Link>
                  <Button 
                    onClick={useSampleData} 
                    className="w-full rounded-full gap-2 bg-gradient-to-r from-primary to-primary/80"
                    disabled={loading}
                  >
                    <Sparkles className="h-4 w-4" />
                    {loading ? "Loading..." : "Sample Data"}
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}
