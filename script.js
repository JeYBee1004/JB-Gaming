 // 1) Disable context menu (right-click)
  function disableContextMenu() {
    document.addEventListener('contextmenu', function (e) {
      e.preventDefault();
      // optional visible feedback:
      // alert("Right-click is disabled on this page.");
      return false;
    }, { passive: false });
  }

  // 2) Disable selection and copy (optional)
  function disableSelectionAndCopy() {
    // prevent text selection and copy shortcuts
    document.addEventListener('selectstart', (e) => e.preventDefault(), { passive: false });
    document.addEventListener('copy', (e) => e.preventDefault(), { passive: false });
  }

  // 3) Disable common devtools & view-source keyboard shortcuts
  function disableDevtoolsShortcuts() {
    document.addEventListener('keydown', function (e) {
      // Normalize key name for cross-browser consistency
      const key = e.key || e.keyCode;

      // F12
      if (key === 'F12' || key === 123) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl+Shift+I / J / C  (DevTools)
      if (e.ctrlKey && e.shiftKey && (key === 'I' || key === 'J' || key === 'C' || key === 'i' || key === 'j' || key === 'c')) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl+U (view-source)
      if (e.ctrlKey && (key === 'U' || key === 'u')) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl+Shift+K (Firefox console), Ctrl+Shift+S (some browsers)
      if (e.ctrlKey && e.shiftKey && (key === 'K' || key === 'k' || key === 'S' || key === 's')) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    }, { passive: false });
  }

  // 4) Detect DevTools using outer/inner dimension heuristic + visibility
  function startDevtoolsDetector(onDetect) {
    let lastState = { open: false, orientation: null };

    function check() {
      const widthDiff  = Math.abs(window.outerWidth - window.innerWidth);
      const heightDiff = Math.abs(window.outerHeight - window.innerHeight);
      const isOpen = widthDiff > SIZE_THRESHOLD || heightDiff > SIZE_THRESHOLD;

      // If devtools open state changed
      if (isOpen !== lastState.open) {
        lastState.open = isOpen;
        lastState.orientation = (widthDiff > heightDiff) ? 'vertical' : 'horizontal';
        if (isOpen) onDetect({ orientation: lastState.orientation, widthDiff, heightDiff });
      }
    }

    // also try to detect when developer tools are undocked (window.onfocus/blur sometimes helps)
    window.addEventListener('resize', check);
    window.addEventListener('focus', check);
    window.addEventListener('blur', check);

    // periodic check for browsers that don't trigger events
    const id = setInterval(check, CHECK_INTERVAL_MS);

    // return a stop function
    return function stop() {
      clearInterval(id);
      window.removeEventListener('resize', check);
      window.removeEventListener('focus', check);
      window.removeEventListener('blur', check);
    };
  }

  // 5) Action to take when DevTools detected (based on config)
  function handleDevtoolsDetected(info) {
    const msg = `Developer tools detected (${info.orientation || 'unknown'}). Page access restricted.`;
    if (ON_DETECT_ACTION === 'log') {
      console.warn(msg, info);
    } else if (ON_DETECT_ACTION === 'warn') {
      // show a banner/warn but do not remove content
      try {
        const banner = document.createElement('div');
        banner.textContent = 'Warning: Developer tools detected. Some actions may be disabled.';
        banner.style = 'position:fixed;top:0;left:0;right:0;padding:10px;text-align:center;background:#ffcc00;z-index:99999;font-family:Arial,sans-serif;';
        document.documentElement.appendChild(banner);
        setTimeout(() => banner.remove(), 5000);
      } catch (e) { /* ignore */ }
      console.warn(msg, info);
    } else {
      // block
      blockPage('Developer tools are not allowed on this page. Please close them and reload.');
      console.warn(msg, info);
    }
  }

// Sidebar Toggle Function
function toggleSidebar() {
  const sidebar = document.getElementById("sidebar")
  const overlay = document.getElementById("overlay")

  sidebar.classList.toggle("active")
  overlay.classList.toggle("active")
}

// Close sidebar when clicking a link (for mobile)
document.addEventListener("DOMContentLoaded", () => {
  const sidebarLinks = document.querySelectorAll(".sidebar nav a")

  sidebarLinks.forEach((link) => {
    link.addEventListener("click", () => {
      if (window.innerWidth <= 768) {
        toggleSidebar()
      }
    })
  })
})

// Prevent body scroll when sidebar is open
document.getElementById("sidebar").addEventListener("transitionend", function () {
  if (this.classList.contains("active")) {
    document.body.style.overflow = "hidden"
  } else {
    document.body.style.overflow = "auto"
  }
})
