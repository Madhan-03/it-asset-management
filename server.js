const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const app = express();

// ===== CORS Configuration =====
app.use(cors({
  origin: [
    'http://localhost:5500',
    'http://localhost:3000',
    'http://localhost:5000',
    'http://127.0.0.1:5500',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5000',
    'null',
    'https://it-asset-management-811z.onrender.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// ===== SERVE STATIC FILES =====
console.log('📁 Current directory:', __dirname);
app.use(express.static(__dirname));

// ===== ROOT ROUTE =====
app.get("/", (req, res) => {
  const filePath = path.join(__dirname, 'index.html');
  if (fs.existsSync(filePath)) {
    console.log('✅ Serving index.html');
    res.sendFile(filePath);
  } else {
    const files = fs.readdirSync(__dirname);
    res.send(`
      <h1>⚠️ index.html not found</h1>
      <p><strong>Looking in:</strong> ${__dirname}</p>
      <p><strong>Files found:</strong></p>
      <ul>
        ${files.map(f => `<li>${f}</li>`).join('')}
      </ul>
    `);
  }
});

// ===== HEALTH CHECK =====
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Server is running",
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? "Connected" : "Disconnected"
  });
});

app.get("/api", (req, res) => {
  res.json({
    status: "✅ Server is running!",
    message: "IT Asset Management System API",
    endpoints: {
      health: "/api/health",
      auth: "/api/auth",
      assets: "/api/assets",
      users: "/api/users",
      allocations: "/api/allocations",
      maintenance: "/api/maintenance",
      reports: "/api/reports"
    }
  });
});

// ===== MONGODB CONNECTION =====
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/it_asset_management";

mongoose
  .connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ===== MODELS =====

const UserSchema = new mongoose.Schema(
  {
    employeeId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["admin", "employee"], default: "employee" },
    department: String,
    designation: String,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const AssetSchema = new mongoose.Schema(
  {
    assetCode: { type: String, required: true, unique: true },
    assetName: { type: String, required: true },
    category: { type: String, required: true },
    brand: String,
    model: String,
    serialNumber: { type: String, unique: true, sparse: true },
    purchaseDate: Date,
    warrantyExpiryDate: Date,
    status: {
      type: String,
      enum: ["Available", "Allocated", "Under Maintenance", "Retired"],
      default: "Available",
    },
    condition: {
      type: String,
      enum: ["Good", "Damaged", "Needs Repair"],
      default: "Good",
    },
    cost: Number,
    location: String,
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    assignedDate: Date,
    notes: String,
  },
  { timestamps: true }
);

const AllocationSchema = new mongoose.Schema(
  {
    asset: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Asset",
      required: true,
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    allocatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    allocationDate: { type: Date, default: Date.now },
    returnDate: Date,
    condition: {
      type: String,
      enum: ["Good", "Damaged", "Needs Repair"],
      default: "Good",
    },
    remarks: String,
    status: { type: String, enum: ["Active", "Returned"], default: "Active" },
  },
  { timestamps: true }
);

const MaintenanceSchema = new mongoose.Schema(
  {
    asset: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Asset",
      required: true,
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    issue: { type: String, required: true },
    description: String,
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Medium",
    },
    status: {
      type: String,
      enum: ["Open", "In Progress", "Resolved", "Closed"],
      default: "Open",
    },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    resolution: String,
    resolvedDate: Date,
  },
  { timestamps: true }
);

const NotificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: [
        "maintenance_request",
        "maintenance_approved",
        "maintenance_resolved",
        "maintenance_rejected",
      ],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    relatedId: { type: mongoose.Schema.Types.ObjectId, ref: "Maintenance" },
    isRead: { type: Boolean, default: false },
    data: { type: Object, default: {} },
  },
  { timestamps: true }
);

const User = mongoose.model("User", UserSchema);
const Asset = mongoose.model("Asset", AssetSchema);
const Allocation = mongoose.model("Allocation", AllocationSchema);
const Maintenance = mongoose.model("Maintenance", MaintenanceSchema);
const Notification = mongoose.model("Notification", NotificationSchema);

