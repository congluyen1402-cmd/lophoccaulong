/* =================================================================
   LỚP HỌC CẦU LÔNG Q4 & Q7 - Main JavaScript Engine
   Website: https://lophoccaulong.com
   Style: Minimalist, Modern, High-Conversion Sporty (uupm.cc)
   ================================================================= */

// =================================================================
// 1. CẤU HÌNH THƯƠNG HIỆU & LIÊN LẠC (DỄ DÀNG CHỈNH SỬA TẠI ĐÂY)
// =================================================================
const BRAND_CONFIG = {
  phoneDisplay: '0813.100.402',
  phoneDial: 'tel:0813100402',
  zaloUrl: 'https://zalo.me/0813100402',
  facebookUrl: 'https://www.facebook.com/profile.php?id=61565837504855',
  facebookMsgUrl: 'https://m.me/61565837504855',
  tiktokUrl: 'https://www.tiktok.com/@lophoccaulongq4q7',
  instagramUrl: 'https://www.instagram.com/lophoccaulongq4q7/',
  mapsQ4Url: 'https://maps.app.goo.gl/zZSqMywiMxVjzB1z9',
  mapsQ7Url: 'https://maps.app.goo.gl/2JBgCUcWRjj2FQf97',
  courtQ4Name: 'Sân Cầu Lông T12 Quận 4',
  courtQ4Address: '1B Hoàng Diệu, Phường 13, Quận 4, TP.HCM',
  courtQ7Name: 'Sân Cầu Lông Dni Sport Quận 7',
  courtQ7Address: '85 Nguyễn Văn Quỳ, Phường Phú Thuận, Quận 7, TP.HCM'
};

// =================================================================
// 2. KHỞI TẠO KHI TẢI TRANG
// =================================================================
document.addEventListener('DOMContentLoaded', () => {
  syncBrandConfig();
  initStickyHeader();
  initMobileMenu();
  initScheduleTabs();
  initCounterAnimation();
  initFAQAccordion();
  initCourseSelectCTA();
  initRegistrationForm();
  initAchievementsLoader();
  initCoursesLoader();
  initHeroLoader();
  initScrollReveal();
  initSmoothScroll();
  initFloatingButtons();
  initMobileBottomBar();
  initVideoModal();
  initZaloQRModal();
});

// =================================================================
// 2.1 ĐỒNG BỘ CẤU HÌNH THƯƠNG HIỆU TỰ ĐỘNG KHẮP TOÀN BỘ TRANG
// =================================================================
function syncBrandConfig() {
  document.querySelectorAll('[data-brand="phoneDial"]').forEach(el => el.setAttribute('href', BRAND_CONFIG.phoneDial));
  document.querySelectorAll('[data-brand="phoneDisplay"]').forEach(el => el.textContent = BRAND_CONFIG.phoneDisplay);
  document.querySelectorAll('[data-brand="zaloUrl"]').forEach(el => el.setAttribute('href', BRAND_CONFIG.zaloUrl));
  document.querySelectorAll('[data-brand="facebookUrl"]').forEach(el => el.setAttribute('href', BRAND_CONFIG.facebookUrl));
  document.querySelectorAll('[data-brand="tiktokUrl"]').forEach(el => el.setAttribute('href', BRAND_CONFIG.tiktokUrl));
  document.querySelectorAll('[data-brand="instagramUrl"]').forEach(el => el.setAttribute('href', BRAND_CONFIG.instagramUrl));
  document.querySelectorAll('[data-brand="mapsQ4Url"]').forEach(el => el.setAttribute('href', BRAND_CONFIG.mapsQ4Url));
  document.querySelectorAll('[data-brand="mapsQ7Url"]').forEach(el => el.setAttribute('href', BRAND_CONFIG.mapsQ7Url));
}

