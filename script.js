// configuration
const SCROLL_DEBOUNCE = 600; // ms
const slidesEl = document.getElementById("slides");
const navDots = document.querySelector(".nav-dots");
// Re-query slides to include new ones
const slides = Array.from(document.querySelectorAll(".slide"));

// Build nav dots
navDots.innerHTML = ""; // Clear existing
slides.forEach((s, i) => {
  const btn = document.createElement("button");
  btn.setAttribute("aria-label", `Slide ${i + 1}`);
  if (i === 0) btn.classList.add("active");
  btn.addEventListener("click", () => scrollToSlide(i));
  navDots.appendChild(btn);
});

// helper: scroll to slide index
function scrollToSlide(index) {
  const target = slides[index];
  if (!target) return;
  target.scrollIntoView({ behavior: "smooth", block: "start" });
  updateActiveDot(index);
}

// update nav dots
function updateActiveDot(activeIndex) {
  Array.from(navDots.children).forEach((b, idx) => {
    b.classList.toggle("active", idx === activeIndex);
  });
}

// IntersectionObserver for active slide + animation classes
const io = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      const idx = slides.indexOf(entry.target);
      if (entry.isIntersecting) {
        // Add 'active' class to the slide itself for stagger animations
        entry.target.classList.add("active");

        // Also trigger legacy animate classes if needed (though we use stagger-item mostly now)
        entry.target
          .querySelectorAll(".animate")
          .forEach((el) => el.classList.add("in-view"));

        updateActiveDot(idx);

        // Trigger Stats Animation if this is the stats slide
        if (entry.target.querySelector(".stat-number")) {
          animateStats(entry.target);
        }
      } else {
        entry.target.classList.remove("active");
        entry.target
          .querySelectorAll(".animate")
          .forEach((el) => el.classList.remove("in-view"));
      }
    });
  },
  { threshold: 0.55 }
);

slides.forEach((s) => io.observe(s));

// Wheel / touch control to turn wheel into slide jump
let lastScroll = 0;
let isThrottled = false;

function handleWheel(e) {
  // Allow normal scrolling inside slides if the content overflows?
  // User asked for "Scroll Snap feels heavy", so forced slide switching is preferred.
  // However, on mobile, content might be taller than VH.
  // For desktop, we stick to the heavy feel.

  if (window.innerWidth > 800) {
    e.preventDefault();
    if (isThrottled) return;
    isThrottled = true;
    setTimeout(() => (isThrottled = false), SCROLL_DEBOUNCE);

    const delta = e.deltaY;
    const currentIndex = getCurrentSlideIndex();
    if (delta > 0) {
      // next
      const next = Math.min(slides.length - 1, currentIndex + 1);
      scrollToSlide(next);
    } else {
      const prev = Math.max(0, currentIndex - 1);
      scrollToSlide(prev);
    }
  }
}

function getCurrentSlideIndex() {
  // find slide whose top is closest to viewport top
  // Since we are scrolling the MAIN ELEMENT, we check offsets relative to viewport
  // Actually slides are inside main, main scrolls. Main is window-height.
  const containerTop = slidesEl.scrollTop; // If slidesEl is the scrolling container
  // Wait, existing CSS had body scrolling?
  // checking CSS: .slides { overflow-y: auto; scroll-snap-type: y mandatory; }
  // So .slides is the scroll container.

  // Actually, usually `window.scrollY` works if body scrolls.
  // Use generic approach: element closest to center of screen.

  let closest = 0;
  let minDist = Infinity;
  slides.forEach((s, idx) => {
    const rect = s.getBoundingClientRect();
    const dist = Math.abs(rect.top); // Distance from top of viewport
    if (dist < minDist) {
      minDist = dist;
      closest = idx;
    }
  });
  return closest;
}

// Touch support
let touchStartY = 0;
slidesEl.addEventListener(
  "touchstart",
  (e) => {
    touchStartY = e.changedTouches[0].clientY;
  },
  { passive: true }
);

// We only hijack touch if we are in "heavy" mode, else let native snap handle it.
// Native scroll-snap is usually enough for mobile, but let's keep the snap assist for consistent "heavy" feel if requested.
// Actually native CSS scroll-snap is best for mobile fidelity. We just listen for wheel on desktop.

// Attach wheel listener to the SCROLL CONTAINER, not just slidesEl?
// Since slidesEl is the one overflowing.
slidesEl.addEventListener("wheel", handleWheel, { passive: false });

document
  .getElementById("startBtn")
  .addEventListener("click", () => scrollToSlide(1));

/* -----------------------
   NEW FEATURE: STATS COUNTER
   ----------------------- */
