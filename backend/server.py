from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import uuid
import logging
import random
from datetime import datetime, timezone, timedelta, date

import bcrypt
import jwt
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, Query
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional, Literal

# -------------------------------------------------------------------
# Setup
# -------------------------------------------------------------------
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="FitMore API")
api = APIRouter(prefix="/api")

JWT_ALGO = "HS256"
JWT_SECRET = os.environ["JWT_SECRET"]
ACCESS_MIN = 60 * 24  # 1 day access token for demo comfort
REFRESH_DAYS = 30

Roles = Literal["owner", "manager", "receptionist", "trainer", "member"]


# -------------------------------------------------------------------
# Helpers
# -------------------------------------------------------------------
def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat()


def hash_pw(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()


def verify_pw(p: str, h: str) -> bool:
    try:
        return bcrypt.checkpw(p.encode(), h.encode())
    except Exception:
        return False


def make_access(user_id: str, role: str) -> str:
    return jwt.encode(
        {"sub": user_id, "role": role, "type": "access",
         "exp": now_utc() + timedelta(minutes=ACCESS_MIN)},
        JWT_SECRET, algorithm=JWT_ALGO)


def make_refresh(user_id: str) -> str:
    return jwt.encode(
        {"sub": user_id, "type": "refresh",
         "exp": now_utc() + timedelta(days=REFRESH_DAYS)},
        JWT_SECRET, algorithm=JWT_ALGO)


def set_auth_cookies(response: Response, access: str, refresh: str):
    response.set_cookie("access_token", access, httponly=True, secure=True,
                        samesite="none", max_age=ACCESS_MIN * 60, path="/")
    response.set_cookie("refresh_token", refresh, httponly=True, secure=True,
                        samesite="none", max_age=REFRESH_DAYS * 86400, path="/")


def clear_auth_cookies(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
        if payload.get("type") != "access":
            raise HTTPException(401, "Invalid token type")
        user = await db.users.find_one({"id": payload["sub"]})
        if not user:
            raise HTTPException(401, "User not found")
        user.pop("_id", None)
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")


def require_roles(*allowed: str):
    async def dep(user: dict = Depends(get_current_user)):
        if user["role"] not in allowed:
            raise HTTPException(403, "Insufficient role")
        return user
    return dep


def clean(doc):
    if doc is None:
        return None
    doc.pop("_id", None)
    doc.pop("password_hash", None)
    return doc


# -------------------------------------------------------------------
# Models
# -------------------------------------------------------------------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str
    role: Roles = "owner"


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class MemberIn(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str
    email: Optional[EmailStr] = None
    phone: str
    gender: Optional[Literal["male", "female", "other"]] = "male"
    dob: Optional[str] = None
    address: Optional[str] = ""
    branch_id: Optional[str] = None
    plan_id: Optional[str] = None
    trainer_id: Optional[str] = None
    join_date: Optional[str] = None
    notes: Optional[str] = ""
    avatar: Optional[str] = None
    emergency_contact: Optional[str] = ""
    status: Optional[Literal["active", "expired", "frozen", "cancelled"]] = "active"


class PlanIn(BaseModel):
    name: str
    duration_days: int
    price: float
    features: List[str] = []
    color: Optional[str] = "#FF3B30"
    description: Optional[str] = ""


class TrainerIn(BaseModel):
    name: str
    email: Optional[EmailStr] = None
    phone: str
    specialization: str
    experience_years: int = 0
    branch_id: Optional[str] = None
    hourly_rate: float = 0
    bio: Optional[str] = ""
    avatar: Optional[str] = None


class CheckInIn(BaseModel):
    member_id: Optional[str] = None
    lookup: Optional[str] = None  # accept member code or phone
    method: Literal["qr", "id", "mobile", "rfid", "reception"] = "reception"


class PaymentIn(BaseModel):
    member_id: str
    amount: float
    plan_id: Optional[str] = None
    method: Literal["cash", "upi", "card", "bank", "other"] = "cash"
    note: Optional[str] = ""


class ExpenseIn(BaseModel):
    title: str
    amount: float
    category: str
    date: Optional[str] = None
    note: Optional[str] = ""
    branch_id: Optional[str] = None


class LeadIn(BaseModel):
    name: str
    phone: str
    email: Optional[EmailStr] = None
    source: str = "walk-in"
    stage: Literal["new", "contacted", "trial", "converted", "lost"] = "new"
    notes: Optional[str] = ""
    interest: Optional[str] = ""


class BranchIn(BaseModel):
    name: str
    address: str
    phone: str
    manager_name: Optional[str] = ""


class StaffIn(BaseModel):
    name: str
    email: EmailStr
    phone: str
    role: Literal["manager", "receptionist", "trainer"]
    branch_id: Optional[str] = None
    salary: float = 0


# -------------------------------------------------------------------
# Auth Endpoints
# -------------------------------------------------------------------
@api.post("/auth/register")
async def register(body: RegisterIn, response: Response):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "Email already registered")
    user = {
        "id": str(uuid.uuid4()),
        "email": email,
        "password_hash": hash_pw(body.password),
        "name": body.name,
        "role": body.role,
        "created_at": iso(now_utc()),
    }
    await db.users.insert_one(user)
    access = make_access(user["id"], user["role"])
    refresh = make_refresh(user["id"])
    set_auth_cookies(response, access, refresh)
    return clean(user)


@api.post("/auth/login")
async def login(body: LoginIn, response: Response):
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_pw(body.password, user["password_hash"]):
        raise HTTPException(401, "Invalid email or password")
    access = make_access(user["id"], user["role"])
    refresh = make_refresh(user["id"])
    set_auth_cookies(response, access, refresh)
    return clean(user)


@api.post("/auth/logout")
async def logout(response: Response, user: dict = Depends(get_current_user)):
    clear_auth_cookies(response)
    return {"ok": True}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user


# -------------------------------------------------------------------
# Branches
# -------------------------------------------------------------------
@api.get("/branches")
async def list_branches(user: dict = Depends(get_current_user)):
    docs = await db.branches.find({}).to_list(1000)
    return [clean(d) for d in docs]


@api.post("/branches")
async def create_branch(body: BranchIn, user: dict = Depends(require_roles("owner"))):
    doc = {"id": str(uuid.uuid4()), **body.model_dump(), "created_at": iso(now_utc())}
    await db.branches.insert_one(doc)
    return clean(doc)


# -------------------------------------------------------------------
# Plans / Memberships
# -------------------------------------------------------------------
@api.get("/plans")
async def list_plans(user: dict = Depends(get_current_user)):
    docs = await db.plans.find({}).to_list(500)
    return [clean(d) for d in docs]


@api.post("/plans")
async def create_plan(body: PlanIn, user: dict = Depends(require_roles("owner", "manager"))):
    doc = {"id": str(uuid.uuid4()), **body.model_dump(), "created_at": iso(now_utc())}
    await db.plans.insert_one(doc)
    return clean(doc)


@api.put("/plans/{plan_id}")
async def update_plan(plan_id: str, body: PlanIn, user: dict = Depends(require_roles("owner", "manager"))):
    r = await db.plans.update_one({"id": plan_id}, {"$set": body.model_dump()})
    if r.matched_count == 0:
        raise HTTPException(404, "Plan not found")
    return clean(await db.plans.find_one({"id": plan_id}))


@api.delete("/plans/{plan_id}")
async def delete_plan(plan_id: str, user: dict = Depends(require_roles("owner"))):
    await db.plans.delete_one({"id": plan_id})
    return {"ok": True}


# -------------------------------------------------------------------
# Members
# -------------------------------------------------------------------
async def _next_member_code():
    count = await db.members.count_documents({})
    return f"FM-{1000 + count + 1}"


async def _hydrate_member(m: dict) -> dict:
    m = clean(m)
    if not m:
        return m
    if m.get("plan_id"):
        plan = await db.plans.find_one({"id": m["plan_id"]})
        m["plan"] = clean(plan)
    if m.get("trainer_id"):
        t = await db.trainers.find_one({"id": m["trainer_id"]})
        m["trainer"] = clean(t)
    if m.get("branch_id"):
        b = await db.branches.find_one({"id": m["branch_id"]})
        m["branch"] = clean(b)
    return m


@api.get("/members")
async def list_members(
    q: Optional[str] = None,
    status: Optional[str] = None,
    branch_id: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    query = {}
    if q:
        query["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"phone": {"$regex": q, "$options": "i"}},
            {"code": {"$regex": q, "$options": "i"}},
            {"email": {"$regex": q, "$options": "i"}},
        ]
    if status:
        query["status"] = status
    if branch_id:
        query["branch_id"] = branch_id
    docs = await db.members.find(query).sort("created_at", -1).to_list(2000)
    out = []
    for d in docs:
        out.append(await _hydrate_member(d))
    return out


@api.get("/members/{member_id}")
async def get_member(member_id: str, user: dict = Depends(get_current_user)):
    m = await db.members.find_one({"id": member_id})
    if not m:
        raise HTTPException(404, "Member not found")
    return await _hydrate_member(m)


@api.post("/members")
async def create_member(body: MemberIn, user: dict = Depends(require_roles("owner", "manager", "receptionist"))):
    code = await _next_member_code()
    plan = await db.plans.find_one({"id": body.plan_id}) if body.plan_id else None
    join_date = body.join_date or iso(now_utc())
    expiry = None
    if plan:
        try:
            jd = datetime.fromisoformat(join_date.replace("Z", "+00:00"))
        except Exception:
            jd = now_utc()
        expiry = iso(jd + timedelta(days=int(plan["duration_days"])))
    doc = {
        "id": str(uuid.uuid4()),
        "code": code,
        **body.model_dump(),
        "join_date": join_date,
        "expiry_date": expiry,
        "created_at": iso(now_utc()),
    }
    await db.members.insert_one(doc)
    return await _hydrate_member(doc)


@api.put("/members/{member_id}")
async def update_member(member_id: str, body: MemberIn, user: dict = Depends(require_roles("owner", "manager", "receptionist"))):
    update = body.model_dump()
    r = await db.members.update_one({"id": member_id}, {"$set": update})
    if r.matched_count == 0:
        raise HTTPException(404, "Not found")
    m = await db.members.find_one({"id": member_id})
    return await _hydrate_member(m)


@api.delete("/members/{member_id}")
async def delete_member(member_id: str, user: dict = Depends(require_roles("owner", "manager"))):
    await db.members.delete_one({"id": member_id})
    return {"ok": True}


# -------------------------------------------------------------------
# Trainers
# -------------------------------------------------------------------
@api.get("/trainers")
async def list_trainers(user: dict = Depends(get_current_user)):
    docs = await db.trainers.find({}).to_list(500)
    return [clean(d) for d in docs]


@api.post("/trainers")
async def create_trainer(body: TrainerIn, user: dict = Depends(require_roles("owner", "manager"))):
    doc = {"id": str(uuid.uuid4()), **body.model_dump(), "created_at": iso(now_utc())}
    await db.trainers.insert_one(doc)
    return clean(doc)


@api.put("/trainers/{tid}")
async def update_trainer(tid: str, body: TrainerIn, user: dict = Depends(require_roles("owner", "manager"))):
    await db.trainers.update_one({"id": tid}, {"$set": body.model_dump()})
    return clean(await db.trainers.find_one({"id": tid}))


@api.delete("/trainers/{tid}")
async def delete_trainer(tid: str, user: dict = Depends(require_roles("owner", "manager"))):
    await db.trainers.delete_one({"id": tid})
    return {"ok": True}


# -------------------------------------------------------------------
# Check-in / Attendance
# -------------------------------------------------------------------
@api.post("/checkins")
async def create_checkin(body: CheckInIn, user: dict = Depends(get_current_user)):
    member = None
    if body.member_id:
        member = await db.members.find_one({"id": body.member_id})
    elif body.lookup:
        q = body.lookup.strip()
        member = await db.members.find_one({
            "$or": [{"code": q}, {"phone": q}, {"email": q.lower()}]
        })
    if not member:
        raise HTTPException(404, "Member not found")
    doc = {
        "id": str(uuid.uuid4()),
        "member_id": member["id"],
        "member_name": member["name"],
        "member_code": member.get("code"),
        "method": body.method,
        "at": iso(now_utc()),
    }
    await db.checkins.insert_one(doc)
    return clean(doc)


@api.get("/checkins")
async def list_checkins(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    member_id: Optional[str] = None,
    limit: int = 200,
    user: dict = Depends(get_current_user),
):
    query = {}
    if member_id:
        query["member_id"] = member_id
    if date_from or date_to:
        rng = {}
        if date_from:
            rng["$gte"] = date_from
        if date_to:
            rng["$lte"] = date_to
        query["at"] = rng
    docs = await db.checkins.find(query).sort("at", -1).to_list(limit)
    return [clean(d) for d in docs]


@api.get("/checkins/today-count")
async def today_count(user: dict = Depends(get_current_user)):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    n = await db.checkins.count_documents({"at": {"$regex": f"^{today}"}})
    return {"count": n, "date": today}


# -------------------------------------------------------------------
# Payments / Invoices
# -------------------------------------------------------------------
@api.get("/payments")
async def list_payments(user: dict = Depends(get_current_user)):
    docs = await db.payments.find({}).sort("created_at", -1).to_list(2000)
    out = []
    for d in docs:
        d = clean(d)
        m = await db.members.find_one({"id": d.get("member_id")})
        if m:
            d["member_name"] = m["name"]
            d["member_code"] = m.get("code")
        out.append(d)
    return out


@api.post("/payments")
async def create_payment(body: PaymentIn, user: dict = Depends(require_roles("owner", "manager", "receptionist"))):
    member = await db.members.find_one({"id": body.member_id})
    if not member:
        raise HTTPException(404, "Member not found")
    invoice_no = f"INV-{now_utc().strftime('%Y%m')}-{random.randint(1000, 9999)}"
    doc = {
        "id": str(uuid.uuid4()),
        "invoice_no": invoice_no,
        **body.model_dump(),
        "status": "paid",
        "created_at": iso(now_utc()),
    }
    await db.payments.insert_one(doc)

    if body.plan_id:
        plan = await db.plans.find_one({"id": body.plan_id})
        if plan:
            expiry = iso(now_utc() + timedelta(days=int(plan["duration_days"])))
            await db.members.update_one(
                {"id": body.member_id},
                {"$set": {"plan_id": body.plan_id, "expiry_date": expiry, "status": "active"}},
            )
    d = clean(doc)
    d["member_name"] = member["name"]
    d["member_code"] = member.get("code")
    return d


@api.get("/payments/{pid}")
async def get_payment(pid: str, user: dict = Depends(get_current_user)):
    p = await db.payments.find_one({"id": pid})
    if not p:
        raise HTTPException(404, "Not found")
    p = clean(p)
    m = await db.members.find_one({"id": p["member_id"]})
    if m:
        p["member"] = clean(m)
    if p.get("plan_id"):
        p["plan"] = clean(await db.plans.find_one({"id": p["plan_id"]}))
    return p


# -------------------------------------------------------------------
# Expenses
# -------------------------------------------------------------------
@api.get("/expenses")
async def list_expenses(user: dict = Depends(get_current_user)):
    docs = await db.expenses.find({}).sort("date", -1).to_list(2000)
    return [clean(d) for d in docs]


@api.post("/expenses")
async def create_expense(body: ExpenseIn, user: dict = Depends(require_roles("owner", "manager"))):
    doc = {
        "id": str(uuid.uuid4()),
        **body.model_dump(),
        "date": body.date or iso(now_utc()),
        "created_at": iso(now_utc()),
    }
    await db.expenses.insert_one(doc)
    return clean(doc)


@api.delete("/expenses/{eid}")
async def delete_expense(eid: str, user: dict = Depends(require_roles("owner", "manager"))):
    await db.expenses.delete_one({"id": eid})
    return {"ok": True}


# -------------------------------------------------------------------
# CRM / Leads
# -------------------------------------------------------------------
@api.get("/leads")
async def list_leads(user: dict = Depends(get_current_user)):
    docs = await db.leads.find({}).sort("created_at", -1).to_list(1000)
    return [clean(d) for d in docs]


@api.post("/leads")
async def create_lead(body: LeadIn, user: dict = Depends(require_roles("owner", "manager", "receptionist"))):
    doc = {"id": str(uuid.uuid4()), **body.model_dump(), "created_at": iso(now_utc())}
    await db.leads.insert_one(doc)
    return clean(doc)


@api.put("/leads/{lid}")
async def update_lead(lid: str, body: LeadIn, user: dict = Depends(require_roles("owner", "manager", "receptionist"))):
    await db.leads.update_one({"id": lid}, {"$set": body.model_dump()})
    return clean(await db.leads.find_one({"id": lid}))


@api.delete("/leads/{lid}")
async def delete_lead(lid: str, user: dict = Depends(require_roles("owner", "manager"))):
    await db.leads.delete_one({"id": lid})
    return {"ok": True}


# -------------------------------------------------------------------
# Staff
# -------------------------------------------------------------------
@api.get("/staff")
async def list_staff(user: dict = Depends(require_roles("owner", "manager"))):
    docs = await db.staff.find({}).to_list(500)
    return [clean(d) for d in docs]


@api.post("/staff")
async def create_staff(body: StaffIn, user: dict = Depends(require_roles("owner"))):
    doc = {"id": str(uuid.uuid4()), **body.model_dump(), "created_at": iso(now_utc())}
    await db.staff.insert_one(doc)
    return clean(doc)


# -------------------------------------------------------------------
# Notifications
# -------------------------------------------------------------------
@api.get("/notifications")
async def list_notifications(user: dict = Depends(get_current_user)):
    docs = await db.notifications.find({}).sort("created_at", -1).to_list(50)
    return [clean(d) for d in docs]


@api.post("/notifications/read-all")
async def read_all(user: dict = Depends(get_current_user)):
    await db.notifications.update_many({"read": False}, {"$set": {"read": True}})
    return {"ok": True}


# -------------------------------------------------------------------
# Analytics / Dashboard
# -------------------------------------------------------------------
@api.get("/analytics/overview")
async def analytics_overview(user: dict = Depends(get_current_user)):
    total_members = await db.members.count_documents({})
    active_members = await db.members.count_documents({"status": "active"})
    today = now_utc().strftime("%Y-%m-%d")
    checkins_today = await db.checkins.count_documents({"at": {"$regex": f"^{today}"}})

    month_prefix = now_utc().strftime("%Y-%m")
    prev_month_dt = (now_utc().replace(day=1) - timedelta(days=1))
    prev_month = prev_month_dt.strftime("%Y-%m")

    payments_this_month = await db.payments.find({"created_at": {"$regex": f"^{month_prefix}"}}).to_list(5000)
    revenue_this_month = sum(p.get("amount", 0) for p in payments_this_month)

    payments_prev_month = await db.payments.find({"created_at": {"$regex": f"^{prev_month}"}}).to_list(5000)
    revenue_prev = sum(p.get("amount", 0) for p in payments_prev_month)

    expenses_this_month = await db.expenses.find({"date": {"$regex": f"^{month_prefix}"}}).to_list(5000)
    expense_total = sum(e.get("amount", 0) for e in expenses_this_month)

    # expiring in next 7 days
    upcoming_cutoff = iso(now_utc() + timedelta(days=7))
    expiring = await db.members.count_documents({
        "status": "active",
        "expiry_date": {"$lte": upcoming_cutoff, "$gte": iso(now_utc())},
    })

    total_leads = await db.leads.count_documents({})
    new_leads = await db.leads.count_documents({"stage": "new"})

    def pct(new_v, old_v):
        if old_v == 0:
            return 100.0 if new_v > 0 else 0.0
        return round(((new_v - old_v) / old_v) * 100.0, 1)

    return {
        "total_members": total_members,
        "active_members": active_members,
        "checkins_today": checkins_today,
        "revenue_this_month": revenue_this_month,
        "revenue_prev_month": revenue_prev,
        "revenue_growth_pct": pct(revenue_this_month, revenue_prev),
        "expense_this_month": expense_total,
        "profit_this_month": revenue_this_month - expense_total,
        "expiring_soon": expiring,
        "total_leads": total_leads,
        "new_leads": new_leads,
    }


@api.get("/analytics/revenue-series")
async def revenue_series(months: int = 6, user: dict = Depends(get_current_user)):
    now = now_utc()
    out = []
    for i in range(months - 1, -1, -1):
        y = now.year
        m = now.month - i
        while m <= 0:
            m += 12
            y -= 1
        prefix = f"{y:04d}-{m:02d}"
        payments = await db.payments.find({"created_at": {"$regex": f"^{prefix}"}}).to_list(5000)
        expenses = await db.expenses.find({"date": {"$regex": f"^{prefix}"}}).to_list(5000)
        out.append({
            "month": datetime(y, m, 1).strftime("%b"),
            "revenue": sum(p.get("amount", 0) for p in payments),
            "expense": sum(e.get("amount", 0) for e in expenses),
        })
    return out


@api.get("/analytics/attendance-week")
async def attendance_week(user: dict = Depends(get_current_user)):
    out = []
    for i in range(6, -1, -1):
        d = (now_utc() - timedelta(days=i)).strftime("%Y-%m-%d")
        c = await db.checkins.count_documents({"at": {"$regex": f"^{d}"}})
        out.append({"day": (now_utc() - timedelta(days=i)).strftime("%a"), "date": d, "checkins": c})
    return out


@api.get("/analytics/plan-distribution")
async def plan_distribution(user: dict = Depends(get_current_user)):
    plans = await db.plans.find({}).to_list(200)
    out = []
    for p in plans:
        n = await db.members.count_documents({"plan_id": p["id"], "status": "active"})
        out.append({"name": p["name"], "count": n, "color": p.get("color", "#FF3B30")})
    return out


# -------------------------------------------------------------------
# Seeding
# -------------------------------------------------------------------
async def seed_data():
    admin_email = os.environ["ADMIN_EMAIL"].lower()
    admin_password = os.environ["ADMIN_PASSWORD"]

    # Admin/owner
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "password_hash": hash_pw(admin_password),
            "name": "Kartik Aggarwal",
            "role": "owner",
            "created_at": iso(now_utc()),
        })
    else:
        if not verify_pw(admin_password, existing["password_hash"]):
            await db.users.update_one(
                {"email": admin_email},
                {"$set": {"password_hash": hash_pw(admin_password)}}
            )

    # Extra staff users for role demos
    staff_users = [
        ("manager@fitmore.app", "Meera Sharma", "manager"),
        ("reception@fitmore.app", "Rohit Verma", "receptionist"),
        ("trainer@fitmore.app", "Arjun Rao", "trainer"),
    ]
    for email, name, role in staff_users:
        if not await db.users.find_one({"email": email}):
            await db.users.insert_one({
                "id": str(uuid.uuid4()),
                "email": email,
                "password_hash": hash_pw(admin_password),
                "name": name,
                "role": role,
                "created_at": iso(now_utc()),
            })

    # Only seed rest if empty
    if await db.branches.count_documents({}) > 0:
        return

    # Branches
    branches = [
        {"id": str(uuid.uuid4()), "name": "FitMore Downtown", "address": "1st Ave, Mumbai", "phone": "+91 98111 22001", "manager_name": "Meera Sharma", "created_at": iso(now_utc())},
        {"id": str(uuid.uuid4()), "name": "FitMore Andheri", "address": "Link Rd, Andheri", "phone": "+91 98111 22002", "manager_name": "Rahul Iyer", "created_at": iso(now_utc())},
        {"id": str(uuid.uuid4()), "name": "FitMore Bandra", "address": "Hill Rd, Bandra", "phone": "+91 98111 22003", "manager_name": "Neha Kapoor", "created_at": iso(now_utc())},
    ]
    await db.branches.insert_many(branches)

    # Plans
    plans = [
        {"id": str(uuid.uuid4()), "name": "Monthly", "duration_days": 30, "price": 1999, "features": ["Gym access", "Locker", "Steam"], "color": "#FF3B30", "description": "Perfect for beginners", "created_at": iso(now_utc())},
        {"id": str(uuid.uuid4()), "name": "Quarterly", "duration_days": 90, "price": 4999, "features": ["Gym access", "1 PT session/wk", "Diet plan"], "color": "#007AFF", "description": "Best value for regulars", "created_at": iso(now_utc())},
        {"id": str(uuid.uuid4()), "name": "Half Yearly", "duration_days": 180, "price": 8999, "features": ["All access", "2 PT sessions/wk", "Diet & recovery"], "color": "#34C759", "description": "Serious training", "created_at": iso(now_utc())},
        {"id": str(uuid.uuid4()), "name": "Annual", "duration_days": 365, "price": 14999, "features": ["Unlimited access", "3 PT sessions/wk", "Full nutrition"], "color": "#D4FF00", "description": "Committed athletes", "created_at": iso(now_utc())},
    ]
    await db.plans.insert_many(plans)

    # Trainers
    trainers_data = [
        ("Arjun Rao", "arjun.rao@fitmore.app", "+91 98111 33001", "Strength & Powerlifting", 8, 1200, "https://images.pexels.com/photos/8612464/pexels-photo-8612464.jpeg"),
        ("Priya Menon", "priya.menon@fitmore.app", "+91 98111 33002", "Yoga & Mobility", 6, 900, "https://images.unsplash.com/photo-1548690312-e3b507d8c110"),
        ("Kabir Singh", "kabir.singh@fitmore.app", "+91 98111 33003", "HIIT & CrossFit", 5, 1000, None),
        ("Sana Ali", "sana.ali@fitmore.app", "+91 98111 33004", "Weight Loss & Cardio", 7, 950, None),
        ("Vikram Joshi", "vikram.joshi@fitmore.app", "+91 98111 33005", "Bodybuilding", 10, 1500, None),
    ]
    trainers = []
    for i, t in enumerate(trainers_data):
        trainers.append({
            "id": str(uuid.uuid4()),
            "name": t[0], "email": t[1], "phone": t[2], "specialization": t[3],
            "experience_years": t[4], "branch_id": branches[i % 3]["id"],
            "hourly_rate": t[5], "bio": f"{t[0]} — {t[4]} years coaching high-performance clients.",
            "avatar": t[6], "created_at": iso(now_utc()),
        })
    await db.trainers.insert_many(trainers)

    # Members
    first = ["Aarav", "Ishaan", "Rohan", "Ananya", "Diya", "Karan", "Kavya", "Yash", "Riya", "Aditya",
             "Nikita", "Aryan", "Sneha", "Dev", "Pooja", "Rahul", "Meera", "Zoya", "Aman", "Tanya",
             "Sahil", "Mira", "Neel", "Kiara", "Om", "Isha", "Veer", "Naina", "Krish", "Simran"]
    last = ["Sharma", "Verma", "Iyer", "Kapoor", "Malhotra", "Khan", "Bhat", "Roy", "Das", "Menon",
            "Chopra", "Singh", "Patel", "Reddy", "Rao", "Bose", "Jain", "Shetty", "Nair", "Gupta"]
    genders = ["male", "female", "other"]
    statuses = ["active", "active", "active", "active", "expired", "frozen"]
    members = []
    now = now_utc()
    for i in range(38):
        name = f"{random.choice(first)} {random.choice(last)}"
        plan = random.choice(plans)
        join_offset = random.randint(1, 200)
        join_date = now - timedelta(days=join_offset)
        expiry = join_date + timedelta(days=plan["duration_days"])
        status = random.choice(statuses)
        if expiry < now and status == "active":
            status = "expired"
        members.append({
            "id": str(uuid.uuid4()),
            "code": f"FM-{1001 + i}",
            "name": name,
            "email": f"{name.lower().replace(' ', '.')}{i}@example.com",
            "phone": f"+91 9{random.randint(700000000, 999999999)}",
            "gender": random.choice(genders),
            "dob": (now - timedelta(days=random.randint(6570, 15000))).strftime("%Y-%m-%d"),
            "address": f"{random.randint(1, 300)} Sea View Rd, Mumbai",
            "branch_id": random.choice(branches)["id"],
            "plan_id": plan["id"],
            "trainer_id": random.choice(trainers)["id"] if random.random() > 0.35 else None,
            "join_date": iso(join_date),
            "expiry_date": iso(expiry),
            "notes": "",
            "avatar": None,
            "emergency_contact": f"+91 9{random.randint(700000000, 999999999)}",
            "status": status,
            "created_at": iso(join_date),
        })
    await db.members.insert_many(members)

    # Payments (last 6 months)
    payments = []
    for i in range(140):
        m = random.choice(members)
        plan = next((p for p in plans if p["id"] == m["plan_id"]), plans[0])
        days_ago = random.randint(0, 180)
        d = now - timedelta(days=days_ago)
        payments.append({
            "id": str(uuid.uuid4()),
            "invoice_no": f"INV-{d.strftime('%Y%m')}-{1000 + i}",
            "member_id": m["id"],
            "amount": plan["price"] + random.choice([0, 0, 0, -200, 200]),
            "plan_id": plan["id"],
            "method": random.choice(["cash", "upi", "card", "bank"]),
            "note": "",
            "status": "paid",
            "created_at": iso(d),
        })
    await db.payments.insert_many(payments)

    # Expenses
    exp_cats = ["Rent", "Utilities", "Staff Salary", "Equipment", "Marketing", "Maintenance", "Supplements"]
    expenses = []
    for i in range(60):
        d = now - timedelta(days=random.randint(0, 180))
        expenses.append({
            "id": str(uuid.uuid4()),
            "title": f"{random.choice(exp_cats)} — {d.strftime('%b')}",
            "amount": random.choice([1200, 3500, 8000, 15000, 25000, 45000]),
            "category": random.choice(exp_cats),
            "date": iso(d),
            "note": "",
            "branch_id": random.choice(branches)["id"],
            "created_at": iso(d),
        })
    await db.expenses.insert_many(expenses)

    # Check-ins (last 14 days)
    checkins = []
    for i in range(650):
        m = random.choice(members)
        days_ago = random.randint(0, 14)
        t = now - timedelta(days=days_ago, hours=random.randint(5, 22), minutes=random.randint(0, 59))
        checkins.append({
            "id": str(uuid.uuid4()),
            "member_id": m["id"],
            "member_name": m["name"],
            "member_code": m["code"],
            "method": random.choice(["qr", "id", "mobile", "rfid", "reception"]),
            "at": iso(t),
        })
    await db.checkins.insert_many(checkins)

    # Leads
    sources = ["Instagram", "Google Ads", "Walk-in", "Referral", "Facebook", "Website"]
    stages = ["new", "contacted", "trial", "converted", "lost"]
    interests = ["Weight loss", "Muscle gain", "General fitness", "Yoga", "CrossFit"]
    leads = []
    for i in range(28):
        d = now - timedelta(days=random.randint(0, 45))
        leads.append({
            "id": str(uuid.uuid4()),
            "name": f"{random.choice(first)} {random.choice(last)}",
            "phone": f"+91 9{random.randint(700000000, 999999999)}",
            "email": f"lead{i}@example.com",
            "source": random.choice(sources),
            "stage": random.choice(stages),
            "notes": "",
            "interest": random.choice(interests),
            "created_at": iso(d),
        })
    await db.leads.insert_many(leads)

    # Notifications
    notifs = [
        {"id": str(uuid.uuid4()), "title": "New member registered", "body": "Aarav Sharma joined the Annual plan.", "type": "member", "read": False, "created_at": iso(now - timedelta(minutes=25))},
        {"id": str(uuid.uuid4()), "title": "Payment received", "body": "₹4,999 quarterly from Ananya Kapoor.", "type": "payment", "read": False, "created_at": iso(now - timedelta(hours=2))},
        {"id": str(uuid.uuid4()), "title": "Expiring memberships", "body": "8 members expiring in the next 7 days.", "type": "alert", "read": False, "created_at": iso(now - timedelta(hours=5))},
        {"id": str(uuid.uuid4()), "title": "New lead from Instagram", "body": "Kabir asked about Annual plan.", "type": "lead", "read": True, "created_at": iso(now - timedelta(days=1))},
        {"id": str(uuid.uuid4()), "title": "Trainer schedule updated", "body": "Priya Menon added morning yoga slots.", "type": "trainer", "read": True, "created_at": iso(now - timedelta(days=2))},
    ]
    await db.notifications.insert_many(notifs)


@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.members.create_index("code")
    await db.members.create_index("phone")
    await db.checkins.create_index([("at", -1)])
    await db.payments.create_index([("created_at", -1)])
    await seed_data()
    logger.info("FitMore backend ready.")


@app.on_event("shutdown")
async def on_shutdown():
    client.close()


# -------------------------------------------------------------------
# Wiring
# -------------------------------------------------------------------
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "https://fitg-one.vercel.app,https://fit-one.vercel.app,http://localhost:3000").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("fitmore")
