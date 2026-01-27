from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import random
import string
from bson import ObjectId

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'gram-panchayat-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Demo OTP Mode
DEMO_MODE = os.environ.get('DEMO_MODE', 'true').lower() == 'true'
DEMO_OTP = "123456"

# Create the main app
app = FastAPI(title="Digital Gram Property & Tax Management System - Maharashtra")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ===================== MODELS =====================

class UserRole:
    SUPER_ADMIN = "super_admin"
    TALATHI = "talathi"
    GRAMSEVAK = "gramsevak"
    DATA_ENTRY = "data_entry"
    AUDITOR = "auditor"
    CITIZEN = "citizen"

class OTPRequest(BaseModel):
    phone: str

class OTPVerify(BaseModel):
    phone: str
    otp: str

class UserCreate(BaseModel):
    name: str
    phone: str
    role: str = UserRole.CITIZEN
    village: Optional[str] = None
    taluka: Optional[str] = None
    district: Optional[str] = None

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    phone: str
    role: str
    village: Optional[str] = None
    taluka: Optional[str] = None
    district: Optional[str] = None
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# Property Model (Namuna 9)
class PropertyCreate(BaseModel):
    owner_name: str
    owner_name_mr: str
    house_no: str
    ward_no: str
    survey_no: Optional[str] = None
    plot_area_sqm: float
    built_up_area_sqm: float
    usage_type: str  # residential, commercial, mixed
    floor_count: int = 1
    construction_type: str  # pucca, semi_pucca, kaccha
    water_connection: bool = False
    electricity_connection: bool = False
    village: str
    taluka: str
    district: str
    address: Optional[str] = None
    phone: Optional[str] = None

class PropertyUpdate(BaseModel):
    owner_name: Optional[str] = None
    owner_name_mr: Optional[str] = None
    house_no: Optional[str] = None
    ward_no: Optional[str] = None
    survey_no: Optional[str] = None
    plot_area_sqm: Optional[float] = None
    built_up_area_sqm: Optional[float] = None
    usage_type: Optional[str] = None
    floor_count: Optional[int] = None
    construction_type: Optional[str] = None
    water_connection: Optional[bool] = None
    electricity_connection: Optional[bool] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    update_reason: str

class PropertyResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    property_id: str
    owner_name: str
    owner_name_mr: str
    house_no: str
    ward_no: str
    survey_no: Optional[str] = None
    plot_area_sqm: float
    built_up_area_sqm: float
    usage_type: str
    floor_count: int
    construction_type: str
    water_connection: bool
    electricity_connection: bool
    village: str
    taluka: str
    district: str
    address: Optional[str] = None
    phone: Optional[str] = None
    is_measured: bool
    created_at: str
    updated_at: str

# Tax Rate Model
class TaxRateCreate(BaseModel):
    financial_year: str
    usage_type: str
    rate_per_sqm: float
    floor_factor: Dict[str, float] = {"1": 1.0, "2": 1.1, "3": 1.2}
    construction_factor: Dict[str, float] = {"pucca": 1.0, "semi_pucca": 0.8, "kaccha": 0.6}
    water_tax_rate: float = 0
    light_tax_rate: float = 0
    cleaning_tax_rate: float = 0
    rebate_percent: float = 5.0
    penalty_percent: float = 12.0

class TaxRateResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    financial_year: str
    usage_type: str
    rate_per_sqm: float
    floor_factor: Dict[str, float]
    construction_factor: Dict[str, float]
    water_tax_rate: float
    light_tax_rate: float
    cleaning_tax_rate: float
    rebate_percent: float
    penalty_percent: float
    is_locked: bool
    created_at: str

# Demand Model (Namuna 8)
class DemandCreate(BaseModel):
    property_id: str
    financial_year: str

class DemandResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    demand_id: str
    property_id: str
    property_details: Optional[Dict[str, Any]] = None
    financial_year: str
    house_tax: float
    water_tax: float
    light_tax: float
    cleaning_tax: float
    total_tax: float
    arrears: float
    rebate: float
    penalty: float
    net_demand: float
    amount_paid: float
    balance: float
    status: str
    created_at: str
    updated_at: str

