// ========== EMAILJS CONFIGURATION ==========
// REPLACE WITH YOUR REAL CREDENTIALS
const EMAILJS_PUBLIC_KEY = "YOUR_PUBLIC_KEY";
const EMAILJS_SERVICE_ID = "YOUR_SERVICE_ID";
const EMAILJS_TEMPLATE_ID = "YOUR_TEMPLATE_ID";

emailjs.init(EMAILJS_PUBLIC_KEY);

// ========== DATA ==========
let currentUser = null;
let currentRole = null;
let auditLogs = [];
let offlineQueue = [];
let scannerActive = false;
let barcodeDetector = null;
let pendingAlerts = [];
let pendingReset = { username: null, email: null, tempPassword: null, userType: null };
let selectedRole = 'guard';

const assetIcons = { 'LAPTOP': '💻', 'FRIDGE': '🧊', 'MICROWAVE': '🍿', 'OTHER': '🔧' };

let users = {
    guards: [
        { id: 'G001', name: 'John Doe', password: '1234', role: 'guard', email: 'guard1@gmail.com' },
        { id: 'G002', name: 'Jane Smith', password: '1234', role: 'guard', email: 'guard2@gmail.com' }
    ],
    admins: [
        { id: 'A001', name: 'Admin User', password: '1234', role: 'admin', email: 'admin@gmail.com' }
    ],
    students: [
        { id: 'S001', studentNumber: 202394726, name: 'CN MALULEKE', password: '1234', disability: 'NONE', active: true, email: 'maluleke@gmail.com' },
        { id: 'S002', studentNumber: 202393020, name: 'BZ TWALA', password: '1234', disability: 'VISUAL_IMPAIRMENT', active: true, email: 'twala@gmail.com' }
    ]
};

let assets = [
    { id: 'AST001', barcode: 'BAR001', type: 'LAPTOP', serial: 'SN001', studentId: 'S001', studentName: 'CN MALULEKE', active: true },
    { id: 'AST002', barcode: 'BAR002', type: 'FRIDGE', serial: 'SN002', studentId: 'S002', studentName: 'BZ TWALA', active: true }
];

// ========== VOICE (only for visually impaired) ==========
function speakText(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
    }
}

// ========== REAL BARCODE SCANNER ==========
async function startRealBarcodeScan() {
    showScreen('scanScreen');
    if (scannerActive) return;
    try {
        if ('BarcodeDetector' in window) {
            barcodeDetector = new BarcodeDetector({ formats: ['code_128', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'codabar', 'code_39', 'code_93'] });
        }
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        const video = document.getElementById('video');
        video.srcObject = stream;
        await video.play();
        scannerActive = true;
        document.getElementById('scanStatus').innerHTML = '📷 Camera active - scanning...';
        startDetectionLoop();
    } catch (err) {
        document.getElementById('scanStatus').innerHTML = '⚠️ Camera failed. Use manual entry.';
        alert('Camera access denied. Use manual barcode entry.');
    }
}

async function startDetectionLoop() {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    async function detect() {
        if (!scannerActive || !video.videoWidth) { if (scannerActive) requestAnimationFrame(detect); return; }
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        if (barcodeDetector) {
            try {
                const codes = await barcodeDetector.detect(canvas);
                if (codes.length > 0 && scannerActive) {
                    const code = codes[0].rawValue;
                    document.getElementById('scanStatus').innerHTML = `✅ Barcode: ${code}`;
                    stopCamera();
                    processScan(code);
                    return;
                }
            } catch(e) {}
        }
        if (scannerActive) requestAnimationFrame(detect);
    }
    requestAnimationFrame(detect);
}

function stopCamera() {
    if (scannerActive) {
        const video = document.getElementById('video');
        if (video && video.srcObject) video.srcObject.getTracks().forEach(t => t.stop());
        scannerActive = false;
    }
}

function cancelScan() { stopCamera(); showScreen('guardScreen'); }

function manualScan() {
    const barcode = document.getElementById('manualBarcode').value.trim();
    if (!barcode) return alert('Enter barcode');
    processScan(barcode);
}

