from typing import List, Dict
from datetime import date, datetime
from sqlalchemy.orm import Session
from app.models import ProduceOffer, Farm
from app.schemas import OfferRow, Constraints
from app.services.llm import llm_service

def landed_cost_per_kg(offer: ProduceOffer, allocated_kg: float) -> float:
    """
    Calculate landed cost per kg for an offer
    
    Args:
        offer: ProduceOffer object
        allocated_kg: Amount being allocated (for delivery fee allocation)
    
    Returns:
        Landed cost per kg
    """
    # Base cost per kg
    base_cost = offer.price_per_unit / offer.unit_size_kg
    
    # Delivery fee allocation - spread over allocated quantity or min order quantity
    denominator = max(allocated_kg, offer.min_order_qty_kg or 1.0)
    delivery_cost = (offer.delivery_fee_flat or 0.0) / denominator
    
    return base_cost + delivery_cost

def feasible_offers(offers: List[ProduceOffer], constraints: Constraints, 
                   today: date, restaurant_zip: str) -> List[OfferRow]:
    """
    Filter offers based on constraints
    
    Args:
        offers: List of ProduceOffer objects
        constraints: Constraints object with filtering criteria
        today: Current date
        restaurant_zip: Restaurant's ZIP code
    
    Returns:
        List of feasible OfferRow objects
    """
    feasible = []
    
    for offer in offers:
        # Check organic requirement
        if constraints.organic_only and not offer.organic:
            continue
        
        # Check expiry date
        if (offer.expiry_date - today).days < constraints.min_expiry_days:
            continue
        
        # Check lead time
        if offer.lead_time_days > constraints.max_lead_days:
            continue
        
        # Check locality (V1: simple ZIP prefix matching)
        if constraints.local_only:
            if not offer.farm.origin_zip.startswith(restaurant_zip[:3]):
                continue
        
        # Create OfferRow with initial landed cost estimate
        # Use min_order_qty for initial estimate
        initial_alloc = offer.min_order_qty_kg or 1.0
        landed_cost = landed_cost_per_kg(offer, initial_alloc)
        
        offer_row = OfferRow(
            farm_id=offer.farm_id,
            farm_name=offer.farm.farm_name,
            produce_sku=offer.produce_sku,
            produce_name=offer.produce_name,
            organic=offer.organic,
            unit_size_kg=offer.unit_size_kg,
            price_per_unit=offer.price_per_unit,
            available_qty_kg=offer.available_qty_kg,
            min_order_qty_kg=offer.min_order_qty_kg,
            expiry_date=offer.expiry_date,
            delivery_fee_flat=offer.delivery_fee_flat,
            lead_time_days=offer.lead_time_days,
            origin_zip=offer.farm.origin_zip,
            landed_cost_per_kg=landed_cost
        )
        
        feasible.append(offer_row)
    
    return feasible

def get_offers_for_sku(produce_sku: str, db: Session) -> List[ProduceOffer]:
    """
    Get all available offers for a specific produce SKU
    
    Args:
        produce_sku: The produce SKU to search for
        db: Database session
    
    Returns:
        List of ProduceOffer objects
    """
    return db.query(ProduceOffer).join(Farm).filter(
        ProduceOffer.produce_sku == produce_sku
    ).all()

def get_semantic_offers_for_ingredients(restaurant_ingredients: List, db: Session) -> Dict[str, List[ProduceOffer]]:
    """
    Get offers for restaurant ingredients using semantic matching
    
    Args:
        restaurant_ingredients: List of Ingredient objects
        db: Database session
    
    Returns:
        Dict mapping ingredient SKU to list of matching offers
    """
    # Get all available offers
    all_offers = get_all_offers(db)
    
    # Use LLM for semantic matching
    semantic_matches = llm_service.semantic_ingredient_matching(restaurant_ingredients, all_offers)
    
    # Build result dictionary
    result = {}
    for ingredient in restaurant_ingredients:
        sku = ingredient.produce_sku
        matching_skus = semantic_matches.get(sku, [sku])  # Fallback to exact match
        
        # Get offers for all matching SKUs
        offers = []
        for match_sku in matching_skus:
            offers.extend([offer for offer in all_offers if offer.produce_sku == match_sku])
        
        result[sku] = offers
    
    return result

def get_all_offers(db: Session) -> List[ProduceOffer]:
    """
    Get all available offers
    
    Args:
        db: Database session
    
    Returns:
        List of all ProduceOffer objects
    """
    return db.query(ProduceOffer).join(Farm).all()

def calculate_baseline_cost(demand_by_sku: Dict[str, float], db: Session) -> float:
    """
    Calculate baseline cost using cheapest offer per SKU (ignoring constraints)
    
    Args:
        demand_by_sku: Dict mapping produce_sku to required_kg
        db: Database session
    
    Returns:
        Total baseline cost
    """
    total_cost = 0.0
    
    for sku, required_kg in demand_by_sku.items():
        offers = get_offers_for_sku(sku, db)
        if not offers:
            continue
        
        # Find cheapest offer (by price per unit)
        cheapest_offer = min(offers, key=lambda o: o.price_per_unit / o.unit_size_kg)
        
        # Calculate cost for required quantity
        base_cost_per_kg = cheapest_offer.price_per_unit / cheapest_offer.unit_size_kg
        delivery_cost = cheapest_offer.delivery_fee_flat or 0.0
        
        # Use min order quantity for delivery allocation
        alloc_kg = max(required_kg, cheapest_offer.min_order_qty_kg or 1.0)
        landed_cost_per_kg = base_cost_per_kg + (delivery_cost / alloc_kg)
        
        total_cost += required_kg * landed_cost_per_kg
    
    return total_cost
