from collections import defaultdict
from typing import Dict, List
from sqlalchemy.orm import Session
from app.models import MenuItem, Ingredient

def compute_weekly_demand(restaurant_id: int, db: Session, safety_stock_pct: float = 0.05) -> Dict[str, float]:
    """
    Compute weekly ingredient demand for a restaurant
    
    Args:
        restaurant_id: ID of the restaurant
        db: Database session
        safety_stock_pct: Safety stock percentage (default 5%)
    
    Returns:
        Dict mapping produce_sku to required_kg
    """
    demand = defaultdict(float)
    
    # Get all menu items for this restaurant
    menu_items = db.query(MenuItem).filter(MenuItem.restaurant_id == restaurant_id).all()
    menu_items_dict = {item.menu_item_id: item for item in menu_items}
    
    # Get all ingredients for this restaurant
    ingredients = db.query(Ingredient).filter(Ingredient.restaurant_id == restaurant_id).all()
    
    # Calculate demand for each ingredient
    for ingredient in ingredients:
        menu_item = menu_items_dict.get(ingredient.menu_item_id)
        if not menu_item:
            continue
            
        # Calculate portions needed per week
        portions = menu_item.expected_weekly_orders
        
        # Calculate gross kg needed (accounting for yield loss)
        yield_factor = max(ingredient.yield_pct, 1e-6)  # Avoid division by zero
        gross_kg = portions * (ingredient.recipe_qty_per_portion_kg / yield_factor)
        
        # Add to total demand for this SKU
        demand[ingredient.produce_sku] += gross_kg
    
    # Apply safety stock
    for sku in demand:
        demand[sku] *= (1 + safety_stock_pct)
    
    return dict(demand)

def get_menu_items_with_ingredients(restaurant_id: int, db: Session) -> Dict[str, Dict]:
    """
    Get menu items with their ingredients for a restaurant
    
    Returns:
        Dict mapping menu_item_id to menu item data with ingredients list
    """
    menu_items = db.query(MenuItem).filter(MenuItem.restaurant_id == restaurant_id).all()
    ingredients = db.query(Ingredient).filter(Ingredient.restaurant_id == restaurant_id).all()
    
    # Group ingredients by menu item
    ingredients_by_menu = defaultdict(list)
    for ingredient in ingredients:
        ingredients_by_menu[ingredient.menu_item_id].append(ingredient)
    
    # Build result
    result = {}
    for menu_item in menu_items:
        result[menu_item.menu_item_id] = {
            'menu_item': menu_item,
            'ingredients': ingredients_by_menu[menu_item.menu_item_id]
        }
    
    return result
