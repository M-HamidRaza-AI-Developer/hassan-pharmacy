# Hassan Pharmacy — Full Project (Frontend + Backend)

This project has two parts that work together:

```
project/
├── site/       ← the website (open in VS Code Live Server)
└── backend/    ← the FastAPI + SQLite database server
```

The website talks to the backend over the API at `http://127.0.0.1:8000/api`
for everything that needs to be shared between users/devices: medicines,
stock levels, discounts, announcements, news, top stories, orders, and
customer accounts. The shopping cart and "who's logged in on this browser"
stay in the browser (localStorage) since those are per-device by nature.

## 1. Start the backend (do this first, every time)

```bash
cd backend
python -m venv venv                # first time only
venv\Scripts\activate               # Windows
# source venv/bin/activate          # Mac/Linux
pip install -r requirements.txt     # first time only
uvicorn main:app --reload --port 8000
```

Leave this terminal running. You should see:
`Uvicorn running on http://127.0.0.1:8000`

Visit `http://127.0.0.1:8000/docs` any time to see/try every API endpoint
directly (interactive Swagger docs) — useful for testing.

A file `backend/hassan_pharmacy.db` will be created automatically on first
run, pre-filled with 15 medicines, sample announcements, news and stories.

## 2. Open the website

In VS Code, right-click `site/index.html` → **Open with Live Server**
(or any static server). Do NOT just double-click the HTML file — some
browsers block fetch requests from `file://` pages, and Live Server also
gives you the `/admin` style routing.

Flow: `index.html` (splash) → `login.html` (Login/Register) → `home.html`
(store) → `medicines.html`, `cart.html`, `account.html`, `doctors.html`.

Admin panel: open `site/admin/index.html` (i.e. `yoursite/admin`) —
**Admin ID:** `admin` · **Password:** `hassan`

If the backend isn't running, pages will show a red banner at the top
("⚠️ Could not load products — make sure the FastAPI backend is running").
Just start the backend (step 1) and refresh.

## 3. Notes

- **Database**: SQLite file `backend/hassan_pharmacy.db`. Delete it and
  restart the server to reset all data back to the defaults.
- **CORS**: the backend allows requests from any origin (`allow_origins=["*"]`)
  so it works no matter which port Live Server uses. Tighten this before
  putting it on the public internet.
- **Passwords**: user passwords are hashed (SHA-256) before being stored,
  and the admin password is a simple hardcoded check. This is fine for a
  college project / local demo but is **not** production-grade security
  (no salting, no JWT/session tokens, no HTTPS enforcement). Don't reuse
  real passwords when testing.
- **Changing the API address**: if you deploy the backend somewhere else
  (a real server, ngrok, etc.), update the `API_BASE` constant at the top
  of `site/assets/js/main.js` to point to the new URL.
