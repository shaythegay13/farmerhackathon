// API service for connecting frontend to Yieldly backend.
// Defaults to the same port start.py and uvicorn use. Override with VITE_API_BASE_URL.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface UploadResponse {
  success: boolean;
  message: string;
  rows_processed: number;
  warnings?: string[];
}

export interface BidOffer {
  farm_id: number;
  farm_name: string;
  produce_sku: string;
  produce_name: string;
  organic: boolean;
  unit_size_kg: number;
  price_per_unit: number;
  available_qty_kg: number;
  min_order_qty_kg: number;
  expiry_date: string;
  delivery_fee_flat: number;
  lead_time_days: number;
  landed_cost_per_kg: number;
  why_feasible: string;
}

export interface BidsResponse {
  offers: BidOffer[];
  total_offers: number;
}

export interface PurchasePlanItem {
  produce_sku: string;
  farm_id: number;
  farm_name: string;
  qty_kg: number;
  landed_cost_per_kg: number;
  total_cost: number;
  reasons: string;
}

export interface MenuNudge {
  menu_item_id: string;
  menu_item_name: string;
  current_price: number;
  ingredient_cost_per_portion: number;
  current_food_cost_pct: number;
  target_food_cost_pct: number;
  suggested_price: number;
  nudge_delta: number;
  why: string;
}

export interface OptimizationResponse {
  purchase_plan: PurchasePlanItem[];
  savings_vs_baseline: number;
  baseline_explanation: string;
  menu_nudges: MenuNudge[];
  total_weekly_cost: number;
}

export interface Constraints {
  min_expiry_days: number;
  max_lead_days: number;
  organic_only: boolean;
  local_only: boolean;
}

