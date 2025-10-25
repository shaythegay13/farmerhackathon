from typing import List, Dict
from app.schemas import OfferRow, PlanRow
from app.services.offers import landed_cost_per_kg

def greedy_optimize(demand_by_sku: Dict[str, float], offer_rows: List[OfferRow]) -> List[PlanRow]:
    """
    Greedy optimization algorithm for purchase planning
    
    Args:
        demand_by_sku: Dict mapping produce_sku to required_kg
        offer_rows: List of feasible offers with landed cost estimates
    
    Returns:
        List of PlanRow objects representing the optimized purchase plan
    """
    plan = []
    
    for sku, need_kg in demand_by_sku.items():
        # Filter offers for this SKU
        sku_offers = [o for o in offer_rows if o.produce_sku == sku]
        
        if not sku_offers:
            continue
        
        # Sort by landed cost (ascending)
        sku_offers.sort(key=lambda o: o.landed_cost_per_kg)
        
        remaining_need = need_kg
        
        for offer in sku_offers:
            if remaining_need <= 0:
                break
            
            # Calculate allocation respecting available quantity and MOQ
            alloc_kg = min(remaining_need, offer.available_qty_kg)
            
            if alloc_kg <= 0:
                continue
            
            # Handle minimum order quantity
            moq_overbuy = 0.0
            if offer.min_order_qty_kg and alloc_kg < offer.min_order_qty_kg:
                moq_overbuy = offer.min_order_qty_kg - alloc_kg
                alloc_kg = offer.min_order_qty_kg
            
            # Recalculate landed cost with actual allocation
            actual_landed_cost = landed_cost_per_kg(
                type('Offer', (), {
                    'price_per_unit': offer.price_per_unit,
                    'unit_size_kg': offer.unit_size_kg,
                    'delivery_fee_flat': offer.delivery_fee_flat,
                    'min_order_qty_kg': offer.min_order_qty_kg
                })(),
                alloc_kg
            )
            
            total_cost = alloc_kg * actual_landed_cost
            
            # Build reasons string
            reasons_parts = [
                f"Cheapest available",
                f"expiry {offer.expiry_date}",
                f"lead {offer.lead_time_days}d",
                f"organic:{'✅' if offer.organic else '❌'}"
            ]
            
            if moq_overbuy > 0:
                reasons_parts.append(f"MOQ → +{moq_overbuy:.2f}kg carryover")
            
            reasons = "; ".join(reasons_parts)
            
            plan_row = PlanRow(
                produce_sku=sku,
                farm_id=offer.farm_id,
                qty_kg=alloc_kg,
                landed_cost_per_kg=actual_landed_cost,
                total=total_cost,
                reasons=reasons
            )
            
            plan.append(plan_row)
            
            # Update remaining need (don't count carryover as coverage)
            remaining_need -= (alloc_kg - moq_overbuy)
    
    return plan

def calculate_optimized_cost(plan: List[PlanRow]) -> float:
    """
    Calculate total cost from optimized plan
    
    Args:
        plan: List of PlanRow objects
    
    Returns:
        Total optimized cost
    """
    return sum(row.total for row in plan)

def calculate_savings(baseline_cost: float, optimized_cost: float) -> float:
    """
    Calculate savings vs baseline
    
    Args:
        baseline_cost: Baseline total cost
        optimized_cost: Optimized total cost
    
    Returns:
        Savings amount
    """
    return baseline_cost - optimized_cost

def get_unit_cost_by_sku(plan: List[PlanRow]) -> Dict[str, float]:
    """
    Calculate weighted average unit cost per SKU from plan
    
    Args:
        plan: List of PlanRow objects
    
    Returns:
        Dict mapping produce_sku to weighted average cost per kg
    """
    sku_costs = {}
    sku_quantities = {}
    
    for row in plan:
        sku = row.produce_sku
        if sku not in sku_costs:
            sku_costs[sku] = 0.0
            sku_quantities[sku] = 0.0
        
        sku_costs[sku] += row.total
        sku_quantities[sku] += row.qty_kg
    
    # Calculate weighted averages
    unit_costs = {}
    for sku in sku_costs:
        if sku_quantities[sku] > 0:
            unit_costs[sku] = sku_costs[sku] / sku_quantities[sku]
        else:
            unit_costs[sku] = 0.0
    
    return unit_costs
