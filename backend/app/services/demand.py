from collections import defaultdict
from typing import Dict, List
from sqlalchemy.orm import Session
from app.models import MenuItem, Ingredient

def _yield_fraction(yield_pct: float) -> float:
    """Yield is stored as a fraction (0.95). Values above 1 are percents."""
    try:
        value = float(yield_pct)
    except (TypeError, ValueError):
        return 1.0
    if value > 1:
        value = value / 100.0
    return max(value, 1e-6)


def _recipe_kg(ingredient) -> float:
    qty = getattr(ingredient, "recipe_qty_per_portion_kg", None)
    if qty is None:
        qty = getattr(ingredient, "recipe_qty_per_portion", 0)
    return float(qty or 0)


def compute_weekly_demand_from_rows(menu_items, ingredients, safety_stock_pct: float = 0.05) -> Dict[str, float]:
    """Weekly kg by SKU from the same menu rows the restaurant screen is showing."""
    demand = defaultdict(float)
    menus = {item.menu_item_id: item for item in menu_items}

    for ingredient in ingredients:
        menu_item = menus.get(ingredient.menu_item_id)
        if not menu_item:
            continue
        portions = float(getattr(menu_item, "expected_weekly_orders", 0) or 0)
        gross_kg = portions * (_recipe_kg(ingredient) / _yield_fraction(ingredient.yield_pct))
        demand[ingredient.produce_sku] += gross_kg

    factor = 1 + float(safety_stock_pct or 0)
    return {sku: qty * factor for sku, qty in demand.items()}


def demand_lines(menu_items, ingredients, safety_stock_pct: float = 0.05) -> List[Dict]:
    """Demand rows for the restaurant table, using compute_weekly_demand_from_rows."""
    totals = compute_weekly_demand_from_rows(menu_items, ingredients, safety_stock_pct)
    meta: Dict[str, Dict] = {}
    for ingredient in ingredients:
        sku = ingredient.produce_sku
        substitutable = bool(getattr(ingredient, "substitutable", False))
        requires_organic = bool(getattr(ingredient, "requires_organic", False))
        name = getattr(ingredient, "ingredient_name", "") or sku
        if sku not in meta:
            meta[sku] = {
                "ingredient_name": name,
                "substitutable": substitutable,
                "requires_organic": requires_organic,
            }
        else:
            meta[sku]["substitutable"] = meta[sku]["substitutable"] or substitutable
            meta[sku]["requires_organic"] = meta[sku]["requires_organic"] or requires_organic

    lines = []
    for sku, total in totals.items():
        info = meta.get(sku, {"ingredient_name": sku, "substitutable": False, "requires_organic": False})
        lines.append({
            "produce_sku": sku,
            "ingredient_name": info["ingredient_name"],
            "total_kg": total,
            "substitutable": info["substitutable"],
            "requires_organic": info["requires_organic"],
            "safety_stock_pct": safety_stock_pct,
        })
    return lines


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
    menu_items = db.query(MenuItem).filter(MenuItem.restaurant_id == restaurant_id).all()
    ingredients = db.query(Ingredient).filter(Ingredient.restaurant_id == restaurant_id).all()
    return compute_weekly_demand_from_rows(menu_items, ingredients, safety_stock_pct)

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
