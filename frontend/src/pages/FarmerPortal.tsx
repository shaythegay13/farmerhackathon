import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { TrendingUp, Users, Package } from "lucide-react";
import { FarmerOffer, farmerOffers } from "@/data/sampleData";
import { yieldlyApi } from "@/services/api";
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
import { AutoBidRuleModal } from "@/components/farmer/AutoBidRuleModal";

export default function FarmerPortal() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [offers, setOffers] = useState<FarmerOffer[]>([]);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [deliveryRadius, setDeliveryRadius] = useState([15]);
  const [leadTime, setLeadTime] = useState([3]);
  const [autoSend, setAutoSend] = useState(true);
  const [preferOrganic, setPreferOrganic] = useState(false);
  const [restaurantsReached, setRestaurantsReached] = useState<number | null>(null);
  const [sendingBids, setSendingBids] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    sort: "price-low",
    organicOnly: false,
    minExpiry: 0,
    maxLeadTime: 7,
    localRadius: 50,
  });

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

  // Use offers as sample data for CSV preview
  const sampleData = useMemo(() => offers, [offers]);

  const handleFarmerDataUpload = async (data: any[]) => {
    try {
      // Call backend to process the CSV with intelligent mapping
      const response = await yieldlyApi.processFarmerData(data);
      
      if (response.success && response.data) {
        setOffers(response.data.offers || []);
        
        toast({
          title: "✅ Farmer data processed!",
          description: `Loaded ${response.data.offers?.length || 0} produce offers using intelligent column mapping.`,
        });
      } else {
        toast({
          title: "❌ Error processing data",
          description: typeof response.error === 'string' ? response.error : JSON.stringify(response.error) || "Failed to process farmer data",
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

      // Then fetch the actual farmer CSV file from backend
      const farmerCsvResponse = await yieldlyApi.getSampleCsv('farmer_offers.csv');

      if (farmerCsvResponse.success) {
        // Parse the CSV file
        const farmerCsvText = await farmerCsvResponse.data!.text();
        const farmerData = parseCsvToJson(farmerCsvText);
        
        setOffers(farmerData);
        
        toast({
          title: "✅ Data uploaded!",
          description: `Loaded ${farmerData.length} produce offers. Configure auto-bid settings below to start matching.`,
        });
      } else {
        // Fallback to hardcoded data if CSV fetch fails
        setOffers(farmerOffers);
        toast({
          title: "✅ Data uploaded!",
          description: "6 produce offers ready. Configure auto-bid settings below to start matching.",
        });
      }
    } catch (error) {
      // Fallback to hardcoded data
      setOffers(farmerOffers);
      toast({
        title: "✅ Data uploaded!",
        description: "6 produce offers ready. Configure auto-bid settings below to start matching.",
      });
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
        if (['unit_size', 'price_per_unit', 'available_qty', 'min_order_qty', 'delivery_fee_flat', 'lead_time_days'].includes(header)) {
          value = parseFloat(value) || 0;
        }
        
        // Convert boolean fields
        if (['organic'].includes(header)) {
          value = value.toLowerCase() === 'true';
        }
        
        obj[header] = value;
      });
      return obj;
    });
  };

  const sendBidsNow = async () => {
    const farmFromOffer = offers.find((offer) => offer.farm_id)?.farm_id;
    const farmId = farmFromOffer || "FARM001";
    setSendingBids(true);
    try {
      const response = await yieldlyApi.sendBidsNow(farmId, deliveryRadius[0]);
      if (response.success && response.data) {
        setRestaurantsReached(response.data.restaurants_reached);
        toast({
          title: "Nearby restaurants counted",
          description: response.data.message,
        });
      } else {
        toast({
          title: "Could not count restaurants",
          description: response.error || "The API did not accept this farm.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Could not count restaurants",
        description: "Failed to connect to backend",
        variant: "destructive",
      });
    } finally {
      setSendingBids(false);
    }
  };

  const largestOffer = useMemo(() => {
    if (offers.length === 0) return null;
    return offers.reduce((best, offer) =>
      (offer.available_qty || 0) > (best.available_qty || 0) ? offer : best
    );
  }, [offers]);

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
    const diff = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const getStatusBadge = (index: number) => {
    const statuses = ["sent", "viewed", "won", "lost"];
    const status = statuses[index % statuses.length];
    const variants: Record<string, any> = {
      sent: "secondary",
      viewed: "default",
      won: "default",
      lost: "destructive",
    };
    const colors: Record<string, string> = {
      sent: "bg-muted text-muted-foreground",
      viewed: "bg-blue-100 text-blue-800",
      won: "bg-success/20 text-success-foreground",
      lost: "bg-destructive/20 text-destructive-foreground",
    };

    return (
      <Badge className={colors[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-8 space-y-6 max-w-7xl">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Farmer Portal
          </h1>
          <p className="text-muted-foreground text-lg">
            List your produce offers and connect with local restaurants
          </p>
        </div>

        {/* Upload Section */}
        <CSVUploader
        title="Produce Offers CSV"
        description="Upload your produce offers with intelligent column mapping - any format works!"
        expectedColumns={[
          "farm_id", "farm_name", "produce_sku", "produce_name", "organic", "unit", "unit_size",
          "price_per_unit", "available_qty", "min_order_qty", "expiry_date", "origin_zip", "delivery_fee_flat", "lead_time_days"
        ]}
        onUpload={handleFarmerDataUpload}
        onUseSampleData={loadSampleData}
        templateUrl="/templates/farmer_offers_template.csv"
        sampleData={sampleData}
      />

      {/* Auto-Bid Settings */}
      {offers.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Auto-Bid Settings</CardTitle>
              <CardDescription>
                Radius is sent with the button below. Auto-send and organic preference are not saved.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Delivery Radius: {deliveryRadius[0]} miles</Label>
                <Slider
                  value={deliveryRadius}
                  onValueChange={setDeliveryRadius}
                  max={50}
                  step={5}
                />
              </div>

              <div className="space-y-2">
                <Label>Lead Time: {leadTime[0]} days</Label>
                <Slider
                  value={leadTime}
                  onValueChange={setLeadTime}
                  max={7}
                  step={1}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="auto-send">Auto-send bids to restaurants within radius</Label>
                <Switch id="auto-send" checked={autoSend} onCheckedChange={setAutoSend} />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="prefer-organic">Prefer organic matches</Label>
                <Switch
                  id="prefer-organic"
                  checked={preferOrganic}
                  onCheckedChange={setPreferOrganic}
                />
              </div>

              <p className="text-sm text-muted-foreground">
                Counts restaurants that share the farm ZIP prefix. It does not email or notify them.
              </p>

              <Button onClick={sendBidsNow} className="w-full sm:w-auto" disabled={sendingBids}>
                {sendingBids ? "Counting..." : "Send Bids Now"}
              </Button>
            </CardContent>
          </Card>

          {/* Active Bids */}
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Active Bids</CardTitle>
                  <CardDescription>
                    Offer rows are the loaded CSV. The status column is a demo label, not a saved outcome.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FilterBar filters={filters} onFiltersChange={setFilters} />

                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>SKU</TableHead>
                          <TableHead>Produce</TableHead>
                          <TableHead>Organic</TableHead>
                          <TableHead>Unit (size)</TableHead>
                          <TableHead>Price/Unit</TableHead>
                          <TableHead>Landed $/kg</TableHead>
                          <TableHead>Available</TableHead>
                          <TableHead>MOQ</TableHead>
                          <TableHead>Expiry</TableHead>
                          <TableHead>Lead</TableHead>
                          <TableHead>Status (demo)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {offers.map((offer, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-mono text-xs">{offer.produce_sku}</TableCell>
                            <TableCell>{offer.produce_name}</TableCell>
                            <TableCell>{offer.organic ? "✅" : "❌"}</TableCell>
                            <TableCell>
                              {offer.unit} ({offer.unit_size}kg)
                            </TableCell>
                            <TableCell>${offer.price_per_unit.toFixed(2)}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                ${calculateLandedCost(offer)}
                                <WhyPopover
                                  reasons={[
                                    `Landed cost = ($${offer.price_per_unit} / ${offer.unit_size}kg) + ($${offer.delivery_fee_flat} delivery / ${offer.min_order_qty * offer.unit_size}kg allocated)`,
                                  ]}
                                />
                              </div>
                            </TableCell>
                            <TableCell>{offer.available_qty}</TableCell>
                            <TableCell>{offer.min_order_qty}</TableCell>
                            <TableCell>
                              <Badge
                                variant={getDaysUntilExpiry(offer.expiry_date) < 3 ? "destructive" : "secondary"}
                              >
                                {getDaysUntilExpiry(offer.expiry_date)}d
                              </Badge>
                            </TableCell>
                            <TableCell>{offer.lead_time_days}d</TableCell>
                            <TableCell>{getStatusBadge(index)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Performance Panel */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Performance</CardTitle>
                  <CardDescription>Reached count comes from Send Bids Now. Acceptance is not tracked.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-lg bg-primary/10">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-semibold">{restaurantsReached === null ? "—" : restaurantsReached}</p>
                      <p className="text-xs text-muted-foreground">Restaurants reached (from API)</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-lg bg-success/10">
                      <TrendingUp className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <p className="text-2xl font-semibold">Demo</p>
                      <p className="text-xs text-muted-foreground">Acceptance rate is not tracked</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-lg bg-accent/10">
                      <Package className="h-5 w-5 text-accent-foreground" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold">{largestOffer?.produce_name || "—"}</p>
                      <p className="text-xs text-muted-foreground">Largest offer in this list</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowRuleModal(true)}
              >
                View Auto-Bid Rules
              </Button>
            </div>
          </div>
        </>
      )}

        <AutoBidRuleModal open={showRuleModal} onOpenChange={setShowRuleModal} />
      </div>
    </div>
  );
}
