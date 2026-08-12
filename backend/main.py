"""
Hassan Pharmacy — FastAPI backend
Run with:  uvicorn main:app --reload --port 8000
API docs:  http://127.0.0.1:8000/docs
"""
import sqlite3
import hashlib
import time
import json
from datetime import date
from contextlib import contextmanager
from typing import Optional, List

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

DB_PATH = "hassan_pharmacy.db"
ADMIN_ID = "admin"
ADMIN_PASS = "hassan"

app = FastAPI(title="Hassan Pharmacy API")

# Allow the static frontend (served from any origin / Live Server / file://) to call this API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Database helpers
# ---------------------------------------------------------------------------
@contextmanager
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def hash_password(pw: str) -> str:
    return hashlib.sha256(pw.encode()).hexdigest()


CATEGORIES = ["Pain Relief", "Cold and Flu", "Diabetes Care", "Digestive Health", "First Aid",
              "Skin Care", "Child and Baby Care", "Heart Health", "Eye and Ear Care", "Respiratory Health"]

DEFAULT_PRODUCTS = [
    ("p1", "Panadol Extra", "Pain Relief", 120, 0, 1, "Fast-acting relief for headache, fever and body pain."),
    ("p2", "Augmentin 625mg", "Cold and Flu", 450, 10, 1, "Broad-spectrum antibiotic for bacterial infections."),
    ("p3", "Disprin", "Pain Relief", 60, 0, 1, "Soluble aspirin tablets for quick pain relief."),
    ("p4", "Brufen 400mg", "Pain Relief", 150, 0, 0, "Ibuprofen for pain, inflammation and fever."),
    ("p5", "Calpol Syrup", "Child and Baby Care", 180, 5, 1, "Gentle fever & pain relief syrup for children."),
    ("p6", "Risek 20mg", "Digestive Health", 320, 0, 1, "Reduces stomach acid, treats ulcers & reflux."),
    ("p7", "Ponstan Forte", "Pain Relief", 140, 0, 1, "Effective relief from moderate to severe pain."),
    ("p8", "Flagyl 400mg", "Digestive Health", 90, 0, 1, "Antibiotic for intestinal & stomach infections."),
    ("p9", "Glucometer Strips", "Diabetes Care", 1200, 15, 1, "Accurate blood glucose test strips, box of 50."),
    ("p10", "Surgical Gloves (Box)", "First Aid", 199, 0, 1, "Latex examination gloves, box of 100."),
    ("p11", "N95 Mask (Pack of 5)", "Respiratory Health", 89, 0, 1, "High filtration protective face masks."),
    ("p12", "Hand Sanitizer 250ml", "Skin Care", 399, 0, 1, "70% alcohol-based hand sanitizer gel."),
    ("p13", "Vicks Vaporub", "Cold and Flu", 210, 0, 1, "Topical rub for cough, cold & congestion relief."),
    ("p14", "Centrum Multivitamin", "Heart Health", 850, 10, 1, "Daily multivitamin for heart & overall wellness."),
    ("p15", "Systane Eye Drops", "Eye and Ear Care", 320, 0, 1, "Lubricating drops for dry, irritated eyes."),
]
DEFAULT_ANNOUNCEMENTS = [
    "🎉 Flat 25% OFF on Diabetes Care products this week!",
    "🚚 Free home delivery on orders above Rs. 1000",
    "🩺 New: Online Doctor Consultation now available",
]
DEFAULT_NEWS = [
    ("Discover a treasure of practical tips for enhancing your wellness",
     "From nutrition advice to exercise routines, we're here to support your journey toward a healthier life."),
    ("Our patients' journeys are filled with courage, resilience & triumph",
     "In this section, we share inspiring narratives of individuals who have overcome health challenges."),
]
DEFAULT_STORIES = [
    ("5 ways to boost your immunity this winter", "Wellness"),
    ("Understanding blood pressure numbers", "Heart Health"),
    ("Why home delivery for medicines matters", "Pharmacy"),
    ("Talking to kids about doctor visits", "Family"),
]


