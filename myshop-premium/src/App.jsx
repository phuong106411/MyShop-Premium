import { useEffect, useMemo, useState } from "react";
import {
  NavLink,
  Link,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { initialAccounts, initialOrders, initialProducts } from "./data";

const money = (value) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

// THAY các giá trị bên dưới bằng thông tin tài khoản ngân hàng THẬT của cửa hàng.
const BANK_INFO = {
  bankId: "VCB",
  accountNumber: "233456789",
  accountName: "MY SHOP",
};

function useStore() {
  const [products, setProducts] = useState([]);
  const [apiError, setApiError] = useState("");
  const [accounts, setAccounts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("ms_user") || "null");
    } catch {
      return null;
    }
  });
  const [cart, setCart] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("ms_cart") || "[]");
    } catch {
      return [];
    }
  });

  const request = async (path, options = {}) => {
    const token = localStorage.getItem("ms_token");
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || "Có lỗi xảy ra khi kết nối máy chủ.");
    }
    return data;
  };

 const refresh = async () => {
  try {
    const p = await request("/products");
    setProducts(Array.isArray(p) ? p : []);

    const token = localStorage.getItem("ms_token");

    if (!token) {
      setOrders([]);
      setAccounts([]);
      return;
    }

    try {
      const o = await request("/orders");
      setOrders(Array.isArray(o) ? o : []);
    } catch (e) {
      console.error("Lỗi tải đơn hàng:", e);
      setOrders([]);
    }

    try {
      const users = await request("/users");
      setAccounts(
        Array.isArray(users) ? users : users.users || []
      );
    } catch (e) {
      console.error("Lỗi tải danh sách khách hàng:", e);
    }

    setApiError("");
  } catch (e) {
    setApiError(
      `Không tải được dữ liệu: ${e.message}`
    );
    throw e;
  }
};

  useEffect(() => {
    refresh().catch((e) =>
      console.error("Không tải được dữ liệu backend:", e)
    );
  }, []);

  const login = async (email, password) => {
    try {
      const result = await request("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      localStorage.setItem("ms_token", result.token);
      localStorage.setItem("ms_user", JSON.stringify(result.user));
      setUser(result.user);
      await refresh();
      return result.user;
    } catch {
      return false;
    }
  };

  const register = async (payload) => {
    try {
      const result = await request("/auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      localStorage.setItem("ms_token", result.token);
      localStorage.setItem("ms_user", JSON.stringify(result.user));
      setUser(result.user);
      await refresh();
      return { ok: true };
    } catch (e) {
      return { ok: false, message: e.message };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("ms_user");
    localStorage.removeItem("ms_token");
  };

  const addToCart = (product, size = "") => {
    const cartKey = `${product.id}-${size || "default"}`;
    const existing = cart.find(
      (item) => (item.cartKey || `${item.id}-default`) === cartKey
    );
    const next = existing
      ? cart.map((item) =>
          (item.cartKey || `${item.id}-default`) === cartKey
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      : [...cart, { ...product, size, cartKey, quantity: 1 }];

    setCart(next);
    localStorage.setItem("ms_cart", JSON.stringify(next));
  };

  const updateCart = (cartKey, quantity) => {
    const next =
      quantity <= 0
        ? cart.filter(
            (item) => (item.cartKey || `${item.id}-default`) !== cartKey
          )
        : cart.map((item) =>
            (item.cartKey || `${item.id}-default`) === cartKey
              ? { ...item, quantity }
              : item
          );

    setCart(next);
    localStorage.setItem("ms_cart", JSON.stringify(next));
  };

  const clearCart = () => {
    setCart([]);
    localStorage.removeItem("ms_cart");
  };

  const placeOrder = async (shipping) => {
    const result = await request("/orders", {
      method: "POST",
      body: JSON.stringify({
        customer: shipping.name,
        phone: shipping.phone,
        address: shipping.address,
        note: shipping.note,
        paymentMethod: shipping.paymentMethod,
        paymentReference:
          shipping.paymentMethod === "bank_transfer"
            ? shipping.paymentReference
            : "",
        items: cart.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
          size: item.size || "",
        })),
      }),
    });

    setOrders((current) => [result, ...current]);
    clearCart();
    return result;
  };

  const addProduct = async (product) => {
    const created = await request("/products", {
      method: "POST",
      body: JSON.stringify(product),
    });
    setProducts((current) => [created, ...current]);
  };

  const deleteProduct = async (id) => {
    await request(`/products/${id}`, { method: "DELETE" });
    setProducts((current) =>
      current.filter((p) => String(p.id) !== String(id))
    );
  };

  return {
    products,
    accounts,
    orders,
    user,
    cart,
    apiError,
    refresh,
    login,
    register,
    logout,
    addToCart,
    updateCart,
    clearCart,
    placeOrder,
    addProduct,
    deleteProduct,
  };
}

function Protected({ user, role, children }) {
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return children;
}

function Logo({ dark = false }) {
  return (
    <Link className={`logo ${dark ? "logo-dark" : ""}`} to="/">
      My<span>Shop</span>
    </Link>
  );
}

function UserLayout({ user, logout, cartCount, apiError }) {
  return (
    <div className="site-shell">
      <header className="site-header">
        <Logo />
        <nav className="site-nav">
          <NavLink end to="/">Trang chủ</NavLink>
          <NavLink to="/products">Sản phẩm</NavLink>
          <NavLink to="/sale">Đang sale</NavLink>
          <NavLink to="/about">Giới thiệu</NavLink>
        </nav>
        <div className="header-actions">
          <Link className="cart-pill" to="/cart">
            <span>Giỏ hàng</span>
            <b>{cartCount}</b>
          </Link>
          {user ? (
            <>
              <span className="hello">
                Xin chào, <strong>{user.name}</strong>
              </span>
              {user.role === "admin" ? (
                <Link className="outline-btn" to="/admin">Quản trị</Link>
              ) : (
                <Link className="outline-btn" to="/account">Tài khoản</Link>
              )}
              <button className="text-btn" onClick={logout}>
                Đăng xuất
              </button>
            </>
          ) : (
            <>
              <Link className="outline-btn" to="/login">Đăng nhập</Link>
              <Link className="dark-btn small" to="/register">Đăng ký</Link>
            </>
          )}
        </div>
      </header>

      {apiError && <div className="api-error" role="alert">{apiError}</div>}

      <Outlet />

      <footer className="site-footer">
        <div>
          <Logo />
          <p>Minimal essentials cho phong cách sống hiện đại.</p>
        </div>
        <div>
          <h4>Khám phá</h4>
          <Link to="/products">Sản phẩm</Link>
          <Link to="/sale">Ưu đãi</Link>
          <Link to="/about">Về MyShop</Link>
        </div>
        <div>
          <h4>Hỗ trợ</h4>
          <span>support@myshop.com</span>
          <span>0123 456 789</span>
        </div>
        <div>
          <h4>Thanh toán</h4>
          <span>COD · Banking · Momo</span>
          <span>Đổi trả trong 7 ngày</span>
        </div>
      </footer>
    </div>
  );
}

