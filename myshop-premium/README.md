# MyShop Premium — React Frontend

Website bán hàng frontend-only bằng React + React Router + Vite.

## Chạy project

```bash
npm install
npm run dev
```

Mở địa chỉ Vite hiển thị trong terminal, thường là:

```text
http://localhost:5173
```

## Tài khoản demo

### Admin
- Email: `admin@myshop.com`
- Mật khẩu: `admin123`

### User
- Email: `user@myshop.com`
- Mật khẩu: `123456`

## Chức năng User

- Trang chủ premium
- Danh sách sản phẩm
- Lọc theo danh mục
- Tìm kiếm
- Trang chi tiết sản phẩm
- Thêm/xóa/tăng giảm giỏ hàng
- Đăng nhập / đăng ký
- Checkout
- Lịch sử đơn hàng cơ bản
- Dữ liệu cart/account/order lưu bằng localStorage

## Chức năng Admin

- Dashboard
- KPI sản phẩm / đơn hàng / khách hàng / doanh thu
- Biểu đồ doanh thu frontend
- Activity
- Danh sách đơn hàng
- Quản lý sản phẩm
- Thêm sản phẩm
- Xóa sản phẩm
- Danh sách khách hàng
- Thống kê
- Cài đặt

## Lưu ý

Đây là frontend demo, chưa có backend, database, API, thanh toán thật hoặc xác thực bảo mật phía server.
Ảnh sản phẩm đang dùng URL Unsplash nên cần internet để hiển thị ảnh.


## Backend
Frontend này đã được nối với API Node.js/Express trong thư mục `../myshop-backend`. Xem `myshop-backend/README.md` để chạy cả hai phần. Sản phẩm, đăng nhập/đăng ký, danh sách đơn hàng và tạo đơn hàng dùng backend; giỏ hàng vẫn lưu cục bộ trong trình duyệt.
