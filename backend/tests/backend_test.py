"""
FitMore backend API tests.
Covers: auth, members, plans, trainers, checkins, payments, expenses, leads,
branches, notifications, analytics, and role guards.
"""
import os
import sys
import re
import pytest
import requests
from pathlib import Path

# Load frontend .env to get REACT_APP_BACKEND_URL (source of truth for public URL)
_env_path = Path("/app/frontend/.env")
_pub_url = None
if _env_path.exists():
    for line in _env_path.read_text().splitlines():
        if line.startswith("REACT_APP_BACKEND_URL="):
            _pub_url = line.split("=", 1)[1].strip().strip('"').rstrip("/")
            break

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", _pub_url)
assert BASE_URL, "REACT_APP_BACKEND_URL missing"
API = f"{BASE_URL}/api"

OWNER = {"email": "aggarwalkartik688@gmail.com", "password": "Fitmore@123"}
MANAGER = {"email": "manager@fitmore.app", "password": "Fitmore@123"}


# ---------------- Fixtures ----------------
@pytest.fixture(scope="session")
def owner_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json=OWNER, timeout=30)
    assert r.status_code == 200, f"Owner login failed: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="session")
def manager_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json=MANAGER, timeout=30)
    assert r.status_code == 200, f"Manager login failed: {r.status_code} {r.text}"
    return s


