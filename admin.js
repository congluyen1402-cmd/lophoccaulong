// ==============================================================
// ADMIN CMS JAVASCRIPT - LOPHOCAULONG.COM
// ==============================================================

const API_BASE = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
  ? ''
  : '';

let AUTH_TOKEN = localStorage.getItem('caulong_admin_token') || '';
let achievementsData = [];
let postsData = [];
let leadsData = [];

// Initialize Lucide Icons
function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// --------------------------------------------------------------
// AUTHENTICATION LOGIC
// --------------------------------------------------------------
const loginModal = document.getElementById('login-modal');
const formLogin = document.getElementById('form-login');
const loginError = document.getElementById('login-error');
const btnLogout = document.getElementById('btn-logout');

function checkAuth() {
  if (!AUTH_TOKEN) {
    loginModal.classList.remove('hidden');
    return;
  }
  // Verify token with server
  fetch('/api/auth/verify', {
    headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
  })
  .then(res => {
    if (!res.ok) throw new Error('Unauthorized');
    return res.json();
  })
  .then(data => {
    if (data.success) {
      loginModal.classList.add('hidden');
      initDashboard();
    } else {
      throw new Error('Invalid token');
    }
  })
  .catch(() => {
    // If backend isn't running or token invalid
    AUTH_TOKEN = '';
    localStorage.removeItem('caulong_admin_token');
    loginModal.classList.remove('hidden');
  });
}

formLogin.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value.trim();
  loginError.classList.add('hidden');

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (data.success && data.token) {
      AUTH_TOKEN = data.token;
      localStorage.setItem('caulong_admin_token', AUTH_TOKEN);
      loginModal.classList.add('hidden');
      initDashboard();
    } else {
      loginError.textContent = data.message || 'Sai tài khoản hoặc mật khẩu!';
      loginError.classList.remove('hidden');
    }
  } catch (err) {
    console.error('Login error:', err);
    loginError.textContent = 'Không thể kết nối đến Backend Server! Hãy đảm bảo bạn đã chạy lệnh "node server.js" trong terminal.';
    loginError.classList.remove('hidden');
  }
});

btnLogout.addEventListener('click', () => {
  AUTH_TOKEN = '';
  localStorage.removeItem('caulong_admin_token');
  window.location.reload();
});

// --------------------------------------------------------------
// TAB SWITCHING
// --------------------------------------------------------------
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

tabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const targetTab = btn.getAttribute('data-tab');
    tabButtons.forEach(b => {
      b.classList.remove('active');
      b.classList.add('text-slate-600');
    });
    btn.classList.add('active');
    btn.classList.remove('text-slate-600');

    tabContents.forEach(tc => {
      if (tc.id === targetTab) {
        tc.classList.remove('hidden');
        tc.classList.add('block');
      } else {
        tc.classList.add('hidden');
        tc.classList.remove('block');
      }
    });
    refreshIcons();
  });
});

// --------------------------------------------------------------
// INITIALIZE DASHBOARD & DATA FETCH
// --------------------------------------------------------------
function initDashboard() {
  loadAchievements();
  loadPosts();
  loadLeads();
  setupImageDropzones();
  setupPostEditor();
  setupFramingControls();
  setupChangePassword();
}

function setupChangePassword() {
  const formChangePw = document.getElementById('form-change-password');
  if (!formChangePw) return;

  formChangePw.addEventListener('submit', async (e) => {
    e.preventDefault();
    const currentPassword = document.getElementById('pw-current').value;
    const newPassword = document.getElementById('pw-new').value;
    const confirmPassword = document.getElementById('pw-confirm').value;
    const msg = document.getElementById('pw-msg');

    if (newPassword !== confirmPassword) {
      msg.textContent = 'Mật khẩu xác nhận không khớp!';
      msg.className = 'text-xs p-2 rounded-lg bg-red-50 text-red-600 border border-red-200 block';
      return;
    }

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AUTH_TOKEN}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (data.success) {
        alert('Đổi mật khẩu thành công! Bạn vui lòng đăng nhập lại bằng mật khẩu mới.');
        AUTH_TOKEN = '';
        localStorage.removeItem('caulong_admin_token');
        window.location.reload();
      } else {
        msg.textContent = data.message || 'Lỗi khi đổi mật khẩu!';
        msg.className = 'text-xs p-2 rounded-lg bg-red-50 text-red-600 border border-red-200 block';
      }
    } catch (err) {
      msg.textContent = 'Không thể kết nối máy chủ!';
      msg.className = 'text-xs p-2 rounded-lg bg-red-50 text-red-600 border border-red-200 block';
    }
  });
}

