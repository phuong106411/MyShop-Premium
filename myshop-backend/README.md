# MyShop Backend (Node.js + Express)

Backend API de ket noi voi frontend React. Du lieu demo luu trong `data/db.json`; file se duoc tao va nap 8 san pham mau tu `myshop-premium/src/data.js` o lan chay dau tien.

## 1. Yeu cau
- Node.js 20 LTS tro len
- Hai terminal: mot cho backend, mot cho frontend

## 2. Chay backend
```bash
cd myshop-backend
npm install
npm run dev
```
Kiem tra: `http://localhost:4000/api/health` (ket qua mong doi: `{"status":"ok","service":"MyShop API"}`).
Danh sach san pham: `http://localhost:4000/api/products` (mong doi: mang gom 8 san pham mau).

Tai khoan admin demo: `admin@myshop.com` / `admin123`. Doi mat khau truoc khi trien khai that.

## 3. Chay frontend
Mo terminal thu hai:
```bash
cd myshop-premium
npm install
npm run dev
```
Mo URL Vite hien trong terminal (thuong la `http://localhost:5173`). Frontend mac dinh goi `http://localhost:4000/api`.

Neu frontend chay tren dia chi API khac, tao file `.env` trong `myshop-premium`:
```env
VITE_API_URL=http://localhost:4000/api
```
Sau khi sua `.env`, khoi dong lai Vite. CORS backend duoc cau hinh cho moi origin trong moi truong demo local, nen Vite co the chay tren cong 5173/5174.

## API
- `GET /api/health`
- `GET /api/products`, `GET /api/products/:id`
- `POST /api/products` (admin), `DELETE /api/products/:id` (admin)
- `POST /api/auth/register`, `POST /api/auth/login`
- `GET /api/users` (admin)
- `GET /api/orders` (don cua nguoi dung dang dang nhap; admin xem tat ca)
- `POST /api/orders` (nguoi dung da dang nhap; chi tiet dong hang co luu size)
- `PATCH /api/orders/:id/status` (admin)

## Luu y
- Size duoc chon tren trang chi tiet san pham, hien thi trong gio hang va duoc gui kem don hang.
- Gio hang luu trong localStorage; san pham, tai khoan va don hang luu qua backend.
- File JSON phu hop hoc/demo tren may ca nhan; chua phu hop cho nhieu nguoi dung dong thoi.
- Backend khong tich hop cong thanh toan that.