// ===== MIDDLEWARE =====

const auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");
    req.user = await User.findById(decoded.id).select("-password");
    if (!req.user) {
      return res.status(401).json({ message: "User not found" });
    }
    next();
  } catch (error) {
    console.error("Auth error:", error);
    res.status(401).json({ message: "Invalid token" });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};

// ===== AUTH ROUTES =====

app.post("/api/auth/register", async (req, res) => {
  try {
    const { employeeId, name, email, password, role, department, designation } =
      req.body;

    const existing = await User.findOne({ $or: [{ email }, { employeeId }] });
    if (existing) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      employeeId,
      name,
      email,
      password: hashedPassword,
      role: role || "employee",
      department,
      designation,
    });

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || "secret",
      { expiresIn: "7d" }
    );
    res.status(201).json({
      _id: user._id,
      employeeId: user.employeeId,
      name: user.name,
      email: user.email,
      role: user.role,
      token,
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: error.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || "secret",
      { expiresIn: "7d" }
    );
    res.json({
      _id: user._id,
      employeeId: user.employeeId,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      designation: user.designation,
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: error.message });
  }
});

app.get("/api/auth/profile", auth, async (req, res) => {
  res.json(req.user);
});

app.put("/api/auth/profile", auth, async (req, res) => {
  try {
    const { name, department, designation, currentPassword, newPassword } =
      req.body;
    const userId = req.user._id;

    console.log("Profile update request for user:", userId);

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const updateData = {};
    if (name) updateData.name = name;

    if (req.user.role === "admin") {
      if (department !== undefined) updateData.department = department;
      if (designation !== undefined) updateData.designation = designation;
    }

    if (currentPassword && newPassword) {
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res
          .status(401)
          .json({ message: "Current password is incorrect" });
      }
      updateData.password = await bcrypt.hash(newPassword, 10);
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    console.log("Profile updated successfully");
    res.json(updatedUser);
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({ message: error.message });
  }
});

// ===== ASSET ROUTES =====

app.get("/api/assets", auth, async (req, res) => {
  try {
    const { category, status, search } = req.query;
    const query = {};
    if (category) query.category = category;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { assetName: { $regex: search, $options: "i" } },
        { assetCode: { $regex: search, $options: "i" } },
        { serialNumber: { $regex: search, $options: "i" } },
      ];
    }
    const assets = await Asset.find(query).populate(
      "assignedTo",
      "name employeeId"
    );
    res.json(assets);
  } catch (error) {
    console.error("Get assets error:", error);
    res.status(500).json({ message: error.message });
  }
});

app.post("/api/assets", auth, adminOnly, async (req, res) => {
  try {
    const asset = await Asset.create(req.body);
    res.status(201).json(asset);
  } catch (error) {
    console.error("Create asset error:", error);
    res.status(500).json({ message: error.message });
  }
});

app.put("/api/assets/:id", auth, adminOnly, async (req, res) => {
  try {
    const asset = await Asset.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!asset) {
      return res.status(404).json({ message: "Asset not found" });
    }
    res.json(asset);
  } catch (error) {
    console.error("Update asset error:", error);
    res.status(500).json({ message: error.message });
  }
});

app.delete("/api/assets/:id", auth, adminOnly, async (req, res) => {
  try {
    const asset = await Asset.findByIdAndDelete(req.params.id);
    if (!asset) {
      return res.status(404).json({ message: "Asset not found" });
    }
    res.json({ message: "Asset deleted" });
  } catch (error) {
    console.error("Delete asset error:", error);
    res.status(500).json({ message: error.message });
  }
});

// ===== USER ROUTES =====

app.get("/api/users", auth, adminOnly, async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ message: error.message });
  }
});

app.get("/api/users/count", auth, async (req, res) => {
  try {
    const count = await User.countDocuments();
    res.json({ count });
  } catch (error) {
    console.error("Get user count error:", error);
    res.status(500).json({ message: error.message });
  }
});