# ---------------- Auth ----------------
class TestAuth:
    def test_login_owner_sets_cookies(self):
        s = requests.Session()
        r = s.post(f"{API}/auth/login", json=OWNER, timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert data["email"] == OWNER["email"]
        assert data["role"] == "owner"
        assert "password_hash" not in data
        # cookies set
        cookie_names = {c.name for c in s.cookies}
        assert "access_token" in cookie_names
        assert "refresh_token" in cookie_names

    def test_login_wrong_password(self):
        r = requests.post(f"{API}/auth/login",
                          json={"email": OWNER["email"], "password": "wrong"}, timeout=30)
        assert r.status_code == 401

    def test_me_with_cookie(self, owner_session):
        r = owner_session.get(f"{API}/auth/me", timeout=30)
        assert r.status_code == 200
        assert r.json()["email"] == OWNER["email"]

    def test_me_without_cookie(self):
        r = requests.get(f"{API}/auth/me", timeout=30)
        assert r.status_code == 401

    def test_logout_clears_cookies(self):
        s = requests.Session()
        s.post(f"{API}/auth/login", json=OWNER, timeout=30)
        r = s.post(f"{API}/auth/logout", timeout=30)
        assert r.status_code == 200
        # After logout, /me should be 401
        r2 = s.get(f"{API}/auth/me", timeout=30)
        assert r2.status_code == 401


# ---------------- Analytics ----------------
class TestAnalytics:
    def test_overview(self, owner_session):
        r = owner_session.get(f"{API}/analytics/overview", timeout=30)
        assert r.status_code == 200
        d = r.json()
        for k in ["total_members", "active_members", "checkins_today",
                  "revenue_this_month", "expense_this_month",
                  "profit_this_month", "revenue_growth_pct"]:
            assert k in d, f"missing {k}"

    def test_revenue_series_6(self, owner_session):
        r = owner_session.get(f"{API}/analytics/revenue-series?months=6", timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list) and len(data) == 6
        assert "month" in data[0] and "revenue" in data[0] and "expense" in data[0]

    def test_attendance_week(self, owner_session):
        r = owner_session.get(f"{API}/analytics/attendance-week", timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list) and len(data) == 7
        assert "day" in data[0] and "checkins" in data[0]

    def test_plan_distribution(self, owner_session):
        r = owner_session.get(f"{API}/analytics/plan-distribution", timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert all("name" in x and "count" in x and "color" in x for x in data)


# ---------------- Members ----------------
class TestMembers:
    def test_list_hydrated(self, owner_session):
        r = owner_session.get(f"{API}/members", timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert len(data) > 0
        # At least one member should have hydrated plan/branch
        sample = next((m for m in data if m.get("plan_id")), data[0])
        if sample.get("plan_id"):
            assert "plan" in sample and sample["plan"] and "name" in sample["plan"]
        if sample.get("branch_id"):
            assert "branch" in sample and sample["branch"] and "name" in sample["branch"]

    def test_search_filter(self, owner_session):
        r = owner_session.get(f"{API}/members?q=FM-", timeout=30)
        assert r.status_code == 200
        data = r.json()
        # All should have code starting FM-
        assert all("FM-" in (m.get("code") or "") for m in data)

    def test_status_filter(self, owner_session):
        r = owner_session.get(f"{API}/members?status=active", timeout=30)
        assert r.status_code == 200
        assert all(m["status"] == "active" for m in r.json())

    def test_get_single(self, owner_session):
        members = owner_session.get(f"{API}/members", timeout=30).json()
        mid = members[0]["id"]
        r = owner_session.get(f"{API}/members/{mid}", timeout=30)
        assert r.status_code == 200
        assert r.json()["id"] == mid

    def test_create_update_delete(self, owner_session):
        plans = owner_session.get(f"{API}/plans", timeout=30).json()
        plan = plans[0]
        payload = {
            "name": "TEST_Member One",
            "phone": "+91 9998887771",
            "email": "test_member_one@example.com",
            "plan_id": plan["id"],
            "status": "active",
        }
        r = owner_session.post(f"{API}/members", json=payload, timeout=30)
        assert r.status_code == 200, r.text
        m = r.json()
        assert m["name"] == payload["name"]
        assert m["expiry_date"] is not None  # auto-computed
        mid = m["id"]

        # GET verify persisted
        g = owner_session.get(f"{API}/members/{mid}", timeout=30)
        assert g.status_code == 200 and g.json()["name"] == payload["name"]

        # Update
        upd = {**payload, "name": "TEST_Member Updated"}
        u = owner_session.put(f"{API}/members/{mid}", json=upd, timeout=30)
        assert u.status_code == 200 and u.json()["name"] == "TEST_Member Updated"

        # Delete
        d = owner_session.delete(f"{API}/members/{mid}", timeout=30)
        assert d.status_code == 200
        assert owner_session.get(f"{API}/members/{mid}", timeout=30).status_code == 404


# ---------------- Plans / Trainers ----------------
class TestPlansTrainers:
    def test_plans_seeded(self, owner_session):
        r = owner_session.get(f"{API}/plans", timeout=30)
        assert r.status_code == 200
        assert len(r.json()) >= 4

    def test_create_plan(self, owner_session):
        payload = {"name": "TEST_Plan", "duration_days": 30, "price": 999.0,
                   "features": ["test"], "color": "#000000", "description": "t"}
        r = owner_session.post(f"{API}/plans", json=payload, timeout=30)
        assert r.status_code == 200
        pid = r.json()["id"]
        owner_session.delete(f"{API}/plans/{pid}", timeout=30)

    def test_trainers_seeded(self, owner_session):
        r = owner_session.get(f"{API}/trainers", timeout=30)
        assert r.status_code == 200
        assert len(r.json()) >= 5

    def test_create_trainer(self, owner_session):
        payload = {"name": "TEST_Trainer", "phone": "+91 9998887770",
                   "email": "test_trainer@example.com",
                   "specialization": "Strength", "experience_years": 3,
                   "hourly_rate": 500}
        r = owner_session.post(f"{API}/trainers", json=payload, timeout=30)
        assert r.status_code == 200
        tid = r.json()["id"]
        owner_session.delete(f"{API}/trainers/{tid}", timeout=30)


# ---------------- Checkins ----------------
class TestCheckins:
    def test_checkin_by_code(self, owner_session):
        members = owner_session.get(f"{API}/members", timeout=30).json()
        code = next(m["code"] for m in members if m.get("code"))
        r = owner_session.post(f"{API}/checkins",
                               json={"lookup": code, "method": "id"}, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["member_code"] == code
        assert d["method"] == "id"
        assert "at" in d and "member_name" in d

    def test_checkin_by_member_id(self, owner_session):
        members = owner_session.get(f"{API}/members", timeout=30).json()
        mid = members[0]["id"]
        r = owner_session.post(f"{API}/checkins",
                               json={"member_id": mid, "method": "reception"}, timeout=30)
        assert r.status_code == 200
        assert r.json()["member_id"] == mid

    def test_list_checkins_sorted(self, owner_session):
        r = owner_session.get(f"{API}/checkins?limit=10", timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert len(data) <= 10
        if len(data) >= 2:
            assert data[0]["at"] >= data[1]["at"]

    def test_today_count(self, owner_session):
        r = owner_session.get(f"{API}/checkins/today-count", timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert "count" in d and "date" in d


# ---------------- Payments ----------------
class TestPayments:
    def test_list_hydrated(self, owner_session):
        r = owner_session.get(f"{API}/payments", timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert len(data) > 0
        assert "member_name" in data[0] or "member_code" in data[0]

    def test_create_payment_updates_member(self, owner_session):
        plans = owner_session.get(f"{API}/plans", timeout=30).json()
        plan = plans[0]
        members = owner_session.get(f"{API}/members", timeout=30).json()
        mid = members[0]["id"]
        payload = {"member_id": mid, "amount": 1999.0,
                   "plan_id": plan["id"], "method": "cash", "note": "TEST"}
        r = owner_session.post(f"{API}/payments", json=payload, timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert re.match(r"^INV-\d{6}-", d["invoice_no"]), f"bad invoice_no: {d['invoice_no']}"
        assert d["amount"] == 1999.0

        # member updated
        m = owner_session.get(f"{API}/members/{mid}", timeout=30).json()
        assert m["status"] == "active"
        assert m["plan_id"] == plan["id"]


# ---------------- Expenses ----------------
class TestExpenses:
    def test_expenses_crud(self, owner_session):
        r = owner_session.get(f"{API}/expenses", timeout=30)
        assert r.status_code == 200
        payload = {"title": "TEST_Expense", "amount": 100.0,
                   "category": "Utilities", "note": "test"}
        c = owner_session.post(f"{API}/expenses", json=payload, timeout=30)
        assert c.status_code == 200
        eid = c.json()["id"]
        d = owner_session.delete(f"{API}/expenses/{eid}", timeout=30)
        assert d.status_code == 200


# ---------------- Leads ----------------
class TestLeads:
    def test_leads_crud(self, owner_session):
        r = owner_session.get(f"{API}/leads", timeout=30)
        assert r.status_code == 200
        payload = {"name": "TEST_Lead", "phone": "+91 9998887772",
                   "source": "Instagram", "stage": "new"}
        c = owner_session.post(f"{API}/leads", json=payload, timeout=30)
        assert c.status_code == 200
        lid = c.json()["id"]
        u_payload = {**payload, "stage": "contacted"}
        u = owner_session.put(f"{API}/leads/{lid}", json=u_payload, timeout=30)
        assert u.status_code == 200 and u.json()["stage"] == "contacted"
        owner_session.delete(f"{API}/leads/{lid}", timeout=30)


# ---------------- Branches ----------------
class TestBranches:
    def test_list_branches(self, owner_session):
        r = owner_session.get(f"{API}/branches", timeout=30)
        assert r.status_code == 200
        assert len(r.json()) >= 3


# ---------------- Notifications ----------------
class TestNotifications:
    def test_notifications_flow(self, owner_session):
        r = owner_session.get(f"{API}/notifications", timeout=30)
        assert r.status_code == 200
        assert len(r.json()) >= 1
        ra = owner_session.post(f"{API}/notifications/read-all", timeout=30)
        assert ra.status_code == 200
        # verify all read now
        r2 = owner_session.get(f"{API}/notifications", timeout=30).json()
        assert all(n.get("read") is True for n in r2)


# ---------------- Role Guard ----------------
class TestRoleGuards:
    def test_manager_cannot_create_staff(self, manager_session):
        payload = {"name": "TEST_Staff", "email": "test_staff_x@example.com",
                   "phone": "+91 9998887773", "role": "manager", "salary": 1000}
        r = manager_session.post(f"{API}/staff", json=payload, timeout=30)
        assert r.status_code == 403, f"expected 403 got {r.status_code}"

    def test_owner_can_create_staff(self, owner_session):
        payload = {"name": "TEST_Staff_Owner", "email": "test_staff_owner_role@example.com",
                   "phone": "+91 9998887774", "role": "manager", "salary": 1000}
        r = owner_session.post(f"{API}/staff", json=payload, timeout=30)
        assert r.status_code == 200, r.text