function ProductCard({ product, addToCart }) {
  return (
    <article className="product-card">
      <Link to={`/products/${product.id}`} className="product-image">
        <img src={product.image} alt={product.name} />
        <span className="product-badge">{product.badge}</span>
        <button
          type="button"
          className="quick-add"
          onClick={(e) => {
            e.preventDefault();
            addToCart(product);
          }}
        >
          +
        </button>
      </Link>
      <div className="product-info">
        <div className="product-meta">
          <span>{product.category}</span>
          <span>★ {product.rating}</span>
        </div>
        <Link to={`/products/${product.id}`} className="product-name">
          {product.name}
        </Link>
        <div className="price-row">
          <strong>{money(product.price)}</strong>
          <del>{money(product.oldPrice)}</del>
        </div>
        <button className="add-btn" onClick={() => addToCart(product)}>
          Thêm vào giỏ
        </button>
      </div>
    </article>
  );
}

function Home({ products, addToCart }) {
  const featured = products.slice(0, 4);

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">NEW COLLECTION · 2026</span>
          <h1>Simple things.<br /><em>Better made.</em></h1>
          <p>
            Những món đồ tối giản được tuyển chọn cho nhịp sống hiện đại —
            tinh tế, dễ phối và dùng lâu.
          </p>
          <div className="hero-actions">
            <Link className="dark-btn" to="/products">
              Khám phá sản phẩm <span>↗</span>
            </Link>
            <Link className="link-btn" to="/sale">Xem ưu đãi</Link>
          </div>
        </div>
        <div className="hero-visual">
          <img
            src="https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=90"
            alt="New collection"
          />
          <div className="hero-float">
            <span>CURATED</span>
            <strong>08 essentials</strong>
          </div>
        </div>
      </section>

      <section className="trust-strip">
        <div><strong>01</strong><span>Chất lượng tuyển chọn</span></div>
        <div><strong>02</strong><span>Giao hàng toàn quốc</span></div>
        <div><strong>03</strong><span>Đổi trả 7 ngày</span></div>
        <div><strong>04</strong><span>Hỗ trợ tận tâm</span></div>
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <span className="eyebrow">CURATED FOR YOU</span>
            <h2>Sản phẩm nổi bật</h2>
          </div>
          <Link className="link-btn" to="/products">Xem tất cả ↗</Link>
        </div>
        <div className="product-grid">
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} addToCart={addToCart} />
          ))}
        </div>
      </section>

      <section className="editorial">
        <div>
          <span className="eyebrow">THE MYSHOP EDIT</span>
          <h2>Ít hơn, nhưng<br /><em>tốt hơn.</em></h2>
          <p>
            Chúng tôi tin một tủ đồ đẹp không cần quá nhiều món. Chỉ cần
            đúng chất liệu, đúng phom dáng và đúng cá tính.
          </p>
          <Link className="dark-btn" to="/about">
            Câu chuyện MyShop ↗
          </Link>
        </div>
        <img
          src="https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?auto=format&fit=crop&w=1200&q=90"
          alt="MyShop edit"
        />
      </section>
    </>
  );
}