// ========== SCAN PROCESS (with shared alerts) ==========
async function processScan(barcodeId) {
    stopCamera();
    const asset = assets.find(a => a.barcode === barcodeId);
    let decision, colour, message, studentInfo = null;
    if (!asset) { decision='DENIED'; colour='red'; message='Asset not registered'; }
    else {
        const student = users.students.find(s => s.id === asset.studentId && s.active);
        if (student) {
            decision='AUTHORISED'; colour='green'; message=`Exit Authorised for ${student.name}`;
            studentInfo = { ...asset, studentName: student.name, studentNumber: student.studentNumber };
            if (student.disability === 'VISUAL_IMPAIRMENT') speakText(`Authorised. ${student.name}, your ${asset.type} verified. Exit permitted.`);
        } else {
            decision='FLAGGED'; colour='amber'; message='Mismatch. Admin notified.';
            studentInfo = asset;
            const newAlert = { id: Date.now(), scanId: Date.now(), barcode: barcodeId, studentId: asset.studentId, studentName: asset.studentName, assetType: asset.type, guardId: currentUser?.id, guardName: currentUser?.name, timestamp: new Date().toISOString(), status:'pending' };
            pendingAlerts.push(newAlert);
            savePendingAlerts();
            updateAlertBadge();
            renderPendingAlerts();
        }
    }
    const logEntry = { id: Date.now(), timestamp: new Date().toISOString(), guardId: currentUser?.id, studentName: studentInfo?.studentName, barcode: barcodeId, decision, assetType: asset?.type };
    auditLogs.unshift(logEntry);
    saveAuditLogs();
    if (currentRole === 'guard') updateGuardStats();
    if (currentRole === 'admin') updateAdminStats();
    showResult({ decision, subtext: decision==='AUTHORISED'?'Exit Permitted':(decision==='FLAGGED'?'Pending Admin':'Denied'), message, colour, studentInfo, barcode: barcodeId, assetType: asset?.type });
}

function showResult(data) {
    const container = document.getElementById('resultContainer');
    const icon = data.decision==='AUTHORISED'?'✓':(data.decision==='FLAGGED'?'△':'✗');
    let html = `<div class="result-container ${data.colour}"><div class="result-icon">${icon}</div><div class="result-text">${data.decision}</div><div class="result-subtext">${data.subtext}</div>`;
    if (data.studentInfo) html += `<div class="result-card"><div class="result-student-name">${data.studentInfo.studentName}</div><div class="result-detail">Student: ${data.studentInfo.studentNumber}</div><div class="result-detail">Asset: ${data.studentInfo.type}</div><div class="result-detail">Barcode: ${data.barcode}</div></div>`;
    else html += `<div class="result-card"><div>${data.message}</div></div>`;
    if (data.decision === 'FLAGGED') html += `<div class="voice-badge">⚠️ Admin notified. Awaiting approval.</div>`;
    html += `<button onclick="backToGuardDashboard()" class="btn-done">DONE</button>`;
    if (data.decision === 'DENIED') html += `<button onclick="alertSupervisor()" class="btn-alert">⚠️ ALERT SUPERVISOR</button>`;
    html += `</div>`;
    container.innerHTML = html;
    showScreen('resultScreen');
}

// ========== EMAIL RESET (real email) ==========
function sendResetEmail() {
    const email = document.getElementById('resetEmail').value.trim();
    const username = document.getElementById('resetUsername').value.trim();
    let foundUser = [...users.guards, ...users.admins, ...users.students].find(u => (u.id === username || u.studentNumber?.toString() === username) && u.email === email);
    if (!foundUser) { document.getElementById('resetError').innerText='No account found.'; document.getElementById('resetError').style.display='block'; return; }
    const tempPass = Math.random().toString(36).slice(-8);
    pendingReset = { username, email, tempPassword: tempPass, userType: foundUser.role || 'student' };
    emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, { to_email: email, to_name: foundUser.name, new_password: tempPass })
        .then(() => { document.getElementById('resetSuccess').innerHTML=`✓ Password sent to ${email}`; document.getElementById('resetSuccess').style.display='block'; document.getElementById('step1Container').style.display='none'; document.getElementById('step2Container').style.display='block'; })
        .catch(() => { document.getElementById('resetError').innerText='Email failed. Check EmailJS.'; document.getElementById('resetError').style.display='block'; });
}
function verifyPasswordCode() { if(document.getElementById('resetPasswordCode').value===pendingReset.tempPassword) { document.getElementById('step2Container').style.display='none'; document.getElementById('step3Container').style.display='block'; } else alert('Wrong code.'); }
function updatePassword() { let newPwd=document.getElementById('newPassword').value; if(newPwd!==document.getElementById('confirmPassword').value) return alert('Passwords mismatch'); let user = [...users.guards, ...users.admins, ...users.students].find(u=>u.id===pendingReset.username||u.studentNumber?.toString()===pendingReset.username); if(user) user.password=newPwd; alert('Password updated'); backToLogin(); }

