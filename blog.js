// ==============================================================
// BLOG JAVASCRIPT - LOPHOCAULONG.COM
// ==============================================================

let allPosts = [];
let activeCategory = 'all';

function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// --------------------------------------------------------------
// DATA FETCHING (HYBRID: API or STATIC JSON FALLBACK)
// --------------------------------------------------------------
async function fetchAllPosts() {
  try {
    const res = await fetch('/api/posts');
    if (!res.ok) throw new Error('API failed');
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      return json.data;
    }
  } catch (e) {
    // Static fallback
  }

  try {
    const resFallback = await fetch('data/posts.json');
    if (!resFallback.ok) throw new Error('Local file failed');
    return await resFallback.json();
  } catch (err) {
    console.error('Cannot load posts:', err);
    return [];
  }
}

// --------------------------------------------------------------
// BLOG INDEX PAGE LOGIC (blog.html)
// --------------------------------------------------------------
async function initBlogIndex() {
  const postsGrid = document.getElementById('posts-grid');
  if (!postsGrid) return; // Not on blog.html

  allPosts = await fetchAllPosts();
  renderBlogPosts(allPosts);

  // Search event
  const searchInput = document.getElementById('blog-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      filterPosts(q, activeCategory);
    });
  }

  // Category filter tabs
  const catButtons = document.querySelectorAll('.cat-pill');
  catButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      catButtons.forEach(b => {
        b.classList.remove('active', 'bg-emerald-600', 'text-white', 'shadow-sm');
        b.classList.add('text-slate-600', 'hover:bg-emerald-50');
      });
      btn.classList.add('active', 'bg-emerald-600', 'text-white', 'shadow-sm');
      btn.classList.remove('text-slate-600', 'hover:bg-emerald-50');

      activeCategory = btn.getAttribute('data-category');
      const q = searchInput ? searchInput.value.toLowerCase().trim() : '';
      filterPosts(q, activeCategory);
    });
  });
}

function filterPosts(query, category) {
  let filtered = allPosts;
  if (category && category !== 'all') {
    filtered = filtered.filter(p => p.category === category);
  }
  if (query) {
    filtered = filtered.filter(p =>
      (p.title && p.title.toLowerCase().includes(query)) ||
      (p.summary && p.summary.toLowerCase().includes(query)) ||
      (p.content && p.content.toLowerCase().includes(query)) ||
      (Array.isArray(p.tags) && p.tags.some(t => t.toLowerCase().includes(query)))
    );
  }
  renderBlogPosts(filtered);
}

window.filterByTag = function (tag) {
  const searchInput = document.getElementById('blog-search-input');
  if (searchInput) {
    searchInput.value = tag;
    filterPosts(tag.toLowerCase(), 'all');
    window.scrollTo({ top: searchInput.offsetTop - 100, behavior: 'smooth' });
  }
};

function renderBlogPosts(posts) {
  const postsGrid = document.getElementById('posts-grid');
  const countDisplay = document.getElementById('posts-count-display');
  const noPostsFound = document.getElementById('no-posts-found');
  if (!postsGrid) return;

  if (countDisplay) countDisplay.textContent = posts.length;

  if (!posts || posts.length === 0) {
    postsGrid.innerHTML = '';
    if (noPostsFound) noPostsFound.classList.remove('hidden');
    return;
  }

  if (noPostsFound) noPostsFound.classList.add('hidden');

  postsGrid.innerHTML = posts.map(post => `
    <article class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:border-emerald-500/50 hover:shadow-md transition duration-300 group">
      <!-- COVER IMAGE -->
      <a href="blog-detail.html?slug=${post.slug}" class="relative h-48 overflow-hidden block bg-slate-100">
        <img src="${post.coverImage}" alt="${post.title}" loading="lazy"
             class="w-full h-full object-cover group-hover:scale-105 transition duration-500"
             onerror="this.src='https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=800&q=80'">
        <span class="absolute top-3 left-3 bg-white/95 backdrop-blur text-emerald-700 font-bold text-xs px-2.5 py-1 rounded-full shadow-xs">
          ${post.category}
        </span>
      </a>

      <!-- BODY -->
      <div class="p-5 flex-1 flex flex-col justify-between">
        <div>
          <div class="flex items-center gap-2 text-slate-400 text-xs mb-2">
            <span>📅 ${post.date}</span>
            <span>•</span>
            <span>⏱️ ${post.readTime || '5 phút'}</span>
          </div>
          <h2 class="font-bold font-heading text-slate-900 text-base leading-snug group-hover:text-emerald-600 transition line-clamp-2">
            <a href="blog-detail.html?slug=${post.slug}">
              ${post.title}
            </a>
          </h2>
          <p class="text-xs text-slate-500 mt-2 line-clamp-3 leading-relaxed">
            ${post.summary || ''}
          </p>
        </div>

        <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
          <a href="blog-detail.html?slug=${post.slug}" class="text-xs font-bold text-emerald-600 group-hover:text-emerald-700 flex items-center gap-1">
            Đọc bài viết <i data-lucide="arrow-right" class="w-3.5 h-3.5 group-hover:translate-x-1 transition"></i>
          </a>
          <span class="text-[11px] text-slate-400">HLV Q4 & Q7</span>
        </div>
      </div>
    </article>
  `).join('');

  refreshIcons();
}

