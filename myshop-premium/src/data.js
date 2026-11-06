export const initialProducts = [
  {
    id: 1,
    name: "Áo thun Essential",
    category: "Thời trang",
    price: 249000,
    oldPrice: 329000,
    rating: 4.9,
    sold: 182,
    badge: "BEST SELLER",
    description: "Áo thun cotton mềm, form relaxed tối giản cho phong cách hằng ngày.",
    image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=85"
  },
  {
    id: 2,
    name: "Áo sơ mi Oxford",
    category: "Thời trang",
    price: 399000,
    oldPrice: 489000,
    rating: 4.8,
    sold: 96,
    badge: "NEW",
    description: "Sơ mi Oxford thanh lịch, đường may gọn và chất vải đứng dáng.",
    image: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=900&q=85"
  },
  {
    id: 3,
    name: "Quần trousers Relax",
    category: "Thời trang",
    price: 449000,
    oldPrice: 549000,
    rating: 4.7,
    sold: 74,
    badge: "SALE",
    description: "Quần trousers dáng suông hiện đại, dễ phối cho cả đi học và đi làm.",
    image: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=900&q=85"
  },
  {
    id: 4,
    name: "Túi tote Canvas",
    category: "Phụ kiện",
    price: 189000,
    oldPrice: 239000,
    rating: 4.8,
    sold: 143,
    badge: "HOT",
    description: "Túi canvas dày dặn, ngăn chứa rộng, thiết kế clean và bền.",
    image: "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=900&q=85"
  },
  {
    id: 5,
    name: "Sneaker Mono",
    category: "Giày dép",
    price: 699000,
    oldPrice: 849000,
    rating: 4.9,
    sold: 121,
    badge: "TRENDING",
    description: "Sneaker phối màu đơn sắc, đế nhẹ và phù hợp phong cách tối giản.",
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=85"
  },
  {
    id: 6,
    name: "Ví da Compact",
    category: "Phụ kiện",
    price: 329000,
    oldPrice: 399000,
    rating: 4.8,
    sold: 62,
    badge: "LIMITED",
    description: "Ví da compact nhỏ gọn, hoàn thiện tinh tế với nhiều ngăn tiện dụng.",
    image: "https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=900&q=85"
  },
  {
    id: 7,
    name: "Hoodie Minimal",
    category: "Thời trang",
    price: 529000,
    oldPrice: 629000,
    rating: 4.9,
    sold: 88,
    badge: "BEST SELLER",
    description: "Hoodie form rộng vừa phải, bề mặt nỉ mịn và cảm giác mặc thoải mái.",
    image: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=900&q=85"
  },
  {
    id: 8,
    name: "Kính Mono Frame",
    category: "Phụ kiện",
    price: 279000,
    oldPrice: 359000,
    rating: 4.6,
    sold: 57,
    badge: "NEW",
    description: "Kính gọng tối giản, tạo điểm nhấn nhẹ cho outfit hằng ngày.",
    image: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=900&q=85"
  }
];

export const initialAccounts = [
  {
    id: "admin-1",
    name: "Administrator",
    email: "admin@myshop.com",
    password: "admin123",
    role: "admin"
  },
  {
    id: "user-1",
    name: "Nguyễn Minh",
    email: "user@myshop.com",
    password: "123456",
    role: "user"
  }
];

export const initialOrders = [
  { id: "MS-1024", customer: "Nguyễn Minh", total: 748000, status: "Đã giao", date: "18/09/2026", items: 2 },
  { id: "MS-1023", customer: "Trần An", total: 399000, status: "Đang xử lý", date: "18/09/2026", items: 1 },
  { id: "MS-1022", customer: "Lê Hà", total: 978000, status: "Đang giao", date: "17/09/2026", items: 2 },
  { id: "MS-1021", customer: "Phạm Nam", total: 529000, status: "Đã giao", date: "17/09/2026", items: 1 },
  { id: "MS-1020", customer: "Hoàng Vy", total: 1187000, status: "Đã giao", date: "16/09/2026", items: 3 }
];
