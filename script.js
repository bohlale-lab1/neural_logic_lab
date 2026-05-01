// ========== SIMPLE WORKING VERSION ==========
console.log('Script loaded - starting...');

// User database
const users = {
    guards: [
        { id: 'G001', name: 'John Doe', password: '1234', email: 'test@gmail.com' }
    ],
    admins: [
        { id: 'A001', name: 'Admin User', password: '1234', email: 'test@gmail.com' }
    ]
};

let currentUser = null;
let currentRole = null;
let selectedRole = 'guard';

// ========== SCREEN FUNCTIONS ==========
function showScreen(screenId) {
    console.log('Showing screen:', screenId);
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    const target = document.getElementById(screenId);
    if (target) {
        target.classList.add('active');
    }
}

// ========== ROLE SELECTION ==========
function selectRole(role) {
    console.log('Role selected:', role);
    selectedRole = role;
    
    const guardBtn = document.getElementById('roleGuardBtn');
    const adminBtn = document.getElementById('roleAdminBtn');
    
    if (guardBtn) {
        if (role === 'guard') {
            guardBtn.classList.add('active');
            adminBtn.classList.remove('active');
        } else {
            guardBtn.classList.remove('active');
            adminBtn.classList.add('active');
        }
    }
    
    const label = document.getElementById('usernameLabel');
    if (label) {
        label.textContent = role === 'guard' ? 'Badge Number' : 'Admin Username';
    }
}

// ========== LOGIN ==========
function handleLogin() {
    console.log('Login clicked, role:', selectedRole);
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('loginError');
    
    if (errorDiv) errorDiv.innerHTML = '';
    
    if (selectedRole === 'guard') {
        const guard = users.guards.find(g => g.id === username && g.password === password);
        if (guard) {
            currentUser = guard;
            currentRole = 'guard';
            const nameDisplay = document.getElementById('guardNameDisplay');
            if (nameDisplay) nameDisplay.textContent = guard.name;
            showScreen('guardScreen');
            updateGuardStats();
        } else {
            if (errorDiv) errorDiv.innerHTML = 'Invalid badge number or password. Try G001 / 1234';
        }
    } else if (selectedRole === 'admin') {
        const admin = users.admins.find(a => a.id === username && a.password === password);
        if (admin) {
            currentUser = admin;
            currentRole = 'admin';
            const nameDisplay = document.getElementById('adminNameDisplay');
            if (nameDisplay) nameDisplay.textContent = admin.name;
            showScreen('adminScreen');
            updateAdminStats();
        } else {
            if (errorDiv) errorDiv.innerHTML = 'Invalid admin username or password. Try A001 / 1234';
        }
    }
}

// ========== LOGOUT ==========
function handleLogout() {
    console.log('Logout clicked');
    currentUser = null;
    currentRole = null;
    showScreen('loginScreen');
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
}

// ========== FORGOT PASSWORD ==========
function showForgotPassword() {
    console.log('Show forgot password');
    showScreen('forgotPasswordScreen');
}

function sendResetEmail() {
    alert('Password reset feature: Check your email for instructions.');
}

function verifyPasswordCode() {
    alert('Code verification would happen here.');
}

function updatePassword() {
    alert('Password would be updated here.');
}

function backToLogin() {
    showScreen('loginScreen');
}

// ========== GUARD FUNCTIONS ==========
function startRealBarcodeScan() {
    alert('Barcode scanner opening. Point camera at barcode.');
    showScreen('scanScreen');
}

function cancelScan() {
    showScreen('guardScreen');
}

function manualScan() {
    const barcode = document.getElementById('manualBarcode').value.trim();
    if (!barcode) {
        alert('Please enter a barcode');
        return;
    }
    
    // Simulate scan result
    if (barcode === 'BAR001') {
        alert('✅ AUTHORISED - Exit Permitted for CN MALUKELE (Laptop)');
    } else if (barcode === 'BAR002') {
        alert('✅ AUTHORISED - Exit Permitted for BZ TWALA (Fridge) + Voice Guidance');
    } else if (barcode === 'BAR003') {
        alert('✅ AUTHORISED - Exit Permitted for TM SEKGOBELA (Microwave)');
    } else if (barcode === 'BAR999') {
        alert('⚠️ FLAGGED - Admin notification sent. Manual review required.');
    } else {
        alert('❌ DENIED - Asset not registered in system');
    }
    
    showScreen('guardScreen');
}

function syncOfflineQueue() {
    alert('No offline scans to sync');
}

function updateGuardStats() {
    document.getElementById('guardScanCount').textContent = '0';
    document.getElementById('guardAuthCount').textContent = '0';
    document.getElementById('guardFlaggedCount').textContent = '0';
    document.getElementById('guardDeniedCount').textContent = '0';
}

