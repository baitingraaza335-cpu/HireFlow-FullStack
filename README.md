# HireFlow — Full Stack Recruitment Platform

HireFlow is a responsive recruitment SaaS demo inspired by the supplied visual reference. It includes a marketing website, jobs listing, sample hired team, registration/login, protected user dashboard, application submission, contact form, Node.js API and an optional Python skill-match service.

## Technology
- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Backend:** Node.js, Express.js, JWT authentication, bcrypt password hashing
- **Python service:** FastAPI skill-overlap scoring endpoint
- **Demo persistence:** local JSON file at `data/store.json` (not a production database)

## Run locally
1. Install Node.js 18 or later.
2. Open this project folder in VS Code.
3. Open Terminal in VS Code and run:

```bash
npm install
npm start
```

4. Open `http://localhost:3000` in your browser.
5. Click **Register**, create an account with a valid email and password of at least 8 characters, then log in. Registration creates a real local account record in `data/store.json` and returns a signed token.

## Optional Python skill-match service
The main website and registration work without Python. To enable skill-match scoring when a user applies for a job, open a second terminal:

```bash
cd python_service
python -m venv .venv
# Windows PowerShell:
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```

The Node API calls `http://127.0.0.1:8000/match-score` when this service is running. If Python is offline, the application still submits and the match score is left blank.

## API endpoints
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | API health check |
| GET | `/api/jobs` | List available jobs |
| GET | `/api/employees` | List sample employee profiles |
| POST | `/api/register` | Validate and create an account |
| POST | `/api/login` | Verify credentials and issue token |
| GET | `/api/me` | Read current authenticated user |
| POST | `/api/applications` | Submit a job application (login required) |
| POST | `/api/contact` | Validate and save contact message |
| GET | `/api/dashboard` | Read personal dashboard data (login required) |

Python service endpoints: `GET /health` and `POST /match-score`.

## Demo employee profiles
Rahul Sharma (Frontend Developer), Priya Verma (Full Stack Developer), and Aman Gupta (Python Developer) are fictional sample profiles with illustrative AI-generated portraits. They are not real HireFlow employees.

## Important deployment notes
- The included JSON file is suitable only for a local demonstration. It is not safe for concurrent production writes or real applicant personal data. Use a managed database (for example MongoDB Atlas or PostgreSQL) before production.
- Set a strong `JWT_SECRET` environment variable before deployment. The built-in fallback secret is for local development only.
- Deploy the Node.js app to a Node-capable host. Static-only hosting such as GitHub Pages cannot run the Express API. Deploy the Python service separately if you want live skill matching, then configure the backend service URL for your hosting environment.
- Do not commit real user data, secrets, or `.env` files.

## Assignment checklist
- Responsive landing page with navigation, hero, features, about, pricing-free job discovery, contact and footer sections.
- Functional anchor navigation, job search, registration/login, application flow and validated contact form.
- Separate frontend, Node backend, Python service, data and asset folders.
- Original internship brief was front-end focused; this project adds backend registration and API functionality as an enhancement.
