"""
Intelligent CSV parsing service using Gemini for column mapping
"""
import logging
from typing import List, Dict, Any, Optional, Tuple
from datetime import date
import google.generativeai as genai
from app.services.llm import llm_service

logger = logging.getLogger(__name__)

# Required columns for restaurant data
REQUIRED_MENU_COLUMNS = {
    "menu_item_id": "Unique identifier for menu item",
    "menu_item_name": "Name of the menu item",
    "current_price": "Current price of the menu item",
    "target_food_cost_pct": "Target food cost percentage",
    "expected_weekly_orders": "Expected weekly order quantity"
}

REQUIRED_INGREDIENT_COLUMNS = {
    "menu_item_id": "Menu item identifier (links to menu)",
    "produce_sku": "Product SKU or identifier",
    "ingredient_name": "Name of the ingredient",
    "recipe_qty_per_portion": "Quantity per portion",
    "recipe_unit": "Unit of measurement",
    "yield_pct": "Yield percentage"
}

# Required columns for farmer data
REQUIRED_FARMER_COLUMNS = {
    "farm_id": "Farm identifier",
    "farm_name": "Name of the farm",
    "produce_sku": "Product SKU or identifier",
    "produce_name": "Name of the produce",
    "organic": "Whether the produce is organic",
    "unit": "Unit of measurement",
    "unit_size": "Size of the unit",
    "price_per_unit": "Price per unit",
    "available_qty": "Available quantity",
    "min_order_qty": "Minimum order quantity",
    "expiry_date": "Expiry date",
    "origin_zip": "Origin ZIP code",
    "delivery_fee_flat": "Flat delivery fee",
    "lead_time_days": "Lead time in days"
}

def map_columns_with_llm(csv_headers: List[str], required_columns: Dict[str, str]) -> Dict[str, Optional[str]]:
    """
    Use Gemini to intelligently map CSV headers to required columns
    """
    if not llm_service.enabled:
        # Fallback to simple string matching
        return simple_column_mapping(csv_headers, required_columns)
    
    try:
        # Create a prompt for column mapping
        headers_str = ", ".join(csv_headers)
        required_str = "\n".join([f"- {col}: {desc}" for col, desc in required_columns.items()])
        
        prompt = f"""
You are a data mapping assistant. I have CSV headers and need to map them to required database columns.

CSV Headers: {headers_str}

Required Columns:
{required_str}

Please return a JSON object mapping each required column to the best matching CSV header (or null if no good match exists).

Example response:
{{"menu_item_id": "item_id", "menu_item_name": "dish_name", "current_price": "price", "target_food_cost_pct": null}}

Only return the JSON object, no other text.
"""
        
        response = llm_service.model.generate_content(prompt)
        mapping_text = response.text.strip()
        
        # Parse the JSON response
        import json
        mapping = json.loads(mapping_text)
        
        # Validate that all required columns are accounted for
        result = {}
        for col in required_columns.keys():
            result[col] = mapping.get(col)
        
        return result
        
    except Exception as e:
        logger.warning(f"LLM column mapping failed: {e}, falling back to simple mapping")
        return simple_column_mapping(csv_headers, required_columns)

def simple_column_mapping(csv_headers: List[str], required_columns: Dict[str, str]) -> Dict[str, Optional[str]]:
    """
    Simple fallback column mapping using string similarity
    """
    mapping = {}
    
    for required_col, description in required_columns.items():
        best_match = None
        best_score = 0
        
        for header in csv_headers:
            # Simple scoring based on substring matches
            header_lower = header.lower().replace("_", " ").replace("-", " ")
            required_lower = required_col.lower().replace("_", " ")
            
            # Exact match
            if header_lower == required_lower:
                best_match = header
                best_score = 1.0
                break
            
            # Substring matches
            if required_lower in header_lower or header_lower in required_lower:
                score = min(len(required_lower), len(header_lower)) / max(len(required_lower), len(header_lower))
                if score > best_score:
                    best_match = header
                    best_score = score
        
        mapping[required_col] = best_match if best_score > 0.3 else None
    
    return mapping

def validate_required_columns(mapping: Dict[str, Optional[str]], required_columns: Dict[str, str]) -> List[str]:
    """
    Check if all required columns are mapped
    """
    missing = []
    for col, mapped_header in mapping.items():
        if mapped_header is None:
            missing.append(col)
    return missing

def process_csv_row(row: Dict[str, Any], mapping: Dict[str, Optional[str]], required_columns: Dict[str, str]) -> Dict[str, Any]:
    """
    Process a single CSV row using the column mapping
    """
    processed = {}
    
    for required_col, mapped_header in mapping.items():
        if mapped_header and mapped_header in row:
            value = row[mapped_header]
            
            # Type conversion based on column type
            if required_col in ["current_price", "target_food_cost_pct", "recipe_qty_per_portion", "yield_pct"]:
                try:
                    processed[required_col] = float(value) if value else 0.0
                except (ValueError, TypeError):
                    processed[required_col] = 0.0
            elif required_col in ["expected_weekly_orders"]:
                try:
                    processed[required_col] = int(value) if value else 0
                except (ValueError, TypeError):
                    processed[required_col] = 0
            elif required_col in ["substitutable", "requires_organic"]:
                if isinstance(value, bool):
                    processed[required_col] = value
                else:
                    processed[required_col] = str(value).lower() in ["true", "1", "yes", "y"]
            else:
                processed[required_col] = str(value) if value else ""
        else:
            # Use default values for missing required columns
            if required_col in ["current_price", "target_food_cost_pct", "recipe_qty_per_portion", "yield_pct"]:
                processed[required_col] = 0.0
            elif required_col in ["expected_weekly_orders"]:
                processed[required_col] = 0
            elif required_col in ["substitutable", "requires_organic"]:
                processed[required_col] = False
            else:
                processed[required_col] = ""
    
    return processed