app.post("/api/users", auth, adminOnly, async (req, res) => {
  try {
    const { password, ...data } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ ...data, password: hashedPassword });
    res.status(201).json(user);
  } catch (error) {
    console.error("Create user error:", error);
    res.status(500).json({ message: error.message });
  }
});

app.put("/api/users/:id", auth, adminOnly, async (req, res) => {
  try {
    const { password, ...data } = req.body;
    if (password) {
      data.password = await bcrypt.hash(password, 10);
    }
    const user = await User.findByIdAndUpdate(req.params.id, data, {
      new: true,
    }).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({ message: error.message });
  }
});

app.delete("/api/users/:id", auth, adminOnly, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ message: "User deleted" });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ message: error.message });
  }
});

// ===== ALLOCATION ROUTES =====

app.get("/api/allocations", auth, async (req, res) => {
  try {
    let query = {};
    if (req.user.role === "employee") {
      query.employee = req.user._id;
    }
    const allocations = await Allocation.find(query)
      .populate("asset", "assetName assetCode")
      .populate("employee", "name employeeId")
      .populate("allocatedBy", "name");
    res.json(allocations);
  } catch (error) {
    console.error("Get allocations error:", error);
    res.status(500).json({ message: error.message });
  }
});

app.post("/api/allocations", auth, adminOnly, async (req, res) => {
  try {
    const { asset, employee, allocationDate, remarks } = req.body;

    const assetData = await Asset.findById(asset);
    if (!assetData) {
      return res.status(404).json({ message: "Asset not found" });
    }
    if (assetData.status !== "Available") {
      return res.status(400).json({ message: "Asset is not available" });
    }

    const allocation = await Allocation.create({
      asset,
      employee,
      allocatedBy: req.user._id,
      allocationDate,
      remarks,
    });

    await Asset.findByIdAndUpdate(asset, {
      status: "Allocated",
      assignedTo: employee,
      assignedDate: allocationDate || new Date(),
    });

    const populatedAllocation = await Allocation.findById(allocation._id)
      .populate("asset", "assetName assetCode")
      .populate("employee", "name employeeId");

    res.status(201).json(populatedAllocation);
  } catch (error) {
    console.error("Create allocation error:", error);
    res.status(500).json({ message: error.message });
  }
});

app.put("/api/allocations/:id/return", auth, adminOnly, async (req, res) => {
  try {
    const { returnDate, condition, remarks } = req.body;

    const allocation = await Allocation.findById(req.params.id);
    if (!allocation) {
      return res.status(404).json({ message: "Allocation not found" });
    }
    if (allocation.status === "Returned") {
      return res.status(400).json({ message: "Asset already returned" });
    }

    allocation.status = "Returned";
    allocation.returnDate = returnDate || new Date();
    allocation.condition = condition || "Good";
    allocation.remarks = remarks || allocation.remarks;
    await allocation.save();

    await Asset.findByIdAndUpdate(allocation.asset, {
      status: "Available",
      condition: condition || "Good",
      assignedTo: null,
      assignedDate: null,
    });

    res.json(allocation);
  } catch (error) {
    console.error("Return asset error:", error);
    res.status(500).json({ message: error.message });
  }
});

// ===== MAINTENANCE ROUTES =====

app.get("/api/maintenance", auth, async (req, res) => {
  try {
    let query = {};
    if (req.user.role === "employee") {
      query.employee = req.user._id;
    }
    const requests = await Maintenance.find(query)
      .populate("asset", "assetName assetCode status")
      .populate("employee", "name employeeId")
      .populate("assignedTo", "name")
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    console.error("Get maintenance error:", error);
    res.status(500).json({ message: error.message });
  }
});

