// API Configuration - Auto-detect environment
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? "http://localhost:5000/api"
    : "https://it-asset-management-811z.onrender.com/api";

console.log("🔗 API_URL:", API_URL);

// State Management
let currentUser = null;
let token = null;
let currentPage = "dashboard";
let assets = [];
let employees = [];
let allocations = [];
let maintenanceRequests = [];
let notifications = [];
let unreadCount = 0;
let notificationInterval = null;

// Utility Functions
function showToast(message, type = "info") {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.classList.add("show");
  clearTimeout(toast.timeout);
  toast.timeout = setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

function showModal(title, bodyHTML) {
  document.getElementById("modalTitle").textContent = title;
  document.getElementById("modalBody").innerHTML = bodyHTML;
  document.getElementById("modal").classList.add("active");
}

function closeModal() {
  document.getElementById("modal").classList.remove("active");
}

function formatDate(date) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(date) {
  if (!date) return "-";
  return new Date(date).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Toggle between Login and Signup
function showSignup() {
  document.getElementById("loginForm").classList.remove("active");
  document.getElementById("signupForm").classList.add("active");
  document.getElementById("authSubtitle").textContent = "Create your account";
  document.getElementById("loginError").style.display = "none";
  document.getElementById("signupError").style.display = "none";
  document.getElementById("signupSuccess").style.display = "none";
}

function showLogin() {
  document.getElementById("signupForm").classList.remove("active");
  document.getElementById("loginForm").classList.add("active");
  document.getElementById("authSubtitle").textContent = "Sign in to access the system";
  document.getElementById("loginError").style.display = "none";
  document.getElementById("signupError").style.display = "none";
  document.getElementById("signupSuccess").style.display = "none";
}

// API Calls
const api = {
  async request(endpoint, options = {}) {
    const url = `${API_URL}${endpoint}`;
    const headers = {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...options.headers,
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Request failed");
      }

      return data;
    } catch (error) {
      console.error("API Error:", error);
      throw error;
    }
  },

  auth: {
    login(email, password) {
      return api.request("/auth/login", {
        method: "POST",
        body: { email, password },
      });
    },
    register(data) {
      return api.request("/auth/register", {
        method: "POST",
        body: data,
      });
    },
    getProfile() {
      return api.request("/auth/profile");
    },
  },

  assets: {
    getAll() {
      return api.request("/assets");
    },
    create(data) {
      return api.request("/assets", {
        method: "POST",
        body: data,
      });
    },
    update(id, data) {
      return api.request(`/assets/${id}`, {
        method: "PUT",
        body: data,
      });
    },
    delete(id) {
      return api.request(`/assets/${id}`, {
        method: "DELETE",
      });
    },
  },

  users: {
    getAll() {
      return api.request("/users");
    },
    getCount() {
      return api.request("/users/count");
    },
    create(data) {
      return api.request("/users", {
        method: "POST",
        body: data,
      });
    },
    update(id, data) {
      return api.request(`/users/${id}`, {
        method: "PUT",
        body: data,
      });
    },
    delete(id) {
      return api.request(`/users/${id}`, {
        method: "DELETE",
      });
    },
  },

  allocations: {
    getAll() {
      return api.request("/allocations");
    },
    create(data) {
      return api.request("/allocations", {
        method: "POST",
        body: data,
      });
    },
    update(id, data) {
      return api.request(`/allocations/${id}`, {
        method: "PUT",
        body: data,
      });
    },
    return(id, data) {
      return api.request(`/allocations/${id}/return`, {
        method: "PUT",
        body: data,
      });
    },
    delete(id) {
      return api.request(`/allocations/${id}`, {
        method: "DELETE",
      });
    },
  },

  maintenance: {
    getAll() {
      return api.request("/maintenance");
    },
    create(data) {
      return api.request("/maintenance", {
        method: "POST",
        body: data,
      });
    },
    update(id, data) {
      return api.request(`/maintenance/${id}`, {
        method: "PUT",
        body: data,
      });
    },
  },

  reports: {
    getAssetInventory() {
      return api.request("/reports/asset-inventory");
    },
    getEmployeeAssets() {
      return api.request("/reports/employee-assets");
    },
    getAllocationHistory() {
      return api.request("/reports/allocation-history");
    },
    getMaintenanceHistory() {
      return api.request("/reports/maintenance-history");
    }
  }
};

// ===== FIXED LOGIN FUNCTION =====
async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;
  const errorDiv = document.getElementById("loginError");

  console.log("🔍 Login attempt with:", email);
  console.log("🔗 API_URL:", API_URL);

  try {
    errorDiv.style.display = "none";
    errorDiv.textContent = "";
    
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    console.log("📡 Response status:", response.status);
    
    const data = await response.json();
    console.log("📦 Response data:", data);

    if (!response.ok) {
      throw new Error(data.message || "Login failed");
    }

    if (!data.token) {
      throw new Error("No token received from server");
    }

    token = data.token;
    currentUser = {
      _id: data._id,
      employeeId: data.employeeId,
      name: data.name,
      email: data.email,
      role: data.role,
      department: data.department,
      designation: data.designation,
    };

    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(currentUser));

    showToast("Login successful!", "success");
    initializeApp();
    
  } catch (error) {
    console.error("❌ Login error:", error);
    errorDiv.textContent = error.message || "Login failed. Please try again.";
    errorDiv.style.display = "block";
  }
}

// ===== FIXED SIGNUP FUNCTION =====
async function handleSignup(e) {
  e.preventDefault();

  const name = document.getElementById("signupName").value.trim();
  const employeeId = document.getElementById("signupEmployeeId").value.trim();
  const email = document.getElementById("signupEmail").value.trim();
  const department = document.getElementById("signupDepartment").value.trim();
  const designation = document.getElementById("signupDesignation").value.trim();
  const password = document.getElementById("signupPassword").value;
  const confirmPassword = document.getElementById("signupConfirmPassword").value;

  const errorDiv = document.getElementById("signupError");
  const successDiv = document.getElementById("signupSuccess");
  errorDiv.style.display = "none";
  errorDiv.textContent = "";
  successDiv.style.display = "none";
  successDiv.textContent = "";

  if (!name || !employeeId || !email || !password) {
    errorDiv.textContent = "Please fill in all required fields";
    errorDiv.style.display = "block";
    return;
  }

  if (password !== confirmPassword) {
    errorDiv.textContent = "Passwords do not match";
    errorDiv.style.display = "block";
    return;
  }

  if (password.length < 6) {
    errorDiv.textContent = "Password must be at least 6 characters";
    errorDiv.style.display = "block";
    return;
  }

  try {
    console.log("📝 Signup attempt with:", email);
    
    const response = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        employeeId,
        email,
        password,
        department,
        designation,
        role: "employee",
      }),
    });

    const data = await response.json();
    console.log("📦 Signup response:", data);

    if (!response.ok) {
      throw new Error(data.message || "Registration failed");
    }

    successDiv.textContent = "Account created successfully! You can now sign in.";
    successDiv.style.display = "block";
    document.getElementById("signupForm").reset();

    setTimeout(() => {
      showLogin();
      document.getElementById("loginEmail").value = email;
      document.getElementById("loginPassword").value = "";
      showToast("Account created! Please sign in.", "success");
    }, 2000);
  } catch (error) {
    console.error("❌ Signup error:", error);
    errorDiv.textContent = error.message || "Registration failed. Please try again.";
    errorDiv.style.display = "block";
  }
}

function handleLogout() {
  stopNotificationPolling();
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  token = null;
  currentUser = null;
  document.getElementById("loginPage").classList.add("active");
  document.getElementById("appPage").classList.remove("active");
  showLogin();
  showToast("Logged out successfully", "info");
}

// Navigation
function navigateTo(page) {
  document.querySelectorAll(".content-page").forEach((p) => p.classList.remove("active"));

  const targetPage = document.getElementById(`${page}Page`);
  if (targetPage) {
    targetPage.classList.add("active");
  }

  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.remove("active");
    if (item.dataset.page === page) {
      item.classList.add("active");
    }
  });

  const titles = {
    dashboard: "Dashboard",
    assets: "Asset Inventory",
    employees: "Employees",
    allocations: "Allocations",
    maintenance: "Maintenance Requests",
    reports: "Reports",
    profile: "My Profile",
    settings: "Settings",
  };
  document.getElementById("pageTitle").textContent = titles[page] || "Dashboard";

  currentPage = page;

  setTimeout(() => {
    switch (page) {
      case "dashboard":
        loadDashboard();
        break;
      case "assets":
        loadAssets();
        break;
      case "employees":
        loadEmployees();
        break;
      case "allocations":
        loadAllocations();
        break;
      case "maintenance":
        loadMaintenance();
        break;
      case "profile":
        showProfile();
        break;
      case "settings":
        showSettings();
        break;
      case "reports":
        loadReports();
        break;
    }
  }, 50);
}

// ===== VIEW ASSET DETAILS FUNCTION =====
function viewAssetDetails(id) {
  const asset = assets.find((a) => a._id === id);
  if (!asset) {
    showToast("Asset not found", "error");
    return;
  }

  const html = `
    <div style="padding: 10px 0;">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <div style="padding: 12px; background: var(--bg-input); border-radius: 8px; border: 1px solid var(--border-color);">
          <span style="color: var(--text-muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; display: block; margin-bottom: 4px;">Asset Code</span>
          <strong style="font-size: 15px; color: var(--text-primary);">${asset.assetCode}</strong>
        </div>
        <div style="padding: 12px; background: var(--bg-input); border-radius: 8px; border: 1px solid var(--border-color);">
          <span style="color: var(--text-muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; display: block; margin-bottom: 4px;">Asset Name</span>
          <strong style="font-size: 15px; color: var(--text-primary);">${asset.assetName}</strong>
        </div>
        <div style="padding: 12px; background: var(--bg-input); border-radius: 8px; border: 1px solid var(--border-color);">
          <span style="color: var(--text-muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; display: block; margin-bottom: 4px;">Category</span>
          <strong style="font-size: 15px; color: var(--text-primary);">${asset.category}</strong>
        </div>
        <div style="padding: 12px; background: var(--bg-input); border-radius: 8px; border: 1px solid var(--border-color);">
          <span style="color: var(--text-muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; display: block; margin-bottom: 4px;">Brand</span>
          <strong style="font-size: 15px; color: var(--text-primary);">${asset.brand || "-"}</strong>
        </div>
        <div style="padding: 12px; background: var(--bg-input); border-radius: 8px; border: 1px solid var(--border-color);">
          <span style="color: var(--text-muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; display: block; margin-bottom: 4px;">Model</span>
          <strong style="font-size: 15px; color: var(--text-primary);">${asset.model || "-"}</strong>
        </div>
        <div style="padding: 12px; background: var(--bg-input); border-radius: 8px; border: 1px solid var(--border-color);">
          <span style="color: var(--text-muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; display: block; margin-bottom: 4px;">Serial Number</span>
          <strong style="font-size: 15px; color: var(--text-primary);">${asset.serialNumber || "-"}</strong>
        </div>
        <div style="padding: 12px; background: var(--bg-input); border-radius: 8px; border: 1px solid var(--border-color);">
          <span style="color: var(--text-muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; display: block; margin-bottom: 4px;">Status</span>
          <span class="status-badge ${asset.status?.toLowerCase().replace(" ", "") || "available"}">${asset.status || "Available"}</span>
        </div>
        <div style="padding: 12px; background: var(--bg-input); border-radius: 8px; border: 1px solid var(--border-color);">
          <span style="color: var(--text-muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; display: block; margin-bottom: 4px;">Condition</span>
          <span class="status-badge ${asset.condition?.toLowerCase().replace(" ", "") || "good"}">${asset.condition || "Good"}</span>
        </div>
        <div style="padding: 12px; background: var(--bg-input); border-radius: 8px; border: 1px solid var(--border-color);">
          <span style="color: var(--text-muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; display: block; margin-bottom: 4px;">Location</span>
          <strong style="font-size: 15px; color: var(--text-primary);">${asset.location || "-"}</strong>
        </div>
        <div style="padding: 12px; background: var(--bg-input); border-radius: 8px; border: 1px solid var(--border-color);">
          <span style="color: var(--text-muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; display: block; margin-bottom: 4px;">Cost</span>
          <strong style="font-size: 15px; color: var(--text-primary);">${asset.cost ? "$" + asset.cost : "-"}</strong>
        </div>
        <div style="padding: 12px; background: var(--bg-input); border-radius: 8px; border: 1px solid var(--border-color);">
          <span style="color: var(--text-muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; display: block; margin-bottom: 4px;">Purchase Date</span>
          <strong style="font-size: 15px; color: var(--text-primary);">${formatDate(asset.purchaseDate)}</strong>
        </div>
        <div style="padding: 12px; background: var(--bg-input); border-radius: 8px; border: 1px solid var(--border-color);">
          <span style="color: var(--text-muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; display: block; margin-bottom: 4px;">Warranty Expiry</span>
          <strong style="font-size: 15px; color: var(--text-primary);">${formatDate(asset.warrantyExpiryDate)}</strong>
        </div>
      </div>
      ${asset.description ? `
        <div style="margin-top: 16px; padding: 12px; background: var(--bg-input); border-radius: 8px; border: 1px solid var(--border-color);">
          <span style="color: var(--text-muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; display: block; margin-bottom: 4px;">Description</span>
          <p style="margin-top: 4px; font-size: 14px; color: var(--text-primary);">${asset.description}</p>
        </div>
      ` : ""}
    </div>
    <div class="modal-footer">
      <button type="button" class="btn-secondary" onclick="closeModal()">Close</button>
    </div>
  `;
  showModal("Asset Details", html);
}

// ===== VIEW MAINTENANCE DETAILS FUNCTION =====
function viewMaintenanceDetails(id) {
  const req = maintenanceRequests.find((r) => r._id === id);
  if (!req) {
    showToast("Request not found", "error");
    return;
  }

  const html = `
    <div style="padding: 10px 0;">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <div style="padding: 12px; background: var(--bg-input); border-radius: 8px; border: 1px solid var(--border-color);">
          <span style="color: var(--text-muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; display: block; margin-bottom: 4px;">Asset</span>
          <strong style="font-size: 15px; color: var(--text-primary);">${req.asset?.assetName || "Unknown"} (${req.asset?.assetCode || ""})</strong>
        </div>
        <div style="padding: 12px; background: var(--bg-input); border-radius: 8px; border: 1px solid var(--border-color);">
          <span style="color: var(--text-muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; display: block; margin-bottom: 4px;">Employee</span>
          <strong style="font-size: 15px; color: var(--text-primary);">${req.employee?.name || "Unknown"} (${req.employee?.employeeId || ""})</strong>
        </div>
        <div style="padding: 12px; background: var(--bg-input); border-radius: 8px; border: 1px solid var(--border-color); grid-column: 1 / -1;">
          <span style="color: var(--text-muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; display: block; margin-bottom: 4px;">Issue</span>
          <strong style="font-size: 15px; color: var(--text-primary);">${req.issue}</strong>
        </div>
        ${req.description ? `
          <div style="padding: 12px; background: var(--bg-input); border-radius: 8px; border: 1px solid var(--border-color); grid-column: 1 / -1;">
            <span style="color: var(--text-muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; display: block; margin-bottom: 4px;">Description</span>
            <p style="margin-top: 4px; font-size: 14px; color: var(--text-primary);">${req.description}</p>
          </div>
        ` : ""}
        <div style="padding: 12px; background: var(--bg-input); border-radius: 8px; border: 1px solid var(--border-color);">
          <span style="color: var(--text-muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; display: block; margin-bottom: 4px;">Priority</span>
          <span class="status-badge ${req.priority?.toLowerCase() || "medium"}">${req.priority || "Medium"}</span>
        </div>
        <div style="padding: 12px; background: var(--bg-input); border-radius: 8px; border: 1px solid var(--border-color);">
          <span style="color: var(--text-muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; display: block; margin-bottom: 4px;">Status</span>
          <span class="status-badge ${req.status?.toLowerCase().replace(" ", "-") || "open"}">${req.status || "Open"}</span>
        </div>
        ${req.resolution ? `
          <div style="padding: 12px; background: var(--bg-input); border-radius: 8px; border: 1px solid var(--border-color); grid-column: 1 / -1;">
            <span style="color: var(--text-muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; display: block; margin-bottom: 4px;">Resolution</span>
            <p style="margin-top: 4px; font-size: 14px; color: var(--text-primary);">${req.resolution}</p>
          </div>
        ` : ""}
        ${req.resolvedDate ? `
          <div style="padding: 12px; background: var(--bg-input); border-radius: 8px; border: 1px solid var(--border-color);">
            <span style="color: var(--text-muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; display: block; margin-bottom: 4px;">Resolved Date</span>
            <strong style="font-size: 15px; color: var(--text-primary);">${formatDateTime(req.resolvedDate)}</strong>
          </div>
        ` : ""}
        <div style="padding: 12px; background: var(--bg-input); border-radius: 8px; border: 1px solid var(--border-color);">
          <span style="color: var(--text-muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; display: block; margin-bottom: 4px;">Created</span>
          <strong style="font-size: 15px; color: var(--text-primary);">${formatDateTime(req.createdAt)}</strong>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button type="button" class="btn-secondary" onclick="closeModal()">Close</button>
    </div>
  `;
  showModal("Maintenance Request Details", html);
}