# Audit Log Model
class AuditLogResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    entity_type: str
    entity_id: str
    action: str
    old_value: Optional[Dict[str, Any]] = None
    new_value: Optional[Dict[str, Any]] = None
    reason: Optional[str] = None
    user_id: str
    user_name: str
    timestamp: str
    ip_address: Optional[str] = None

# Dashboard Stats
class DashboardStats(BaseModel):
    total_properties: int
    measured_properties: int
    pending_measurement: int
    total_demand: float
    total_collection: float
    total_arrears: float
    current_fy: str

# ===================== HELPER FUNCTIONS =====================

def generate_otp():
    if DEMO_MODE:
        return DEMO_OTP
    return ''.join(random.choices(string.digits, k=6))

def generate_property_id():
    return f"PROP-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"

def generate_demand_id():
    return f"DEM-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"

def create_jwt_token(user_id: str, phone: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "phone": phone,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def create_audit_log(entity_type: str, entity_id: str, action: str, user: dict, old_value: dict = None, new_value: dict = None, reason: str = None):
    audit_log = {
        "id": str(uuid.uuid4()),
        "entity_type": entity_type,
        "entity_id": entity_id,
        "action": action,
        "old_value": old_value,
        "new_value": new_value,
        "reason": reason,
        "user_id": user.get("id"),
        "user_name": user.get("name"),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "ip_address": None
    }
    await db.audit_logs.insert_one(audit_log)

def get_current_financial_year():
    now = datetime.now()
    if now.month >= 4:
        return f"{now.year}-{now.year + 1}"
    return f"{now.year - 1}-{now.year}"

# ===================== AUTH ROUTES =====================

@api_router.post("/auth/send-otp")
async def send_otp(request: OTPRequest):
    otp = generate_otp()
    otp_doc = {
        "id": str(uuid.uuid4()),
        "phone": request.phone,
        "otp": otp,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat(),
        "verified": False
    }
    await db.otp_sessions.delete_many({"phone": request.phone})
    await db.otp_sessions.insert_one(otp_doc)
    
    if DEMO_MODE:
        return {"message": "OTP sent successfully", "demo_mode": True, "hint": "Use 123456 for demo"}
    return {"message": "OTP sent successfully"}

@api_router.post("/auth/verify-otp", response_model=TokenResponse)
async def verify_otp(request: OTPVerify):
    otp_session = await db.otp_sessions.find_one({"phone": request.phone, "verified": False}, {"_id": 0})
    
    if not otp_session:
        raise HTTPException(status_code=400, detail="OTP session not found. Please request a new OTP.")
    
    expires_at = datetime.fromisoformat(otp_session["expires_at"].replace('Z', '+00:00'))
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=400, detail="OTP expired. Please request a new OTP.")
    
    if otp_session["otp"] != request.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    await db.otp_sessions.update_one({"id": otp_session["id"]}, {"$set": {"verified": True}})
    
    user = await db.users.find_one({"phone": request.phone}, {"_id": 0})
    
    if not user:
        user = {
            "id": str(uuid.uuid4()),
            "name": f"User-{request.phone[-4:]}",
            "phone": request.phone,
            "role": UserRole.CITIZEN,
            "village": None,
            "taluka": None,
            "district": None,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user)
    
    token = create_jwt_token(user["id"], user["phone"], user["role"])
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(**user)
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_current_user(user: dict = Depends(verify_token)):
    return UserResponse(**user)

@api_router.put("/auth/profile", response_model=UserResponse)
async def update_profile(data: UserCreate, user: dict = Depends(verify_token)):
    update_data = {
        "name": data.name,
        "village": data.village,
        "taluka": data.taluka,
        "district": data.district
    }
    await db.users.update_one({"id": user["id"]}, {"$set": update_data})
    updated_user = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    return UserResponse(**updated_user)

# ===================== USER MANAGEMENT ROUTES =====================

