import { Search, X, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export interface FilterState {
  search: string;
  sort: string;
  organicOnly: boolean;
  minExpiry: number;
  maxLeadTime: number;
  localRadius: number;
}

interface FilterBarProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
}

export function FilterBar({ filters, onFiltersChange }: FilterBarProps) {
  const [showFilters, setShowFilters] = useState(false);

  const updateFilter = <K extends keyof FilterState>(
    key: K,
    value: FilterState[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const resetFilters = () => {
    onFiltersChange({
      search: "",
      sort: "price-low",
      organicOnly: false,
      minExpiry: 0,
      maxLeadTime: 7,
      localRadius: 50,
    });
  };

  const activeFilterCount =
    (filters.organicOnly ? 1 : 0) +
    (filters.minExpiry > 0 ? 1 : 0) +
    (filters.maxLeadTime < 7 ? 1 : 0) +
    (filters.localRadius < 50 ? 1 : 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search produce..."
            value={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={filters.sort} onValueChange={(v) => updateFilter("sort", v)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-card z-50">
            <SelectItem value="price-low">Price: Low to High</SelectItem>
            <SelectItem value="price-high">Price: High to Low</SelectItem>
            <SelectItem value="expiry-soon">Expiry: Soonest</SelectItem>
            <SelectItem value="organic-first">Organic First</SelectItem>
          </SelectContent>
        </Select>

        <Popover open={showFilters} onOpenChange={setShowFilters}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 bg-card z-50" align="end">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="organic-only">Organic Only</Label>
                <Switch
                  id="organic-only"
                  checked={filters.organicOnly}
                  onCheckedChange={(checked) => updateFilter("organicOnly", checked)}
                />
              </div>

              <div className="space-y-2">
                <Label>Min Expiry: {filters.minExpiry} days</Label>
                <Slider
                  value={[filters.minExpiry]}
                  onValueChange={([v]) => updateFilter("minExpiry", v)}
                  max={14}
                  step={1}
                />
              </div>

              <div className="space-y-2">
                <Label>Max Lead Time: {filters.maxLeadTime} days</Label>
                <Slider
                  value={[filters.maxLeadTime]}
                  onValueChange={([v]) => updateFilter("maxLeadTime", v)}
                  max={7}
                  step={1}
                />
              </div>

              <div className="space-y-2">
                <Label>Local Radius: {filters.localRadius} miles</Label>
                <Slider
                  value={[filters.localRadius]}
                  onValueChange={([v]) => updateFilter("localRadius", v)}
                  max={50}
                  step={5}
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {activeFilterCount > 0 && (
          <Button variant="ghost" onClick={resetFilters} className="gap-2">
            <X className="h-4 w-4" />
            Reset All
          </Button>
        )}
      </div>

      {/* Active filter pills */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.organicOnly && (
            <Badge variant="secondary" className="gap-2 px-3 py-1">
              Organic Only
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilter("organicOnly", false)}
              />
            </Badge>
          )}
          {filters.minExpiry > 0 && (
            <Badge variant="secondary" className="gap-2 px-3 py-1">
              Min Expiry ≥ {filters.minExpiry} days
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilter("minExpiry", 0)}
              />
            </Badge>
          )}
          {filters.maxLeadTime < 7 && (
            <Badge variant="secondary" className="gap-2 px-3 py-1">
              Max Lead Time ≤ {filters.maxLeadTime} days
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilter("maxLeadTime", 7)}
              />
            </Badge>
          )}
          {filters.localRadius < 50 && (
            <Badge variant="secondary" className="gap-2 px-3 py-1">
              Within {filters.localRadius} miles
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilter("localRadius", 50)}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
