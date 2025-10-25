import { Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

interface ExportButtonsProps {
  onExportPO?: () => void;
  onExportPriceChanges?: () => void;
  disabled?: boolean;
}

export function ExportButtons({
  onExportPO,
  onExportPriceChanges,
  disabled = false,
}: ExportButtonsProps) {
  const handleShare = () => {
    toast({
      title: "Share link copied!",
      description: "Link has been copied to clipboard (demo mode)",
    });
  };

  return (
    <div className="flex flex-wrap gap-2">
      {onExportPO && (
        <Button onClick={onExportPO} disabled={disabled} className="gap-2">
          <Download className="h-4 w-4" />
          Export Purchase Order
        </Button>
      )}
      
      {onExportPriceChanges && (
        <Button
          onClick={onExportPriceChanges}
          disabled={disabled}
          variant="secondary"
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          Export Price Changes
        </Button>
      )}
      
      <Button
        onClick={handleShare}
        disabled={disabled}
        variant="outline"
        className="gap-2"
      >
        <Share2 className="h-4 w-4" />
        Share Link
      </Button>
    </div>
  );
}
