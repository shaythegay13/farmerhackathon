from fastapi import FastAPI, UploadFile, Form, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import date, datetime
from typing import List, Optional
import os
from pathlib import Path
from app.console import configure_stdio
from dotenv import load_dotenv

configure_stdio()

# Repo-root .env, then backend/.env so a local backend file can override.
_BACKEND_DIR = Path(__file__).resolve().parents[1]
_REPO_ROOT = _BACKEND_DIR.parent
load_dotenv(_REPO_ROOT / ".env")
load_dotenv(_BACKEND_DIR / ".env", override=True)

from app.models import get_db, Farm, ProduceOffer, Restaurant, MenuItem, Ingredient
from app.schemas import (
    UploadResponse, BidsResponse, OptimizationResponse, ExportResponse, 
    SendBidsResponse, BidOffer, PurchasePlanItem, MenuNudge, Constraints,
    OptimizationPayload
)
# Old parsing system removed - using intelligent parsing instead
from app.services.demand import compute_weekly_demand, get_menu_items_with_ingredients
from app.services.offers import (
    feasible_offers, get_all_offers, calculate_baseline_cost, 
    landed_cost_per_kg
)
from app.services.optimize import (
    greedy_optimize, calculate_optimized_cost, calculate_savings, 
    get_unit_cost_by_sku
)
from app.services.pricing import compute_nudges
from app.services.exports import generate_purchase_order_csv, generate_price_changes_csv
from app.sample_data import create_sample_data
from app.services.llm import llm_service
from app.services.intelligent_parsing import process_restaurant_csv_with_mapping, process_farmer_csv_with_mapping
from app.services.market_intelligence import market_intelligence_service

app = FastAPI(
    title="Yieldly API",
    description="AI-powered platform connecting farmers and restaurants for local food sourcing",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "http://127.0.0.1:8080"],  # Frontend URLs
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods
    allow_headers=["*"],  # Allow all headers
)

@app.get("/")
async def root():
    return {"message": "Welcome to Yieldly API", "version": "1.0.0"}

@app.get("/healthz")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow()}

@app.get("/llm/status")
async def llm_status():
    """Check LLM service status"""
    return {
        "enabled": llm_service.enabled,
        "model": llm_service.model_name if llm_service.enabled else None,
        "api_key_configured": bool(llm_service.api_key)
    }

@app.get("/dev/sample_csvs/{filename}")
async def get_sample_csv(filename: str):
    """Get sample CSV files for frontend"""
    from fastapi.responses import FileResponse
    
    sample_dir = os.path.join(os.path.dirname(__file__), "..", "sample_csvs")
    file_path = os.path.join(sample_dir, filename)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Sample CSV not found")
    
    return FileResponse(
        file_path,
        media_type="text/csv",
        filename=filename
    )