function ProductsPage({ products, addToCart, saleOnly = false }) {
  const [category, setCategory] = useState("Tất cả");
  const [query, setQuery] = useState("");
  const categories = ["Tất cả", ...new Set(products.map((p) => p.category))];

  const filtered = products.filter(
    (p) =>
      (category === "Tất cả" || p.category === category) &&
      (!query || p.name.toLowerCase().includes(query.toLowerCase())) &&
      (!saleOnly || p.oldPrice > p.price)
  );

  return (
    <section className="catalog section">
      <div className="catalog-head">
        <div>
          <span className="eyebrow">
            {saleOnly ? "SPECIAL OFFERS" : "ALL PRODUCTS"}
          </span>
          <h1>{saleOnly ? "Đang sale" : "Tất cả sản phẩm"}</h1>
          <p>{filtered.length} sản phẩm được tuyển chọn.</p>
        </div>
        <input
          className="search-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm sản phẩm..."
        />
      </div>

      <div className="filter-row">
        {categories.map((c) => (
          <button
            key={c}
            className={category === c ? "filter active" : "filter"}
            onClick={() => setCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="product-grid">
        {filtered.map((p) => (
          <ProductCard key={p.id} product={p} addToCart={addToCart} />
        ))}
      </div>
    </section>
  );
}

function ProductDetail({ products, addToCart }) {
  const { pathname } = useLocation();
  const [selectedSize, setSelectedSize] = useState("M");
  const id = Number(pathname.split("/").pop());
  const product = products.find((p) => p.id === id);

  if (!product) return <Navigate to="/products" replace />;

  return (
    <section className="detail section">
      <div className="detail-image">
        <img src={product.image} alt={product.name} />
      </div>
      <div className="detail-copy">
        <span className="eyebrow">{product.category} · {product.badge}</span>
        <h1>{product.name}</h1>
        <div className="detail-rating">
          ★★★★★ <span>{product.rating} · {product.sold} đã bán</span>
        </div>
        <div className="detail-price">
          {money(product.price)} <del>{money(product.oldPrice)}</del>
        </div>
        <p>{product.description}</p>
        <div className="size-row">
          <span>Kích thước</span>
          {["S", "M", "L", "XL"].map((size) => (
            <button
              type="button"
              key={size}
              aria-pressed={selectedSize === size}
              className={selectedSize === size ? "selected" : ""}
              onClick={() => setSelectedSize(size)}
            >
              {size}
            </button>
          ))}
        </div>
        <button
          className="dark-btn wide"
          onClick={() => addToCart(product, selectedSize)}
        >
          Thêm vào giỏ hàng · Size {selectedSize} <span>→</span>
        </button>
        <div className="detail-benefits">
          <span>✓ Miễn phí vận chuyển từ 500K</span>
          <span>✓ Đổi trả trong 7 ngày</span>
          <span>✓ Kiểm tra hàng khi nhận</span>
        </div>
      </div>
    </section>
  );
}
function CartPage({ cart, updateCart }) {
  const total = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  return (
    <section className="section cart-page">
      <div className="section-head">
        <div>
          <span className="eyebrow">YOUR BAG</span>
          <h1>Giỏ hàng</h1>
        </div>
        <span>{cart.length} sản phẩm</span>
      </div>

      {cart.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">○</div>
          <h2>Giỏ hàng đang trống</h2>
          <p>Thêm vài món bạn yêu thích để bắt đầu.</p>
          <Link className="dark-btn" to="/products">
            Khám phá sản phẩm
          </Link>
        </div>
      ) : (
        <div className="cart-layout">
          <div className="cart-items">
            {cart.map((item) => (
              <div className="cart-item" key={item.cartKey || item.id}>
                <img src={item.image} alt={item.name} />
                <div className="cart-item-copy">
                  <span>{item.category}</span>
                  <h3>{item.name}</h3>
                  {item.size && <span>Size: {item.size}</span>}
                  <strong>{money(item.price)}</strong>
                </div>
                <div className="qty">
                  <button
                    onClick={() =>
                      updateCart(
                        item.cartKey || `${item.id}-default`,
                        item.quantity - 1
                      )
                    }
                  >
                    −
                  </button>
                  <b>{item.quantity}</b>
                  <button
                    onClick={() =>
                      updateCart(
                        item.cartKey || `${item.id}-default`,
                        item.quantity + 1
                      )
                    }
                  >
                    +
                  </button>
                </div>
                <button
                  className="remove"
                  onClick={() =>
                    updateCart(item.cartKey || `${item.id}-default`, 0)
                  }
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <aside className="summary">
            <span className="eyebrow">ORDER SUMMARY</span>
            <div>
              <span>Tạm tính</span>
              <strong>{money(total)}</strong>
            </div>
            <div>
              <span>Vận chuyển</span>
              <strong>
                {total >= 500000 ? "Miễn phí" : money(30000)}
              </strong>
            </div>
            <hr />
            <div className="summary-total">
              <span>Tổng cộng</span>
              <strong>
                {money(total + (total >= 500000 ? 0 : 30000))}
              </strong>
            </div>
            <Link className="dark-btn wide" to="/checkout">
              Thanh toán →
            </Link>
          </aside>
        </div>
      )}
    </section>
  );
}

function Checkout({ cart, user, placeOrder }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: user?.name || "",
    phone: "",
    address: "",
    note: "",
    paymentMethod: "cod",
  });

  const total = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const shippingFee = total >= 500000 ? 0 : 30000;
  const grandTotal = total + shippingFee;

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Mã tham chiếu được tạo một lần cho đơn hàng đang checkout.
  const [paymentReference] = useState(
    () => `MS${Date.now().toString().slice(-8)}`
  );

  const qrParams = new URLSearchParams({
    amount: String(Math.round(grandTotal)),
    addInfo: paymentReference,
    accountName: BANK_INFO.accountName,
  });

  const qrImageUrl =
    `https://img.vietqr.io/image/${BANK_INFO.bankId}-${BANK_INFO.accountNumber}-compact2.png?${qrParams.toString()}`;

  const bankInfoConfigured = true;

if (!cart.length) return <Navigate to="/cart" replace />;
  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await placeOrder({
        ...form,
        paymentReference:
          form.paymentMethod === "bank_transfer"
            ? paymentReference
            : "",
      });
      navigate("/order-success");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="section checkout">
      <div className="checkout-copy">
        <span className="eyebrow">CHECKOUT</span>
        <h1>Hoàn tất đơn hàng</h1>
        <p>Thông tin của bạn chỉ được dùng để xử lý đơn hàng.</p>
      </div>

      <div className="checkout-layout">
        <form className="form-card" onSubmit={submit}>
          <h2>Thông tin giao hàng</h2>
          {error && <p className="form-error">{error}</p>}

          {[
            ["name", "Họ và tên", "Nguyễn Văn A"],
            ["phone", "Số điện thoại", "0123 456 789"],
            [
              "address",
              "Địa chỉ nhận hàng",
              "Số nhà, đường, phường/xã...",
            ],
            [
              "note",
              "Ghi chú",
              "Ghi chú cho người giao hàng (không bắt buộc)",
            ],
          ].map(([key, label, placeholder]) => (
            <label key={key}>
              {label}
              <input
                required={key !== "note"}
                value={form[key]}
                placeholder={placeholder}
                onChange={(e) =>
                  setForm({ ...form, [key]: e.target.value })
                }
              />
            </label>
          ))}

          <div className="payment-section">
            <h2>Phương thức thanh toán</h2>

            <label
              className={`payment-option ${
                form.paymentMethod === "bank_transfer" ? "selected" : ""
              }`}
            >
              <input
                type="radio"
                name="paymentMethod"
                value="bank_transfer"
                checked={form.paymentMethod === "bank_transfer"}
                onChange={() =>
                  setForm({ ...form, paymentMethod: "bank_transfer" })
                }
              />
              <span className="payment-option-icon">▤</span>
              <span className="payment-option-copy">
                <strong>Chuyển khoản ngân hàng</strong>
                <small>
                  Thanh toán bằng cách chuyển khoản trước khi đơn hàng
                  được xử lý.
                </small>
              </span>
            </label>

            {form.paymentMethod === "bank_transfer" && (
              <div className="bank-details">
                <strong>Thông tin tài khoản nhận thanh toán</strong>
                <p>
                  Ngân hàng: <b>{BANK_INFO.bankId}</b>
                </p>
                <p>
                  Chủ tài khoản: <b>{BANK_INFO.accountName}</b>
                </p>
                <p>
                  Số tài khoản: <b>{BANK_INFO.accountNumber}</b>
                </p>

                <div
                  className="bank-qr"
                  style={{
                    marginTop: 18,
                    padding: 18,
                    background: "#fff",
                    border: "1px solid #e5e5e5",
                    borderRadius: 12,
                    textAlign: "center",
                  }}
                >
                  <h3 style={{ margin: "0 0 14px" }}>
                    Quét mã QR để thanh toán
                  </h3>

                  {bankInfoConfigured ? (
                    <img
                      src={qrImageUrl}
                      alt="Mã QR thanh toán MyShop"
                      style={{
                        display: "block",
                        width: 240,
                        maxWidth: "100%",
                        height: "auto",
                        margin: "0 auto 14px",
                        borderRadius: 10,
                      }}
                      onError={(e) => {
                        e.currentTarget.alt =
                          "Không tải được mã QR. Vui lòng kiểm tra thông tin ngân hàng và kết nối mạng.";
                      }}
                    />
                  ) : (
                    <p style={{ color: "#b45309" }}>
                      Bạn cần thay số tài khoản và tên chủ tài khoản
                      trong BANK_INFO ở đầu file App.jsx để tạo mã QR.
                    </p>
                  )}

                  <p style={{ margin: "10px 0" }}>
                    Số tiền thanh toán: <b>{money(grandTotal)}</b>
                  </p>
                  <p style={{ margin: "10px 0" }}>
                    Nội dung chuyển khoản: <b>{paymentReference}</b>
                  </p>

                  <button
                    type="button"
                    className="outline-btn"
                    onClick={() =>
                      navigator.clipboard?.writeText(paymentReference)
                    }
                  >
                    Sao chép nội dung chuyển khoản
                  </button>

                  <small
                    style={{
                      display: "block",
                      marginTop: 12,
                      color: "#777",
                    }}
                  >
                    Vui lòng kiểm tra đúng tên người nhận, số tiền và
                    nội dung trước khi chuyển khoản.
                  </small>
                </div>
              </div>
            )}

            <label
              className={`payment-option ${
                form.paymentMethod === "cod" ? "selected" : ""
              }`}
            >
              <input
                type="radio"
                name="paymentMethod"
                value="cod"
                checked={form.paymentMethod === "cod"}
                onChange={() =>
                  setForm({ ...form, paymentMethod: "cod" })
                }
              />
              <span className="payment-option-icon">₫</span>
              <span className="payment-option-copy">
                <strong>Thanh toán khi nhận hàng (COD)</strong>
                <small>
                  Thanh toán cho nhân viên giao hàng khi nhận sản phẩm.
                </small>
              </span>
            </label>
          </div>

          <button
            className="dark-btn wide"
            type="submit"
            disabled={submitting}
          >
            {submitting
              ? "Đang xử lý..."
              : `Đặt hàng · ${money(grandTotal)}`}
          </button>
        </form>

        <aside className="summary">
          <span className="eyebrow">YOUR ORDER</span>
          {cart.map((item) => (
            <div className="mini-line" key={item.cartKey || item.id}>
              <span>
                {item.name}
                {item.size ? ` · Size ${item.size}` : ""} × {item.quantity}
              </span>
              <strong>{money(item.price * item.quantity)}</strong>
            </div>
          ))}
          <hr />
          <div className="summary-total">
            <span>Tổng</span>
            <strong>{money(grandTotal)}</strong>
          </div>
          <p className="checkout-payment-summary">
            Thanh toán:{" "}
            {form.paymentMethod === "cod"
              ? "Khi nhận hàng (COD)"
              : "Chuyển khoản ngân hàng"}
          </p>
        </aside>
      </div>
    </section>
  );
}

function About() {
  return (
    <section className="about-page section">
      <span className="eyebrow">ABOUT MYSHOP</span>
      <h1>
        Thiết kế tốt<br />
        <em>cho đời sống thật.</em>
      </h1>
      <p className="lead">
        MyShop là một cửa hàng frontend demo tập trung vào trải nghiệm
        mua sắm tối giản, hiện đại và dễ sử dụng.
      </p>
      <div className="about-grid">
        <img
          src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=90"
          alt="Store"
        />
        <div>
          <h2>
            Less noise.<br />
            More character.
          </h2>
          <p>
            Từ cách trình bày sản phẩm đến thanh toán, mọi chi tiết được
            thiết kế theo tinh thần xám trắng, khoảng thở lớn và
            typography rõ ràng.
          </p>
          <p>
            Đây là dự án frontend React.js, dữ liệu được lưu trên
            localStorage để bạn có thể demo các luồng user và admin mà
            không cần backend.
          </p>
        </div>
      </div>
    </section>
  );
}

function Account({ user, orders }) {
  const mine = orders.filter((o) => o.customer === user.name);

  return (
    <section className="section account">
      <span className="eyebrow">MY ACCOUNT</span>
      <h1>Xin chào, {user.name}</h1>
      <div className="account-grid">
        <div className="account-card">
          <span>Họ tên</span>
          <strong>{user.name}</strong>
          <span>Email</span>
          <strong>{user.email}</strong>
          <span>Vai trò</span>
          <strong>Khách hàng</strong>
        </div>
        <div className="account-card">
          <span>Đơn hàng gần đây</span>
          {mine.length ? (
            mine.map((o) => (
              <div className="order-mini" key={o.id}>
                <strong>{o.id}</strong>
                <span>{o.status}</span>
                <b>{money(o.total)}</b>
              </div>
            ))
          ) : (
            <p>Chưa có đơn hàng.</p>
          )}
        </div>
      </div>
    </section>
  );
}

function Success() {
  return (
    <section className="success section">
      <div className="success-mark">✓</div>
      <span className="eyebrow">ORDER CONFIRMED</span>
      <h1>Đặt hàng thành công.</h1>
      <p>
        Cảm ơn bạn. Đơn hàng đã được ghi nhận và sẵn sàng xử lý.
      </p>
      <Link className="dark-btn" to="/products">
        Tiếp tục mua sắm
      </Link>
    </section>
  );
}
/* ---------------- ADMIN ---------------- */

function AdminLayout({ user, logout, products, orders }) {
  const nav = [
    ["/admin", "▦", "Dashboard", true],
    ["/admin/products", "◇", "Sản phẩm"],
    ["/admin/orders", "□", "Đơn hàng"],
    ["/admin/customers", "♙", "Khách hàng"],
    ["/admin/statistics", "◈", "Thống kê"],
    ["/admin/settings", "⚙", "Cài đặt"],
  ];

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-orb"></div>
        <Link className="admin-logo" to="/admin">
          My<span>Shop</span>
        </Link>
        <span className="admin-subtitle">ADMIN PANEL</span>
        <div className="admin-divider"></div>
        <span className="admin-section-title">WORKSPACE</span>

        <nav className="admin-nav">
          {nav.slice(0, 4).map(([path, icon, label, end]) => (
            <NavLink key={path} end={end} to={path}>
              <span>{icon}</span>
              <b>{label}</b>
              {label === "Đơn hàng" && <i>{orders.length}</i>}
            </NavLink>
          ))}
        </nav>

        <span className="admin-section-title">MANAGEMENT</span>
        <nav className="admin-nav">
          {nav.slice(4).map(([path, icon, label]) => (
            <NavLink key={path} to={path}>
              <span>{icon}</span>
              <b>{label}</b>
            </NavLink>
          ))}
        </nav>

        <div className="admin-profile">
          <div className="avatar">
            {user?.name?.charAt(0).toUpperCase() || "A"}
          </div>
          <div>
            <strong>{user?.name || "Administrator"}</strong>
            <small>Quản trị viên</small>
          </div>
          <button onClick={logout}>⋮</button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <div>
            <span>OVERVIEW</span>
            <h1>Dashboard</h1>
            <p>Tổng quan hoạt động MyShop hôm nay.</p>
          </div>
          <div className="admin-date">
            <span>HÔM NAY</span>
            <strong>{new Date().toLocaleDateString("vi-VN")}</strong>
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  );
}

function StatCard({ icon, label, value, trend }) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <span className="stat-icon">{icon}</span>
        <span className="trend">+{trend}%</span>
      </div>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>
        So với kỳ trước <b>→</b>
      </small>
    </div>
  );
}

