const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Security / Admin Credentials (easily customized via ENV)
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'caulong2026';
const AUTH_TOKEN = 'token_admin_' + Buffer.from(ADMIN_PASS).toString('base64');

// Ensure necessary directories exist
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

// Helper functions for reading/writing JSON data
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
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Error reading ${filename}:`, err);
    return defaultValue;
  }
}

function writeJson(filename, data) {
  try {
    const filePath = getDataPath(filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error(`Error writing ${filename}:`, err);
    return false;
  }
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Serve static frontend files
app.use(express.static(path.join(__dirname)));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const folder = req.query.folder === 'blog' ? 'blog' : 'achievements';
    const dest = path.join(__dirname, 'uploads', folder);
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    cb(null, dest);
  },
  filename: function (req, file, cb) {
    const cleanName = file.originalname.toLowerCase().replace(/[^a-z0-9.]/g, '-');
    const ext = path.extname(cleanName) || '.jpg';
    const base = path.basename(cleanName, ext).substring(0, 30);
    const uniqueName = `${Date.now()}-${base}${ext}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp|gif/;
  const ext = allowed.test(path.extname(file.originalname).toLowerCase());
  const mime = allowed.test(file.mimetype);
  if (ext && mime) {
    cb(null, true);
  } else {
    cb(new Error('Chỉ chấp nhận file ảnh định dạng JPG, PNG, WEBP, GIF!'));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: fileFilter
});

// Middleware for Admin Authentication
function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ success: false, message: 'Yêu cầu đăng nhập quản trị viên' });
  }
  const token = authHeader.replace(/^Bearer\s+/, '').trim();
  if (token === AUTH_TOKEN) {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn' });
  }
}

// -------------------------------------------------------------
// AUTH ROUTES
// -------------------------------------------------------------
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    return res.json({
      success: true,
      token: AUTH_TOKEN,
      user: { username: ADMIN_USER, role: 'admin' },
      message: 'Đăng nhập thành công!'
    });
  }
  return res.status(401).json({
    success: false,
    message: 'Tài khoản hoặc mật khẩu không chính xác! (Mặc định: admin / caulong2026)'
  });
});

app.get('/api/auth/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader ? authHeader.replace(/^Bearer\s+/, '').trim() : '';
  if (token === AUTH_TOKEN) {
    return res.json({ success: true, user: { username: ADMIN_USER, role: 'admin' } });
  }
  return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });
});

// -------------------------------------------------------------
// IMAGE UPLOAD API
// -------------------------------------------------------------
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Chưa chọn file ảnh!' });
  }
  const folder = req.query.folder === 'blog' ? 'blog' : 'achievements';
  const fileUrl = `/uploads/${folder}/${req.file.filename}`;
  res.json({
    success: true,
    url: fileUrl,
    filename: req.file.filename,
    message: 'Tải ảnh lên thành công!'
  });
});

// -------------------------------------------------------------
// ACHIEVEMENTS (THÀNH TÍCH HỌC VIÊN) ROUTES
// -------------------------------------------------------------
app.get('/api/achievements', (req, res) => {
  const achievements = readJson('achievements.json', []);
  res.json({ success: true, count: achievements.length, data: achievements });
});