function animateStats(slide) {
  const stats = slide.querySelectorAll(".stat-number");
  stats.forEach((stat) => {
    if (stat.classList.contains("counted")) return; // Run once
    const target = +stat.dataset.target; // if it's a number
    // handle non-numeric targets separately if needed, but for now we assume number logic or just simple fade
    // The HTML has "94", "20", "300".
    // If it returns NaN (like for "$20B+"), we need to parse.

    let start = 0;
    const duration = 2000;
    const startTime = performance.now();
    const originalText = stat.innerText; // Keep suffix if any

    // Extract numeric part for counting
    const numeric = parseFloat(originalText.replace(/[^0-9.]/g, "")) || 0;
    if (numeric === 0) return; // Static text

    stat.classList.add("counted");

    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out quart
      const ease = 1 - Math.pow(1 - progress, 4);

      const currentVal = Math.floor(ease * numeric);

      // Reconstruct text (hacky but works for simple cases like 94%, $20, 300k)
      if (originalText.includes("%")) stat.innerText = currentVal + "%";
      else if (originalText.includes("$"))
        stat.innerText = "$" + currentVal + "B+";
      else if (originalText.includes("k")) stat.innerText = currentVal + "k";
      else stat.innerText = currentVal;

      if (progress < 1) requestAnimationFrame(update);
      else stat.innerText = originalText; // Ensure exact final value
    }
    requestAnimationFrame(update);
  });
}

/* -----------------------
   NEW FEATURE: PASSWORD CHECKER
   ----------------------- */
const passInput = document.getElementById("passwordInput");
const strengthFill = document.getElementById("strengthFill");
const strengthText = document.getElementById("strengthText");

if (passInput) {
  passInput.addEventListener("input", () => {
    const val = passInput.value;
    const res = checkPassword(val);

    // Update width
    strengthFill.style.width = res.score + "%";

    // Update Color
    strengthFill.style.backgroundColor = res.color;

    // Update Text
    strengthText.textContent = res.label;
    strengthText.style.color = res.color;
  });
}

function checkPassword(pass) {
  if (!pass) return { score: 0, color: "transparent", label: "" };

  let score = 0;
  // Length check
  if (pass.length > 5) score += 20;
  if (pass.length > 8) score += 20;
  if (pass.length > 12) score += 10;

  // Complexity check
  if (/[A-Z]/.test(pass)) score += 15;
  if (/[0-9]/.test(pass)) score += 15;
  if (/[^A-Za-z0-9]/.test(pass)) score += 20;

  // Cap at 100
  score = Math.min(100, score);

  let color = "#ff4d4d"; // Red
  let label = "ضعيفة جداً 😱";

  if (score > 30) {
    color = "#ffad33";
    label = "ضعيفة 😐";
  }
  if (score > 50) {
    color = "#ffeb3b";
    label = "متوسطة 🤔";
  }
  if (score > 75) {
    color = "#00ffa3";
    label = "قوية 🔥";
  }
  if (score >= 90) {
    color = "#00bcd4";
    label = "قوية جداً 🚀";
  }

  return { score, color, label };
}

/* -----------------------
   PHISHING MINI-QUIZ LOGIC
   ----------------------- */
document.addEventListener("DOMContentLoaded", () => {
  const quizQuestions = Array.from(document.querySelectorAll(".quiz-question"));
  const resultEl = document.querySelector(".quiz-result");

  let activeScore = 0;

  quizQuestions.forEach((qEl) => {
    const opts = Array.from(qEl.querySelectorAll(".option"));
    const feedback = qEl.querySelector(".feedback");
    let answered = false;

    opts.forEach((opt) => {
      opt.addEventListener("click", () => {
        if (answered) return;
        answered = true;
        const correct = opt.dataset.correct === "true";
        if (correct) {
          opt.style.borderColor = "var(--neon-primary)"; // Updated to var
          opt.style.backgroundColor = "rgba(0,255,163,0.1)";
          opt.style.color = "var(--neon-primary)";
          feedback.textContent = "✅ إجابة صحيحة";
          activeScore++;
        } else {
          opt.style.borderColor = "#ff4d4d";
          opt.style.color = "#ff4d4d";
          feedback.textContent =
            "❌ إجابة خاطئة — فكر قبل المشاركة أو افتح مرفق مش متأكد منه";
        }

        // Hints logic preserved...
        const hint = document.createElement("div");
        hint.className = "hint";
        hint.style.marginTop = "8px";
        hint.style.color = "#94a3b8"; // muted
        hint.style.fontSize = "0.95rem";

        const qNum = qEl.dataset.q;
        if (qNum === "1")
          hint.textContent =
            "تحقق من عنوان المرسل، رابط التحميل، واطلب اسم المرسل بالكامل قبل الفتح.";
        if (qNum === "2")
          hint.textContent =
            "البنوك لا تطلب الكود عبر الرسائل؛ استخدم القنوات الرسمية.";
        if (qNum === "3")
          hint.textContent =
            "أجهزة خارجية مجهولة قد تحتوي Malware — سلّمها لفريق الـIT.";

        feedback.appendChild(hint);

        // update result
        resultEl.textContent = `النتيجة الحالية: ${activeScore}/${quizQuestions.length}`;
      });
    });
  });
});

/* Optional: keyboard navigation */
window.addEventListener("keydown", (e) => {
  if (["ArrowDown", "PageDown"].includes(e.key)) {
    e.preventDefault();
    scrollToSlide(Math.min(slides.length - 1, getCurrentSlideIndex() + 1));
  }
  if (["ArrowUp", "PageUp"].includes(e.key)) {
    e.preventDefault();
    scrollToSlide(Math.max(0, getCurrentSlideIndex() - 1));
  }
});
