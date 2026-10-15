from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import date, datetime

# Request Models
class FarmerUploadRequest(BaseModel):
    farm_id: str
    farm_name: str
    origin_zip: str

class RestaurantUploadRequest(BaseModel):
    restaurant_name: str
    restaurant_zip: str

class OptimizationRequest(BaseModel):
    restaurant_id: int
    constraints: Dict[str, Any] = {}
    safety_stock_pct: float = 0.05

class ExportRequest(BaseModel):
    restaurant_id: int
    plan_id: int

class SendBidsRequest(BaseModel):
    farm_id: int
    radius_miles: int = 10

# Response Models
class UploadResponse(BaseModel):
    success: bool
    message: str
    rows_processed: int
    warnings: List[str] = []

class BidOffer(BaseModel):
    farm_id: int
    farm_name: str
    produce_sku: str
    produce_name: str
    organic: bool
    unit_size_kg: float
    price_per_unit: float
    available_qty_kg: float
    min_order_qty_kg: float
    expiry_date: date
    delivery_fee_flat: float
    lead_time_days: int
    landed_cost_per_kg: float
    why_feasible: str

class PurchasePlanItem(BaseModel):
    produce_sku: str
    farm_id: int
    farm_name: str
    qty_kg: float
    landed_cost_per_kg: float
    total_cost: float
    reasons: str

class MenuNudge(BaseModel):
    menu_item_id: str
    menu_item_name: str
    current_price: float
    ingredient_cost_per_portion: float
    current_food_cost_pct: float
    target_food_cost_pct: float
    suggested_price: float
    nudge_delta: float
    why: str

class OptimizationResponse(BaseModel):
    purchase_plan: List[PurchasePlanItem]
    savings_vs_baseline: float
    baseline_explanation: str
    menu_nudges: List[MenuNudge]
    total_weekly_cost: float

class BidsResponse(BaseModel):
    offers: List[BidOffer]
    total_offers: int

class ExportResponse(BaseModel):
    success: bool
    download_url: Optional[str] = None
    filename: str

class SendBidsResponse(BaseModel):
    success: bool
    restaurants_reached: int
    message: str

# Internal Models for Processing
class OfferRow(BaseModel):
    farm_id: int
    farm_name: str
    produce_sku: str
    produce_name: str
    organic: bool
    unit_size_kg: float
    price_per_unit: float
    available_qty_kg: float
    min_order_qty_kg: float
    expiry_date: date
    delivery_fee_flat: float
    lead_time_days: int
    origin_zip: str
    landed_cost_per_kg: Optional[float] = None

class Constraints(BaseModel):
    radius_miles: int = 10
    min_expiry_days: int = 5
    max_lead_days: int = 2
    organic_only: bool = False
    local_only: bool = False

class MenuItemInput(BaseModel):
    menu_item_id: str
    menu_item_name: str = ""
    current_price: float = 0
    target_food_cost_pct: float = 0
    expected_weekly_orders: float = 0

class IngredientInput(BaseModel):
    menu_item_id: str
    produce_sku: str
    ingredient_name: str = ""
    recipe_qty_per_portion: float = 0
    yield_pct: float = 1
    substitutable: bool = False
    requires_organic: bool = False

class WeeklyDemandRequest(BaseModel):
    menu_items: List[MenuItemInput]
    ingredients: List[IngredientInput]
    safety_stock_pct: float = 0.05

class DemandLine(BaseModel):
    produce_sku: str
    ingredient_name: str
    total_kg: float
    substitutable: bool
    requires_organic: bool
    safety_stock_pct: float

class WeeklyDemandResponse(BaseModel):
    demand: List[DemandLine]

class OptimizationPayload(BaseModel):
    restaurant_id: int
    constraints: Constraints
    safety_stock_pct: float = 0.05
    menu_items: Optional[List[MenuItemInput]] = None
    ingredients: Optional[List[IngredientInput]] = None

class PlanRow(BaseModel):
    produce_sku: str
    farm_id: int
    qty_kg: float
    landed_cost_per_kg: float
    total: float
    reasons: str
