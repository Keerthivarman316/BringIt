import React, { useEffect, useRef } from 'react';

const CustomCursor = () => {
  const dotRef = useRef(null);
  const ringRef = useRef(null);
  const mousePos = useRef({ x: 0, y: 0 });
  const ringPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const dot = document.getElementById('custom-cursor-dot');
    const ring = document.getElementById('custom-cursor-ring');
    
    const onMouseMove = (e) => {
      mousePos.current = { x: e.clientX, y: e.clientY };
      if (dot) {
        dot.style.left = `${e.clientX}px`;
        dot.style.top = `${e.clientY}px`;
      }
    };

    const animateRing = () => {
      // 80ms lag logic (approx 0.15 interpolation)
      ringPos.current.x += (mousePos.current.x - ringPos.current.x) * 0.15;
      ringPos.current.y += (mousePos.current.y - ringPos.current.y) * 0.15;

      if (ring) {
        ring.style.left = `${ringPos.current.x}px`;
        ring.style.top = `${ringPos.current.y}px`;
      }
      requestAnimationFrame(animateRing);
    };

    const onMouseEnter = () => {
      if (dot) {
        dot.style.width = '12px';
        dot.style.height = '12px';
      }
      if (ring) {
        ring.style.width = '18px';
        ring.style.height = '18px';
        ring.style.borderColor = 'rgba(255, 92, 26, 0.8)';
      }
    };

    const onMouseLeave = () => {
      if (dot) {
        dot.style.width = '6px';
        dot.style.height = '6px';
      }
      if (ring) {
        ring.style.width = '24px';
        ring.style.height = '24px';
        ring.style.borderColor = 'rgba(255, 92, 26, 0.3)';
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    
    // Select all interactive elements
    const interactables = document.querySelectorAll('button, a, input, select, [role="button"]');
    interactables.forEach(el => {
      el.addEventListener('mouseenter', onMouseEnter);
      el.addEventListener('mouseleave', onMouseLeave);
    });

    const raf = requestAnimationFrame(animateRing);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      cancelAnimationFrame(raf);
      interactables.forEach(el => {
        el.removeEventListener('mouseenter', onMouseEnter);
        el.removeEventListener('mouseleave', onMouseLeave);
      });
    };
  }, []);

  return null; // Side effect only
};

export default CustomCursor;