// =================================================================
// 3. STICKY HEADER & SCROLL BEHAVIOR
// =================================================================
function initStickyHeader() {
  const header = document.getElementById('header');
  if (!header) return;

  const handleScroll = () => {
    if (window.scrollY > 20) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();
}

// =================================================================
// 4. MOBILE DRAWER MENU
// =================================================================
function initMobileMenu() {
  const menuBtn = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  const overlay = document.getElementById('mobile-menu-overlay');
  const closeBtn = document.getElementById('mobile-menu-close');

  if (!menuBtn || !mobileMenu) return;

  function openMenu() {
    mobileMenu.classList.add('open');
    if (overlay) overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    mobileMenu.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (mobileMenu.classList.contains('open')) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  if (closeBtn) closeBtn.addEventListener('click', closeMenu);
  if (overlay) overlay.addEventListener('click', closeMenu);

  mobileMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', closeMenu);
  });
}

// =================================================================
// 5. INTERACTIVE SCHEDULE TABS (QUẬN 4 / QUẬN 7 / TẤT CẢ)
// =================================================================
function initScheduleTabs() {
  const tabPills = document.querySelectorAll('.tab-pill');
  const tabContents = document.querySelectorAll('.tab-content');

  if (tabPills.length === 0) return;

  tabPills.forEach(pill => {
    pill.addEventListener('click', () => {
      const target = pill.dataset.tab;

      tabPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');

      tabContents.forEach(content => {
        content.classList.remove('active');
        if (content.id === `tab-${target}`) {
          content.classList.add('active');
        }
      });
    });
  });
}

// =================================================================
// 6. SỐ LIỆU THỐNG KÊ (COUNTER ANIMATION)
// =================================================================
function initCounterAnimation() {
  const counters = document.querySelectorAll('[data-counter]');
  if (counters.length === 0) return;

  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !entry.target.dataset.counted) {
        entry.target.dataset.counted = 'true';
        animateCounter(entry.target);
      }
    });
  }, {
    threshold: 0.15
  });

  counters.forEach(counter => counterObserver.observe(counter));
}

function animateCounter(element) {
  const target = parseInt(element.dataset.counter, 10);
  const suffix = element.dataset.suffix || '';
  const prefix = element.dataset.prefix || '';
  const duration = 1600;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easeOutProgress = 1 - Math.pow(1 - progress, 3);
    const currentValue = Math.floor(easeOutProgress * target);

    element.textContent = prefix + currentValue.toLocaleString('vi-VN') + suffix;

    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      element.textContent = prefix + target.toLocaleString('vi-VN') + suffix;
    }
  }

  requestAnimationFrame(update);
}

// =================================================================
// 7. FAQ ACCORDION (CHUẨN UX)
// =================================================================
function initFAQAccordion() {
  const faqItems = document.querySelectorAll('.faq-item');

  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    if (!question) return;

    question.addEventListener('click', () => {
      const isActive = item.classList.contains('active');

      faqItems.forEach(other => {
        if (other !== item) {
          other.classList.remove('active');
        }
      });

      item.classList.toggle('active', !isActive);
    });
  });
}

// =================================================================
// 8. TỐI ƯU CHUYỂN ĐỔI (CRO): CLICK KHÓA HỌC / CA HỌC TỰ ĐỘNG CHỌN FORM
// =================================================================
function initCourseSelectCTA() {
  const selectTriggers = document.querySelectorAll('[data-select-course], [data-select-schedule]');
  const courseSelect = document.getElementById('form-course');
  const areaSelect = document.getElementById('form-area');
  const scheduleSelect = document.getElementById('form-schedule');
  const registerSection = document.getElementById('dang-ky');
  const formElement = document.getElementById('registration-form');

  selectTriggers.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const courseValue = btn.dataset.selectCourse;
      const targetArea = btn.dataset.selectArea;
      const targetSchedule = btn.dataset.selectSchedule;

      if (courseValue && courseSelect) {
        courseSelect.value = courseValue;
      }

      if (targetArea && areaSelect) {
        areaSelect.value = targetArea;
      }

      if (targetSchedule && scheduleSelect) {
        scheduleSelect.value = targetSchedule;
      }

      if (registerSection) {
        e.preventDefault();
        registerSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

        if (formElement) {
          formElement.classList.add('form-highlight-pulse');
          setTimeout(() => {
            formElement.classList.remove('form-highlight-pulse');
          }, 3200);
        }
      }
    });
  });
}

