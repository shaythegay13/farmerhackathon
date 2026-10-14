import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { useSearchParams } from "react-router-dom";
import {
  RestaurantMenuItem,
  RestaurantIngredient,
  restaurantMenu,
  restaurantIngredients,
  farmerOffers,
  FarmerOffer,
} from "@/data/sampleData";
import { yieldlyApi, BidOffer, OptimizationResponse, Constraints } from "@/services/api";
import { CSVUploader } from "@/components/shared/CSVUploader";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FilterBar, FilterState } from "@/components/shared/FilterBar";
import { WhyPopover } from "@/components/shared/WhyPopover";
import { ExportButtons } from "@/components/shared/ExportButtons";
import { ComparisonDrawer } from "@/components/restaurant/ComparisonDrawer";
import { CheckoutCard } from "@/components/restaurant/CheckoutCard";
import { MarketIntelligence } from "@/components/restaurant/MarketIntelligence";
import { DollarSign } from "lucide-react";

interface DemandItem {
  sku: string;
  ingredient: string;
  totalKg: number;
  substitutable: boolean;
  requiresOrganic: boolean;
  safetyStock: number;
}

/** savings_vs_baseline is baseline cost minus plan cost. Negative means the plan costs more. */
function describePlanDelta(delta: number): { label: string; increased: boolean } {
  const amount = Math.abs(delta).toFixed(2);
  if (delta < -0.005) {
    return {
      label: `Cost increase vs baseline: $${amount}/week`,
      increased: true,
    };
  }
  if (delta > 0.005) {
    return {
      label: `Savings vs baseline: $${amount}/week`,
      increased: false,
    };
  }
  return { label: "No change vs baseline", increased: false };
}