// ===== PIE CHART FUNCTION =====
function renderPieChart(available, allocated, maintenance, retired) {
  const canvas = document.getElementById('assetPieChart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const total = available + allocated + maintenance + retired;

  // Get the parent container width for proper sizing
  const container = canvas.parentElement;
  const containerWidth = container.clientWidth || 300;
  const width = Math.min(containerWidth, 300);
  const height = 280;
  
  // Set canvas size with proper device pixel ratio for crisp rendering
  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  ctx.scale(dpr, dpr);

  const centerX = width / 2;
  const centerY = height / 2 - 10;
  const radius = Math.min(width, height) / 2 - 45;

  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  if (total === 0) {
    ctx.font = '16px Inter, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('No data available', centerX, centerY);
    
    const legendContainer = document.querySelector('.pie-legend');
    if (legendContainer) {
      legendContainer.innerHTML = '';
    }
    return;
  }

  const data = [
    { label: 'Available', value: available, color: '#22c55e', className: 'available' },
    { label: 'Allocated', value: allocated, color: '#eab308', className: 'allocated' },
    { label: 'Under Maintenance', value: maintenance, color: '#ef4444', className: 'maintenance' },
    { label: 'Retired', value: retired, color: '#94a3b8', className: 'retired' }
  ].filter(item => item.value > 0);

  // Draw pie slices
  let startAngle = -Math.PI / 2;
  data.forEach((item) => {
    const sliceAngle = (item.value / total) * 2 * Math.PI;
    
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
    ctx.closePath();
    
    ctx.fillStyle = item.color;
    ctx.fill();
    
    // Add border between slices
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg-card').trim() || '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    startAngle += sliceAngle;
  });

  // Draw center circle (donut hole)
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius * 0.48, 0, 2 * Math.PI);
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg-card').trim() || '#ffffff';
  ctx.fill();
  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim() || '#e2e8f0';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Draw TOTAL number in center - FIXED
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Total number
  ctx.font = 'bold 22px Inter, sans-serif';
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim() || '#0f172a';
  ctx.fillText(total, centerX, centerY - 4);
  
  // "Total Assets" label
  ctx.font = '11px Inter, sans-serif';
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#94a3b8';
  ctx.fillText('Total Assets', centerX, centerY + 20);

  // Draw legend
  const legendContainer = document.querySelector('.pie-legend');
  if (legendContainer) {
    legendContainer.innerHTML = data.map(item => `
      <div class="pie-legend-item">
        <span class="pie-legend-color ${item.className}"></span>
        <span>${item.label}: ${item.value} (${Math.round((item.value / total) * 100)}%)</span>
      </div>
    `).join('');
  }
}

// ===== DASHBOARD FUNCTIONS =====
async function loadDashboard() {
  try {
    console.log("Loading dashboard...");

    const assetsData = await api.assets.getAll();
    let totalEmployees = 0;
    let allocationsData = [];

    try {
      const countData = await api.users.getCount();
      totalEmployees = countData.count || 1;
      console.log("Total employees from count endpoint:", totalEmployees);
    } catch (error) {
      console.log("Could not fetch user count:", error.message);
      
      try {
        const usersData = await api.users.getAll();
        totalEmployees = usersData.length || 1;
        console.log("Total employees from users endpoint:", totalEmployees);
      } catch (userError) {
        console.log("Could not fetch users:", userError.message);
        totalEmployees = currentUser ? 1 : 0;
      }
    }

    try {
      allocationsData = await api.allocations.getAll();
    } catch (error) {
      console.log("Could not fetch allocations:", error.message);
      allocationsData = [];
    }

    console.log("Dashboard data:", { 
      assetsCount: assetsData.length, 
      totalEmployees, 
      allocationsCount: allocationsData.length 
    });

    const total = assetsData.length;
    const available = assetsData.filter((a) => a.status === "Available").length;
    const allocated = assetsData.filter((a) => a.status === "Allocated").length;
    const maintenance = assetsData.filter((a) => a.status === "Under Maintenance").length;
    const retired = assetsData.filter((a) => a.status === "Retired").length;

    console.log("Dashboard stats:", { total, available, allocated, maintenance, retired, totalEmployees });

    const kpiTotalAssets = document.getElementById("kpiTotalAssets");
    const kpiAvailableAssets = document.getElementById("kpiAvailableAssets");
    const kpiAllocatedAssets = document.getElementById("kpiAllocatedAssets");
    const kpiMaintenanceAssets = document.getElementById("kpiMaintenanceAssets");
    const kpiTotalEmployees = document.getElementById("kpiTotalEmployees");

    if (kpiTotalAssets) kpiTotalAssets.textContent = total;
    if (kpiAvailableAssets) kpiAvailableAssets.textContent = available;
    if (kpiAllocatedAssets) kpiAllocatedAssets.textContent = allocated;
    if (kpiMaintenanceAssets) kpiMaintenanceAssets.textContent = maintenance;
    if (kpiTotalEmployees) kpiTotalEmployees.textContent = totalEmployees;

    const totalForRadial = total > 0 ? total : 1;
    const availablePercent = Math.round((available / totalForRadial) * 100);
    const allocatedPercent = Math.round((allocated / totalForRadial) * 100);
    const maintenancePercent = Math.round((maintenance / totalForRadial) * 100);

    const radialAvailable = document.getElementById("radialAvailable");
    const radialAvailableValue = document.getElementById("radialAvailableValue");
    const radialAvailableCount = document.getElementById("radialAvailableCount");
    if (radialAvailable) {
      const circumference = 314.159;
      const offset = circumference - (availablePercent / 100) * circumference;
      radialAvailable.style.strokeDashoffset = offset;
    }
    if (radialAvailableValue) radialAvailableValue.textContent = availablePercent + "%";
    if (radialAvailableCount) radialAvailableCount.textContent = available;

    const radialAllocated = document.getElementById("radialAllocated");
    const radialAllocatedValue = document.getElementById("radialAllocatedValue");
    const radialAllocatedCount = document.getElementById("radialAllocatedCount");
    if (radialAllocated) {
      const circumference = 314.159;
      const offset = circumference - (allocatedPercent / 100) * circumference;
      radialAllocated.style.strokeDashoffset = offset;
    }
    if (radialAllocatedValue) radialAllocatedValue.textContent = allocatedPercent + "%";
    if (radialAllocatedCount) radialAllocatedCount.textContent = allocated;

    const radialMaintenance = document.getElementById("radialMaintenance");
    const radialMaintenanceValue = document.getElementById("radialMaintenanceValue");
    const radialMaintenanceCount = document.getElementById("radialMaintenanceCount");
    if (radialMaintenance) {
      const circumference = 314.159;
      const offset = circumference - (maintenancePercent / 100) * circumference;
      radialMaintenance.style.strokeDashoffset = offset;
    }
    if (radialMaintenanceValue) radialMaintenanceValue.textContent = maintenancePercent + "%";
    if (radialMaintenanceCount) radialMaintenanceCount.textContent = maintenance;

    let recentAllocations = allocationsData.slice(0, 5);

    const recentAllocationsEl = document.getElementById("recentAllocations");
    if (recentAllocationsEl) {
      if (recentAllocations.length > 0) {
        recentAllocationsEl.innerHTML = recentAllocations.map((a) => {
          const empName = a.employee?.name || a.employee?.employeeId || "Unknown Employee";
          const assetName = a.asset?.assetName || a.asset?.assetCode || "Unknown Asset";
          return `
          <div class="allocation-item" style="padding: 10px 0; border-bottom: 1px solid var(--border-color);">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 4px;">
              <span><strong>${assetName}</strong> → ${empName}</span>
              <span style="color: var(--text-muted); font-size: 12px;">${formatDate(a.allocationDate)}</span>
            </div>
            <div style="font-size: 13px; color: var(--text-muted); margin-top: 2px;">
              <span class="status-badge ${a.status === "Active" ? "allocated" : "available"}">${a.status === "Active" ? "Active" : "Returned"}</span>
            </div>
          </div>
        `}).join("");
      } else {
        recentAllocationsEl.innerHTML = '<p class="empty-state">No recent allocations</p>';
      }
    }

    renderPieChart(available, allocated, maintenance, retired);

  } catch (error) {
    console.error("Dashboard error:", error);
    showToast("Failed to load dashboard data", "error");

    const elements = {
      kpiTotalAssets: "0",
      kpiAvailableAssets: "0",
      kpiAllocatedAssets: "0",
      kpiMaintenanceAssets: "0",
      kpiTotalEmployees: "0",
    };

    Object.keys(elements).forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = elements[id];
    });

    const recentAllocationsEl = document.getElementById("recentAllocations");
    if (recentAllocationsEl) {
      recentAllocationsEl.innerHTML = '<p class="empty-state">Unable to load allocations</p>';
    }

    renderPieChart(0, 0, 0, 0);
  }
}

// ===== ASSET FUNCTIONS =====
async function loadAssets() {
  try {
    const data = await api.assets.getAll();
    assets = data;
    renderAssetsTable(data);
  } catch (error) {
    console.error("Load assets error:", error);
    showToast("Failed to load assets", "error");
  }
}

function renderAssetsTable(data) {
  const tbody = document.getElementById("assetsTableBody");
  if (!data || data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center">No assets found</td></tr>';
    return;
  }

  const isAdmin = currentUser && currentUser.role === "admin";

  tbody.innerHTML = data.map((asset) => `
    <tr>
      <td><strong>${asset.assetCode}</strong></td>
      <td>${asset.assetName}</td>
      <td>${asset.category}</td>
      <td>${asset.serialNumber || "-"}</td>
      <td><span class="status-badge ${asset.status?.toLowerCase().replace(" ", "") || "available"}">${asset.status || "Available"}</span></td>
      <td><span class="status-badge ${asset.condition?.toLowerCase().replace(" ", "") || "good"}">${asset.condition || "Good"}</span></td>
      <td>
        <div class="action-buttons">
          ${isAdmin ? `
            <button class="action-btn edit" onclick="editAsset('${asset._id}')" title="Edit Asset">
              <i class="fas fa-edit"></i>
            </button>
            <button class="action-btn delete" onclick="deleteAsset('${asset._id}')" title="Delete Asset">
              <i class="fas fa-trash"></i>
            </button>
            <button class="action-btn view" onclick="viewAssetDetails('${asset._id}')" title="View Details">
              <i class="fas fa-eye"></i>
            </button>
          ` : `
            <button class="action-btn view" onclick="viewAssetDetails('${asset._id}')" title="View Details">
              <i class="fas fa-eye"></i>
            </button>
          `}
        </div>
      </td>
    </tr>
  `).join("");
}

function showAddAssetModal() {
  const categories = ["Laptop", "Desktop", "Monitor", "Keyboard", "Mouse", "Printer", "Network Device", "Software License"];
  const statuses = ["Available", "Allocated", "Under Maintenance", "Retired"];
  const conditions = ["Good", "Damaged", "Needs Repair"];

  const html = `
    <form id="assetForm" onsubmit="saveAsset(event)">
      <div class="form-group">
        <label>Asset Code *</label>
        <input type="text" id="assetCode" required>
      </div>
      <div class="form-group">
        <label>Asset Name *</label>
        <input type="text" id="assetName" required>
      </div>
      <div class="form-group">
        <label>Category *</label>
        <select id="assetCategory" required>
          <option value="">Select Category</option>
          ${categories.map((c) => `<option value="${c}">${c}</option>`).join("")}
        </select>
      </div>
      <div class="form-group">
        <label>Brand</label>
        <input type="text" id="assetBrand">
      </div>
      <div class="form-group">
        <label>Model</label>
        <input type="text" id="assetModel">
      </div>
      <div class="form-group">
        <label>Serial Number</label>
        <input type="text" id="assetSerial">
      </div>
      <div class="form-group">
        <label>Purchase Date</label>
        <input type="date" id="assetPurchaseDate">
      </div>
      <div class="form-group">
        <label>Warranty Expiry Date</label>
        <input type="date" id="assetWarrantyDate">
      </div>
      <div class="form-group">
        <label>Status</label>
        <select id="assetStatus">
          ${statuses.map((s) => `<option value="${s}">${s}</option>`).join("")}
        </select>
      </div>
      <div class="form-group">
        <label>Condition</label>
        <select id="assetCondition">
          ${conditions.map((c) => `<option value="${c}">${c}</option>`).join("")}
        </select>
      </div>
      <div class="form-group">
        <label>Location</label>
        <input type="text" id="assetLocation">
      </div>
      <div class="form-group">
        <label>Cost ($)</label>
        <input type="number" id="assetCost" step="0.01">
      </div>
      <div class="modal-footer">
        <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn-primary">Save Asset</button>
      </div>
    </form>
  `;
  showModal("Add New Asset", html);
}

async function saveAsset(e) {
  e.preventDefault();
  const data = {
    assetCode: document.getElementById("assetCode").value,
    assetName: document.getElementById("assetName").value,
    category: document.getElementById("assetCategory").value,
    brand: document.getElementById("assetBrand").value,
    model: document.getElementById("assetModel").value,
    serialNumber: document.getElementById("assetSerial").value,
    purchaseDate: document.getElementById("assetPurchaseDate").value,
    warrantyExpiryDate: document.getElementById("assetWarrantyDate").value,
    status: document.getElementById("assetStatus").value,
    condition: document.getElementById("assetCondition").value,
    location: document.getElementById("assetLocation").value,
    cost: parseFloat(document.getElementById("assetCost").value),
  };

  try {
    await api.assets.create(data);
    closeModal();
    showToast("Asset created successfully", "success");
    loadAssets();
  } catch (error) {
    showToast(error.message || "Failed to create asset", "error");
  }
}

async function editAsset(id) {
  const asset = assets.find((a) => a._id === id);
  if (!asset) return;

  const categories = ["Laptop", "Desktop", "Monitor", "Keyboard", "Mouse", "Printer", "Network Device", "Software License"];
  const statuses = ["Available", "Allocated", "Under Maintenance", "Retired"];
  const conditions = ["Good", "Damaged", "Needs Repair"];

  const html = `
    <form id="assetForm" onsubmit="updateAsset(event, '${id}')">
      <div class="form-group">
        <label>Asset Code *</label>
        <input type="text" id="assetCode" value="${asset.assetCode || ""}" required>
      </div>
      <div class="form-group">
        <label>Asset Name *</label>
        <input type="text" id="assetName" value="${asset.assetName || ""}" required>
      </div>
      <div class="form-group">
        <label>Category *</label>
        <select id="assetCategory" required>
          <option value="">Select Category</option>
          ${categories.map((c) => `<option value="${c}" ${asset.category === c ? "selected" : ""}>${c}</option>`).join("")}
        </select>
      </div>
      <div class="form-group">
        <label>Brand</label>
        <input type="text" id="assetBrand" value="${asset.brand || ""}">
      </div>
      <div class="form-group">
        <label>Model</label>
        <input type="text" id="assetModel" value="${asset.model || ""}">
      </div>
      <div class="form-group">
        <label>Serial Number</label>
        <input type="text" id="assetSerial" value="${asset.serialNumber || ""}">
      </div>
      <div class="form-group">
        <label>Purchase Date</label>
        <input type="date" id="assetPurchaseDate" value="${asset.purchaseDate ? asset.purchaseDate.split("T")[0] : ""}">
      </div>
      <div class="form-group">
        <label>Warranty Expiry Date</label>
        <input type="date" id="assetWarrantyDate" value="${asset.warrantyExpiryDate ? asset.warrantyExpiryDate.split("T")[0] : ""}">
      </div>
      <div class="form-group">
        <label>Status</label>
        <select id="assetStatus">
          ${statuses.map((s) => `<option value="${s}" ${asset.status === s ? "selected" : ""}>${s}</option>`).join("")}
        </select>
      </div>
      <div class="form-group">
        <label>Condition</label>
        <select id="assetCondition">
          ${conditions.map((c) => `<option value="${c}" ${asset.condition === c ? "selected" : ""}>${c}</option>`).join("")}
        </select>
      </div>
      <div class="form-group">
        <label>Location</label>
        <input type="text" id="assetLocation" value="${asset.location || ""}">
      </div>
      <div class="form-group">
        <label>Cost ($)</label>
        <input type="number" id="assetCost" step="0.01" value="${asset.cost || ""}">
      </div>
      <div class="modal-footer">
        <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn-primary">Update Asset</button>
      </div>
    </form>
  `;
  showModal("Edit Asset", html);
}