// ========== ADMIN SHARED ALERTS ==========
function renderPendingAlerts() { let cont=document.getElementById('pendingAlertsList'); if(!cont) return; cont.innerHTML=pendingAlerts.length?pendingAlerts.map(a=>`<div class="alert-item"><strong>${a.studentName}</strong><br>Barcode: ${a.barcode}<br>Guard: ${a.guardName||a.guardId}<br>${new Date(a.timestamp).toLocaleString()}<div class="alert-actions"><button class="approve-btn" onclick="approveAlert(${a.id})">✅ Approve</button><button class="deny-btn" onclick="denyAlert(${a.id})">❌ Deny</button></div></div>`).join(''):'<div style="padding:20px;text-align:center">No pending alerts</div>'; }
function approveAlert(id){ let a=pendingAlerts.find(a=>a.id===id); if(a){ auditLogs.unshift({...a, decision:'AUTHORISED'}); pendingAlerts=pendingAlerts.filter(x=>x.id!==id); savePendingAlerts(); saveAuditLogs(); updateAlertBadge(); renderPendingAlerts(); updateAdminStats(); alert(`✅ Approved ${a.studentName}`); } }
function denyAlert(id){ let a=pendingAlerts.find(a=>a.id===id); if(a){ pendingAlerts=pendingAlerts.filter(x=>x.id!==id); savePendingAlerts(); updateAlertBadge(); renderPendingAlerts(); alert(`❌ Denied ${a.studentName}`); } }
function updateAlertBadge() { let badge=document.getElementById('alertBadge'); if(badge) badge.style.display=pendingAlerts.length?'flex':'none'; document.getElementById('alertCount').innerText=pendingAlerts.length; }

