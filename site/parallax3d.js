/**
 * StratumTree 3D Scroll & Interactive Parallax Engine
 * Provides smooth 3D depth, isometric perspective floating, and dynamic cursor tilt
 */

(function () {
  'use strict';

  // 1. Interactive 3D Card Tilt with Dynamic Specular Glare
  const tiltElements = document.querySelectorAll(
    '.status-card, .companion-card, .feature-card, .hero-3d-visual, .code-box-card, .sandbox-card'
  );

  tiltElements.forEach(card => {
    card.classList.add('card-3d-enhanced');

    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      // Max tilt angle (degrees)
      const maxTilt = 8;
      const rotateX = -((y - centerY) / centerY) * maxTilt;
      const rotateY = ((x - centerX) / centerX) * maxTilt;

      card.style.setProperty('--mouse-x', `${(x / rect.width) * 100}%`);
      card.style.setProperty('--mouse-y', `${(y / rect.height) * 100}%`);
      card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateZ(12px)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)';
    });
  });

  // 2. Smooth 3D Parallax Scroll Engine
  let ticking = false;
  const parallaxTargets = document.querySelectorAll('.status-grid, .companion-card, .hero-3d-visual, .section-header');

  function onScroll() {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        const viewportHeight = window.innerHeight;

        parallaxTargets.forEach(el => {
          const rect = el.getBoundingClientRect();
          const elementCenter = rect.top + rect.height / 2;
          const distanceFromCenter = elementCenter - viewportHeight / 2;
          const normalizedDist = Math.max(-1, Math.min(1, distanceFromCenter / (viewportHeight / 1.5)));

          // Subtle 3D pitch based on vertical scroll position
          const pitch = normalizedDist * 3.5; // -3.5deg to +3.5deg
          const depthZ = (1 - Math.abs(normalizedDist)) * 8; // pushes forward near center

          if (!el.matches(':hover')) {
            el.style.setProperty('--scroll-pitch', `${pitch.toFixed(2)}deg`);
            el.style.setProperty('--scroll-depth', `${depthZ.toFixed(1)}px`);
          }
        });

        // 3D Isometric Floating Stage Parallax (if present on index.html)
        const isoHero = document.querySelector('.hero-3d-visual');
        if (isoHero) {
          const scrollY = window.pageYOffset || document.documentElement.scrollTop;
          const rotX = 14 - Math.min(12, scrollY * 0.03);
          const rotY = -12 + Math.min(10, scrollY * 0.025);
          const rotZ = 4 - Math.min(4, scrollY * 0.015);
          const transY = scrollY * 0.15;
          isoHero.style.transform = `perspective(1200px) rotateX(${rotX}deg) rotateY(${rotY}deg) rotateZ(${rotZ}deg) translateY(${transY}px)`;
        }

        ticking = false;
      });
      ticking = true;
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();
