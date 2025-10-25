import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FarmerOffer } from "@/data/sampleData";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ExportButtons } from "@/components/shared/ExportButtons";

interface PurchaseItem {
  offer: FarmerOffer;
  quantity: number;
}

interface CheckoutCardProps {
  items: PurchaseItem[];
  calculateLandedCost: (offer: FarmerOffer) => string;
  onExportPO: () => void;
  disabled?: boolean;
}

export function CheckoutCard({
  items,
  calculateLandedCost,
  onExportPO,
  disabled,
}: CheckoutCardProps) {
  // Group by farm
  const farmGroups = items.reduce((acc, item) => {
    const farmId = item.offer.farm_id;
    if (!acc[farmId]) {
      acc[farmId] = {
        farmName: item.offer.farm_name,
        items: [],
        deliveryFee: item.offer.delivery_fee_flat,
      };
    }
    acc[farmId].items.push(item);
    return acc;
  }, {} as Record<string, { farmName: string; items: PurchaseItem[]; deliveryFee: number }>);

  const overallTotal = Object.values(farmGroups).reduce((total, group) => {
    const groupSubtotal = group.items.reduce((sum, item) => {
      return sum + item.quantity * parseFloat(calculateLandedCost(item.offer));
    }, 0);
    return total + groupSubtotal + group.deliveryFee;
  }, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Purchase Orders</CardTitle>
        <CardDescription>Review your orders grouped by supplier</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Accordion type="multiple" className="w-full" defaultValue={Object.keys(farmGroups)}>
          {Object.entries(farmGroups).map(([farmId, group]) => {
            const subtotal = group.items.reduce((sum, item) => {
              return sum + item.quantity * parseFloat(calculateLandedCost(item.offer));
            }, 0);
            const farmTotal = subtotal + group.deliveryFee;

            return (
              <AccordionItem key={farmId} value={farmId}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center justify-between w-full pr-4">
                    <span className="font-semibold">{group.farmName}</span>
                    <Badge variant="secondary">${farmTotal.toFixed(2)}</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 pt-2">
                    {group.items.map((item, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-start text-sm py-2 border-b last:border-0"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{item.offer.produce_name}</p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {item.offer.produce_sku}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.quantity} kg × ${calculateLandedCost(item.offer)}/kg
                          </p>
                        </div>
                        <p className="font-semibold">
                          ${(item.quantity * parseFloat(calculateLandedCost(item.offer))).toFixed(2)}
                        </p>
                      </div>
                    ))}

                    <div className="flex justify-between items-center text-sm pt-2 border-t">
                      <p className="text-muted-foreground">Delivery Fee</p>
                      <p className="font-medium">${group.deliveryFee.toFixed(2)}</p>
                    </div>

                    <div className="flex justify-between items-center font-semibold pt-2 border-t">
                      <p>Farm Subtotal</p>
                      <p>${farmTotal.toFixed(2)}</p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>

        <div className="border-t pt-4">
          <div className="flex justify-between items-center text-lg font-bold mb-4">
            <p>Overall Total</p>
            <p className="text-primary">${overallTotal.toFixed(2)}</p>
          </div>

          <ExportButtons onExportPO={onExportPO} disabled={disabled} />
        </div>
      </CardContent>
    </Card>
  );
}