class YieldlyApiService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const headers = new Headers(options.headers);
      if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.detail || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const data = await response.json();
      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  // Farmer endpoints
  async processFarmerData(csvData: Record<string, unknown>[]): Promise<ApiResponse<{
    success: boolean;
    message: string;
    offers: Record<string, unknown>[];
    mapping_info?: unknown;
  }>> {
    return this.request('/farmer/process_data', {
      method: 'POST',
      body: JSON.stringify({ csv_data: csvData }),
    });
  }

  async sendBidsNow(
    farmId: string | number,
    radiusMiles: number
  ): Promise<ApiResponse<{
    success: boolean;
    restaurants_reached: number;
    message: string;
  }>> {
    const formData = new FormData();
    formData.append('farm_id', String(farmId));
    formData.append('radius_miles', String(radiusMiles));
    return this.request('/farmer/send_bids_now', {
      method: 'POST',
      body: formData,
    });
  }

  async uploadFarmerOffers(
    csvFile: File,
    farmId: string,
    farmName: string,
    originZip: string
  ): Promise<ApiResponse<UploadResponse>> {
    const formData = new FormData();
    formData.append('csv', csvFile);
    formData.append('farm_id', farmId);
    formData.append('farm_name', farmName);
    formData.append('origin_zip', originZip);

    return this.request<UploadResponse>('/farmer/upload_offers', {
      method: 'POST',
      body: formData,
    });
  }

  // Restaurant endpoints
  async processRestaurantData(csvData: Record<string, unknown>[]): Promise<ApiResponse<{
    success: boolean;
    message: string;
    menu_items: Record<string, unknown>[];
    ingredients: Record<string, unknown>[];
    mapping_info?: unknown;
  }>> {
    return this.request('/restaurant/process_data', {
      method: 'POST',
      body: JSON.stringify({ csv_data: csvData }),
    });
  }

  async uploadRestaurantMenu(
    menuCsvFile: File,
    ingredientsCsvFile: File,
    restaurantName: string,
    restaurantZip: string
  ): Promise<ApiResponse<UploadResponse>> {
    const formData = new FormData();
    formData.append('menu_csv', menuCsvFile);
    formData.append('ingredients_csv', ingredientsCsvFile);
    formData.append('restaurant_name', restaurantName);
    formData.append('restaurant_zip', restaurantZip);

    return this.request<UploadResponse>('/restaurant/upload_menu', {
      method: 'POST',
      body: formData,
    });
  }

  async getBids(
    restaurantId: number,
    filters: {
      radius_miles?: number;
      min_expiry_days?: number;
      max_lead_days?: number;
      organic_only?: boolean;
    } = {}
  ): Promise<ApiResponse<BidsResponse>> {
    const params = new URLSearchParams({
      restaurant_id: restaurantId.toString(),
      ...Object.fromEntries(
        Object.entries(filters).map(([key, value]) => [key, value?.toString() || ''])
      ),
    });

    return this.request<BidsResponse>(`/restaurant/bids?${params}`);
  }

  async weeklyDemand(
    menuItems: object[],
    ingredients: object[],
    safetyStockPct: number = 0.05
  ): Promise<ApiResponse<{
    demand: Array<{
      produce_sku: string;
      ingredient_name: string;
      total_kg: number;
      substitutable: boolean;
      requires_organic: boolean;
      safety_stock_pct: number;
    }>;
  }>> {
    return this.request('/restaurant/weekly_demand', {
      method: 'POST',
      body: JSON.stringify({
        menu_items: menuItems,
        ingredients,
        safety_stock_pct: safetyStockPct,
      }),
    });
  }

  async optimizePlan(
    restaurantId: number,
    constraints: Constraints,
    safetyStockPct: number = 0.05,
    menuItems?: object[],
    ingredients?: object[]
  ): Promise<ApiResponse<OptimizationResponse>> {
    const payload = {
      restaurant_id: restaurantId,
      constraints,
      safety_stock_pct: safetyStockPct,
      ...(menuItems && ingredients
        ? { menu_items: menuItems, ingredients }
        : {}),
    };

    return this.request<OptimizationResponse>('/restaurant/optimize_plan', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async exportPurchaseOrder(
    restaurantId: number,
    planId: number
  ): Promise<ApiResponse<Blob>> {
    const formData = new FormData();
    formData.append('restaurant_id', restaurantId.toString());
    formData.append('plan_id', planId.toString());

    try {
      const response = await fetch(`${API_BASE_URL}/restaurant/export_po`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const blob = await response.blob();
      return {
        success: true,
        data: blob,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  async exportPriceChanges(
    restaurantId: number,
    planId: number
  ): Promise<ApiResponse<Blob>> {
    const formData = new FormData();
    formData.append('restaurant_id', restaurantId.toString());
    formData.append('plan_id', planId.toString());

    try {
      const response = await fetch(`${API_BASE_URL}/restaurant/export_price_changes`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const blob = await response.blob();
      return {
        success: true,
        data: blob,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  // Development endpoints
  async loadSampleData(): Promise<ApiResponse<{ success: boolean; message: string }>> {
    return this.request<{ success: boolean; message: string }>('/dev/load_sample_data', {
      method: 'POST',
    });
  }

  async getLlmStatus(): Promise<ApiResponse<{
    enabled: boolean;
    model: string | null;
    api_key_configured: boolean;
  }>> {
    return this.request<{
      enabled: boolean;
      model: string | null;
      api_key_configured: boolean;
    }>('/llm/status');
  }

  async healthCheck(): Promise<ApiResponse<{
    status: string;
    timestamp: string;
  }>> {
    return this.request<{
      status: string;
      timestamp: string;
    }>('/healthz');
  }

  // Sample CSV endpoints
  async getSampleCsv(filename: string): Promise<ApiResponse<Blob>> {
    try {
      const response = await fetch(`${API_BASE_URL}/dev/sample_csvs/${filename}`);
      
      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const blob = await response.blob();
      return {
        success: true,
        data: blob,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  async analyzeMarketTrends(menuItems: any[], ingredients: any[], forecastPeriod: string = "3months"): Promise<ApiResponse<{ market_trends: any[], menu_analyses: any[] }>> {
    try {
      const response = await fetch(`${API_BASE_URL}/restaurant/analyze_market_trends`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          menu_items: menuItems, 
          ingredients: ingredients,
          forecast_period: forecastPeriod 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.detail || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const data = await response.json();
      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
}

export const yieldlyApi = new YieldlyApiService();
export default yieldlyApi;