// --------------------------------------------------------------
// 1. ACHIEVEMENTS (THÀNH TÍCH HỌC VIÊN)
// --------------------------------------------------------------
const achListContainer = document.getElementById('achievements-list');
const achCountBadge = document.getElementById('ach-count-badge');
const statAchievementsCount = document.getElementById('stat-achievements-count');
const formAddAch = document.getElementById('form-add-achievement');

async function loadAchievements() {
  try {
    const res = await fetch('/api/achievements');
    const json = await res.json();
    if (json.success) {
      achievementsData = json.data;
      renderAchievements();
    }
  } catch (err) {
    console.error('Lỗi tải thành tích:', err);
    // Fallback directly to json file if accessed statically
    try {
      const resLocal = await fetch('data/achievements.json');
      achievementsData = await resLocal.json();
      renderAchievements();
    } catch (e) {
      achListContainer.innerHTML = '<p class="text-xs text-red-500">Chưa kết nối được máy chủ hoặc file dữ liệu.</p>';
    }
  }
}

function renderAchievements() {
  achCountBadge.textContent = achievementsData.length;
  statAchievementsCount.textContent = achievementsData.length;

  if (achievementsData.length === 0) {
    achListContainer.innerHTML = `
      <div class="col-span-full py-12 text-center bg-white rounded-2xl border border-slate-200">
        <i data-lucide="award" class="w-12 h-12 text-slate-300 mx-auto mb-2"></i>
        <p class="text-sm font-semibold text-slate-600">Chưa có thành tích học viên nào</p>
        <p class="text-xs text-slate-400">Hãy thêm thành tích đầu tiên bằng biểu mẫu bên trái.</p>
      </div>
    `;
    refreshIcons();
    return;
  }

  achListContainer.innerHTML = achievementsData.map(item => `
    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col group hover:border-emerald-500/50 transition">
      <div class="relative h-44 bg-slate-900 overflow-hidden">
        <img src="${item.image}" alt="${item.studentName}"
             style="object-position: ${item.imagePosition || 'center 15%'}; object-fit: ${item.imageFit || 'cover'};"
             class="w-full h-full group-hover:scale-105 transition duration-500"
             onerror="this.src='https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80'">
        <div class="absolute top-3 left-3 bg-amber-500 text-white font-bold text-[11px] px-2.5 py-1 rounded-full shadow flex items-center gap-1">
          <i data-lucide="award" class="w-3.5 h-3.5"></i> ${item.award}
        </div>
        <div class="absolute bottom-2 right-2 bg-slate-900/80 backdrop-blur text-white text-[11px] px-2 py-0.5 rounded-md">
          ${item.court || 'Sân Q4 / Q7'}
        </div>
      </div>
      <div class="p-4 flex-1 flex flex-col justify-between">
        <div>
          <h4 class="font-bold font-heading text-slate-900 text-base mb-1">${item.studentName}</h4>
          <p class="text-xs font-medium text-emerald-600 mb-2">${item.tournament || 'Giải phong trào'}</p>
          <p class="text-xs text-slate-500 italic line-clamp-2">"${item.quote || 'Cảm ơn lớp học đã rèn luyện kỹ thuật tận tâm!'}"</p>
        </div>
        <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
          <span class="text-[11px] text-slate-400">${item.duration || 'Học viên'} • ${item.date || ''}</span>
          <div class="flex items-center gap-1.5">
            <button onclick="editAchievement('${item.id}')"
                    class="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 hover:bg-blue-50 px-2.5 py-1 rounded-lg transition border border-blue-200 hover:border-blue-400" title="Chỉnh sửa bài này">
              <i data-lucide="edit-3" class="w-3.5 h-3.5"></i> Sửa
            </button>
            <button onclick="deleteAchievement('${item.id}')"
                    class="text-xs text-red-500 hover:text-red-700 font-semibold flex items-center gap-1 hover:bg-red-50 px-2 py-1 rounded-lg transition border border-red-200 hover:border-red-400" title="Xóa bài này">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Xóa
            </button>
          </div>
        </div>
      </div>
    </div>
  `).join('');

  refreshIcons();
}