// --------------------------------------------------------------
// BLOG DETAIL PAGE LOGIC (blog-detail.html)
// --------------------------------------------------------------
async function initBlogDetail() {
  const contentContainer = document.getElementById('post-detail-content');
  if (!contentContainer) return; // Not on blog-detail.html

  allPosts = await fetchAllPosts();
  if (allPosts.length === 0) return;

  const urlParams = new URLSearchParams(window.location.search);
  const slug = urlParams.get('slug') || '';

  // Find post matching slug or fallback to first post
  let post = allPosts.find(p => p.slug === slug || p.id === slug);
  if (!post && allPosts.length > 0) {
    post = allPosts[0];
  }

  if (!post) {
    contentContainer.innerHTML = '<p class="text-red-500 py-12 text-center">Không tìm thấy bài viết!</p>';
    return;
  }

  // Populate metadata & DOM
  document.title = post.metaTitle || `${post.title} | lophoccaulong.com`;
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute('content', post.metaDesc || post.summary);

  const breadcrumbTitle = document.getElementById('breadcrumb-title');
  if (breadcrumbTitle) breadcrumbTitle.textContent = post.title;

  const titleEl = document.getElementById('post-detail-title');
  if (titleEl) titleEl.textContent = post.title;

  const catEl = document.getElementById('post-detail-category');
  if (catEl) catEl.textContent = post.category;

  const readTimeEl = document.getElementById('post-detail-readtime');
  if (readTimeEl) readTimeEl.textContent = post.readTime;

  const authorEl = document.getElementById('post-detail-author');
  if (authorEl) authorEl.textContent = post.author || 'Ban Huấn Luyện - lophoccaulong.com';

  const dateEl = document.getElementById('post-detail-date');
  if (dateEl) dateEl.textContent = `Đăng ngày ${post.date}`;

  const coverImg = document.getElementById('post-detail-cover');
  if (coverImg) {
    coverImg.src = post.coverImage;
    coverImg.alt = post.title;
  }

  const summaryEl = document.getElementById('post-detail-summary');
  if (summaryEl) summaryEl.innerHTML = `<strong class="text-amber-900 block mb-1">Tóm tắt nội dung:</strong> ${post.summary}`;

  // Content
  contentContainer.innerHTML = post.content || '';

  // Tags
  const tagsContainer = document.getElementById('post-detail-tags');
  if (tagsContainer && Array.isArray(post.tags)) {
    tagsContainer.innerHTML = post.tags.map(tag => `
      <a href="blog.html" onclick="filterByTag('${tag}')" class="text-xs bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 px-2.5 py-1 rounded-md transition">
        #${tag}
      </a>
    `).join('');
  }

  // Update Schema JSON-LD dynamically
  const schemaEl = document.getElementById('article-schema');
  if (schemaEl) {
    const articleSchema = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "headline": post.title,
      "description": post.metaDesc || post.summary,
      "image": post.coverImage,
      "datePublished": post.date,
      "author": {
        "@type": "Person",
        "name": post.author || "HLV Lớp Học Cầu Lông Q4 & Q7"
      },
      "publisher": {
        "@type": "Organization",
        "name": "Lớp Học Cầu Lông Q4 & Q7",
        "url": "https://lophoccaulong.com"
      },
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": `https://lophoccaulong.com/blog-detail.html?slug=${post.slug}`
      }
    };
    schemaEl.textContent = JSON.stringify(articleSchema, null, 2);
  }

  // Related posts
  const relatedContainer = document.getElementById('related-posts-grid');
  if (relatedContainer) {
    const related = allPosts.filter(p => p.id !== post.id && p.category === post.category).slice(0, 2);
    const displayPosts = related.length > 0 ? related : allPosts.filter(p => p.id !== post.id).slice(0, 2);

    relatedContainer.innerHTML = displayPosts.map(rp => `
      <a href="blog-detail.html?slug=${rp.slug}" class="flex gap-3 bg-white p-3 rounded-xl border border-slate-200 hover:border-emerald-500 hover:shadow-xs transition group">
        <img src="${rp.coverImage}" alt="${rp.title}" class="w-20 h-20 rounded-lg object-cover shrink-0">
        <div>
          <span class="text-[11px] font-semibold text-emerald-600">${rp.category}</span>
          <h4 class="font-bold text-xs text-slate-800 line-clamp-2 group-hover:text-emerald-600 mt-1">${rp.title}</h4>
          <span class="text-[10px] text-slate-400 mt-1 block">${rp.date}</span>
        </div>
      </a>
    `).join('');
  }

  refreshIcons();
}

// --------------------------------------------------------------
// SOCIAL SHARING HELPER
// --------------------------------------------------------------
window.shareSocial = function (platform) {
  const url = encodeURIComponent(window.location.href);
  const title = encodeURIComponent(document.title);

  if (platform === 'facebook') {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank', 'width=600,height=400');
  } else if (platform === 'copy') {
    navigator.clipboard.writeText(window.location.href).then(() => {
      alert('Đã sao chép liên kết bài viết vào bộ nhớ tạm!');
    }).catch(() => {
      prompt('Sao chép liên kết tại đây:', window.location.href);
    });
  }
};

// --------------------------------------------------------------
// AUTO RUN ON PAGE LOAD
// --------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  initBlogIndex();
  initBlogDetail();
  refreshIcons();
});