def separate_menu_and_ingredients(data: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Separate the unified CSV data into menu items and ingredients
    """
    menu_items = []
    ingredients = []
    
    # Group by menu_item_id to separate menu items from ingredients
    menu_item_ids = set()
    
    for row in data:
        menu_item_id = row.get("menu_item_id", "")
        if menu_item_id and menu_item_id not in menu_item_ids:
            # This is a menu item
            menu_items.append({
                "menu_item_id": menu_item_id,
                "menu_item_name": row.get("menu_item_name", ""),
                "current_price": row.get("current_price", 0.0),
                "target_food_cost_pct": row.get("target_food_cost_pct", 0.0),
                "expected_weekly_orders": row.get("expected_weekly_orders", 0)
            })
            menu_item_ids.add(menu_item_id)
        
        # This row contributes to ingredients
        if row.get("produce_sku") and row.get("ingredient_name"):
            ingredients.append({
                "menu_item_id": menu_item_id,
                "produce_sku": row.get("produce_sku", ""),
                "ingredient_name": row.get("ingredient_name", ""),
                "recipe_qty_per_portion": row.get("recipe_qty_per_portion", 0.0),
                "recipe_unit": row.get("recipe_unit", "kg"),
                "yield_pct": row.get("yield_pct", 1.0),
                "substitutable": row.get("substitutable", False),
                "requires_organic": row.get("requires_organic", False)
            })
    
    return menu_items, ingredients

def process_restaurant_csv_with_mapping(csv_data: List[Dict[str, Any]], db) -> Dict[str, Any]:
    """
    Main function to process restaurant CSV with intelligent column mapping
    """
    if not csv_data:
        raise ValueError("No CSV data provided")
    
    # Get headers from first row
    headers = list(csv_data[0].keys()) if csv_data else []
    
    # Map columns for menu items
    menu_mapping = map_columns_with_llm(headers, REQUIRED_MENU_COLUMNS)
    ingredient_mapping = map_columns_with_llm(headers, REQUIRED_INGREDIENT_COLUMNS)
    
    # Check for missing required columns
    missing_menu = validate_required_columns(menu_mapping, REQUIRED_MENU_COLUMNS)
    missing_ingredients = validate_required_columns(ingredient_mapping, REQUIRED_INGREDIENT_COLUMNS)
    
    if missing_menu or missing_ingredients:
        missing_all = missing_menu + missing_ingredients
        raise ValueError(f"Missing required columns: {', '.join(missing_all)}. Please ensure your CSV contains these columns or similar variations.")
    
    # Process each row
    processed_data = []
    for row in csv_data:
        # Combine mappings for processing
        combined_mapping = {**menu_mapping, **ingredient_mapping}
        combined_required = {**REQUIRED_MENU_COLUMNS, **REQUIRED_INGREDIENT_COLUMNS, **OPTIONAL_COLUMNS}
        
        processed_row = process_csv_row(row, combined_mapping, combined_required)
        processed_data.append(processed_row)
    
    # Separate into menu items and ingredients
    menu_items, ingredients = separate_menu_and_ingredients(processed_data)
    
    return {
        "menu_items": menu_items,
        "ingredients": ingredients,
        "mapping_info": {
            "menu_mapping": menu_mapping,
            "ingredient_mapping": ingredient_mapping,
            "total_rows_processed": len(processed_data)
        }
    }
    
def process_farmer_csv_with_mapping(csv_data: List[Dict[str, Any]], db) -> Dict[str, Any]:
    """
    Process farmer CSV with intelligent column mapping
    """
    if not csv_data:
        raise ValueError("No CSV data provided")
    
    # Get headers from first row
    headers = list(csv_data[0].keys()) if csv_data else []
    
    # Map columns for farmer data
    farmer_mapping = map_columns_with_llm(headers, REQUIRED_FARMER_COLUMNS)
    
    # Check for missing required columns
    missing_columns = validate_required_columns(farmer_mapping, REQUIRED_FARMER_COLUMNS)
    
    if missing_columns:
        raise ValueError(f"Missing required columns: {', '.join(missing_columns)}. Please ensure your CSV contains these columns or similar variations.")
    
    # Process each row
    processed_offers = []
    for row in csv_data:
        processed_row = process_csv_row(row, farmer_mapping, REQUIRED_FARMER_COLUMNS)
        
        # Convert date string to date object
        if processed_row.get("expiry_date"):
            try:
                from datetime import datetime
                processed_row["expiry_date"] = datetime.strptime(processed_row["expiry_date"], "%Y-%m-%d").date()
            except ValueError:
                # Try other common date formats
                try:
                    processed_row["expiry_date"] = datetime.strptime(processed_row["expiry_date"], "%m/%d/%Y").date()
                except ValueError:
                    processed_row["expiry_date"] = date.today()
        else:
            processed_row["expiry_date"] = date.today()
        
        processed_offers.append(processed_row)
    
    return {
        "offers": processed_offers,
        "mapping_info": {
            "farmer_mapping": farmer_mapping,
            "total_rows_processed": len(processed_offers)
        }
    }