def init_db():
    with get_db() as db:
        db.execute("""CREATE TABLE IF NOT EXISTS products(
            id TEXT PRIMARY KEY, name TEXT, category TEXT, price INTEGER,
            discount INTEGER, stock INTEGER, desc TEXT)""")
        db.execute("""CREATE TABLE IF NOT EXISTS announcements(
            id INTEGER PRIMARY KEY AUTOINCREMENT, text TEXT)""")
        db.execute("""CREATE TABLE IF NOT EXISTS news(
            id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, excerpt TEXT)""")
        db.execute("""CREATE TABLE IF NOT EXISTS stories(
            id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, tag TEXT)""")
        db.execute("""CREATE TABLE IF NOT EXISTS users(
            id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, phone TEXT UNIQUE,
            email TEXT, password_hash TEXT)""")
        db.execute("""CREATE TABLE IF NOT EXISTS orders(
            id TEXT PRIMARY KEY, customer TEXT, phone TEXT, items TEXT,
            total INTEGER, status TEXT, date TEXT)""")

        if db.execute("SELECT COUNT(*) c FROM products").fetchone()["c"] == 0:
            db.executemany("INSERT INTO products VALUES (?,?,?,?,?,?,?)", DEFAULT_PRODUCTS)
        if db.execute("SELECT COUNT(*) c FROM announcements").fetchone()["c"] == 0:
            db.executemany("INSERT INTO announcements(text) VALUES (?)", [(a,) for a in DEFAULT_ANNOUNCEMENTS])
        if db.execute("SELECT COUNT(*) c FROM news").fetchone()["c"] == 0:
            db.executemany("INSERT INTO news(title,excerpt) VALUES (?,?)", DEFAULT_NEWS)
        if db.execute("SELECT COUNT(*) c FROM stories").fetchone()["c"] == 0:
            db.executemany("INSERT INTO stories(title,tag) VALUES (?,?)", DEFAULT_STORIES)


init_db()

# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------
class ProductIn(BaseModel):
    name: str
    category: str
    price: int
    discount: int = 0
    stock: bool = True
    desc: str = ""

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    price: Optional[int] = None
    discount: Optional[int] = None
    stock: Optional[bool] = None
    desc: Optional[str] = None

class TextIn(BaseModel):
    text: str

class NewsIn(BaseModel):
    title: str
    excerpt: str = ""

class StoryIn(BaseModel):
    title: str
    tag: str = "Health"

class RegisterIn(BaseModel):
    name: str
    phone: str
    email: str = ""
    password: str

class LoginIn(BaseModel):
    id: str
    password: str

class OrderItem(BaseModel):
    id: str
    qty: int

class OrderIn(BaseModel):
    customer: str
    phone: str
    items: List[OrderItem]
    total: int

class StatusIn(BaseModel):
    status: str


def product_row_to_dict(r):
    return {"id": r["id"], "name": r["name"], "category": r["category"], "price": r["price"],
            "discount": r["discount"], "stock": bool(r["stock"]), "desc": r["desc"]}

def order_row_to_dict(r):
    return {"id": r["id"], "customer": r["customer"], "phone": r["phone"],
            "items": json.loads(r["items"]), "total": r["total"], "status": r["status"], "date": r["date"]}

# ---------------------------------------------------------------------------
# Products
# ---------------------------------------------------------------------------
@app.get("/api/products")
def list_products():
    with get_db() as db:
        rows = db.execute("SELECT * FROM products").fetchall()
    return [product_row_to_dict(r) for r in rows]

@app.post("/api/products")
def create_product(p: ProductIn):
    pid = "p" + str(int(time.time() * 1000))
    with get_db() as db:
        db.execute("INSERT INTO products VALUES (?,?,?,?,?,?,?)",
                   (pid, p.name, p.category, p.price, p.discount, int(p.stock), p.desc))
    return {"id": pid, **p.dict()}

@app.put("/api/products/{pid}")
def update_product(pid: str, p: ProductUpdate):
    with get_db() as db:
        row = db.execute("SELECT * FROM products WHERE id=?", (pid,)).fetchone()
        if not row:
            raise HTTPException(404, "Product not found")
        updated = product_row_to_dict(row)
        data = p.dict(exclude_unset=True)
        updated.update(data)
        db.execute("UPDATE products SET name=?, category=?, price=?, discount=?, stock=?, desc=? WHERE id=?",
                   (updated["name"], updated["category"], updated["price"], updated["discount"],
                    int(updated["stock"]), updated["desc"], pid))
    return updated

@app.delete("/api/products/{pid}")
def delete_product(pid: str):
    with get_db() as db:
        db.execute("DELETE FROM products WHERE id=?", (pid,))
    return {"deleted": pid}

# ---------------------------------------------------------------------------
# Announcements
# ---------------------------------------------------------------------------
@app.get("/api/announcements")
def list_announcements():
    with get_db() as db:
        rows = db.execute("SELECT * FROM announcements").fetchall()
    return [{"id": r["id"], "text": r["text"]} for r in rows]

@app.post("/api/announcements")
def add_announcement(a: TextIn):
    with get_db() as db:
        cur = db.execute("INSERT INTO announcements(text) VALUES (?)", (a.text,))
        new_id = cur.lastrowid
    return {"id": new_id, "text": a.text}

@app.delete("/api/announcements/{aid}")
def delete_announcement(aid: int):
    with get_db() as db:
        db.execute("DELETE FROM announcements WHERE id=?", (aid,))
    return {"deleted": aid}

