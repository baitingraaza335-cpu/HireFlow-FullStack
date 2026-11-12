const express = require('express');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET = process.env.JWT_SECRET || 'hireflow-local-demo-secret-change-before-deploy';
const DATA_FILE = path.join(__dirname, '..', 'data', 'store.json');
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'public')));

function readStore() { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
function writeStore(data) { const tmp = DATA_FILE + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(data, null, 2)); fs.renameSync(tmp, DATA_FILE); }
function clean(value, max = 120) { return String(value || '').trim().slice(0, max); }
function auth(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Please login to continue.' });
  try { req.user = jwt.verify(token, SECRET); next(); }
  catch { return res.status(401).json({ error: 'Session expired. Please login again.' }); }
}

app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'HireFlow API', time: new Date().toISOString() }));
app.get('/api/jobs', (_req, res) => res.json(readStore().jobs));
app.get('/api/employees', (_req, res) => res.json(readStore().employees));

app.post('/api/register', async (req, res) => {
  const name = clean(req.body.name, 80), email = clean(req.body.email, 120).toLowerCase(), password = String(req.body.password || ''), confirm = String(req.body.confirmPassword || '');
  if (name.length < 2) return res.status(400).json({ error: 'Please enter your full name (at least 2 characters).' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must contain at least 8 characters.' });
  if (password !== confirm) return res.status(400).json({ error: 'Passwords do not match.' });
  const db = readStore();
  if (db.users.some(u => u.email === email)) return res.status(409).json({ error: 'An account with this email already exists. Please login.' });
  const user = { id: 'usr-' + Date.now(), name, email, passwordHash: await bcrypt.hash(password, 10), createdAt: new Date().toISOString() };
  db.users.push(user); writeStore(db);
  const token = jwt.sign({ id: user.id, name: user.name, email: user.email }, SECRET, { expiresIn: '12h' });
  res.status(201).json({ message: 'Account created successfully. Welcome to HireFlow!', token, user: { id: user.id, name, email } });
});

app.post('/api/login', async (req, res) => {
  const email = clean(req.body.email, 120).toLowerCase(), password = String(req.body.password || '');
  const user = readStore().users.find(u => u.email === email);
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return res.status(401).json({ error: 'Incorrect email or password.' });
  const token = jwt.sign({ id: user.id, name: user.name, email: user.email }, SECRET, { expiresIn: '12h' });
  res.json({ message: 'Login successful.', token, user: { id: user.id, name: user.name, email: user.email } });
});

app.get('/api/me', auth, (req, res) => res.json({ user: req.user }));
app.post('/api/applications', auth, async (req, res) => {
  const jobId = clean(req.body.jobId, 60), resumeLink = clean(req.body.resumeLink, 400), skills = clean(req.body.skills, 500);
  const db = readStore(), job = db.jobs.find(j => j.id === jobId);
  if (!job) return res.status(404).json({ error: 'This job is no longer available.' });
  if (!resumeLink || !/^https?:\/\//i.test(resumeLink)) return res.status(400).json({ error: 'Please provide a valid resume URL (starting with https://).' });
  if (db.applications.some(a => a.jobId === jobId && a.userId === req.user.id)) return res.status(409).json({ error: 'You have already applied for this job.' });
  let matchScore = null;
  try {
    const response = await fetch('http://127.0.0.1:8000/match-score', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ candidate_skills: skills, required_skills: job.skills }) , signal: AbortSignal.timeout(1200) });
    if (response.ok) matchScore = (await response.json()).match_score;
  } catch { /* Python service is optional; application still works without it. */ }
  const application = { id: 'app-' + Date.now(), jobId, jobTitle: job.title, userId: req.user.id, candidateName: req.user.name, email: req.user.email, resumeLink, skills, matchScore, status: 'Received', createdAt: new Date().toISOString() };
  db.applications.push(application); writeStore(db);
  res.status(201).json({ message: 'Application submitted successfully!', application });
});

app.post('/api/contact', (req, res) => {
  const name = clean(req.body.name, 80), email = clean(req.body.email, 120).toLowerCase(), message = clean(req.body.message, 1500);
  if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || message.length < 10) return res.status(400).json({ error: 'Enter your name, a valid email and a message of at least 10 characters.' });
  const db = readStore(); db.contacts.push({ id: 'msg-' + Date.now(), name, email, message, createdAt: new Date().toISOString() }); writeStore(db);
  res.status(201).json({ message: 'Thanks! Your message has been received.' });
});

app.get('/api/dashboard', auth, (req, res) => {
  const db = readStore();
  res.json({ user: req.user, totalJobs: db.jobs.length, totalApplications: db.applications.length, hired: db.employees.length, myApplications: db.applications.filter(a => a.userId === req.user.id), recentActivity: db.applications.slice(-5).reverse().map(a => ({ title: `New application for ${a.jobTitle}`, when: a.createdAt })) });
});

app.get('*', (_req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'index.html')));
app.listen(PORT, () => console.log(`HireFlow is running at http://localhost:${PORT}`));
