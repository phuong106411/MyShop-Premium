import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initialProducts } from "../../myshop-premium/src/data.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, "../data/db.json");

// ========================================
// MIDDLEWARE
// ========================================

app.use(cors({ origin: true }));
app.use(express.json({ limit: "1mb" }));

// ========================================
// MONGODB MODELS
// ========================================

const productSchema = new mongoose.Schema(
  {
    id: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      unique: true
    },
    name: String,
    category: String,
    price: Number,
    oldPrice: Number,
    rating: Number,
    sold: Number,
    badge: String,
    description: String,
    image: String
  },
  {
    collection: "products",
    strict: false
  }
);

const userSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true
    },
    name: String,
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    role: {
      type: String,
      default: "user"
    },
    passwordHash: {
      type: String,
      required: true,
      select: false
    },
    createdAt: String
  },
  {
    collection: "users"
  }
);

const orderItemSchema = new mongoose.Schema(
  {
    productId: mongoose.Schema.Types.Mixed,
    name: String,
    productName: String,
    category: String,
    image: String,
    price: Number,
    quantity: Number,
    size: String,
    subtotal: Number
  },
  {
    _id: false
  }
);

const orderSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true
    },
    userId: String,
    customer: String,
    phone: String,
    address: String,
    note: String,
    paymentMethod: String,
    paymentReference: String,
    paymentStatus: String,
    status: String,
    total: Number,
    date: String,
    createdAt: String,
    updatedAt: String,
    paidAt: String,
    itemCount: Number,
    items: [orderItemSchema],
    lines: [orderItemSchema]
  },
  {
    collection: "orders",
    strict: false
  }
);

const Product = mongoose.model("Product", productSchema);
const User = mongoose.model("User", userSchema);
const Order = mongoose.model("Order", orderSchema);

// ========================================
// COMMON FUNCTIONS
// ========================================

function cleanDocument(document) {
  if (!document) return null;

  const result = document.toObject
    ? document.toObject()
    : { ...document };

  delete result._id;
  delete result.__v;

  return result;
}

function publicUser(user) {
  const safe = cleanDocument(user);

  if (!safe) return null;

  delete safe.passwordHash;

  return safe;
}

function normalizeOrder(order) {
  const orderItems = Array.isArray(order.items) && order.items.length
    ? order.items
    : Array.isArray(order.lines)
      ? order.lines
      : [];

  const normalizedItems = orderItems.map(item => {
    const price = Number(item.price || 0);
    const quantity = Number(item.quantity || 0);

    return {
      productId: item.productId ?? item.id ?? "",
      name: item.name || item.productName || "Sản phẩm",
      productName: item.productName || item.name || "Sản phẩm",
      category: item.category || "",
      image: item.image || "",
      price,
      quantity,
      size: item.size || "",
      subtotal: Number(item.subtotal ?? price * quantity)
    };
  });

  return {
    ...order,
    items: normalizedItems,
    itemCount: Number(
      order.itemCount ??
      normalizedItems.reduce(
        (sum, item) => sum + item.quantity,
        0
      )
    )
  };
}

// Tìm sản phẩm theo ID dạng số hoặc chuỗi
async function findProductById(id) {
  const conditions = [{ id: String(id) }];

  const numericId = Number(id);

  if (Number.isFinite(numericId)) {
    conditions.push({ id: numericId });
  }

  return Product.findOne({ $or: conditions });
}

// ========================================
// MIGRATE OLD JSON DATA
// ========================================