function editAchievement(id) {
  const item = achievementsData.find(a => a.id === id);
  if (!item) return;

  document.getElementById('ach-id').value = item.id;
  document.getElementById('ach-name').value = item.studentName || '';
  document.getElementById('ach-award').value = item.award || '';
  document.getElementById('ach-tournament').value = item.tournament || '';
  document.getElementById('ach-court').value = item.court || 'Sân T12 (Quận 4)';
  document.getElementById('ach-duration').value = item.duration || '';
  document.getElementById('ach-quote').value = item.quote || '';
  document.getElementById('ach-image-url').value = (item.image && item.image.startsWith('http')) ? item.image : '';

  // Framing & position
  const pos = item.imagePosition || 'center 15%';
  document.getElementById('ach-image-position').value = pos;
  const match = pos.match(/(\d+)%/);
  const numVal = match ? parseInt(match[1]) : 15;
  const slider = document.getElementById('ach-pos-slider');
  if (slider) slider.value = numVal;
  const label = document.getElementById('ach-pos-label');
  if (label) label.textContent = `Vị trí (${numVal}%)`;
  const fitSelect = document.getElementById('ach-image-fit');
  if (fitSelect) fitSelect.value = item.imageFit || 'cover';

  // Preview container
  const previewImg = document.getElementById('ach-preview-img');
  if (previewImg) {
    previewImg.src = item.image;
    previewImg.style.objectPosition = pos;
    previewImg.style.objectFit = item.imageFit || 'cover';
  }
  document.getElementById('ach-preview-container').classList.remove('hidden');
  document.getElementById('ach-upload-prompt').classList.add('hidden');
  document.getElementById('ach-file-name').textContent = 'Ảnh hiện tại (Bấm vùng trên để tải ảnh mới thay thế)';

  // Change UI to Edit Mode
  document.getElementById('ach-form-title').innerHTML = `<span class="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-sm">✏️</span> Sửa Thành Tích`;
  document.getElementById('ach-form-subtitle').textContent = `Đang chỉnh sửa bài của học viên: ${item.studentName}`;
  document.getElementById('btn-save-achievement').innerHTML = `<i data-lucide="check" class="w-4 h-4"></i> Cập Nhật Thành Tích`;
  document.getElementById('btn-cancel-ach').classList.remove('hidden');
  document.getElementById('btn-cancel-ach-bottom').classList.remove('hidden');

  // Highlight matching preset
  const presets = document.querySelectorAll('.ach-pos-preset');
  presets.forEach(btn => {
    const bVal = parseInt(btn.dataset.val, 10);
    if (bVal === numVal) {
      btn.classList.add('border-emerald-500', 'bg-emerald-50', 'text-emerald-700', 'font-bold');
      btn.classList.remove('border-slate-200', 'text-slate-700');
    } else {
      btn.classList.remove('border-emerald-500', 'bg-emerald-50', 'text-emerald-700', 'font-bold');
      btn.classList.add('border-slate-200', 'text-slate-700');
    }
  });

  window.scrollTo({ top: document.getElementById('form-add-achievement').offsetTop - 90, behavior: 'smooth' });
  refreshIcons();
}

function cancelAchievementEdit() {
  formAddAch.reset();
  document.getElementById('ach-id').value = '';
  document.getElementById('ach-image-position').value = 'center 15%';
  const slider = document.getElementById('ach-pos-slider');
  if (slider) slider.value = 15;
  const label = document.getElementById('ach-pos-label');
  if (label) label.textContent = 'Căn mặt (15%)';
  const fitSelect = document.getElementById('ach-image-fit');
  if (fitSelect) fitSelect.value = 'cover';

  const presets = document.querySelectorAll('.ach-pos-preset');
  presets.forEach(btn => {
    if (btn.dataset.val === '15%') {
      btn.classList.add('border-emerald-500', 'bg-emerald-50', 'text-emerald-700', 'font-bold');
      btn.classList.remove('border-slate-200', 'text-slate-700');
    } else {
      btn.classList.remove('border-emerald-500', 'bg-emerald-50', 'text-emerald-700', 'font-bold');
      btn.classList.add('border-slate-200', 'text-slate-700');
    }
  });

  document.getElementById('ach-preview-container').classList.add('hidden');
  document.getElementById('ach-upload-prompt').classList.remove('hidden');
  document.getElementById('ach-file-input').value = '';

  document.getElementById('ach-form-title').innerHTML = `<span class="w-7 h-7 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center text-sm">🏆</span> Thêm Thành Tích Học Viên`;
  document.getElementById('ach-form-subtitle').textContent = 'Đăng hình thực tế học viên đạt giải thưởng, huy chương để hiển thị lên Landing Page.';
  document.getElementById('btn-save-achievement').innerHTML = `<i data-lucide="plus-circle" class="w-4 h-4"></i> Đăng Thành Tích Lên Web`;
  document.getElementById('btn-cancel-ach').classList.add('hidden');
  document.getElementById('btn-cancel-ach-bottom').classList.add('hidden');
  refreshIcons();
}

