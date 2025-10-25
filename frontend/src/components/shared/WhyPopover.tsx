import { HelpCircle } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

interface WhyPopoverProps {
  reasons: string[];
  trigger?: React.ReactNode;
}

export function WhyPopover({ reasons, trigger }: WhyPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4 bg-card z-50">
        <div className="space-y-2">
          {reasons.map((reason, index) => (
            <p key={index} className="text-sm text-foreground leading-relaxed">
              {reason}
            </p>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