async function migrateJsonData() {
  if (!fs.existsSync(dbPath)) {
    console.log("Không tìm thấy db.json cũ. Bỏ qua chuyển dữ liệu.");
    return;
  }

  let oldDb;

  try {
    oldDb = JSON.parse(fs.readFileSync(dbPath, "utf8"));
  } catch (error) {
    console.error("Không đọc được db.json:", error.message);
    return;
  }

  // Chuyển sản phẩm
  if (Array.isArray(oldDb.products)) {
    const productCount = await Product.countDocuments();

    if (productCount === 0) {
      for (const product of oldDb.products) {
        if (product.id === undefined || product.id === null) continue;

        await Product.updateOne(
          { id: product.id },
          { $setOnInsert: product },
          { upsert: true }
        );
      }

      console.log(`Đã chuyển ${oldDb.products.length} sản phẩm.`);
    }
  }

  // Chuyển tài khoản
  if (Array.isArray(oldDb.users)) {
    const userCount = await User.countDocuments();

    if (userCount === 0) {
      for (const user of oldDb.users) {
        if (!user.id || !user.email || !user.passwordHash) continue;

        const migratedUser = {
          ...user,
          id: String(user.id),
          email: String(user.email).toLowerCase()
        };

        await User.updateOne(
          { email: migratedUser.email },
          { $setOnInsert: migratedUser },
          { upsert: true }
        );
      }

      console.log(`Đã chuyển ${oldDb.users.length} tài khoản.`);
    }
  }

  // Chuyển đơn hàng
  if (Array.isArray(oldDb.orders)) {
    const orderCount = await Order.countDocuments();

    if (orderCount === 0) {
      for (const oldOrder of oldDb.orders) {
        if (!oldOrder.id) continue;

        const normalized = normalizeOrder(oldOrder);

        await Order.updateOne(
          { id: String(oldOrder.id) },
          {
            $setOnInsert: {
              ...oldOrder,
              id: String(oldOrder.id),
              items: normalized.items,
              lines: normalized.items
            }
          },
          { upsert: true }
        );
      }

      console.log(`Đã chuyển ${oldDb.orders.length} đơn hàng.`);
    }
  }
}

// ========================================
// SEED INITIAL PRODUCTS
// ========================================

async function seedProducts() {
  const count = await Product.countDocuments();

  if (count > 0) return;

  if (!Array.isArray(initialProducts) || initialProducts.length === 0) {
    console.log("Không có sản phẩm mẫu để khởi tạo.");
    return;
  }

  await Product.insertMany(initialProducts);

  console.log(`Đã khởi tạo ${initialProducts.length} sản phẩm mẫu.`);
}

// ========================================
// DEFAULT ADMIN
// ========================================

async function seedAdmin() {
  const email = String(
    process.env.ADMIN_EMAIL || "admin@myshop.com"
  ).trim().toLowerCase();

  const password = process.env.ADMIN_PASSWORD;

  const existingAdmin = await User.findOne({
    email
  });

  if (existingAdmin) {
    console.log("Tài khoản Admin đã tồn tại.");
    return;
  }

  if (!password || password.length < 8) {
    console.warn(
      "Chưa tạo Admin: hãy cấu hình ADMIN_PASSWORD tối thiểu 8 ký tự trong .env."
    );
    return;
  }

  const adminUser = await User.create({
    id: "admin-1",
    name: "MyShop Admin",
    email,
    role: "admin",
    passwordHash: await bcrypt.hash(password, 10),
    createdAt: new Date().toISOString()
  });

  console.log(`Đã tạo tài khoản Admin: ${adminUser.email}`);
}

// ========================================
// AUTHENTICATION
// ========================================

function auth(req, res, next) {
  const token = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({
      message: "Vui lòng đăng nhập."
    });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({
      message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn."
    });
  }
}

function admin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({
      message: "Chỉ quản trị viên được phép thực hiện thao tác này."
    });
  }

  next();
}

function tokenFor(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name
    },
    JWT_SECRET,
    {
      expiresIn: "7d"
    }
  );
}

// Bắt lỗi cho các route async
function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

// ========================================
// HEALTH CHECK
// ========================================

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "MyShop API",
    database: mongoose.connection.readyState === 1
      ? "MongoDB connected"
      : "MongoDB disconnected"
  });
});

// ========================================
// PRODUCTS
// ========================================

// Lấy tất cả sản phẩm
app.get(
  "/api/products",
  asyncHandler(async (_req, res) => {
    const products = await Product.find().lean();

    res.json(
      products.map(cleanDocument)
    );
  })
);

// Lấy sản phẩm theo ID
app.get(
  "/api/products/:id",
  asyncHandler(async (req, res) => {
    const product = await findProductById(req.params.id);

    if (!product) {
      return res.status(404).json({
        message: "Không tìm thấy sản phẩm."
      });
    }

    res.json(cleanDocument(product));
  })
);

// Thêm sản phẩm
app.post(
  "/api/products",
  auth,
  admin,
  asyncHandler(async (req, res) => {
    const {
      name,
      category,
      price,
      oldPrice,
      badge,
      description,
      image
    } = req.body;

    if (
      !name ||
      !category ||
      !Number.isFinite(Number(price)) ||
      Number(price) < 0
    ) {
      return res.status(400).json({
        message: "Tên, danh mục và giá sản phẩm là bắt buộc."
      });
    }

    const product = await Product.create({
      id: Date.now(),
      name: String(name).trim(),
      category,
      price: Number(price),
      oldPrice: Number(oldPrice || price),
      rating: 5,
      sold: 0,
      badge: badge || "NEW",
      description: description || "",
      image: image || ""
    });

    res.status(201).json(cleanDocument(product));
  })
);

