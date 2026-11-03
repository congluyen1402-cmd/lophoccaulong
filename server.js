const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// =================================================================
// 1. BẢO MẬT HỆ THỐNG: HARDENING & SECURITY HEADERS (OWASP STANDARD)
// =================================================================
// Ẩn chữ ký máy chủ để tránh bị tin tặc quét lỗi
app.disable('x-powered-by');

// Thêm các tiêu đề bảo mật chống Clickjacking, XSS và MIME-sniffing
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

// Cấu hình thư mục lưu trữ an toàn
const DIRS = [
  path.join(__dirname, 'data'),
  path.join(__dirname, 'uploads'),
  path.join(__dirname, 'uploads', 'achievements'),
  path.join(__dirname, 'uploads', 'blog')
];
DIRS.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// =================================================================
// 2. QUẢN LÝ TÀI KHOẢN VÀ PHIÊN ĐĂNG NHẬP BẢO MẬT (CRYPTO TOKENS)
// =================================================================
const CONFIG_FILE = path.join(__dirname, 'data', 'auth_config.json');

function getAuthConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    }
  } catch (err) {}
  
  // Giá trị mặc định bảo mật (có thể override bằng biến môi trường)
  const defaultConfig = {
    username: process.env.ADMIN_USER || 'admin',
    passwordHash: crypto.createHash('sha256').update(process.env.ADMIN_PASS || 'caulong2026').digest('hex')
  };
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2), 'utf8');
  return defaultConfig;
}

// Lưu trữ token bảo mật ngẫu nhiên trong bộ nhớ máy chủ (Session Store)
const activeSessions = new Map(); // token -> { username, expiresAt }
const loginAttempts = new Map(); // ip -> { count, lockedUntil }
const registrationRateLimit = new Map(); // ip -> [timestamps]

// Dọn dẹp phiên hết hạn định kỳ
setInterval(() => {
  const now = Date.now();
  for (const [token, session] of activeSessions.entries()) {
    if (session.expiresAt < now) {
      activeSessions.delete(token);
    }
  }
}, 30 * 60 * 1000);

// Helper đọc/ghi dữ liệu JSON
function getDataPath(filename) {
  return path.join(__dirname, 'data', filename);
}

function readJson(filename, defaultValue = []) {
  try {
    const filePath = getDataPath(filename);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2), 'utf8');
      return defaultValue;
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.error(`Error reading ${filename}:`, err.message);
    return defaultValue;
  }
}