app.post('/api/achievements', upload.single('imageFile'), (req, res) => {
  const achievements = readJson('achievements.json', []);
  const body = req.body;

  let imageUrl = body.imageUrl || '';
  if (req.file) {
    imageUrl = `/uploads/achievements/${req.file.filename}`;
  }

  if (!imageUrl) {
    imageUrl = 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80';
  }

  const newAchievement = {
    id: 'ach-' + Date.now(),
    studentName: body.studentName || 'Học viên Lớp Học Cầu Lông Q4 & Q7',
    award: body.award || 'Huy Chương Danh Dự',
    tournament: body.tournament || 'Giải Cầu Lông Phong Trào TP.HCM',
    court: body.court || 'Sân Dni Sport (Quận 7)',
    duration: body.duration || 'Học viên khóa cơ bản',
    image: imageUrl,
    quote: body.quote || 'Tự tin thi đấu và đạt thành tích xuất sắc sau khóa học.',
    date: body.date || new Date().toISOString().split('T')[0],
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

app.put('/api/achievements/:id', (req, res) => {
  const achievements = readJson('achievements.json', []);
  const idx = achievements.findIndex(a => a.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy thành tích!' });
  }

  achievements[idx] = { ...achievements[idx], ...req.body };
  writeJson('achievements.json', achievements);

  res.json({
    success: true,
    message: 'Cập nhật thành tích thành công!',
    data: achievements[idx]
  });
});

app.delete('/api/achievements/:id', (req, res) => {
  const achievements = readJson('achievements.json', []);
  const filtered = achievements.filter(a => a.id !== req.params.id);
  if (filtered.length === achievements.length) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy thành tích để xóa!' });
  }

  writeJson('achievements.json', filtered);
  res.json({ success: true, message: 'Đã xóa thành tích học viên!' });
});

// -------------------------------------------------------------
// BLOG POSTS (SEO ARTICLES) ROUTES
// -------------------------------------------------------------
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
    const q = search.toLowerCase();
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

app.post('/api/posts', upload.single('coverImageFile'), (req, res) => {
  const posts = readJson('posts.json', []);
  const body = req.body;

  let coverImage = body.coverImage || '';
  if (req.file) {
    coverImage = `/uploads/blog/${req.file.filename}`;
  }
  if (!coverImage) {
    coverImage = 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1000&q=80';
  }

  // Generate SEO slug if not provided
  let slug = body.slug || '';
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

  // Ensure unique slug
  let uniqueSlug = slug;
  let counter = 1;
  while (posts.some(p => p.slug === uniqueSlug)) {
    uniqueSlug = `${slug}-${counter}`;
    counter++;
  }

  let parsedTags = [];
  if (Array.isArray(body.tags)) {
    parsedTags = body.tags;
  } else if (typeof body.tags === 'string') {
    parsedTags = body.tags.split(',').map(t => t.trim()).filter(Boolean);
  }

  const newPost = {
    id: 'post-' + Date.now(),
    title: body.title || 'Bài viết kỹ thuật cầu lông mới',
    slug: uniqueSlug,
    category: body.category || 'Kỹ thuật cầu lông',
    author: body.author || 'Ban Huấn Luyện - lophoccaulong.com',
    date: body.date || new Date().toISOString().split('T')[0],
    readTime: body.readTime || '5 phút đọc',
    coverImage: coverImage,
    summary: body.summary || '',
    content: body.content || '',
    tags: parsedTags,
    metaTitle: body.metaTitle || (body.title + ' | lophoccaulong.com'),
    metaDesc: body.metaDesc || body.summary || ''
  };

  posts.unshift(newPost);
  writeJson('posts.json', posts);

  res.status(201).json({
    success: true,
    message: 'Đăng bài viết mới thành công!',
    data: newPost
  });
});

app.put('/api/posts/:id', (req, res) => {
  const posts = readJson('posts.json', []);
  const idx = posts.findIndex(p => p.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết để sửa!' });
  }

  posts[idx] = { ...posts[idx], ...req.body };
  writeJson('posts.json', posts);

  res.json({
    success: true,
    message: 'Cập nhật bài viết thành công!',
    data: posts[idx]
  });
});

app.delete('/api/posts/:id', (req, res) => {
  const posts = readJson('posts.json', []);
  const filtered = posts.filter(p => p.id !== req.params.id);
  if (filtered.length === posts.length) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết để xóa!' });
  }

  writeJson('posts.json', filtered);
  res.json({ success: true, message: 'Đã xóa bài viết thành công!' });
});

// -------------------------------------------------------------
// REGISTRATIONS (LEADS TỪ LANDING PAGE & BLOG)
// -------------------------------------------------------------
app.get('/api/registrations', (req, res) => {
  const registrations = readJson('registrations.json', []);
  res.json({ success: true, count: registrations.length, data: registrations });
});

app.post('/api/registrations', (req, res) => {
  const registrations = readJson('registrations.json', []);
  const { name, phone, course, court, timeSlot, note } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ success: false, message: 'Vui lòng nhập họ tên và số điện thoại!' });
  }

  const newReg = {
    id: 'reg_' + Date.now(),
    name: name.trim(),
    phone: phone.trim(),
    course: course || 'Khóa Cầu Lông Cơ Bản',
    court: court || 'Sân T12 Q4 hoặc Sân Dni Sport Q7',
    timeSlot: timeSlot || 'Chưa chọn ca học cụ thể',
    note: note ? note.trim() : '',
    status: 'new', // new, contacted, trial_scheduled, enrolled, cancelled
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

app.patch('/api/registrations/:id', (req, res) => {
  const registrations = readJson('registrations.json', []);
  const idx = registrations.findIndex(r => r.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin đăng ký!' });
  }

  if (req.body.status) {
    registrations[idx].status = req.body.status;
  }
  if (req.body.adminNote) {
    registrations[idx].adminNote = req.body.adminNote;
  }

  writeJson('registrations.json', registrations);
  res.json({ success: true, message: 'Cập nhật trạng thái thành công!', data: registrations[idx] });
});

app.delete('/api/registrations/:id', (req, res) => {
  const registrations = readJson('registrations.json', []);
  const filtered = registrations.filter(r => r.id !== req.params.id);
  writeJson('registrations.json', filtered);
  res.json({ success: true, message: 'Đã xóa đăng ký!' });
});

// Fallback for HTML pages
app.get('/blog/:slug', (req, res) => {
  res.sendFile(path.join(__dirname, 'blog-detail.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log('==================================================');
  console.log(`🏸 SERVER LỚP HỌC CẦU LÔNG Q4 & Q7 ĐANG CHẠY TẠI:`);
  console.log(`🌐 Website:       http://localhost:${PORT}`);
  console.log(`📝 Blog Cầu Lông: http://localhost:${PORT}/blog.html`);
  console.log(`⚙️  Admin CMS:     http://localhost:${PORT}/admin.html`);
  console.log(`🔑 Tài khoản mặc định: admin / caulong2026`);
  console.log('==================================================');
});