// Xóa sản phẩm
app.delete(
  "/api/products/:id",
  auth,
  admin,
  asyncHandler(async (req, res) => {
    const product = await findProductById(req.params.id);

    if (!product) {
      return res.status(404).json({
        message: "Không tìm thấy sản phẩm."
      });
    }

    await Product.deleteOne({ _id: product._id });

    res.json({
      ok: true
    });
  })
);

// ========================================
// REGISTER
// ========================================

app.post(
  "/api/auth/register",
  asyncHandler(async (req, res) => {
    const name = String(req.body.name || "").trim();

    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();

    const password = String(req.body.password || "");

    if (!name || !email || password.length < 6) {
      return res.status(400).json({
        message: "Vui lòng nhập tên, email và mật khẩu tối thiểu 6 ký tự."
      });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({
        message: "Email đã được sử dụng."
      });
    }

    const user = await User.create({
      id: `user-${Date.now()}`,
      name,
      email,
      role: "user",
      passwordHash: await bcrypt.hash(password, 10),
      createdAt: new Date().toISOString()
    });

    res.status(201).json({
      user: publicUser(user),
      token: tokenFor(user)
    });
  })
);

// ========================================
// LOGIN
// ========================================

app.post(
  "/api/auth/login",
  asyncHandler(async (req, res) => {
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();

    const password = String(req.body.password || "");

    const user = await User.findOne({ email })
      .select("+passwordHash");

    if (
      !user ||
      !(await bcrypt.compare(password, user.passwordHash))
    ) {
      return res.status(401).json({
        message: "Email hoặc mật khẩu không đúng."
      });
    }

    res.json({
      user: publicUser(user),
      token: tokenFor(user)
    });
  })
);

// ========================================
// CUSTOMERS
// ========================================

app.get(
  "/api/users",
  auth,
  admin,
  asyncHandler(async (_req, res) => {
    const users = await User.find().sort({ createdAt: -1 });

    res.json(users.map(publicUser));
  })
);

// ========================================
// GET ORDERS
// ========================================

app.get(
  "/api/orders",
  auth,
  asyncHandler(async (req, res) => {
    const filter = req.user.role === "admin"
      ? {}
      : { userId: String(req.user.id) };

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    res.json(
      orders.map(order => normalizeOrder(cleanDocument(order)))
    );
  })
);

// ========================================
// CREATE ORDER
// ========================================

app.post(
  "/api/orders",
  auth,
  asyncHandler(async (req, res) => {
    const {
      customer,
      phone,
      address,
      note,
      items,
      paymentReference
    } = req.body;

    const paymentMethod = req.body.paymentMethod || "cod";

    if (
      !customer ||
      !address ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res.status(400).json({
        message: "Thông tin giao hàng hoặc giỏ hàng chưa đầy đủ."
      });
    }

    if (!["bank_transfer", "cod"].includes(paymentMethod)) {
      return res.status(400).json({
        message: "Phương thức thanh toán không hợp lệ."
      });
    }

    let total = 0;
    let itemCount = 0;

    const orderLines = [];

    for (const line of items) {
      const product = await findProductById(line.productId);
      const quantity = Number(line.quantity);

      if (
        !product ||
        !Number.isInteger(quantity) ||
        quantity < 1 ||
        quantity > 99
      ) {
        return res.status(400).json({
          message: "Sản phẩm hoặc số lượng không hợp lệ."
        });
      }

      const price = Number(product.price);

      if (!Number.isFinite(price) || price < 0) {
        return res.status(400).json({
          message: "Giá sản phẩm không hợp lệ."
        });
      }

      const lineTotal = price * quantity;

      total += lineTotal;
      itemCount += quantity;

      orderLines.push({
        productId: product.id,
        name: product.name,
        productName: product.name,
        category: product.category || "",
        image: product.image || "",
        price,
        quantity,
        size: String(line.size || ""),
        subtotal: lineTotal
      });
    }

    const order = await Order.create({
      id: `MS-${Date.now()}`,
      userId: String(req.user.id),

      customer: String(customer).trim(),
      phone: String(phone || "").trim(),
      address: String(address).trim(),
      note: String(note || "").trim(),

      paymentMethod,

      paymentReference:
        paymentMethod === "bank_transfer"
          ? String(paymentReference || "")
          : "",

      paymentStatus:
        paymentMethod === "bank_transfer"
          ? "Chờ thanh toán"
          : "Thanh toán khi nhận hàng",

      status:
        paymentMethod === "bank_transfer"
          ? "Chờ xác nhận thanh toán"
          : "Đang xử lý",

      total,

      date: new Date().toLocaleDateString("vi-VN"),
      createdAt: new Date().toISOString(),

      itemCount,

      items: orderLines,
      lines: orderLines
    });

    res.status(201).json(
      normalizeOrder(cleanDocument(order))
    );
  })
);

