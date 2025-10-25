# Yieldly Backend

AI-powered platform connecting farmers and restaurants for local food sourcing.

## Quick Start

1. **Install dependencies:**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Start the server:**
   ```bash
   python start.py
   ```
   
   Or manually:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

3. **Load sample data:**
   ```bash
   curl -X POST http://localhost:8000/dev/load_sample_data
   ```

4. **Access API docs:**
   - Swagger UI: http://localhost:8000/docs
   - ReDoc: http://localhost:8000/redoc

## API Endpoints

### Farmer Endpoints
- `POST /farmer/upload_offers` - Upload produce offers CSV
- `POST /farmer/send_bids_now` - Simulate sending bids to restaurants

### Restaurant Endpoints
- `POST /restaurant/upload_menu` - Upload menu and ingredients CSVs
- `GET /restaurant/bids` - Get feasible bids for ingredients
- `POST /restaurant/optimize_plan` - Generate optimized purchase plan
- `POST /restaurant/export_po` - Export purchase order CSV
- `POST /restaurant/export_price_changes` - Export price changes CSV

### Development
- `POST /dev/load_sample_data` - Load sample data for demo
- `GET /healthz` - Health check
- `GET /llm/status` - Check LLM service status

## Sample CSV Files

Sample CSV files are provided in `sample_csvs/` directory:

- `farmer_offers.csv` - Example farmer produce offers
- `restaurant_menu.csv` - Example restaurant menu items
- `restaurant_ingredients.csv` - Example ingredient breakdowns

## CSV Format Requirements

### Farmer Offers CSV
Required columns:
- `produce_sku` - Unique product identifier
- `produce_name` - Product name
- `organic` - Boolean (true/false)
- `unit` - Unit of measurement (lb, head, kg, etc.)
- `unit_size` - Size per unit
- `price_per_unit` - Price per unit
- `available_qty` - Available quantity
- `min_order_qty` - Minimum order quantity
- `expiry_date` - Expiry date (YYYY-MM-DD)
- `delivery_fee` - Delivery fee
- `lead_time_days` - Lead time in days

### Restaurant Menu CSV
Required columns:
- `menu_item_id` - Unique menu item identifier
- `menu_item_name` - Menu item name
- `current_price` - Current menu price
- `target_food_cost_pct` - Target food cost percentage (0.0-1.0)
- `expected_weekly_orders` - Expected weekly orders

### Restaurant Ingredients CSV
Required columns:
- `menu_item_id` - Menu item identifier
- `produce_sku` - Produce SKU (matches farmer offers)
- `produce_name` - Ingredient name
- `recipe_qty_per_portion` - Quantity per portion (in kg)
- `yield_pct` - Yield percentage (0.0-1.0)
- `substitutable` - Boolean (true/false)
- `requires_organic` - Boolean (true/false)

## Demo Flow

1. **Load sample data** to populate the database with farms, offers, restaurants, and menu items
2. **Upload farmer offers** using the sample CSV or your own data
3. **Upload restaurant menu** using the sample CSVs or your own data
4. **Get bids** to see available offers for ingredients
5. **Optimize plan** to generate purchase recommendations and price nudges
6. **Export results** as CSV files for purchase orders and price changes

## Architecture

- **API**: FastAPI with automatic OpenAPI documentation
- **Database**: SQLite with SQLAlchemy ORM
- **Processing**: Pandas for CSV parsing and data manipulation
- **Optimization**: Greedy algorithm for purchase planning
- **AI/LLM**: Gemini 2.0 Flash for semantic matching and natural language explanations
- **Storage**: File-based CSV storage in `/data/uploads` and `/data/exports`

## LLM Features (Optional)

The system includes optional LLM-powered features using Google's Gemini 2.0 Flash model:

### Setup
1. Get a Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Set environment variable: `export GEMINI_API_KEY=your_api_key_here`
3. Restart the server

### Features
- **Semantic Ingredient Matching**: Intelligently matches restaurant ingredient needs with farmer offers, even when naming conventions differ (e.g., "roma tomatoes" vs "tomatoes")
- **Natural Language Explanations**: Generates human-readable explanations for optimization decisions and price nudges
- **Fallback Support**: System works perfectly without LLM - falls back to exact matching and standard explanations

### Check Status
```bash
curl http://localhost:8000/llm/status
```

## Key Features

- **Smart Matching**: Matches restaurant ingredient needs with farmer offers
- **Cost Optimization**: Finds lowest-cost sourcing mix considering delivery fees and MOQs
- **Freshness Filtering**: Filters offers by expiry dates and lead times
- **Price Nudges**: Suggests menu price adjustments based on ingredient costs
- **Export Capabilities**: Generates purchase orders and price change reports
- **Local Sourcing**: Prioritizes local suppliers based on ZIP code proximity