function AdminDashboard({ products, orders, accounts }) {
  const customers = accounts.filter((a) => a.role === "user");
  const revenue = orders.reduce((sum, o) => sum + o.total, 0);
  const bars = [35, 52, 43, 68, 55, 82, 92];

  return (
    <div className="admin-dashboard">
      <section className="admin-banner">
        <div>
          <span>MYSHOP PREMIUM</span>
          <h2>Xin chào, Administrator.</h2>
          <p>
            Đây là tổng quan hoạt động của cửa hàng. Chúc bạn một ngày
            làm việc hiệu quả.
          </p>
        </div>
        <div className="live-status">
          <i></i> Hệ thống đang hoạt động
        </div>
      </section>

      <div className="stats-grid">
        <StatCard
          icon="◇"
          label="Tổng sản phẩm"
          value={products.length}
          trend="12.5"
        />
        <StatCard
          icon="□"
          label="Tổng đơn hàng"
          value={orders.length}
          trend="8.2"
        />
        <StatCard
          icon="♙"
          label="Khách hàng"
          value={customers.length}
          trend="15.0"
        />
        <StatCard
          icon="₫"
          label="Doanh thu"
          value={
            revenue >= 1000000
              ? `${(revenue / 1000000).toFixed(1)}M`
              : money(revenue)
          }
          trend="18.4"
        />
      </div>

      <div className="admin-chart-row">
        <section className="panel chart-panel">
          <div className="panel-head">
            <div>
              <span>PERFORMANCE</span>
              <h3>Doanh thu</h3>
              <strong>{money(revenue)}</strong>
            </div>
            <select>
              <option>7 ngày</option>
              <option>30 ngày</option>
            </select>
          </div>

          <div className="bars">
            {bars.map((h, i) => (
              <div className="bar-wrap" key={i}>
                <div
                  className={i === 6 ? "bar current" : "bar"}
                  style={{ height: `${h}%` }}
                ></div>
                <small>
                  {["T2", "T3", "T4", "T5", "T6", "T7", "CN"][i]}
                </small>
              </div>
            ))}
          </div>
        </section>

        <section className="panel activity">
          <div className="panel-head">
            <div>
              <span>ACTIVITY</span>
              <h3>Tổng quan</h3>
            </div>
            <b className="live-label">LIVE</b>
          </div>

          <div className="activity-list">
            <div>
              <i>✓</i>
              <span>
                <strong>Đơn hàng hoàn tất</strong>
                <small>{Math.max(0, orders.length - 1)} đơn hàng</small>
              </span>
              <b>75%</b>
            </div>
            <div>
              <i>◇</i>
              <span>
                <strong>Sản phẩm đang bán</strong>
                <small>{products.length} sản phẩm</small>
              </span>
              <b>100%</b>
            </div>
            <div>
              <i>♙</i>
              <span>
                <strong>Khách hàng mới</strong>
                <small>{customers.length} tài khoản</small>
              </span>
              <b>+15%</b>
            </div>
            <div>
              <i>₫</i>
              <span>
                <strong>Giá trị đơn hàng</strong>
                <small>Trung bình</small>
              </span>
              <b>
                {orders.length
                  ? `${Math.round(revenue / orders.length / 1000)}K`
                  : "0"}
              </b>
            </div>
          </div>
        </section>
      </div>

      <section className="panel recent-orders">
        <div className="panel-head">
          <div>
            <span>ORDERS</span>
            <h3>Đơn hàng gần đây</h3>
          </div>
          <NavLink to="/admin/orders">Xem tất cả →</NavLink>
        </div>

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Mã đơn</th>
                <th>Khách hàng</th>
                <th>Ngày</th>
                <th>Tổng tiền</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, 5).map((o) => (
                <tr key={o.id}>
                  <td><strong>{o.id}</strong></td>
                  <td>{o.customer}</td>
                  <td>{o.date}</td>
                  <td>{money(o.total)}</td>
                  <td>
                    <span
                      className={`status ${
                        o.status.includes("Đã") ? "done" : "pending"
                      }`}
                    >
                      {o.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function AdminProducts({ products, addProduct, deleteProduct }) {
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({
    name: "",
    category: "Thời trang",
    price: 299000,
    oldPrice: 399000,
    badge: "NEW",
    description: "",
    image:
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=85",
  });

  const submit = (e) => {
    e.preventDefault();
    addProduct(form);
    setShow(false);
  };

  return (
    <div className="admin-page">
      <div className="page-toolbar">
        <div>
          <span>CATALOG</span>
          <h2>Sản phẩm</h2>
          <p>Quản lý danh mục sản phẩm của MyShop.</p>
        </div>
        <button
          className="admin-primary"
          onClick={() => setShow(!show)}
        >
          + Thêm sản phẩm
        </button>
      </div>

      {show && (
        <form className="admin-form" onSubmit={submit}>
          <input
            required
            placeholder="Tên sản phẩm"
            value={form.name}
            onChange={(e) =>
              setForm({ ...form, name: e.target.value })
            }
          />
          <input
            required
            type="number"
            placeholder="Giá"
            value={form.price}
            onChange={(e) =>
              setForm({ ...form, price: Number(e.target.value) })
            }
          />
          <input
            type="number"
            placeholder="Giá cũ"
            value={form.oldPrice}
            onChange={(e) =>
              setForm({ ...form, oldPrice: Number(e.target.value) })
            }
          />
          <input
            placeholder="URL ảnh"
            value={form.image}
            onChange={(e) =>
              setForm({ ...form, image: e.target.value })
            }
          />
          <button className="admin-primary">Lưu sản phẩm</button>
        </form>
      )}

      <div className="admin-product-list">
        {products.map((p) => (
          <div className="admin-product-row" key={p.id}>
            <img src={p.image} alt="" />
            <div>
              <strong>{p.name}</strong>
              <span>
                {p.category} · {money(p.price)}
              </span>
            </div>
            <span className="status done">{p.badge}</span>
            <button
              className="delete-btn"
              onClick={() => deleteProduct(p.id)}
            >
              Xóa
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}



function AdminOrders({ orders }) {
  const [selectedOrder, setSelectedOrder] = useState(null);

  const getItems = (order) => {
    if (Array.isArray(order.items)) return order.items;
    if (Array.isArray(order.lines)) return order.lines;
    return [];
  };

  const getCustomer = (order) => {
    if (typeof order.customer === "object" && order.customer !== null) {
      return order.customer.name || order.customer.fullName || "Khách hàng";
    }
    return order.customer || order.customerName || "Khách hàng";
  };

  const getPayment = (method) => {
    if (["bank_transfer", "transfer", "banking"].includes(method)) {
      return "Chuyển khoản";
    }
    if (method === "momo") return "MoMo";
    if (method === "cod") return "COD";
    return method || "Chưa xác định";
  };

  const getItemName = (item) => {
    if (typeof item === "string") return item;
    return item.productName || item.name || item.product?.name || "Sản phẩm";
  };

  const rows = (Array.isArray(orders) ? orders : []).map((order) => {
    const items = getItems(order);

    const itemSummary = items.map((item) => {
      if (typeof item === "string") return item;

      const name = getItemName(item);
      const quantity = Number(item.quantity) || 0;
      const size = item.size ? ` (Size ${item.size})` : "";

      return `${name}${quantity > 0 ? ` x${quantity}` : ""}${size}`;
    }).join(", ");

    return {
      order,
      itemSummary: itemSummary || "Chưa có sản phẩm",
    };
  });

  return (
    <div className="admin-page">
      <div className="page-toolbar">
        <div>
          <span>ORDERS</span>
          <h2>Đơn hàng</h2>
          <p>Theo dõi và xử lý các đơn hàng.</p>
        </div>
      </div>

      <section className="panel admin-table">
        <table>
          <thead>
            <tr>
              <th>Mã đơn</th>
              <th>Khách hàng</th>
              <th>Ngày</th>
              <th>Sản phẩm</th>
              <th>Tổng tiền</th>
              <th>Thanh toán</th>
              <th>Trạng thái</th>
              <th>Chi tiết</th>
            </tr>
          </thead>

          <tbody>
            {rows.length > 0 ? (
              rows.map(({ order, itemSummary }, index) => (
                <tr key={order.id || index}>
                  <td>{order.id || "—"}</td>
                  <td>{getCustomer(order)}</td>
                  <td>{order.date || "—"}</td>
                  <td>{itemSummary}</td>
                  <td>{money(Number(order.total) || 0)}</td>
                  <td>{getPayment(order.paymentMethod)}</td>
                  <td>
                    <span className="status done">
                      {order.status || "Chưa xử lý"}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => setSelectedOrder(order)}
                      style={{
                        padding: "8px 14px",
                        border: "1px solid #2563eb",
                        borderRadius: "6px",
                        background: "#2563eb",
                        color: "#fff",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Chi tiết
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8}>Chưa có đơn hàng.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {selectedOrder && (
        <div
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedOrder(null);
            }
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "20px",
            overflowY: "auto",
          }}
        >
          <div
            style={{
              background: "#fff",
              color: "#222",
              width: "100%",
              maxWidth: "750px",
              maxHeight: "90vh",
              overflowY: "auto",
              borderRadius: "12px",
              padding: "24px",
            }}
          >
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "12px",
            }}>
              <h2>Chi tiết đơn hàng</h2>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                style={{
                  border: "none",
                  background: "#eee",
                  borderRadius: "6px",
                  padding: "8px 12px",
                  cursor: "pointer",
                }}
              >
                Đóng ✕
              </button>
            </div>

            <hr />

            <p><strong>Mã đơn:</strong> {selectedOrder.id || "—"}</p>
            <p><strong>Khách hàng:</strong> {getCustomer(selectedOrder)}</p>
            <p><strong>Ngày đặt:</strong> {selectedOrder.date || "—"}</p>
            <p><strong>Số điện thoại:</strong> {selectedOrder.phone || "Chưa có"}</p>
            <p><strong>Địa chỉ:</strong> {selectedOrder.address || "Chưa có"}</p>
            <p><strong>Ghi chú:</strong> {selectedOrder.note || "Không có"}</p>

            <h3>Sản phẩm trong đơn</h3>

            {getItems(selectedOrder).map((item, index) => {
              if (typeof item === "string") {
                return <p key={index}>{item}</p>;
              }

              const image = item.image || item.product?.image || "";
              const name = getItemName(item);
              const quantity = Number(item.quantity) || 1;
              const price = Number(item.price) || 0;
              const subtotal = Number(item.subtotal ?? price * quantity);

              return (
                <div
                  key={index}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "14px",
                    padding: "12px 0",
                    borderBottom: "1px solid #eee",
                  }}
                >
                  {image ? (
                    <img
                      src={image}
                      alt={name}
                      style={{
                        width: "75px",
                        height: "75px",
                        objectFit: "cover",
                        borderRadius: "8px",
                      }}
                    />
                  ) : (
                    <div style={{
                      width: "75px",
                      height: "75px",
                      background: "#eee",
                      borderRadius: "8px",
                    }} />
                  )}

                  <div style={{ flex: 1 }}>
                    <strong>{name}</strong>
                    <p style={{ margin: "5px 0" }}>
                      Số lượng: {quantity}
                      {item.size ? ` | Size: ${item.size}` : ""}
                    </p>
                    <p style={{ margin: 0 }}>
                      Đơn giá: {money(price)}
                    </p>
                    <strong>Thành tiền: {money(subtotal)}</strong>
                  </div>
                </div>
              );
            })}

            <hr />

            <p>
              <strong>Thanh toán:</strong>{" "}
              {getPayment(selectedOrder.paymentMethod)}
            </p>
            <p>
              <strong>Trạng thái:</strong>{" "}
              {selectedOrder.status || "Chưa xử lý"}
            </p>

            <h3 style={{ textAlign: "right" }}>
              Tổng tiền: {money(Number(selectedOrder.total) || 0)}
            </h3>
          </div>
        </div>
      )}
    </div>
  );
}



function AdminTablePage({
  eyebrow,
  title,
  description,
  columns,
  rows,
  empty,
}) {
  const renderCell = (value) => {
    if (value === null || value === undefined) {
      return "";
    }

    if (typeof value === "object") {
      if (Array.isArray(value)) {
        return value.map(renderCell).join(", ");
      }

      return (
        value.name ||
        value.productName ||
        value.title ||
        value.email ||
        JSON.stringify(value)
      );
    }

    return String(value);
  };

  return (
    <div className="admin-page">
      <div className="page-toolbar">
        <div>
          <span>{eyebrow}</span>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>

      <section className="panel admin-table">
        <table>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column}>{column}</th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.length > 0 ? (
              rows.map((row, index) => (
                <tr key={index}>
                  {row.map((value, columnIndex) => {
                    const displayValue = renderCell(value);
                    const isStatus =
                      columnIndex === row.length - 1 &&
                      (
                        displayValue.includes("Đã") ||
                        displayValue.includes("Đang") ||
                        displayValue === "Khách hàng"
                      );

                    return (
                      <td key={columnIndex}>
                        {isStatus ? (
                          <span className="status done">
                            {displayValue}
                          </span>
                        ) : (
                          displayValue
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length}>
                  {empty || "Chưa có dữ liệu."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function AdminStatistics({ orders, products }) {
  const revenue = orders.reduce((s, o) => s + o.total, 0);

  return (
    <div className="admin-page">
      <div className="page-toolbar">
        <div>
          <span>ANALYTICS</span>
          <h2>Thống kê</h2>
          <p>Tổng hợp hiệu quả kinh doanh.</p>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard
          icon="₫"
          label="Doanh thu"
          value={money(revenue)}
          trend="18.4"
        />
        <StatCard
          icon="□"
          label="Đơn hàng"
          value={orders.length}
          trend="8.2"
        />
        <StatCard
          icon="◇"
          label="Sản phẩm"
          value={products.length}
          trend="12.5"
        />
        <StatCard
          icon="↗"
          label="Tỷ lệ hoàn tất"
          value="75%"
          trend="6.8"
        />
      </div>

      <section className="panel insight">
        <h3>Ghi chú</h3>
        <p>
          Đây là trang thống kê frontend. Các chỉ số được tính từ dữ liệu
          localStorage trong trình duyệt.
        </p>
      </section>
    </div>
  );
}

function AdminSettings({ user }) {
  return (
    <div className="admin-page">
      <div className="page-toolbar">
        <div>
          <span>SETTINGS</span>
          <h2>Cài đặt</h2>
          <p>Cấu hình thông tin cửa hàng và tài khoản quản trị.</p>
        </div>
      </div>

      <section className="panel settings-card">
        <label>
          Tên cửa hàng
          <input defaultValue="MyShop" />
        </label>
        <label>
          Email hỗ trợ
          <input defaultValue="support@myshop.com" />
        </label>
        <label>
          Quản trị viên
          <input
            defaultValue={user?.email || "admin@myshop.com"}
            disabled
          />
        </label>
        <button className="admin-primary">Lưu thay đổi</button>
      </section>
    </div>
  );
}

export default function App() {
  const store = useStore();
  const cartCount = store.cart.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  return (
    <Routes>
      <Route
        path="/login"
        element={<Login onLogin={store.login} />}
      />
      <Route
        path="/register"
        element={<Register onRegister={store.register} />}
      />

      <Route
        element={
          <UserLayout
            user={store.user}
            logout={store.logout}
            cartCount={cartCount}
            apiError={store.apiError}
          />
        }
      >
        <Route
          path="/"
          element={
            <Home
              products={store.products}
              addToCart={store.addToCart}
            />
          }
        />

        <Route
          path="/products"
          element={
            <ProductsPage
              products={store.products}
              addToCart={store.addToCart}
            />
          }
        />

        <Route
          path="/sale"
          element={
            <ProductsPage
              products={store.products}
              addToCart={store.addToCart}
              saleOnly
            />
          }
        />

        <Route
          path="/products/:id"
          element={
            <ProductDetail
              products={store.products}
              addToCart={store.addToCart}
            />
          }
        />

        <Route path="/about" element={<About />} />

        <Route
          path="/cart"
          element={
            <CartPage
              cart={store.cart}
              updateCart={store.updateCart}
            />
          }
        />

        <Route
          path="/checkout"
          element={
            <Protected user={store.user} role="user">
              <Checkout
                cart={store.cart}
                user={store.user}
                placeOrder={store.placeOrder}
              />
            </Protected>
          }
        />

        <Route
          path="/account"
          element={
            <Protected user={store.user} role="user">
              <Account
                user={store.user}
                orders={store.orders}
              />
            </Protected>
          }
        />

        <Route
          path="/order-success"
          element={<Success />}
        />
      </Route>

      <Route
        path="/admin"
        element={
          <Protected user={store.user} role="admin">
            <AdminLayout
              user={store.user}
              logout={store.logout}
              products={store.products}
              orders={store.orders}
            />
          </Protected>
        }
      >
        <Route
          index
          element={
            <AdminDashboard
              products={store.products}
              orders={store.orders}
              accounts={store.accounts}
            />
          }
        />

        <Route
          path="products"
          element={
            <AdminProducts
              products={store.products}
              addProduct={store.addProduct}
              deleteProduct={store.deleteProduct}
            />
          }
        />

        <Route
          path="orders"
          element={<AdminOrders orders={store.orders} />}
        />

        <Route
          path="customers"
          element={
            <AdminCustomers
               accounts={store.accounts}
               orders={store.orders}
               products={store.products}
    />
  }
/>
        

        <Route
          path="statistics"
          element={
            <AdminStatistics
              orders={store.orders}
              products={store.products}
            />
          }
        />

        <Route
          path="settings"
          element={<AdminSettings user={store.user} />}
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function Login({ onLogin }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@myshop.com");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();

    const result = await onLogin(email, password);

    if (!result) {
      return setError("Email hoặc mật khẩu không đúng.");
    }

    navigate(result.role === "admin" ? "/admin" : "/");
  };

  return (
    <AuthLayout
      title="Chào mừng trở lại."
      subtitle="Đăng nhập để tiếp tục với MyShop."
    >
      <form className="auth-form" onSubmit={submit}>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label>
          Mật khẩu
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        {error && <p className="form-error">{error}</p>}

        <button className="dark-btn wide">
          Đăng nhập →
        </button>

        <div className="demo-note">
          Demo admin: admin@myshop.com / admin123
        </div>

        <p>
          Chưa có tài khoản? <Link to="/register">Đăng ký</Link>
        </p>
      </form>
    </AuthLayout>
  );
}

function Register({ onRegister }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();

    const r = await onRegister(form);

    if (!r.ok) {
      return setError(r.message);
    }

    navigate("/");
  };

  return (
    <AuthLayout
      title="Tạo tài khoản."
      subtitle="Bắt đầu trải nghiệm MyShop theo cách của bạn."
    >
      <form className="auth-form" onSubmit={submit}>
        <label>
          Họ và tên
          <input
            required
            value={form.name}
            onChange={(e) =>
              setForm({ ...form, name: e.target.value })
            }
          />
        </label>

        <label>
          Email
          <input
            required
            type="email"
            value={form.email}
            onChange={(e) =>
              setForm({ ...form, email: e.target.value })
            }
          />
        </label>

        <label>
          Mật khẩu
          <input
            required
            minLength="6"
            type="password"
            value={form.password}
            onChange={(e) =>
              setForm({ ...form, password: e.target.value })
            }
          />
        </label>

        {error && <p className="form-error">{error}</p>}

        <button className="dark-btn wide">
          Tạo tài khoản →
        </button>

        <p>
          Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
        </p>
      </form>
    </AuthLayout>
  );
}

function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="auth-page">
      <div className="auth-brand">
        <Logo />
        <span>PREMIUM FRONTEND STORE</span>
      </div>

      <div className="auth-panel">
        <div className="auth-art">
          <span>MYSHOP / 2026</span>
          <h2>
            Quiet design.<br />
            <em>Clear experience.</em>
          </h2>
        </div>

        <div className="auth-content">
          <span className="eyebrow">WELCOME</span>
          <h1>{title}</h1>
          <p>{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}



function AdminCustomers({ accounts, orders, products }) {
  const [expandedCustomer, setExpandedCustomer] = useState(null);

  const customers = Array.isArray(accounts)
    ? accounts.filter((account) => account.role !== "admin")
    : [];

  const allOrders = Array.isArray(orders) ? orders : [];
  const allProducts = Array.isArray(products) ? products : [];

  const getCustomerName = (order) => {
    if (typeof order.customer === "object" && order.customer !== null) {
      return order.customer.name || order.customer.fullName || "";
    }

    return String(order.customer || order.customerName || "");
  };

  const getOrderItems = (order) => {
    if (Array.isArray(order.items)) return order.items;
    if (Array.isArray(order.products)) return order.products;
    return [];
  };

  const getProductInfo = (item) => {
    const productId =
      item.productId ??
      item.product?.id ??
      item.product?._id ??
      item.id;

    const currentProduct = allProducts.find(
      (product) =>
        String(product.id ?? product._id) === String(productId)
    );

    return {
      name:
        item.productName ||
        item.name ||
        item.product?.name ||
        currentProduct?.name ||
        "Sản phẩm",
      image:
        item.image ||
        item.product?.image ||
        currentProduct?.image ||
        "",
      quantity: Number(item.quantity) || 1,
      size: item.size || "",
      price: Number(
        item.price ??
        item.product?.price ??
        currentProduct?.price ??
        0
      ),
    };
  };

  const getPaymentName = (method) => {
    if (
      method === "bank_transfer" ||
      method === "transfer" ||
      method === "banking"
    ) {
      return "Chuyển khoản";
    }

    if (method === "momo") return "MoMo";
    if (method === "cod") return "COD";

    return method || "Chưa xác định";
  };

  return (
    <div className="admin-page">
      <div className="page-toolbar">
        <div>
          <span>CUSTOMERS</span>
          <h2>Khách hàng</h2>
          <p>
            Theo dõi thông tin và lịch sử mua hàng của từng khách hàng.
          </p>
        </div>
      </div>

      <div className="admin-product-list">
        {customers.length > 0 ? (
          customers.map((account, index) => {
            const customerName =
              account.name || account.fullName || "";

            const accountId = account.id ?? account._id;

            const customerOrders = allOrders.filter((order) => {
              if (order.userId && accountId) {
                return String(order.userId) === String(accountId);
  }

   return (
     getCustomerName(order).trim().toLowerCase() ===
     String(customerName).trim().toLowerCase()
  );
});

            const totalSpent = customerOrders.reduce(
              (sum, order) => sum + (Number(order.total) || 0),
              0
            );

            const isExpanded =
              expandedCustomer === String(account.id ?? account._id ?? index);

            return (
              <section
                className="panel"
                key={account.id ?? account._id ?? index}
                style={{ padding: 20, marginBottom: 18 }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 16,
                  }}
                >
                  <div>
                    <h3 style={{ margin: "0 0 8px" }}>
                      {customerName || "Khách hàng"}
                    </h3>
                    <p style={{ margin: "4px 0" }}>
                      Email: {account.email || "Chưa cập nhật"}
                    </p>
                    <p style={{ margin: "4px 0" }}>
                      Số điện thoại: {account.phone || "Chưa cập nhật"}
                    </p>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <strong>
                      {customerOrders.length} đơn hàng
                    </strong>
                    <h3 style={{ margin: "8px 0" }}>
                      {money(totalSpent)}
                    </h3>
                    <small>Tổng tiền đã đặt mua</small>
                  </div>

                  <button
                    className="admin-primary"
                    onClick={() =>
                      setExpandedCustomer(
                        isExpanded
                          ? null
                          : String(account.id ?? account._id ?? index)
                      )
                    }
                  >
                    {isExpanded ? "Thu gọn" : "Xem lịch sử mua hàng"}
                  </button>
                </div>

                {isExpanded && (
                  <div style={{ marginTop: 24 }}>
                    <h3>Lịch sử mua hàng</h3>

                    {customerOrders.length > 0 ? (
                      customerOrders.map((order, orderIndex) => {
                        const items = getOrderItems(order);

                        return (
                          <div
                            key={order.id ?? order._id ?? orderIndex}
                            style={{
                              borderTop: "1px solid #e5e5e5",
                              padding: "18px 0",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                flexWrap: "wrap",
                                gap: 10,
                              }}
                            >
                              <strong>
                                Mã đơn: {order.id ?? order._id ?? "—"}
                              </strong>
                              <span>
                                {order.date
                                  ? new Date(order.date).toLocaleDateString("vi-VN")
                                  : order.createdAt
                                    ? new Date(order.createdAt).toLocaleDateString("vi-VN")
                                    : "—"}
                              </span>
                            </div>

                            <div style={{ marginTop: 14 }}>
                              {items.map((item, itemIndex) => {
                                const product = getProductInfo(item);

                                return (
                                  <div
                                    key={itemIndex}
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 14,
                                      marginBottom: 14,
                                    }}
                                  >
                                    {product.image ? (
                                      <img
                                        src={product.image}
                                        alt={product.name}
                                        style={{
                                          width: 76,
                                          height: 76,
                                          objectFit: "cover",
                                          borderRadius: 8,
                                          background: "#f5f5f5",
                                        }}
                                      />
                                    ) : (
                                      <div
                                        style={{
                                          width: 76,
                                          height: 76,
                                          display: "grid",
                                          placeItems: "center",
                                          background: "#f2f2f2",
                                          borderRadius: 8,
                                          color: "#777",
                                          fontSize: 12,
                                        }}
                                      >
                                        Chưa có ảnh
                                      </div>
                                    )}

                                    <div style={{ flex: 1 }}>
                                      <strong>{product.name}</strong>
                                      <p style={{ margin: "5px 0" }}>
                                        Số lượng: {product.quantity}
                                        {product.size
                                          ? ` · Size ${product.size}`
                                          : ""}
                                      </p>
                                      <span>
                                        {money(product.price)}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                flexWrap: "wrap",
                                gap: 10,
                                borderTop: "1px dashed #ddd",
                                paddingTop: 12,
                              }}
                            >
                              <div>
                                <p>
                                  Thanh toán:{" "}
                                  <strong>
                                    {getPaymentName(order.paymentMethod)}
                                  </strong>
                                </p>
                                <p>
                                  Trạng thái:{" "}
                                  <strong>
                                    {order.status || "Chưa xử lý"}
                                  </strong>
                                </p>
                              </div>

                              <div>
                                Tổng đơn hàng:
                                <h3 style={{ margin: "5px 0" }}>
                                  {money(Number(order.total) || 0)}
                                </h3>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p>Khách hàng chưa có đơn hàng nào.</p>
                    )}
                  </div>
                )}
              </section>
            );
          })
        ) : (
          <section className="panel" style={{ padding: 24 }}>
            Chưa có khách hàng nào.
          </section>
        )}
      </div>
    </div>
  );
}