app.post("/api/maintenance", auth, async (req, res) => {
  try {
    console.log("📝 Maintenance creation request received");
    console.log("👤 User:", req.user.email, "Role:", req.user.role);

    const { asset, employee, issue, description, priority } = req.body;

    if (!asset) {
      return res.status(400).json({ message: "Asset is required" });
    }
    if (!issue) {
      return res.status(400).json({ message: "Issue description is required" });
    }

    const assetData = await Asset.findById(asset);
    if (!assetData) {
      return res.status(404).json({ message: "Asset not found" });
    }

    let employeeId = employee;

    if (req.user.role === "employee") {
      if (!assetData.assignedTo) {
        return res.status(403).json({
          message:
            "This asset is not assigned to anyone. Please contact admin.",
        });
      }

      if (assetData.assignedTo.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          message:
            "You can only request maintenance for assets assigned to you",
        });
      }

      employeeId = req.user._id;
    } else if (req.user.role === "admin") {
      if (!employeeId) {
        employeeId = req.user._id;
      }
    }

    await Asset.findByIdAndUpdate(asset, { status: "Under Maintenance" });

    const requestData = {
      asset: asset,
      employee: employeeId,
      issue: issue,
      description: description || "",
      priority: priority || "Medium",
      status: "Open",
      assignedTo: req.user.role === "admin" ? req.user._id : null,
    };

    const request = await Maintenance.create(requestData);

    const admins = await User.find({ role: "admin" });
    const employeeData = await User.findById(employeeId);

    for (const admin of admins) {
      await Notification.create({
        userId: admin._id,
        type: "maintenance_request",
        title: "New Maintenance Request",
        message: `${employeeData?.name || "Employee"} requested maintenance for "${assetData.assetName}"`,
        relatedId: request._id,
        data: {
          employeeId: employeeId,
          employeeName: employeeData?.name,
          assetId: asset,
          assetName: assetData.assetName,
          issue: issue,
          priority: priority || "Medium",
          requestId: request._id,
        },
      });
    }
    console.log("✅ Notifications sent to admins");

    const populatedRequest = await Maintenance.findById(request._id)
      .populate("asset", "assetName assetCode status")
      .populate("employee", "name employeeId")
      .populate("assignedTo", "name");

    res.status(201).json(populatedRequest);
  } catch (error) {
    console.error("❌ Maintenance creation error:", error);
    res.status(500).json({
      message: error.message || "Failed to create maintenance request",
    });
  }
});

app.put("/api/maintenance/:id", auth, adminOnly, async (req, res) => {
  try {
    console.log("📝 Updating maintenance request:", req.params.id);

    const { status, resolution, assignedTo } = req.body;
    const update = {
      status: status,
      resolution: resolution,
      assignedTo: assignedTo || req.user._id,
    };

    const request = await Maintenance.findById(req.params.id)
      .populate("asset", "assetName assetCode")
      .populate("employee", "name employeeId");

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (status === "Resolved" || status === "Closed") {
      update.resolvedDate = new Date();
      await Asset.findByIdAndUpdate(request.asset, { status: "Available" });

      await Notification.create({
        userId: request.employee._id,
        type: "maintenance_resolved",
        title: "Maintenance Request Resolved",
        message: `Your maintenance request for "${request.asset.assetName}" has been resolved.`,
        relatedId: request._id,
        data: {
          assetName: request.asset.assetName,
          resolution: resolution || "Issue resolved",
          status: status,
          requestId: request._id,
        },
      });
      console.log("✅ Notification sent to employee");
    } else if (status === "In Progress") {
      await Notification.create({
        userId: request.employee._id,
        type: "maintenance_approved",
        title: "Maintenance Request In Progress",
        message: `Your maintenance request for "${request.asset.assetName}" is now in progress.`,
        relatedId: request._id,
        data: {
          assetName: request.asset.assetName,
          status: status,
          requestId: request._id,
        },
      });
      console.log("✅ Notification sent to employee");
    }

    const updatedRequest = await Maintenance.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true }
    )
      .populate("asset", "assetName assetCode status")
      .populate("employee", "name employeeId")
      .populate("assignedTo", "name");

    res.json(updatedRequest);
  } catch (error) {
    console.error("❌ Update maintenance error:", error);
    res.status(500).json({ message: error.message });
  }
});

app.delete("/api/maintenance/:id", auth, adminOnly, async (req, res) => {
  try {
    const request = await Maintenance.findByIdAndDelete(req.params.id);
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }
    res.json({ message: "Maintenance request deleted" });
  } catch (error) {
    console.error("Delete maintenance error:", error);
    res.status(500).json({ message: error.message });
  }
});