// ========== REST OF LOGIN / REGISTRATION / UI ==========
function selectRole(r){ selectedRole=r; document.getElementById('roleGuardBtn').classList.toggle('active',r==='guard'); document.getElementById('roleAdminBtn').classList.toggle('active',r==='admin'); document.getElementById('usernameLabel').innerText=r==='guard'?'Badge Number':'Admin Username'; }
function handleLogin(){ let u=document.getElementById('username').value, p=document.getElementById('password').value; let user=selectedRole==='guard'?users.guards.find(g=>g.id===u&&g.password===p):users.admins.find(a=>a.id===u&&a.password===p); if(user) { currentUser=user; currentRole=selectedRole; if(currentRole==='guard'){ document.getElementById('guardNameDisplay').innerText=user.name; loadGuardDashboard(); showScreen('guardScreen'); updateGuardStats(); } else { document.getElementById('adminNameDisplay').innerText=user.name; loadAdminDashboard(); showScreen('adminScreen'); } } else document.getElementById('loginError').innerText='Invalid credentials'; }
function loadGuardDashboard(){ updateGuardStats(); renderGuardRecentScans(); }
function updateGuardStats(){ let todayLogs=auditLogs.filter(l=>l.guardId===currentUser?.id&&new Date(l.timestamp).toDateString()===new Date().toDateString()); document.getElementById('guardScanCount').innerText=todayLogs.length; document.getElementById('guardAuthCount').innerText=todayLogs.filter(l=>l.decision==='AUTHORISED').length; document.getElementById('guardFlaggedCount').innerText=todayLogs.filter(l=>l.decision==='FLAGGED').length; document.getElementById('guardDeniedCount').innerText=todayLogs.filter(l=>l.decision==='DENIED').length; }
function renderGuardRecentScans(){ let c=document.getElementById('guardRecentScans'); let recent=auditLogs.filter(l=>l.guardId===currentUser?.id).slice(0,10); c.innerHTML=recent.length?recent.map(l=>`<div class="history-item"><div class="history-border ${l.decision==='AUTHORISED'?'green':l.decision==='FLAGGED'?'amber':'red'}"></div><div class="history-content"><div class="history-student">${l.studentName||'Unknown'}</div><div class="history-barcode">${l.barcode}</div><div class="history-time">${new Date(l.timestamp).toLocaleTimeString()}</div></div><div class="history-chip chip-${l.decision.toLowerCase()}">${l.decision}</div></div>`).join(''):'<div style="padding:20px;text-align:center">No scans today</div>'; }
function loadAdminDashboard(){ updateAdminStats(); renderStudentsTable(); renderAssetsTable(); renderGuardsTable(); renderGuardReports(); renderPendingAlerts(); populateStudentDropdown(); updateAlertBadge(); }
function updateAdminStats(){ document.getElementById('adminTotalStudents').innerText=users.students.length; document.getElementById('adminTotalAssets').innerText=assets.length; document.getElementById('adminTotalScans').innerText=auditLogs.length; document.getElementById('adminFlaggedScans').innerText=auditLogs.filter(l=>l.decision==='FLAGGED').length; let recent=auditLogs.slice(0,10); document.getElementById('adminRecentActivity').innerHTML=recent.length?recent.map(l=>`<div class="table-row"><span>${new Date(l.timestamp).toLocaleString()}</span><span>${l.studentName||'Unknown'}</span><span class="history-chip chip-${l.decision.toLowerCase()}">${l.decision}</span></div>`).join(''):'<div style="padding:20px;text-align:center">No recent activity</div>'; }
function showAdminTab(tab){ ['dashboard','students','assets','alerts','scans','guards'].forEach(t=>{ document.getElementById(`admin${t.charAt(0).toUpperCase()+t.slice(1)}Tab`).classList.remove('active'); document.getElementById(`tab${t.charAt(0).toUpperCase()+t.slice(1)}`).classList.remove('active'); }); document.getElementById(`admin${tab.charAt(0).toUpperCase()+tab.slice(1)}Tab`).classList.add('active'); document.getElementById(`tab${tab.charAt(0).toUpperCase()+tab.slice(1)}`).classList.add('active'); if(tab==='students') renderStudentsTable(); if(tab==='assets') renderAssetsTable(); if(tab==='guards') renderGuardsTable(); if(tab==='scans') renderGuardReports(); if(tab==='alerts') renderPendingAlerts(); }
function registerStudent(){ let student={ id:'S'+String(users.students.length+1).padStart(3,'0'), studentNumber:parseInt(document.getElementById('newStudentNumber').value), name:document.getElementById('newStudentName').value.toUpperCase(), password:document.getElementById('newStudentPassword').value, email:document.getElementById('newStudentEmail').value, disability:document.getElementById('newDisability').value, active:true }; users.students.push(student); renderStudentsTable(); populateStudentDropdown(); updateAdminStats(); }
function renderStudentsTable(){ let container=document.getElementById('studentsTable'); let search=document.getElementById('studentSearch')?.value.toLowerCase()||''; let filtered=users.students.filter(s=>s.name.toLowerCase().includes(search)||s.studentNumber.toString().includes(search)); container.innerHTML=filtered.map(s=>`<div class="table-row"><div><strong>${s.studentNumber}</strong><br>${s.name}<br>${s.email}<br>Disability: ${s.disability==='VISUAL_IMPAIRMENT'?'Visually Impaired':'None'}</div><button class="delete-btn" onclick="deleteStudent('${s.id}')">Delete</button></div>`).join(''); }
function registerAsset(){ let studentId=document.getElementById('assetStudentId').value; let student=users.students.find(s=>s.id===studentId); if(!student) return; assets.push({ id:'AST'+String(assets.length+1).padStart(3,'0'), barcode:document.getElementById('newAssetBarcode').value.toUpperCase(), type:document.getElementById('newAssetType').value, serial:document.getElementById('newAssetSerial').value, studentId, studentName:student.name, active:true }); renderAssetsTable(); updateAdminStats(); }
function renderAssetsTable(){ document.getElementById('assetsTable').innerHTML=assets.map(a=>{let s=users.students.find(s=>s.id===a.studentId); return `<div class="table-row"><div><strong>${a.barcode}</strong><br>${assetIcons[a.type]} ${a.type}<br>Owner: ${s?.name||'?'}</div><button class="delete-btn" onclick="deleteAsset('${a.id}')">Delete</button></div>`;}).join(''); }
function registerGuard(){ users.guards.push({ id:document.getElementById('newGuardBadge').value.toUpperCase(), name:document.getElementById('newGuardName').value, password:document.getElementById('newGuardPassword').value, role:'guard', email:document.getElementById('newGuardEmail').value }); renderGuardsTable(); }
function renderGuardsTable(){ document.getElementById('guardsTable').innerHTML=users.guards.map(g=>`<div class="table-row"><div><strong>${g.id}</strong><br>${g.name}<br>📧 ${g.email}</div><button class="delete-btn" onclick="deleteGuard('${g.id}')">Delete</button></div>`).join(''); }
function renderGuardReports(){ let stats={}; auditLogs.forEach(l=>{ if(!stats[l.guardId]) stats[l.guardId]={total:0,authorised:0,flagged:0,denied:0}; stats[l.guardId].total++; if(l.decision==='AUTHORISED') stats[l.guardId].authorised++; else if(l.decision==='FLAGGED') stats[l.guardId].flagged++; else if(l.decision==='DENIED') stats[l.guardId].denied++; }); document.getElementById('guardReportsTable').innerHTML=Object.entries(stats).map(([id,s])=>`<div class="table-row"><div><strong>Guard ${id}</strong></div><div>Total ${s.total} | ✅ ${s.authorised} | ⚠️ ${s.flagged} | ❌ ${s.denied}</div></div>`).join('')||'<div style="padding:20px;text-align:center">No reports</div>'; }
function populateStudentDropdown(){ let select=document.getElementById('assetStudentId'); select.innerHTML='<option value="">-- Student --</option>'+users.students.map(s=>`<option value="${s.id}">${s.studentNumber} - ${s.name}</option>`).join(''); }
function deleteStudent(id){ users.students=users.students.filter(s=>s.id!==id); assets=assets.filter(a=>a.studentId!==id); renderStudentsTable(); renderAssetsTable(); populateStudentDropdown(); updateAdminStats(); }
function deleteAsset(id){ assets=assets.filter(a=>a.id!==id); renderAssetsTable(); updateAdminStats(); }
function deleteGuard(id){ users.guards=users.guards.filter(g=>g.id!==id); renderGuardsTable(); }
function filterStudents(){ renderStudentsTable(); }
function filterScansByGuard(){ renderGuardReports(); }
function backToGuardDashboard(){ showScreen('guardScreen'); }
function alertSupervisor(){ alert('🚨 Supervisor notified'); }
function saveAuditLogs(){ localStorage.setItem('spass_logs',JSON.stringify(auditLogs)); }
function savePendingAlerts(){ localStorage.setItem('spass_alerts',JSON.stringify(pendingAlerts)); }
function loadAuditLogs(){ let saved=localStorage.getItem('spass_logs'); if(saved) auditLogs=JSON.parse(saved); }
function loadPendingAlerts(){ let saved=localStorage.getItem('spass_alerts'); if(saved) pendingAlerts=JSON.parse(saved); updateAlertBadge(); }
function syncOfflineQueue(){ alert('Sync placeholder'); }
function updateOfflineBanner(){}
function showScreen(id){ document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active')); document.getElementById(id).classList.add('active'); }
function backToLogin(){ showScreen('loginScreen'); }
function handleLogout(){ stopCamera(); showScreen('loginScreen'); }

loadAuditLogs();
loadPendingAlerts();
