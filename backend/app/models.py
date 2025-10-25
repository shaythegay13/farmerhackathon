from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, Date, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./yieldly.db")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class Farm(Base):
    __tablename__ = "farms"
    
    id = Column(Integer, primary_key=True, index=True)
    farm_id = Column(String, unique=True, index=True)
    farm_name = Column(String)
    origin_zip = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    produce_offers = relationship("ProduceOffer", back_populates="farm")

class ProduceOffer(Base):
    __tablename__ = "produce_offers"
    
    id = Column(Integer, primary_key=True, index=True)
    farm_id = Column(Integer, ForeignKey("farms.id"))
    produce_sku = Column(String, index=True)
    produce_name = Column(String)
    organic = Column(Boolean, default=False)
    unit = Column(String)
    unit_size_kg = Column(Float)
    price_per_unit = Column(Float)
    available_qty_kg = Column(Float)
    min_order_qty_kg = Column(Float)
    expiry_date = Column(Date)
    delivery_fee_flat = Column(Float, default=0.0)
    lead_time_days = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    farm = relationship("Farm", back_populates="produce_offers")

class Restaurant(Base):
    __tablename__ = "restaurants"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    restaurant_zip = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    menu_items = relationship("MenuItem", back_populates="restaurant")
    ingredients = relationship("Ingredient", back_populates="restaurant")

class MenuItem(Base):
    __tablename__ = "menu_items"
    
    id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id"))
    menu_item_id = Column(String, index=True)
    menu_item_name = Column(String)
    current_price = Column(Float)
    target_food_cost_pct = Column(Float)
    expected_weekly_orders = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    restaurant = relationship("Restaurant", back_populates="menu_items")
    ingredients = relationship("Ingredient", back_populates="menu_item")

class Ingredient(Base):
    __tablename__ = "ingredients"
    
    id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id"))
    menu_item_id = Column(String, ForeignKey("menu_items.menu_item_id"))
    produce_sku = Column(String, index=True)
    ingredient_name = Column(String)
    recipe_qty_per_portion_kg = Column(Float)
    yield_pct = Column(Float)
    substitutable = Column(Boolean, default=False)
    requires_organic = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    restaurant = relationship("Restaurant", back_populates="ingredients")
    menu_item = relationship("MenuItem", back_populates="ingredients")

class UnitConversion(Base):
    __tablename__ = "unit_conversions"
    
    id = Column(Integer, primary_key=True, index=True)
    produce_sku = Column(String, index=True)
    unit = Column(String)
    unit_size_kg = Column(Float)

# Create all tables
Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