// ===== NOTIFICATION ROUTES =====

app.get("/api/notifications", auth, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({
      userId: req.user._id,
      isRead: false,
    });

    res.json({ notifications, unreadCount });
  } catch (error) {
    console.error("Get notifications error:", error);
    res.status(500).json({ message: error.message });
  }
});

app.put("/api/notifications/:id/read", auth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.json(notification);
  } catch (error) {
    console.error("Mark notification read error:", error);
    res.status(500).json({ message: error.message });
  }
});

app.put("/api/notifications/read-all", auth, async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id, isRead: false },
      { isRead: true }
    );

    res.json({ message: "All notifications marked as read" });
  } catch (error) {
    console.error("Mark all notifications read error:", error);
    res.status(500).json({ message: error.message });
  }
});

app.delete("/api/notifications/:id", auth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.json({ message: "Notification deleted" });
  } catch (error) {
    console.error("Delete notification error:", error);
    res.status(500).json({ message: error.message });
  }
});

// ===== REPORT ROUTES =====

app.get("/api/reports/asset-inventory", auth, async (req, res) => {
  try {
    let query = {};
    if (req.user.role === "employee") {
      query.assignedTo = req.user._id;
    }

    const assets = await Asset.find(query)
      .populate("assignedTo", "name employeeId department")
      .sort({ createdAt: -1 });

    if (!assets || assets.length === 0) {
      return res.json({
        success: true,
        data: [],
        message: req.user.role === "employee"
          ? "No assets allocated to you"
          : "No assets found",
        count: 0,
      });
    }

    const allocations = await Allocation.find({ status: "Active" })
      .populate("employee", "name employeeId")
      .populate("asset", "_id");

    const assetEmployeeMap = {};
    allocations.forEach(alloc => {
      if (alloc.asset && alloc.employee) {
        assetEmployeeMap[alloc.asset._id.toString()] = alloc.employee.name;
      }
    });

    const reportData = assets.map((asset) => {
      let assignedTo = asset.assignedTo ? asset.assignedTo.name : "Not Assigned";
      if (assignedTo === "Not Assigned" && asset._id) {
        const allocEmployee = assetEmployeeMap[asset._id.toString()];
        if (allocEmployee) {
          assignedTo = allocEmployee;
        }
      }

      return {
        assetCode: asset.assetCode,
        assetName: asset.assetName,
        category: asset.category,
        brand: asset.brand || "N/A",
        model: asset.model || "N/A",
        serialNumber: asset.serialNumber || "N/A",
        status: asset.status,
        condition: asset.condition,
        cost: asset.cost || 0,
        location: asset.location || "N/A",
        assignedTo: assignedTo,
        purchaseDate: asset.purchaseDate
          ? new Date(asset.purchaseDate).toLocaleDateString()
          : "N/A",
        warrantyExpiry: asset.warrantyExpiryDate
          ? new Date(asset.warrantyExpiryDate).toLocaleDateString()
          : "N/A",
      };
    });

    res.json({
      success: true,
      data: reportData,
      count: reportData.length,
      reportName: "Asset Inventory Report",
      generatedDate: new Date().toISOString(),
      userRole: req.user.role,
      userName: req.user.name,
    });
  } catch (error) {
    console.error("Asset inventory report error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
      data: [],
    });
  }
});

