// ========== SIMPLE TEST VERSION - ALL BUTTONS WORK ==========

// EmailJS Config
const EMAILJS_PUBLIC_KEY = "0ES007IZBpdCZsW6d";
const EMAILJS_SERVICE_ID = "service_0nxc2qy";
const EMAILJS_TEMPLATE_ID = "template_0y9wskc";

emailjs.init(EMAILJS_PUBLIC_KEY);

// ========== BASIC DATA ==========
let currentUser = null;
let currentRole = null;
let selectedRole = 'guard';

// Test users
const users = {
    guards: [
        { id: 'G001', name: 'John Doe', password: '1234', email: 'YOUR_EMAIL@gmail.com' }
    ],
    admins: [
        { id: 'A001', name: 'Admin User', password: '1234', email: 'YOUR_EMAIL@gmail.com' }
    ]
};

// Password reset storage
let pendingReset = { username: null, email: null, tempPassword: null, userType: null };

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
            showScreen('guardScreen');
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
    // Reset all containers
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
    
    // Clear inputs
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
    
    // Find user
    let foundUser = null;
    let userType = null;
    
    let user = users.guards.find(g => g.id === username && g.email === email);
    if (user) { foundUser = user; userType = 'guard'; }
    
    if (!foundUser) {
        user = users.admins.find(a => a.id === username && a.email === email);
        if (user) { foundUser = user; userType = 'admin'; }
    }
    
    if (!foundUser) {
        if (errorDiv) {
            errorDiv.textContent = 'No account found with these credentials';
            errorDiv.style.display = 'block';
        }
        return;
    }
    
    // Generate temporary password
    const tempPassword = Math.random().toString(36).slice(-8);
    pendingReset = { username: username, email: email, tempPassword: tempPassword, userType: userType };
    
    // Send email
    const templateParams = {
        to_email: email,
        to_name: foundUser.name,
        new_password: tempPassword,
        time: new Date().toLocaleString()
    };
    
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
                errorDiv.innerHTML = 'Failed to send email. Check console for details.';
                errorDiv.style.display = 'block';
            }
        });
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

// ========== ADMIN FUNCTIONS (Simplified) ==========
function loadAdminDashboard() {
    console.log('Loading admin dashboard');
    document.getElementById('adminTotalStudents').textContent = '0';
    document.getElementById('adminTotalAssets').textContent = '0';
    document.getElementById('adminTotalScans').textContent = '0';
    document.getElementById('adminFlaggedScans').textContent = '0';
}

function showAdminTab(tab) {
    console.log('Show admin tab:', tab);
    const tabs = ['dashboard', 'students', 'assets', 'alerts', 'scans', 'guards'];
    tabs.forEach(t => {
        const tabEl = document.getElementById(`admin${t.charAt(0).toUpperCase() + t.slice(1)}Tab`);
        const btnEl = document.getElementById(`tab${t.charAt(0).toUpperCase() + t.slice(1)}`);
        if (tabEl) tabEl.classList.remove('active');
        if (btnEl) btnEl.classList.remove('active');
    });
    const activeTab = document.getElementById(`admin${tab.charAt(0).toUpperCase() + tab.slice(1)}Tab`);
    const activeBtn = document.getElementById(`tab${tab.charAt(0).toUpperCase() + tab.slice(1)}`);
    if (activeTab) activeTab.classList.add('active');
    if (activeBtn) activeBtn.classList.add('active');
}

function updateAdminStats() {
    // Placeholder
}

function renderStudentsTable() { document.getElementById('studentsTable').innerHTML = '<div>Students will appear here</div>'; }
function renderAssetsTable() { document.getElementById('assetsTable').innerHTML = '<div>Assets will appear here</div>'; }
function renderGuardsTable() { document.getElementById('guardsTable').innerHTML = '<div>Guards will appear here</div>'; }
function renderGuardReports() { document.getElementById('guardReportsTable').innerHTML = '<div>Reports will appear here</div>'; }
function renderPendingAlerts() { document.getElementById('pendingAlertsList').innerHTML = '<div>No pending alerts</div>'; }
function populateStudentDropdown() { }
function filterStudents() { }
function filterScansByGuard() { }
function registerStudent() { alert('Student registration feature coming soon'); }
function registerAsset() { alert('Asset registration feature coming soon'); }
function registerGuard() { alert('Guard registration feature coming soon'); }

// ========== GUARD FUNCTIONS ==========
function loadGuardDashboard() {
    console.log('Loading guard dashboard');
    updateGuardStats();
    renderGuardRecentScans();
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
        container.innerHTML = '<div style="text-align:center;padding:20px">No scans yet</div>';
    }
}

function startRealBarcodeScan() {
    alert('Barcode scanner will be available in full version');
    showScreen('guardScreen');
}

function cancelScan() {
    showScreen('guardScreen');
}

function manualScan() {
    alert('Enter a barcode to scan');
}

function syncOfflineQueue() {
    alert('No offline scans to sync');
}

// ========== INITIALIZE ==========
console.log('Script loaded successfully!');
showScreen('loginScreen');
