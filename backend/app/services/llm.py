import os
import logging
from typing import List, Dict, Optional, Tuple
import google.generativeai as genai
from app.models import ProduceOffer, Ingredient

logger = logging.getLogger(__name__)

class LLMService:
    """Service for LLM-powered semantic analysis and explanations"""
    
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        self.model = None
        self.enabled = False
        
        if self.api_key:
            try:
                genai.configure(api_key=self.api_key)
                self.model = genai.GenerativeModel('gemini-2.0-flash-exp')
                self.enabled = True
                logger.info("✅ Gemini LLM service initialized")
            except Exception as e:
                logger.warning(f"❌ Failed to initialize Gemini LLM: {e}")
                self.enabled = False
        else:
            logger.info("⚠️ GEMINI_API_KEY not found, LLM features disabled")
    
    def semantic_ingredient_matching(self, restaurant_ingredients: List[Ingredient], 
                                   available_offers: List[ProduceOffer]) -> Dict[str, List[str]]:
        """
        Use LLM to find semantic matches between restaurant ingredients and farmer offers
        
        Args:
            restaurant_ingredients: List of ingredients needed by restaurant
            available_offers: List of available produce offers from farmers
            
        Returns:
            Dict mapping restaurant ingredient SKU to list of matching offer SKUs
        """
        if not self.enabled:
            return self._fallback_exact_matching(restaurant_ingredients, available_offers)
        
        try:
            # Prepare data for LLM
            restaurant_skus = [ing.produce_sku for ing in restaurant_ingredients]
            offer_skus = [offer.produce_sku for offer in available_offers]
            
            prompt = f"""
You are an expert food matching system. Match restaurant ingredient needs with farmer produce offers.

RESTAURANT INGREDIENTS NEEDED:
{restaurant_skus}

FARMER PRODUCE OFFERS AVAILABLE:
{offer_skus}

For each restaurant ingredient, identify which farmer offers could potentially satisfy that need.
Consider:
- Exact matches (same name)
- Semantic matches (different names for same ingredient)
- Culinary substitutions (similar ingredients that could work)

Return ONLY a JSON object in this format:
{{
    "restaurant_sku": ["matching_offer_sku1", "matching_offer_sku2"],
    ...
}}

Be conservative - only suggest matches that make culinary sense.
"""
            
            response = self.model.generate_content(prompt)
            
            # Parse JSON response
            import json
            matches = json.loads(response.text.strip())
            
            logger.info(f"🤖 LLM semantic matching completed: {len(matches)} matches found")
            return matches
            
        except Exception as e:
            logger.warning(f"❌ LLM semantic matching failed: {e}, falling back to exact matching")
            return self._fallback_exact_matching(restaurant_ingredients, available_offers)
    
    def generate_optimization_explanation(self, purchase_plan: List[Dict], 
                                       savings_amount: float, 
                                       constraints: Dict) -> str:
        """
        Generate natural language explanation for optimization decisions
        
        Args:
            purchase_plan: List of purchase plan items
            savings_amount: Total savings vs baseline
            constraints: Optimization constraints used
            
        Returns:
            Natural language explanation
        """
        if not self.enabled:
            return self._fallback_explanation(purchase_plan, savings_amount, constraints)
        
        try:
            # Prepare data for LLM
            plan_summary = []
            for item in purchase_plan[:5]:  # Limit to first 5 items for prompt
                plan_summary.append(f"- {item['produce_sku']}: {item['qty_kg']:.1f}kg from {item['farm_name']} at ${item['landed_cost_per_kg']:.2f}/kg")
            
            prompt = f"""
You are an AI food sourcing expert explaining optimization decisions to a restaurant manager.

OPTIMIZATION RESULTS:
Total Weekly Savings: ${savings_amount:.2f}

PURCHASE PLAN (sample):
{chr(10).join(plan_summary)}

CONSTRAINTS APPLIED:
- Freshness: Min {constraints.get('min_expiry_days', 5)} days expiry
- Lead Time: Max {constraints.get('max_lead_days', 2)} days
- Organic Only: {constraints.get('organic_only', False)}
- Local Sourcing: {constraints.get('local_only', False)}

Generate a clear, professional explanation (2-3 sentences) that:
1. Explains the key optimization strategy
2. Highlights the main cost savings
3. Mentions any important constraints or trade-offs

Keep it concise and business-focused.
"""
            
            response = self.model.generate_content(prompt)
            explanation = response.text.strip()
            
            logger.info("🤖 LLM optimization explanation generated")
            return explanation
            
        except Exception as e:
            logger.warning(f"❌ LLM explanation generation failed: {e}, using fallback")
            return self._fallback_explanation(purchase_plan, savings_amount, constraints)
    
    def generate_price_nudge_explanation(self, menu_item: str, current_price: float, 
                                      suggested_price: float, delta: float, 
                                      ingredient_cost: float) -> str:
        """
        Generate explanation for menu price nudges
        
        Args:
            menu_item: Name of menu item
            current_price: Current menu price
            suggested_price: Suggested new price
            delta: Price change amount
            ingredient_cost: New ingredient cost per portion
            
        Returns:
            Natural language explanation
        """
        if not self.enabled:
            return f"Price adjusted to maintain target food cost percentage based on current ingredient costs."
        
        try:
            prompt = f"""
You are a restaurant pricing consultant explaining menu price adjustments.

MENU ITEM: {menu_item}
CURRENT PRICE: ${current_price:.2f}
SUGGESTED PRICE: ${suggested_price:.2f}
PRICE CHANGE: ${delta:+.2f}
NEW INGREDIENT COST: ${ingredient_cost:.2f}

Generate a brief, professional explanation (1-2 sentences) for why this price adjustment is recommended.
Focus on maintaining profitability while being fair to customers.
"""
            
            response = self.model.generate_content(prompt)
            explanation = response.text.strip()
            
            logger.info(f"🤖 LLM price nudge explanation generated for {menu_item}")
            return explanation
            
        except Exception as e:
            logger.warning(f"❌ LLM price explanation failed: {e}, using fallback")
            return f"Price adjusted to maintain target food cost percentage based on current ingredient costs."
    
    def _fallback_exact_matching(self, restaurant_ingredients: List[Ingredient], 
                               available_offers: List[ProduceOffer]) -> Dict[str, List[str]]:
        """Fallback to exact SKU matching when LLM is unavailable"""
        matches = {}
        offer_skus = [offer.produce_sku for offer in available_offers]
        
        for ingredient in restaurant_ingredients:
            if ingredient.produce_sku in offer_skus:
                matches[ingredient.produce_sku] = [ingredient.produce_sku]
        
        return matches
    
    def _fallback_explanation(self, purchase_plan: List[Dict], savings_amount: float, 
                            constraints: Dict) -> str:
        """Fallback explanation when LLM is unavailable"""
        return f"Optimized sourcing plan saves ${savings_amount:.2f} weekly by selecting the most cost-effective suppliers while meeting freshness and quality requirements."

# Global LLM service instance
llm_service = LLMService()