app.get("/api/reports/employee-assets", auth, async (req, res) => {
  try {
    if (req.user.role === "employee") {
      const employee = await User.findById(req.user._id).select("-password");
      if (!employee) {
        return res.json({
          success: true,
          data: [],
          message: "Employee not found",
          count: 0,
        });
      }

      const allocations = await Allocation.find({
        employee: employee._id,
        status: "Active",
      }).populate("asset", "assetName assetCode category status");

      const assets = allocations.map((alloc) => ({
        assetName: alloc.asset ? alloc.asset.assetName : "N/A",
        assetCode: alloc.asset ? alloc.asset.assetCode : "N/A",
        category: alloc.asset ? alloc.asset.category : "N/A",
        status: alloc.asset ? alloc.asset.status : "N/A",
        allocationDate: alloc.allocationDate
          ? new Date(alloc.allocationDate).toLocaleDateString()
          : "N/A",
      }));

      const reportData = [{
        employeeId: employee.employeeId,
        employeeName: employee.name,
        department: employee.department || "N/A",
        designation: employee.designation || "N/A",
        email: employee.email,
        totalAssets: assets.length,
        assets: assets.length > 0 ? assets : [{
          assetName: "No assets allocated",
          assetCode: "N/A",
          category: "N/A",
          status: "N/A",
          allocationDate: "N/A",
        }],
      }];

      return res.json({
        success: true,
        data: reportData,
        count: reportData.length,
        reportName: "Employee Asset Report",
        generatedDate: new Date().toISOString(),
        userRole: req.user.role,
        userName: req.user.name,
      });
    }

    const employees = await User.find({ role: "employee" })
      .select("-password")
      .sort({ name: 1 });

    if (!employees || employees.length === 0) {
      return res.json({
        success: true,
        data: [],
        message: "No employees found",
        count: 0,
      });
    }

    const reportData = [];

    for (const employee of employees) {
      const allocations = await Allocation.find({
        employee: employee._id,
        status: "Active",
      }).populate("asset", "assetName assetCode category status");

      const assets = allocations.map((alloc) => ({
        assetName: alloc.asset ? alloc.asset.assetName : "N/A",
        assetCode: alloc.asset ? alloc.asset.assetCode : "N/A",
        category: alloc.asset ? alloc.asset.category : "N/A",
        status: alloc.asset ? alloc.asset.status : "N/A",
        allocationDate: alloc.allocationDate
          ? new Date(alloc.allocationDate).toLocaleDateString()
          : "N/A",
      }));

      reportData.push({
        employeeId: employee.employeeId,
        employeeName: employee.name,
        department: employee.department || "N/A",
        designation: employee.designation || "N/A",
        email: employee.email,
        totalAssets: assets.length,
        assets: assets.length > 0 ? assets : [{
          assetName: "No assets allocated",
          assetCode: "N/A",
          category: "N/A",
          status: "N/A",
          allocationDate: "N/A",
        }],
      });
    }

    res.json({
      success: true,
      data: reportData,
      count: reportData.length,
      reportName: "Employee Asset Report",
      generatedDate: new Date().toISOString(),
      userRole: req.user.role,
      userName: req.user.name,
    });
  } catch (error) {
    console.error("Employee asset report error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
      data: [],
    });
  }
});