# ---------------------------------------------------------------------------
# News
# ---------------------------------------------------------------------------
@app.get("/api/news")
def list_news():
    with get_db() as db:
        rows = db.execute("SELECT * FROM news ORDER BY id DESC").fetchall()
    return [{"id": r["id"], "title": r["title"], "excerpt": r["excerpt"]} for r in rows]

@app.post("/api/news")
def add_news(n: NewsIn):
    with get_db() as db:
        cur = db.execute("INSERT INTO news(title,excerpt) VALUES (?,?)", (n.title, n.excerpt))
        new_id = cur.lastrowid
    return {"id": new_id, **n.dict()}

@app.delete("/api/news/{nid}")
def delete_news(nid: int):
    with get_db() as db:
        db.execute("DELETE FROM news WHERE id=?", (nid,))
    return {"deleted": nid}

# ---------------------------------------------------------------------------
# Top stories
# ---------------------------------------------------------------------------
@app.get("/api/stories")
def list_stories():
    with get_db() as db:
        rows = db.execute("SELECT * FROM stories ORDER BY id DESC").fetchall()
    return [{"id": r["id"], "title": r["title"], "tag": r["tag"]} for r in rows]

@app.post("/api/stories")
def add_story(s: StoryIn):
    with get_db() as db:
        cur = db.execute("INSERT INTO stories(title,tag) VALUES (?,?)", (s.title, s.tag))
        new_id = cur.lastrowid
    return {"id": new_id, **s.dict()}

@app.delete("/api/stories/{sid}")
def delete_story(sid: int):
    with get_db() as db:
        db.execute("DELETE FROM stories WHERE id=?", (sid,))
    return {"deleted": sid}

# ---------------------------------------------------------------------------
# Auth (demo-level — not production-grade security)
# ---------------------------------------------------------------------------
@app.post("/api/auth/register")
def register(u: RegisterIn):
    with get_db() as db:
        existing = db.execute("SELECT id FROM users WHERE phone=?", (u.phone,)).fetchone()
        if existing:
            raise HTTPException(409, "An account with this phone number already exists.")
        db.execute("INSERT INTO users(name,phone,email,password_hash) VALUES (?,?,?,?)",
                   (u.name, u.phone, u.email, hash_password(u.password)))
    return {"name": u.name, "phone": u.phone, "email": u.email}

@app.post("/api/auth/login")
def login(l: LoginIn):
    with get_db() as db:
        row = db.execute("SELECT * FROM users WHERE phone=? OR email=?", (l.id, l.id)).fetchone()
    if not row or row["password_hash"] != hash_password(l.password):
        raise HTTPException(401, "No matching account found. Please check your details or register.")
    return {"name": row["name"], "phone": row["phone"], "email": row["email"]}

@app.post("/api/auth/admin-login")
def admin_login(l: LoginIn):
    if l.id == ADMIN_ID and l.password == ADMIN_PASS:
        return {"success": True}
    raise HTTPException(401, "Incorrect Admin ID or Password.")

@app.get("/api/users")
def list_users():
    with get_db() as db:
        rows = db.execute("SELECT name, phone, email FROM users").fetchall()
    return [dict(r) for r in rows]

# ---------------------------------------------------------------------------
# Orders
# ---------------------------------------------------------------------------
@app.get("/api/orders")
def list_orders(phone: Optional[str] = None):
    with get_db() as db:
        if phone:
            rows = db.execute("SELECT * FROM orders WHERE phone=? ORDER BY date DESC", (phone,)).fetchall()
        else:
            rows = db.execute("SELECT * FROM orders ORDER BY date DESC").fetchall()
    return [order_row_to_dict(r) for r in rows]

@app.post("/api/orders")
def create_order(o: OrderIn):
    oid = "ORD" + str(int(time.time() * 1000))[-6:]
    today = date.today().isoformat()
    with get_db() as db:
        db.execute("INSERT INTO orders VALUES (?,?,?,?,?,?,?)",
                   (oid, o.customer, o.phone, json.dumps([i.dict() for i in o.items]), o.total, "Pending", today))
    return {"id": oid, "customer": o.customer, "phone": o.phone,
            "items": [i.dict() for i in o.items], "total": o.total, "status": "Pending", "date": today}

@app.put("/api/orders/{oid}/status")
def update_order_status(oid: str, s: StatusIn):
    with get_db() as db:
        row = db.execute("SELECT id FROM orders WHERE id=?", (oid,)).fetchone()
        if not row:
            raise HTTPException(404, "Order not found")
        db.execute("UPDATE orders SET status=? WHERE id=?", (s.status, oid))
    return {"id": oid, "status": s.status}

@app.get("/")
def root():
    return {"message": "Hassan Pharmacy API is running. Visit /docs for interactive API documentation."}
