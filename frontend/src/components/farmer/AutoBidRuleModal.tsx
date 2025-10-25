import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

interface AutoBidRuleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AutoBidRuleModal({ open, onOpenChange }: AutoBidRuleModalProps) {
  const [condition, setCondition] = useState("demand-spike");
  const [action, setAction] = useState("price-increase");
  const [percentage, setPercentage] = useState("5");

  const handleSave = () => {
    toast({
      title: "✅ Rule saved!",
      description: "Auto-bid rule created successfully (demo mode)",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card">
        <DialogHeader>
          <DialogTitle>Auto-Bid Rule Builder</DialogTitle>
          <DialogDescription>
            Create automated bidding rules based on market conditions
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label>If (Condition)</Label>
            <Select value={condition} onValueChange={setCondition}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card z-50">
                <SelectItem value="demand-spike">Demand spike detected</SelectItem>
                <SelectItem value="low-inventory">Low inventory warning</SelectItem>
                <SelectItem value="competitor-price">Competitor price change</SelectItem>
                <SelectItem value="expiry-approaching">Expiry approaching (3 days)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Then (Action)</Label>
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card z-50">
                <SelectItem value="price-increase">Suggest price increase</SelectItem>
                <SelectItem value="price-decrease">Suggest price decrease</SelectItem>
                <SelectItem value="send-alert">Send alert</SelectItem>
                <SelectItem value="auto-adjust">Auto-adjust bid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(action === "price-increase" || action === "price-decrease") && (
            <div className="space-y-2">
              <Label>Percentage Adjustment</Label>
              <div className="flex gap-2 items-center">
                <Input
                  type="number"
                  value={percentage}
                  onChange={(e) => setPercentage(e.target.value)}
                  min="1"
                  max="50"
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>
          )}

          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm font-medium mb-2">Rule Preview:</p>
            <p className="text-sm text-muted-foreground">
              If <span className="font-medium text-foreground">{condition.replace("-", " ")}</span>{" "}
              for any produce → then{" "}
              <span className="font-medium text-foreground">{action.replace("-", " ")}</span>
              {(action === "price-increase" || action === "price-decrease") &&
                ` by ${percentage}%`}
            </p>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Rule</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