# Farmer Endpoints
@app.post("/farmer/process_data")
async def process_farmer_data(
    payload: dict,
    db: Session = Depends(get_db)
):
    """Process farmer CSV data with intelligent column mapping"""
    try:
        csv_data = payload.get("csv_data", [])
        if not csv_data:
            raise HTTPException(status_code=400, detail="No CSV data provided")
        
        # Process the CSV data with intelligent mapping
        result = process_farmer_csv_with_mapping(csv_data, db)
        
        return {
            "success": True,
            "message": "Farmer data processed successfully",
            "offers": result["offers"],
            "mapping_info": result["mapping_info"]
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Old upload endpoints removed - using intelligent parsing endpoints instead

@app.post("/farmer/send_bids_now", response_model=SendBidsResponse)
async def send_bids_now(
    farm_id: int = Form(...),
    radius_miles: int = Form(10),
    db: Session = Depends(get_db)
):
    """Simulate sending bids to nearby restaurants"""
    try:
        # Get farm
        farm = db.query(Farm).filter(Farm.id == farm_id).first()
        if not farm:
            raise HTTPException(status_code=404, detail="Farm not found")
        
        # Mock: Count restaurants in same ZIP prefix
        restaurants_in_area = db.query(Restaurant).filter(
            Restaurant.restaurant_zip.startswith(farm.origin_zip[:3])
        ).count()
        
        return SendBidsResponse(
            success=True,
            restaurants_reached=restaurants_in_area,
            message=f"Bids sent to {restaurants_in_area} restaurants in {radius_miles} mile radius"
        )
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Restaurant Endpoints
@app.post("/restaurant/process_data")
async def process_restaurant_data(
    payload: dict,
    db: Session = Depends(get_db)
):
    """Process restaurant CSV data with intelligent column mapping"""
    try:
        csv_data = payload.get("csv_data", [])
        if not csv_data:
            raise HTTPException(status_code=400, detail="No CSV data provided")
        
        # Process the CSV data with intelligent mapping
        result = process_restaurant_csv_with_mapping(csv_data, db)
        
        return {
            "success": True,
            "message": "Restaurant data processed successfully",
            "menu_items": result["menu_items"],
            "ingredients": result["ingredients"],
            "mapping_info": result["mapping_info"]
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/restaurant/bids", response_model=BidsResponse)
async def get_restaurant_bids(
    restaurant_id: int = Query(...),
    radius_miles: int = Query(10),
    min_expiry_days: int = Query(5),
    max_lead_days: int = Query(2),
    organic_only: bool = Query(False),
    local_only: bool = Query(False),
    db: Session = Depends(get_db)
):
    """Get feasible bids for a restaurant"""
    try:
        # Get restaurant
        restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
        if not restaurant:
            raise HTTPException(status_code=404, detail="Restaurant not found")
        
        # Get all offers
        offers = get_all_offers(db)
        
        # Create constraints
        constraints = Constraints(
            radius_miles=radius_miles,
            min_expiry_days=min_expiry_days,
            max_lead_days=max_lead_days,
            organic_only=organic_only,
            local_only=local_only
        )
        
        # Filter feasible offers
        feasible_offer_rows = feasible_offers(offers, constraints, date.today(), restaurant.restaurant_zip)
        
        # Convert to BidOffer objects
        bid_offers = []
        for offer_row in feasible_offer_rows:
            bid_offer = BidOffer(
                farm_id=offer_row.farm_id,
                farm_name=offer_row.farm_name,
                produce_sku=offer_row.produce_sku,
                produce_name=offer_row.produce_name,
                organic=offer_row.organic,
                unit_size_kg=offer_row.unit_size_kg,
                price_per_unit=offer_row.price_per_unit,
                available_qty_kg=offer_row.available_qty_kg,
                min_order_qty_kg=offer_row.min_order_qty_kg,
                expiry_date=offer_row.expiry_date,
                delivery_fee_flat=offer_row.delivery_fee_flat,
                lead_time_days=offer_row.lead_time_days,
                landed_cost_per_kg=offer_row.landed_cost_per_kg,
                why_feasible=f"Fresh until {offer_row.expiry_date}, {offer_row.lead_time_days}d lead time"
            )
            bid_offers.append(bid_offer)
        
        return BidsResponse(
            offers=bid_offers,
            total_offers=len(bid_offers)
        )
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/restaurant/optimize_plan", response_model=OptimizationResponse)
async def optimize_purchase_plan(
    payload: OptimizationPayload,
    db: Session = Depends(get_db)
):
    """Optimize purchase plan for a restaurant"""
    try:
        # Extract parameters from payload
        restaurant_id = payload.restaurant_id
        constraints = payload.constraints
        safety_stock_pct = payload.safety_stock_pct
        
        # Get restaurant
        restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
        if not restaurant:
            raise HTTPException(status_code=404, detail="Restaurant not found")
        
        # Compute weekly demand
        demand_by_sku = compute_weekly_demand(restaurant_id, db, safety_stock_pct)
        
        if not demand_by_sku:
            raise HTTPException(status_code=400, detail="No menu items or ingredients found")
        
        # Get all offers
        offers = get_all_offers(db)
        
        # Filter feasible offers using constraints from payload
        feasible_offer_rows = feasible_offers(offers, constraints, date.today(), restaurant.restaurant_zip)
        
        # Optimize purchase plan
        plan_rows = greedy_optimize(demand_by_sku, feasible_offer_rows)
        
        # Calculate costs
        optimized_cost = calculate_optimized_cost(plan_rows)
        baseline_cost = calculate_baseline_cost(demand_by_sku, db)
        savings = calculate_savings(baseline_cost, optimized_cost)
        
        # Get unit costs for pricing
        unit_cost_by_sku = get_unit_cost_by_sku(plan_rows)
        
        # Get menu items and ingredients for pricing
        menu_items = db.query(MenuItem).filter(MenuItem.restaurant_id == restaurant_id).all()
        ingredients = db.query(Ingredient).filter(Ingredient.restaurant_id == restaurant_id).all()
        
        # Compute menu nudges
        nudges = compute_nudges(menu_items, ingredients, unit_cost_by_sku)
        
        # Generate LLM explanation for optimization
        plan_dict = []
        for row in plan_rows:
            farm = db.query(Farm).filter(Farm.id == row.farm_id).first()
            farm_name = farm.farm_name if farm else f"Farm {row.farm_id}"
            plan_dict.append({
                'produce_sku': row.produce_sku,
                'farm_name': farm_name,
                'qty_kg': row.qty_kg,
                'landed_cost_per_kg': row.landed_cost_per_kg
            })
        
        constraints_dict = {
            'min_expiry_days': constraints.min_expiry_days,
            'max_lead_days': constraints.max_lead_days,
            'organic_only': constraints.organic_only,
            'local_only': constraints.local_only
        }
        
        baseline_explanation = llm_service.generate_optimization_explanation(
            plan_dict, savings, constraints_dict
        )
        
        # Convert plan rows to response format
        purchase_plan = []
        for row in plan_rows:
            farm = db.query(Farm).filter(Farm.id == row.farm_id).first()
            farm_name = farm.farm_name if farm else f"Farm {row.farm_id}"
            
            plan_item = PurchasePlanItem(
                produce_sku=row.produce_sku,
                farm_id=row.farm_id,
                farm_name=farm_name,
                qty_kg=row.qty_kg,
                landed_cost_per_kg=row.landed_cost_per_kg,
                total_cost=row.total,
                reasons=row.reasons
            )
            purchase_plan.append(plan_item)
        
        return OptimizationResponse(
            purchase_plan=purchase_plan,
            savings_vs_baseline=savings,
            baseline_explanation=baseline_explanation,
            menu_nudges=nudges,
            total_weekly_cost=optimized_cost
        )
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/restaurant/export_po")
async def export_purchase_order(
    restaurant_id: int = Form(...),
    plan_id: int = Form(...),
    db: Session = Depends(get_db)
):
    """Export purchase order as CSV"""
    try:
        # For now, we'll generate a sample plan
        # In a real implementation, you'd store and retrieve the plan by plan_id
        
        # Get restaurant
        restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
        if not restaurant:
            raise HTTPException(status_code=404, detail="Restaurant not found")
        
        # Compute demand and get a sample plan
        demand_by_sku = compute_weekly_demand(restaurant_id, db)
        offers = get_all_offers(db)
        constraints = Constraints()
        feasible_offers_list = feasible_offers(offers, constraints, date.today(), restaurant.restaurant_zip)
        plan_rows = greedy_optimize(demand_by_sku, feasible_offers_list)
        
        # Convert to PurchasePlanItem format
        purchase_plan = []
        farms = db.query(Farm).all()
        
        for row in plan_rows:
            farm = next((f for f in farms if f.id == row.farm_id), None)
            farm_name = farm.farm_name if farm else f"Farm {row.farm_id}"
            
            plan_item = PurchasePlanItem(
                produce_sku=row.produce_sku,
                farm_id=row.farm_id,
                farm_name=farm_name,
                qty_kg=row.qty_kg,
                landed_cost_per_kg=row.landed_cost_per_kg,
                total_cost=row.total,
                reasons=row.reasons
            )
            purchase_plan.append(plan_item)
        
        return generate_purchase_order_csv(purchase_plan, farms)
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/restaurant/export_price_changes")
async def export_price_changes(
    restaurant_id: int = Form(...),
    plan_id: int = Form(...),
    db: Session = Depends(get_db)
):
    """Export price changes as CSV"""
    try:
        # Get restaurant
        restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
        if not restaurant:
            raise HTTPException(status_code=404, detail="Restaurant not found")
        
        # Compute demand and get a sample plan
        demand_by_sku = compute_weekly_demand(restaurant_id, db)
        offers = get_all_offers(db)
        constraints = Constraints()
        feasible_offers_list = feasible_offers(offers, constraints, date.today(), restaurant.restaurant_zip)
        plan_rows = greedy_optimize(demand_by_sku, feasible_offers_list)
        
        # Get unit costs and compute nudges
        unit_cost_by_sku = get_unit_cost_by_sku(plan_rows)
        menu_items = db.query(MenuItem).filter(MenuItem.restaurant_id == restaurant_id).all()
        ingredients = db.query(Ingredient).filter(Ingredient.restaurant_id == restaurant_id).all()
        nudges = compute_nudges(menu_items, ingredients, unit_cost_by_sku)
        
        return generate_price_changes_csv(nudges)
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/restaurant/analyze_market_trends")
async def analyze_market_trends(
    payload: dict,
    db: Session = Depends(get_db)
):
    """Analyze market trends and provide ingredient substitution recommendations"""
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        menu_items = payload.get("menu_items", [])
        ingredients = payload.get("ingredients", [])
        forecast_period = payload.get("forecast_period", "3months")
        
        logger.info(f"Received market analysis request: {len(menu_items)} menu items, {len(ingredients)} ingredients")
        
        if not menu_items or not ingredients:
            logger.warning("No menu items or ingredients provided")
            raise HTTPException(status_code=400, detail="No menu items or ingredients provided")
        
        # Extract unique ingredient names
        ingredient_names = list(set([ing.get("ingredient_name", "") for ing in ingredients if ing.get("ingredient_name")]))
        
        if not ingredient_names:
            logger.warning("No valid ingredient names found")
            raise HTTPException(status_code=400, detail="No valid ingredient names found")
        
        logger.info(f"Analyzing trends for {len(ingredient_names)} ingredients: {ingredient_names[:5]}...")
        
        # Analyze market trends for ingredients
        market_trends = await market_intelligence_service.analyze_ingredient_trends(ingredient_names, forecast_period)
        
        logger.info(f"Got {len(market_trends)} market trends")
        
        # Analyze menu items and provide recommendations
        menu_analyses = await market_intelligence_service.analyze_menu_items(menu_items, ingredients, market_trends)
        
        logger.info(f"Got {len(menu_analyses)} menu analyses")
        
        return {
            "success": True,
            "message": "Market analysis completed successfully",
            "market_trends": market_trends,
            "menu_analyses": menu_analyses,
            "analysis_timestamp": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        logger.error(f"Error in market analysis: {e}\n{error_trace}")
        raise HTTPException(status_code=400, detail=f"Error analyzing market trends: {str(e)}")

@app.post("/dev/load_sample_data")
async def load_sample_data():
    """Load sample data for demo purposes"""
    try:
        create_sample_data()
        return {"success": True, "message": "Sample data loaded successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    _port = int(os.environ.get("PORT", "").strip() or "8000")
    uvicorn.run(app, host="0.0.0.0", port=_port)