async function updateAsset(e, id) {
  e.preventDefault();
  const data = {
    assetCode: document.getElementById("assetCode").value,
    assetName: document.getElementById("assetName").value,
    category: document.getElementById("assetCategory").value,
    brand: document.getElementById("assetBrand").value,
    model: document.getElementById("assetModel").value,
    serialNumber: document.getElementById("assetSerial").value,
    purchaseDate: document.getElementById("assetPurchaseDate").value,
    warrantyExpiryDate: document.getElementById("assetWarrantyDate").value,
    status: document.getElementById("assetStatus").value,
    condition: document.getElementById("assetCondition").value,
    location: document.getElementById("assetLocation").value,
    cost: parseFloat(document.getElementById("assetCost").value),
  };

  try {
    await api.assets.update(id, data);
    closeModal();
    showToast("Asset updated successfully", "success");
    loadAssets();
  } catch (error) {
    showToast(error.message || "Failed to update asset", "error");
  }
}

async function deleteAsset(id) {
  if (!confirm("Are you sure you want to delete this asset?")) return;

  try {
    await api.assets.delete(id);
    showToast("Asset deleted successfully", "success");
    loadAssets();
  } catch (error) {
    showToast(error.message || "Failed to delete asset", "error");
  }
}

// ===== EMPLOYEE FUNCTIONS =====
async function loadEmployees() {
  try {
    const data = await api.users.getAll();
    employees = data;
    renderEmployeesTable(data);
  } catch (error) {
    console.error("Load employees error:", error);
    showToast("Failed to load employees", "error");
  }
}

function renderEmployeesTable(data) {
  const tbody = document.getElementById("employeesTableBody");
  if (!data || data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center">No employees found</td></tr>';
    return;
  }

  const isAdmin = currentUser && currentUser.role === "admin";

  tbody.innerHTML = data.map((emp) => `
    <tr>
      <td><strong>${emp.employeeId}</strong></td>
      <td>${emp.name}</td>
      <td>${emp.department || "-"}</td>
      <td>${emp.designation || "-"}</td>
      <td>${emp.email}</td>
      <td>
        <div class="action-buttons">
          ${isAdmin ? `
            <button class="action-btn edit" onclick="editEmployee('${emp._id}')" title="Edit Employee">
              <i class="fas fa-edit"></i>
            </button>
            <button class="action-btn delete" onclick="deleteEmployee('${emp._id}')" title="Delete Employee">
              <i class="fas fa-trash"></i>
            </button>
            <button class="action-btn view" onclick="viewEmployeeDetails('${emp._id}')" title="View Details">
              <i class="fas fa-eye"></i>
            </button>
          ` : `
            <button class="action-btn view" onclick="viewEmployeeDetails('${emp._id}')" title="View Details">
              <i class="fas fa-eye"></i>
            </button>
            <span class="view-only-badge">View Only</span>
          `}
        </div>
      </td>
    </tr>
  `).join("");
}

function showAddEmployeeModal() {
  const html = `
    <form id="employeeForm" onsubmit="saveEmployee(event)">
      <div class="form-group">
        <label>Employee ID *</label>
        <input type="text" id="empId" required>
      </div>
      <div class="form-group">
        <label>Name *</label>
        <input type="text" id="empName" required>
      </div>
      <div class="form-group">
        <label>Email *</label>
        <input type="email" id="empEmail" required>
      </div>
      <div class="form-group">
        <label>Password *</label>
        <input type="password" id="empPassword" required>
      </div>
      <div class="form-group">
        <label>Role</label>
        <select id="empRole">
          <option value="employee">Employee</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      <div class="form-group">
        <label>Department</label>
        <input type="text" id="empDepartment">
      </div>
      <div class="form-group">
        <label>Designation</label>
        <input type="text" id="empDesignation">
      </div>
      <div class="modal-footer">
        <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn-primary">Save Employee</button>
      </div>
    </form>
  `;
  showModal("Add New Employee", html);
}

async function saveEmployee(e) {
  e.preventDefault();
  const data = {
    employeeId: document.getElementById("empId").value,
    name: document.getElementById("empName").value,
    email: document.getElementById("empEmail").value,
    password: document.getElementById("empPassword").value,
    role: document.getElementById("empRole").value,
    department: document.getElementById("empDepartment").value,
    designation: document.getElementById("empDesignation").value,
  };

  try {
    await api.users.create(data);
    closeModal();
    showToast("Employee created successfully", "success");
    loadEmployees();
  } catch (error) {
    showToast(error.message || "Failed to create employee", "error");
  }
}

async function editEmployee(id) {
  const emp = employees.find((e) => e._id === id);
  if (!emp) {
    showToast("Employee not found", "error");
    return;
  }

  const html = `
    <form id="employeeForm" onsubmit="updateEmployee(event, '${id}')">
      <div class="form-group">
        <label>Employee ID *</label>
        <input type="text" id="empId" value="${emp.employeeId}" required>
      </div>
      <div class="form-group">
        <label>Name *</label>
        <input type="text" id="empName" value="${emp.name}" required>
      </div>
      <div class="form-group">
        <label>Email *</label>
        <input type="email" id="empEmail" value="${emp.email}" required>
      </div>
      <div class="form-group">
        <label>Password (leave blank to keep current)</label>
        <input type="password" id="empPassword" placeholder="Enter new password">
      </div>
      <div class="form-group">
        <label>Role</label>
        <select id="empRole">
          <option value="employee" ${emp.role === "employee" ? "selected" : ""}>Employee</option>
          <option value="admin" ${emp.role === "admin" ? "selected" : ""}>Admin</option>
        </select>
      </div>
      <div class="form-group">
        <label>Department</label>
        <input type="text" id="empDepartment" value="${emp.department || ""}">
      </div>
      <div class="form-group">
        <label>Designation</label>
        <input type="text" id="empDesignation" value="${emp.designation || ""}">
      </div>
      <div class="modal-footer">
        <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn-primary">Update Employee</button>
      </div>
    </form>
  `;
  showModal("Edit Employee", html);
}

async function updateEmployee(e, id) {
  e.preventDefault();
  const data = {
    employeeId: document.getElementById("empId").value,
    name: document.getElementById("empName").value,
    email: document.getElementById("empEmail").value,
    role: document.getElementById("empRole").value,
    department: document.getElementById("empDepartment").value,
    designation: document.getElementById("empDesignation").value,
  };

  const password = document.getElementById("empPassword").value;
  if (password) {
    data.password = password;
  }

  try {
    await api.users.update(id, data);
    closeModal();
    showToast("Employee updated successfully", "success");
    loadEmployees();
  } catch (error) {
    showToast(error.message || "Failed to update employee", "error");
  }
}

async function deleteEmployee(id) {
  if (!confirm("Are you sure you want to delete this employee?")) return;

  try {
    await api.users.delete(id);
    showToast("Employee deleted successfully", "success");
    loadEmployees();
  } catch (error) {
    showToast(error.message || "Failed to delete employee", "error");
  }
}

function viewEmployeeDetails(id) {
  const emp = employees.find((e) => e._id === id);
  if (!emp) {
    showToast("Employee not found", "error");
    return;
  }

  const html = `
    <div style="padding: 10px 0;">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <div style="padding: 12px; background: var(--bg-input); border-radius: 8px; border: 1px solid var(--border-color);">
          <span style="color: var(--text-muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; display: block; margin-bottom: 4px;">Employee ID</span>
          <strong style="font-size: 15px; color: var(--text-primary);">${emp.employeeId}</strong>
        </div>
        <div style="padding: 12px; background: var(--bg-input); border-radius: 8px; border: 1px solid var(--border-color);">
          <span style="color: var(--text-muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; display: block; margin-bottom: 4px;">Name</span>
          <strong style="font-size: 15px; color: var(--text-primary);">${emp.name}</strong>
        </div>
        <div style="padding: 12px; background: var(--bg-input); border-radius: 8px; border: 1px solid var(--border-color);">
          <span style="color: var(--text-muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; display: block; margin-bottom: 4px;">Email</span>
          <strong style="font-size: 15px; color: var(--text-primary);">${emp.email}</strong>
        </div>
        <div style="padding: 12px; background: var(--bg-input); border-radius: 8px; border: 1px solid var(--border-color);">
          <span style="color: var(--text-muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; display: block; margin-bottom: 4px;">Role</span>
          <span class="status-badge ${emp.role === "admin" ? "allocated" : "available"}">${emp.role === "admin" ? "Administrator" : "Employee"}</span>
        </div>
        <div style="padding: 12px; background: var(--bg-input); border-radius: 8px; border: 1px solid var(--border-color);">
          <span style="color: var(--text-muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; display: block; margin-bottom: 4px;">Department</span>
          <strong style="font-size: 15px; color: var(--text-primary);">${emp.department || "Not specified"}</strong>
        </div>
        <div style="padding: 12px; background: var(--bg-input); border-radius: 8px; border: 1px solid var(--border-color);">
          <span style="color: var(--text-muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; display: block; margin-bottom: 4px;">Designation</span>
          <strong style="font-size: 15px; color: var(--text-primary);">${emp.designation || "Not specified"}</strong>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button type="button" class="btn-secondary" onclick="closeModal()">Close</button>
    </div>
  `;
  showModal("Employee Details", html);
}

// ===== ALLOCATION FUNCTIONS =====
async function loadAllocations() {
  try {
    const data = await api.allocations.getAll();
    allocations = data;
    renderAllocationsTable(data);
  } catch (error) {
    console.error("Load allocations error:", error);
    showToast("Failed to load allocations", "error");
  }
}

// ===== RENDER ALLOCATIONS TABLE - REMOVED EDIT AND DELETE ICONS =====
function renderAllocationsTable(data) {
  const tbody = document.getElementById("allocationsTableBody");
  if (!data || data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center">No allocations found</td></tr>';
    return;
  }

  // Try to get employee names from the employees array if needed
  const employeeMap = {};
  employees.forEach(emp => {
    employeeMap[emp._id] = emp.name || emp.employeeId || "Unknown";
  });

  tbody.innerHTML = data.map((alloc) => {
    // Get employee name - try multiple sources
    let employeeName = "Unknown Employee";
    let employeeId = "";
    
    if (alloc.employee) {
      if (typeof alloc.employee === 'object') {
        employeeName = alloc.employee.name || alloc.employee.employeeId || "Unknown Employee";
        employeeId = alloc.employee.employeeId || "";
        if (employeeName === "Unknown Employee" && alloc.employee._id && employeeMap[alloc.employee._id]) {
          employeeName = employeeMap[alloc.employee._id];
        }
      } else if (typeof alloc.employee === 'string') {
        if (employeeMap[alloc.employee]) {
          employeeName = employeeMap[alloc.employee];
        } else {
          employeeName = alloc.employee;
        }
      }
    }
    
    // Get asset name
    let assetName = "Unknown Asset";
    if (alloc.asset) {
      if (typeof alloc.asset === 'object') {
        assetName = alloc.asset.assetName || alloc.asset.assetCode || "Unknown Asset";
      } else if (typeof alloc.asset === 'string') {
        assetName = alloc.asset;
      }
    }

    if (employeeName === "Unknown Employee" || employeeName === "Unknown") {
      if (alloc.employeeId) {
        const found = employees.find(e => e.employeeId === alloc.employeeId || e._id === alloc.employeeId);
        if (found) {
          employeeName = found.name || found.employeeId || "Unknown Employee";
        }
      }
    }

    return `
    <tr>
      <td>${assetName}</td>
      <td>${employeeName}</td>
      <td>${formatDate(alloc.allocationDate)}</td>
      <td>${alloc.returnDate ? formatDate(alloc.returnDate) : "-"}</td>
      <td><span class="status-badge ${alloc.status === "Active" ? "allocated" : "available"}">${alloc.status || "Unknown"}</span></td>
      <td>
        <div class="action-buttons">
          <button class="action-btn view" onclick="viewAllocation('${alloc._id}')" title="View Details">
            <i class="fas fa-eye"></i>
          </button>
          ${alloc.status === "Active" ? `
            <button class="action-btn success" onclick="returnAsset('${alloc._id}')" title="Return Asset">
              <i class="fas fa-undo"></i>
            </button>
          ` : `
            <button class="action-btn refresh" onclick="refreshAllocation('${alloc._id}')" title="Refresh Status">
              <i class="fas fa-sync"></i>
            </button>
          `}
        </div>
      </td>
    </tr>
  `}).join("");
}

