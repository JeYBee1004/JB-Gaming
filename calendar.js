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

(function() {
// ---------- Config ----------
const PHONE = '+254710709997'; // <- REPLACE with your Kenya WhatsApp number (e.g. 254712345678)
const POCHI_NOTE = 'Pochi La Biashara: +254710709997'; // replace with your Pochi number/instructions

// Pricing table matching your strategy
const SHORT_PRICES = {
    "PSVITA": {
    "2 Hours": 200,   // optional extra small slot
    "4 Hours": 300,
    "8 Hours": 500,
    "24 Hours": 800
    },
    "Nintendo DS Lite": {
    "2 Hours": 150,
    "4 Hours": 200,
    "8 Hours": 350,
    "24 Hours": 600
    }
};

const PACKAGE_PRICES = {
    "Weekend": { "PSVITA": 1500, "Nintendo DS Lite": 1000 },
    "Weekly": { "PSVITA": 4000, "Nintendo DS Lite": 3000 }
};

// ---------- State ----------
let bookings = {}; // from bookings.json
let visibleYear, visibleMonth;
let selectedDate = null;
let selectedConsole = '';
let selectedTime = '';

// ---------- DOM ----------
const monthYearEl = document.getElementById('month-year');
const daysContainer = document.getElementById('calendar-days');
const prevBtn = document.getElementById('prev-month');
const nextBtn = document.getElementById('next-month');
const selectedInfo = document.getElementById('selected-info');
const consoleSelect = document.getElementById('console-select');
const timeSelect = document.getElementById('time-select');
const priceDisplay = document.getElementById('price-display');
const bookNowBtn = document.getElementById('book-now-btn');
const adminMarkBookedBtn = document.getElementById('admin-mark-booked');

const modal = document.getElementById('modal');
const modalConfirm = document.getElementById('modal-confirm');
const modalCancel = document.getElementById('modal-cancel');
const confirmSummary = document.getElementById('confirm-summary');

// ---------- Utilities ----------
function toISO(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,'0');
    const day = String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${day}`;
}

function isSameDay(a,b){
    return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
}

// ---------- Load bookings.json ----------
async function loadBookings(){
    try {
    const res = await fetch('bookings.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('no bookings.json found');
    bookings = await res.json();
    } catch (err) {
    console.warn('Failed to load bookings.json — using fallback sample. Error:', err.message);
    bookings = {
        "2025-12-05": ["PSVITA"],
        "2025-12-07": ["Nintendo DS Lite"],
        "2025-12-08": ["PSVITA","Nintendo DS Lite"]
    };
    }
}

// ---------- Render calendar ----------
function renderCalendar(year, month){
    visibleYear = year; visibleMonth = month;
    const today = new Date(); today.setHours(0,0,0,0);
    const first = new Date(year, month, 1);
    const last = new Date(year, month+1, 0);

    monthYearEl.textContent = first.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    let html = '';
    const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    dayNames.forEach(n => html += `<div class="weekday">${n}</div>`);

    const leading = first.getDay();
    for (let i=0;i<leading;i++) html += `<div></div>`;

    for (let d = 1; d<= last.getDate(); d++){
    const dt = new Date(year, month, d);
    const iso = toISO(dt);
    const isToday = isSameDay(dt, new Date());
    const isPast = dt < today && !isToday;

    const bookedConsoles = Array.isArray(bookings[iso]) ? bookings[iso] : [];
    const isFullyBooked = bookedConsoles.length >= 2; // two consoles total

    const classes = ['calendar-day'];
    if (isToday) classes.push('today');
    if (isPast) classes.push('past');
    if (isFullyBooked) classes.push('booked');
    if (!isPast && !isFullyBooked) classes.push('available');

    let badge = '';
    if (isPast) badge = 'Past';
    else {
        const free = Object.keys(SHORT_PRICES).filter(c => !bookedConsoles.includes(c));
        badge = free.length === 0 ? 'All booked' : `${free.length} available`;
    }

    const attrs = `data-iso="${iso}" data-year="${year}" data-month="${month}" data-day="${d}"`;
    const disabled = isPast ? 'aria-disabled="true"' : '';
    html += `<div class="${classes.join(' ')}" ${attrs} ${disabled} onclick="onCalendarDayClick(event)"><div class="day-number">${d}</div><div class="availability-badge">${badge}</div></div>`;
    }

    daysContainer.innerHTML = html;
}

// ---------- Day click ----------
window.onCalendarDayClick = function(event){
    const target = event.currentTarget || event.target.closest('.calendar-day');
    if (!target) return;
    if (target.classList.contains('past')) return;

    const year = parseInt(target.getAttribute('data-year'));
    const month = parseInt(target.getAttribute('data-month'));
    const day = parseInt(target.getAttribute('data-day'));

    selectedDate = new Date(year, month, day);

    document.querySelectorAll('.calendar-day').forEach(el => el.classList.remove('selected'));
    target.classList.add('selected');

    updateSelectedInfo();
    updateAvailabilityForSelectedDate();
    checkBookButtonState();
};

function updateSelectedInfo(){
    if (!selectedDate) { selectedInfo.innerHTML = '<p class="small">No date selected</p>'; return; }
    selectedInfo.innerHTML = `<div class="small">Date</div><div style="font-weight:700; margin-bottom:4px">${selectedDate.toDateString()}</div><div class="small">Choose console & time/package</div>`;
}

function updateAvailabilityForSelectedDate(){
    if (!selectedDate) return;
    const iso = toISO(selectedDate);
    const booked = Array.isArray(bookings[iso]) ? bookings[iso] : [];

    Array.from(consoleSelect.options).forEach(opt => {
    if (!opt.value) return;
    if (booked.includes(opt.value)){
        opt.disabled = true;
        opt.text = `${opt.value} — BOOKED`;
    } else {
        opt.disabled = false;
        opt.text = opt.value;
    }
    });

    if (selectedConsole && booked.includes(selectedConsole)) {
    selectedConsole = '';
    consoleSelect.value = '';
    }
    computePriceDisplay();
}

// ---------- Pricing logic ----------
function computePriceDisplay(){
    if (!selectedDate || !selectedConsole || !selectedTime) {
    priceDisplay.textContent = 'KSh —';
    return;
    }

    // Short durations
    if (SHORT_PRICES[selectedConsole] && SHORT_PRICES[selectedConsole][selectedTime] !== undefined) {
    const p = SHORT_PRICES[selectedConsole][selectedTime];
    priceDisplay.textContent = `KSh ${p.toLocaleString()}`;
    return;
    }

    // Packages
    if (selectedTime === 'Weekend' || selectedTime === 'Weekly') {
    const p = PACKAGE_PRICES[selectedTime][selectedConsole];
    priceDisplay.textContent = `KSh ${p.toLocaleString()}`;
    return;
    }

    // default fallback
    priceDisplay.textContent = 'KSh —';
}

function checkBookButtonState(){
    if (selectedDate && selectedConsole && selectedTime) bookNowBtn.disabled = false;
    else bookNowBtn.disabled = true;
    computePriceDisplay();
}

// ---------- WhatsApp booking ----------
function buildWhatsAppMessage(){
    const iso = toISO(selectedDate);
    const readable = selectedDate.toDateString();
    const price = priceDisplay.textContent;
    // include note for weekend/weekly package selection
    let extra = '';
    if (selectedTime === 'Weekend') extra = '%0A(Note: Weekend package covers Fri–Sun)';
    if (selectedTime === 'Weekly') extra = '%0A(Note: Weekly package covers 7 days)';
    const msg = `Hello! I would like to book:%0A%0AConsole: ${selectedConsole}%0ADate: ${readable} (${iso})%0ATime/Package: ${selectedTime}%0APrice: ${price}%0ADuration: ${selectedTime}%0AName: %0ALocation: %0A${POCHI_NOTE}${extra}%0A%0APlease confirm availability.`;
    return msg;
}

function openWhatsApp(){
    const msg = buildWhatsAppMessage();
    const url = `https://wa.me/${PHONE}?text=${msg}`;
    window.open(url, '_blank');
}

// ---------- Admin helper: mark selected booked locally ----------
function adminMarkSelectedAsBookedLocal(){
    if (!selectedDate || !selectedConsole) { alert('Select date and console first.'); return; }
    const iso = toISO(selectedDate);
    if (!bookings[iso]) bookings[iso] = [];
    if (!bookings[iso].includes(selectedConsole)) bookings[iso].push(selectedConsole);
    renderCalendar(visibleYear, visibleMonth);
    updateAvailabilityForSelectedDate();
    alert(`(Local) Marked ${selectedConsole} as booked on ${iso}. Update bookings.json on the server to persist.`);
}

// ---------- Modal UI ----------
function showModal(){
    const iso = toISO(selectedDate);
    confirmSummary.innerHTML = `
    <div><strong>Console:</strong> ${selectedConsole}</div>
    <div><strong>Date:</strong> ${selectedDate.toDateString()} (${iso})</div>
    <div><strong>Time/Package:</strong> ${selectedTime}</div>
    <div><strong>Price:</strong> ${priceDisplay.textContent}</div>
    <div style="margin-top:8px;"><strong>Payment:</strong> ${POCHI_NOTE}</div>
    <div class="small" style="margin-top:8px;">After you pay via Pochi, the owner will confirm and update the calendar (server-side bookings.json).</div>
    `;
    modal.classList.add('show'); modal.setAttribute('aria-hidden','false');
}
function hideModal(){ modal.classList.remove('show'); modal.setAttribute('aria-hidden','true'); }

// ---------- Init ----------
async function init(){
    const now = new Date(); visibleYear = now.getFullYear(); visibleMonth = now.getMonth();

    prevBtn.addEventListener('click', () => { const p = new Date(visibleYear, visibleMonth-1,1); renderCalendar(p.getFullYear(), p.getMonth()); });
    nextBtn.addEventListener('click', () => { const n = new Date(visibleYear, visibleMonth+1,1); renderCalendar(n.getFullYear(), n.getMonth()); });

    consoleSelect.addEventListener('change', (e) => {
    selectedConsole = e.target.value;
    const opt = e.target.selectedOptions[0];
    if (opt && opt.disabled) { selectedConsole=''; e.target.value=''; alert('That console is already booked for this date. Choose another date or console.'); }
    checkBookButtonState();
    });

    timeSelect.addEventListener('change', (e) => { selectedTime = e.target.value; checkBookButtonState(); });

    bookNowBtn.addEventListener('click', () => { showModal(); });

    modalCancel.addEventListener('click', hideModal);
    modalConfirm.addEventListener('click', () => {
    hideModal();
    openWhatsApp();
    const pending = { date: toISO(selectedDate), console: selectedConsole, time: selectedTime, price: priceDisplay.textContent, createdAt: new Date().toISOString() };
    const pendings = JSON.parse(localStorage.getItem('pendingBookings') || '[]'); pendings.push(pending); localStorage.setItem('pendingBookings', JSON.stringify(pendings));
    });

    adminMarkBookedBtn.addEventListener('click', adminMarkSelectedAsBookedLocal);

    await loadBookings();
    renderCalendar(visibleYear, visibleMonth);

    // keyboard accessibility
    document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (modal.classList.contains('show')) hideModal();
        if (document.getElementById('sidebar').classList.contains('active')) toggleSidebar();
    }
    });
}

init();

// expose toggleSidebar
window.toggleSidebar = function(){
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
    document.body.style.overflow = sidebar.classList.contains('active') ? 'hidden' : 'auto';
};

// debugging helpers
window._BOOKINGS = bookings;
window._RELOAD_BOOKINGS = async function(){ await loadBookings(); renderCalendar(visibleYear, visibleMonth); };

})();