// ========================================
// CONFIRM PAYMENT
// ========================================

app.patch(
  "/api/orders/:id/payment",
  auth,
  admin,
  asyncHandler(async (req, res) => {
    const order = await Order.findOne({
      id: req.params.id
    });

    if (!order) {
      return res.status(404).json({
        message: "Không tìm thấy đơn hàng."
      });
    }

    if (order.paymentMethod !== "bank_transfer") {
      return res.status(400).json({
        message: "Đơn hàng này không sử dụng chuyển khoản."
      });
    }

    if (order.paymentStatus === "Đã thanh toán") {
      return res.status(400).json({
        message: "Đơn hàng đã được xác nhận thanh toán."
      });
    }

    if (order.status === "Đã hủy") {
      return res.status(400).json({
        message: "Không thể xác nhận đơn hàng đã hủy."
      });
    }

    order.paymentStatus = "Đã thanh toán";

    if (order.status === "Chờ xác nhận thanh toán") {
      order.status = "Đang xử lý";
    }

    order.paidAt = new Date().toISOString();

    await order.save();

    res.json({
      message: "Đã xác nhận thanh toán thành công.",
      order: normalizeOrder(cleanDocument(order))
    });
  })
);

// ========================================
// UPDATE ORDER STATUS
// ========================================

app.patch(
  "/api/orders/:id/status",
  auth,
  admin,
  asyncHandler(async (req, res) => {
    const allowed = [
      "Đang xử lý",
      "Đang giao",
      "Hoàn tất",
      "Đã hủy"
    ];

    const { status } = req.body;

    if (!allowed.includes(status)) {
      return res.status(400).json({
        message: "Trạng thái đơn hàng không hợp lệ."
      });
    }

    const order = await Order.findOne({
      id: req.params.id
    });

    if (!order) {
      return res.status(404).json({
        message: "Không tìm thấy đơn hàng."
      });
    }

    if (
      order.paymentMethod === "bank_transfer" &&
      order.paymentStatus !== "Đã thanh toán" &&
      status !== "Đã hủy"
    ) {
      return res.status(400).json({
        message: "Cần xác nhận thanh toán trước khi xử lý đơn chuyển khoản."
      });
    }

    order.status = status;
    order.updatedAt = new Date().toISOString();

    await order.save();

    res.json({
      message: "Cập nhật trạng thái đơn hàng thành công.",
      order: normalizeOrder(cleanDocument(order))
    });
  })
);

// ========================================
// ERROR HANDLER
// ========================================

app.use((err, _req, res, _next) => {
  console.error("SERVER ERROR:", err);

  if (err.code === 11000) {
    return res.status(409).json({
      message: "Dữ liệu đã tồn tại."
    });
  }

  res.status(500).json({
    message: "Lỗi máy chủ."
  });
});

// ========================================
// START SERVER
// ========================================

async function startServer() {
  try {
    if (!MONGODB_URI) {
      throw new Error("Thiếu MONGODB_URI trong file .env");
    }

    if (!JWT_SECRET) {
      throw new Error("Thiếu JWT_SECRET trong file .env");
    }

    await mongoose.connect(MONGODB_URI);

    console.log("Đã kết nối MongoDB Atlas thành công.");

    // Chuyển dữ liệu cũ trước khi khởi tạo dữ liệu mẫu
    await migrateJsonData();

    // Nếu database chưa có sản phẩm thì thêm dữ liệu mẫu
    await seedProducts();

    // Tạo Admin nếu chưa tồn tại
    await seedAdmin();

    app.listen(PORT, () => {
      console.log(
        `MyShop API đang chạy tại http://localhost:${PORT}`
      );
    });
  } catch (error) {
    console.error("KHÔNG THỂ KHỞI ĐỘNG SERVER:", error);
    process.exit(1);
  }
}

startServer();