// =================================================================
// 9. FORM ĐĂNG KÝ & THÔNG BÁO TOAST KÈM NÚT KẾT NỐI FACEBOOK/ZALO
// =================================================================
function initRegistrationForm() {
  const form = document.getElementById('registration-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const name = formData.get('name')?.toString().trim();
    const phone = formData.get('phone')?.toString().trim();
    const course = formData.get('course')?.toString();
    const area = formData.get('area')?.toString();
    const schedule = formData.get('schedule')?.toString();

    if (!name || name.length < 2) {
      showToast('error', 'Vui lòng nhập họ và tên của bạn!');
      return;
    }

    const cleanPhone = phone.replace(/[\s.-]/g, '');
    const phoneRegex = /^(03|05|07|08|09)\d{8}$/;
    if (!phoneRegex.test(cleanPhone)) {
      showToast('error', 'Số điện thoại không hợp lệ! Vui lòng nhập số gồm 10 chữ số.');
      return;
    }

    const courseNames = {
      'co-ban': 'Khóa Cơ Bản',
      'nang-cao': 'Khóa Nâng Cao',
      'tre-em': 'Khóa Trẻ Em',
      '1-1': 'Kèm Riêng 1-1'
    };

    const areaNames = {
      'q4': 'Sân T12 Q4 (1B Hoàng Diệu)',
      'q7': 'Sân Dni Sport Q7 (85 Nguyễn Văn Quỳ)',
      'both': 'Sân T12 Q4 / Dni Sport Q7'
    };

    const scheduleNames = {
      't2-t4-18h': 'Ca T2 & T4 (18h-20h)',
      't3-t5-18h': 'Ca T3 & T5 (18h-20h)',
      't2-t6-20h': 'Ca T2 & T6 (20h-22h)',
      't3-t6-20h': 'Ca T3 & T6 (20h-22h)',
      't3-t7-mix': 'Ca T3 (20h-22h) & T7 (18h-20h)',
      't7-cn-8h': 'Ca Cuối tuần T7 & CN (8h-10h sáng)',
      'flexible': 'Linh hoạt'
    };

    const courseText = courseNames[course] || 'Lớp Học Cầu Lông';
    const areaText = areaNames[area] || 'Q4 / Q7';
    const scheduleText = scheduleNames[schedule] || 'Ca học linh hoạt';

    showToast('success',
      `🎉 Cảm ơn <strong>${name}</strong>! Yêu cầu đăng ký <strong>${courseText}</strong> - <strong>${scheduleText}</strong> tại <strong>${areaText}</strong> đã được ghi nhận. Để xếp lịch học thử ngay hôm nay, bạn có thể nhắn tin nhanh qua Zalo hoặc Facebook:`,
      true
    );

    // Save lead to Backend Server database
    fetch('/api/registrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        phone: cleanPhone,
        course: courseText,
        court: areaText,
        timeSlot: scheduleText,
        note: `Đăng ký từ Website Landing Page (${new Date().toLocaleTimeString('vi-VN')})`
      })
    }).catch(err => {
      console.log('Lead saved locally (server offline)');
    });

    try {
      localStorage.setItem('last_registration', JSON.stringify({
        name,
        phone: cleanPhone,
        course: courseText,
        court: areaText,
        schedule: scheduleText,
        time: new Date().toISOString()
      }));
    } catch (err) {
      console.warn('LocalStorage not available');
    }

    form.reset();
  });
}

