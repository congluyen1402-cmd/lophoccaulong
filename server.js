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
  path.join(__dirname, 'uploads', 'blog'),
  path.join(__dirname, 'uploads', 'courses'),
  path.join(__dirname, 'uploads', 'hero')
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

// 4 THÀNH TÍCH HỌC VIÊN THỰC TẾ GỐC (BẢO LƯU VĨNH VIỄN, KHÔNG BAO GIỜ BỊ MẤT)
const DEFAULT_ACHIEVEMENTS = [
  {
    "id": "ach-1793766525539",
    "studentName": "Anh Nam",
    "award": "Huy Chương Đồng",
    "tournament": "Giải cầu lông nội bộ",
    "court": "Sân T12 (Quận 4)",
    "duration": "5 tháng tập luyện",
    "image": "/uploads/achievements/1793766525468-6327c1c1d1800a5ef4933503beb54a6d.jpg",
    "imagePosition": "center 54%",
    "imageFit": "cover",
    "quote": "\"Sau 5 tháng tập luyện cùng thầy Kevin tại Sân T12 Quận 4, mình đã tự tin thi đấu và đạt Huy Chương Đồng Giải cầu lông nội bộ! Thầy chỉ dẫn rất kỹ về bộ chân và tư duy di chuyển, giúp lối đánh của mình chắc chắn hơn nhiều.\"",
    "date": "2026-11-04",
    "featured": false
  },
  {
    "id": "ach-1793766455844",
    "studentName": "Anh Thư",
    "award": "Huy Chương Đồng",
    "tournament": "Giải cầu lông khoa kĩ thuật công trình 2024  DH Tôn Đức Thắng",
    "court": "Sân T12 (Quận 4)",
    "duration": "1 năm",
    "image": "/uploads/achievements/1793766455784-187313fad1307c77b3cbd598e341ab74.jpg",
    "imagePosition": "center 70%",
    "imageFit": "cover",
    "quote": "\"Tấm Huy Chương Đồng này là phần thưởng ý nghĩa sau 1 năm theo học cùng thầy Kevin ở Sân T12. Em rất cảm ơn thầy vì sự nhiệt huyết, luôn sửa từng lỗi sai và tiếp thêm động lực cho em trên sân đấu!\"",
    "date": "2026-11-04",
    "featured": false
  },
  {
    "id": "ach-1793766164876",
    "studentName": "Chị Ruby Nguyễn",
    "award": "Huy Chương Vàng",
    "tournament": "Giải cầu lông cty Akite Phile",
    "court": "Sân T12 (Quận 4)",
    "duration": "5 tháng tập luyện 1 : 1",
    "image": "/uploads/achievements/1793766163997-c11a4c1f9d3547544f74c8490fe42bd8.png",
    "imagePosition": "center 15%",
    "imageFit": "cover",
    "quote": "\"Nhờ 5 tháng tập luyện kèm 1:1 cùng thầy Kevin tại Sân T12 Quận 4, chị đã tự tin thi đấu và xuất sắc giành Huy Chương Vàng Giải cầu lông cty Akite Phile! Thầy kèm rất sát, sửa từng dáng đánh và bộ chân giúp kỹ thuật của chị tiến bộ vượt bậc.\"",
    "date": "2026-11-04",
    "featured": false
  },
  {
    "id": "ach-1793766091824",
    "studentName": "Chị Helen",
    "award": "Huy Chương Vàng",
    "tournament": "Giải cầu lông nội bộ nhóm AUDC BADMINTON",
    "court": "Sân Dni Sport (Quận 7)",
    "duration": "6 tháng tập luyện",
    "image": "/uploads/achievements/1793766091004-defbc1db51cbfea3cd42d174a833ad9b.jpg",
    "imagePosition": "center 15%",
    "imageFit": "cover",
    "quote": "\"Tấm Huy chương Vàng Giải Đồng đội nữ chính là thành quả tuyệt vời nhất sau thời gian theo học thầy Kevin ở sân Dni Sport. Cảm ơn thầy luôn kiên nhẫn, tiếp lửa và truyền động lực cho cả nhóm!\"",
    "date": "2026-11-04",
    "featured": false
  },
  {
    "id": "ach-1793766006071",
    "studentName": "Anh Thiên",
    "award": "Huy Chương Đồng",
    "tournament": "Giải cầu lông của cty TS OPEN",
    "court": "Sân Dni Sport (Quận 7)",
    "duration": "6 tháng tập luyện",
    "image": "/uploads/achievements/1793766005793-fe5ab1fd4e8724579d4d733c061b6178.jpg",
    "imagePosition": "center 15%",
    "imageFit": "cover",
    "quote": "\"Nhờ sự hướng dẫn tận tâm và giáo án bài bản của thầy Kevin tại sân Dni Sport, mình đã tự tin thi đấu và xuất sắc giành Huy chương Đồng Giải cầu lông TS OPEN Badminton! Thầy chỉnh sửa từng động tác và bộ chân rất chi tiết.\"",
    "date": "2026-11-04",
    "featured": false
  },
  {
    "id": "ach-1793765944057",
    "studentName": "Anh Hữu",
    "award": "Huy Chương Đồng",
    "tournament": "Giải cầu lông nội bộ CTY",
    "court": "Sân T12 (Quận 4)",
    "duration": "1 năm luyện tập",
    "image": "/uploads/achievements/1793765943629-2bf0e34f310441b452a15332255d2d24.jpg",
    "imagePosition": "center 15%",
    "imageFit": "cover",
    "quote": "\"Sau 1 năm kiên trì rèn luyện cùng thầy Kevin ở cả hai sân Quận 4 và Quận 7, mình đã tự tin giành Huy chương Đồng Giải cầu lông nội bộ Cty. Thầy chỉnh sửa động tác rất chi tiết, giáo án thực chiến giúp kỹ thuật và thể lực nâng lên rõ rệt!\"",
    "date": "2026-11-04",
    "featured": false
  },
  {
    "id": "ach-1793765898314",
    "studentName": "Anh Thư",
    "award": "Huy Chương Vàng",
    "tournament": "Giải cầu lông khoa kĩ thuật công trình DH Tôn Đức Thắng",
    "court": "Sân T12 (Quận 4)",
    "duration": "1 năm luyện tập",
    "image": "/uploads/achievements/1793765898220-b4cbb64ffe6431af7ce1221865dca6e6.jpg",
    "imagePosition": "center 15%",
    "imageFit": "contain",
    "quote": "\"Tấm Huy chương Vàng này là phần thưởng lớn sau 1 năm kiên trì rèn luyện. Em cảm ơn thầy Kevin ở sân T12 Quận 4 đã luôn nhiệt huyết chỉnh từng lỗi nhỏ và tiếp thêm động lực cho em trên sân đấu!\"",
    "date": "2026-11-04",
    "featured": false
  },
  {
    "id": "ach-1793765864462",
    "studentName": "Anh Nam",
    "award": "Huy Chương Đồng",
    "tournament": "MIAMINTON 2024",
    "court": "Sân T12 (Quận 4)",
    "duration": "6 tháng tập luyện 1:1",
    "image": "/uploads/achievements/1793765864281-67321045f19e52334b1a308acf277f97.jpg",
    "imagePosition": "center 15%",
    "imageFit": "cover",
    "quote": "Sau 6 tháng học kèm 1:1 cùng thầy Kevin tại Sân T12 Quận 4, mình đã tự tin thi đấu và đạt Huy chương Đồng giải MIAMINTON 2024! Giáo án kèm riêng cực kỳ sát sao, thầy chỉnh từng bước di chuyển và cổ tay giúp mình tiến bộ rất nhanh.\"",
    "date": "2026-11-04",
    "featured": false
  },
  {
    "id": "ach-1793765793967",
    "studentName": "Chị Loan",
    "award": "Huy Chương Đồng",
    "tournament": "GBA BADMINTON TOURNAMENT",
    "court": "Sân T12 (Quận 4)",
    "duration": "5 tháng tập luyện 1 : 1",
    "image": "/uploads/achievements/1793765793166-4bf8948a529f0491c1e8af7f4b9703d0.jpg",
    "imagePosition": "center 15%",
    "imageFit": "cover",
    "quote": "\"Tấm Huy Chương Đồng giải GBA BADMINTON TOURNAMENT là kết quả tuyệt vời sau 5 tháng tập luyện cùng thầy Kevin ở Sân T12. Cảm ơn thầy luôn nhiệt huyết, kiên nhẫn chỉnh sửa lỗi kỹ thuật và tiếp lửa đam mê cho học viên!\"",
    "date": "2026-11-04",
    "featured": false
  },
  {
    "id": "ach-helen",
    "studentName": "Chị Helen",
    "award": "Huy chương Vàng",
    "tournament": "Giải Đồng đội nữ",
    "court": "Sân Dni Sport (Quận 7)",
    "duration": "6 tháng tập luyện",
    "image": "/uploads/achievements/1793766273760-cb181182bcc04f25c29d9e380d6ccd4d.jpg",
    "imagePosition": "center 15%",
    "imageFit": "cover",
    "quote": "Nhờ sự hướng dẫn tận tâm và giáo án bài bản của thầy Kevin tại sân Dni Sport, chị và đồng đội đã xuất sắc giành Huy chương Vàng.",
    "date": "2026-11-04",
    "featured": true
  },
  {
    "id": "ach-anh-thu",
    "studentName": "Anh Thư",
    "award": "Huy Chương Đồng",
    "tournament": "Giải cầu lông sinh viên ĐH Tôn Đức Thắng",
    "court": "Sân Dni Sport (Quận 7)",
    "duration": "1 năm",
    "image": "/uploads/achievements/1793765735582-3c397c171246f9b0059d7eca1401e78a.jpg",
    "imagePosition": "center 15%",
    "imageFit": "cover",
    "quote": "Tấm Huy chương Đồng giải sinh viên ĐH Tôn Đức Thắng là kết quả xứng đáng sau 1 năm rèn luyện. Em cảm ơn thầy Kevin!",
    "date": "2026-11-04",
    "featured": true
  },
  {
    "id": "ach-anh-long",
    "studentName": "Anh Long",
    "award": "Huy chương vàng",
    "tournament": "Giải Cty Bds MQ",
    "court": "Cả 2 sân Q4 & Q7",
    "duration": "5 tháng",
    "image": "/uploads/achievements/1793765724407-f1194420f4713b40bad73d7dc9d9695d.jpg",
    "imagePosition": "center 44%",
    "imageFit": "cover",
    "quote": "Từ những ngày đầu bỡ ngỡ, sau 5 tháng kiên trì tập luyện tại sân T12 và sân Dni sport Q7, mình đ�� tự tin thi đấu và đạt Huy chương Vàng.",
    "date": "2026-11-04",
    "featured": true
  },
  {
    "id": "ach-nhom-t12",
    "studentName": "Nhóm cầu lông sân T12",
    "award": "Huy chương bạc",
    "tournament": "Giải nội bộ nhóm cầu lông năm 2025",
    "court": "Sân T12 (Quận 4)",
    "duration": "5 tháng",
    "image": "/uploads/achievements/1793765956147-b69c83c8230efe6357fca766ce891a3f.jpg",
    "imagePosition": "center 15%",
    "imageFit": "cover",
    "quote": "5 tháng rèn luyện tại Sân T12 Quận 4 và tấm Huy chương Bạc là câu trả lời rõ nhất cho chất lượng đào tạo ở đây. Cảm ơn thầy!",
    "date": "2026-11-04",
    "featured": true
  }
];

