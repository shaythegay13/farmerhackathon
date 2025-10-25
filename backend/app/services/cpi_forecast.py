"""
CPI Forecast Service
Parses and provides CPI forecast data for produce categories
Uses Gemini AI to dynamically map ingredients to CPI categories
"""
import logging
import os
from typing import Dict, List, Optional
from openpyxl import load_workbook
from datetime import datetime
from app.services.llm import llm_service

logger = logging.getLogger(__name__)

class CPIForecastService:
    def __init__(self):
        self.cpi_data = None
        self.load_cpi_data()
    
    def load_cpi_data(self):
        """Load CPI forecast data from Excel file"""
        try:
            cpi_file_path = os.path.join(
                os.path.dirname(__file__),
                "..", "..", "sample_csvs", "CPIForecast.xlsx"
            )
            
            if not os.path.exists(cpi_file_path):
                logger.warning(f"CPI forecast file not found at {cpi_file_path}")
                return
            
            wb = load_workbook(cpi_file_path)
            ws = wb.active
            
            # Parse the Excel data into a structured format
            self.cpi_data = {}
            
            current_category = None
            current_subcategory = None
            current_low_level = None
            
            for row in ws.iter_rows(min_row=2):  # Skip header
                top_level = row[0].value
                aggregate = row[1].value
                mid_level = row[2].value
                low_level = row[3].value
                disaggregate = row[4].value
                attribute = row[5].value
                unit = row[6].value
                value = row[7].value
                
                if not top_level or top_level == "Top-level":
                    continue
                
                # Update current category tracking
                if mid_level:
                    current_category = mid_level
                if low_level:
                    current_low_level = low_level
                if disaggregate:
                    current_subcategory = disaggregate
                
                # Focus on produce-related categories
                if "Fruits and vegetables" in str(current_category) or \
                   "Meats" in str(current_category) or \
                   "Dairy" in str(current_category):
                    
                    # Build category key
                    category_key = self._build_category_key(
                        current_category, current_low_level, current_subcategory
                    )
                    
                    if category_key not in self.cpi_data:
                        self.cpi_data[category_key] = {}
                    
                    # Store forecast data
                    if attribute and value is not None:
                        # Only store numeric values (skip non-numeric entries)
                        try:
                            numeric_value = float(value) if value != "" else None
                            if numeric_value is not None:
                                self.cpi_data[category_key][attribute] = {
                                    "value": numeric_value,
                                    "unit": unit
                                }
                        except (ValueError, TypeError):
                            pass  # Skip non-numeric values
            
            logger.info(f"✅ Loaded CPI forecast data for {len(self.cpi_data)} categories")
            
        except Exception as e:
            logger.error(f"Error loading CPI forecast data: {e}")
            self.cpi_data = {}
    
    def _build_category_key(self, category: str, low_level: Optional[str], subcategory: Optional[str]) -> str:
        """Build a standardized category key"""
        parts = []
        if category:
            parts.append(category)
        if low_level:
            parts.append(low_level)
        if subcategory:
            parts.append(subcategory)
        return " > ".join(parts)
    
    def get_forecast_for_ingredient(self, ingredient_name: str) -> Optional[Dict]:
        """
        Get CPI forecast for a specific ingredient
        Uses Gemini AI to dynamically map ingredients to CPI categories based on CSV data
        """
        if not self.cpi_data:
            return None
        
        # Get available CPI categories
        available_categories = self.get_all_categories()
        
        if not available_categories:
            logger.warning("No CPI categories available")
            return None
        
        # Use Gemini to dynamically map ingredient to best matching CPI category
        matched_category = self._map_ingredient_to_cpi_category_with_ai(ingredient_name, available_categories)
        
        # Fallback to simple matching if AI fails
        if not matched_category:
            matched_category = self._fallback_category_mapping(ingredient_name)
        
        if matched_category and matched_category in self.cpi_data:
            forecast_data = self.cpi_data[matched_category]
            
            # Extract key forecast metrics (safely handle None values)
            forecast_2025_mid = None
            year_over_year = None
            forecast_2026_mid = None
            
            if isinstance(forecast_data, dict):
                forecast_2025_mid = forecast_data.get("Mid point of prediction interval 2025", {})
                if isinstance(forecast_2025_mid, dict):
                    forecast_2025_mid = forecast_2025_mid.get("value")
                
                year_over_year = forecast_data.get("Year-over-year August 2024 to August 2025", {})
                if isinstance(year_over_year, dict):
                    year_over_year = year_over_year.get("value")
                
                forecast_2026_mid = forecast_data.get("Mid point of prediction interval 2026", {})
                if isinstance(forecast_2026_mid, dict):
                    forecast_2026_mid = forecast_2026_mid.get("value")
            
            # Use best available forecast (prefer year-over-year if 2025 mid is 0)
            primary_forecast = forecast_2025_mid
            if (primary_forecast == 0 or primary_forecast is None) and year_over_year:
                primary_forecast = year_over_year
            
            # Use Gemini to research ingredient-specific volatility adjustments
            adjustment = self._get_ingredient_volatility_adjustment(ingredient_name, matched_category, forecast_data)
            
            adjusted_forecast = (primary_forecast if primary_forecast else forecast_2026_mid or 0) + adjustment
            
            # Safely extract remaining forecast data
            forecast_2025_lower = None
            forecast_2025_upper = None
            month_to_month = None
            historical_avg = None
            
            if isinstance(forecast_data, dict):
                lower = forecast_data.get("Lower bound of prediction interval 2025", {})
                if isinstance(lower, dict):
                    forecast_2025_lower = lower.get("value")
                
                upper = forecast_data.get("Upper bound of prediction interval 2025", {})
                if isinstance(upper, dict):
                    forecast_2025_upper = upper.get("value")
                
                month = forecast_data.get("Month-to-month July 2025 to August 2025", {})
                if isinstance(month, dict):
                    month_to_month = month.get("value")
                
                hist = forecast_data.get("20-year historical average", {})
                if isinstance(hist, dict):
                    historical_avg = hist.get("value")
            
            return {
                "category": matched_category,
                "forecast_2025_mid": forecast_2025_mid,
                "forecast_2025_lower": forecast_2025_lower,
                "forecast_2025_upper": forecast_2025_upper,
                "forecast_2026_mid": forecast_2026_mid,
                "year_over_year": year_over_year,
                "month_to_month": month_to_month,
                "historical_avg": historical_avg,
                "primary_forecast": adjusted_forecast,
                "base_forecast": primary_forecast if primary_forecast else forecast_2026_mid or 0,
                "adjustment": adjustment,
            }
        
        return None
    
    def _map_ingredient_to_cpi_category_with_ai(self, ingredient_name: str, available_categories: List[str]) -> Optional[str]:
        """
        Use Gemini AI with Brave Search MCP to dynamically map an ingredient to the best matching CPI category
        Uses real market research to understand ingredient classification
        """
        if not llm_service.enabled or not available_categories:
            return None
        
        try:
            # Get market context from Brave Search to help with classification
            from app.services.market_intelligence import market_intelligence_service
            import asyncio
            
            market_context = ""
            try:
                # Use try-except with timeout to avoid circular dependency issues
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    # If loop is already running, skip market context
                    logger.debug("Event loop already running, skipping market context")
                else:
                    search_results = asyncio.run(
                        asyncio.wait_for(
                            market_intelligence_service.search_market_trends(ingredient_name),
                            timeout=2.0
                        )
                    )
                    if search_results.get("data_source"):
                        market_context = f"""
Market Research Context:
- Industry Classification: {search_results.get('current_price_trend', 'unknown')}
- Market Category Indicators: {', '.join(search_results.get('seasonal_factors', [])[:3])}
"""
            except (asyncio.TimeoutError, RuntimeError, Exception) as e:
                logger.debug(f"Could not get market context for category mapping: {e}")
            
            # Create a prompt for Gemini to match ingredient to CPI category
            categories_list = "\n".join([f"- {cat}" for cat in available_categories[:30]])  # Limit to first 30 for prompt size
            
            prompt = f"""
You are a food category expert. Match the following ingredient to the most appropriate CPI (Consumer Price Index) food category.

Ingredient: {ingredient_name}

{market_context}

Available CPI Categories:
{categories_list}

Use market research insights to help classify this ingredient. Return ONLY the exact category name that best matches this ingredient. Think about:
- The ingredient's type (vegetable, fruit, meat, dairy, etc.)
- How it's typically classified in economic/food price data
- Market context from web research
- The closest match in the provided categories

Return format: Just the category name, nothing else.
"""
            
            response = llm_service.model.generate_content(prompt)
            matched_category = response.text.strip()
            
            # Clean up the response
            matched_category = matched_category.replace('"', '').replace("'", "").strip()
            
            # Verify the category exists
            if matched_category in available_categories:
                logger.info(f"✅ AI matched '{ingredient_name}' to CPI category: {matched_category} (using Brave Search research)")
                return matched_category
            else:
                # Try fuzzy matching
                for cat in available_categories:
                    if matched_category.lower() in cat.lower() or cat.lower() in matched_category.lower():
                        logger.info(f"✅ AI fuzzy-matched '{ingredient_name}' to CPI category: {cat}")
                        return cat
                
                logger.warning(f"⚠️ AI returned category '{matched_category}' not found in available categories")
                return None
                
        except Exception as e:
            logger.error(f"Error in AI category mapping: {e}")
            return None
    
    def _get_ingredient_volatility_adjustment(self, ingredient_name: str, category: str, forecast_data: Dict) -> float:
        """
        Use Gemini AI with Brave Search MCP to research and determine ingredient-specific volatility adjustments
        based on real-time market research data
        """
        if not llm_service.enabled:
            return 0.0  # No adjustment if AI not available
        
        try:
            # Import market intelligence service to use Brave Search
            from app.services.market_intelligence import market_intelligence_service
            
            # Get relevant forecast data for context
            base_forecast = forecast_data.get("Year-over-year August 2024 to August 2025", {}).get("value", 0)
            historical_avg = forecast_data.get("20-year historical average", {}).get("value", 0)
            
            # Use Brave Search via market intelligence service to get real market data
            # Skip if event loop is already running to avoid circular dependency
            import asyncio
            market_context = ""
            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    # Skip market research if loop is running (circular dependency prevention)
                    logger.debug("Event loop running, skipping Brave Search for volatility")
                else:
                    search_results = asyncio.run(
                        asyncio.wait_for(
                            market_intelligence_service.search_market_trends(ingredient_name),
                            timeout=2.0
                        )
                    )
                    # Extract market insights from Brave Search results
                    if search_results.get("data_source") == "brave_search_api" or search_results.get("data_source") == "cpi_forecast_plus_brave_search":
                        market_context = f"""
Recent Market Research (from Brave Search):
- Current Trend: {search_results.get('current_price_trend', 'unknown')}
- Price Forecast: {search_results.get('price_forecast', 'unknown')}
- Seasonal Factors: {', '.join(search_results.get('seasonal_factors', []))}
- Sources Analyzed: {search_results.get('sources_analyzed', 0)}
"""
            except (asyncio.TimeoutError, RuntimeError, Exception) as e:
                logger.debug(f"Could not get market research for volatility: {e}")
            
            prompt = f"""
Analyze the price volatility characteristics of this ingredient compared to its CPI category average, using real market research data.

Ingredient: {ingredient_name}
CPI Category: {category}
Category Forecast: {base_forecast}% year-over-year
Category Historical Average: {historical_avg}%

{market_context}

Research and analyze:
- Storage/shelf life characteristics
- Seasonal variation patterns
- Supply chain complexity
- Import/export dependencies
- Weather sensitivity
- Market concentration
- Recent market trends from web research

Provide a volatility adjustment percentage (positive if more volatile, negative if less volatile).
The adjustment should typically range from -1.0% to +1.0% based on the research data.

Return ONLY a number with no text. Example: 0.3 or -0.2
"""
            
            response = llm_service.model.generate_content(prompt)
            adjustment_text = response.text.strip()
            
            # Extract number from response
            try:
                adjustment = float(adjustment_text.replace('%', '').strip())
                # Clamp to reasonable range
                adjustment = max(-1.0, min(1.0, adjustment))
                logger.info(f"✅ AI volatility adjustment for '{ingredient_name}' (using Brave Search research): {adjustment:.2f}%")
                return adjustment
            except ValueError:
                logger.warning(f"⚠️ Could not parse volatility adjustment: {adjustment_text}")
                return 0.0
                
        except Exception as e:
            logger.error(f"Error getting volatility adjustment: {e}")
            return 0.0
    
    def _fallback_category_mapping(self, ingredient_name: str) -> Optional[str]:
        """
        Fallback category mapping using simple keyword matching
        """
        ingredient_lower = ingredient_name.lower()
        
        # Simple keyword-based fallback
        if any(word in ingredient_lower for word in ["vegetable", "vegetables", "lettuce", "tomato", "onion", "carrot"]):
            return "Fruits and vegetables > Fresh fruits and vegetables > Fresh vegetables"
        elif any(word in ingredient_lower for word in ["fruit", "fruits", "apple", "banana", "orange"]):
            return "Fruits and vegetables > Fresh fruits and vegetables > Fresh fruits"
        elif any(word in ingredient_lower for word in ["meat", "beef", "pork", "chicken", "turkey"]):
            # Try to find a specific meat category
            for category in self.get_all_categories():
                if "meat" in category.lower() or "poultry" in category.lower():
                    return category
            return "Meats, poultry, and fish > Meats"
        elif any(word in ingredient_lower for word in ["dairy", "milk", "cheese", "butter", "yogurt"]):
            return "Dairy and related products"
        
        return None
    
    def get_all_categories(self) -> List[str]:
        """Get all available CPI categories"""
        return list(self.cpi_data.keys()) if self.cpi_data else []

# Global instance
cpi_forecast_service = CPIForecastService()