// =================================================================
// 9.1 TỰ ĐỘNG ĐỒNG BỘ THÀNH TÍCH HỌC VIÊN TỪ BACKEND
// =================================================================
async function initAchievementsLoader() {
  const container = document.getElementById('achievements-grid');
  if (!container) return;

  try {
    let list = [];
    const res = await fetch('/api/achievements');
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        list = json.data;
      }
    }

    if (list.length === 0) {
      const resLocal = await fetch('data/achievements.json');
      if (resLocal.ok) {
        list = await resLocal.json();
      }
    }

    if (list.length > 0) {
      container.innerHTML = list.map(item => `
        <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md hover:border-court-500/50 transition-all duration-300 flex flex-col group">
          <div class="relative h-48 bg-slate-900 overflow-hidden">
            <img src="${item.image}"
                 alt="${item.studentName} - ${item.award}"
                 loading="lazy"
                 style="object-position: ${item.imagePosition || 'center 15%'}; object-fit: ${item.imageFit || 'cover'};"
                 class="w-full h-full group-hover:scale-105 transition duration-500"
                 onerror="this.src='https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80'">
            <div class="absolute top-3 left-3 bg-amber-500 text-white font-extrabold text-[11px] px-2.5 py-1 rounded-full shadow-md flex items-center gap-1">
              <span>🏆</span> ${item.award}
            </div>
            <span class="absolute bottom-2 right-2 bg-slate-900/80 backdrop-blur text-white text-[10px] font-semibold px-2 py-0.5 rounded">
              ${item.court || 'Sân Q4 / Q7'}
            </span>
          </div>
          <div class="p-4 flex-1 flex flex-col justify-between">
            <div>
              <h3 class="font-heading font-black text-slate-900 text-sm sm:text-base leading-snug">
                ${item.studentName}
              </h3>
              <p class="text-xs font-semibold text-court-600 mt-0.5">
                ${item.tournament || 'Giải phong trào'}
              </p>
              <p class="text-xs text-slate-500 italic mt-2.5 line-clamp-3 leading-relaxed">
                "${item.quote || 'Tự tin thi đấu và đạt thành tích xuất sắc sau khóa học.'}"
              </p>
            </div>
            <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span>${item.duration || 'Học viên'}</span>
              <span>${item.date || ''}</span>
            </div>
          </div>
        </div>
      `).join('');
    }
  } catch (err) {
    // Graceful fallback to pre-rendered HTML cards
  }
}

// =================================================================
// 9.2 TỰ ĐỘNG ĐỒNG BỘ KHÓA HỌC TỪ BACKEND (HÌNH 1)
// =================================================================
async function initCoursesLoader() {
  const container = document.getElementById('courses-grid');
  if (!container) return;

  try {
    let list = [];
    const res = await fetch('/api/courses');
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        list = json.data;
      }
    }

    if (list.length === 0) {
      const resLocal = await fetch('data/courses.json');
      if (resLocal.ok) {
        list = await resLocal.json();
      }
    }

    if (list.length > 0) {
      container.innerHTML = list.map((c, idx) => `
        <div class="clean-card overflow-hidden flex flex-col justify-between group transition-all duration-300">
          <div>
            <div class="h-40 sm:h-44 overflow-hidden bg-slate-900 relative">
              <img src="${c.image}"
                   alt="${c.title}"
                   loading="lazy"
                   style="object-position: ${c.imagePosition || 'center 20%'}; object-fit: ${c.imageFit || 'cover'};"
                   class="w-full h-full group-hover:scale-105 transition-transform duration-500"
                   onerror="this.src='https://images.unsplash.com/photo-1613918108466-292b78a8ef95?auto=format&fit=crop&w=600&q=80'">
              <span class="absolute top-3 left-3 bg-white/95 backdrop-blur-md text-slate-900 font-heading font-bold text-[11px] px-2.5 py-1 rounded-lg shadow-sm">
                ${c.badge || 'Khóa học'}
              </span>
            </div>
            <div class="p-5 sm:p-6">
              <h3 class="font-heading font-extrabold text-base sm:text-lg text-slate-900 mb-1.5">${c.title}</h3>
              <p class="text-slate-500 text-xs sm:text-sm mb-3.5">${c.summary || ''}</p>
              <ul class="space-y-2 text-xs sm:text-sm text-slate-600 mb-4 sm:mb-6">
                ${(c.features || []).map(f => `
                  <li class="flex items-center gap-2"><span class="text-court-600">✓</span> ${f}</li>
                `).join('')}
              </ul>
            </div>
          </div>
          <div class="p-5 sm:p-6 pt-0">
            <button data-select-course="${c.actionTag || 'co-ban'}" class="btn-primary-sport w-full text-center">
              Nhận tư vấn khóa này
            </button>
          </div>
        </div>
      `).join('');

      // Gắn lại sự kiện chọn khóa học vào form đăng ký
      initCourseSelectCTA();
    }
  } catch (err) {}
}

