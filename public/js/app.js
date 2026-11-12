const API = '/api';
const state = { jobs: [], authMode: 'register', token: localStorage.getItem('hireflow_token') || '', user: JSON.parse(localStorage.getItem('hireflow_user') || 'null') };
const $ = (selector) => document.querySelector(selector);
const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function toast(message) { const el = $('#toast'); el.textContent = message; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 3200); }
async function request(url, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const response = await fetch(API + url, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
  return data;
}
function renderJobs(jobs) {
  const grid = $('#jobsGrid');
  if (!jobs.length) { grid.innerHTML = '<div class="loading-card">No jobs match your search. Try another keyword.</div>'; return; }
  grid.innerHTML = jobs.map(job => `<article class="job-card"><div class="job-card-top"><span class="job-logo">${escapeHTML(job.logo || 'HF')}</span><span class="job-type">${escapeHTML(job.type)}</span></div><h3>${escapeHTML(job.title)}</h3><div class="job-company">${escapeHTML(job.company)}</div><div class="job-meta"><span>⌖ ${escapeHTML(job.location)}</span><span>◷ ${escapeHTML(job.type)}</span></div><div class="skill-tags">${job.skills.map(skill => `<span>${escapeHTML(skill)}</span>`).join('')}</div><div class="job-card-bottom"><span class="salary">${escapeHTML(job.salary)}</span><button class="btn btn-primary apply-btn" data-job-id="${escapeHTML(job.id)}">Apply Now</button></div></article>`).join('');
}
async function loadJobs() { try { state.jobs = await request('/jobs'); renderJobs(state.jobs); $('#dashJobs').textContent = String(state.jobs.length).padStart(2,'0'); } catch (e) { $('#jobsGrid').innerHTML = `<div class="loading-card">${escapeHTML(e.message)}. Please make sure the Node server is running.</div>`; } }
async function loadDashboard() { if (!state.token) return; try { const data = await request('/dashboard'); $('#dashApplications').textContent = String(data.totalApplications).padStart(2,'0'); } catch { state.token = ''; localStorage.removeItem('hireflow_token'); } }
function openAuth(mode = 'register') { setAuthMode(mode); $('#authModal').classList.add('open'); $('#authModal').setAttribute('aria-hidden','false'); document.body.style.overflow='hidden'; }
function closeAuth() { $('#authModal').classList.remove('open'); $('#authModal').setAttribute('aria-hidden','true'); document.body.style.overflow=''; $('#authMessage').textContent=''; }
function setAuthMode(mode) { state.authMode = mode; const register = mode === 'register'; $('#authTitle').textContent = register ? 'Create your account' : 'Welcome back'; $('#authSubtitle').textContent = register ? 'Join HireFlow and explore better opportunities.' : 'Login to view your HireFlow dashboard.'; $('#nameField').hidden = !register; $('#confirmField').hidden = !register; $('#nameField input').required = register; $('#confirmField input').required = register; $('#authForm [name="password"]').autocomplete = register ? 'new-password' : 'current-password'; $('#authSubmit').textContent = register ? 'Create Account →' : 'Login to HireFlow →'; document.querySelectorAll('.auth-tab').forEach(tab => tab.classList.toggle('active', tab.dataset.authTab === mode)); $('#authMessage').textContent=''; }
function saveSession(data) { state.token=data.token; state.user=data.user; localStorage.setItem('hireflow_token',data.token); localStorage.setItem('hireflow_user',JSON.stringify(data.user)); }
function showFormMessage(el, message, isError=false) { el.textContent=message; el.classList.toggle('error',isError); }
document.addEventListener('click', async (event) => {
  const authButton = event.target.closest('[data-open-auth]'); if (authButton) openAuth(authButton.dataset.openAuth);
  const tab = event.target.closest('[data-auth-tab]'); if (tab) setAuthMode(tab.dataset.authTab);
  const apply = event.target.closest('.apply-btn'); if (apply) { if (!state.token) { openAuth('login'); toast('Please register or login before applying.'); return; } const job=state.jobs.find(j=>j.id===apply.dataset.jobId); const resumeLink=prompt(`Applying for ${job.title}\nPaste your resume URL (Google Drive or portfolio link):`); if (resumeLink===null) return; const skills=prompt('Enter your skills separated by commas:','HTML, CSS, JavaScript'); if (skills===null) return; try { const result=await request('/applications',{method:'POST',body:JSON.stringify({jobId:job.id,resumeLink,skills})}); toast(result.message + (result.application.matchScore!==null ? ` Skill match: ${result.application.matchScore}%` : '')); loadDashboard(); } catch(e) { toast(e.message); } }
});
$('#closeModal').addEventListener('click',closeAuth); $('#authModal').addEventListener('click',e=>{if(e.target===$('#authModal'))closeAuth();}); document.addEventListener('keydown',e=>{if(e.key==='Escape')closeAuth();});
$('#authForm').addEventListener('submit', async (event) => { event.preventDefault(); const form=event.currentTarget, values=Object.fromEntries(new FormData(form).entries()); const register=state.authMode==='register'; const button=$('#authSubmit'); button.disabled=true; button.textContent='Please wait...'; try { const data=await request(register?'/register':'/login',{method:'POST',body:JSON.stringify(values)}); saveSession(data); showFormMessage($('#authMessage'),data.message); toast(`Welcome${data.user.name ? ', '+data.user.name : ''}!`); closeAuth(); await loadDashboard(); } catch(e) { showFormMessage($('#authMessage'),e.message,true); } finally { button.disabled=false; button.textContent=register?'Create Account →':'Login to HireFlow →'; } });
$('#contactForm').addEventListener('submit',async event=>{event.preventDefault();const form=event.currentTarget;const button=form.querySelector('button');button.disabled=true;try{const data=await request('/contact',{method:'POST',body:JSON.stringify(Object.fromEntries(new FormData(form).entries()))});showFormMessage($('#contactMessage'),data.message);form.reset();}catch(e){showFormMessage($('#contactMessage'),e.message,true);}finally{button.disabled=false;}});
function filterJobs(){const query=$('#jobSearch').value.trim().toLowerCase();renderJobs(state.jobs.filter(job=>[job.title,job.company,job.location,...job.skills].join(' ').toLowerCase().includes(query)));}
$('#searchJobs').addEventListener('click',filterJobs);$('#jobSearch').addEventListener('keydown',e=>{if(e.key==='Enter')filterJobs();});$('#jobSearch').addEventListener('input',filterJobs);
$('#menuToggle').addEventListener('click',()=>$('#mainNav').classList.toggle('open'));$('#mainNav').addEventListener('click',e=>{if(e.target.closest('a'))$('#mainNav').classList.remove('open');});
$('#year').textContent=new Date().getFullYear();loadJobs();loadDashboard();
