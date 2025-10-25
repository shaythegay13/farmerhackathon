export interface FarmerOffer {
  farm_id: string;
  farm_name: string;
  produce_sku: string;
  produce_name: string;
  organic: boolean;
  unit: string;
  unit_size: number;
  price_per_unit: number;
  available_qty: number;
  min_order_qty: number;
  expiry_date: string;
  origin_zip: string;
  delivery_fee_flat: number;
  lead_time_days: number;
}

export interface RestaurantMenuItem {
  menu_item_id: string;
  menu_item_name: string;
  current_price: number;
  target_food_cost_pct: number;
  expected_weekly_orders: number;
}

export interface RestaurantIngredient {
  menu_item_id: string;
  produce_sku: string;
  ingredient_name: string;
  recipe_qty_per_portion: number;
  recipe_unit: string;
  yield_pct: number;
  substitutable: boolean;
  requires_organic: boolean;
}

export const farmerOffers: FarmerOffer[] = [
  {
    farm_id: "F001",
    farm_name: "Sunrise Acres",
    produce_sku: "TOM-001",
    produce_name: "Tomato (Campari)",
    organic: true,
    unit: "case",
    unit_size: 5,
    price_per_unit: 8.50,
    available_qty: 100,
    min_order_qty: 10,
    expiry_date: "2025-11-20",
    origin_zip: "10001",
    delivery_fee_flat: 15,
    lead_time_days: 1
  },
  {
    farm_id: "F002",
    farm_name: "Green Valley Farm",
    produce_sku: "BAS-001",
    produce_name: "Basil (Fresh)",
    organic: true,
    unit: "bunch",
    unit_size: 0.5,
    price_per_unit: 3.20,
    available_qty: 80,
    min_order_qty: 20,
    expiry_date: "2025-11-15",
    origin_zip: "10002",
    delivery_fee_flat: 12,
    lead_time_days: 1
  },
  {
    farm_id: "F003",
    farm_name: "Heritage Farms",
    produce_sku: "ONI-001",
    produce_name: "Red Onion",
    organic: false,
    unit: "bag",
    unit_size: 10,
    price_per_unit: 12.00,
    available_qty: 120,
    min_order_qty: 5,
    expiry_date: "2025-12-01",
    origin_zip: "10003",
    delivery_fee_flat: 18,
    lead_time_days: 2
  },
  {
    farm_id: "F004",
    farm_name: "Pasture Perfect",
    produce_sku: "CHK-001",
    produce_name: "Chicken Breast (Free Range)",
    organic: true,
    unit: "case",
    unit_size: 5,
    price_per_unit: 32.50,
    available_qty: 40,
    min_order_qty: 8,
    expiry_date: "2025-11-18",
    origin_zip: "10004",
    delivery_fee_flat: 20,
    lead_time_days: 2
  },
  {
    farm_id: "F005",
    farm_name: "Garden Fresh Co",
    produce_sku: "LET-001",
    produce_name: "Romaine Lettuce",
    organic: true,
    unit: "case",
    unit_size: 3,
    price_per_unit: 6.80,
    available_qty: 90,
    min_order_qty: 15,
    expiry_date: "2025-11-17",
    origin_zip: "10005",
    delivery_fee_flat: 14,
    lead_time_days: 1
  },
  {
    farm_id: "F001",
    farm_name: "Sunrise Acres",
    produce_sku: "TOM-002",
    produce_name: "Tomato (Roma)",
    organic: false,
    unit: "case",
    unit_size: 5,
    price_per_unit: 6.20,
    available_qty: 150,
    min_order_qty: 10,
    expiry_date: "2025-11-22",
    origin_zip: "10001",
    delivery_fee_flat: 15,
    lead_time_days: 1
  }
];

export const restaurantMenu: RestaurantMenuItem[] = [
  {
    menu_item_id: "M001",
    menu_item_name: "Tomato Basil Pasta",
    current_price: 16.00,
    target_food_cost_pct: 28,
    expected_weekly_orders: 85
  },
  {
    menu_item_id: "M002",
    menu_item_name: "Herbed Chicken Bowl",
    current_price: 18.00,
    target_food_cost_pct: 30,
    expected_weekly_orders: 65
  },
  {
    menu_item_id: "M003",
    menu_item_name: "Caesar Salad",
    current_price: 12.00,
    target_food_cost_pct: 25,
    expected_weekly_orders: 95
  },
  {
    menu_item_id: "M004",
    menu_item_name: "Garden Veggie Medley",
    current_price: 14.50,
    target_food_cost_pct: 26,
    expected_weekly_orders: 55
  }
];

export const restaurantIngredients: RestaurantIngredient[] = [
  {
    menu_item_id: "M001",
    produce_sku: "TOM-001",
    ingredient_name: "Tomato (Campari)",
    recipe_qty_per_portion: 0.15,
    recipe_unit: "kg",
    yield_pct: 90,
    substitutable: true,
    requires_organic: false
  },
  {
    menu_item_id: "M001",
    produce_sku: "BAS-001",
    ingredient_name: "Basil (Fresh)",
    recipe_qty_per_portion: 0.02,
    recipe_unit: "kg",
    yield_pct: 95,
    substitutable: false,
    requires_organic: true
  },
  {
    menu_item_id: "M001",
    produce_sku: "ONI-001",
    ingredient_name: "Red Onion",
    recipe_qty_per_portion: 0.05,
    recipe_unit: "kg",
    yield_pct: 85,
    substitutable: true,
    requires_organic: false
  },
  {
    menu_item_id: "M002",
    produce_sku: "CHK-001",
    ingredient_name: "Chicken Breast (Free Range)",
    recipe_qty_per_portion: 0.18,
    recipe_unit: "kg",
    yield_pct: 92,
    substitutable: false,
    requires_organic: true
  },
  {
    menu_item_id: "M002",
    produce_sku: "LET-001",
    ingredient_name: "Romaine Lettuce",
    recipe_qty_per_portion: 0.12,
    recipe_unit: "kg",
    yield_pct: 88,
    substitutable: true,
    requires_organic: true
  },
  {
    menu_item_id: "M002",
    produce_sku: "TOM-001",
    ingredient_name: "Tomato (Campari)",
    recipe_qty_per_portion: 0.08,
    recipe_unit: "kg",
    yield_pct: 90,
    substitutable: true,
    requires_organic: false
  },
  {
    menu_item_id: "M003",
    produce_sku: "LET-001",
    ingredient_name: "Romaine Lettuce",
    recipe_qty_per_portion: 0.15,
    recipe_unit: "kg",
    yield_pct: 88,
    substitutable: false,
    requires_organic: true
  },
  {
    menu_item_id: "M004",
    produce_sku: "ONI-001",
    ingredient_name: "Red Onion",
    recipe_qty_per_portion: 0.08,
    recipe_unit: "kg",
    yield_pct: 85,
    substitutable: true,
    requires_organic: false
  },
  {
    menu_item_id: "M004",
    produce_sku: "TOM-002",
    ingredient_name: "Tomato (Roma)",
    recipe_qty_per_portion: 0.12,
    recipe_unit: "kg",
    yield_pct: 90,
    substitutable: true,
    requires_organic: false
  }
];
