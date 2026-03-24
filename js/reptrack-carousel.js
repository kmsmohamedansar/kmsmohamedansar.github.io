(function initReptrackCarousels() {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  document.querySelectorAll("[data-reptrack-carousel]").forEach((root) => {
    const viewport = root.querySelector("[data-carousel-viewport]");
    const prevBtn = root.querySelector("[data-carousel-prev]");
    const nextBtn = root.querySelector("[data-carousel-next]");
    const thumbBar = root.querySelector("[data-carousel-thumbs]");
    if (!viewport || !thumbBar) return;

    const slides = () => Array.from(viewport.querySelectorAll(".reptrack-slide"));
    const thumbs = () => Array.from(thumbBar.querySelectorAll("[data-thumb]"));

    function scrollOpts() {
      return { behavior: reduceMotion ? "auto" : "smooth" };
    }

    function activeIndex() {
      const list = slides();
      if (!list.length) return 0;
      const mid = viewport.scrollLeft + viewport.clientWidth / 2;
      let best = 0;
      let bestDist = Infinity;
      list.forEach((el, i) => {
        const cx = el.offsetLeft + el.offsetWidth / 2;
        const d = Math.abs(cx - mid);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      });
      return best;
    }

    function goTo(index) {
      const list = slides();
      if (!list[index]) return;
      viewport.scrollTo({ left: list[index].offsetLeft, ...scrollOpts() });
    }

    function syncThumbs() {
      const i = activeIndex();
      thumbs().forEach((t, idx) => {
        const on = idx === i;
        t.classList.toggle("is-active", on);
        t.setAttribute("aria-current", on ? "true" : "false");
      });
      if (prevBtn) prevBtn.disabled = i <= 0;
      if (nextBtn) nextBtn.disabled = i >= slides().length - 1;
    }

    let scrollTick;
    viewport.addEventListener("scroll", () => {
      cancelAnimationFrame(scrollTick);
      scrollTick = requestAnimationFrame(syncThumbs);
    });

    prevBtn?.addEventListener("click", () => goTo(activeIndex() - 1));
    nextBtn?.addEventListener("click", () => goTo(activeIndex() + 1));

    thumbs().forEach((btn) => {
      btn.addEventListener("click", () => {
        const i = parseInt(btn.getAttribute("data-thumb"), 10);
        if (!Number.isNaN(i)) goTo(i);
      });
    });

    viewport.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goTo(activeIndex() - 1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goTo(activeIndex() + 1);
      }
    });

    window.addEventListener("resize", syncThumbs);
    syncThumbs();
  });
})();
