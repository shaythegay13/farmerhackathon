from typing import List, Dict
from app.models import MenuItem, Ingredient
from app.schemas import MenuNudge
from app.services.llm import llm_service

def plate_cost_per_item(menu_item: MenuItem, recipe_ingredients: List[Ingredient], 
                       unit_cost_by_sku: Dict[str, float]) -> float:
    """
    Calculate ingredient cost per portion for a menu item
    
    Args:
        menu_item: MenuItem object
        recipe_ingredients: List of Ingredient objects for this menu item
        unit_cost_by_sku: Dict mapping produce_sku to cost per kg
    
    Returns:
        Total ingredient cost per portion
    """
    cost = 0.0
    
    for ingredient in recipe_ingredients:
        # Calculate kg needed accounting for yield loss
        yield_factor = max(ingredient.yield_pct, 1e-6)  # Avoid division by zero
        need_kg = ingredient.recipe_qty_per_portion_kg / yield_factor
        
        # Get unit cost for this SKU
        unit_cost = unit_cost_by_sku.get(ingredient.produce_sku, 0.0)
        
        cost += need_kg * unit_cost
    
    return cost

def suggest_price(current_price: float, target_food_cost_pct: float, ingredient_cost: float) -> float:
    """
    Suggest new price based on target food cost percentage
    
    Args:
        current_price: Current menu item price
        target_food_cost_pct: Target food cost percentage (as decimal)
        ingredient_cost: Ingredient cost per portion
    
    Returns:
        Suggested price rounded to nearest $0.25
    """
    if target_food_cost_pct <= 0:
        return current_price
    
    # Calculate price needed to achieve target food cost
    suggested_price = ingredient_cost / target_food_cost_pct
    
    # Round to nearest $0.25
    return round(suggested_price * 4) / 4.0

def compute_nudges(menu_items: List[MenuItem], ingredients: List[Ingredient], 
                  unit_cost_by_sku: Dict[str, float]) -> List[MenuNudge]:
    """
    Compute menu price nudges for all menu items
    
    Args:
        menu_items: List of MenuItem objects
        ingredients: List of Ingredient objects
        unit_cost_by_sku: Dict mapping produce_sku to cost per kg
    
    Returns:
        List of MenuNudge objects
    """
    nudges = []
    
    # Group ingredients by menu item
    ingredients_by_menu = {}
    for ingredient in ingredients:
        menu_id = ingredient.menu_item_id
        if menu_id not in ingredients_by_menu:
            ingredients_by_menu[menu_id] = []
        ingredients_by_menu[menu_id].append(ingredient)
    
    for menu_item in menu_items:
        recipe_ingredients = ingredients_by_menu.get(menu_item.menu_item_id, [])
        
        # Calculate ingredient cost per portion
        cost_per_portion = plate_cost_per_item(menu_item, recipe_ingredients, unit_cost_by_sku)
        
        # Calculate current food cost percentage
        current_food_cost_pct = cost_per_portion / max(menu_item.current_price, 1e-6)
        
        # Suggest new price
        suggested_price = suggest_price(
            menu_item.current_price,
            menu_item.target_food_cost_pct,
            cost_per_portion
        )
        
        # Calculate price delta
        delta = round(suggested_price - menu_item.current_price, 2)
        
        # Generate LLM explanation
        why = llm_service.generate_price_nudge_explanation(
            menu_item.menu_item_name,
            menu_item.current_price,
            suggested_price,
            delta,
            cost_per_portion
        )
        
        nudge = MenuNudge(
            menu_item_id=menu_item.menu_item_id,
            menu_item_name=menu_item.menu_item_name,
            current_price=menu_item.current_price,
            ingredient_cost_per_portion=round(cost_per_portion, 2),
            current_food_cost_pct=round(current_food_cost_pct, 3),
            target_food_cost_pct=menu_item.target_food_cost_pct,
            suggested_price=round(suggested_price, 2),
            nudge_delta=delta,
            why=why
        )
        
        nudges.append(nudge)
    
    return nudges

def calculate_food_cost_percentage(ingredient_cost: float, menu_price: float) -> float:
    """
    Calculate food cost percentage
    
    Args:
        ingredient_cost: Ingredient cost per portion
        menu_price: Menu item price
    
    Returns:
        Food cost percentage (as decimal)
    """
    if menu_price <= 0:
        return 0.0
    return ingredient_cost / menu_price
