import os
import sys
from datetime import date, timedelta
from sqlalchemy.orm import Session
from app.console import configure_stdio
from app.models import Base, engine, Farm, ProduceOffer, Restaurant, MenuItem, Ingredient

configure_stdio()

def create_sample_data():
    """Create sample data for demo purposes"""
    
    # Create tables
    Base.metadata.create_all(bind=engine)
    
    # Create database session
    db = Session(bind=engine)
    
    try:
        # Clear existing data
        db.query(Ingredient).delete()
        db.query(MenuItem).delete()
        db.query(ProduceOffer).delete()
        db.query(Farm).delete()
        db.query(Restaurant).delete()
        db.commit()
        
        # Create sample farms
        farms_data = [
            {"farm_id": "FARM001", "farm_name": "Green Valley Organic Farm", "origin_zip": "90210"},
            {"farm_id": "FARM002", "farm_name": "Sunrise Produce Co", "origin_zip": "90211"},
            {"farm_id": "FARM003", "farm_name": "Mountain View Farms", "origin_zip": "90212"},
            {"farm_id": "FARM004", "farm_name": "Coastal Fresh Produce", "origin_zip": "90213"},
        ]
        
        farms = []
        for farm_data in farms_data:
            farm = Farm(**farm_data)
            db.add(farm)
            farms.append(farm)
        
        db.flush()  # Get IDs
        
        # Create sample produce offers
        offers_data = [
            # Green Valley Organic Farm
            {"farm_id": farms[0].id, "produce_sku": "ORG_TOMATO", "produce_name": "Organic Tomatoes", 
             "organic": True, "unit": "lb", "unit_size_kg": 0.453592, "price_per_unit": 3.50, 
             "available_qty_kg": 100.0, "min_order_qty_kg": 10.0, "expiry_date": date.today() + timedelta(days=7),
             "delivery_fee_flat": 15.0, "lead_time_days": 1},
            
            {"farm_id": farms[0].id, "produce_sku": "ORG_LETTUCE", "produce_name": "Organic Lettuce", 
             "organic": True, "unit": "head", "unit_size_kg": 0.5, "price_per_unit": 2.00, 
             "available_qty_kg": 50.0, "min_order_qty_kg": 5.0, "expiry_date": date.today() + timedelta(days=5),
             "delivery_fee_flat": 15.0, "lead_time_days": 1},
            
            {"farm_id": farms[0].id, "produce_sku": "ORG_ONION", "produce_name": "Organic Onions", 
             "organic": True, "unit": "lb", "unit_size_kg": 0.453592, "price_per_unit": 2.25, 
             "available_qty_kg": 200.0, "min_order_qty_kg": 20.0, "expiry_date": date.today() + timedelta(days=14),
             "delivery_fee_flat": 15.0, "lead_time_days": 1},
            
            # Sunrise Produce Co
            {"farm_id": farms[1].id, "produce_sku": "CONV_TOMATO", "produce_name": "Conventional Tomatoes", 
             "organic": False, "unit": "lb", "unit_size_kg": 0.453592, "price_per_unit": 2.50, 
             "available_qty_kg": 150.0, "min_order_qty_kg": 15.0, "expiry_date": date.today() + timedelta(days=6),
             "delivery_fee_flat": 12.0, "lead_time_days": 2},
            
            {"farm_id": farms[1].id, "produce_sku": "CONV_LETTUCE", "produce_name": "Conventional Lettuce", 
             "organic": False, "unit": "head", "unit_size_kg": 0.5, "price_per_unit": 1.50, 
             "available_qty_kg": 80.0, "min_order_qty_kg": 8.0, "expiry_date": date.today() + timedelta(days=4),
             "delivery_fee_flat": 12.0, "lead_time_days": 2},
            
            {"farm_id": farms[1].id, "produce_sku": "CONV_ONION", "produce_name": "Conventional Onions", 
             "organic": False, "unit": "lb", "unit_size_kg": 0.453592, "price_per_unit": 1.75, 
             "available_qty_kg": 300.0, "min_order_qty_kg": 25.0, "expiry_date": date.today() + timedelta(days=21),
             "delivery_fee_flat": 12.0, "lead_time_days": 2},
            
            # Mountain View Farms
            {"farm_id": farms[2].id, "produce_sku": "ORG_TOMATO", "produce_name": "Organic Tomatoes", 
             "organic": True, "unit": "lb", "unit_size_kg": 0.453592, "price_per_unit": 3.25, 
             "available_qty_kg": 75.0, "min_order_qty_kg": 12.0, "expiry_date": date.today() + timedelta(days=8),
             "delivery_fee_flat": 20.0, "lead_time_days": 3},
            
            {"farm_id": farms[2].id, "produce_sku": "ORG_CARROT", "produce_name": "Organic Carrots", 
             "organic": True, "unit": "lb", "unit_size_kg": 0.453592, "price_per_unit": 2.75, 
             "available_qty_kg": 120.0, "min_order_qty_kg": 15.0, "expiry_date": date.today() + timedelta(days=10),
             "delivery_fee_flat": 20.0, "lead_time_days": 3},
            
            # Coastal Fresh Produce
            {"farm_id": farms[3].id, "produce_sku": "CONV_TOMATO", "produce_name": "Conventional Tomatoes", 
             "organic": False, "unit": "lb", "unit_size_kg": 0.453592, "price_per_unit": 2.75, 
             "available_qty_kg": 200.0, "min_order_qty_kg": 20.0, "expiry_date": date.today() + timedelta(days=5),
             "delivery_fee_flat": 18.0, "lead_time_days": 2},
            
            {"farm_id": farms[3].id, "produce_sku": "CONV_CARROT", "produce_name": "Conventional Carrots", 
             "organic": False, "unit": "lb", "unit_size_kg": 0.453592, "price_per_unit": 1.95, 
             "available_qty_kg": 180.0, "min_order_qty_kg": 20.0, "expiry_date": date.today() + timedelta(days=12),
             "delivery_fee_flat": 18.0, "lead_time_days": 2},
        ]
        
        for offer_data in offers_data:
            offer = ProduceOffer(**offer_data)
            db.add(offer)
        
        # Create sample restaurants
        restaurants_data = [
            {"name": "The Garden Bistro", "restaurant_zip": "90210"},
            {"name": "Farm Fresh Cafe", "restaurant_zip": "90211"},
            {"name": "Local Eatery", "restaurant_zip": "90212"},
        ]
        
        restaurants = []
        for restaurant_data in restaurants_data:
            restaurant = Restaurant(**restaurant_data)
            db.add(restaurant)
            restaurants.append(restaurant)
        
        db.flush()  # Get IDs
        
        # Create sample menu items for The Garden Bistro
        menu_items_data = [
            {"restaurant_id": restaurants[0].id, "menu_item_id": "SALAD001", "menu_item_name": "Garden Salad", 
             "current_price": 12.00, "target_food_cost_pct": 0.30, "expected_weekly_orders": 50},
            {"restaurant_id": restaurants[0].id, "menu_item_id": "SALAD002", "menu_item_name": "Caesar Salad", 
             "current_price": 14.00, "target_food_cost_pct": 0.28, "expected_weekly_orders": 35},
            {"restaurant_id": restaurants[0].id, "menu_item_id": "SOUP001", "menu_item_name": "Tomato Soup", 
             "current_price": 8.00, "target_food_cost_pct": 0.25, "expected_weekly_orders": 40},
        ]
        
        menu_items = []
        for menu_data in menu_items_data:
            menu_item = MenuItem(**menu_data)
            db.add(menu_item)
            menu_items.append(menu_item)
        
        db.flush()  # Get IDs
        
        # Create sample ingredients
        ingredients_data = [
            # Garden Salad ingredients
            {"restaurant_id": restaurants[0].id, "menu_item_id": "SALAD001", "produce_sku": "ORG_LETTUCE", 
             "ingredient_name": "Organic Lettuce", "recipe_qty_per_portion_kg": 0.15, "yield_pct": 0.95, 
             "substitutable": True, "requires_organic": True},
            {"restaurant_id": restaurants[0].id, "menu_item_id": "SALAD001", "produce_sku": "ORG_TOMATO", 
             "ingredient_name": "Organic Tomatoes", "recipe_qty_per_portion_kg": 0.10, "yield_pct": 0.90, 
             "substitutable": True, "requires_organic": True},
            {"restaurant_id": restaurants[0].id, "menu_item_id": "SALAD001", "produce_sku": "ORG_ONION", 
             "ingredient_name": "Organic Onions", "recipe_qty_per_portion_kg": 0.05, "yield_pct": 0.95, 
             "substitutable": True, "requires_organic": True},
            
            # Caesar Salad ingredients
            {"restaurant_id": restaurants[0].id, "menu_item_id": "SALAD002", "produce_sku": "CONV_LETTUCE", 
             "ingredient_name": "Conventional Lettuce", "recipe_qty_per_portion_kg": 0.20, "yield_pct": 0.95, 
             "substitutable": True, "requires_organic": False},
            
            # Tomato Soup ingredients
            {"restaurant_id": restaurants[0].id, "menu_item_id": "SOUP001", "produce_sku": "ORG_TOMATO", 
             "ingredient_name": "Organic Tomatoes", "recipe_qty_per_portion_kg": 0.30, "yield_pct": 0.85, 
             "substitutable": False, "requires_organic": True},
            {"restaurant_id": restaurants[0].id, "menu_item_id": "SOUP001", "produce_sku": "ORG_ONION", 
             "ingredient_name": "Organic Onions", "recipe_qty_per_portion_kg": 0.08, "yield_pct": 0.95, 
             "substitutable": True, "requires_organic": True},
        ]
        
        for ingredient_data in ingredients_data:
            ingredient = Ingredient(**ingredient_data)
            db.add(ingredient)
        
        db.commit()
        
        print("✅ Sample data created successfully!")
        print(f"   - {len(farms)} farms")
        print(f"   - {len(offers_data)} produce offers")
        print(f"   - {len(restaurants)} restaurants")
        print(f"   - {len(menu_items)} menu items")
        print(f"   - {len(ingredients_data)} ingredients")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error creating sample data: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    create_sample_data()
