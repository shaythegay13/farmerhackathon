#!/usr/bin/env python3
"""
Simple test script for Yieldly backend core functionality
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.console import configure_stdio

configure_stdio()

def test_imports():
    """Test that core modules can be imported"""
    try:
        print("🧪 Testing core imports...")
        
        # Test basic Python modules
        import csv
        import json
        from datetime import datetime, date
        print("✅ Basic Python modules imported")
        
        # Test our core modules (without SQLAlchemy for now)
        from app.services.parsing import convert_to_kg, UNIT_CONVERSIONS
        print("✅ Parsing service imported")
        
        from app.services.demand import compute_weekly_demand
        print("✅ Demand service imported")
        
        from app.services.optimize import greedy_optimize, calculate_optimized_cost
        print("✅ Optimization service imported")
        
        from app.services.pricing import plate_cost_per_item, suggest_price
        print("✅ Pricing service imported")
        
        from app.services.exports import generate_purchase_order_csv, generate_price_changes_csv
        print("✅ Export service imported")
        
        print("\n🎉 All core services imported successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Import error: {e}")
        return False

def test_unit_conversions():
    """Test unit conversion functionality"""
    try:
        print("\n🧪 Testing unit conversions...")
        
        from app.services.parsing import convert_to_kg
        
        # Test various unit conversions
        test_cases = [
            (1.0, 'kg', 1.0),
            (2.0, 'lb', 2.0 * 0.453592),
            (10.0, 'g', 0.01),
            (5.0, 'head', 5.0 * 0.5),  # Default assumption
        ]
        
        for quantity, unit, expected in test_cases:
            result = convert_to_kg(quantity, unit)
            print(f"  {quantity} {unit} = {result:.4f} kg (expected: {expected:.4f})")
            assert abs(result - expected) < 0.001, f"Conversion failed for {quantity} {unit}"
        
        print("✅ Unit conversions working correctly")
        return True
        
    except Exception as e:
        print(f"❌ Unit conversion error: {e}")
        return False

def test_optimization_logic():
    """Test optimization algorithms"""
    try:
        print("\n🧪 Testing optimization logic...")
        
        from app.services.optimize import greedy_optimize, calculate_optimized_cost
        from app.schemas import OfferRow
        from datetime import date
        
        # Create test data
        demand_by_sku = {
            'TOMATO': 10.0,  # Need 10kg of tomatoes
            'LETTUCE': 5.0   # Need 5kg of lettuce
        }
        
        offer_rows = [
            OfferRow(
                farm_id=1, farm_name="Farm A", produce_sku="TOMATO", produce_name="Tomatoes",
                organic=True, unit_size_kg=1.0, price_per_unit=3.0, available_qty_kg=15.0,
                min_order_qty_kg=5.0, expiry_date=date(2024, 1, 15), delivery_fee_flat=10.0,
                lead_time_days=1, origin_zip="90210", landed_cost_per_kg=3.67
            ),
            OfferRow(
                farm_id=2, farm_name="Farm B", produce_sku="TOMATO", produce_name="Tomatoes",
                organic=False, unit_size_kg=1.0, price_per_unit=2.5, available_qty_kg=20.0,
                min_order_qty_kg=10.0, expiry_date=date(2024, 1, 16), delivery_fee_flat=15.0,
                lead_time_days=2, origin_zip="90211", landed_cost_per_kg=3.25
            ),
            OfferRow(
                farm_id=1, farm_name="Farm A", produce_sku="LETTUCE", produce_name="Lettuce",
                organic=True, unit_size_kg=0.5, price_per_unit=2.0, available_qty_kg=10.0,
                min_order_qty_kg=2.0, expiry_date=date(2024, 1, 14), delivery_fee_flat=10.0,
                lead_time_days=1, origin_zip="90210", landed_cost_per_kg=5.0
            )
        ]
        
        # Run optimization
        plan = greedy_optimize(demand_by_sku, offer_rows)
        total_cost = calculate_optimized_cost(plan)
        
        print(f"  Generated plan with {len(plan)} items")
        print(f"  Total cost: ${total_cost:.2f}")
        
        for item in plan:
            print(f"  - {item.produce_sku}: {item.qty_kg:.1f}kg from Farm {item.farm_id} at ${item.landed_cost_per_kg:.2f}/kg")
        
        print("✅ Optimization logic working correctly")
        return True
        
    except Exception as e:
        print(f"❌ Optimization error: {e}")
        return False

def test_screen_menu_demand():
    """On-screen menu rows and the optimizer share one demand helper."""
    try:
        print("\n🧪 Testing demand from on-screen menu rows...")
        from types import SimpleNamespace
        from app.services.demand import compute_weekly_demand_from_rows

        menu = [SimpleNamespace(menu_item_id="SALAD001", expected_weekly_orders=50)]
        ingredients = [SimpleNamespace(
            menu_item_id="SALAD001",
            produce_sku="ORG_LETTUCE",
            recipe_qty_per_portion=0.15,
            yield_pct=0.95,
        )]
        demand = compute_weekly_demand_from_rows(menu, ingredients, 0.05)
        expected = 50 * (0.15 / 0.95) * 1.05
        print(f"  ORG_LETTUCE demand: {demand['ORG_LETTUCE']:.4f} kg (expected: {expected:.4f})")
        assert abs(demand["ORG_LETTUCE"] - expected) < 0.001
        print("✅ On-screen demand matches the optimizer helper")
        return True
    except Exception as e:
        print(f"❌ On-screen demand error: {e}")
        return False

def test_pricing_logic():
    """Test pricing calculations"""
    try:
        print("\n🧪 Testing pricing logic...")
        
        from app.services.pricing import plate_cost_per_item, suggest_price
        
        # Test price suggestion
        current_price = 12.00
        target_food_cost_pct = 0.30
        ingredient_cost = 3.60
        
        suggested_price = suggest_price(current_price, target_food_cost_pct, ingredient_cost)
        
        print(f"  Current price: ${current_price:.2f}")
        print(f"  Ingredient cost: ${ingredient_cost:.2f}")
        print(f"  Target food cost %: {target_food_cost_pct:.1%}")
        print(f"  Suggested price: ${suggested_price:.2f}")
        
        # Verify the calculation
        expected_price = ingredient_cost / target_food_cost_pct
        expected_price = round(expected_price * 4) / 4.0  # Round to nearest $0.25
        
        assert abs(suggested_price - expected_price) < 0.01, "Price suggestion calculation incorrect"
        
        print("✅ Pricing logic working correctly")
        return True
        
    except Exception as e:
        print(f"❌ Pricing error: {e}")
        return False

def main():
    """Run all tests"""
    print("🚀 Yieldly Backend Core Functionality Test")
    print("=" * 50)
    
    tests = [
        test_imports,
        test_unit_conversions,
        test_optimization_logic,
        test_screen_menu_demand,
        test_pricing_logic
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        if test():
            passed += 1
        print()
    
    print("=" * 50)
    print(f"📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Core functionality is working.")
        return True
    else:
        print("❌ Some tests failed. Check the errors above.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