@api_router.get("/users", response_model=List[UserResponse])
async def get_users(user: dict = Depends(verify_token)):
    if user["role"] not in [UserRole.SUPER_ADMIN, UserRole.GRAMSEVAK]:
        raise HTTPException(status_code=403, detail="Access denied")
    users = await db.users.find({}, {"_id": 0}).to_list(1000)
    return [UserResponse(**u) for u in users]

@api_router.put("/users/{user_id}/role")
async def update_user_role(user_id: str, role: str, user: dict = Depends(verify_token)):
    if user["role"] != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Only Super Admin can change roles")
    valid_roles = [UserRole.SUPER_ADMIN, UserRole.TALATHI, UserRole.GRAMSEVAK, UserRole.DATA_ENTRY, UserRole.AUDITOR, UserRole.CITIZEN]
    if role not in valid_roles:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    target_user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    old_role = target_user["role"]
    await db.users.update_one({"id": user_id}, {"$set": {"role": role}})
    await create_audit_log("user", user_id, "role_change", user, {"role": old_role}, {"role": role}, f"Role changed from {old_role} to {role}")
    
    return {"message": "Role updated successfully"}

# ===================== PROPERTY ROUTES (NAMUNA 9) =====================

@api_router.post("/properties", response_model=PropertyResponse)
async def create_property(data: PropertyCreate, user: dict = Depends(verify_token)):
    if user["role"] not in [UserRole.SUPER_ADMIN, UserRole.GRAMSEVAK, UserRole.DATA_ENTRY, UserRole.TALATHI]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    property_doc = {
        "id": str(uuid.uuid4()),
        "property_id": generate_property_id(),
        **data.model_dump(),
        "is_measured": data.plot_area_sqm > 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user["id"]
    }
    
    await db.properties.insert_one(property_doc)
    await create_audit_log("property", property_doc["id"], "create", user, None, property_doc, "New property created")
    
    return PropertyResponse(**property_doc)

@api_router.get("/properties", response_model=List[PropertyResponse])
async def get_properties(
    search: Optional[str] = None,
    ward: Optional[str] = None,
    village: Optional[str] = None,
    user: dict = Depends(verify_token)
):
    query = {}
    if search:
        query["$or"] = [
            {"owner_name": {"$regex": search, "$options": "i"}},
            {"owner_name_mr": {"$regex": search, "$options": "i"}},
            {"house_no": {"$regex": search, "$options": "i"}},
            {"property_id": {"$regex": search, "$options": "i"}}
        ]
    if ward:
        query["ward_no"] = ward
    if village:
        query["village"] = village
    
    properties = await db.properties.find(query, {"_id": 0}).to_list(1000)
    return [PropertyResponse(**p) for p in properties]

@api_router.get("/properties/{property_id}", response_model=PropertyResponse)
async def get_property(property_id: str, user: dict = Depends(verify_token)):
    prop = await db.properties.find_one({"id": property_id}, {"_id": 0})
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    return PropertyResponse(**prop)

@api_router.put("/properties/{property_id}", response_model=PropertyResponse)
async def update_property(property_id: str, data: PropertyUpdate, user: dict = Depends(verify_token)):
    if user["role"] not in [UserRole.SUPER_ADMIN, UserRole.GRAMSEVAK, UserRole.DATA_ENTRY, UserRole.TALATHI]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    old_prop = await db.properties.find_one({"id": property_id}, {"_id": 0})
    if not old_prop:
        raise HTTPException(status_code=404, detail="Property not found")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None and k != "update_reason"}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    if "plot_area_sqm" in update_data and update_data["plot_area_sqm"] > 0:
        update_data["is_measured"] = True
    
    await db.properties.update_one({"id": property_id}, {"$set": update_data})
    await create_audit_log("property", property_id, "update", user, old_prop, update_data, data.update_reason)
    
    updated_prop = await db.properties.find_one({"id": property_id}, {"_id": 0})
    return PropertyResponse(**updated_prop)