// ===== FIXED: ALLOCATION HISTORY REPORT =====
app.get("/api/reports/allocation-history", auth, async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;
    const query = {};

    if (req.user.role === "employee") {
      query.employee = req.user._id;
    }

    if (fromDate) {
      query.allocationDate = { $gte: new Date(fromDate) };
    }
    if (toDate) {
      query.allocationDate = {
        ...query.allocationDate,
        $lte: new Date(toDate),
      };
    }

    const allocations = await Allocation.find(query)
      .populate("asset", "assetName assetCode category brand model serialNumber status condition cost location purchaseDate warrantyExpiryDate")
      .populate("employee", "name employeeId department designation")
      .populate("allocatedBy", "name")
      .sort({ allocationDate: -1 });

    if (!allocations || allocations.length === 0) {
      return res.json({
        success: true,
        data: [],
        message: req.user.role === "employee"
          ? "No allocation history for you"
          : "No allocation history found",
        count: 0,
      });
    }

    const reportData = allocations.map((alloc) => {
      // ===== SAFE DATA EXTRACTION WITH NULL CHECKS =====
      const asset = alloc.asset || {};
      const employee = alloc.employee || {};
      const allocatedBy = alloc.allocatedBy || {};

      return {
        assetName: asset.assetName || "N/A",
        assetCode: asset.assetCode || "N/A",
        category: asset.category || "N/A",
        brand: asset.brand || "N/A",
        model: asset.model || "N/A",
        serialNumber: asset.serialNumber || "N/A",
        assetStatus: asset.status || "N/A",
        assetCondition: asset.condition || "N/A",
        cost: asset.cost || 0,
        location: asset.location || "N/A",
        purchaseDate: asset.purchaseDate
          ? new Date(asset.purchaseDate).toLocaleDateString()
          : "N/A",
        warrantyExpiryDate: asset.warrantyExpiryDate
          ? new Date(asset.warrantyExpiryDate).toLocaleDateString()
          : "N/A",
        employeeName: employee.name || "N/A",
        employeeId: employee.employeeId || "N/A",
        department: employee.department || "N/A",
        designation: employee.designation || "N/A",
        allocatedBy: allocatedBy.name || "System",
        allocationDate: alloc.allocationDate
          ? new Date(alloc.allocationDate).toLocaleDateString()
          : "N/A",
        returnDate: alloc.returnDate
          ? new Date(alloc.returnDate).toLocaleDateString()
          : "Not Returned",
        status: alloc.status || "N/A",
        condition: alloc.condition || "N/A",
        remarks: alloc.remarks || "N/A",
      };
    });

    res.json({
      success: true,
      data: reportData,
      count: reportData.length,
      reportName: "Allocation History",
      generatedDate: new Date().toISOString(),
      userRole: req.user.role,
      userName: req.user.name,
    });
  } catch (error) {
    console.error("Allocation history report error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
      data: [],
    });
  }
});

app.get("/api/reports/maintenance-history", auth, async (req, res) => {
  try {
    const { fromDate, toDate, status } = req.query;
    const query = {};

    if (req.user.role === "employee") {
      query.employee = req.user._id;
    }

    if (status) query.status = status;
    if (fromDate) {
      query.createdAt = { $gte: new Date(fromDate) };
    }
    if (toDate) {
      query.createdAt = { ...query.createdAt, $lte: new Date(toDate) };
    }

    const maintenanceRequests = await Maintenance.find(query)
      .populate("asset", "assetName assetCode category")
      .populate("employee", "name employeeId department")
      .populate("assignedTo", "name")
      .sort({ createdAt: -1 });

    if (!maintenanceRequests || maintenanceRequests.length === 0) {
      return res.json({
        success: true,
        data: [],
        message: req.user.role === "employee"
          ? "No maintenance requests from you"
          : "No maintenance history found",
        count: 0,
      });
    }

    const reportData = maintenanceRequests.map((req) => ({
      assetName: req.asset ? req.asset.assetName : "N/A",
      assetCode: req.asset ? req.asset.assetCode : "N/A",
      category: req.asset ? req.asset.category : "N/A",
      employeeName: req.employee ? req.employee.name : "N/A",
      employeeId: req.employee ? req.employee.employeeId : "N/A",
      department: req.employee ? (req.employee.department || "N/A") : "N/A",
      issue: req.issue || "N/A",
      description: req.description || "N/A",
      priority: req.priority || "N/A",
      status: req.status || "N/A",
      assignedTo: req.assignedTo ? req.assignedTo.name : "N/A",
      resolution: req.resolution || "N/A",
      createdDate: req.createdAt
        ? new Date(req.createdAt).toLocaleDateString()
        : "N/A",
      resolvedDate: req.resolvedDate
        ? new Date(req.resolvedDate).toLocaleDateString()
        : "N/A",
    }));

    res.json({
      success: true,
      data: reportData,
      count: reportData.length,
      reportName: "Maintenance History",
      generatedDate: new Date().toISOString(),
      userRole: req.user.role,
      userName: req.user.name,
    });
  } catch (error) {
    console.error("Maintenance history report error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
      data: [],
    });
  }
});

// ===== START SERVER =====

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`📡 API URL: http://localhost:${PORT}/api`);
  console.log(`🌐 Open your browser: http://localhost:${PORT}`);
  console.log("=".repeat(50));
  console.log("✅ Connected to MongoDB");
  console.log("ℹ️  No seed data - Database is ready for use");
  console.log("   Use the application to add data\n");
});