// Cancel edit buttons
const btnCancelAch = document.getElementById('btn-cancel-ach');
if (btnCancelAch) btnCancelAch.addEventListener('click', cancelAchievementEdit);
const btnCancelAchBottom = document.getElementById('btn-cancel-ach-bottom');
if (btnCancelAchBottom) btnCancelAchBottom.addEventListener('click', cancelAchievementEdit);

async function deleteAchievement(id) {
  if (!confirm('Bạn có chắc chắn muốn xóa bài thành tích này khỏi website?')) return;
  try {
    const res = await fetch(`/api/achievements/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
    });
    const data = await res.json();
    if (data.success) {
      alert('Đã xóa thành tích thành công!');
      loadAchievements();
    } else {
      alert(data.message || 'Lỗi khi xóa!');
    }
  } catch (err) {
    alert('Không thể kết nối máy chủ để xóa!');
  }
}

// Form Add/Edit Achievement Submission
formAddAch.addEventListener('submit', async (e) => {
  e.preventDefault();
  const achId = document.getElementById('ach-id').value;
  const isEditing = Boolean(achId);

  const btn = document.getElementById('btn-save-achievement');
  btn.disabled = true;
  btn.innerHTML = `<span class="animate-spin inline-block mr-2">🔄</span> Đang lưu...`;

  const formData = new FormData();
  formData.append('studentName', document.getElementById('ach-name').value.trim());
  formData.append('award', document.getElementById('ach-award').value.trim());
  formData.append('tournament', document.getElementById('ach-tournament').value.trim());
  formData.append('court', document.getElementById('ach-court').value);
  formData.append('duration', document.getElementById('ach-duration').value.trim());
  formData.append('quote', document.getElementById('ach-quote').value.trim());
  formData.append('imageUrl', document.getElementById('ach-image-url').value.trim());
  formData.append('imagePosition', document.getElementById('ach-image-position').value || 'center 15%');
  formData.append('imageFit', document.getElementById('ach-image-fit').value || 'cover');

  const fileInput = document.getElementById('ach-file-input');
  if (fileInput.files[0]) {
    formData.append('imageFile', fileInput.files[0]);
  }

  try {
    const url = isEditing ? `/api/achievements/${achId}` : '/api/achievements';
    const method = isEditing ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method: method,
      headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` },
      body: formData
    });
    const data = await res.json();
    if (data.success) {
      alert(isEditing ? 'Cập nhật bài thành tích thành công!' : 'Đã đăng thành tích học viên thành công!');
      cancelAchievementEdit();
      loadAchievements();
    } else {
      alert(data.message || 'Lỗi khi lưu thành tích!');
    }
  } catch (err) {
    alert('Không thể gửi dữ liệu đến máy chủ! Kiểm tra kết nối mạng.');
  } finally {
    btn.disabled = false;
    btn.innerHTML = isEditing
      ? `<i data-lucide="check" class="w-4 h-4"></i> Cập Nhật Thành Tích`
      : `<i data-lucide="plus-circle" class="w-4 h-4"></i> Đăng Thành Tích Lên Web`;
    refreshIcons();
  }
});

document.getElementById('btn-refresh-ach').addEventListener('click', loadAchievements);

// --------------------------------------------------------------
// 2. BLOG POSTS (BÀI VIẾT SEO)
// --------------------------------------------------------------
const postsListContainer = document.getElementById('posts-list');
const blogCountBadge = document.getElementById('blog-count-badge');
const statPostsCount = document.getElementById('stat-posts-count');
const formAddPost = document.getElementById('form-add-post');
const charCounter = document.getElementById('char-counter');
const postSummaryInput = document.getElementById('post-summary');
const postTitleInput = document.getElementById('post-title');
const postSlugInput = document.getElementById('post-slug');
const btnCancelPost = document.getElementById('btn-cancel-post');