function renderGuardRecentScans() {
    const container = document.getElementById('guardRecentScans');
    if (container) {
        container.innerHTML = '<div style="text-align:center;padding:20px">No scans yet. Click SCAN ASSET to start.</div>';
    }
}

function loadGuardDashboard() {
    updateGuardStats();
    renderGuardRecentScans();
}

// ========== ADMIN FUNCTIONS ==========
function loadAdminDashboard() {
    updateAdminStats();
    renderStudentsTable();
    renderAssetsTable();
    renderGuardsTable();
    renderGuardReports();
    renderPendingAlerts();
}

function updateAdminStats() {
    document.getElementById('adminTotalStudents').textContent = '3';
    document.getElementById('adminTotalAssets').textContent = '5';
    document.getElementById('adminTotalScans').textContent = '0';
    document.getElementById('adminFlaggedScans').textContent = '0';
}

function showAdminTab(tab) {
    console.log('Show admin tab:', tab);
    const tabs = ['dashboard', 'students', 'assets', 'alerts', 'scans', 'guards'];
    tabs.forEach(t => {
        const tabDiv = document.getElementById(`admin${t.charAt(0).toUpperCase() + t.slice(1)}Tab`);
        const tabBtn = document.getElementById(`tab${t.charAt(0).toUpperCase() + t.slice(1)}`);
        if (tabDiv) tabDiv.classList.remove('active');
        if (tabBtn) tabBtn.classList.remove('active');
    });
    const activeTab = document.getElementById(`admin${tab.charAt(0).toUpperCase() + tab.slice(1)}Tab`);
    const activeBtn = document.getElementById(`tab${tab.charAt(0).toUpperCase() + tab.slice(1)}`);
    if (activeTab) activeTab.classList.add('active');
    if (activeBtn) activeBtn.classList.add('active');
}

function renderStudentsTable() {
    const container = document.getElementById('studentsTable');
    if (container) {
        container.innerHTML = `
            <div class="table-row"><div><strong>202394726</strong><br>CN MALULEKE<br>📧 maluleke@gmail.com<br>Disability: None</div><button class="delete-btn" onclick="alert('Delete student')">Delete</button></div>
            <div class="table-row"><div><strong>202393020</strong><br>BZ TWALA<br>📧 twala@gmail.com<br>Disability: Visually Impaired</div><button class="delete-btn" onclick="alert('Delete student')">Delete</button></div>
            <div class="table-row"><div><strong>240015914</strong><br>TM SEKGOBELA<br>📧 sekgobela@gmail.com<br>Disability: None</div><button class="delete-btn" onclick="alert('Delete student')">Delete</button></div>
        `;
    }
}

function renderAssetsTable() {
    const container = document.getElementById('assetsTable');
    if (container) {
        container.innerHTML = `
            <div class="table-row"><div><strong>BAR001</strong><br>💻 Laptop<br>Owner: CN MALULEKE</div><button class="delete-btn" onclick="alert('Delete asset')">Delete</button></div>
            <div class="table-row"><div><strong>BAR002</strong><br>🧊 Fridge<br>Owner: BZ TWALA</div><button class="delete-btn" onclick="alert('Delete asset')">Delete</button></div>
            <div class="table-row"><div><strong>BAR003</strong><br>🍿 Microwave<br>Owner: TM SEKGOBELA</div><button class="delete-btn" onclick="alert('Delete asset')">Delete</button></div>
        `;
    }
}

function renderGuardsTable() {
    const container = document.getElementById('guardsTable');
    if (container) {
        container.innerHTML = `
            <div class="table-row"><div><strong>G001</strong><br>John Doe<br>📧 guard1@gmail.com</div><button class="delete-btn" onclick="alert('Delete guard')">Delete</button></div>
            <div class="table-row"><div><strong>G002</strong><br>Jane Smith<br>📧 guard2@gmail.com</div><button class="delete-btn" onclick="alert('Delete guard')">Delete</button></div>
        `;
    }
}

function renderGuardReports() {
    const container = document.getElementById('guardReportsTable');
    if (container) {
        container.innerHTML = '<div style="text-align:center;padding:20px">No scan reports yet</div>';
    }
}

function renderPendingAlerts() {
    const container = document.getElementById('pendingAlertsList');
    if (container) {
        container.innerHTML = '<div style="text-align:center;padding:20px">No pending alerts</div>';
    }
}

function registerStudent() {
    alert('Student registration will be available in full version');
}

function registerAsset() {
    alert('Asset registration will be available in full version');
}

function registerGuard() {
    alert('Guard registration will be available in full version');
}

function populateStudentDropdown() {}
function filterStudents() {}
function filterScansByGuard() {}
function updateAlertBadge() {}

console.log('Script fully loaded! All functions ready.');