// =================================================================
// 9.3 TỰ ĐỘNG ĐỒNG BỘ HERO BANNER TỪ BACKEND (HÌNH 2)
// =================================================================
async function initHeroLoader() {
  try {
    let hero = null;
    const res = await fetch('/api/hero');
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        hero = json.data;
      }
    }

    if (!hero) {
      const resLocal = await fetch('data/site_config.json');
      if (resLocal.ok) {
        hero = await resLocal.json();
      }
    }

    if (hero && hero.heroImage) {
      const mobileImg = document.getElementById('mobile-hero-img');
      const desktopImg = document.getElementById('desktop-hero-img');
      const pos = hero.heroImagePosition || 'center 25%';
      const fit = hero.heroImageFit || 'cover';

      if (mobileImg) {
        mobileImg.src = hero.heroImage;
        mobileImg.style.objectPosition = pos;
        mobileImg.style.objectFit = fit;
      }
      if (desktopImg) {
        desktopImg.src = hero.heroImage;
        desktopImg.style.objectPosition = pos;
        desktopImg.style.objectFit = fit;
      }

      if (hero.badgeSub) {
        document.querySelectorAll('.hero-badge-sub').forEach(el => el.textContent = hero.badgeSub);
      }
      if (hero.badgeTitle) {
        document.querySelectorAll('.hero-badge-title').forEach(el => el.textContent = hero.badgeTitle);
      }
      if (hero.badgeLocation) {
        document.querySelectorAll('.hero-badge-loc').forEach(el => el.textContent = hero.badgeLocation);
      }
    }
  } catch (err) {}
}

function showToast(type, message, showQuickActions = false) {
  const oldToast = document.querySelector('.toast');
  if (oldToast) oldToast.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';

  const isSuccess = type === 'success';
  const borderBg = isSuccess
    ? 'bg-slate-900 text-white border-emerald-500/50 shadow-2xl'
    : 'bg-rose-950 text-white border-rose-500/50 shadow-2xl';

  const iconSvg = isSuccess
    ? `<span class="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm flex-shrink-0">✓</span>`
    : `<span class="w-6 h-6 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold text-sm flex-shrink-0">✕</span>`;

  let actionButtons = '';
  if (showQuickActions) {
    actionButtons = `
      <div class="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-white/10">
        <a href="${BRAND_CONFIG.facebookUrl}" target="_blank" rel="noopener"
           class="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
          <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
          Chat Facebook
        </a>
        <a href="${BRAND_CONFIG.zaloUrl}" target="_blank" rel="noopener"
           class="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
          <span class="font-bold text-[11px]">Zalo</span>
          Nhắn Zalo HLV
        </a>
      </div>
    `;
  }

  toast.innerHTML = `
    <div class="${borderBg} rounded-2xl p-4 sm:p-5 border backdrop-blur-xl">
      <div class="flex items-start gap-3">
        ${iconSvg}
        <div class="flex-1 text-xs sm:text-sm leading-relaxed text-slate-200">
          ${message}
          ${actionButtons}
        </div>
        <button onclick="this.closest('.toast').remove()" class="text-white/40 hover:text-white transition-colors p-1" aria-label="Đóng thông báo">
          ✕
        </button>
      </div>
      <div class="toast-progress mt-3"></div>
    </div>
  `;

  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  const timer = setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 8000);

  toast.querySelector('.toast-progress').addEventListener('animationend', () => {
    clearTimeout(timer);
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  });
}