function setupPostEditor() {
  postSummaryInput.addEventListener('input', () => {
    charCounter.textContent = `${postSummaryInput.value.length}/160`;
  });

  postTitleInput.addEventListener('input', () => {
    if (!document.getElementById('post-id').value) {
      // Auto generate slug
      const slug = postTitleInput.value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, 'd')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      postSlugInput.value = slug;
    }
  });

  btnCancelPost.addEventListener('click', () => {
    formAddPost.reset();
    document.getElementById('post-id').value = '';
    btnCancelPost.classList.add('hidden');
    document.getElementById('btn-save-post').innerHTML = `<i data-lucide="send" class="w-4 h-4"></i> Xuất Bản Bài Viết`;
    document.getElementById('post-preview-container').classList.add('hidden');
    document.getElementById('post-upload-prompt').classList.remove('hidden');
    refreshIcons();
  });
}

async function loadPosts() {
  try {
    const res = await fetch('/api/posts');
    const json = await res.json();
    if (json.success) {
      postsData = json.data;
      renderPosts();
    }
  } catch (err) {
    console.error('Lỗi tải bài viết:', err);
    try {
      const resLocal = await fetch('data/posts.json');
      postsData = await resLocal.json();
      renderPosts();
    } catch (e) {
      postsListContainer.innerHTML = '<p class="text-xs text-red-500">Chưa kết nối được máy chủ hoặc file bài viết.</p>';
    }
  }
}

function renderPosts() {
  blogCountBadge.textContent = postsData.length;
  statPostsCount.textContent = postsData.length;

  if (postsData.length === 0) {
    postsListContainer.innerHTML = `
      <div class="py-12 text-center bg-white rounded-2xl border border-slate-200">
        <i data-lucide="file-text" class="w-12 h-12 text-slate-300 mx-auto mb-2"></i>
        <p class="text-sm font-semibold text-slate-600">Chưa có bài viết nào</p>
        <p class="text-xs text-slate-400">Hãy viết bài đầu tiên bằng form bên trái để tối ưu Google SEO.</p>
      </div>
    `;
    refreshIcons();
    return;
  }

  postsListContainer.innerHTML = postsData.map(post => `
    <div class="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:border-blue-500/50 transition flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
      <div class="flex items-center gap-4">
        <img src="${post.coverImage}" alt="${post.title}" class="w-20 h-20 rounded-xl object-cover shrink-0 border border-slate-100"
             onerror="this.src='https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=800&q=80'">
        <div>
          <span class="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full inline-block mb-1">
            ${post.category}
          </span>
          <h4 class="font-bold font-heading text-slate-900 text-sm leading-snug line-clamp-1">
            ${post.title}
          </h4>
          <p class="text-xs text-slate-500 line-clamp-1 mt-0.5">${post.summary}</p>
          <div class="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
            <span>📅 ${post.date}</span>
            <span>⏱️ ${post.readTime}</span>
            <span class="font-mono text-[10px] text-slate-400">/blog-detail.html?slug=${post.slug}</span>
          </div>
        </div>
      </div>
      <div class="flex items-center gap-2 self-end md:self-center shrink-0">
        <a href="blog-detail.html?slug=${post.slug}" target="_blank"
           class="p-2 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition" title="Xem bài viết">
          <i data-lucide="external-link" class="w-4 h-4"></i>
        </a>
        <button onclick="editPost('${post.id}')"
                class="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Chỉnh sửa">
          <i data-lucide="edit-2" class="w-4 h-4"></i>
        </button>
        <button onclick="deletePost('${post.id}')"
                class="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Xóa bài viết">
          <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>
      </div>
    </div>
  `).join('');

  refreshIcons();
}

function editPost(id) {
  const post = postsData.find(p => p.id === id);
  if (!post) return;

  document.getElementById('post-id').value = post.id;
  document.getElementById('post-title').value = post.title || '';
  document.getElementById('post-slug').value = post.slug || '';
  document.getElementById('post-category').value = post.category || 'Kỹ thuật cầu lông';
  document.getElementById('post-readtime').value = post.readTime || '5 phút đọc';
  document.getElementById('post-image-url').value = post.coverImage || '';
  document.getElementById('post-summary').value = post.summary || '';
  document.getElementById('post-content').value = post.content || '';
  document.getElementById('post-tags').value = Array.isArray(post.tags) ? post.tags.join(', ') : (post.tags || '');

  charCounter.textContent = `${postSummaryInput.value.length}/160`;
  btnCancelPost.classList.remove('hidden');
  document.getElementById('btn-save-post').innerHTML = `<i data-lucide="check" class="w-4 h-4"></i> Cập Nhật Bài Viết`;
  refreshIcons();

  window.scrollTo({ top: formAddPost.offsetTop - 100, behavior: 'smooth' });
}

