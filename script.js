// configuration
const SCROLL_DEBOUNCE = 600; // ms
const slidesEl = document.getElementById('slides');
const slides = Array.from(document.querySelectorAll('.slide'));
const navDots = document.querySelector('.nav-dots');

// Build nav dots
slides.forEach((s, i) => {
  const btn = document.createElement('button');
  btn.setAttribute('aria-label', `Slide ${i+1}`);
  if(i === 0) btn.classList.add('active');
  btn.addEventListener('click', () => scrollToSlide(i));
  navDots.appendChild(btn);
});

// helper: scroll to slide index
function scrollToSlide(index){
  const target = slides[index];
  if(!target) return;
  target.scrollIntoView({behavior:'smooth', block:'start'});
  updateActiveDot(index);
}

// update nav dots
function updateActiveDot(activeIndex){
  Array.from(navDots.children).forEach((b, idx) => {
    b.classList.toggle('active', idx === activeIndex);
  });
}

// IntersectionObserver for active slide + animation classes
const io = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    const idx = slides.indexOf(entry.target);
    if(entry.isIntersecting){
      entry.target.querySelectorAll('.animate').forEach(el => el.classList.add('in-view'));
      updateActiveDot(idx);
    } else {
      entry.target.querySelectorAll('.animate').forEach(el => el.classList.remove('in-view'));
    }
  });
}, {threshold: 0.55});

slides.forEach(s => io.observe(s));

// Wheel / touch control to turn wheel into slide jump
let lastScroll = 0;
let isThrottled = false;

function handleWheel(e){
  e.preventDefault();
  if(isThrottled) return;
  isThrottled = true;
  setTimeout(()=> isThrottled = false, SCROLL_DEBOUNCE);

  const delta = e.deltaY;
  const currentIndex = getCurrentSlideIndex();
  if(delta > 0){
    // next
    const next = Math.min(slides.length - 1, currentIndex + 1);
    scrollToSlide(next);
  } else {
    const prev = Math.max(0, currentIndex - 1);
    scrollToSlide(prev);
  }
}

function getCurrentSlideIndex(){
  // find slide whose top is closest to viewport top
  const viewportTop = window.scrollY;
  let closest = 0;
  let minDist = Infinity;
  slides.forEach((s, idx) => {
    const rect = s.getBoundingClientRect();
    const dist = Math.abs(rect.top);
    if(dist < minDist){
      minDist = dist;
      closest = idx;
    }
  });
  return closest;
}

// Touch support
let touchStartY = 0;
let touchEndY = 0;
slidesEl.addEventListener('touchstart', (e) => {
  touchStartY = e.changedTouches[0].clientY;
}, {passive:true});
slidesEl.addEventListener('touchend', (e) => {
  touchEndY = e.changedTouches[0].clientY;
  const diff = touchStartY - touchEndY;
  if(Math.abs(diff) < 30) return;
  if(diff > 0){
    scrollToSlide(Math.min(slides.length - 1, getCurrentSlideIndex() + 1));
  } else {
    scrollToSlide(Math.max(0, getCurrentSlideIndex() - 1));
  }
}, {passive:true});

// Attach wheel listener with passive false to prevent default
slidesEl.addEventListener('wheel', handleWheel, {passive:false});

// Start button scroll
document.getElementById('startBtn').addEventListener('click', () => scrollToSlide(1));

/* -----------------------
   PHISHING MINI-QUIZ LOGIC
   ----------------------- */
document.addEventListener('DOMContentLoaded', () => {
  const quizQuestions = Array.from(document.querySelectorAll('.quiz-question'));
  const resultEl = document.querySelector('.quiz-result');

  let score = 0;

  quizQuestions.forEach((qEl) => {
    const opts = Array.from(qEl.querySelectorAll('.option'));
    const feedback = qEl.querySelector('.feedback');
    let answered = false;

    opts.forEach(opt => {
      opt.addEventListener('click', () => {
        if(answered) return;
        answered = true;
        const correct = opt.dataset.correct === "true";
        if(correct){
          opt.style.borderColor = 'rgba(0,255,163,0.6)';
          opt.style.color = 'var(--neon)';
          feedback.textContent = '✅ إجابة صحيحة';
          score++;
        } else {
          opt.style.borderColor = 'rgba(255,60,60,0.7)';
          opt.style.color = '#ff8d8d';
          feedback.textContent = '❌ إجابة خاطئة — فكر قبل المشاركة أو افتح مرفق مش متأكد منه';
        }
        // show short hint
        const hint = document.createElement('div');
        hint.className = 'hint';
        hint.style.marginTop = '8px';
        hint.style.color = '#9fbdb4';
        hint.style.fontSize = '0.95rem';

        const qNum = qEl.dataset.q;
        if(qNum === "1") hint.textContent = 'تحقق من عنوان المرسل، رابط التحميل، واطلب اسم المرسل بالكامل قبل الفتح.';
        if(qNum === "2") hint.textContent = 'البنوك لا تطلب الكود عبر الرسائل؛ استخدم القنوات الرسمية.';
        if(qNum === "3") hint.textContent = 'أجهزة خارجية مجهولة قد تحتوي Malware — سلّمها لفريق الـIT.';

        feedback.appendChild(hint);

        // update result
        resultEl.textContent = `درجة جزئية: ${score}/${quizQuestions.length}`;
      });
    });
  });
});

/* Optional: keyboard navigation (ArrowUp / ArrowDown) */
window.addEventListener('keydown', (e) => {
  if(['ArrowDown','PageDown'].includes(e.key)){
    scrollToSlide(Math.min(slides.length - 1, getCurrentSlideIndex() + 1));
  }
  if(['ArrowUp','PageUp'].includes(e.key)){
    scrollToSlide(Math.max(0, getCurrentSlideIndex() - 1));
  }
});