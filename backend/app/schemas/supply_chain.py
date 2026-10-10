"""Supply chain network schemas."""
from typing import List, Optional
from pydantic import BaseModel, Field
from app.models.supply_chain import NodeType, ProductType, PriorityLevel


class NodeBase(BaseModel):
    id: str
    name: str
    node_type: NodeType
    location: str
    capacity_per_day: float = Field(default=1000.0, ge=0.0)
    holding_cost_multiplier: float = Field(default=1.0, ge=0.0)


class NodeSchema(NodeBase):
    class Config:
        from_attributes = True


class ProductBase(BaseModel):
    id: str
    name: str
    product_type: ProductType
    unit_holding_cost_per_day: float = Field(default=0.5, ge=0.0)
    unit_backorder_penalty_per_day: float = Field(default=50.0, ge=0.0)


class ProductSchema(ProductBase):
    class Config:
        from_attributes = True


class BillOfMaterialsBase(BaseModel):
    id: str
    parent_product_id: str
    component_product_id: str
    quantity_required: float = Field(default=1.0, gt=0.0)


class BillOfMaterialsSchema(BillOfMaterialsBase):
    class Config:
        from_attributes = True


class TransportLaneBase(BaseModel):
    id: str
    origin_node_id: str
    destination_node_id: str
    normal_lead_time_days: int = Field(default=2, ge=1)
    normal_cost_per_unit: float = Field(default=10.0, ge=0.0)
    expedited_lead_time_days: int = Field(default=1, ge=1)
    expedited_cost_per_unit: float = Field(default=35.0, ge=0.0)
    daily_capacity: float = Field(default=500.0, ge=0.0)


class TransportLaneSchema(TransportLaneBase):
    class Config:
        from_attributes = True


class SupplierCapabilityBase(BaseModel):
    id: str
    supplier_id: str
    product_id: str
    unit_cost: float = Field(default=20.0, ge=0.0)
    min_order_quantity: float = Field(default=10.0, ge=0.0)
    max_daily_capacity: float = Field(default=500.0, ge=0.0)
    lead_time_days: int = Field(default=2, ge=1)
    is_qualified: bool = True


class SupplierCapabilitySchema(SupplierCapabilityBase):
    class Config:
        from_attributes = True


class InventoryRecordBase(BaseModel):
    id: str
    scenario_id: str
    node_id: str
    product_id: str
    day: int = Field(default=1, ge=1)
    on_hand: float = Field(default=0.0, ge=0.0)
    reserved: float = Field(default=0.0, ge=0.0)
    safety_stock: float = Field(default=0.0, ge=0.0)


class InventoryRecordSchema(InventoryRecordBase):
    class Config:
        from_attributes = True


class ConfirmedInboundShipmentBase(BaseModel):
    id: str
    scenario_id: str
    origin_node_id: str
    destination_node_id: str
    product_id: str
    quantity: float = Field(gt=0.0)
    dispatch_day: int = Field(ge=0)
    arrival_day: int = Field(ge=1)
    is_expedited: bool = False


class ConfirmedInboundShipmentSchema(ConfirmedInboundShipmentBase):
    class Config:
        from_attributes = True


class DemandRecordBase(BaseModel):
    id: str
    scenario_id: str
    node_id: str
    product_id: str
    day: int = Field(ge=1)
    quantity: float = Field(ge=0.0)
    priority: PriorityLevel = PriorityLevel.NORMAL


class DemandRecordSchema(DemandRecordBase):
    class Config:
        from_attributes = True


class FullNetworkData(BaseModel):
    nodes: List[NodeSchema]
    products: List[ProductSchema]
    boms: List[BillOfMaterialsSchema]
    lanes: List[TransportLaneSchema]
    supplier_capabilities: List[SupplierCapabilitySchema]
    initial_inventory: List[InventoryRecordSchema]
    confirmed_inbound_shipments: List[ConfirmedInboundShipmentSchema]
    demands: List[DemandRecordSchema]