async function deletePost(id) {
  if (!confirm('Bạn có chắc muốn xóa bài viết này?')) return;
  try {
    const res = await fetch(`/api/posts/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
    });
    const data = await res.json();
    if (data.success) {
      alert('Đã xóa bài viết!');
      loadPosts();
    } else {
      alert(data.message || 'Lỗi khi xóa bài!');
    }
  } catch (err) {
    alert('Không thể kết nối máy chủ!');
  }
}

// Form Add/Edit Post Submission
formAddPost.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('btn-save-post');
  btn.disabled = true;
  btn.innerHTML = `<span class="animate-spin inline-block mr-2">🔄</span> Đang lưu...`;

  const postId = document.getElementById('post-id').value;
  const isEditing = Boolean(postId);

  const formData = new FormData();
  formData.append('title', document.getElementById('post-title').value.trim());
  formData.append('slug', document.getElementById('post-slug').value.trim());
  formData.append('category', document.getElementById('post-category').value);
  formData.append('readTime', document.getElementById('post-readtime').value.trim());
  formData.append('coverImage', document.getElementById('post-image-url').value.trim());
  formData.append('summary', document.getElementById('post-summary').value.trim());
  formData.append('content', document.getElementById('post-content').value.trim());
  formData.append('tags', document.getElementById('post-tags').value.trim());

  const fileInput = document.getElementById('post-file-input');
  if (fileInput.files[0]) {
    formData.append('coverImageFile', fileInput.files[0]);
  }

  try {
    const url = isEditing ? `/api/posts/${postId}` : '/api/posts';
    const method = isEditing ? 'PUT' : 'POST';

    // If editing and no new file, we can send JSON
    let res;
    if (isEditing && !fileInput.files[0]) {
      const payload = {
        title: document.getElementById('post-title').value.trim(),
        slug: document.getElementById('post-slug').value.trim(),
        category: document.getElementById('post-category').value,
        readTime: document.getElementById('post-readtime').value.trim(),
        coverImage: document.getElementById('post-image-url').value.trim(),
        summary: document.getElementById('post-summary').value.trim(),
        content: document.getElementById('post-content').value.trim(),
        tags: document.getElementById('post-tags').value.split(',').map(s => s.trim()).filter(Boolean)
      };
      res = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AUTH_TOKEN}`
        },
        body: JSON.stringify(payload)
      });
    } else {
      res = await fetch(url, {
        method: method,
        headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` },
        body: formData
      });
    }

    const data = await res.json();
    if (data.success) {
      alert(isEditing ? 'Cập nhật bài viết thành công!' : 'Đã đăng bài viết SEO mới!');
      formAddPost.reset();
      document.getElementById('post-id').value = '';
      btnCancelPost.classList.add('hidden');
      loadPosts();
    } else {
      alert(data.message || 'Lỗi khi xử lý bài viết!');
    }
  } catch (err) {
    alert('Không thể kết nối máy chủ!');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i data-lucide="send" class="w-4 h-4"></i> Xuất Bản Bài Viết`;
    refreshIcons();
  }
});

document.getElementById('btn-refresh-blog').addEventListener('click', loadPosts);

// --------------------------------------------------------------
// 3. REGISTRATIONS / LEADS
// --------------------------------------------------------------
const leadsTableBody = document.getElementById('leads-table-body');
const statLeadsCount = document.getElementById('stat-leads-count');
const badgeNewLeads = document.getElementById('badge-new-leads');

async function loadLeads() {
  try {
    const res = await fetch('/api/registrations', {
      headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
    });
    const json = await res.json();
    if (json.success) {
      leadsData = json.data;
      renderLeads();
    }
  } catch (err) {
    console.error('Lỗi tải danh sách lead:', err);
    try {
      const resLocal = await fetch('data/registrations.json');
      leadsData = await resLocal.json();
      renderLeads();
    } catch (e) {
      leadsTableBody.innerHTML = `<tr><td colspan="8" class="p-6 text-center text-xs text-red-500">Chưa kết nối được máy chủ hoặc file leads.</td></tr>`;
    }
  }
}

