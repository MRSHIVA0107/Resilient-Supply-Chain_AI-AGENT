"""Supply chain domain entities models."""
import enum
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class NodeType(str, enum.Enum):
    SUPPLIER = "SUPPLIER"
    PLANT = "PLANT"
    DC = "DC"


class ProductType(str, enum.Enum):
    RAW_COMPONENT = "RAW_COMPONENT"
    FINISHED_GOOD = "FINISHED_GOOD"


class PriorityLevel(str, enum.Enum):
    NORMAL = "NORMAL"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class Node(Base):
    __tablename__ = "nodes"

    id = Column(String(50), primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    node_type = Column(Enum(NodeType), nullable=False, index=True)
    location = Column(String(100), nullable=False)
    capacity_per_day = Column(Float, default=1000.0, nullable=False)
    holding_cost_multiplier = Column(Float, default=1.0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class Product(Base):
    __tablename__ = "products"

    id = Column(String(50), primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    product_type = Column(Enum(ProductType), nullable=False, index=True)
    unit_holding_cost_per_day = Column(Float, default=0.5, nullable=False)
    unit_backorder_penalty_per_day = Column(Float, default=50.0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class BillOfMaterials(Base):
    __tablename__ = "bill_of_materials"

    id = Column(String(50), primary_key=True, index=True)
    parent_product_id = Column(String(50), ForeignKey("products.id"), nullable=False, index=True)
    component_product_id = Column(String(50), ForeignKey("products.id"), nullable=False, index=True)
    quantity_required = Column(Float, default=1.0, nullable=False)


class TransportLane(Base):
    __tablename__ = "transport_lanes"

    id = Column(String(50), primary_key=True, index=True)
    origin_node_id = Column(String(50), ForeignKey("nodes.id"), nullable=False, index=True)
    destination_node_id = Column(String(50), ForeignKey("nodes.id"), nullable=False, index=True)
    normal_lead_time_days = Column(Integer, nullable=False)
    normal_cost_per_unit = Column(Float, nullable=False)
    expedited_lead_time_days = Column(Integer, nullable=False)
    expedited_cost_per_unit = Column(Float, nullable=False)
    daily_capacity = Column(Float, default=500.0, nullable=False)


class SupplierItemCapability(Base):
    __tablename__ = "supplier_capabilities"

    id = Column(String(50), primary_key=True, index=True)
    supplier_id = Column(String(50), ForeignKey("nodes.id"), nullable=False, index=True)
    product_id = Column(String(50), ForeignKey("products.id"), nullable=False, index=True)
    unit_cost = Column(Float, nullable=False)
    min_order_quantity = Column(Float, default=10.0, nullable=False)
    max_daily_capacity = Column(Float, default=500.0, nullable=False)
    lead_time_days = Column(Integer, default=2, nullable=False)
    is_qualified = Column(Boolean, default=True, nullable=False)


class InventoryRecord(Base):
    __tablename__ = "inventory_records"

    id = Column(String(50), primary_key=True, index=True)
    scenario_id = Column(String(50), ForeignKey("scenarios.id"), nullable=False, index=True)
    node_id = Column(String(50), ForeignKey("nodes.id"), nullable=False, index=True)
    product_id = Column(String(50), ForeignKey("products.id"), nullable=False, index=True)
    day = Column(Integer, nullable=False, default=1)
    on_hand = Column(Float, default=0.0, nullable=False)
    reserved = Column(Float, default=0.0, nullable=False)
    safety_stock = Column(Float, default=0.0, nullable=False)


class ConfirmedInboundShipment(Base):
    __tablename__ = "confirmed_inbound_shipments"

    id = Column(String(50), primary_key=True, index=True)
    scenario_id = Column(String(50), ForeignKey("scenarios.id"), nullable=False, index=True)
    origin_node_id = Column(String(50), ForeignKey("nodes.id"), nullable=False)
    destination_node_id = Column(String(50), ForeignKey("nodes.id"), nullable=False)
    product_id = Column(String(50), ForeignKey("products.id"), nullable=False)
    quantity = Column(Float, nullable=False)
    dispatch_day = Column(Integer, nullable=False)
    arrival_day = Column(Integer, nullable=False)
    is_expedited = Column(Boolean, default=False, nullable=False)


class DemandRecord(Base):
    __tablename__ = "demand_records"

    id = Column(String(50), primary_key=True, index=True)
    scenario_id = Column(String(50), ForeignKey("scenarios.id"), nullable=False, index=True)
    node_id = Column(String(50), ForeignKey("nodes.id"), nullable=False, index=True)
    product_id = Column(String(50), ForeignKey("products.id"), nullable=False, index=True)
    day = Column(Integer, nullable=False, index=True)
    quantity = Column(Float, nullable=False)
    priority = Column(Enum(PriorityLevel), default=PriorityLevel.NORMAL, nullable=False)