// ===== DELETE ALLOCATION FUNCTION - KEPT FOR REFERENCE BUT NOT USED IN UI =====
async function deleteAllocation(id) {
  if (!confirm("Are you sure you want to delete this allocation? This action cannot be undone.")) return;

  try {
    // Get the allocation to find which asset to update
    const alloc = allocations.find((a) => a._id === id);
    if (alloc) {
      // Check if asset exists and has an _id
      let assetId = null;
      if (alloc.asset) {
        if (typeof alloc.asset === 'object' && alloc.asset._id) {
          assetId = alloc.asset._id;
        } else if (typeof alloc.asset === 'string') {
          assetId = alloc.asset;
        }
      }
      
      // If we have an asset ID, update its status back to Available
      if (assetId) {
        try {
          await api.assets.update(assetId, { status: "Available" });
          console.log("Asset status updated to Available");
        } catch (assetError) {
          console.log("Could not update asset status:", assetError.message);
        }
      }
    }
    
    // Delete the allocation
    await api.allocations.delete(id);
    showToast("Allocation deleted successfully!", "success");
    loadAllocations();
    loadAssets();
    loadDashboard();
  } catch (error) {
    console.error("Delete allocation error:", error);
    // Try direct fetch as fallback
    try {
      const response = await fetch(`${API_URL}/allocations/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      
      showToast("Allocation deleted successfully!", "success");
      loadAllocations();
      loadAssets();
      loadDashboard();
    } catch (fallbackError) {
      console.error("Fallback delete error:", fallbackError);
      showToast(error.message || "Failed to delete allocation", "error");
    }
  }
}

// ===== EDIT ALLOCATION FUNCTION - KEPT FOR REFERENCE BUT NOT USED IN UI =====
async function editAllocation(id) {
  const alloc = allocations.find((a) => a._id === id);
  if (!alloc) {
    showToast("Allocation not found", "error");
    return;
  }

  console.log("Editing allocation:", alloc);

  // Get the asset and employee IDs safely
  let assetId = null;
  let employeeId = null;
  let assetName = "Unknown Asset";
  let employeeName = "Unknown Employee";
  
  if (alloc.asset) {
    if (typeof alloc.asset === 'object') {
      assetId = alloc.asset._id || null;
      assetName = alloc.asset.assetName || alloc.asset.assetCode || "Unknown Asset";
    } else if (typeof alloc.asset === 'string') {
      assetId = alloc.asset;
      const foundAsset = assets.find(a => a._id === assetId || a.assetCode === assetId);
      if (foundAsset) {
        assetName = foundAsset.assetName || foundAsset.assetCode || "Unknown Asset";
      }
    }
  }

  if (alloc.employee) {
    if (typeof alloc.employee === 'object') {
      employeeId = alloc.employee._id || null;
      employeeName = alloc.employee.name || alloc.employee.employeeId || "Unknown Employee";
    } else if (typeof alloc.employee === 'string') {
      employeeId = alloc.employee;
      const foundEmployee = employees.find(e => e._id === employeeId || e.employeeId === employeeId);
      if (foundEmployee) {
        employeeName = foundEmployee.name || foundEmployee.employeeId || "Unknown Employee";
      }
    }
  }

  // Format date properly
  let allocationDate = "";
  if (alloc.allocationDate) {
    const date = new Date(alloc.allocationDate);
    if (!isNaN(date.getTime())) {
      allocationDate = date.toISOString().split("T")[0];
    }
  }

  // Show a simple edit form with the current values
  const html = `
    <form id="editAllocationForm" onsubmit="updateAllocation(event, '${id}')">
      <div style="background: var(--bg-input); padding: 16px; border-radius: 8px; margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
          <div>
            <span style="color: var(--text-muted); font-size: 12px;">Asset</span>
            <div style="font-weight: 600;">${assetName}</div>
          </div>
          <div>
            <span style="color: var(--text-muted); font-size: 12px;">Employee</span>
            <div style="font-weight: 600;">${employeeName}</div>
          </div>
        </div>
      </div>
      <div class="form-group">
        <label>Allocation Date</label>
        <input type="date" id="editAllocDate" value="${allocationDate}">
      </div>
      <div class="form-group">
        <label>Status</label>
        <select id="editAllocStatus">
          <option value="Active" ${alloc.status === "Active" ? "selected" : ""}>Active</option>
          <option value="Returned" ${alloc.status === "Returned" ? "selected" : ""}>Returned</option>
        </select>
      </div>
      <div class="form-group">
        <label>Remarks</label>
        <textarea id="editAllocRemarks" rows="3" placeholder="Enter allocation remarks...">${alloc.remarks || ""}</textarea>
      </div>
      <input type="hidden" id="editAllocAsset" value="${assetId || ''}">
      <input type="hidden" id="editAllocEmployee" value="${employeeId || ''}">
      <div class="modal-footer">
        <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn-primary"><i class="fas fa-save"></i> Update Allocation</button>
      </div>
    </form>
  `;
  showModal("Edit Allocation", html);
}

// ===== UPDATE ALLOCATION FUNCTION - KEPT FOR REFERENCE BUT NOT USED IN UI =====
async function updateAllocation(e, id) {
  e.preventDefault();

  const assetId = document.getElementById("editAllocAsset")?.value;
  const employeeId = document.getElementById("editAllocEmployee")?.value;
  const allocationDate = document.getElementById("editAllocDate")?.value;
  const status = document.getElementById("editAllocStatus")?.value;
  const remarks = document.getElementById("editAllocRemarks")?.value;

  // Get current allocation
  const alloc = allocations.find((a) => a._id === id);
  
  let data = {
    allocationDate: allocationDate || new Date().toISOString(),
    status: status || alloc?.status || "Active",
    remarks: remarks || alloc?.remarks || "",
  };

  // Use the hidden fields or fallback to current values
  if (assetId && assetId !== "") {
    data.asset = assetId;
  } else if (alloc?.asset) {
    if (typeof alloc.asset === 'object' && alloc.asset._id) {
      data.asset = alloc.asset._id;
    } else if (typeof alloc.asset === 'string') {
      data.asset = alloc.asset;
    }
  }

  if (employeeId && employeeId !== "") {
    data.employee = employeeId;
  } else if (alloc?.employee) {
    if (typeof alloc.employee === 'object' && alloc.employee._id) {
      data.employee = alloc.employee._id;
    } else if (typeof alloc.employee === 'string') {
      data.employee = alloc.employee;
    }
  }

  console.log("Updating allocation with data:", data);

  try {
    const result = await api.allocations.update(id, data);
    console.log("Update result:", result);
    closeModal();
    showToast("Allocation updated successfully!", "success");
    loadAllocations();
    loadAssets();
    loadDashboard();
  } catch (error) {
    console.error("Update allocation error:", error);
    // Try using the raw fetch as fallback
    try {
      const response = await fetch(`${API_URL}/allocations/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Server response:", errorText);
        throw new Error(`Server error: ${response.status}`);
      }
      
      const result = await response.json();
      console.log("Update successful via direct fetch:", result);
      closeModal();
      showToast("Allocation updated successfully!", "success");
      loadAllocations();
      loadAssets();
      loadDashboard();
    } catch (fallbackError) {
      console.error("Fallback update error:", fallbackError);
      showToast(error.message || "Failed to update allocation", "error");
    }
  }
}

// ===== REFRESH ALLOCATION FUNCTION =====
async function refreshAllocation(id) {
  try {
    const alloc = allocations.find((a) => a._id === id);
    if (!alloc) {
      showToast("Allocation not found", "error");
      return;
    }

    const freshData = await api.allocations.getAll();
    const freshAlloc = freshData.find((a) => a._id === id);
    
    if (freshAlloc) {
      const index = allocations.findIndex((a) => a._id === id);
      if (index !== -1) {
        allocations[index] = freshAlloc;
      }
      
      renderAllocationsTable(allocations);
      showToast("Allocation status refreshed!", "success");
    } else {
      showToast("Allocation no longer exists", "warning");
      loadAllocations();
    }
  } catch (error) {
    console.error("Refresh allocation error:", error);
    showToast("Failed to refresh allocation", "error");
  }
}

function showAddAllocationModal() {
  const loadingHtml = `
    <div style="text-align: center; padding: 30px;">
      <div style="border: 3px solid var(--border-color); border-top: 3px solid var(--primary); border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto;"></div>
      <p style="margin-top: 15px; color: var(--text-muted);">Loading assets and employees...</p>
    </div>
    <style>
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    </style>
  `;
  showModal("New Asset Allocation", loadingHtml);

  Promise.all([api.assets.getAll(), api.users.getAll()])
    .then(([assetsData, employeesData]) => {
      const availableAssets = assetsData.filter((a) => a.status === "Available");

      let assetOptions = "";
      if (availableAssets.length > 0) {
        assetOptions = availableAssets.map((a) =>
          `<option value="${a._id}">${a.assetCode} - ${a.assetName} (${a.category})</option>`
        ).join("");
      } else {
        assetOptions = `<option value="">No available assets</option>`;
      }

      let employeeOptions = "";
      if (employeesData.length > 0) {
        employeeOptions = employeesData.map((e) =>
          `<option value="${e._id}">${e.name} (${e.employeeId}) - ${e.department || "No Dept"}</option>`
        ).join("");
      } else {
        employeeOptions = `<option value="">No employees found</option>`;
      }

      const html = `
        <form id="allocationForm" onsubmit="saveAllocation(event)">
          <div class="form-group">
            <label>Asset *</label>
            <select id="allocAsset" required>
              <option value="">Select Asset</option>
              ${assetOptions}
            </select>
            ${availableAssets.length === 0 ? `<div style="margin-top: 8px; padding: 10px 14px; background: #fef3c7; border-radius: 6px; font-size: 13px; color: #92400e; border: 1px solid #f59e0b;">
              <i class="fas fa-exclamation-triangle"></i> <strong>No available assets!</strong> Please add an asset with status "Available" first.
            </div>` : `<div style="margin-top: 6px; font-size: 12px; color: var(--text-muted);">
              <i class="fas fa-info-circle"></i> ${availableAssets.length} asset(s) available for allocation
            </div>`}
          </div>
          <div class="form-group">
            <label>Employee *</label>
            <select id="allocEmployee" required>
              <option value="">Select Employee</option>
              ${employeeOptions}
            </select>
          </div>
          <div class="form-group">
            <label>Allocation Date</label>
            <input type="date" id="allocDate" value="${new Date().toISOString().split("T")[0]}">
          </div>
          <div class="form-group">
            <label>Remarks</label>
            <textarea id="allocRemarks" rows="3" placeholder="Enter allocation remarks..."></textarea>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
            <button type="submit" class="btn-primary"><i class="fas fa-check"></i> Create Allocation</button>
          </div>
        </form>
      `;
      document.getElementById("modalBody").innerHTML = html;
    })
    .catch((error) => {
      console.error("Error loading allocation data:", error);
      document.getElementById("modalBody").innerHTML = `
        <div style="text-align: center; padding: 30px; color: var(--danger);">
          <i class="fas fa-exclamation-circle" style="font-size: 32px;"></i>
          <p style="margin-top: 10px; font-weight: 500;">Failed to load data</p>
          <p style="font-size: 14px; color: var(--text-muted);">${error.message || "Please try again"}</p>
          <button class="btn-secondary" onclick="closeModal(); setTimeout(showAddAllocationModal, 500);" style="margin-top: 15px;">
            <i class="fas fa-redo"></i> Retry
          </button>
        </div>
      `;
      showToast("Failed to load data for allocation", "error");
    });
}

async function saveAllocation(e) {
  e.preventDefault();

  const assetId = document.getElementById("allocAsset").value;
  const employeeId = document.getElementById("allocEmployee").value;
  const allocationDate = document.getElementById("allocDate").value || new Date().toISOString();
  const remarks = document.getElementById("allocRemarks").value;

  if (!assetId || assetId === "") {
    showToast("Please select an asset", "error");
    document.getElementById("allocAsset").focus();
    return;
  }
  if (!employeeId || employeeId === "") {
    showToast("Please select an employee", "error");
    document.getElementById("allocEmployee").focus();
    return;
  }

  const data = {
    asset: assetId,
    employee: employeeId,
    allocationDate,
    remarks,
  };

  try {
    await api.allocations.create(data);
    closeModal();
    showToast("Asset allocated successfully!", "success");
    loadAllocations();
    loadAssets();
    loadDashboard();
  } catch (error) {
    console.error("Allocation error:", error);
    showToast(error.message || "Failed to create allocation", "error");
  }
}

async function returnAsset(id) {
  if (!confirm("Return this asset?")) return;

  const html = `
    <form id="returnForm" onsubmit="processReturn(event, '${id}')">
      <div class="form-group">
        <label>Return Date</label>
        <input type="date" id="returnDate" value="${new Date().toISOString().split("T")[0]}">
      </div>
      <div class="form-group">
        <label>Condition *</label>
        <select id="returnCondition" required>
          <option value="Good">Good</option>
          <option value="Damaged">Damaged</option>
          <option value="Needs Repair">Needs Repair</option>
        </select>
      </div>
      <div class="form-group">
        <label>Remarks</label>
        <textarea id="returnRemarks" rows="2"></textarea>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn-success">Confirm Return</button>
      </div>
    </form>
  `;
  showModal("Return Asset", html);
}

async function processReturn(e, id) {
  e.preventDefault();
  const data = {
    returnDate: document.getElementById("returnDate").value,
    condition: document.getElementById("returnCondition").value,
    remarks: document.getElementById("returnRemarks").value,
  };

  try {
    await api.allocations.return(id, data);
    closeModal();
    showToast("Asset returned successfully", "success");
    loadAllocations();
    loadAssets();
    loadDashboard();
  } catch (error) {
    showToast(error.message || "Failed to return asset", "error");
  }
}

function viewAllocation(id) {
  const alloc = allocations.find((a) => a._id === id);
  if (!alloc) return;

  const employeeName = alloc.employee?.name || alloc.employee?.employeeId || "Unknown Employee";
  const employeeId = alloc.employee?.employeeId || "";
  const assetName = alloc.asset?.assetName || alloc.asset?.assetCode || "Unknown Asset";
  const assetCode = alloc.asset?.assetCode || "";

  const html = `
    <div style="padding: 10px 0;">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <div style="padding: 12px; background: var(--bg-input); border-radius: 8px; border: 1px solid var(--border-color);">
          <span style="color: var(--text-muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; display: block; margin-bottom: 4px;">Asset</span>
          <strong style="font-size: 15px; color: var(--text-primary);">${assetName} (${assetCode})</strong>
        </div>
        <div style="padding: 12px; background: var(--bg-input); border-radius: 8px; border: 1px solid var(--border-color);">
          <span style="color: var(--text-muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; display: block; margin-bottom: 4px;">Employee</span>
          <strong style="font-size: 15px; color: var(--text-primary);">${employeeName} (${employeeId})</strong>
        </div>
        <div style="padding: 12px; background: var(--bg-input); border-radius: 8px; border: 1px solid var(--border-color);">
          <span style="color: var(--text-muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; display: block; margin-bottom: 4px;">Allocation Date</span>
          <strong style="font-size: 15px; color: var(--text-primary);">${formatDateTime(alloc.allocationDate)}</strong>
        </div>
        <div style="padding: 12px; background: var(--bg-input); border-radius: 8px; border: 1px solid var(--border-color);">
          <span style="color: var(--text-muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; display: block; margin-bottom: 4px;">Return Date</span>
          <strong style="font-size: 15px; color: var(--text-primary);">${alloc.returnDate ? formatDateTime(alloc.returnDate) : "-"}</strong>
        </div>
        <div style="padding: 12px; background: var(--bg-input); border-radius: 8px; border: 1px solid var(--border-color);">
          <span style="color: var(--text-muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; display: block; margin-bottom: 4px;">Status</span>
          <span class="status-badge ${alloc.status === "Active" ? "allocated" : "available"}">${alloc.status}</span>
        </div>
        ${alloc.remarks ? `
          <div style="padding: 12px; background: var(--bg-input); border-radius: 8px; border: 1px solid var(--border-color); grid-column: 1 / -1;">
            <span style="color: var(--text-muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; display: block; margin-bottom: 4px;">Remarks</span>
            <p style="margin-top: 4px; font-size: 14px; color: var(--text-primary);">${alloc.remarks}</p>
          </div>
        ` : ""}
      </div>
    </div>
    <div class="modal-footer">
      <button type="button" class="btn-secondary" onclick="closeModal()">Close</button>
    </div>
  `;
  showModal("Allocation Details", html);
}

// ===== MAINTENANCE FUNCTIONS =====
async function loadMaintenance() {
  try {
    const data = await api.maintenance.getAll();
    maintenanceRequests = data;
    renderMaintenanceTable(data);
  } catch (error) {
    console.error("Error loading maintenance:", error);
    showToast("Failed to load maintenance requests", "error");
  }
}

