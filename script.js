// ========== COMPLETE WORKING SCRIPT.JS ==========
console.log('Script loaded successfully!');

// ========== EMAILJS CONFIGURATION ==========
const EMAILJS_PUBLIC_KEY = "0ES007IZBpdCZsW6d";
const EMAILJS_SERVICE_ID = "service_0nxc2qy";
const EMAILJS_TEMPLATE_ID = "template_0y9wskc";

// Initialize EmailJS (will work once tracking prevention is disabled)
if (typeof emailjs !== 'undefined') {
    emailjs.init(EMAILJS_PUBLIC_KEY);
}

// ========== DATA STORAGE ==========
let currentUser = null;
let currentRole = null;
let auditLogs = [];
let offlineQueue = [];
let scannerActive = false;
let barcodeDetector = null;
let pendingAlerts = [];
let selectedRole = 'guard';

// Password reset storage
let pendingReset = {
    username: null,
    email: null,
    tempPassword: null,
    userType: null
};

const assetIcons = { 'LAPTOP': '💻', 'FRIDGE': '🧊', 'MICROWAVE': '🍿', 'OTHER': '🔧' };

// ========== USERS DATABASE ==========
let users = {
    guards: [
        { id: 'G001', name: 'John Doe', password: '1234', role: 'guard', email: 'bohlaleramoloto@gmail.com' },
        { id: 'G002', name: 'Jane Smith', password: '1234', role: 'guard', email: 'bohlaleramoloto@gmail.com'' }
    ],
    admins: [
        { id: 'A001', name: 'Admin User', password: '1234', role: 'admin', email: 'bohlaleramoloto@gmail.com'' }
    ],
    students: [
        { id: 'S001', studentNumber: 202394726, name: 'CN MALULEKE', password: '1234', disability: 'NONE', active: true, email: 'bohlaleramoloto@gmail.com'' },
        { id: 'S002', studentNumber: 202393020, name: 'BZ TWALA', password: '1234', disability: 'VISUAL_IMPAIRMENT', active: true, email: 'bohlaleramoloto@gmail.com'' },
        { id: 'S003', studentNumber: 240015914, name: 'TM SEKGOBELA', password: '1234', disability: 'NONE', active: true, email: 'bohlaleramoloto@gmail.com'' }
    ]
};

// ========== ASSETS DATABASE ==========
let assets = [
    { id: 'AST001', barcode: 'BAR001', type: 'LAPTOP', serial: 'SN001', studentId: 'S001', studentName: 'CN MALULEKE', active: true },
    { id: 'AST002', barcode: 'BAR002', type: 'FRIDGE', serial: 'SN002', studentId: 'S002', studentName: 'BZ TWALA', active: true },
    { id: 'AST003', barcode: 'BAR003', type: 'MICROWAVE', serial: 'SN003', studentId: 'S003', studentName: 'TM SEKGOBELA', active: true }
];

// ========== VOICE GUIDANCE ==========
function speakText(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
    }
}

// ========== SCREEN NAVIGATION ==========
function showScreen(screenId) {
    console.log('Showing screen:', screenId);
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
    } else {
        console.error('Screen not found:', screenId);
    }
}

// ========== ROLE SELECTION ==========
function selectRole(role) {
    console.log('Role selected:', role);
    selectedRole = role;
    const guardBtn = document.getElementById('roleGuardBtn');
    const adminBtn = document.getElementById('roleAdminBtn');
    if (guardBtn) guardBtn.classList.toggle('active', role === 'guard');
    if (adminBtn) adminBtn.classList.toggle('active', role === 'admin');
    
    const usernameLabel = document.getElementById('usernameLabel');
    if (usernameLabel) {
        usernameLabel.textContent = role === 'guard' ? 'Badge Number' : 'Admin Username';
    }
    const usernameInput = document.getElementById('username');
    if (usernameInput) {
        usernameInput.placeholder = role === 'guard' ? 'Enter your badge number (e.g., G001)' : 'Enter admin username (e.g., A001)';
    }
}

// ========== LOGIN ==========
function handleLogin() {
    console.log('Login clicked, role:', selectedRole);
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('loginError');
    
    if (errorDiv) errorDiv.style.display = 'none';
    
    if (selectedRole === 'guard') {
        const guard = users.guards.find(g => g.id === username && g.password === password);
        if (guard) {
            currentUser = guard;
            currentRole = 'guard';
            const nameDisplay = document.getElementById('guardNameDisplay');
            if (nameDisplay) nameDisplay.textContent = guard.name;
            loadGuardDashboard();
            showScreen('guardScreen');
            updateGuardStats();
            renderGuardRecentScans();
        } else {
            if (errorDiv) {
                errorDiv.textContent = 'Invalid badge number or password';
                errorDiv.style.display = 'block';
            }
        }
    } else if (selectedRole === 'admin') {
        const admin = users.admins.find(a => a.id === username && a.password === password);
        if (admin) {
            currentUser = admin;
            currentRole = 'admin';
            const nameDisplay = document.getElementById('adminNameDisplay');
            if (nameDisplay) nameDisplay.textContent = admin.name;
            loadAdminDashboard();
            showScreen('adminScreen');
        } else {
            if (errorDiv) {
                errorDiv.textContent = 'Invalid username or password';
                errorDiv.style.display = 'block';
            }
        }
    }
}

// ========== LOGOUT ==========
function handleLogout() {
    console.log('Logout clicked');
    stopCamera();
    currentUser = null;
    currentRole = null;
    showScreen('loginScreen');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    if (usernameInput) usernameInput.value = '';
    if (passwordInput) passwordInput.value = '';
}

// ========== BACK TO LOGIN ==========
function backToLogin() {
    showScreen('loginScreen');
}

// ========== FORGOT PASSWORD ==========
function showForgotPassword() {
    console.log('Show forgot password');
    const step1 = document.getElementById('step1Container');
    const step2 = document.getElementById('step2Container');
    const step3 = document.getElementById('step3Container');
    const resetError = document.getElementById('resetError');
    const resetSuccess = document.getElementById('resetSuccess');
    
    if (step1) step1.style.display = 'block';
    if (step2) step2.style.display = 'none';
    if (step3) step3.style.display = 'none';
    if (resetError) resetError.style.display = 'none';
    if (resetSuccess) resetSuccess.style.display = 'none';
    
    const resetEmail = document.getElementById('resetEmail');
    const resetUsername = document.getElementById('resetUsername');
    const resetPasswordCode = document.getElementById('resetPasswordCode');
    const newPassword = document.getElementById('newPassword');
    const confirmPassword = document.getElementById('confirmPassword');
    
    if (resetEmail) resetEmail.value = '';
    if (resetUsername) resetUsername.value = '';
    if (resetPasswordCode) resetPasswordCode.value = '';
    if (newPassword) newPassword.value = '';
    if (confirmPassword) confirmPassword.value = '';
    
    showScreen('forgotPasswordScreen');
}

function sendResetEmail() {
    console.log('Send reset email clicked');
    const email = document.getElementById('resetEmail').value.trim();
    const username = document.getElementById('resetUsername').value.trim();
    const errorDiv = document.getElementById('resetError');
    const successDiv = document.getElementById('resetSuccess');
    
    if (errorDiv) errorDiv.style.display = 'none';
    if (successDiv) successDiv.style.display = 'none';
    
    let foundUser = null;
    let userType = null;
    
    let user = users.guards.find(g => g.id === username && g.email === email);
    if (user) { foundUser = user; userType = 'guard'; }
    
    if (!foundUser) {
        user = users.admins.find(a => a.id === username && a.email === email);
        if (user) { foundUser = user; userType = 'admin'; }
    }
    
    if (!foundUser) {
        user = users.students.find(s => (s.id === username || s.studentNumber.toString() === username) && s.email === email);
        if (user) { foundUser = user; userType = 'student'; }
    }
    
    if (!foundUser) {
        if (errorDiv) {
            errorDiv.textContent = 'No account found with these credentials';
            errorDiv.style.display = 'block';
        }
        return;
    }
    
    const tempPassword = Math.random().toString(36).slice(-8);
    pendingReset = { username: username, email: email, tempPassword: tempPassword, userType: userType };
    
    const templateParams = {
        to_email: email,
        to_name: foundUser.name,
        new_password: tempPassword,
        time: new Date().toLocaleString()
    };
    
    if (typeof emailjs !== 'undefined') {
        emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams)
            .then(() => {
                if (successDiv) {
                    successDiv.innerHTML = `✓ A temporary password has been sent to ${email}`;
                    successDiv.style.display = 'block';
                }
                const step1 = document.getElementById('step1Container');
                const step2 = document.getElementById('step2Container');
                if (step1) step1.style.display = 'none';
                if (step2) step2.style.display = 'block';
            })
            .catch((error) => {
                console.error('Email error:', error);
                if (errorDiv) {
                    errorDiv.innerHTML = 'Failed to send email. Your browser may be blocking EmailJS.';
                    errorDiv.style.display = 'block';
                }
                // Show the temp password for demo purposes
                if (successDiv) {
                    successDiv.innerHTML = `⚠️ Email blocked. Demo password: ${tempPassword}`;
                    successDiv.style.display = 'block';
                }
            });
    } else {
        // EmailJS not loaded - show password for demo
        if (successDiv) {
            successDiv.innerHTML = `⚠️ EmailJS not loaded. Demo password: ${tempPassword}`;
            successDiv.style.display = 'block';
        }
    }
}

function verifyPasswordCode() {
    console.log('Verify password code clicked');
    const enteredCode = document.getElementById('resetPasswordCode').value;
    const errorDiv = document.getElementById('resetError');
    
    if (enteredCode === pendingReset.tempPassword) {
        const step2 = document.getElementById('step2Container');
        const step3 = document.getElementById('step3Container');
        if (step2) step2.style.display = 'none';
        if (step3) step3.style.display = 'block';
        if (errorDiv) errorDiv.style.display = 'none';
    } else {
        if (errorDiv) {
            errorDiv.textContent = 'Invalid password code. Please try again.';
            errorDiv.style.display = 'block';
        }
    }
}

function updatePassword() {
    console.log('Update password clicked');
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const errorDiv = document.getElementById('resetError');
    const successDiv = document.getElementById('resetSuccess');
    
    if (errorDiv) errorDiv.style.display = 'none';
    if (successDiv) successDiv.style.display = 'none';
    
    if (newPassword !== confirmPassword) {
        if (errorDiv) {
            errorDiv.textContent = 'Passwords do not match';
            errorDiv.style.display = 'block';
        }
        return;
    }
    
    if (newPassword.length < 4) {
        if (errorDiv) {
            errorDiv.textContent = 'Password must be at least 4 characters';
            errorDiv.style.display = 'block';
        }
        return;
    }
    
    let found = false;
    if (pendingReset.userType === 'guard') {
        const index = users.guards.findIndex(g => g.id === pendingReset.username);
        if (index !== -1) {
            users.guards[index].password = newPassword;
            found = true;
        }
    } else if (pendingReset.userType === 'admin') {
        const index = users.admins.findIndex(a => a.id === pendingReset.username);
        if (index !== -1) {
            users.admins[index].password = newPassword;
            found = true;
        }
    } else if (pendingReset.userType === 'student') {
        const index = users.students.findIndex(s => s.id === pendingReset.username || s.studentNumber.toString() === pendingReset.username);
        if (index !== -1) {
            users.students[index].password = newPassword;
            found = true;
        }
    }
    
    if (found) {
        if (successDiv) {
            successDiv.textContent = 'Password updated successfully! Please login.';
            successDiv.style.display = 'block';
        }
        pendingReset = { username: null, email: null, tempPassword: null, userType: null };
        setTimeout(() => backToLogin(), 2000);
    }
}

// ========== REAL BARCODE SCANNER ==========
async function startRealBarcodeScan() {
    showScreen('scanScreen');
    if (scannerActive) return;
    
    try {
        if ('BarcodeDetector' in window) {
            barcodeDetector = new BarcodeDetector({ 
                formats: ['code_128', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'codabar', 'code_39', 'code_93'] 
            });
        }
        
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        const video = document.getElementById('video');
        video.srcObject = stream;
        await video.play();
        scannerActive = true;
        document.getElementById('scanStatus').innerHTML = '📷 Camera active - scanning for barcodes...';
        startDetectionLoop();
    } catch (err) {
        console.error('Camera error:', err);
        document.getElementById('scanStatus').innerHTML = '⚠️ Camera access failed. Use manual entry.';
        alert('Camera access denied. Please use manual barcode entry.');
    }
}

async function startDetectionLoop() {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    
    async function detect() {
        if (!scannerActive || !video.videoWidth) {
            if (scannerActive) requestAnimationFrame(detect);
            return;
        }
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        if (barcodeDetector) {
            try {
                const codes = await barcodeDetector.detect(canvas);
                if (codes.length > 0 && scannerActive) {
                    const code = codes[0].rawValue;
                    document.getElementById('scanStatus').innerHTML = `✅ Barcode detected: ${code}`;
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
        if (video && video.srcObject) {
            video.srcObject.getTracks().forEach(track => track.stop());
            video.srcObject = null;
        }
        scannerActive = false;
        barcodeDetector = null;
    }
}

function cancelScan() {
    stopCamera();
    showScreen('guardScreen');
    document.getElementById('manualBarcode').value = '';
}

function manualScan() {
    const barcode = document.getElementById('manualBarcode').value.trim();
    if (!barcode) {
        alert('Enter a barcode number');
        return;
    }
    processScan(barcode);
}

// ========== PROCESS SCAN ==========
async function processScan(barcodeId) {
    stopCamera();
    
    const asset = assets.find(a => a.barcode === barcodeId);
    let decision, colour, message, studentInfo = null;
    
    if (!asset) {
        decision = 'DENIED';
        colour = 'red';
        message = 'Asset not registered in system';
    } else if (!asset.active) {
        decision = 'DENIED';
        colour = 'red';
        message = 'Asset is deactivated';
    } else {
        const student = users.students.find(s => s.id === asset.studentId && s.active);
        if (student) {
            decision = 'AUTHORISED';
            colour = 'green';
            message = `Exit Authorised for ${student.name}`;
            studentInfo = { ...asset, studentName: student.name, studentNumber: student.studentNumber };
            
            if (student.disability === 'VISUAL_IMPAIRMENT') {
                speakText(`Authorised. ${student.name}, your ${asset.type} has been verified. Exit permitted.`);
            }
        } else {
            decision = 'FLAGGED';
            colour = 'amber';
            message = 'Asset ownership mismatch. Admin verification required.';
            studentInfo = asset;
            
            const newAlert = {
                id: Date.now(),
                scanId: Date.now(),
                barcode: barcodeId,
                studentId: asset.studentId,
                studentName: asset.studentName,
                assetType: asset.type,
                guardId: currentUser?.id,
                guardName: currentUser?.name,
                timestamp: new Date().toISOString(),
                status: 'pending'
            };
            pendingAlerts.push(newAlert);
            savePendingAlerts();
            updateAlertBadge();
            renderPendingAlerts();
        }
    }
    
    const logEntry = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        guardId: currentUser?.id,
        studentName: studentInfo?.studentName || 'Unknown',
        barcode: barcodeId,
        decision: decision,
        assetType: asset?.type
    };
    auditLogs.unshift(logEntry);
    saveAuditLogs();
    
    if (currentRole === 'guard') {
        updateGuardStats();
        renderGuardRecentScans();
    }
    if (currentRole === 'admin') {
        updateAdminStats();
    }
    
    showResult({ decision, subtext: decision === 'AUTHORISED' ? 'Exit Permitted' : (decision === 'FLAGGED' ? 'Pending Admin Approval' : 'Do Not Allow Exit'), message, colour, studentInfo, barcode: barcodeId, assetType: asset?.type });
}

function showResult(data) {
    const container = document.getElementById('resultContainer');
    const icon = data.decision === 'AUTHORISED' ? '✓' : (data.decision === 'FLAGGED' ? '△' : '✗');
    const assetIcon = assetIcons[data.assetType] || '📦';
    
    let html = `<div class="result-container ${data.colour}" style="min-height:700px">
        <div class="result-icon">${icon}</div>
        <div class="result-text">${data.decision}</div>
        <div class="result-subtext">${data.subtext}</div>`;
    
    if (data.studentInfo) {
        html += `<div class="result-card">
            <div class="result-student-name">${data.studentInfo.studentName || 'Unknown'}</div>
            <div class="result-detail">Student: ${data.studentInfo.studentNumber || 'N/A'}</div>
            <div class="result-detail">${assetIcon} Asset: ${data.studentInfo.type || 'Unknown'}</div>
            <div class="result-detail">Barcode: ${data.barcode}</div>
        </div>`;
    } else if (data.decision !== 'OFFLINE') {
        html += `<div class="result-card"><div class="result-detail">Barcode: ${data.barcode}</div><div>${data.message}</div></div>`;
    }
    
    if (data.decision === 'FLAGGED') {
        html += `<div class="voice-badge">⚠️ Admin has been notified. Please wait for approval.</div>`;
    }
    
    html += `<button onclick="backToGuardDashboard()" class="btn-done">DONE</button>`;
    if (data.decision === 'DENIED') {
        html += `<button onclick="alertSupervisor()" class="btn-alert">⚠️ ALERT SUPERVISOR</button>`;
    }
    html += `</div>`;
    
    container.innerHTML = html;
    showScreen('resultScreen');
}

function backToGuardDashboard() {
    showScreen('guardScreen');
    document.getElementById('manualBarcode').value = '';
}

function alertSupervisor() {
    speakText('Supervisor has been notified');
    alert('🚨 Supervisor has been notified of this security incident.');
}

// ========== ADMIN FUNCTIONS ==========
function loadAdminDashboard() {
    updateAdminStats();
    renderStudentsTable();
    renderAssetsTable();
    renderGuardsTable();
    renderGuardReports();
    renderPendingAlerts();
    populateStudentDropdown();
    updateAlertBadge();
}

function updateAdminStats() {
    document.getElementById('adminTotalStudents').textContent = users.students.filter(s => s.active !== false).length;
    document.getElementById('adminTotalAssets').textContent = assets.filter(a => a.active !== false).length;
    document.getElementById('adminTotalScans').textContent = auditLogs.length;
    document.getElementById('adminFlaggedScans').textContent = auditLogs.filter(l => l.decision === 'FLAGGED').length;
    
    const recent = auditLogs.slice(0, 10);
    const container = document.getElementById('adminRecentActivity');
    if (recent.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:20px;color:#94a3b8">No recent activity</div>';
    } else {
        container.innerHTML = recent.map(log => `
            <div class="table-row">
                <span>${new Date(log.timestamp).toLocaleString()}</span>
                <span>${log.studentName || 'Unknown'}</span>
                <span class="history-chip chip-${log.decision.toLowerCase()}">${log.decision}</span>
            </div>
        `).join('');
    }
}

function showAdminTab(tab) {
    const tabs = ['dashboard', 'students', 'assets', 'alerts', 'scans', 'guards'];
    tabs.forEach(t => {
        const tabEl = document.getElementById(`admin${t.charAt(0).toUpperCase() + t.slice(1)}Tab`);
        const btnEl = document.getElementById(`tab${t.charAt(0).toUpperCase() + t.slice(1)}`);
        if (tabEl) tabEl.classList.remove('active');
        if (btnEl) btnEl.classList.remove('active');
    });
    document.getElementById(`admin${tab.charAt(0).toUpperCase() + tab.slice(1)}Tab`).classList.add('active');
    document.getElementById(`tab${tab.charAt(0).toUpperCase() + tab.slice(1)}`).classList.add('active');
    
    if (tab === 'students') renderStudentsTable();
    if (tab === 'assets') renderAssetsTable();
    if (tab === 'guards') renderGuardsTable();
    if (tab === 'scans') renderGuardReports();
    if (tab === 'alerts') renderPendingAlerts();
}

// ========== STUDENT MANAGEMENT ==========
function registerStudent() {
    const studentNumber = document.getElementById('newStudentNumber').value;
    const name = document.getElementById('newStudentName').value;
    const email = document.getElementById('newStudentEmail').value;
    const password = document.getElementById('newStudentPassword').value;
    const disability = document.getElementById('newDisability').value;
    
    if (!studentNumber || !name || !email || !password) {
        document.getElementById('studentRegMessage').innerHTML = '<span style="color:red">Fill all fields</span>';
        return;
    }
    
    const newStudent = {
        id: 'S' + String(users.students.length + 1).padStart(3, '0'),
        studentNumber: parseInt(studentNumber),
        name: name.toUpperCase(),
        password: password,
        email: email,
        disability: disability,
        active: true
    };
    users.students.push(newStudent);
    
    document.getElementById('studentRegMessage').innerHTML = '<span style="color:green">✓ Student registered successfully!</span>';
    document.getElementById('newStudentNumber').value = '';
    document.getElementById('newStudentName').value = '';
    document.getElementById('newStudentEmail').value = '';
    document.getElementById('newStudentPassword').value = '';
    renderStudentsTable();
    populateStudentDropdown();
    updateAdminStats();
}

function deleteStudent(id) {
    if (confirm('Delete this student? All linked assets will also be deleted.')) {
        users.students = users.students.filter(s => s.id !== id);
        assets = assets.filter(a => a.studentId !== id);
        renderStudentsTable();
        renderAssetsTable();
        populateStudentDropdown();
        updateAdminStats();
    }
}

function renderStudentsTable() {
    const container = document.getElementById('studentsTable');
    const searchTerm = document.getElementById('studentSearch')?.value.toLowerCase() || '';
    const filtered = users.students.filter(s => 
        s.name.toLowerCase().includes(searchTerm) || 
        s.studentNumber.toString().includes(searchTerm)
    );
    
    if (filtered.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:20px;color:#94a3b8">No students found</div>';
        return;
    }
    
    container.innerHTML = filtered.map(s => `
        <div class="table-row">
            <div>
                <strong>${s.studentNumber}</strong><br>
                <small>${s.name}</small><br>
                <small>📧 ${s.email}</small><br>
                <small>Disability: ${s.disability === 'VISUAL_IMPAIRMENT' ? 'Visually Impaired' : 'None'}</small>
            </div>
            <button class="delete-btn" onclick="deleteStudent('${s.id}')">Delete</button>
        </div>
    `).join('');
}

function filterStudents() { renderStudentsTable(); }

// ========== ASSET MANAGEMENT ==========
function registerAsset() {
    const barcodeId = document.getElementById('newAssetBarcode').value;
    const assetType = document.getElementById('newAssetType').value;
    const serialNumber = document.getElementById('newAssetSerial').value;
    const studentId = document.getElementById('assetStudentId').value;
    
    if (!barcodeId || !studentId) {
        document.getElementById('assetRegMessage').innerHTML = '<span style="color:red">Fill barcode and select student</span>';
        return;
    }
    
    const student = users.students.find(s => s.id === studentId);
    if (!student) {
        document.getElementById('assetRegMessage').innerHTML = '<span style="color:red">Invalid student selected</span>';
        return;
    }
    
    const newAsset = {
        id: 'AST' + String(assets.length + 1).padStart(3, '0'),
        barcode: barcodeId.toUpperCase(),
        type: assetType,
        serial: serialNumber || 'N/A',
        studentId: studentId,
        studentName: student.name,
        active: true
    };
    assets.push(newAsset);
    
    document.getElementById('assetRegMessage').innerHTML = `<span style="color:green">✓ Asset registered! Barcode: ${barcodeId.toUpperCase()}</span>`;
    document.getElementById('newAssetBarcode').value = '';
    document.getElementById('newAssetSerial').value = '';
    renderAssetsTable();
    updateAdminStats();
}

function deleteAsset(id) {
    if (confirm('Delete this asset?')) {
        assets = assets.filter(a => a.id !== id);
        renderAssetsTable();
        updateAdminStats();
    }
}

function renderAssetsTable() {
    const container = document.getElementById('assetsTable');
    
    if (assets.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:20px;color:#94a3b8">No assets registered</div>';
        return;
    }
    
    container.innerHTML = assets.map(a => {
        const student = users.students.find(s => s.id === a.studentId);
        return `
            <div class="table-row">
                <div>
                    <strong>${a.barcode}</strong><br>
                    <small>${assetIcons[a.type]} ${a.type}</small><br>
                    <small>Owner: ${student?.name || 'Unknown'}</small>
                </div>
                <button class="delete-btn" onclick="deleteAsset('${a.id}')">Delete</button>
            </div>
        `;
    }).join('');
}

function populateStudentDropdown() {
    const select = document.getElementById('assetStudentId');
    if (select) {
        select.innerHTML = '<option value="">-- Select Student --</option>' + 
            users.students.filter(s => s.active !== false).map(s => 
                `<option value="${s.id}">${s.studentNumber} - ${s.name}</option>`
            ).join('');
    }
}

// ========== GUARD MANAGEMENT ==========
function registerGuard() {
    const badge = document.getElementById('newGuardBadge').value;
    const name = document.getElementById('newGuardName').value;
    const email = document.getElementById('newGuardEmail').value;
    const password = document.getElementById('newGuardPassword').value;
    
    if (!badge || !name || !email || !password) {
        document.getElementById('guardRegMessage').innerHTML = '<span style="color:red">Fill all fields</span>';
        return;
    }
    
    const newGuard = {
        id: badge.toUpperCase(),
        name: name,
        password: password,
        role: 'guard',
        email: email
    };
    users.guards.push(newGuard);
    
    document.getElementById('guardRegMessage').innerHTML = '<span style="color:green">✓ Guard registered successfully!</span>';
    document.getElementById('newGuardBadge').value = '';
    document.getElementById('newGuardName').value = '';
    document.getElementById('newGuardEmail').value = '';
    document.getElementById('newGuardPassword').value = '';
    renderGuardsTable();
}

function deleteGuard(id) {
    if (confirm('Delete this guard?')) {
        users.guards = users.guards.filter(g => g.id !== id);
        renderGuardsTable();
    }
}

function renderGuardsTable() {
    const container = document.getElementById('guardsTable');
    
    if (users.guards.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:20px;color:#94a3b8">No guards registered</div>';
        return;
    }
    
    container.innerHTML = users.guards.map(g => `
        <div class="table-row">
            <div>
                <strong>${g.id}</strong><br>
                <small>${g.name}</small><br>
                <small>📧 ${g.email}</small>
            </div>
            <button class="delete-btn" onclick="deleteGuard('${g.id}')">Delete</button>
        </div>
    `).join('');
}

// ========== GUARD REPORTS ==========
function renderGuardReports() {
    const container = document.getElementById('guardReportsTable');
    const guardFilter = document.getElementById('guardFilter').value;
    
    const guardStats = {};
    auditLogs.forEach(log => {
        if (guardFilter !== 'ALL' && log.guardId !== guardFilter) return;
        if (!guardStats[log.guardId]) {
            guardStats[log.guardId] = { total: 0, authorised: 0, flagged: 0, denied: 0 };
        }
        guardStats[log.guardId].total++;
        if (log.decision === 'AUTHORISED') guardStats[log.guardId].authorised++;
        else if (log.decision === 'FLAGGED') guardStats[log.guardId].flagged++;
        else if (log.decision === 'DENIED') guardStats[log.guardId].denied++;
    });
    
    const guardSelect = document.getElementById('guardFilter');
    if (guardSelect && (guardSelect.innerHTML === '<option value="ALL">All Guards</option>' || guardSelect.options.length <= 1)) {
        guardSelect.innerHTML = '<option value="ALL">All Guards</option>' + 
            users.guards.map(g => `<option value="${g.id}">${g.id} - ${g.name}</option>`).join('');
    }
    
    if (Object.keys(guardStats).length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:20px;color:#94a3b8">No scan reports available</div>';
        return;
    }
    
    container.innerHTML = Object.entries(guardStats).map(([guardId, stats]) => `
        <div class="table-row">
            <div><strong>Guard: ${guardId}</strong></div>
            <div>Total: ${stats.total} | ✅ ${stats.authorised} | ⚠️ ${stats.flagged} | ❌ ${stats.denied}</div>
        </div>
    `).join('');
}

function filterScansByGuard() { renderGuardReports(); }

// ========== ADMIN ALERTS ==========
function renderPendingAlerts() {
    const container = document.getElementById('pendingAlertsList');
    if (!container) return;
    
    if (pendingAlerts.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:40px;color:#94a3b8">No pending verification requests</div>';
        return;
    }
    
    container.innerHTML = pendingAlerts.map(alert => `
        <div class="alert-item">
            <div class="alert-student">🎓 ${alert.studentName}</div>
            <div class="alert-barcode">📦 Barcode: ${alert.barcode} (${alert.assetType})</div>
            <div class="alert-barcode">👮 Guard: ${alert.guardName || alert.guardId}</div>
            <div class="alert-barcode">🕐 ${new Date(alert.timestamp).toLocaleString()}</div>
            <div class="alert-actions">
                <button class="approve-btn" onclick="approveAlert(${alert.id})">✅ Approve Exit</button>
                <button class="deny-btn" onclick="denyAlert(${alert.id})">❌ Deny Exit</button>
            </div>
        </div>
    `).join('');
}

function approveAlert(alertId) {
    const alert = pendingAlerts.find(a => a.id === alertId);
    if (!alert) return;
    
    auditLogs.unshift({
        id: alert.scanId,
        timestamp: alert.timestamp,
        guardId: alert.guardId,
        studentName: alert.studentName,
        barcode: alert.barcode,
        decision: 'AUTHORISED',
        assetType: alert.assetType,
        wasApproved: true
    });
    
    pendingAlerts = pendingAlerts.filter(a => a.id !== alertId);
    savePendingAlerts();
    saveAuditLogs();
    updateAlertBadge();
    renderPendingAlerts();
    updateAdminStats();
    
    alert(`✅ Exit approved for ${alert.studentName}`);
}

function denyAlert(alertId) {
    const alert = pendingAlerts.find(a => a.id === alertId);
    if (!alert) return;
    
    auditLogs.unshift({
        id: alert.scanId,
        timestamp: alert.timestamp,
        guardId: alert.guardId,
        studentName: alert.studentName,
        barcode: alert.barcode,
        decision: 'DENIED',
        assetType: alert.assetType,
        wasDenied: true
    });
    
    pendingAlerts = pendingAlerts.filter(a => a.id !== alertId);
    savePendingAlerts();
    saveAuditLogs();
    updateAlertBadge();
    renderPendingAlerts();
    updateAdminStats();
    
    alert(`❌ Exit denied for ${alert.studentName}`);
}

function updateAlertBadge() {
    const badge = document.getElementById('alertBadge');
    const countSpan = document.getElementById('alertCount');
    if (badge && countSpan) {
        if (pendingAlerts.length > 0) {
            badge.style.display = 'flex';
            countSpan.textContent = pendingAlerts.length;
        } else {
            badge.style.display = 'none';
        }
    }
}

// ========== GUARD DASHBOARD FUNCTIONS ==========
function loadGuardDashboard() {
    updateGuardStats();
    renderGuardRecentScans();
}

function updateGuardStats() {
    const today = new Date().toDateString();
    const todayLogs = auditLogs.filter(l => l.guardId === currentUser?.id && new Date(l.timestamp).toDateString() === today);
    document.getElementById('guardScanCount').textContent = todayLogs.length;
    document.getElementById('guardAuthCount').textContent = todayLogs.filter(l => l.decision === 'AUTHORISED').length;
    document.getElementById('guardFlaggedCount').textContent = todayLogs.filter(l => l.decision === 'FLAGGED').length;
    document.getElementById('guardDeniedCount').textContent = todayLogs.filter(l => l.decision === 'DENIED').length;
}

function renderGuardRecentScans() {
    const container = document.getElementById('guardRecentScans');
    const recent = auditLogs.filter(l => l.guardId === currentUser?.id).slice(0, 10);
    
    if (recent.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:20px;color:#94a3b8">No scans today</div>';
        return;
    }
    
    container.innerHTML = recent.map(log => `
        <div class="history-item">
            <div class="history-border ${log.decision === 'AUTHORISED' ? 'green' : (log.decision === 'FLAGGED' ? 'amber' : 'red')}"></div>
            <div class="history-content">
                <div class="history-student">${log.studentName || 'Unknown'}</div>
                <div class="history-barcode">${log.barcode}</div>
                <div class="history-time">${new Date(log.timestamp).toLocaleTimeString()}</div>
            </div>
            <div class="history-chip chip-${log.decision.toLowerCase()}">${log.decision}</div>
        </div>
    `).join('');
}

// ========== OFFLINE QUEUE ==========
function saveOfflineQueue() { localStorage.setItem('spass_offline', JSON.stringify(offlineQueue)); }
function loadOfflineQueue() { 
    const saved = localStorage.getItem('spass_offline'); 
    if(saved) { offlineQueue = JSON.parse(saved); updateOfflineBanner(); } 
}
function updateOfflineBanner() {
    const banner = document.getElementById('offlineQueueBanner');
    if(banner && offlineQueue.length > 0) { 
        banner.style.display = 'block'; 
        document.getElementById('queueSize').innerText = offlineQueue.length; 
    } else if(banner) { banner.style.display = 'none'; }
}
function syncOfflineQueue() {
    if(offlineQueue.length === 0) { alert('No offline scans'); return; }
    let synced = 0;
    offlineQueue.forEach(scan => {
        const asset = assets.find(a => a.barcode === scan.barcode_id);
        if(asset) {
            const student = users.students.find(s => s.id === asset.studentId);
            auditLogs.unshift({ 
                id: Date.now()+synced, 
                timestamp: scan.timestamp, 
                guardId: currentUser?.id, 
                studentName: student?.name, 
                barcode: scan.barcode_id, 
                decision: 'AUTHORISED', 
                assetType: asset.type 
            });
            synced++;
        }
    });
    saveAuditLogs();
    offlineQueue = [];
    saveOfflineQueue();
    updateOfflineBanner();
    updateGuardStats();
    renderGuardRecentScans();
    alert(`${synced} scans synced`);
}

// ========== STORAGE ==========
function saveAuditLogs() { localStorage.setItem('spass_logs', JSON.stringify(auditLogs)); }
function loadAuditLogs() { const saved = localStorage.getItem('spass_logs'); if(saved) auditLogs = JSON.parse(saved); }
function savePendingAlerts() { localStorage.setItem('spass_alerts', JSON.stringify(pendingAlerts)); }
function loadPendingAlerts() { const saved = localStorage.getItem('spass_alerts'); if(saved) { pendingAlerts = JSON.parse(saved); updateAlertBadge(); } }

// ========== NETWORK LISTENERS ==========
window.addEventListener('online', () => { if(offlineQueue.length > 0 && currentUser) alert('Network restored! Click "Sync Offline Scans"'); });
window.addEventListener('offline', () => alert('⚠️ Network disconnected. Scans will be saved offline.'));

// ========== INITIALIZE ==========
console.log('Script loaded successfully! All functions are defined.');
loadAuditLogs();
loadOfflineQueue();
loadPendingAlerts();