function readJson(filename, defaultValue = []) {
  try {
    const filePath = getDataPath(filename);
    if (!fs.existsSync(filePath)) {
      const fallbackVal = (filename === 'achievements.json' && defaultValue.length === 0) 
        ? DEFAULT_ACHIEVEMENTS 
        : defaultValue;
      fs.writeFileSync(filePath, JSON.stringify(fallbackVal, null, 2), 'utf8');
      return fallbackVal;
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    if (!raw.trim()) {
      return (filename === 'achievements.json') ? DEFAULT_ACHIEVEMENTS : defaultValue;
    }
    const parsed = JSON.parse(raw);
    if (filename === 'achievements.json' && Array.isArray(parsed) && parsed.length === 0) {
      fs.writeFileSync(filePath, JSON.stringify(DEFAULT_ACHIEVEMENTS, null, 2), 'utf8');
      return DEFAULT_ACHIEVEMENTS;
    }
    return parsed;
  } catch (err) {
    console.error(`Error reading ${filename}:`, err.message);
    return (filename === 'achievements.json') ? DEFAULT_ACHIEVEMENTS : defaultValue;
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

// Phục vụ file tĩnh & cơ chế fallback chống lỗi 404 ảnh
app.use('/uploads', (req, res, next) => {
  const reqPath = decodeURIComponent(req.path);
  const directPath = path.join(__dirname, 'uploads', reqPath);
  if (fs.existsSync(directPath) && fs.statSync(directPath).isFile()) {
    return res.sendFile(directPath);
  }
  // Tìm kiếm dự phòng trên tất cả các thư mục con trong uploads (tránh lỗi lệch folder lưu ảnh)
  const filename = path.basename(reqPath);
  if (filename) {
    const candidateFolders = ['blog', 'achievements', 'courses', 'hero', ''];
    for (const sub of candidateFolders) {
      const candidatePath = path.join(__dirname, 'uploads', sub, filename);
      if (fs.existsSync(candidatePath) && fs.statSync(candidatePath).isFile()) {
        return res.sendFile(candidatePath);
      }
    }
  }
  next();
});
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use(express.static(path.join(__dirname)));

// Cấu hình Multer upload file tuyệt đối an toàn
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let folder = 'achievements';
    const originalUrl = req.originalUrl || req.url || '';
    if (req.query.folder === 'blog' || originalUrl.includes('/api/posts') || file.fieldname === 'coverImageFile') {
      folder = 'blog';
    } else if (req.query.folder === 'courses' || originalUrl.includes('/api/courses') || file.fieldname === 'courseImageFile') {
      folder = 'courses';
    } else if (req.query.folder === 'hero' || originalUrl.includes('/api/hero') || file.fieldname === 'heroImageFile') {
      folder = 'hero';
    } else if (req.query.folder === 'achievements' || originalUrl.includes('/api/achievements') || file.fieldname === 'imageFile') {
      folder = 'achievements';
    }
    const dest = path.join(__dirname, 'uploads', folder);
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    cb(null, dest);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    // Tạo tên file ngẫu nhiên bằng chuỗi mã hóa cryptographically secure để không bị trùng hoặc đoán trước
    const randomHex = crypto.randomBytes(16).toString('hex');
    cb(null, `${Date.now()}-${randomHex}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.jfif'];
  const ext = path.extname(file.originalname).toLowerCase();
  const isImageMime = file.mimetype && file.mimetype.startsWith('image/');

  if (allowedExts.includes(ext) || isImageMime) {
    cb(null, true);
  } else {
    cb(new Error('Chỉ chấp nhận file hình ảnh hợp lệ (JPG, PNG, WEBP, GIF)!'));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // Tối đa 15MB
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
    imagePosition: sanitizeInput(body.imagePosition || 'center 15%'),
    imageFit: sanitizeInput(body.imageFit || 'cover'),
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

app.put('/api/achievements/:id', requireAdmin, upload.single('imageFile'), (req, res) => {
  const achievements = readJson('achievements.json', []);
  const idx = achievements.findIndex(a => a.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy thành tích!' });
  }

  const body = req.body;
  let imageUrl = achievements[idx].image;
  if (req.file) {
    imageUrl = `/uploads/achievements/${req.file.filename}`;
  } else if (body.imageUrl) {
    imageUrl = sanitizeInput(body.imageUrl);
  }

  achievements[idx] = {
    ...achievements[idx],
    studentName: body.studentName !== undefined ? sanitizeInput(body.studentName) : achievements[idx].studentName,
    award: body.award !== undefined ? sanitizeInput(body.award) : achievements[idx].award,
    tournament: body.tournament !== undefined ? sanitizeInput(body.tournament) : achievements[idx].tournament,
    court: body.court !== undefined ? sanitizeInput(body.court) : achievements[idx].court,
    duration: body.duration !== undefined ? sanitizeInput(body.duration) : achievements[idx].duration,
    image: imageUrl,
    imagePosition: body.imagePosition !== undefined ? sanitizeInput(body.imagePosition) : (achievements[idx].imagePosition || 'center 15%'),
    imageFit: body.imageFit !== undefined ? sanitizeInput(body.imageFit) : (achievements[idx].imageFit || 'cover'),
    quote: body.quote !== undefined ? sanitizeInput(body.quote) : achievements[idx].quote,
    date: body.date !== undefined ? sanitizeInput(body.date) : achievements[idx].date
  };

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

app.post('/api/achievements/reorder', requireAdmin, (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids)) {
    return res.status(400).json({ success: false, message: 'Dữ liệu ids không hợp lệ!' });
  }

  const achievements = readJson('achievements.json', []);
  const map = new Map(achievements.map(item => [item.id, item]));

  const reordered = [];
  ids.forEach(id => {
    if (map.has(id)) {
      reordered.push(map.get(id));
      map.delete(id);
    }
  });

  for (const remaining of map.values()) {
    reordered.push(remaining);
  }

  writeJson('achievements.json', reordered);
  res.json({ success: true, message: 'Cập nhật thứ tự thành tích thành công!', count: reordered.length });
});

// =================================================================
// 6.1 COURSES (CÁC KHÓA HỌC CẦU LÔNG - HÌNH 1)
// =================================================================
app.get('/api/courses', (req, res) => {
  const courses = readJson('courses.json', []);
  res.json({ success: true, count: courses.length, data: courses });
});

app.put('/api/courses/:id', requireAdmin, upload.single('imageFile'), (req, res) => {
  const courses = readJson('courses.json', []);
  const idx = courses.findIndex(c => c.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy khóa học!' });
  }

  const body = req.body;
  let imageUrl = courses[idx].image;
  if (req.file) {
    imageUrl = `/uploads/courses/${req.file.filename}`;
  } else if (body.imageUrl) {
    imageUrl = sanitizeInput(body.imageUrl);
  }

  let features = courses[idx].features;
  if (body.features !== undefined) {
    if (Array.isArray(body.features)) {
      features = body.features.map(f => sanitizeInput(f)).filter(Boolean);
    } else if (typeof body.features === 'string') {
      features = body.features.split('\n').map(f => sanitizeInput(f.replace(/^[•\-✓\*\s]+/, ''))).filter(Boolean);
    }
  }

  courses[idx] = {
    ...courses[idx],
    title: body.title !== undefined ? sanitizeInput(body.title) : courses[idx].title,
    badge: body.badge !== undefined ? sanitizeInput(body.badge) : courses[idx].badge,
    summary: body.summary !== undefined ? sanitizeInput(body.summary) : courses[idx].summary,
    image: imageUrl,
    imagePosition: body.imagePosition !== undefined ? sanitizeInput(body.imagePosition) : (courses[idx].imagePosition || 'center 20%'),
    imageFit: body.imageFit !== undefined ? sanitizeInput(body.imageFit) : (courses[idx].imageFit || 'cover'),
    features: features,
    actionTag: body.actionTag !== undefined ? sanitizeInput(body.actionTag) : courses[idx].actionTag
  };

  writeJson('courses.json', courses);
  res.json({ success: true, message: 'Cập nhật khóa học thành công!', data: courses[idx] });
});

app.post('/api/courses/reorder', requireAdmin, (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids)) {
    return res.status(400).json({ success: false, message: 'Dữ liệu ids không hợp lệ!' });
  }

  const courses = readJson('courses.json', []);
  const map = new Map(courses.map(c => [c.id, c]));

  const reordered = [];
  ids.forEach(id => {
    if (map.has(id)) {
      reordered.push(map.get(id));
      map.delete(id);
    }
  });

  for (const remaining of map.values()) {
    reordered.push(remaining);
  }

  writeJson('courses.json', reordered);
  res.json({ success: true, message: 'Cập nhật thứ tự khóa học thành công!', count: reordered.length });
});

// =================================================================
// 6.2 HERO BANNER (HÌNH ẢNH & CẤU HÌNH BANNER TRANG CHỦ - HÌNH 2)
// =================================================================
app.get('/api/hero', (req, res) => {
  const config = readJson('site_config.json', {
    heroImage: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1000&q=80',
    heroImagePosition: 'center 25%',
    heroImageFit: 'cover',
    badgeSub: 'Sân tập tiêu chuẩn',
    badgeTitle: 'Thảm PVC chống trượt BWF',
    badgeLocation: 'Q4 • Q7'
  });
  res.json({ success: true, data: config });
});

app.put('/api/hero', requireAdmin, upload.single('heroImageFile'), (req, res) => {
  const current = readJson('site_config.json', {
    heroImage: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1000&q=80',
    heroImagePosition: 'center 25%',
    heroImageFit: 'cover',
    badgeSub: 'Sân tập tiêu chuẩn',
    badgeTitle: 'Thảm PVC chống trượt BWF',
    badgeLocation: 'Q4 • Q7'
  });

  const body = req.body;
  let heroImage = current.heroImage;
  if (req.file) {
    heroImage = `/uploads/hero/${req.file.filename}`;
  } else if (body.heroImageUrl) {
    heroImage = sanitizeInput(body.heroImageUrl);
  }

  const updated = {
    ...current,
    heroImage: heroImage,
    heroImagePosition: body.heroImagePosition !== undefined ? sanitizeInput(body.heroImagePosition) : (current.heroImagePosition || 'center 25%'),
    heroImageFit: body.heroImageFit !== undefined ? sanitizeInput(body.heroImageFit) : (current.heroImageFit || 'cover'),
    badgeSub: body.badgeSub !== undefined ? sanitizeInput(body.badgeSub) : current.badgeSub,
    badgeTitle: body.badgeTitle !== undefined ? sanitizeInput(body.badgeTitle) : current.badgeTitle,
    badgeLocation: body.badgeLocation !== undefined ? sanitizeInput(body.badgeLocation) : current.badgeLocation
  };

  writeJson('site_config.json', updated);
  res.json({ success: true, message: 'Cập nhật cấu hình Hero Banner thành công!', data: updated });
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
    imagePosition: sanitizeInput(body.imagePosition || 'center 20%'),
    imageFit: sanitizeInput(body.imageFit || 'cover'),
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

app.put('/api/posts/:id', requireAdmin, upload.single('coverImageFile'), (req, res) => {
  const posts = readJson('posts.json', []);
  const idx = posts.findIndex(p => p.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết để sửa!' });
  }

  const body = req.body;
  let coverImage = posts[idx].coverImage;
  if (req.file) {
    coverImage = `/uploads/blog/${req.file.filename}`;
  } else if (body.coverImage) {
    coverImage = sanitizeInput(body.coverImage);
  }

  let parsedTags = posts[idx].tags || [];
  if (Array.isArray(body.tags)) {
    parsedTags = body.tags.map(sanitizeInput);
  } else if (typeof body.tags === 'string' && body.tags.trim()) {
    parsedTags = body.tags.split(',').map(t => sanitizeInput(t.trim())).filter(Boolean);
  }

  posts[idx] = {
    ...posts[idx],
    ...body,
    coverImage,
    tags: parsedTags,
    imagePosition: body.imagePosition ? sanitizeInput(body.imagePosition) : (posts[idx].imagePosition || 'center 20%'),
    imageFit: body.imageFit ? sanitizeInput(body.imageFit) : (posts[idx].imageFit || 'cover')
  };
  writeJson('posts.json', posts);
  res.json({ success: true, message: 'Cập nhật bài viết thành công!', data: posts[idx] });
});

app.delete('/api/posts/:id', requireAdmin, (req, res) => {
  const posts = readJson('posts.json', []);
  const filtered = posts.filter(p => p.id !== req.params.id);
  writeJson('posts.json', filtered);
  res.json({ success: true, message: 'Đã xóa bài viết thành công!' });
});

app.post('/api/posts/reorder', requireAdmin, (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids)) {
    return res.status(400).json({ success: false, message: 'Dữ liệu ids không hợp lệ!' });
  }

  const posts = readJson('posts.json', []);
  const map = new Map(posts.map(item => [item.id, item]));

  const reordered = [];
  ids.forEach(id => {
    if (map.has(id)) {
      reordered.push(map.get(id));
      map.delete(id);
    }
  });

  for (const remaining of map.values()) {
    reordered.push(remaining);
  }

  writeJson('posts.json', reordered);
  res.json({ success: true, message: 'Cập nhật thứ tự bài viết thành công!', count: reordered.length });
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

// =================================================================
// 9. SAO LƯU & PHỤC HỒI DỮ LIỆU AN TOÀN (ANTI-DATA-LOSS BACKUP SYSTEM)
// =================================================================
app.get('/api/backup', requireAdmin, (req, res) => {
  try {
    const backupData = {
      app: 'lophoccaulong.com',
      exportDate: new Date().toISOString(),
      timestamp: Date.now(),
      achievements: readJson('achievements.json', DEFAULT_ACHIEVEMENTS),
      courses: readJson('courses.json', []),
      site_config: readJson('site_config.json', {}),
      posts: readJson('posts.json', []),
      registrations: readJson('registrations.json', [])
    };
    res.json({
      success: true,
      message: 'Xuất bản sao lưu hệ thống thành công!',
      backup: backupData
    });
  } catch (err) {
    console.error('Lỗi khi xuất sao lưu:', err);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi tạo bản sao lưu: ' + err.message });
  }
});

app.post('/api/backup/restore', requireAdmin, (req, res) => {
  try {
    const body = req.body || {};
    const payload = body.backup || body.data || body;

    let restoredInfo = [];
    const timestamp = Date.now();

    // 1. Phục hồi Thành Tích Học Viên (Nếu có dữ liệu hợp lệ)
    if (Array.isArray(payload.achievements) && payload.achievements.length > 0) {
      writeJson('achievements.json', payload.achievements);
      restoredInfo.push(`${payload.achievements.length} thành tích học viên`);
    }

    // 2. Phục hồi Khóa Học
    if (Array.isArray(payload.courses) && payload.courses.length > 0) {
      writeJson('courses.json', payload.courses);
      restoredInfo.push(`${payload.courses.length} khóa học`);
    }

    // 3. Phục hồi Cấu Hình Banner Hero
    if (payload.site_config && typeof payload.site_config === 'object' && Object.keys(payload.site_config).length > 0) {
      writeJson('site_config.json', payload.site_config);
      restoredInfo.push('Cấu hình Banner Hero');
    }

    // 4. Phục hồi Bài Viết Blog
    if (Array.isArray(payload.posts) && payload.posts.length > 0) {
      writeJson('posts.json', payload.posts);
      restoredInfo.push(`${payload.posts.length} bài viết Blog`);
    }

    // 5. Phục hồi Danh Sách Đăng Ký
    if (Array.isArray(payload.registrations) && payload.registrations.length > 0) {
      writeJson('registrations.json', payload.registrations);
      restoredInfo.push(`${payload.registrations.length} lượt đăng ký học viên`);
    }

    if (restoredInfo.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu sao lưu không hợp lệ hoặc không có nội dung để khôi phục!'
      });
    }

    res.json({
      success: true,
      message: `Khôi phục thành công: ${restoredInfo.join(', ')}!`,
      restored: restoredInfo
    });
  } catch (err) {
    console.error('Lỗi khi phục hồi sao lưu:', err);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi phục hồi dữ liệu: ' + err.message });
  }
});

// Trang thông tin Huấn luyện viên
app.get('/huan-luyen-vien', (req, res) => {
  res.sendFile(path.join(__dirname, 'huan-luyen-vien.html'));
});
app.get('/hlv', (req, res) => {
  res.sendFile(path.join(__dirname, 'huan-luyen-vien.html'));
});

// Single-page fallback
app.get('/blog/:slug', (req, res) => {
  res.sendFile(path.join(__dirname, 'blog-detail.html'));
});

// Phục vụ file xác thực Google Search Console
app.get('/google:hash.html', (req, res) => {
  const file = `google${req.params.hash}.html`;
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }
  res.status(404).send('Google verification file not found');
});

// Middleware xử lý lỗi upload Multer & lỗi server tập trung
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, message: 'Dung lượng ảnh vượt quá giới hạn 15MB!' });
    }
    return res.status(400).json({ success: false, message: `Lỗi tải tệp: ${err.message}` });
  }
  if (err && (err.message || '').includes('hình ảnh')) {
    return res.status(400).json({ success: false, message: err.message });
  }
  if (err) {
    console.error('Lỗi máy chủ:', err);
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống: ' + (err.message || 'Không xác định') });
  }
  next();
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