@api_router.delete("/properties/{property_id}")
async def delete_property(property_id: str, reason: str, user: dict = Depends(verify_token)):
    if user["role"] not in [UserRole.SUPER_ADMIN]:
        raise HTTPException(status_code=403, detail="Only Super Admin can delete properties")
    
    prop = await db.properties.find_one({"id": property_id}, {"_id": 0})
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    
    await db.properties.delete_one({"id": property_id})
    await create_audit_log("property", property_id, "delete", user, prop, None, reason)
    
    return {"message": "Property deleted successfully"}

# ===================== TAX RATE ROUTES =====================

@api_router.post("/tax-rates", response_model=TaxRateResponse)
async def create_tax_rate(data: TaxRateCreate, user: dict = Depends(verify_token)):
    if user["role"] not in [UserRole.SUPER_ADMIN, UserRole.GRAMSEVAK]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    existing = await db.tax_rates.find_one({"financial_year": data.financial_year, "usage_type": data.usage_type}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Tax rate already exists for this year and usage type")
    
    tax_rate_doc = {
        "id": str(uuid.uuid4()),
        **data.model_dump(),
        "is_locked": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user["id"]
    }
    
    await db.tax_rates.insert_one(tax_rate_doc)
    await create_audit_log("tax_rate", tax_rate_doc["id"], "create", user, None, tax_rate_doc, "New tax rate created")
    
    return TaxRateResponse(**tax_rate_doc)

@api_router.get("/tax-rates", response_model=List[TaxRateResponse])
async def get_tax_rates(financial_year: Optional[str] = None, user: dict = Depends(verify_token)):
    query = {}
    if financial_year:
        query["financial_year"] = financial_year
    tax_rates = await db.tax_rates.find(query, {"_id": 0}).to_list(100)
    return [TaxRateResponse(**tr) for tr in tax_rates]

@api_router.put("/tax-rates/{rate_id}/lock")
async def lock_tax_rate(rate_id: str, user: dict = Depends(verify_token)):
    if user["role"] != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Only Super Admin can lock tax rates")
    
    rate = await db.tax_rates.find_one({"id": rate_id}, {"_id": 0})
    if not rate:
        raise HTTPException(status_code=404, detail="Tax rate not found")
    
    await db.tax_rates.update_one({"id": rate_id}, {"$set": {"is_locked": True}})
    await create_audit_log("tax_rate", rate_id, "lock", user, {"is_locked": False}, {"is_locked": True}, "Financial year locked")
    
    return {"message": "Tax rate locked successfully"}

# ===================== DEMAND ROUTES (NAMUNA 8) =====================

async def calculate_tax(property_doc: dict, tax_rate: dict) -> dict:
    area = property_doc.get("built_up_area_sqm", 0)
    floor_count = str(property_doc.get("floor_count", 1))
    construction_type = property_doc.get("construction_type", "pucca")
    
    base_rate = tax_rate.get("rate_per_sqm", 0)
    floor_factor = tax_rate.get("floor_factor", {}).get(floor_count, 1.0)
    construction_factor = tax_rate.get("construction_factor", {}).get(construction_type, 1.0)
    
    house_tax = area * base_rate * floor_factor * construction_factor
    water_tax = tax_rate.get("water_tax_rate", 0) if property_doc.get("water_connection") else 0
    light_tax = tax_rate.get("light_tax_rate", 0) if property_doc.get("electricity_connection") else 0
    cleaning_tax = tax_rate.get("cleaning_tax_rate", 0)
    
    total_tax = house_tax + water_tax + light_tax + cleaning_tax
    
    return {
        "house_tax": round(house_tax, 2),
        "water_tax": round(water_tax, 2),
        "light_tax": round(light_tax, 2),
        "cleaning_tax": round(cleaning_tax, 2),
        "total_tax": round(total_tax, 2)
    }

@api_router.post("/demands", response_model=DemandResponse)
async def create_demand(data: DemandCreate, user: dict = Depends(verify_token)):
    if user["role"] not in [UserRole.SUPER_ADMIN, UserRole.GRAMSEVAK, UserRole.DATA_ENTRY, UserRole.TALATHI]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    property_doc = await db.properties.find_one({"id": data.property_id}, {"_id": 0})
    if not property_doc:
        raise HTTPException(status_code=404, detail="Property not found")
    
    existing_demand = await db.demands.find_one({"property_id": data.property_id, "financial_year": data.financial_year}, {"_id": 0})
    if existing_demand:
        raise HTTPException(status_code=400, detail="Demand already exists for this property and year")
    
    tax_rate = await db.tax_rates.find_one({"financial_year": data.financial_year, "usage_type": property_doc["usage_type"]}, {"_id": 0})
    if not tax_rate:
        raise HTTPException(status_code=400, detail="Tax rate not configured for this year and usage type")
    
    tax_calc = await calculate_tax(property_doc, tax_rate)
    
    previous_demand = await db.demands.find_one(
        {"property_id": data.property_id, "balance": {"$gt": 0}},
        {"_id": 0},
        sort=[("financial_year", -1)]
    )
    arrears = previous_demand["balance"] if previous_demand else 0
    
    net_demand = tax_calc["total_tax"] + arrears
    
    demand_doc = {
        "id": str(uuid.uuid4()),
        "demand_id": generate_demand_id(),
        "property_id": data.property_id,
        "financial_year": data.financial_year,
        **tax_calc,
        "arrears": round(arrears, 2),
        "rebate": 0,
        "penalty": 0,
        "net_demand": round(net_demand, 2),
        "amount_paid": 0,
        "balance": round(net_demand, 2),
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user["id"]
    }
    
    await db.demands.insert_one(demand_doc)
    await create_audit_log("demand", demand_doc["id"], "create", user, None, demand_doc, "New demand created")
    
    demand_doc["property_details"] = {
        "owner_name": property_doc["owner_name"],
        "owner_name_mr": property_doc["owner_name_mr"],
        "house_no": property_doc["house_no"],
        "ward_no": property_doc["ward_no"]
    }
    
    return DemandResponse(**demand_doc)

@api_router.get("/demands", response_model=List[DemandResponse])
async def get_demands(
    financial_year: Optional[str] = None,
    status: Optional[str] = None,
    property_id: Optional[str] = None,
    user: dict = Depends(verify_token)
):
    query = {}
    if financial_year:
        query["financial_year"] = financial_year
    if status:
        query["status"] = status
    if property_id:
        query["property_id"] = property_id
    
    demands = await db.demands.find(query, {"_id": 0}).to_list(1000)
    
    for demand in demands:
        prop = await db.properties.find_one({"id": demand["property_id"]}, {"_id": 0})
        if prop:
            demand["property_details"] = {
                "owner_name": prop["owner_name"],
                "owner_name_mr": prop["owner_name_mr"],
                "house_no": prop["house_no"],
                "ward_no": prop["ward_no"]
            }
    
    return [DemandResponse(**d) for d in demands]

@api_router.post("/demands/{demand_id}/payment")
async def record_payment(demand_id: str, amount: float, payment_mode: str = "cash", user: dict = Depends(verify_token)):
    if user["role"] not in [UserRole.SUPER_ADMIN, UserRole.GRAMSEVAK, UserRole.DATA_ENTRY, UserRole.TALATHI]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    demand = await db.demands.find_one({"id": demand_id}, {"_id": 0})
    if not demand:
        raise HTTPException(status_code=404, detail="Demand not found")
    
    old_amount_paid = demand["amount_paid"]
    new_amount_paid = old_amount_paid + amount
    new_balance = demand["net_demand"] - new_amount_paid
    new_status = "paid" if new_balance <= 0 else "partial"
    
    update_data = {
        "amount_paid": round(new_amount_paid, 2),
        "balance": round(max(0, new_balance), 2),
        "status": new_status,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.demands.update_one({"id": demand_id}, {"$set": update_data})
    
    payment_doc = {
        "id": str(uuid.uuid4()),
        "demand_id": demand_id,
        "property_id": demand["property_id"],
        "amount": amount,
        "payment_mode": payment_mode,
        "receipt_no": f"RCP-{datetime.now().strftime('%Y%m%d%H%M%S')}",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user["id"]
    }
    await db.payments.insert_one(payment_doc)
    
    await create_audit_log("demand", demand_id, "payment", user, {"amount_paid": old_amount_paid}, {"amount_paid": new_amount_paid, "payment": amount}, f"Payment of ₹{amount} received via {payment_mode}")
    
    return {"message": "Payment recorded successfully", "receipt_no": payment_doc["receipt_no"], "balance": update_data["balance"]}

# ===================== AUDIT LOG ROUTES =====================

@api_router.get("/audit-logs", response_model=List[AuditLogResponse])
async def get_audit_logs(
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    user: dict = Depends(verify_token)
):
    if user["role"] not in [UserRole.SUPER_ADMIN, UserRole.AUDITOR, UserRole.GRAMSEVAK]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    query = {}
    if entity_type:
        query["entity_type"] = entity_type
    if entity_id:
        query["entity_id"] = entity_id
    
    logs = await db.audit_logs.find(query, {"_id": 0}).sort("timestamp", -1).to_list(500)
    return [AuditLogResponse(**log) for log in logs]

# ===================== DASHBOARD ROUTES =====================

@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(user: dict = Depends(verify_token)):
    current_fy = get_current_financial_year()
    
    total_properties = await db.properties.count_documents({})
    measured_properties = await db.properties.count_documents({"is_measured": True})
    pending_measurement = total_properties - measured_properties
    
    demands = await db.demands.find({"financial_year": current_fy}, {"_id": 0}).to_list(10000)
    total_demand = sum(d["net_demand"] for d in demands)
    total_collection = sum(d["amount_paid"] for d in demands)
    total_arrears = sum(d["balance"] for d in demands)
    
    return DashboardStats(
        total_properties=total_properties,
        measured_properties=measured_properties,
        pending_measurement=pending_measurement,
        total_demand=round(total_demand, 2),
        total_collection=round(total_collection, 2),
        total_arrears=round(total_arrears, 2),
        current_fy=current_fy
    )

@api_router.get("/dashboard/ward-summary")
async def get_ward_summary(user: dict = Depends(verify_token)):
    current_fy = get_current_financial_year()
    
    properties = await db.properties.find({}, {"_id": 0, "ward_no": 1, "id": 1}).to_list(10000)
    ward_map = {}
    for p in properties:
        ward = p.get("ward_no", "Unknown")
        if ward not in ward_map:
            ward_map[ward] = {"ward": ward, "properties": 0, "demand": 0, "collection": 0, "arrears": 0}
        ward_map[ward]["properties"] += 1
    
    demands = await db.demands.find({"financial_year": current_fy}, {"_id": 0}).to_list(10000)
    for d in demands:
        prop = await db.properties.find_one({"id": d["property_id"]}, {"_id": 0, "ward_no": 1})
        if prop:
            ward = prop.get("ward_no", "Unknown")
            if ward in ward_map:
                ward_map[ward]["demand"] += d["net_demand"]
                ward_map[ward]["collection"] += d["amount_paid"]
                ward_map[ward]["arrears"] += d["balance"]
    
    return list(ward_map.values())

# ===================== SEED DATA =====================

@api_router.post("/seed-data")
async def seed_data(user: dict = Depends(verify_token)):
    if user["role"] != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Only Super Admin can seed data")
    
    current_fy = get_current_financial_year()
    
    tax_rates = [
        {"financial_year": current_fy, "usage_type": "residential", "rate_per_sqm": 2.5, "water_tax_rate": 500, "light_tax_rate": 300, "cleaning_tax_rate": 200, "floor_factor": {"1": 1.0, "2": 1.1, "3": 1.2}, "construction_factor": {"pucca": 1.0, "semi_pucca": 0.8, "kaccha": 0.6}, "rebate_percent": 5.0, "penalty_percent": 12.0},
        {"financial_year": current_fy, "usage_type": "commercial", "rate_per_sqm": 5.0, "water_tax_rate": 1000, "light_tax_rate": 600, "cleaning_tax_rate": 400, "floor_factor": {"1": 1.0, "2": 1.15, "3": 1.3}, "construction_factor": {"pucca": 1.0, "semi_pucca": 0.85, "kaccha": 0.7}, "rebate_percent": 3.0, "penalty_percent": 15.0},
        {"financial_year": current_fy, "usage_type": "mixed", "rate_per_sqm": 3.5, "water_tax_rate": 750, "light_tax_rate": 450, "cleaning_tax_rate": 300, "floor_factor": {"1": 1.0, "2": 1.12, "3": 1.25}, "construction_factor": {"pucca": 1.0, "semi_pucca": 0.82, "kaccha": 0.65}, "rebate_percent": 4.0, "penalty_percent": 13.0}
    ]
    
    for tr in tax_rates:
        existing = await db.tax_rates.find_one({"financial_year": tr["financial_year"], "usage_type": tr["usage_type"]})
        if not existing:
            tr["id"] = str(uuid.uuid4())
            tr["is_locked"] = False
            tr["created_at"] = datetime.now(timezone.utc).isoformat()
            tr["created_by"] = user["id"]
            await db.tax_rates.insert_one(tr)
    
    sample_properties = [
        {"owner_name": "Ramesh Patil", "owner_name_mr": "रमेश पाटील", "house_no": "101", "ward_no": "1", "survey_no": "S-101", "plot_area_sqm": 200, "built_up_area_sqm": 150, "usage_type": "residential", "floor_count": 2, "construction_type": "pucca", "water_connection": True, "electricity_connection": True, "village": "Shivane", "taluka": "Haveli", "district": "Pune"},
        {"owner_name": "Suresh Jadhav", "owner_name_mr": "सुरेश जाधव", "house_no": "102", "ward_no": "1", "survey_no": "S-102", "plot_area_sqm": 150, "built_up_area_sqm": 120, "usage_type": "residential", "floor_count": 1, "construction_type": "semi_pucca", "water_connection": True, "electricity_connection": True, "village": "Shivane", "taluka": "Haveli", "district": "Pune"},
        {"owner_name": "Ganesh Traders", "owner_name_mr": "गणेश ट्रेडर्स", "house_no": "201", "ward_no": "2", "survey_no": "S-201", "plot_area_sqm": 300, "built_up_area_sqm": 250, "usage_type": "commercial", "floor_count": 2, "construction_type": "pucca", "water_connection": True, "electricity_connection": True, "village": "Shivane", "taluka": "Haveli", "district": "Pune"},
        {"owner_name": "Vijay Kulkarni", "owner_name_mr": "विजय कुलकर्णी", "house_no": "301", "ward_no": "3", "survey_no": "S-301", "plot_area_sqm": 180, "built_up_area_sqm": 140, "usage_type": "mixed", "floor_count": 3, "construction_type": "pucca", "water_connection": True, "electricity_connection": True, "village": "Shivane", "taluka": "Haveli", "district": "Pune"},
        {"owner_name": "Anil Shinde", "owner_name_mr": "अनिल शिंदे", "house_no": "302", "ward_no": "3", "survey_no": "S-302", "plot_area_sqm": 100, "built_up_area_sqm": 80, "usage_type": "residential", "floor_count": 1, "construction_type": "kaccha", "water_connection": False, "electricity_connection": True, "village": "Shivane", "taluka": "Haveli", "district": "Pune"}
    ]
    
    for prop in sample_properties:
        existing = await db.properties.find_one({"house_no": prop["house_no"], "ward_no": prop["ward_no"]})
        if not existing:
            prop["id"] = str(uuid.uuid4())
            prop["property_id"] = generate_property_id()
            prop["is_measured"] = True
            prop["created_at"] = datetime.now(timezone.utc).isoformat()
            prop["updated_at"] = datetime.now(timezone.utc).isoformat()
            prop["created_by"] = user["id"]
            await db.properties.insert_one(prop)
    
    return {"message": "Seed data created successfully"}

# Root route
@api_router.get("/")
async def root():
    return {"message": "Digital Gram Property & Tax Management System - Maharashtra", "version": "1.0.0"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
