import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { FarmerOffer } from "@/data/sampleData";
import { CheckCircle } from "lucide-react";

interface ComparisonDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedOffers: FarmerOffer[];
  calculateLandedCost: (offer: FarmerOffer) => string;
  getDaysUntilExpiry: (date: string) => number;
}

export function ComparisonDrawer({
  open,
  onOpenChange,
  selectedOffers,
  calculateLandedCost,
  getDaysUntilExpiry,
}: ComparisonDrawerProps) {
  if (selectedOffers.length === 0) return null;

  const bestPrice = Math.min(...selectedOffers.map((o) => parseFloat(calculateLandedCost(o))));
  const bestExpiry = Math.max(...selectedOffers.map((o) => getDaysUntilExpiry(o.expiry_date)));
  const bestLead = Math.min(...selectedOffers.map((o) => o.lead_time_days));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[600px] overflow-y-auto bg-card">
        <SheetHeader>
          <SheetTitle>Compare Selected Offers</SheetTitle>
          <SheetDescription>
            Side-by-side comparison of {selectedOffers.length} selected offers
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {selectedOffers.map((offer, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{offer.farm_name}</h3>
                  <p className="text-sm text-muted-foreground">{offer.produce_name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{offer.produce_sku}</p>
                </div>
                {offer.organic && (
                  <Badge variant="secondary" className="bg-success/20 text-success-foreground">
                    Organic
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Landed Cost/kg</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-semibold">
                      ${calculateLandedCost(offer)}
                    </p>
                    {parseFloat(calculateLandedCost(offer)) === bestPrice && (
                      <CheckCircle className="h-5 w-5 text-success" />
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-muted-foreground">Price/Unit</p>
                  <p className="text-lg font-medium">${offer.price_per_unit.toFixed(2)}</p>
                </div>

                <div>
                  <p className="text-muted-foreground">Days Until Expiry</p>
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-medium">
                      {getDaysUntilExpiry(offer.expiry_date)} days
                    </p>
                    {getDaysUntilExpiry(offer.expiry_date) === bestExpiry && (
                      <CheckCircle className="h-5 w-5 text-success" />
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-muted-foreground">Lead Time</p>
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-medium">{offer.lead_time_days} days</p>
                    {offer.lead_time_days === bestLead && (
                      <CheckCircle className="h-5 w-5 text-success" />
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-muted-foreground">Available Quantity</p>
                  <p className="text-lg font-medium">{offer.available_qty}</p>
                </div>

                <div>
                  <p className="text-muted-foreground">Min Order Qty</p>
                  <p className="text-lg font-medium">{offer.min_order_qty}</p>
                </div>

                <div>
                  <p className="text-muted-foreground">Unit Size</p>
                  <p className="text-lg font-medium">{offer.unit_size} kg</p>
                </div>

                <div>
                  <p className="text-muted-foreground">Delivery Fee</p>
                  <p className="text-lg font-medium">${offer.delivery_fee_flat.toFixed(2)}</p>
                </div>
              </div>

              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground">
                  Origin: {offer.origin_zip} • {offer.unit}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <p className="text-sm font-medium mb-2">Best Values:</p>
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>✅ Lowest landed cost: ${bestPrice.toFixed(2)}/kg</p>
            <p>✅ Longest expiry: {bestExpiry} days</p>
            <p>✅ Fastest delivery: {bestLead} days</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