function renderMaintenanceTable(data) {
  const tbody = document.getElementById("maintenanceTableBody");
  if (!data || data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center">No maintenance requests found</td></tr>';
    return;
  }

  const isAdmin = currentUser && currentUser.role === "admin";

  tbody.innerHTML = data.map((req) => `
    <tr data-request-id="${req._id}">
      <td>${req.asset?.assetName || "Unknown Asset"}</td>
      <td>${req.employee?.name || "Unknown Employee"}</td>
      <td>${req.issue || "No issue specified"}</td>
      <td><span class="status-badge ${req.priority?.toLowerCase() || "medium"}">${req.priority || "Medium"}</span></td>
      <td><span class="status-badge ${req.status?.toLowerCase().replace(" ", "-") || "open"}">${req.status || "Open"}</span></td>
      <td>
        <div class="action-buttons">
          ${isAdmin ? `<button class="action-btn edit" onclick="editMaintenance('${req._id}')" title="Update Status"><i class="fas fa-edit"></i></button>` : ""}
          <button class="action-btn view" onclick="viewMaintenanceDetails('${req._id}')" title="View Details">
            <i class="fas fa-eye"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join("");
}

function showAddMaintenanceModal() {
  if (!currentUser) {
    showToast("Please login first", "error");
    return;
  }

  const isAdmin = currentUser.role === "admin";
  console.log("Current user:", currentUser);

  const loadingHtml = `
    <div style="text-align: center; padding: 30px;">
      <div style="border: 3px solid var(--border-color); border-top: 3px solid var(--primary); border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto;"></div>
      <p style="margin-top: 15px; color: var(--text-muted);">Loading your assets...</p>
    </div>
    <style>
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    </style>
  `;
  showModal("New Maintenance Request", loadingHtml);

  Promise.all([api.assets.getAll(), api.allocations.getAll()])
    .then(([assetsData, allocationsData]) => {
      console.log("All Assets:", assetsData);
      console.log("All Allocations:", allocationsData);

      let availableAssets = [];

      if (isAdmin) {
        availableAssets = assetsData.filter((a) => a.status === "Allocated" || a.status === "Under Maintenance");
      } else {
        const myAllocations = allocationsData.filter(
          (alloc) => alloc.employee && alloc.employee._id === currentUser._id && alloc.status === "Active"
        );
        console.log("My Allocations:", myAllocations);

        const myAssetIds = myAllocations.map((alloc) => alloc.asset?._id).filter((id) => id);
        console.log("My Asset IDs:", myAssetIds);

        availableAssets = assetsData.filter(
          (a) => myAssetIds.includes(a._id) && (a.status === "Allocated" || a.status === "Under Maintenance")
        );
        console.log("Available Assets for Employee:", availableAssets);
      }

      let assetOptions = "";
      if (availableAssets.length > 0) {
        assetOptions = availableAssets.map((a) =>
          `<option value="${a._id}">${a.assetCode} - ${a.assetName} (${a.status})</option>`
        ).join("");
      } else {
        assetOptions = `<option value="">${isAdmin ? "No assets available" : "You don't have any allocated assets"}</option>`;
      }

      let employeeField = "";
      if (isAdmin) {
        employeeField = `
          <div class="form-group">
            <label>Employee *</label>
            <select id="maintEmployee" required>
              <option value="">Select Employee</option>
              ${employees.map((e) => `<option value="${e._id}">${e.name} (${e.employeeId})</option>`).join("")}
            </select>
          </div>
        `;
      } else {
        employeeField = `<input type="hidden" id="maintEmployee" value="${currentUser._id}">`;
      }

      const html = `
        <form id="maintenanceForm" onsubmit="saveMaintenance(event)">
          <div class="form-group">
            <label>Asset *</label>
            <select id="maintAsset" required>
              <option value="">Select Asset</option>
              ${assetOptions}
            </select>
            ${availableAssets.length === 0 ? `
              <div style="margin-top: 8px; padding: 10px 14px; background: #fef3c7; border-radius: 6px; font-size: 13px; color: #92400e; border: 1px solid #f59e0b;">
                <i class="fas fa-exclamation-triangle"></i> 
                <strong>${isAdmin ? "No assets available!" : "No assets allocated to you!"}</strong>
                ${isAdmin ? "Please allocate an asset first." : "Please contact admin to allocate assets to you."}
              </div>
            ` : `
              <div style="margin-top: 6px; font-size: 12px; color: var(--text-muted);">
                <i class="fas fa-info-circle"></i> ${availableAssets.length} asset(s) available for maintenance
              </div>
            `}
          </div>
          
          ${employeeField}
          
          <div class="form-group">
            <label>Issue *</label>
            <input type="text" id="maintIssue" placeholder="Brief description of the issue" required>
          </div>
          <div class="form-group">
            <label>Description</label>
            <textarea id="maintDescription" rows="3" placeholder="Detailed description of the problem..."></textarea>
          </div>
          <div class="form-group">
            <label>Priority</label>
            <select id="maintPriority">
              <option value="Low">Low</option>
              <option value="Medium" selected>Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
            <button type="submit" class="btn-primary"><i class="fas fa-plus"></i> Create Request</button>
          </div>
        </form>
      `;

      document.getElementById("modalBody").innerHTML = html;
    })
    .catch((error) => {
      console.error("Error loading maintenance data:", error);
      document.getElementById("modalBody").innerHTML = `
        <div style="text-align: center; padding: 30px; color: var(--danger);">
          <i class="fas fa-exclamation-circle" style="font-size: 32px;"></i>
          <p style="margin-top: 10px; font-weight: 500;">Failed to load your assets</p>
          <p style="font-size: 14px; color: var(--text-muted);">${error.message || "Please try again"}</p>
          <div style="margin-top: 15px; display: flex; gap: 10px; justify-content: center;">
            <button class="btn-secondary" onclick="closeModal(); setTimeout(showAddMaintenanceModal, 500);"><i class="fas fa-redo"></i> Retry</button>
            <button class="btn-secondary" onclick="closeModal();"><i class="fas fa-times"></i> Cancel</button>
          </div>
        </div>
      `;
      showToast("Failed to load data for maintenance request", "error");
    });
}

async function saveMaintenance(e) {
  e.preventDefault();

  const assetId = document.getElementById("maintAsset").value;
  const employeeId = document.getElementById("maintEmployee").value;
  const issue = document.getElementById("maintIssue").value.trim();
  const description = document.getElementById("maintDescription").value.trim();
  const priority = document.getElementById("maintPriority").value;

  if (!assetId || assetId === "") {
    showToast("Please select an asset", "error");
    document.getElementById("maintAsset").focus();
    return;
  }
  if (!issue) {
    showToast("Please describe the issue", "error");
    document.getElementById("maintIssue").focus();
    return;
  }

  let finalEmployeeId = employeeId;
  if (!finalEmployeeId && currentUser && currentUser.role === "employee") {
    finalEmployeeId = currentUser._id;
  }

  const data = {
    asset: assetId,
    employee: finalEmployeeId || null,
    issue: issue,
    description: description,
    priority: priority,
  };

  console.log("Sending maintenance data:", data);

  try {
    const result = await api.maintenance.create(data);
    console.log("Maintenance created:", result);
    closeModal();
    showToast("Maintenance request created successfully!", "success");
    loadMaintenance();
    loadDashboard();
  } catch (error) {
    console.error("Maintenance creation error:", error);
    showToast(error.message || "Failed to create maintenance request", "error");
  }
}

async function editMaintenance(id) {
  const req = maintenanceRequests.find((r) => r._id === id);
  if (!req) {
    showToast("Request not found", "error");
    return;
  }

  const statuses = ["Open", "In Progress", "Resolved", "Closed"];
  const html = `
    <form id="maintenanceForm" onsubmit="updateMaintenance(event, '${id}')">
      <div style="background: var(--border-color); padding: 12px; border-radius: 6px; margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; font-size: 14px;">
          <span><strong>Asset:</strong> ${req.asset?.assetName || "Unknown"}</span>
          <span><strong>Employee:</strong> ${req.employee?.name || "Unknown"}</span>
        </div>
        <div style="font-size: 14px; margin-top: 4px;">
          <strong>Issue:</strong> ${req.issue}
        </div>
      </div>
      <div class="form-group">
        <label>Status *</label>
        <select id="maintStatus" required>
          ${statuses.map((s) => `<option value="${s}" ${req.status === s ? "selected" : ""}>${s}</option>`).join("")}
        </select>
      </div>
      <div class="form-group">
        <label>Resolution Notes</label>
        <textarea id="maintResolution" rows="3" placeholder="Describe how the issue was resolved...">${req.resolution || ""}</textarea>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn-primary"><i class="fas fa-check"></i> Update Status</button>
      </div>
    </form>
  `;
  showModal("Update Maintenance Request", html);
}

async function updateMaintenance(e, id) {
  e.preventDefault();

  const status = document.getElementById("maintStatus").value;
  const resolution = document.getElementById("maintResolution").value.trim();

  const data = { status, resolution };
  if (status === "Resolved" || status === "Closed") {
    data.resolvedDate = new Date().toISOString();
  }

  try {
    await api.maintenance.update(id, data);
    closeModal();
    showToast("Maintenance request updated successfully", "success");
    loadMaintenance();
    loadDashboard();
  } catch (error) {
    showToast(error.message || "Failed to update request", "error");
  }
}

// ===== REPORTS FUNCTIONS =====
function loadReports() {
  const reportsPage = document.getElementById("reportsPage");
  if (reportsPage) {
    reportsPage.innerHTML = `
      <div class="reports-container">
        <div class="reports-grid">
          <div class="report-card" onclick="generateReport('inventory')">
            <div class="report-icon"><i class="fas fa-boxes"></i></div>
            <h3>Asset Inventory Report</h3>
            <p>Complete list of all assets with details</p>
            <button class="btn-primary">Generate PDF</button>
          </div>
          <div class="report-card" onclick="generateReport('employee')">
            <div class="report-icon"><i class="fas fa-users"></i></div>
            <h3>Employee Asset Report</h3>
            <p>Assets assigned to each employee</p>
            <button class="btn-primary">Generate PDF</button>
          </div>
          <div class="report-card" onclick="generateReport('allocation')">
            <div class="report-icon"><i class="fas fa-exchange-alt"></i></div>
            <h3>Allocation History</h3>
            <p>Complete allocation and return history</p>
            <button class="btn-primary">Generate PDF</button>
          </div>
          <div class="report-card" onclick="generateReport('maintenance')">
            <div class="report-icon"><i class="fas fa-tools"></i></div>
            <h3>Maintenance History</h3>
            <p>All maintenance requests and their status</p>
            <button class="btn-primary">Generate PDF</button>
          </div>
        </div>
        <div id="reportPreview" class="report-preview" style="display: none;">
          <div class="report-meta">
            <h2 id="reportTitle">Report</h2>
            <button class="btn-success" onclick="downloadCurrentReport()">
              <i class="fas fa-download"></i> Download PDF
            </button>
          </div>
          <div id="reportDataContainer">
            <p class="text-muted">Click "Generate PDF" to view report data</p>
          </div>
        </div>
      </div>
    `;
  }
}

let currentReportData = null;
let currentReportTitle = "";

async function generateReport(type) {
  const preview = document.getElementById("reportPreview");
  
  if (!preview) {
    const reportsContainer = document.querySelector(".reports-container");
    if (reportsContainer) {
      let existingPreview = document.getElementById("reportPreview");
      if (!existingPreview) {
        const previewDiv = document.createElement("div");
        previewDiv.id = "reportPreview";
        previewDiv.className = "report-preview";
        previewDiv.style.display = "none";
        previewDiv.innerHTML = `
          <div class="report-meta">
            <h2 id="reportTitle">Report</h2>
            <button class="btn-success" onclick="downloadCurrentReport()">
              <i class="fas fa-download"></i> Download PDF
            </button>
          </div>
          <div id="reportDataContainer">
            <p class="text-muted">Click "Generate PDF" to view report data</p>
          </div>
        `;
        reportsContainer.appendChild(previewDiv);
      }
    }
  }

  const previewEl = document.getElementById("reportPreview");
  const containerEl = document.getElementById("reportDataContainer");
  const titleEl = document.getElementById("reportTitle");

  if (!previewEl || !containerEl || !titleEl) {
    showToast("Please navigate to Reports page first", "warning");
    navigateTo("reports");
    setTimeout(() => {
      generateReport(type);
    }, 500);
    return;
  }

  previewEl.style.display = "block";
  containerEl.innerHTML = `
    <div style="text-align: center; padding: 40px;">
      <div style="border: 3px solid var(--border-color); border-top: 3px solid var(--primary); border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto;"></div>
      <p style="margin-top: 15px; color: var(--text-muted);">Generating report...</p>
    </div>
    <style>
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    </style>
  `;

  try {
    let data = null;
    let title = "";

    switch (type) {
      case "inventory":
        data = await api.reports.getAssetInventory();
        title = "Asset Inventory Report";
        break;
      case "employee":
        data = await api.reports.getEmployeeAssets();
        title = "Employee Asset Report";
        break;
      case "allocation":
        data = await api.reports.getAllocationHistory();
        title = "Allocation History";
        break;
      case "maintenance":
        data = await api.reports.getMaintenanceHistory();
        title = "Maintenance History";
        break;
      default:
        throw new Error("Unknown report type");
    }

    console.log("Report data received:", data);

    let reportData = [];
    
    if (Array.isArray(data)) {
      reportData = data;
    } else if (data && data.data && Array.isArray(data.data)) {
      reportData = data.data;
    } else if (data && data.result && Array.isArray(data.result)) {
      reportData = data.result;
    } else if (data && data.records && Array.isArray(data.records)) {
      reportData = data.records;
    } else if (data && typeof data === 'object') {
      for (const key in data) {
        if (Array.isArray(data[key]) && data[key].length > 0) {
          reportData = data[key];
          break;
        }
      }
    }

    console.log("Extracted report data:", reportData);
    console.log("Report data length:", reportData.length);

    let processedData = [];
    let skippedCount = 0;

    if (reportData.length > 0) {
      processedData = reportData.map(item => {
        const safeItem = {};
        Object.keys(item).forEach(key => {
          const value = item[key];
          if (value === null || value === undefined) {
            safeItem[key] = 'N/A';
          } else if (typeof value === 'object' && value !== null) {
            if (value.name) {
              safeItem[key] = value.name;
            } else if (value.assetName) {
              safeItem[key] = value.assetName;
            } else if (value.employeeId) {
              safeItem[key] = value.employeeId;
            } else if (value.assetCode) {
              safeItem[key] = value.assetCode;
            } else if (Array.isArray(value)) {
              safeItem[key] = value.map(v => 
                typeof v === 'object' && v !== null ? (v.name || v.assetName || JSON.stringify(v)) : v
              ).join(', ');
            } else {
              safeItem[key] = JSON.stringify(value);
            }
          } else {
            safeItem[key] = value;
          }
        });
        return safeItem;
      });

      processedData = processedData.filter(item => 
        Object.values(item).some(v => v !== 'N/A' && v !== '' && v !== null && v !== undefined)
      );
      
      skippedCount = reportData.length - processedData.length;
    }

    console.log("Processed data length:", processedData.length);
    console.log("Skipped records:", skippedCount);

    if (processedData.length > 0) {
      currentReportData = processedData;
      currentReportTitle = title;
      titleEl.textContent = title;

      const columns = Object.keys(processedData[0]);
      
      let tableHTML = `
        <div style="overflow-x: auto; border: 1px solid var(--border-color); border-radius: 8px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <thead style="background: var(--primary); color: white;">
              <tr>
                ${columns.map(col => `<th style="padding: 12px 15px; text-align: left;">${col.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${processedData.map(row => `
                <tr style="border-bottom: 1px solid var(--border-color);">
                  ${columns.map(col => {
                    let value = row[col];
                    if (value === null || value === undefined || value === 'N/A') {
                      return `<td style="padding: 10px 15px; color: var(--text-muted);">N/A</td>`;
                    }
                    if (Array.isArray(value)) {
                      value = value.map(item => {
                        if (typeof item === 'object' && item !== null) {
                          return Object.values(item).join(' - ');
                        }
                        return item;
                      }).join(', ');
                    }
                    if (typeof value === 'object' && value !== null) {
                      value = JSON.stringify(value);
                    }
                    return `<td style="padding: 10px 15px;">${String(value)}</td>`;
                  }).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div style="padding: 12px 15px; background: var(--bg-secondary); color: var(--text-muted); font-size: 13px; border-top: 1px solid var(--border-color); display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
            <span><strong>Total Records:</strong> ${processedData.length}</span>
            ${skippedCount > 0 ? `<span style="color: #f59e0b;"><strong>⚠️ Skipped:</strong> ${skippedCount} records with missing data</span>` : ''}
            <span><strong>Generated:</strong> ${new Date().toLocaleString()}</span>
          </div>
        </div>
      `;

      containerEl.innerHTML = tableHTML;
      showToast(`✅ ${title} generated successfully! Found ${processedData.length} records.`, "success");
    } else {
      containerEl.innerHTML = `
        <div style="text-align: center; padding: 60px 20px; background: var(--bg-secondary); border-radius: 8px;">
          <i class="fas fa-inbox" style="font-size: 48px; color: var(--text-muted); opacity: 0.5;"></i>
          <h3 style="color: var(--text-muted); margin-top: 20px;">No Data Available</h3>
          <p style="color: var(--text-muted);">No records found for this report</p>
          <p style="color: var(--text-muted); font-size: 14px; margin-top: 10px;">
            ${type === 'inventory' ? 'Add some assets first.' : 
              type === 'employee' ? 'Add some employees first.' :
              type === 'allocation' ? 'Create some asset allocations first.' :
              'Create some maintenance requests first.'}
          </p>
          ${skippedCount > 0 ? `<p style="color: #f59e0b; margin-top: 10px;">⚠️ ${skippedCount} records were skipped due to missing data.</p>` : ''}
        </div>
      `;
      currentReportData = null;
      currentReportTitle = title;
      titleEl.textContent = title;
      showToast("No valid data available for this report", "warning");
    }
  } catch (error) {
    console.error("Report generation error:", error);
    containerEl.innerHTML = `
      <div style="text-align: center; padding: 40px; color: var(--danger);">
        <i class="fas fa-exclamation-circle" style="font-size: 36px;"></i>
        <h3>Failed to Generate Report</h3>
        <p style="color: var(--text-muted);">${error.message || 'Please try again'}</p>
        <p style="color: var(--text-muted); font-size: 13px; margin-top: 8px;">
          ${error.message?.includes('null') ? '⚠️ Some records have missing employee or asset data. Please check your database.' : ''}
        </p>
        <button class="btn-secondary" onclick="generateReport('${type}')" style="margin-top: 15px;">
          <i class="fas fa-redo"></i> Retry
        </button>
      </div>
    `;
    showToast("Failed to generate report: " + error.message, "error");
  }
}

function downloadCurrentReport() {
  if (!currentReportData || currentReportData.length === 0) {
    showToast("No report data to download. Generate a report first.", "warning");
    return;
  }

  const printWindow = window.open('', '_blank');
  const columns = Object.keys(currentReportData[0]);
  
  printWindow.document.write(`
    <html>
      <head>
        <title>${currentReportTitle}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #333; border-bottom: 3px solid #2563eb; padding-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background-color: #2563eb; color: white; padding: 12px; text-align: left; }
          td { padding: 10px; border: 1px solid #ddd; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .header { margin-bottom: 20px; }
          .date { color: #666; }
          .footer { margin-top: 30px; text-align: center; color: #999; font-size: 12px; border-top: 1px solid #ddd; padding-top: 20px; }
          .no-data { text-align: center; padding: 50px; color: #666; }
          @media print {
            .no-print { display: none; }
            body { padding: 10px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${currentReportTitle}</h1>
          <p class="date">Generated: ${new Date().toLocaleString()}</p>
          <p>Total Records: ${currentReportData.length}</p>
        </div>
        <table>
          <thead>
            <tr>
              ${columns.map(col => `<th>${col.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${currentReportData.map(row => `
              <tr>
                ${columns.map(col => {
                  let value = row[col];
                  if (value === null || value === undefined || value === 'N/A') {
                    return `<td>N/A</td>`;
                  }
                  if (Array.isArray(value)) {
                    value = value.map(item => {
                      if (typeof item === 'object') {
                        return Object.values(item).join(' - ');
                      }
                      return item;
                    }).join(', ');
                  }
                  if (typeof value === 'object' && value !== null) {
                    value = JSON.stringify(value);
                  }
                  return `<td>${String(value)}</td>`;
                }).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="footer">
          <p>IT Asset Management System</p>
          <p>${currentReportTitle} - ${new Date().toISOString().split('T')[0]}</p>
        </div>
        <script>
          window.onload = function() { 
            window.print(); 
            setTimeout(function() { window.close(); }, 1000);
          }
        <\/script>
      </body>
    </html>
  `);
  printWindow.document.close();
  showToast("PDF is being generated...", "info");
}

// ===== THEME TOGGLE FUNCTIONS =====
function toggleTheme() {
  console.log('Toggle theme called');
  const html = document.documentElement;
  const toggleBtn = document.getElementById('themeToggleBtn');
  const currentTheme = html.getAttribute('data-theme');
  
  console.log('Current theme:', currentTheme);
  console.log('Toggle button found:', !!toggleBtn);
  
  if (currentTheme === 'dark') {
    console.log('Switching to Light Mode');
    html.removeAttribute('data-theme');
    localStorage.setItem('theme', 'light');
    if (toggleBtn) {
      toggleBtn.innerHTML = '<i class="fas fa-moon"></i>';
      toggleBtn.title = 'Switch to Dark Mode';
      console.log('Button updated to moon icon');
    }
  } else {
    console.log('Switching to Dark Mode');
    html.setAttribute('data-theme', 'dark');
    localStorage.setItem('theme', 'dark');
    if (toggleBtn) {
      toggleBtn.innerHTML = '<i class="fas fa-sun"></i>';
      toggleBtn.title = 'Switch to Light Mode';
      console.log('Button updated to sun icon');
    }
  }
}

function loadTheme() {
  console.log('Loading theme...');
  const savedTheme = localStorage.getItem('theme');
  const toggleBtn = document.getElementById('themeToggleBtn');
  
  console.log('Saved theme:', savedTheme);
  console.log('Toggle button found:', !!toggleBtn);
  
  if (savedTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    if (toggleBtn) {
      toggleBtn.innerHTML = '<i class="fas fa-sun"></i>';
      toggleBtn.title = 'Switch to Light Mode';
    }
  } else {
    document.documentElement.removeAttribute('data-theme');
    if (toggleBtn) {
      toggleBtn.innerHTML = '<i class="fas fa-moon"></i>';
      toggleBtn.title = 'Switch to Dark Mode';
    }
  }
}

// ===== PROFILE PICTURE FUNCTIONS =====
function triggerProfilePicUpload() {
  let input = document.getElementById("profilePicInput");
  if (!input) {
    input = document.createElement("input");
    input.type = "file";
    input.id = "profilePicInput";
    input.accept = "image/*";
    input.style.display = "none";
    document.body.appendChild(input);

    input.addEventListener("change", function (e) {
      const file = e.target.files[0];
      if (file) {
        uploadProfilePicture(file);
      }
    });
  }
  input.click();
}

function setupProfilePictureUpload() {
  const input = document.getElementById("profilePicInput");
  if (input) {
    const newInput = input.cloneNode(true);
    input.parentNode.replaceChild(newInput, input);

    newInput.addEventListener("change", function (e) {
      const file = e.target.files[0];
      if (file) {
        uploadProfilePicture(file);
      }
    });
  }
}

async function uploadProfilePicture(file) {
  if (file.size > 2 * 1024 * 1024) {
    showToast("Image size should be less than 2MB", "error");
    return;
  }

  if (!file.type.startsWith("image/")) {
    showToast("Please select an image file", "error");
    return;
  }

  try {
    const reader = new FileReader();
    reader.onload = function (e) {
      const base64Image = e.target.result;

      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      userData.profilePicture = base64Image;
      localStorage.setItem("user", JSON.stringify(userData));

      currentUser.profilePicture = base64Image;

      updateProfilePictureUI(base64Image);

      showToast("Profile picture updated successfully!", "success");

      if (document.getElementById("profilePage").classList.contains("active")) {
        renderProfile();
      }
    };
    reader.readAsDataURL(file);
  } catch (error) {
    console.error("Upload error:", error);
    showToast("Failed to upload profile picture", "error");
  }
}

function updateProfilePictureUI(imageUrl) {
  const avatar = document.getElementById("userAvatar");
  if (avatar) {
    if (imageUrl) {
      avatar.innerHTML = `<img src="${imageUrl}" alt="Profile">`;
    } else {
      avatar.textContent = currentUser?.name?.charAt(0).toUpperCase() || "U";
    }
  }
}

function loadProfilePicture() {
  const userData = JSON.parse(localStorage.getItem("user") || "{}");
  if (userData.profilePicture) {
    currentUser.profilePicture = userData.profilePicture;
    updateProfilePictureUI(userData.profilePicture);
  }
}

// ===== NOTIFICATION FUNCTIONS =====
async function loadNotifications() {
  try {
    const response = await fetch(`${API_URL}/notifications`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to load notifications");
    }

    const data = await response.json();
    notifications = data.notifications || [];
    unreadCount = data.unreadCount || 0;

    updateNotificationUI();
    return data;
  } catch (error) {
    console.error("Load notifications error:", error);
    return { notifications: [], unreadCount: 0 };
  }
}

function updateNotificationUI() {
  const countBadge = document.getElementById("notificationCount");
  const list = document.getElementById("notificationList");

  if (countBadge) {
    countBadge.textContent = unreadCount;
    if (unreadCount > 0) {
      countBadge.classList.add("has-notifications");
    } else {
      countBadge.classList.remove("has-notifications");
    }
  }

  if (list) {
    if (notifications.length === 0) {
      list.innerHTML = '<p class="empty-notifications">No notifications</p>';
      return;
    }

    list.innerHTML = notifications.map((notification) => {
      const iconClass = notification.type === "maintenance_request" ? "request" : notification.type === "maintenance_approved" ? "approved" : "resolved";
      const icon = notification.type === "maintenance_request" ? "fa-clock" : notification.type === "maintenance_approved" ? "fa-check-circle" : "fa-check-double";

      const isUnread = !notification.isRead ? "unread" : "";
      const timeAgo = formatTimeAgo(notification.createdAt);

      return `
        <div class="notification-item ${isUnread}" onclick="handleNotificationClick('${notification._id}', '${notification.relatedId}')">
          <div class="notification-icon ${iconClass}">
            <i class="fas ${icon}"></i>
          </div>
          <div class="notification-content">
            <div class="title">${notification.title}</div>
            <div class="message">${notification.message}</div>
            <div class="time">${timeAgo}</div>
          </div>
          <button class="delete-notification" onclick="event.stopPropagation(); deleteNotification('${notification._id}')">
            <i class="fas fa-times"></i>
          </button>
        </div>
      `;
    }).join("");
  }
}

function formatTimeAgo(date) {
  const now = new Date();
  const diff = Math.floor((now - new Date(date)) / 1000);

  if (diff < 60) return "Just now";
  if (diff < 3600) return Math.floor(diff / 60) + "m ago";
  if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
  if (diff < 604800) return Math.floor(diff / 86400) + "d ago";
  return new Date(date).toLocaleDateString();
}

function toggleNotificationDropdown() {
  const dropdown = document.getElementById("notificationDropdown");
  if (dropdown) {
    dropdown.classList.toggle("show");
    if (dropdown.classList.contains("show")) {
      loadNotifications();
    }
  }
}

document.addEventListener("click", function (e) {
  const wrapper = document.querySelector(".notification-dropdown-wrapper");
  const dropdown = document.getElementById("notificationDropdown");
  if (wrapper && dropdown && !wrapper.contains(e.target)) {
    dropdown.classList.remove("show");
  }
});

async function handleNotificationClick(notificationId, relatedId) {
  try {
    await fetch(`${API_URL}/notifications/${notificationId}/read`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    document.getElementById("notificationDropdown").classList.remove("show");

    if (relatedId) {
      navigateTo("maintenance");
      setTimeout(() => {
        const rows = document.querySelectorAll("#maintenanceTableBody tr");
        rows.forEach((row) => {
          if (row.dataset?.requestId === relatedId) {
            row.style.backgroundColor = "var(--primary-light)";
            setTimeout(() => {
              row.style.backgroundColor = "";
            }, 3000);
          }
        });
      }, 500);
    }

    loadNotifications();
  } catch (error) {
    console.error("Handle notification click error:", error);
  }
}

async function deleteNotification(notificationId) {
  try {
    await fetch(`${API_URL}/notifications/${notificationId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    notifications = notifications.filter((n) => n._id !== notificationId);
    if (notifications.some((n) => !n.isRead)) {
      unreadCount = notifications.filter((n) => !n.isRead).length;
    } else {
      unreadCount = 0;
    }

    updateNotificationUI();
  } catch (error) {
    console.error("Delete notification error:", error);
    showToast("Failed to delete notification", "error");
  }
}

async function markAllNotificationsRead() {
  try {
    await fetch(`${API_URL}/notifications/read-all`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    unreadCount = 0;
    notifications.forEach((n) => (n.isRead = true));
    updateNotificationUI();
    showToast("All notifications marked as read", "success");
  } catch (error) {
    console.error("Mark all read error:", error);
    showToast("Failed to mark all as read", "error");
  }
}

function startNotificationPolling() {
  if (notificationInterval) {
    clearInterval(notificationInterval);
  }

  notificationInterval = setInterval(() => {
    if (token && currentUser) {
      loadNotifications();
    }
  }, 10000);
}

function stopNotificationPolling() {
  if (notificationInterval) {
    clearInterval(notificationInterval);
    notificationInterval = null;
  }
}

// ===== PROFILE FUNCTIONS =====
function showProfile() {
  document.querySelectorAll(".content-page").forEach((p) => p.classList.remove("active"));

  const profilePage = document.getElementById("profilePage");
  if (profilePage) {
    profilePage.classList.add("active");
  }

  document.getElementById("pageTitle").textContent = "My Profile";

  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.remove("active");
    if (item.dataset.page === "profile") {
      item.classList.add("active");
    }
  });

  renderProfile();
}

function renderProfile() {
  const profilePage = document.getElementById("profilePage");
  const isAdmin = currentUser && currentUser.role === "admin";
  const profilePic = currentUser?.profilePicture || "";

  const avatarContent = profilePic ? `<img src="${profilePic}" alt="Profile">` : `<span class="avatar-text">${currentUser?.name?.charAt(0).toUpperCase() || "U"}</span>`;

  profilePage.innerHTML = `
    <div class="profile-container">
      <div class="profile-card">
        <div class="profile-header">
          <div class="profile-avatar-large" onclick="triggerProfilePicUpload()">
            ${avatarContent}
            <div class="avatar-upload-overlay">
              <i class="fas fa-camera"></i>
            </div>
          </div>
          <div class="profile-header-info">
            <h2>${currentUser?.name || "User"}</h2>
            <p>${currentUser?.role === "admin" ? "Administrator" : "Employee"} 
            ${currentUser?.department ? "· " + currentUser.department : ""}</p>
            <p style="font-size: 12px; opacity: 0.7; margin-top: 4px;">
              <i class="fas fa-camera"></i> Click avatar to change
            </p>
          </div>
        </div>
        <div class="profile-body">
          <div class="profile-info-grid">
            <div class="profile-info-item">
              <span class="label">Employee ID</span>
              <span class="value">${currentUser?.employeeId || "-"}</span>
            </div>
            <div class="profile-info-item">
              <span class="label">Email</span>
              <span class="value">${currentUser?.email || "-"}</span>
            </div>
            <div class="profile-info-item">
              <span class="label">Department</span>
              <span class="value">${currentUser?.department || "Not specified"}</span>
            </div>
            <div class="profile-info-item">
              <span class="label">Designation</span>
              <span class="value">${currentUser?.designation || "Not specified"}</span>
            </div>
            <div class="profile-info-item">
              <span class="label">Role</span>
              <span class="value"><span class="status-badge ${currentUser?.role === "admin" ? "allocated" : "available"}">${currentUser?.role === "admin" ? "Administrator" : "Employee"}</span></span>
            </div>
            <div class="profile-info-item">
              <span class="label">Member Since</span>
              <span class="value">${currentUser?.createdAt ? formatDate(currentUser.createdAt) : "N/A"}</span>
            </div>
          </div>
          <div class="profile-actions">
            <button class="btn-secondary" onclick="editProfile()">
              <i class="fas fa-edit"></i> Edit Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function editProfile() {
  const isAdmin = currentUser && currentUser.role === "admin";

  const html = `
    <form id="profileEditForm" onsubmit="updateProfile(event)">
      <div class="form-group">
        <label>Full Name *</label>
        <input type="text" id="editName" value="${currentUser?.name || ""}" required>
      </div>
      <div class="form-group">
        <label>Employee ID</label>
        <input type="text" id="editEmployeeId" value="${currentUser?.employeeId || ""}" disabled style="background: var(--border-color);">
        <small style="color: var(--text-muted);">Employee ID cannot be changed</small>
      </div>
      <div class="form-group">
        <label>Email</label>
        <input type="email" id="editEmail" value="${currentUser?.email || ""}" disabled style="background: var(--border-color);">
        <small style="color: var(--text-muted);">Email cannot be changed</small>
      </div>
      <div class="form-group">
        <label>Department</label>
        <input type="text" id="editDepartment" value="${currentUser?.department || ""}" ${isAdmin ? "" : 'disabled style="background: var(--border-color);"'}>
        <small style="color: var(--text-muted);">${isAdmin ? "Update your department" : "Contact admin to update department"}</small>
      </div>
      <div class="form-group">
        <label>Designation</label>
        <input type="text" id="editDesignation" value="${currentUser?.designation || ""}" ${isAdmin ? "" : 'disabled style="background: var(--border-color);"'}>
        <small style="color: var(--text-muted);">${isAdmin ? "Update your designation" : "Contact admin to update designation"}</small>
      </div>
      <div style="margin-top: 20px; padding-top: 20px; border-top: 2px solid var(--border-color);">
        <h4 style="margin-bottom: 16px; color: var(--text-primary);">Change Password</h4>
        <div class="form-group">
          <label>Current Password *</label>
          <input type="password" id="editCurrentPassword" placeholder="Enter your current password" required>
        </div>
        <div class="form-group">
          <label>New Password *</label>
          <input type="password" id="editPassword" placeholder="Enter new password (min 6 characters)" required minlength="6">
        </div>
        <div class="form-group">
          <label>Confirm New Password *</label>
          <input type="password" id="editConfirmPassword" placeholder="Confirm new password" required>
        </div>
      </div>
      <div id="profileEditError" class="error-message" style="display:none;"></div>
      <div class="modal-footer">
        <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn-primary">
          <i class="fas fa-save"></i> Save Changes
        </button>
      </div>
    </form>
  `;
  showModal("Edit Profile", html);
}

async function updateProfile(e) {
  e.preventDefault();

  const name = document.getElementById("editName").value.trim();
  const department = document.getElementById("editDepartment").value.trim();
  const designation = document.getElementById("editDesignation").value.trim();
  const currentPassword = document.getElementById("editCurrentPassword").value;
  const newPassword = document.getElementById("editPassword").value;
  const confirmPassword = document.getElementById("editConfirmPassword").value;
  const errorDiv = document.getElementById("profileEditError");

  errorDiv.style.display = "none";

  if (!name) {
    errorDiv.textContent = "Name is required";
    errorDiv.style.display = "block";
    return;
  }

  if (!currentPassword) {
    errorDiv.textContent = "Please enter your current password";
    errorDiv.style.display = "block";
    return;
  }

  if (!newPassword) {
    errorDiv.textContent = "Please enter a new password";
    errorDiv.style.display = "block";
    return;
  }

  if (newPassword !== confirmPassword) {
    errorDiv.textContent = "New passwords do not match";
    errorDiv.style.display = "block";
    return;
  }

  if (newPassword.length < 6) {
    errorDiv.textContent = "Password must be at least 6 characters";
    errorDiv.style.display = "block";
    return;
  }

  const data = {
    name,
    currentPassword,
    newPassword,
  };

  const isAdmin = currentUser && currentUser.role === "admin";
  if (isAdmin) {
    if (department) data.department = department;
    if (designation) data.designation = designation;
  }

  try {
    const response = await fetch(`${API_URL}/auth/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to update profile");
    }

    const updatedUser = await response.json();

    closeModal();
    showToast("Profile updated successfully!", "success");

    currentUser = {
      ...currentUser,
      name: updatedUser.name,
      department: updatedUser.department,
      designation: updatedUser.designation,
    };
    localStorage.setItem("user", JSON.stringify(currentUser));

    document.getElementById("userName").textContent = currentUser.name;
    updateProfilePictureUI(currentUser?.profilePicture || null);
    renderProfile();
  } catch (error) {
    errorDiv.textContent = error.message || "Failed to update profile";
    errorDiv.style.display = "block";
    showToast("Failed to update profile", "error");
  }
}

// ===== SETTINGS FUNCTIONS =====
function showSettings() {
  document.querySelectorAll(".content-page").forEach((p) => p.classList.remove("active"));

  const settingsPage = document.getElementById("settingsPage");
  if (settingsPage) {
    settingsPage.classList.add("active");
  }

  document.getElementById("pageTitle").textContent = "Settings";

  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.remove("active");
    if (item.dataset.page === "settings") {
      item.classList.add("active");
    }
  });

  renderSettings();
}

function renderSettings() {
  const settingsPage = document.getElementById("settingsPage");
  const settings = JSON.parse(localStorage.getItem("settings") || "{}");

  settingsPage.innerHTML = `
    <div class="settings-container">
      <div class="settings-header">
        <h2>Settings</h2>
        <p>Manage your system settings and configurations</p>
      </div>

      <div class="settings-grid">
        <div class="settings-card">
          <div class="settings-card-header">
            <i class="fas fa-cog"></i>
            <h3>General Settings</h3>
          </div>
          <div class="settings-card-body">
            <div class="setting-item">
              <div class="setting-info">
                <label>System Name</label>
                <p>${settings.systemName || "IT Asset Management"}</p>
              </div>
              <button class="btn-secondary" onclick="editSystemName()">
                <i class="fas fa-edit"></i> Edit
              </button>
            </div>
            <div class="setting-item">
              <div class="setting-info">
                <label>System Timezone</label>
                <p id="timezoneDisplay">${settings.timezone || "UTC+5:30 (IST)"}</p>
              </div>
              <button class="btn-secondary" onclick="changeTimezone()">
                <i class="fas fa-clock"></i> Change
              </button>
            </div>
            <div class="setting-item">
              <div class="setting-info">
                <label>Date Format</label>
                <p id="dateFormatDisplay">${settings.dateFormat || "MM/DD/YYYY"}</p>
              </div>
              <button class="btn-secondary" onclick="changeDateFormat()">
                <i class="fas fa-calendar"></i> Change
              </button>
            </div>
          </div>
        </div>

        <div class="settings-card">
          <div class="settings-card-header">
            <i class="fas fa-palette"></i>
            <h3>Appearance</h3>
          </div>
          <div class="settings-card-body">
            <div class="setting-item">
              <div class="setting-info">
                <label>Theme</label>
                <p id="themeDisplay">${settings.theme === "dark" ? "Dark Mode" : "Light Mode"}</p>
              </div>
              <button class="btn-secondary" onclick="toggleThemeSettings()">
                <i class="fas fa-moon"></i> Toggle
              </button>
            </div>
            <div class="setting-item">
              <div class="setting-info">
                <label>Sidebar Color</label>
                <p id="sidebarColorDisplay">${settings.sidebarColor || "Default (Dark)"}</p>
              </div>
              <button class="btn-secondary" onclick="changeSidebarColor()">
                <i class="fas fa-paint-bucket"></i> Change
              </button>
            </div>
            <div class="setting-item">
              <div class="setting-info">
                <label>Font Size</label>
                <p id="fontSizeDisplay">${settings.fontSize || "Medium"}</p>
              </div>
              <button class="btn-secondary" onclick="changeFontSize()">
                <i class="fas fa-font"></i> Change
              </button>
            </div>
          </div>
        </div>

        <div class="settings-card">
          <div class="settings-card-header">
            <i class="fas fa-shield-alt"></i>
            <h3>Security</h3>
          </div>
          <div class="settings-card-body">
            <div class="setting-item">
              <div class="setting-info">
                <label>Two-Factor Authentication</label>
                <p id="twoFactorDisplay">${settings.twoFactor ? "Enabled" : "Disabled"}</p>
              </div>
              <button class="btn-secondary" onclick="toggleTwoFactor()">
                <i class="fas fa-lock"></i> ${settings.twoFactor ? "Disable" : "Enable"}
              </button>
            </div>
            <div class="setting-item">
              <div class="setting-info">
                <label>Session Timeout</label>
                <p id="sessionTimeoutDisplay">${settings.sessionTimeout || "30 minutes"}</p>
              </div>
              <button class="btn-secondary" onclick="changeSessionTimeout()">
                <i class="fas fa-clock"></i> Change
              </button>
            </div>
            <div class="setting-item">
              <div class="setting-info">
                <label>Login History</label>
                <p>View your recent login activity</p>
              </div>
              <button class="btn-secondary" onclick="viewLoginHistory()">
                <i class="fas fa-history"></i> View
              </button>
            </div>
          </div>
        </div>

        <div class="settings-card">
          <div class="settings-card-header">
            <i class="fas fa-database"></i>
            <h3>Data Management</h3>
          </div>
          <div class="settings-card-body">
            <div class="setting-item">
              <div class="setting-info">
                <label>Export All Data</label>
                <p>Export all system data as JSON</p>
              </div>
              <button class="btn-success" onclick="exportAllData()">
                <i class="fas fa-download"></i> Export
              </button>
            </div>
            <div class="setting-item">
              <div class="setting-info">
                <label>Import Data</label>
                <p>Import data from JSON file</p>
              </div>
              <button class="btn-secondary" onclick="importData()">
                <i class="fas fa-upload"></i> Import
              </button>
            </div>
            <div class="setting-item">
              <div class="setting-info">
                <label>Clear Cache</label>
                <p>Clear application cache and refresh</p>
              </div>
              <button class="btn-danger" onclick="clearCache()">
                <i class="fas fa-trash"></i> Clear
              </button>
            </div>
          </div>
        </div>

        <div class="settings-card">
          <div class="settings-card-header">
            <i class="fas fa-bell"></i>
            <h3>Notifications</h3>
          </div>
          <div class="settings-card-body">
            <div class="setting-item">
              <div class="setting-info">
                <label>Email Notifications</label>
                <p id="emailNotificationDisplay">${settings.emailNotifications !== false ? "Enabled" : "Disabled"}</p>
              </div>
              <button class="btn-secondary" onclick="toggleEmailNotifications()">
                <i class="fas fa-envelope"></i> Toggle
              </button>
            </div>
            <div class="setting-item">
              <div class="setting-info">
                <label>Maintenance Alerts</label>
                <p id="maintenanceAlertDisplay">${settings.maintenanceAlerts !== false ? "Enabled" : "Disabled"}</p>
              </div>
              <button class="btn-secondary" onclick="toggleMaintenanceAlerts()">
                <i class="fas fa-tools"></i> Toggle
              </button>
            </div>
            <div class="setting-item">
              <div class="setting-info">
                <label>Asset Status Updates</label>
                <p id="assetAlertDisplay">${settings.assetAlerts !== false ? "Enabled" : "Disabled"}</p>
              </div>
              <button class="btn-secondary" onclick="toggleAssetAlerts()">
                <i class="fas fa-server"></i> Toggle
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function saveSettings(settings) {
  const currentSettings = JSON.parse(localStorage.getItem("settings") || "{}");
  const updatedSettings = { ...currentSettings, ...settings };
  localStorage.setItem("settings", JSON.stringify(updatedSettings));
  renderSettings();
  showToast("Settings updated successfully!", "success");
}

function editSystemName() {
  const settings = JSON.parse(localStorage.getItem("settings") || "{}");
  const currentName = settings.systemName || "IT Asset Management";
  const newName = prompt("Enter new system name:", currentName);
  if (newName && newName.trim()) {
    document.querySelector(".sidebar-brand span").textContent = newName.trim();
    document.querySelector(".login-header h1").textContent = newName.trim();
    saveSettings({ systemName: newName.trim() });
  }
}

function changeTimezone() {
  const timezones = ["UTC-12:00 (International Date Line West)", "UTC-11:00 (Midway Island, Samoa)", "UTC-10:00 (Hawaii)", "UTC-09:00 (Alaska)", "UTC-08:00 (Pacific Time)", "UTC-07:00 (Mountain Time)", "UTC-06:00 (Central Time)", "UTC-05:00 (Eastern Time)", "UTC-04:00 (Atlantic Time)", "UTC-03:00 (Brasilia)", "UTC-02:00 (Mid-Atlantic)", "UTC-01:00 (Cape Verde)", "UTC+00:00 (UTC)", "UTC+01:00 (London, Dublin)", "UTC+02:00 (Athens, Cairo)", "UTC+03:00 (Moscow, Nairobi)", "UTC+03:30 (Tehran)", "UTC+04:00 (Dubai, Baku)", "UTC+04:30 (Kabul)", "UTC+05:00 (Karachi, Tashkent)", "UTC+05:30 (India Standard Time)", "UTC+05:45 (Kathmandu)", "UTC+06:00 (Dhaka, Almaty)", "UTC+06:30 (Yangon)", "UTC+07:00 (Bangkok, Jakarta)", "UTC+08:00 (Beijing, Singapore)", "UTC+08:45 (Eucla)", "UTC+09:00 (Tokyo, Seoul)", "UTC+09:30 (Adelaide)", "UTC+10:00 (Sydney, Melbourne)", "UTC+10:30 (Lord Howe Island)", "UTC+11:00 (Solomon Islands)", "UTC+12:00 (Auckland, Fiji)"];

  const settings = JSON.parse(localStorage.getItem("settings") || "{}");
  const currentTimezone = settings.timezone || "UTC+5:30 (IST)";
  const options = timezones.map(tz => `<option value="${tz}" ${tz === currentTimezone ? "selected" : ""}>${tz}</option>`).join("");

  const html = `
    <div style="padding: 10px 0;">
      <p style="margin-bottom: 16px; color: var(--text-muted);">Select your preferred timezone:</p>
      <select id="timezoneSelect" style="width: 100%; padding: 10px 14px; border: 2px solid var(--border-color); border-radius: 8px; font-size: 14px; background: var(--bg-input); color: var(--text-primary);">
        ${options}
      </select>
    </div>
    <div class="modal-footer">
      <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
      <button type="button" class="btn-primary" onclick="saveTimezone()">Save</button>
    </div>
  `;
  showModal("Change Timezone", html);
}

function saveTimezone() {
  const timezone = document.getElementById("timezoneSelect").value;
  saveSettings({ timezone });
  closeModal();
}

function changeDateFormat() {
  const formats = ["MM/DD/YYYY", "DD/MM/YYYY", "YYYY/MM/DD", "MM-DD-YYYY", "DD-MM-YYYY"];
  const settings = JSON.parse(localStorage.getItem("settings") || "{}");
  const currentFormat = settings.dateFormat || "MM/DD/YYYY";
  const options = formats.map(f => `<option value="${f}" ${f === currentFormat ? "selected" : ""}>${f}</option>`).join("");

  const html = `
    <div style="padding: 10px 0;">
      <p style="margin-bottom: 16px; color: var(--text-muted);">Select your preferred date format:</p>
      <select id="dateFormatSelect" style="width: 100%; padding: 10px 14px; border: 2px solid var(--border-color); border-radius: 8px; font-size: 14px; background: var(--bg-input); color: var(--text-primary);">
        ${options}
      </select>
    </div>
    <div class="modal-footer">
      <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
      <button type="button" class="btn-primary" onclick="saveDateFormat()">Save</button>
    </div>
  `;
  showModal("Change Date Format", html);
}

function saveDateFormat() {
  const dateFormat = document.getElementById("dateFormatSelect").value;
  saveSettings({ dateFormat });
  closeModal();
}

function toggleThemeSettings() {
  toggleTheme();
  const currentTheme = document.documentElement.getAttribute("data-theme");
  saveSettings({ theme: currentTheme === "dark" ? "dark" : "light" });
}

function changeSidebarColor() {
  const colors = [{ name: "Default (Dark)", value: "#0f172a" }, { name: "Blue", value: "#1e3a5f" }, { name: "Purple", value: "#2d1b69" }, { name: "Green", value: "#064e3b" }, { name: "Red", value: "#450a0a" }, { name: "Gray", value: "#1e293b" }];

  const settings = JSON.parse(localStorage.getItem("settings") || "{}");
  const currentColor = settings.sidebarColor || "Default (Dark)";
  const options = colors.map(c => `<option value="${c.value}" ${c.name === currentColor ? "selected" : ""}>${c.name}</option>`).join("");

  const html = `
    <div style="padding: 10px 0;">
      <p style="margin-bottom: 16px; color: var(--text-muted);">Select sidebar color:</p>
      <select id="sidebarColorSelect" style="width: 100%; padding: 10px 14px; border: 2px solid var(--border-color); border-radius: 8px; font-size: 14px; background: var(--bg-input); color: var(--text-primary);">
        ${options}
      </select>
      <div style="margin-top: 12px; display: flex; gap: 8px; flex-wrap: wrap;">
        ${colors.map(c => `
          <div onclick="document.getElementById('sidebarColorSelect').value='${c.value}'" 
               style="width: 40px; height: 40px; border-radius: 8px; background: ${c.value}; border: 2px solid var(--border-color); cursor: pointer; transition: var(--transition);"
               onmouseover="this.style.transform='scale(1.1)'" 
               onmouseout="this.style.transform='scale(1)'"></div>
        `).join("")}
      </div>
    </div>
    <div class="modal-footer">
      <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
      <button type="button" class="btn-primary" onclick="saveSidebarColor()">Save</button>
    </div>
  `;
  showModal("Change Sidebar Color", html);
}

function saveSidebarColor() {
  const color = document.getElementById("sidebarColorSelect").value;
  const colorNames = {
    "#0f172a": "Default (Dark)",
    "#1e3a5f": "Blue",
    "#2d1b69": "Purple",
    "#064e3b": "Green",
    "#450a0a": "Red",
    "#1e293b": "Gray"
  };
  document.querySelector(".sidebar").style.background = color;
  saveSettings({ sidebarColor: colorNames[color] || "Default (Dark)" });
  closeModal();
}

function changeFontSize() {
  const sizes = ["Small", "Medium", "Large", "Extra Large"];
  const settings = JSON.parse(localStorage.getItem("settings") || "{}");
  const currentSize = settings.fontSize || "Medium";
  const options = sizes.map(s => `<option value="${s}" ${s === currentSize ? "selected" : ""}>${s}</option>`).join("");

  const html = `
    <div style="padding: 10px 0;">
      <p style="margin-bottom: 16px; color: var(--text-muted);">Select font size:</p>
      <select id="fontSizeSelect" style="width: 100%; padding: 10px 14px; border: 2px solid var(--border-color); border-radius: 8px; font-size: 14px; background: var(--bg-input); color: var(--text-primary);">
        ${options}
      </select>
    </div>
    <div class="modal-footer">
      <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
      <button type="button" class="btn-primary" onclick="saveFontSize()">Save</button>
    </div>
  `;
  showModal("Change Font Size", html);
}

function saveFontSize() {
  const size = document.getElementById("fontSizeSelect").value;
  const fontSizes = { Small: "14px", Medium: "16px", Large: "18px", "Extra Large": "20px" };
  document.body.style.fontSize = fontSizes[size] || "16px";
  saveSettings({ fontSize: size });
  closeModal();
}

function toggleTwoFactor() {
  const settings = JSON.parse(localStorage.getItem("settings") || "{}");
  const current = settings.twoFactor || false;
  const newStatus = !current;
  saveSettings({ twoFactor: newStatus });
  showToast(`Two-Factor Authentication ${newStatus ? "enabled" : "disabled"}!`, newStatus ? "success" : "warning");
}

function changeSessionTimeout() {
  const timeouts = ["15 minutes", "30 minutes", "45 minutes", "60 minutes", "90 minutes", "120 minutes"];
  const settings = JSON.parse(localStorage.getItem("settings") || "{}");
  const currentTimeout = settings.sessionTimeout || "30 minutes";
  const options = timeouts.map(t => `<option value="${t}" ${t === currentTimeout ? "selected" : ""}>${t}</option>`).join("");

  const html = `
    <div style="padding: 10px 0;">
      <p style="margin-bottom: 16px; color: var(--text-muted);">Select session timeout:</p>
      <select id="sessionTimeoutSelect" style="width: 100%; padding: 10px 14px; border: 2px solid var(--border-color); border-radius: 8px; font-size: 14px; background: var(--bg-input); color: var(--text-primary);">
        ${options}
      </select>
    </div>
    <div class="modal-footer">
      <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
      <button type="button" class="btn-primary" onclick="saveSessionTimeout()">Save</button>
    </div>
  `;
  showModal("Change Session Timeout", html);
}

function saveSessionTimeout() {
  const timeout = document.getElementById("sessionTimeoutSelect").value;
  saveSettings({ sessionTimeout: timeout });
  closeModal();
}

function viewLoginHistory() {
  const history = [{ date: "2026-06-20 10:30:15", ip: "192.168.1.1", device: "Chrome on Windows" }, { date: "2026-06-19 15:45:22", ip: "192.168.1.1", device: "Chrome on Windows" }, { date: "2026-06-18 09:12:45", ip: "192.168.1.1", device: "Firefox on Windows" }, { date: "2026-06-17 14:20:30", ip: "192.168.1.1", device: "Chrome on Windows" }, { date: "2026-06-16 11:05:10", ip: "192.168.1.1", device: "Edge on Windows" }];

  const html = `
    <div style="padding: 10px 0;">
      <h4 style="margin-bottom: 16px;">Recent Login Activity</h4>
      <div style="max-height: 300px; overflow-y: auto;">
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: var(--bg-input);">
              <th style="padding: 8px 12px; text-align: left; font-size: 12px; color: var(--text-muted);">Date & Time</th>
              <th style="padding: 8px 12px; text-align: left; font-size: 12px; color: var(--text-muted);">IP Address</th>
              <th style="padding: 8px 12px; text-align: left; font-size: 12px; color: var(--text-muted);">Device</th>
            </tr>
          </thead>
          <tbody>
            ${history.map(entry => `
              <tr style="border-bottom: 1px solid var(--border-color);">
                <td style="padding: 8px 12px; font-size: 13px;">${entry.date}</td>
                <td style="padding: 8px 12px; font-size: 13px;">${entry.ip}</td>
                <td style="padding: 8px 12px; font-size: 13px;">${entry.device}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
    <div class="modal-footer">
      <button type="button" class="btn-secondary" onclick="closeModal()">Close</button>
    </div>
  `;
  showModal("Login History", html);
}

function toggleEmailNotifications() {
  const settings = JSON.parse(localStorage.getItem("settings") || "{}");
  const current = settings.emailNotifications !== false;
  const newStatus = !current;
  saveSettings({ emailNotifications: newStatus });
  showToast(`Email notifications ${newStatus ? "enabled" : "disabled"}!`, newStatus ? "success" : "warning");
}

function toggleMaintenanceAlerts() {
  const settings = JSON.parse(localStorage.getItem("settings") || "{}");
  const current = settings.maintenanceAlerts !== false;
  const newStatus = !current;
  saveSettings({ maintenanceAlerts: newStatus });
  showToast(`Maintenance alerts ${newStatus ? "enabled" : "disabled"}!`, newStatus ? "success" : "warning");
}

function toggleAssetAlerts() {
  const settings = JSON.parse(localStorage.getItem("settings") || "{}");
  const current = settings.assetAlerts !== false;
  const newStatus = !current;
  saveSettings({ assetAlerts: newStatus });
  showToast(`Asset alerts ${newStatus ? "enabled" : "disabled"}!`, newStatus ? "success" : "warning");
}

function exportAllData() {
  const data = {
    users: employees,
    assets: assets,
    allocations: allocations,
    maintenance: maintenanceRequests,
    settings: JSON.parse(localStorage.getItem("settings") || "{}"),
    exportedAt: new Date().toISOString()
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `it_asset_data_${new Date().toISOString().split("T")[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast("Data exported successfully!", "success");
}

function importData() {
  const html = `
    <div style="padding: 10px 0;">
      <p style="margin-bottom: 16px; color: var(--text-muted);">Select a JSON file to import:</p>
      <input type="file" id="importFileInput" accept=".json" style="width: 100%; padding: 10px; border: 2px solid var(--border-color); border-radius: 8px; background: var(--bg-input);">
      <p style="margin-top: 12px; font-size: 12px; color: var(--text-muted);">Warning: This will overwrite existing data!</p>
    </div>
    <div class="modal-footer">
      <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
      <button type="button" class="btn-primary" onclick="processImport()">Import</button>
    </div>
  `;
  showModal("Import Data", html);
}

function processImport() {
  const input = document.getElementById("importFileInput");
  if (!input.files || input.files.length === 0) {
    showToast("Please select a file", "error");
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      console.log("Imported data:", data);
      closeModal();
      showToast("Data imported successfully! Refreshing...", "success");
      setTimeout(() => location.reload(), 1500);
    } catch (error) {
      showToast("Invalid file format", "error");
    }
  };
  reader.readAsText(input.files[0]);
}

function clearCache() {
  if (!confirm("Are you sure you want to clear the application cache? This will refresh the page.")) return;

  const token = localStorage.getItem("token");
  const user = localStorage.getItem("user");
  localStorage.clear();
  if (token) localStorage.setItem("token", token);
  if (user) localStorage.setItem("user", user);

  showToast("Cache cleared! Refreshing...", "success");
  setTimeout(() => location.reload(), 1000);
}

// ===== FILTER FUNCTIONS =====
function filterAssets() {
  const search = document.getElementById("assetSearch").value.toLowerCase();
  const category = document.getElementById("assetCategoryFilter").value;
  const status = document.getElementById("assetStatusFilter").value;

  let filtered = assets;
  if (search) {
    filtered = filtered.filter(
      (a) =>
        a.assetName?.toLowerCase().includes(search) ||
        a.assetCode?.toLowerCase().includes(search) ||
        a.serialNumber?.toLowerCase().includes(search),
    );
  }
  if (category) filtered = filtered.filter((a) => a.category === category);
  if (status) filtered = filtered.filter((a) => a.status === status);

  renderAssetsTable(filtered);
}

function filterEmployees() {
  const search = document.getElementById("employeeSearch").value.toLowerCase();
  const filtered = employees.filter(
    (e) =>
      e.name?.toLowerCase().includes(search) ||
      e.email?.toLowerCase().includes(search) ||
      e.employeeId?.toLowerCase().includes(search) ||
      e.department?.toLowerCase().includes(search),
  );
  renderEmployeesTable(filtered);
}

// ===== INITIALIZE APPLICATION =====
function initializeApp() {
  document.getElementById("loginPage").classList.remove("active");
  document.getElementById("appPage").classList.add("active");

  document.getElementById("userName").textContent = currentUser.name;
  document.getElementById("userRole").textContent =
    currentUser.role === "admin" ? "Administrator" : "Employee";

  loadProfilePicture();

  updateProfilePictureUI(currentUser?.profilePicture || null);

  const isAdmin = currentUser.role === "admin";

  if (!isAdmin) {
    document.querySelectorAll(".nav-item").forEach((item) => {
      const page = item.dataset.page;
      if (["employees", "allocations"].includes(page)) {
        item.style.display = "none";
      }
      if (["dashboard", "assets", "maintenance", "reports", "profile", "settings"].includes(page)) {
        item.style.display = "flex";
      }
    });

    const adminOnlyButtons = ["addAssetBtn", "addEmployeeBtn", "addAllocationBtn"];
    adminOnlyButtons.forEach((id) => {
      const btn = document.getElementById(id);
      if (btn) btn.style.display = "none";
    });

    const maintBtn = document.getElementById("addMaintenanceBtn");
    if (maintBtn) maintBtn.style.display = "inline-flex";
  } else {
    document.querySelectorAll(".nav-item").forEach((item) => {
      item.style.display = "flex";
    });

    ["addAssetBtn", "addEmployeeBtn", "addAllocationBtn", "addMaintenanceBtn"].forEach((id) => {
      const btn = document.getElementById(id);
      if (btn) btn.style.display = "inline-flex";
    });
  }

  setupProfilePictureUpload();

  loadNotifications();
  startNotificationPolling();

  navigateTo("dashboard");
}

// ===== TEST CONNECTION =====
async function testConnection() {
  try {
    const response = await fetch(`${API_URL}/health`);
    const data = await response.json();
    console.log("✅ Backend connected:", data);
    return true;
  } catch (error) {
    console.error("❌ Backend connection failed:", error);
    return false;
  }
}

// ===== EVENT LISTENERS =====
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("loginForm").addEventListener("submit", handleLogin);
  document.getElementById("signupForm").addEventListener("submit", handleSignup);
  document.getElementById("logoutBtn").addEventListener("click", handleLogout);

  document.getElementById("themeToggleBtn")?.addEventListener("click", toggleTheme);

  document.querySelectorAll(".nav-item").forEach((item) => {
    item.addEventListener("click", () => {
      const page = item.dataset.page;
      if (page === "profile") {
        showProfile();
      } else if (page === "settings") {
        showSettings();
      } else if (page) {
        navigateTo(page);
      }
    });
  });

  document.getElementById("menuToggle").addEventListener("click", () => {
    document.getElementById("sidebar").classList.toggle("open");
  });

  document.addEventListener("click", (e) => {
    const sidebar = document.getElementById("sidebar");
    const toggle = document.getElementById("menuToggle");
    if (
      window.innerWidth <= 768 &&
      sidebar.classList.contains("open") &&
      !sidebar.contains(e.target) &&
      !toggle.contains(e.target)
    ) {
      sidebar.classList.remove("open");
    }
  });

  document.getElementById("assetSearch")?.addEventListener("input", filterAssets);
  document.getElementById("assetCategoryFilter")?.addEventListener("change", filterAssets);
  document.getElementById("assetStatusFilter")?.addEventListener("change", filterAssets);
  document.getElementById("employeeSearch")?.addEventListener("input", filterEmployees);

  document.getElementById("addAssetBtn")?.addEventListener("click", showAddAssetModal);
  document.getElementById("addEmployeeBtn")?.addEventListener("click", showAddEmployeeModal);
  document.getElementById("addAllocationBtn")?.addEventListener("click", showAddAllocationModal);
  document.getElementById("addMaintenanceBtn")?.addEventListener("click", showAddMaintenanceModal);

  document.getElementById("currentDate").textContent = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  loadTheme();

  showLogin();

  const savedToken = localStorage.getItem("token");
  const savedUser = localStorage.getItem("user");

  if (savedToken && savedUser) {
    token = savedToken;
    currentUser = JSON.parse(savedUser);
    initializeApp();
  } else {
    document.getElementById("loginPage").classList.add("active");
    showLogin();
  }

  testConnection();
});

// ===== LIVE TIME WIDGET =====
function updateLiveTime() {
  const now = new Date();
  
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const timeString = `${hours}:${minutes}:${seconds}`;
  
  const dateOptions = {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  };
  const dateString = now.toLocaleDateString('en-US', dateOptions);
  
  const timeDisplay = document.getElementById('timeDisplay');
  const dateDisplay = document.getElementById('dateDisplay');
  
  if (timeDisplay) timeDisplay.textContent = timeString;
  if (dateDisplay) dateDisplay.textContent = dateString;
}

let timeInterval = null;

function startLiveTime() {
  updateLiveTime();
  if (timeInterval) clearInterval(timeInterval);
  timeInterval = setInterval(updateLiveTime, 1000);
}

function stopLiveTime() {
  if (timeInterval) {
    clearInterval(timeInterval);
    timeInterval = null;
  }
}

// Override initializeApp to start live time
const origInitApp = window.initializeApp;
window.initializeApp = function() {
  origInitApp();
  startLiveTime();
};

// Override handleLogout to stop live time
const origHandleLogout = window.handleLogout;
window.handleLogout = function() {
  stopLiveTime();
  origHandleLogout();
};

// ===== MOVING CARDS / NEWS TICKER =====
function populateMovingCards() {
  const track = document.getElementById('movingCardsTrack');
  if (!track) return;

  // Get data from the dashboard
  const totalAssets = parseInt(document.getElementById('kpiTotalAssets')?.textContent || '0');
  const available = parseInt(document.getElementById('kpiAvailableAssets')?.textContent || '0');
  const allocated = parseInt(document.getElementById('kpiAllocatedAssets')?.textContent || '0');
  const maintenance = parseInt(document.getElementById('kpiMaintenanceAssets')?.textContent || '0');
  const employees = parseInt(document.getElementById('kpiTotalEmployees')?.textContent || '0');

  const cards = [
    { label: 'Total Assets', value: totalAssets, icon: 'fa-server', color: 'blue', change: '+12%', trend: 'up' },
    { label: 'Available', value: available, icon: 'fa-check-circle', color: 'green', change: '+8%', trend: 'up' },
    { label: 'Allocated', value: allocated, icon: 'fa-user-check', color: 'orange', change: '-3%', trend: 'down' },
    { label: 'Maintenance', value: maintenance, icon: 'fa-wrench', color: 'red', change: '+5%', trend: 'up' },
    { label: 'Employees', value: employees, icon: 'fa-users', color: 'purple', change: '0%', trend: 'neutral' },
  ];

  // Create card HTML
  let cardHTML = '';
  
  // Duplicate cards for seamless scrolling
  for (let repeat = 0; repeat < 2; repeat++) {
    cards.forEach(card => {
      cardHTML += `
        <div class="moving-card">
          <div class="card-icon ${card.color}">
            <i class="fas ${card.icon}"></i>
          </div>
          <span class="card-label">${card.label}</span>
          <span class="card-value">${card.value}</span>
          <span class="card-change ${card.trend}">
            ${card.trend === 'up' ? '<i class="fas fa-arrow-up"></i>' : ''}
            ${card.trend === 'down' ? '<i class="fas fa-arrow-down"></i>' : ''}
            ${card.trend === 'neutral' ? '<i class="fas fa-minus"></i>' : ''}
            ${card.change}
          </span>
        </div>
      `;
    });
  }

  track.innerHTML = cardHTML;
}

// Override the loadDashboard function to populate moving cards
const originalLoadDashboard = window.loadDashboard;
window.loadDashboard = async function() {
  // Call the original function
  await originalLoadDashboard();
  
  // Populate moving cards after dashboard loads
  setTimeout(populateMovingCards, 500);
};

// Also populate on initial load
document.addEventListener('DOMContentLoaded', function() {
  // Wait for dashboard to load
  setTimeout(populateMovingCards, 1000);
});