function renderLeads() {
  statLeadsCount.textContent = leadsData.length;
  const newCount = leadsData.filter(l => l.status === 'new').length;
  if (newCount > 0) {
    badgeNewLeads.textContent = newCount;
    badgeNewLeads.classList.remove('hidden');
  } else {
    badgeNewLeads.classList.add('hidden');
  }

  if (leadsData.length === 0) {
    leadsTableBody.innerHTML = `
      <tr>
        <td colspan="8" class="p-8 text-center text-xs text-slate-400">
          Chưa có học viên nào đăng ký học thử.
        </td>
      </tr>
    `;
    return;
  }

  leadsTableBody.innerHTML = leadsData.map(lead => {
    const formattedDate = lead.createdAt ? new Date(lead.createdAt).toLocaleDateString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    }) : 'Vừa xong';

    const cleanPhone = lead.phone ? lead.phone.replace(/[^0-9+]/g, '') : '';

    let statusBadge = '';
    if (lead.status === 'new') {
      statusBadge = `<span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 animate-pulse">Mới đăng ký</span>`;
    } else if (lead.status === 'contacted') {
      statusBadge = `<span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">Đã gọi điện</span>`;
    } else if (lead.status === 'trial_scheduled') {
      statusBadge = `<span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">Hẹn học thử</span>`;
    } else if (lead.status === 'enrolled') {
      statusBadge = `<span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">Đã nhập học</span>`;
    } else {
      statusBadge = `<span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">Đã đóng</span>`;
    }

    return `
      <tr class="hover:bg-slate-50/80 transition">
        <td class="p-4 text-xs text-slate-500 whitespace-nowrap">${formattedDate}</td>
        <td class="p-4 font-bold text-slate-900">${lead.name}</td>
        <td class="p-4 whitespace-nowrap">
          <div class="flex items-center gap-2">
            <span class="font-mono font-semibold text-slate-800">${lead.phone}</span>
            <a href="tel:${cleanPhone}" class="p-1 rounded-md bg-emerald-50 text-emerald-600 hover:bg-emerald-100" title="Gọi ngay">
              <i data-lucide="phone" class="w-3.5 h-3.5"></i>
            </a>
            <a href="https://zalo.me/${cleanPhone}" target="_blank" class="p-1 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold text-[10px]" title="Nhắn Zalo">
              Zalo
            </a>
          </div>
        </td>
        <td class="p-4 text-xs font-medium text-slate-700">${lead.course || 'Cơ bản'}</td>
        <td class="p-4 text-xs text-slate-600">
          <p class="font-semibold text-slate-900">${lead.court || 'Sân Q4/Q7'}</p>
          <p class="text-[11px] text-slate-500">${lead.timeSlot || ''}</p>
        </td>
        <td class="p-4 text-xs text-slate-500 max-w-xs truncate" title="${lead.note || ''}">${lead.note || '—'}</td>
        <td class="p-4 whitespace-nowrap">
          <select onchange="updateLeadStatus('${lead.id}', this.value)" class="text-xs rounded-lg border border-slate-200 px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500">
            <option value="new" ${lead.status === 'new' ? 'selected' : ''}>🔴 Mới</option>
            <option value="contacted" ${lead.status === 'contacted' ? 'selected' : ''}>🟡 Đã gọi</option>
            <option value="trial_scheduled" ${lead.status === 'trial_scheduled' ? 'selected' : ''}>🔵 Hẹn học thử</option>
            <option value="enrolled" ${lead.status === 'enrolled' ? 'selected' : ''}>🟢 Đã vào lớp</option>
            <option value="cancelled" ${lead.status === 'cancelled' ? 'selected' : ''}>⚪ Hủy</option>
          </select>
        </td>
        <td class="p-4 text-right whitespace-nowrap">
          <button onclick="deleteLead('${lead.id}')" class="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition" title="Xóa">
            <i data-lucide="trash" class="w-4 h-4"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');

  refreshIcons();
}

async function updateLeadStatus(id, newStatus) {
  try {
    const res = await fetch(`/api/registrations/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`
      },
      body: JSON.stringify({ status: newStatus })
    });
    const data = await res.json();
    if (data.success) {
      loadLeads();
    }
  } catch (err) {
    console.error('Lỗi cập nhật lead:', err);
  }
}

async function deleteLead(id) {
  if (!confirm('Bạn có muốn xóa học viên này khỏi danh sách?')) return;
  try {
    const res = await fetch(`/api/registrations/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
    });
    const data = await res.json();
    if (data.success) {
      loadLeads();
    }
  } catch (err) {
    console.error('Lỗi khi xóa:', err);
  }
}

document.getElementById('btn-refresh-leads').addEventListener('click', loadLeads);