// =================================================================
// 10. VIDEO PREVIEW MODAL (TIKTOK / REELS)
// =================================================================
function initVideoModal() {
  const videoCards = document.querySelectorAll('[data-video-modal]');
  const modal = document.getElementById('video-modal');
  const modalClose = document.getElementById('video-modal-close');
  const modalTitle = document.getElementById('video-modal-title');
  const modalDesc = document.getElementById('video-modal-desc');

  if (!modal) return;

  videoCards.forEach(card => {
    card.addEventListener('click', () => {
      const title = card.dataset.videoTitle || 'Video Kỹ Thuật Cầu Lông';
      const desc = card.dataset.videoDesc || 'Theo dõi thêm nhiều video bài giảng và không khí tập luyện tại kênh chính thức.';

      if (modalTitle) modalTitle.textContent = title;
      if (modalDesc) modalDesc.textContent = desc;

      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    });
  });

  function closeModal() {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (modalClose) modalClose.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      closeModal();
    }
  });
}

// =================================================================
// 11. SCROLL REVEAL ANIMATIONS
// =================================================================
function initScrollReveal() {
  const elements = document.querySelectorAll('.scroll-reveal');
  if (elements.length === 0) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.08,
    rootMargin: '0px 0px -40px 0px'
  });

  elements.forEach(el => observer.observe(el));
}

// =================================================================
// 12. SMOOTH SCROLL CHO TẤT CẢ ANCHOR
// =================================================================
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;

      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        e.preventDefault();
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

// =================================================================
// 13. FLOATING BUTTONS HIỂN THỊ KHI CUỘN
// =================================================================
function initFloatingButtons() {
  const floatingActions = document.querySelector('.floating-actions');
  if (!floatingActions) return;

  const handleFloatingVisibility = () => {
    if (window.scrollY > 400) {
      floatingActions.style.opacity = '1';
      floatingActions.style.pointerEvents = 'all';
      floatingActions.style.transform = 'translateY(0)';
    } else {
      floatingActions.style.opacity = '0';
      floatingActions.style.pointerEvents = 'none';
      floatingActions.style.transform = 'translateY(16px)';
    }
  };

  floatingActions.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
  window.addEventListener('scroll', handleFloatingVisibility, { passive: true });
  handleFloatingVisibility();
}

// =================================================================
// 14. MOBILE BOTTOM BAR (TỰ ĐỘNG ẨN KHI GÕ PHÍM TRÁNH CHE MÀN HÌNH DỌC)
// =================================================================
function initMobileBottomBar() {
  const bottomBar = document.querySelector('.mobile-bottom-bar');
  if (!bottomBar) return;

  // Ẩn thanh bottom bar khi người dùng tap vào ô input/textarea để không bị bàn phím ảo che
  const formInputs = document.querySelectorAll('input, select, textarea');
  formInputs.forEach(input => {
    input.addEventListener('focus', () => {
      bottomBar.classList.add('hidden-bar');
    });
    input.addEventListener('blur', () => {
      bottomBar.classList.remove('hidden-bar');
    });
  });
}

// =================================================================
// 15. ZALO QR CODE MODAL POPUP
// =================================================================
function initZaloQRModal() {
  const modal = document.getElementById('zalo-qr-modal');
  if (!modal) return;

  const closeBtn = document.getElementById('zalo-modal-close');

  const openModal = (e) => {
    if (e) e.preventDefault();
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.style.overflow = 'hidden';
  };

  const closeModal = () => {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.body.style.overflow = '';
  };

  // Bắt sự kiện click vào các nút/biểu tượng Zalo
  document.querySelectorAll('[data-open-zalo-qr], a[href*="zalo.me"], .btn-zalo-modal').forEach(btn => {
    // Không gán lại cho các nút bên trong modal
    if (!btn.closest('#zalo-qr-modal')) {
      btn.addEventListener('click', openModal);
    }
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', closeModal);
  }

  // Đóng khi click ngoài khung modal
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });

  // Đóng khi bấm phím ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
      closeModal();
    }
  });
}