export default function RestaurantPortal() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [menuItems, setMenuItems] = useState<RestaurantMenuItem[]>([]);
  const [ingredients, setIngredients] = useState<RestaurantIngredient[]>([]);
  const [demand, setDemand] = useState<DemandItem[]>([]);
  const [bids, setBids] = useState<BidOffer[]>([]);
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResponse | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    sort: "price-low",
    organicOnly: false,
    minExpiry: 0,
    maxLeadTime: 7,
    localRadius: 50,
  });
  const [acceptedPlan, setAcceptedPlan] = useState(false);
  const [selectedBids, setSelectedBids] = useState<string[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const [loading, setLoading] = useState(false);
  const [restaurantId] = useState(1); // Default restaurant ID

  // Check for loadSample parameter and auto-load sample data
  useEffect(() => {
    const loadSample = searchParams.get('loadSample');
    if (loadSample === 'true') {
      // Remove the parameter from URL
      setSearchParams({});
      // Load sample data
      loadSampleData();
    }
  }, [searchParams, setSearchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedOffers = useMemo(
    () => bids.filter((bid) => selectedBids.includes(bid.produce_sku + bid.farm_id)),
    [bids, selectedBids]
  );

  // Combine menu items and ingredients for CSV preview
  const combinedSampleData = useMemo(() => {
    if (menuItems.length === 0 || ingredients.length === 0) {
      return [];
    }
    
    // Create a combined dataset where each row represents an ingredient with its menu item info
    const combined: any[] = [];
    ingredients.forEach((ingredient) => {
      const menuItem = menuItems.find((mi) => mi.menu_item_id === ingredient.menu_item_id);
      if (menuItem) {
        combined.push({
          menu_item_id: menuItem.menu_item_id,
          menu_item_name: menuItem.menu_item_name,
          current_price: menuItem.current_price,
          target_food_cost_pct: menuItem.target_food_cost_pct,
          expected_weekly_orders: menuItem.expected_weekly_orders,
          produce_sku: ingredient.produce_sku,
          ingredient_name: ingredient.ingredient_name,
          recipe_qty_per_portion: ingredient.recipe_qty_per_portion,
          recipe_unit: ingredient.recipe_unit,
          yield_pct: ingredient.yield_pct,
          substitutable: ingredient.substitutable,
          requires_organic: ingredient.requires_organic,
        });
      }
    });
    return combined;
  }, [menuItems, ingredients]);

  const handleRestaurantDataUpload = async (data: any[]) => {
    try {
      // Call backend to process the unified CSV with intelligent mapping
      const response = await yieldlyApi.processRestaurantData(data);
      
      if (response.success && response.data) {
        setMenuItems(response.data.menu_items || []);
        setIngredients(response.data.ingredients || []);
        
        toast({
          title: "✅ Restaurant data processed!",
          description: `Loaded ${response.data.menu_items?.length || 0} menu items and ${response.data.ingredients?.length || 0} ingredients using intelligent column mapping.`,
        });
      } else {
        toast({
          title: "❌ Error processing data",
          description: typeof response.error === 'string' ? response.error : JSON.stringify(response.error) || "Failed to process restaurant data",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "❌ Error processing data",
        description: "Failed to connect to backend",
        variant: "destructive",
      });
    }
  };

  const loadSampleData = async () => {
    setLoading(true);
    try {
      // First load the sample data into the backend
      const backendResponse = await yieldlyApi.loadSampleData();
      if (!backendResponse.success) {
        toast({
          title: "❌ Error loading sample data",
          description: backendResponse.error || "Failed to load sample data",
          variant: "destructive",
        });
        return;
      }

      // Then fetch the actual CSV files from backend
      const [menuCsvResponse, ingredientsCsvResponse] = await Promise.all([
        yieldlyApi.getSampleCsv('restaurant_menu.csv'),
        yieldlyApi.getSampleCsv('restaurant_ingredients.csv')
      ]);

      if (menuCsvResponse.success && ingredientsCsvResponse.success) {
        // Parse the CSV files
        const menuCsvText = await menuCsvResponse.data!.text();
        const ingredientsCsvText = await ingredientsCsvResponse.data!.text();
        
        // Parse CSV data
        const menuData = parseCsvToJson(menuCsvText);
        const ingredientsData = parseCsvToJson(ingredientsCsvText);
        
        setMenuItems(menuData);
        setIngredients(ingredientsData);
        
        toast({
          title: "✅ Data uploaded!",
          description: `Loaded ${menuData.length} menu items and ${ingredientsData.length} ingredients.`,
        });
      } else {
        // Fallback to hardcoded data if CSV fetch fails
        setMenuItems(restaurantMenu);
        setIngredients(restaurantIngredients);
        toast({
          title: "✅ Data uploaded!",
          description: "Menu and ingredients ready to optimize. Click 'Calculate Demand' to start.",
        });
      }
    } catch (error) {
      // Fallback to hardcoded data
      setMenuItems(restaurantMenu);
      setIngredients(restaurantIngredients);
      toast({
        title: "✅ Data uploaded!",
        description: "Menu and ingredients ready to optimize. Click 'Calculate Demand' to start.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Helper function to parse CSV to JSON
  const parseCsvToJson = (csvText: string) => {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      const obj: any = {};
      headers.forEach((header, index) => {
        let value = values[index] || '';
        
        // Convert numeric fields
        if (['current_price', 'target_food_cost_pct', 'expected_weekly_orders', 'recipe_qty_per_portion', 'yield_pct'].includes(header)) {
          value = parseFloat(value) || 0;
        }
        
        // Convert boolean fields
        if (['substitutable', 'requires_organic'].includes(header)) {
          value = value.toLowerCase() === 'true';
        }
        
        obj[header] = value;
      });
      return obj;
    });
  };

  const calculateDemand = async () => {
    const response = await yieldlyApi.weeklyDemand(menuItems, ingredients, 0.05);
    if (!response.success || !response.data) {
      toast({
        title: "Could not calculate demand",
        description: response.error || "The API did not return demand for this menu.",
        variant: "destructive",
      });
      return;
    }

    const rows: DemandItem[] = response.data.demand.map((line) => ({
      sku: line.produce_sku,
      ingredient: line.ingredient_name,
      totalKg: line.total_kg,
      substitutable: line.substitutable,
      requiresOrganic: line.requires_organic,
      safetyStock: Math.round(line.safety_stock_pct * 100),
    }));
    setDemand(rows);
    fetchBids();
    toast({
      title: "✅ Demand calculated!",
      description: `${rows.length} ingredients from this menu, including 5% safety stock. Optimize uses the same rows.`,
    });
  };

  const fetchBids = async () => {
    setLoading(true);
    try {
      const response = await yieldlyApi.getBids(restaurantId, {
        radius_miles: filters.localRadius,
        min_expiry_days: filters.minExpiry,
        max_lead_days: filters.maxLeadTime,
        organic_only: filters.organicOnly,
      });

      if (response.success && response.data) {
        setBids(response.data.offers);
      } else {
        toast({
          title: "❌ Error fetching bids",
          description: typeof response.error === 'string' ? response.error : JSON.stringify(response.error) || "Failed to fetch available bids",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "❌ Error fetching bids",
        description: "Failed to connect to backend",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const optimizePlan = async () => {
    setLoading(true);
    try {
      const constraints: Constraints = {
        min_expiry_days: filters.minExpiry,
        max_lead_days: filters.maxLeadTime,
        organic_only: filters.organicOnly,
        local_only: false, // Could be based on filters.localRadius
      };

      const response = await yieldlyApi.optimizePlan(
        restaurantId,
        constraints,
        0.05,
        menuItems,
        ingredients
      );

      if (response.success && response.data) {
        setOptimizationResult(response.data);
        toast({
          title: "✅ Optimization complete!",
          description: describePlanDelta(response.data.savings_vs_baseline).label,
        });
      } else {
        toast({
          title: "❌ Error optimizing plan",
          description: typeof response.error === 'string' ? response.error : JSON.stringify(response.error) || "Failed to optimize purchase plan",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "❌ Error optimizing plan",
        description: "Failed to connect to backend",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateLandedCost = (offer: FarmerOffer) => {
    if (!offer || typeof offer.price_per_unit !== 'number' || typeof offer.unit_size !== 'number' || typeof offer.delivery_fee_flat !== 'number' || typeof offer.min_order_qty !== 'number') {
      return '0.00';
    }
    const allocatedQty = offer.min_order_qty * offer.unit_size;
    const deliveryCostPerKg = offer.delivery_fee_flat / allocatedQty;
    const unitCostPerKg = offer.price_per_unit / offer.unit_size;
    return (unitCostPerKg + deliveryCostPerKg).toFixed(2);
  };

  const getDaysUntilExpiry = (expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const handleExportPO = async () => {
    try {
      const response = await yieldlyApi.exportPurchaseOrder(restaurantId, 1);
      if (response.success && response.data) {
        const url = window.URL.createObjectURL(response.data);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'purchase_order.csv';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast({
          title: "Purchase Order exported!",
          description: "CSV file downloaded successfully",
        });
      } else {
        toast({
          title: "❌ Export failed",
          description: typeof response.error === 'string' ? response.error : JSON.stringify(response.error) || "Failed to export purchase order",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "❌ Export failed",
        description: "Failed to connect to backend",
        variant: "destructive",
      });
    }
  };

  const handleExportPriceChanges = async () => {
    try {
      const response = await yieldlyApi.exportPriceChanges(restaurantId, 1);
      if (response.success && response.data) {
        const url = window.URL.createObjectURL(response.data);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'price_changes.csv';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast({
          title: "Price changes exported!",
          description: "CSV file downloaded successfully",
        });
      } else {
        toast({
          title: "❌ Export failed",
          description: typeof response.error === 'string' ? response.error : JSON.stringify(response.error) || "Failed to export price changes",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "❌ Export failed",
        description: "Failed to connect to backend",
        variant: "destructive",
      });
    }
  };

  const acceptPurchasePlan = () => {
    setAcceptedPlan(true);
    const delta = optimizationResult
      ? describePlanDelta(optimizationResult.savings_vs_baseline).label
      : "No plan total is available.";
    toast({
      title: "✅ Purchase plan accepted!",
      description: `${delta}. Export your purchase order below.`,
    });
  };

  const toggleBidSelection = (bid: FarmerOffer) => {
    const id = bid.produce_sku + bid.farm_id;
    setSelectedBids((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-8 space-y-6 max-w-7xl">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Restaurant Portal
          </h1>
          <p className="text-muted-foreground text-lg">
            Optimize your menu costs with AI-powered procurement and market intelligence
          </p>
        </div>

        {/* Upload Section */}
        <div className="grid md:grid-cols-2 gap-6">
        <CSVUploader
          title="Restaurant Data CSV"
          description="Upload your complete restaurant data including menu items and ingredient breakdowns"
          expectedColumns={[
            "menu_item_id", "menu_item_name", "current_price", "target_food_cost_pct", "expected_weekly_orders",
            "produce_sku", "ingredient_name", "recipe_qty_per_portion", "recipe_unit", "yield_pct", "substitutable", "requires_organic"
          ]}
          onUpload={handleRestaurantDataUpload}
          onUseSampleData={loadSampleData}
          templateUrl="/templates/restaurant_data_template.csv"
          sampleData={combinedSampleData}
        />
      </div>

        {menuItems.length > 0 && ingredients.length > 0 && (
          <Card className="border-2 shadow-lg bg-gradient-to-r from-card to-card/95">
            <CardContent className="pt-6">
              <div className="flex gap-4 flex-wrap items-center">
                <div className="flex gap-2">
                  <Badge className="bg-green-100 text-green-800 px-4 py-2 border border-green-200 shadow-sm">
                    {menuItems.length} menu items
                  </Badge>
                  <Badge className="bg-blue-100 text-blue-800 px-4 py-2 border border-blue-200 shadow-sm">
                    {ingredients.length} ingredients
                  </Badge>
                </div>
                <div className="flex gap-2 ml-auto">
                  <Button 
                    onClick={calculateDemand} 
                    disabled={demand.length > 0 || loading}
                    className="gap-2 shadow-md"
                  >
                    {demand.length > 0 ? "✅ Demand Calculated" : "Calculate Weekly Demand"}
                  </Button>
                  {demand.length > 0 && (
                    <Button 
                      onClick={optimizePlan} 
                      disabled={loading || !!optimizationResult}
                      className="gap-2 bg-gradient-to-r from-primary to-primary/80 shadow-md"
                    >
                      {optimizationResult ? "✅ Plan Optimized" : "🤖 AI Optimize Plan"}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

      {/* Weekly Demand */}
      {demand.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>Ingredient Demand from Menu</CardTitle>
              <Badge variant="secondary">Calculated from menu × recipes × yields</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ingredient (SKU)</TableHead>
                    <TableHead>Total kg needed</TableHead>
                    <TableHead>Substitutable</TableHead>
                    <TableHead>Organic Required</TableHead>
                    <TableHead>Safety Stock %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {demand.map((item) => (
                    <TableRow key={item.sku}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.ingredient}</p>
                          <p className="text-xs text-muted-foreground font-mono">{item.sku}</p>
                        </div>
                      </TableCell>
                      <TableCell>{item.totalKg.toFixed(2)} kg</TableCell>
                      <TableCell>{item.substitutable ? "✅" : "❌"}</TableCell>
                      <TableCell>{item.requiresOrganic ? "✅" : "❌"}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.safetyStock}
                          className="w-20"
                          min={0}
                          max={50}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bids in Your Area */}
      {demand.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Bids in Your Area</CardTitle>
            <CardDescription>Available produce offers from nearby farms</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FilterBar filters={filters} onFiltersChange={setFilters} />

            {selectedBids.length > 0 && (
              <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg border border-primary/20">
                <p className="text-sm font-medium">
                  {selectedBids.length} item{selectedBids.length > 1 ? "s" : ""} selected
                </p>
                <Button size="sm" onClick={() => setShowComparison(true)}>
                  Compare Selected
                </Button>
              </div>
            )}

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Select</TableHead>
                    <TableHead>Farm</TableHead>
                    <TableHead>Ingredient (SKU)</TableHead>
                    <TableHead>Unit (size)</TableHead>
                    <TableHead>Price/Unit</TableHead>
                    <TableHead>Landed $/kg</TableHead>
                    <TableHead>Available</TableHead>
                    <TableHead>MOQ</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead>Lead</TableHead>
                    <TableHead>Organic</TableHead>
                    <TableHead>Why</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bids.map((bid, index) => {
                    const isSelected = selectedBids.includes(bid.produce_sku + bid.farm_id);
                    return (
                      <TableRow
                        key={index}
                        className={isSelected ? "bg-primary/5" : ""}
                      >
                        <TableCell>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleBidSelection(bid)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{bid.farm_name}</TableCell>
                        <TableCell>
                          <div>
                            <p>{bid.produce_name}</p>
                            <p className="text-xs text-muted-foreground font-mono">
                              {bid.produce_sku}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {bid.unit_size_kg}kg
                        </TableCell>
                        <TableCell>${bid.price_per_unit.toFixed(2)}</TableCell>
                        <TableCell className="font-semibold">
                          ${bid.landed_cost_per_kg.toFixed(2)}
                        </TableCell>
                        <TableCell>{bid.available_qty_kg.toFixed(1)}kg</TableCell>
                        <TableCell>{bid.min_order_qty_kg.toFixed(1)}kg</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              getDaysUntilExpiry(bid.expiry_date) < 3
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {getDaysUntilExpiry(bid.expiry_date)}d
                          </Badge>
                        </TableCell>
                        <TableCell>{bid.lead_time_days}d</TableCell>
                        <TableCell>{bid.organic ? "✅" : "❌"}</TableCell>
                        <TableCell>
                          <WhyPopover
                            reasons={[bid.why_feasible]}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Suggested Purchase Plan */}
      {optimizationResult && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <CardTitle>AI Suggested Purchase Plan</CardTitle>
              <Badge
                className={
                  describePlanDelta(optimizationResult.savings_vs_baseline).increased
                    ? "bg-destructive/15 text-destructive gap-2 px-3 py-1"
                    : "bg-success/20 text-success-foreground gap-2 px-3 py-1"
                }
              >
                <DollarSign className="h-3 w-3" />
                {describePlanDelta(optimizationResult.savings_vs_baseline).label}
              </Badge>
              <WhyPopover
                reasons={[optimizationResult.baseline_explanation]}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ingredient</TableHead>
                    <TableHead>Selected Farm</TableHead>
                    <TableHead>Qty (kg)</TableHead>
                    <TableHead>Landed $/kg</TableHead>
                    <TableHead>Total $</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Constraints</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {optimizationResult.purchase_plan.map((item, index) => (
                    <TableRow key={item.produce_sku} className={acceptedPlan ? "bg-success/5" : ""}>
                      <TableCell className="font-medium">{item.produce_sku}</TableCell>
                      <TableCell>{item.farm_name}</TableCell>
                      <TableCell>{item.qty_kg.toFixed(2)}</TableCell>
                      <TableCell>${item.landed_cost_per_kg.toFixed(2)}</TableCell>
                      <TableCell className="font-semibold">${item.total_cost.toFixed(2)}</TableCell>
                      <TableCell>
                        <WhyPopover
                          reasons={[item.reasons]}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          <Badge variant="secondary" className="text-xs">
                            AI Optimized ✅
                          </Badge>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex gap-2">
              <Button onClick={acceptPurchasePlan} disabled={acceptedPlan}>
                {acceptedPlan ? "✅ Plan Accepted" : "Accept Plan"}
              </Button>
              <Button variant="secondary">Reject & Customize</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Menu Price Nudges */}
      {acceptedPlan && (
        <Card>
          <CardHeader>
            <CardTitle>Keep Target Food Cost %</CardTitle>
            <CardDescription>Suggested menu price adjustments based on new ingredient costs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Menu Item</TableHead>
                    <TableHead>Current Price</TableHead>
                    <TableHead>Ingredient Cost/Portion</TableHead>
                    <TableHead>Food Cost % (current)</TableHead>
                    <TableHead>Target %</TableHead>
                    <TableHead>Suggested Price</TableHead>
                    <TableHead>Nudge</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {optimizationResult.menu_nudges.map((nudge) => (
                    <TableRow key={nudge.menu_item_id}>
                      <TableCell className="font-medium">{nudge.menu_item_name}</TableCell>
                      <TableCell>${nudge.current_price.toFixed(2)}</TableCell>
                      <TableCell>${nudge.ingredient_cost_per_portion.toFixed(2)}</TableCell>
                      <TableCell>{(nudge.current_food_cost_pct * 100).toFixed(1)}%</TableCell>
                      <TableCell>{(nudge.target_food_cost_pct * 100).toFixed(1)}%</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          ${nudge.suggested_price.toFixed(2)}
                          <WhyPopover
                            reasons={[nudge.why]}
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            nudge.nudge_delta > 0
                              ? "bg-success/20 text-success-foreground"
                              : "bg-destructive/20 text-destructive-foreground"
                          }
                        >
                          {nudge.nudge_delta > 0 ? "+" : ""}${nudge.nudge_delta.toFixed(2)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4">
              <ExportButtons onExportPriceChanges={handleExportPriceChanges} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Checkout */}
      {acceptedPlan && (
        <CheckoutCard
          items={optimizationResult?.purchase_plan?.map((item) => ({
            offer: {
              farm_id: item.farm_id,
              farm_name: item.farm_name,
              produce_sku: item.produce_sku,
              produce_name: item.produce_sku, // Use SKU as name for now
              organic: false, // We'd need to get this from the original offer
              unit: 'kg',
              unit_size: 1,
              price_per_unit: item.landed_cost_per_kg,
              available_qty: item.qty_kg,
              min_order_qty: 1,
              expiry_date: new Date().toISOString().split('T')[0],
              delivery_fee_flat: 0,
              lead_time_days: 1,
              origin_zip: '00000'
            },
            quantity: item.qty_kg,
          })) || []}
          calculateLandedCost={(offer) => offer.price_per_unit.toFixed(2)}
          onExportPO={handleExportPO}
          disabled={!acceptedPlan}
        />
      )}

      <ComparisonDrawer
        open={showComparison}
        onOpenChange={setShowComparison}
        selectedOffers={selectedOffers}
        calculateLandedCost={calculateLandedCost}
        getDaysUntilExpiry={getDaysUntilExpiry}
      />

        {/* Market Intelligence */}
        {menuItems.length > 0 && ingredients.length > 0 && (
          <MarketIntelligence 
            menuItems={menuItems} 
            ingredients={ingredients} 
          />
        )}
      </div>
    </div>
  );
}
