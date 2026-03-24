(function () {
  const nav = document.querySelector("nav.site-nav");
  const navToggle = document.getElementById("nav-toggle");
  const mobileNav = document.getElementById("mobile-nav");

  function onScroll() {
    if (!nav) return;
    nav.classList.toggle("site-nav--scrolled", window.scrollY > 24);
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  navToggle?.addEventListener("click", () => {
    const hidden = mobileNav.classList.toggle("hidden");
    navToggle.setAttribute("aria-expanded", String(!hidden));
  });

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
        }
      });
    },
    { threshold: 0.08, rootMargin: "0px 0px -5% 0px" }
  );

  document.querySelectorAll(".reveal-section, .reveal").forEach((el) => revealObserver.observe(el));

  document.querySelectorAll("details").forEach((detail) => {
    const arrow = detail.querySelector(".details-arrow");
    detail.addEventListener("toggle", () => {
      if (!arrow) return;
      arrow.style.transform = detail.open ? "rotate(180deg)" : "rotate(0deg)";
    });
  });

  const sectionIds = ["hero", "about", "direction", "reptrack-featured", "projects", "stack", "experience", "contact"];
  const navLinks = document.querySelectorAll(".site-nav a[href^='#']");
  const onHomePage =
    !location.pathname.includes("/projects/") &&
    !location.pathname.endsWith("reptrack.html");

  if (onHomePage && navLinks.length && "IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const id = entry.target.id;
          navLinks.forEach((a) => {
            const href = a.getAttribute("href");
            a.classList.toggle("nav-link--active", href === "#" + id);
          });
        });
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
    );

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
  }
})();