// --------------------------------------------------------------
// 4. IMAGE UPLOAD PREVIEW & DRAG-AND-DROP HELPERS
// --------------------------------------------------------------
function setupImageDropzones() {
  // Achievement Dropzone
  const achDropzone = document.getElementById('ach-dropzone');
  const achFileInput = document.getElementById('ach-file-input');
  const achPreviewContainer = document.getElementById('ach-preview-container');
  const achPreviewImg = document.getElementById('ach-preview-img');
  const achFileName = document.getElementById('ach-file-name');
  const achUploadPrompt = document.getElementById('ach-upload-prompt');

  achDropzone.addEventListener('click', () => achFileInput.click());
  achFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        achPreviewImg.src = event.target.result;
        achPreviewImg.style.objectPosition = document.getElementById('ach-image-position')?.value || 'center 15%';
        achPreviewImg.style.objectFit = document.getElementById('ach-image-fit')?.value || 'cover';
        achFileName.textContent = file.name;
        achPreviewContainer.classList.remove('hidden');
        achUploadPrompt.classList.add('hidden');
      };
      reader.readAsDataURL(file);
    }
  });

  // Post Dropzone
  const postDropzone = document.getElementById('post-dropzone');
  const postFileInput = document.getElementById('post-file-input');
  const postPreviewContainer = document.getElementById('post-preview-container');
  const postPreviewImg = document.getElementById('post-preview-img');
  const postFileName = document.getElementById('post-file-name');
  const postUploadPrompt = document.getElementById('post-upload-prompt');

  postDropzone.addEventListener('click', () => postFileInput.click());
  postFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        postPreviewImg.src = event.target.result;
        postFileName.textContent = file.name;
        postPreviewContainer.classList.remove('hidden');
        postUploadPrompt.classList.add('hidden');
      };
      reader.readAsDataURL(file);
    }
  });
}

function setupFramingControls() {
  const slider = document.getElementById('ach-pos-slider');
  const posInput = document.getElementById('ach-image-position');
  const posLabel = document.getElementById('ach-pos-label');
  const fitSelect = document.getElementById('ach-image-fit');
  const previewImg = document.getElementById('ach-preview-img');
  const previewContainer = document.getElementById('ach-preview-container');
  const uploadPrompt = document.getElementById('ach-upload-prompt');
  const imageUrlInput = document.getElementById('ach-image-url');
  const presets = document.querySelectorAll('.ach-pos-preset');

  function updateFraming(valPercent) {
    const num = parseInt(valPercent, 10);
    const posStr = `center ${num}%`;
    if (posInput) posInput.value = posStr;
    if (slider) slider.value = num;
    if (posLabel) {
      if (num <= 25) {
        posLabel.textContent = `Căn mặt (${num}%)`;
      } else if (num >= 40 && num <= 60) {
        posLabel.textContent = `Căn giữa (${num}%)`;
      } else if (num >= 75) {
        posLabel.textContent = `Căn dưới (${num}%)`;
      } else {
        posLabel.textContent = `Vị trí (${num}%)`;
      }
    }
    if (previewImg) {
      previewImg.style.objectPosition = posStr;
    }

    presets.forEach(btn => {
      const bVal = parseInt(btn.dataset.val, 10);
      if (bVal === num) {
        btn.classList.add('border-emerald-500', 'bg-emerald-50', 'text-emerald-700', 'font-bold');
        btn.classList.remove('border-slate-200', 'text-slate-700');
      } else {
        btn.classList.remove('border-emerald-500', 'bg-emerald-50', 'text-emerald-700', 'font-bold');
        btn.classList.add('border-slate-200', 'text-slate-700');
      }
    });
  }

  if (slider) {
    slider.addEventListener('input', (e) => {
      updateFraming(e.target.value);
    });
  }

  presets.forEach(btn => {
    btn.addEventListener('click', () => {
      const val = btn.dataset.val || '15%';
      updateFraming(val);
    });
  });

  if (fitSelect) {
    fitSelect.addEventListener('change', (e) => {
      if (previewImg) {
        previewImg.style.objectFit = e.target.value;
      }
    });
  }

  if (imageUrlInput) {
    imageUrlInput.addEventListener('input', (e) => {
      const url = e.target.value.trim();
      if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/')) {
        if (previewImg) {
          previewImg.src = url;
          previewImg.style.objectPosition = posInput ? posInput.value : 'center 15%';
          previewImg.style.objectFit = fitSelect ? fitSelect.value : 'cover';
        }
        if (previewContainer) previewContainer.classList.remove('hidden');
        if (uploadPrompt) uploadPrompt.classList.add('hidden');
        const fileName = document.getElementById('ach-file-name');
        if (fileName) fileName.textContent = 'Ảnh từ liên kết';
      }
    });
  }
}

// Check authentication on page load
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  refreshIcons();
});