function writeJson(filename, data) {
  try {
    const filePath = getDataPath(filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error(`Error writing ${filename}:`, err.message);
    return false;
  }
}

// Khử mã độc XSS & HTML Injection trong dữ liệu người dùng
function sanitizeInput(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
}

// =================================================================
// 3. MIDDLEWARE
// =================================================================
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Phục vụ file tĩnh
app.use(express.static(path.join(__dirname)));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Cấu hình Multer upload file tuyệt đối an toàn
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const folder = req.query.folder === 'blog' ? 'blog' : 'achievements';
    const dest = path.join(__dirname, 'uploads', folder);
    cb(null, dest);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    // Tạo tên file ngẫu nhiên bằng chuỗi mã hóa cryptographically secure để không bị trùng hoặc đoán trước
    const randomHex = crypto.randomBytes(16).toString('hex');
    cb(null, `${Date.now()}-${randomHex}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedExts = ['.jpg', '.jpeg', '.png', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];

  if (allowedExts.includes(ext) && allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Chỉ chấp nhận file hình ảnh hợp lệ (JPG, PNG, WEBP)!'));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // Tối đa 8MB
  fileFilter: fileFilter
});

// Middleware bảo vệ các thao tác quản trị viên
function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ success: false, message: 'Yêu cầu đăng nhập quản trị viên' });
  }

  const token = authHeader.replace(/^Bearer\s+/, '').trim();
  const session = activeSessions.get(token);

  if (session && session.expiresAt > Date.now()) {
    req.adminUser = session.username;
    next();
  } else {
    res.status(403).json({ success: false, message: 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại!' });
  }
}

// =================================================================
// 4. API ĐĂNG NHẬP & BẢO MẬT CHỐNG BRUTE-FORCE
// =================================================================
app.post('/api/auth/login', (req, res) => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();

  // Kiểm tra khóa tạm thời IP (Chống tấn công Brute-force mò mật khẩu)
  const attempt = loginAttempts.get(ip) || { count: 0, lockedUntil: 0 };
  if (attempt.lockedUntil > now) {
    const remainingMins = Math.ceil((attempt.lockedUntil - now) / 60000);
    return res.status(429).json({
      success: false,
      message: `Tài khoản tạm thời bị khóa do nhập sai mật khẩu quá 5 lần. Vui lòng thử lại sau ${remainingMins} phút!`
    });
  }

  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Vui lòng nhập tài khoản và mật khẩu!' });
  }

  const authConfig = getAuthConfig();
  const inputHash = crypto.createHash('sha256').update(password).digest('hex');

  // So sánh an toàn bằng hàm timingSafeEqual chống tấn công Timing Attack
  const usernameMatch = (username === authConfig.username);
  const passwordMatch = crypto.timingSafeEqual(
    Buffer.from(inputHash, 'utf8'),
    Buffer.from(authConfig.passwordHash, 'utf8')
  );

  if (usernameMatch && passwordMatch) {
    // Đăng nhập thành công: Xóa đếm lỗi IP
    loginAttempts.delete(ip);

    // Tạo token bảo mật ngẫu nhiên 64 ký tự hex có hạn 7 ngày
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = now + (7 * 24 * 60 * 60 * 1000);
    activeSessions.set(token, { username, expiresAt });

    return res.json({
      success: true,
      token,
      expiresAt,
      user: { username },
      message: 'Đăng nhập quản trị viên thành công!'
    });
  }

  // Đăng nhập thất bại: Tăng số lần thử
  attempt.count = (attempt.count || 0) + 1;
  if (attempt.count >= 5) {
    attempt.lockedUntil = now + (15 * 60 * 1000); // Khóa 15 phút
    loginAttempts.set(ip, attempt);
    return res.status(429).json({
      success: false,
      message: 'Bạn đã nhập sai mật khẩu 5 lần. Hệ thống tự động khóa đăng nhập 15 phút để phòng chống tấn công!'
    });
  } else {
    loginAttempts.set(ip, attempt);
    const left = 5 - attempt.count;
    return res.status(401).json({
      success: false,
      message: `Tài khoản hoặc mật khẩu không chính xác! (Còn ${left} lần thử)`
    });
  }
});

// Kiểm tra phiên đăng nhập
app.get('/api/auth/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader ? authHeader.replace(/^Bearer\s+/, '').trim() : '';
  const session = activeSessions.get(token);

  if (session && session.expiresAt > Date.now()) {
    return res.json({ success: true, user: { username: session.username } });
  }
  return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });
});

// Đổi mật khẩu quản trị viên
app.post('/api/auth/change-password', requireAdmin, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword || newPassword.length < 8) {
    return res.status(400).json({ success: false, message: 'Mật khẩu mới phải có ít nhất 8 ký tự để đảm bảo an toàn!' });
  }

  const authConfig = getAuthConfig();
  const currentHash = crypto.createHash('sha256').update(currentPassword).digest('hex');

  if (currentHash !== authConfig.passwordHash) {
    return res.status(400).json({ success: false, message: 'Mật khẩu hiện tại không đúng!' });
  }

  authConfig.passwordHash = crypto.createHash('sha256').update(newPassword).digest('hex');
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(authConfig, null, 2), 'utf8');

  // Hủy các phiên đăng nhập cũ để bắt buộc đăng nhập lại
  activeSessions.clear();

  res.json({ success: true, message: 'Đổi mật khẩu thành công! Vui lòng đăng nhập lại với mật khẩu mới.' });
});

// =================================================================
// 5. API UPLOAD ẢNH (BẮT BUỘC TOKEN ADMIN)
// =================================================================
app.post('/api/upload', requireAdmin, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Chưa chọn file ảnh!' });
  }
  const folder = req.query.folder === 'blog' ? 'blog' : 'achievements';
  const fileUrl = `/uploads/${folder}/${req.file.filename}`;
  res.json({
    success: true,
    url: fileUrl,
    filename: req.file.filename,
    message: 'Tải ảnh lên thành công an toàn!'
  });
});

// =================================================================
// 6. ACHIEVEMENTS (THÀNH TÍCH HỌC VIÊN)
// =================================================================
app.get('/api/achievements', (req, res) => {
  const achievements = readJson('achievements.json', []);
  res.json({ success: true, count: achievements.length, data: achievements });
});

app.post('/api/achievements', requireAdmin, upload.single('imageFile'), (req, res) => {
  const achievements = readJson('achievements.json', []);
  const body = req.body;

  let imageUrl = sanitizeInput(body.imageUrl || '');
  if (req.file) {
    imageUrl = `/uploads/achievements/${req.file.filename}`;
  }
  if (!imageUrl) {
    imageUrl = 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80';
  }

  const newAchievement = {
    id: 'ach-' + Date.now(),
    studentName: sanitizeInput(body.studentName || 'Học viên Lớp Học Cầu Lông'),
    award: sanitizeInput(body.award || 'Huy Chương Danh Dự'),
    tournament: sanitizeInput(body.tournament || 'Giải Cầu Lông Phong Trào TP.HCM'),
    court: sanitizeInput(body.court || 'Sân Dni Sport (Quận 7)'),
    duration: sanitizeInput(body.duration || 'Học viên khóa cơ bản'),
    image: imageUrl,
    quote: sanitizeInput(body.quote || 'Tự tin thi đấu và đạt thành tích xuất sắc sau khóa học.'),
    date: sanitizeInput(body.date || new Date().toISOString().split('T')[0]),
    featured: body.featured === 'true' || body.featured === true
  };

  achievements.unshift(newAchievement);
  writeJson('achievements.json', achievements);

  res.status(201).json({
    success: true,
    message: 'Thêm thành tích học viên thành công!',
    data: newAchievement
  });
});

app.put('/api/achievements/:id', requireAdmin, (req, res) => {
  const achievements = readJson('achievements.json', []);
  const idx = achievements.findIndex(a => a.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy thành tích!' });
  }

  achievements[idx] = { ...achievements[idx], ...req.body };
  writeJson('achievements.json', achievements);
  res.json({ success: true, message: 'Cập nhật thành tích thành công!', data: achievements[idx] });
});

app.delete('/api/achievements/:id', requireAdmin, (req, res) => {
  const achievements = readJson('achievements.json', []);
  const filtered = achievements.filter(a => a.id !== req.params.id);
  if (filtered.length === achievements.length) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy thành tích để xóa!' });
  }

  writeJson('achievements.json', filtered);
  res.json({ success: true, message: 'Đã xóa thành tích học viên!' });
});

// =================================================================
// 7. BLOG POSTS (BÀI VIẾT SEO)
// =================================================================
app.get('/api/posts', (req, res) => {
  let posts = readJson('posts.json', []);
  const { category, search, tag } = req.query;

  if (category && category !== 'all') {
    posts = posts.filter(p => p.category === category);
  }
  if (tag) {
    posts = posts.filter(p => Array.isArray(p.tags) && p.tags.includes(tag));
  }
  if (search) {
    const q = sanitizeInput(search).toLowerCase();
    posts = posts.filter(p =>
      (p.title && p.title.toLowerCase().includes(q)) ||
      (p.summary && p.summary.toLowerCase().includes(q)) ||
      (p.content && p.content.toLowerCase().includes(q))
    );
  }

  res.json({ success: true, count: posts.length, data: posts });
});

app.get('/api/posts/:slugOrId', (req, res) => {
  const posts = readJson('posts.json', []);
  const target = req.params.slugOrId;
  const post = posts.find(p => p.slug === target || p.id === target);
  if (!post) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết!' });
  }
  res.json({ success: true, data: post });
});

app.post('/api/posts', requireAdmin, upload.single('coverImageFile'), (req, res) => {
  const posts = readJson('posts.json', []);
  const body = req.body;

  let coverImage = sanitizeInput(body.coverImage || '');
  if (req.file) {
    coverImage = `/uploads/blog/${req.file.filename}`;
  }
  if (!coverImage) {
    coverImage = 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1000&q=80';
  }

  let slug = sanitizeInput(body.slug || '');
  if (!slug && body.title) {
    slug = body.title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, 'd')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  if (!slug) slug = 'bai-viet-' + Date.now();

  let uniqueSlug = slug;
  let counter = 1;
  while (posts.some(p => p.slug === uniqueSlug)) {
    uniqueSlug = `${slug}-${counter}`;
    counter++;
  }

  let parsedTags = [];
  if (Array.isArray(body.tags)) {
    parsedTags = body.tags.map(sanitizeInput);
  } else if (typeof body.tags === 'string') {
    parsedTags = body.tags.split(',').map(t => sanitizeInput(t.trim())).filter(Boolean);
  }

  const newPost = {
    id: 'post-' + Date.now(),
    title: sanitizeInput(body.title || 'Bài viết kỹ thuật cầu lông mới'),
    slug: uniqueSlug,
    category: sanitizeInput(body.category || 'Kỹ thuật cầu lông'),
    author: sanitizeInput(body.author || 'Ban Huấn Luyện - lophoccaulong.com'),
    date: sanitizeInput(body.date || new Date().toISOString().split('T')[0]),
    readTime: sanitizeInput(body.readTime || '5 phút đọc'),
    coverImage: coverImage,
    summary: sanitizeInput(body.summary || ''),
    content: body.content || '', // Cho phép HTML có cấu trúc chuẩn cho bài viết
    tags: parsedTags,
    metaTitle: sanitizeInput(body.metaTitle || (body.title + ' | lophoccaulong.com')),
    metaDesc: sanitizeInput(body.metaDesc || body.summary || '')
  };

  posts.unshift(newPost);
  writeJson('posts.json', posts);

  res.status(201).json({
    success: true,
    message: 'Đăng bài viết mới thành công!',
    data: newPost
  });
});

app.put('/api/posts/:id', requireAdmin, (req, res) => {
  const posts = readJson('posts.json', []);
  const idx = posts.findIndex(p => p.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết để sửa!' });
  }

  posts[idx] = { ...posts[idx], ...req.body };
  writeJson('posts.json', posts);
  res.json({ success: true, message: 'Cập nhật bài viết thành công!', data: posts[idx] });
});

app.delete('/api/posts/:id', requireAdmin, (req, res) => {
  const posts = readJson('posts.json', []);
  const filtered = posts.filter(p => p.id !== req.params.id);
  writeJson('posts.json', filtered);
  res.json({ success: true, message: 'Đã xóa bài viết thành công!' });
});

// =================================================================
// 8. REGISTRATIONS (LEADS HỌC VIÊN - BẢO MẬT & CHỐNG SPAM)
// =================================================================
app.get('/api/registrations', requireAdmin, (req, res) => {
  const registrations = readJson('registrations.json', []);
  res.json({ success: true, count: registrations.length, data: registrations });
});

// Form đăng ký công khai có giới hạn tốc độ (Anti-Spam Rate Limit)
app.post('/api/registrations', (req, res) => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();

  // Giới hạn: tối đa 8 lượt đăng ký trong 15 phút từ 1 IP để chống spam bot
  let timestamps = registrationRateLimit.get(ip) || [];
  timestamps = timestamps.filter(t => now - t < 15 * 60 * 1000);
  if (timestamps.length >= 8) {
    return res.status(429).json({
      success: false,
      message: 'Bạn thao tác quá nhanh! Vui lòng thử lại sau ít phút hoặc nhắn tin trực tiếp qua Zalo/Facebook.'
    });
  }
  timestamps.push(now);
  registrationRateLimit.set(ip, timestamps);

  const { name, phone, course, court, timeSlot, note } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ success: false, message: 'Vui lòng nhập họ tên và số điện thoại!' });
  }

  const cleanPhone = phone.replace(/[^0-9+]/g, '');
  if (cleanPhone.length < 9 || cleanPhone.length > 12) {
    return res.status(400).json({ success: false, message: 'Số điện thoại không hợp lệ!' });
  }

  const registrations = readJson('registrations.json', []);
  const newReg = {
    id: 'reg_' + Date.now(),
    name: sanitizeInput(name).substring(0, 100),
    phone: cleanPhone,
    course: sanitizeInput(course || 'Khóa Cầu Lông Cơ Bản'),
    court: sanitizeInput(court || 'Sân T12 Q4 hoặc Sân Dni Sport Q7'),
    timeSlot: sanitizeInput(timeSlot || 'Chưa chọn ca học'),
    note: sanitizeInput(note || '').substring(0, 500),
    status: 'new',
    createdAt: new Date().toISOString()
  };

  registrations.unshift(newReg);
  writeJson('registrations.json', registrations);

  res.status(201).json({
    success: true,
    message: 'Đăng ký học thử thành công! Ban huấn luyện sẽ liên hệ qua điện thoại hoặc Zalo trong vòng 30 phút.',
    data: newReg
  });
});

app.patch('/api/registrations/:id', requireAdmin, (req, res) => {
  const registrations = readJson('registrations.json', []);
  const idx = registrations.findIndex(r => r.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin đăng ký!' });
  }

  if (req.body.status) {
    registrations[idx].status = sanitizeInput(req.body.status);
  }
  if (req.body.adminNote) {
    registrations[idx].adminNote = sanitizeInput(req.body.adminNote);
  }

  writeJson('registrations.json', registrations);
  res.json({ success: true, message: 'Cập nhật trạng thái thành công!', data: registrations[idx] });
});

app.delete('/api/registrations/:id', requireAdmin, (req, res) => {
  const registrations = readJson('registrations.json', []);
  const filtered = registrations.filter(r => r.id !== req.params.id);
  writeJson('registrations.json', filtered);
  res.json({ success: true, message: 'Đã xóa đăng ký!' });
});

// Single-page fallback
app.get('/blog/:slug', (req, res) => {
  res.sendFile(path.join(__dirname, 'blog-detail.html'));
});

// 404 handler cho các yêu cầu không hợp lệ
app.use((req, res) => {
  res.status(404).send('<!DOCTYPE html><html><head><meta charset="utf-8"><title>404 Không tìm thấy</title></head><body style="font-family:sans-serif;text-align:center;padding:50px;"><h2>404 - Trang không tồn tại</h2><p><a href="/">Quay về trang chủ</a></p></body></html>');
});

// Khởi động máy chủ an toàn
app.listen(PORT, () => {
  console.log('==================================================');
  console.log(`🛡️  BẢO MẬT HỆ THỐNG ĐÃ KÍCH HOẠT (PORT: ${PORT})`);
  console.log(`🌐 Website:       http://localhost:${PORT}`);
  console.log(`📝 Blog Cầu Lông: http://localhost:${PORT}/blog.html`);
  console.log(`🔒 Admin CMS:     http://localhost:${PORT}/admin.html`);
  console.log('==================================================');
});
