import posthog from 'posthog-js';
import { formatIncompletePhoneNumber } from '../vendor/libphonenumber-js/min.esm.js';
import {
  COUNTRIES,
  DEFAULT_COUNTRY,
  countryFromPhone,
  findCountry,
  flagUrl,
  stripDialCode,
} from './booking-countries.js';

const STORAGE_KEY = 'essence-booking';
const FORM_STEPS = ['contact', 'phone', 'listSize', 'revenue', 'emailPct'];
const ALL_STEPS = [...FORM_STEPS, 'calendar'];
const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const TIME_SLOTS = [
  '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM',
];

const QUERY_ALIASES = {
  firstName: ['firstname', 'first_name', 'fname', 'first'],
  lastName: ['lastname', 'last_name', 'lname', 'last'],
  email: ['email', 'mail'],
  phone: ['phone', 'tel', 'telephone', 'mobile'],
  country: ['country', 'country_code', 'iso'],
  listSize: ['listsize', 'list_size', 'email_list', 'list', 'klaviyo_list'],
  revenue: ['revenue', 'd2c_revenue', 'monthly_revenue', 'rev'],
  emailPct: ['emailpct', 'email_pct', 'email_revenue', 'klaviyo_pct', 'email_percent'],
  meetingDate: ['meetingdate', 'date'],
  meetingTime: ['meetingtime', 'time'],
  step: ['step', 'page'],
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const booking = document.getElementById('booking');
const form = document.getElementById('booking-form');
const nextButton = document.getElementById('booking-next');
const nextLabel = document.querySelector('.booking-next__label');
const backButton = document.getElementById('booking-back');
const progress = document.getElementById('booking-progress');
const progressBar = document.getElementById('booking-progress-bar');
const stepCount = document.getElementById('booking-step-count');
const statusEl = document.getElementById('booking-status');
const scheduler = document.getElementById('booking-scheduler');
const calendarTab = document.getElementById('booking-cal-tab');
const calendarTabDate = document.getElementById('booking-cal-tab-date');
const calendarPanel = document.getElementById('booking-cal-panel');
const calendarRoot = document.getElementById('booking-calendar');
const timesLabel = document.getElementById('booking-times-label');
const timesTz = document.getElementById('booking-times-tz');
const timesPanel = document.getElementById('booking-times');
const timesGrid = document.getElementById('booking-times-grid');
const bookedPanel = document.getElementById('booking-booked');
const bookedLottieHost = document.getElementById('booking-booked-lottie');
const bookedTitle = document.getElementById('booking-booked-title');
const bookedCopy = document.getElementById('booking-booked-copy');
const BOOKED_LOTTIE_SRC = new URL('../animations/booking-success.json', import.meta.url).href;
let bookedLottie = null;

async function playBookedLottie() {
  if (!bookedLottieHost || prefersReducedMotion()) return;
  try {
    if (bookedLottie) {
      bookedLottie.goToAndPlay(0, true);
      return;
    }
    const { default: lottie } = await import('../vendor/lottie-web/lottie.min.esm.js');
    bookedLottie = lottie.loadAnimation({
      container: bookedLottieHost,
      renderer: 'svg',
      loop: false,
      autoplay: true,
      path: BOOKED_LOTTIE_SRC,
    });
  } catch {
    // Keep the confirmation copy if the animation file is missing.
  }
}

function stopBookedLottie() {
  bookedLottie?.stop();
}

const countryButton = document.getElementById('booking-country');
const countryFlag = document.getElementById('booking-country-flag');
const countryDial = document.getElementById('booking-country-dial');
const countryMenu = document.getElementById('booking-country-menu');
const countrySearch = document.getElementById('booking-country-search');
const countryList = document.getElementById('booking-country-list');

if (!booking || !form || !nextButton || !backButton) {
  throw new Error('Booking page markup is missing required nodes.');
}

function triggerWebHaptic() {
  if (typeof navigator.vibrate === 'function') {
    navigator.vibrate(12);
  }
}

function activateHapticHost(host) {
  if (host instanceof HTMLButtonElement && !host.disabled) {
    host.click();
  }
}

function attachHapticOverlay(host) {
  if (!(host instanceof HTMLElement) || host.querySelector(':scope > .booking-haptic-switch')) {
    return;
  }

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.setAttribute('switch', '');
  input.className = 'booking-haptic-switch';
  input.tabIndex = -1;
  input.setAttribute('aria-hidden', 'true');
  host.appendChild(input);

  input.addEventListener('click', (event) => {
    event.stopPropagation();
  });
  input.addEventListener('change', () => {
    activateHapticHost(host);
  });
}

function mountHapticOverlays() {
  [nextButton, backButton].forEach(attachHapticOverlay);
}

const steps = ALL_STEPS.map((id) => form.querySelector(`[data-step="${id}"]`)).filter(Boolean);
const gsap = window.gsap;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function toIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseIsoDate(value) {
  const [year, month, day] = String(value || '').split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function formatMonthCaption(date) {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function formatMeetingDate(value) {
  const date = parseIsoDate(value);
  if (!date) return '';
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function formatTabDate(value) {
  const date = parseIsoDate(value);
  if (!date) return '';
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatTimezoneCity(timeZone) {
  const city = String(timeZone).split('/').pop() || '';
  return city.replace(/_/g, ' ');
}

function formatTimezoneOffset(timeZone) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'shortOffset',
    }).formatToParts(new Date());
    return parts.find((part) => part.type === 'timeZoneName')?.value || '';
  } catch {
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        timeZoneName: 'short',
      }).formatToParts(new Date());
      return parts.find((part) => part.type === 'timeZoneName')?.value || '';
    } catch {
      return '';
    }
  }
}

function formatTimezoneLabel(timeZone) {
  if (!timeZone) return '';
  const city = formatTimezoneCity(timeZone);
  const offset = formatTimezoneOffset(timeZone);
  if (city && offset) return `${city} (${offset})`;
  return city || offset || timeZone;
}

function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function isDisabledDay(date) {
  return startOfDay(date) < startOfDay(new Date()) || isWeekend(date);
}

const state = {
  index: 0,
  animating: false,
  calendarMonth: startOfMonth(new Date()),
  calendarCollapsed: false,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
  booked: false,
  answers: {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    country: DEFAULT_COUNTRY,
    listSize: '',
    revenue: '',
    emailPct: '',
    meetingDate: '',
    meetingTime: '',
  },
};

let countryLocked = false;

function prefersReducedMotion() {
  return reduceMotion.matches || !gsap;
}

function normalizeToken(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&lt;/g, '<')
    .replace(/[^a-z0-9+.%<]/g, '');
}

function readQueryMap() {
  const params = new URLSearchParams(window.location.search);
  const map = new Map();
  params.forEach((value, key) => {
    map.set(key.toLowerCase().replace(/-/g, '_'), value);
  });
  return map;
}

function readAliasedParam(queryMap, field) {
  const keys = QUERY_ALIASES[field] || [];
  for (const key of keys) {
    if (queryMap.has(key)) {
      return String(queryMap.get(key) || '').trim();
    }
  }
  return '';
}

function optionTokens(input) {
  const label = input.closest('label')?.querySelector('.booking-choice__label')?.textContent || '';
  const tokens = new Set();

  [input.value, label].forEach((item) => {
    const token = normalizeToken(item);
    if (!token) return;
    tokens.add(token);
    tokens.add(token.replace(/plus/g, '+'));
    tokens.add(token.replace(/\+/g, 'plus'));
    tokens.add(token.replace(/^</, 'under'));
    tokens.add(token.replace(/^under/, '<'));
  });

  return tokens;
}

function matchRadioValue(name, rawValue) {
  const needle = normalizeToken(rawValue);
  if (!needle) return '';

  const inputs = Array.from(form.querySelectorAll(`input[name="${name}"]`));
  return inputs.find((input) => optionTokens(input).has(needle))?.value || '';
}

function loadStoredAnswers() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function persistAnswers() {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state.answers));
}

function selectedCountry() {
  return findCountry(state.answers.country) || COUNTRIES.find((country) => country.iso === DEFAULT_COUNTRY);
}

function composedPhone() {
  const raw = form.phone.value.trim();
  if (!raw) return '';
  if (raw.startsWith('+')) return raw.replace(/\s+/g, '');
  return `${selectedCountry().dial}${raw.replace(/\D/g, '')}`;
}

function collectAnswersFromDom() {
  state.answers.firstName = form.firstName.value.trim();
  state.answers.lastName = form.lastName.value.trim();
  state.answers.email = form.email.value.trim();
  state.answers.country = selectedCountry().iso;
  state.answers.phone = composedPhone();
  state.answers.listSize = form.listSize.value;
  state.answers.revenue = form.revenue.value;
  state.answers.emailPct = form.emailPct.value;
}

function syncFilledState(input) {
  const field = input.closest('.booking-field');
  if (!field || input.type === 'radio') return;
  field.classList.toggle('is-filled', Boolean(input.value));
}

function applyAnswersToDom() {
  form.firstName.value = state.answers.firstName;
  form.lastName.value = state.answers.lastName;
  form.email.value = state.answers.email;

  const inferredCountry = countryFromPhone(state.answers.phone);
  const explicitCountry = findCountry(state.answers.country);
  const country = (String(state.answers.phone).trim().startsWith('+') && inferredCountry)
    ? inferredCountry
    : (explicitCountry || inferredCountry || COUNTRIES.find((item) => item.iso === DEFAULT_COUNTRY));
  setCountry(country.iso, { persist: false });
  form.phone.value = stripDialCode(state.answers.phone, country);
  formatPhoneInput({ restoreCaret: false });

  [form.firstName, form.lastName, form.email, form.phone].forEach(syncFilledState);

  ['listSize', 'revenue', 'emailPct'].forEach((name) => {
    const value = state.answers[name];
    const input = value ? form.querySelector(`input[name="${name}"][value="${CSS.escape(value)}"]`) : null;
    if (input) {
      input.checked = true;
      syncChoiceStyles(name);
    }
  });
}

function syncChoiceStyles(name) {
  form.querySelectorAll(`input[name="${name}"]`).forEach((input) => {
    input.closest('.booking-choice')?.classList.toggle('is-selected', input.checked);
  });
}

function hasQueryPrefill(query) {
  return Object.keys(QUERY_ALIASES).some((field) => {
    if (field === 'step') return false;
    return Boolean(readAliasedParam(query, field));
  });
}

function hydrate() {
  const stored = loadStoredAnswers();
  const query = readQueryMap();
  const hash = normalizeToken(readAliasedParam(query, 'step') || window.location.hash.replace('#', ''));
  const freshLanding = !hasQueryPrefill(query) && (!hash || hash === 'contact');

  Object.keys(state.answers).forEach((field) => {
    const fromQuery = readAliasedParam(query, field);
    const fromStore = freshLanding ? '' : (stored[field] || '');
    if (['listSize', 'revenue', 'emailPct'].includes(field)) {
      state.answers[field] = matchRadioValue(field, fromQuery) || fromStore;
      return;
    }
    if (field === 'country') {
      const queryCountry = findCountry(fromQuery)?.iso;
      const storedCountry = findCountry(fromStore)?.iso;
      if (queryCountry) {
        state.answers.country = queryCountry;
        countryLocked = true;
        return;
      }
      if (storedCountry && !freshLanding) {
        state.answers.country = storedCountry;
        countryLocked = true;
        return;
      }
      state.answers.country = DEFAULT_COUNTRY;
      return;
    }
    state.answers[field] = fromQuery || fromStore;
  });

  applyAnswersToDom();
  if (String(state.answers.phone).trim().startsWith('+')) {
    countryLocked = true;
  }
  if (freshLanding) {
    sessionStorage.removeItem(STORAGE_KEY);
  }

  const requestedIndex = ALL_STEPS.findIndex((step) => normalizeToken(step) === hash);
  if (requestedIndex > 0 && canEnterStep(requestedIndex)) {
    state.index = requestedIndex;
  }
}

function fieldError(field, message) {
  const wrap = form.querySelector(`[data-field="${field}"]`);
  const error = form.querySelector(`[data-error-for="${field}"]`);
  wrap?.classList.toggle('is-invalid', Boolean(message));
  if (error) error.textContent = message || '';
}

function clearStepErrors(stepId) {
  const step = form.querySelector(`[data-step="${stepId}"]`);
  step?.querySelectorAll('.is-invalid').forEach((node) => node.classList.remove('is-invalid'));
  step?.querySelectorAll('.booking-error').forEach((node) => {
    node.textContent = '';
  });
}

function validateContact() {
  const firstName = form.firstName.value.trim();
  const lastName = form.lastName.value.trim();
  const email = form.email.value.trim();
  let ok = true;

  if (firstName.length < 2) {
    fieldError('firstName', 'Enter your first name.');
    ok = false;
  } else {
    fieldError('firstName', '');
  }

  if (lastName.length < 2) {
    fieldError('lastName', 'Enter your last name.');
    ok = false;
  } else {
    fieldError('lastName', '');
  }

  if (!EMAIL_PATTERN.test(email)) {
    fieldError('email', 'Enter a valid email.');
    ok = false;
  } else {
    fieldError('email', '');
  }

  return ok;
}

function validatePhone() {
  const digits = form.phone.value.replace(/\D/g, '');
  if (digits.length < 7) {
    fieldError('phone', 'Enter a phone number we can actually reach.');
    return false;
  }
  fieldError('phone', '');
  return true;
}

function validateRadio(name, message) {
  const selected = form.querySelector(`input[name="${name}"]:checked`);
  const group = form.querySelector(`[data-field="${name}"]`);
  const error = form.querySelector(`[data-error-for="${name}"]`);
  if (!selected) {
    group?.classList.add('is-invalid');
    if (error) error.textContent = message;
    return false;
  }
  group?.classList.remove('is-invalid');
  if (error) error.textContent = '';
  return true;
}

function validateStep(index) {
  const id = ALL_STEPS[index];
  if (id === 'contact') return validateContact();
  if (id === 'phone') return validatePhone();
  if (id === 'listSize') return validateRadio('listSize', 'Select a list size.');
  if (id === 'revenue') return validateRadio('revenue', 'Select a revenue range.');
  if (id === 'emailPct') return validateRadio('emailPct', 'Select an email revenue share.');
  if (id === 'calendar') {
    if (!state.answers.meetingDate || !state.answers.meetingTime) {
      announce('Pick a date and time.');
      return false;
    }
    return true;
  }
  return true;
}

function canEnterStep(index) {
  for (let i = 0; i < index && i < FORM_STEPS.length; i += 1) {
    if (!validateStep(i)) return false;
  }
  return true;
}

function shake(node) {
  if (!node) return;
  if (prefersReducedMotion()) return;
  gsap.fromTo(node, { x: 0 }, {
    x: 7,
    duration: 0.06,
    repeat: 5,
    yoyo: true,
    ease: 'power1.inOut',
    onComplete: () => gsap.set(node, { x: 0 }),
  });
}

function focusStep(index) {
  const step = steps[index];
  if (!step) return;
  const firstEmpty = Array.from(step.querySelectorAll('input')).find((input) => {
    if (input.type === 'radio') return false;
    return !input.value.trim();
  });
  const firstText = step.querySelector('input:not([type="radio"])');
  const target = firstEmpty || firstText;
  if (target && window.matchMedia('(pointer: fine)').matches) {
    target.focus({ preventScroll: true });
  }
}

function updateChrome() {
  const id = ALL_STEPS[state.index];
  const formIndex = Math.min(state.index, FORM_STEPS.length - 1);
  const percent = id === 'calendar' ? 100 : ((formIndex + 1) / FORM_STEPS.length) * 100;

  booking.dataset.step = id;
  booking.classList.toggle('is-calendar', id === 'calendar');
  booking.classList.toggle('is-booked', state.booked);
  backButton.hidden = state.index === 0;
  nextButton.disabled = id === 'calendar' && (!state.answers.meetingDate || !state.answers.meetingTime);
  if (nextLabel) nextLabel.textContent = id === 'calendar' ? 'Book' : 'Next';
  stepCount.textContent = `${Math.min(state.index + 1, FORM_STEPS.length)} / ${FORM_STEPS.length}`;
  progress.setAttribute('aria-valuenow', String(Math.round(percent)));

  if (prefersReducedMotion()) {
    progressBar.style.transform = `scaleX(${percent / 100})`;
  } else {
    gsap.to(progressBar, {
      scaleX: percent / 100,
      duration: 0.52,
      ease: 'power3.out',
      overwrite: true,
    });
  }

  const url = new URL(window.location.href);
  url.hash = id;
  window.history.replaceState({ step: id }, '', url);
}

function announce(message) {
  if (statusEl) statusEl.textContent = message;
}

const STEP_MOTION_NODES = '.booking-question, .booking-help, .booking-field, .booking-choice, .booking-kicker, .booking-scheduler, .booking-booked';
let stepTween = null;

function stepMotionNodes(step) {
  return step.querySelectorAll(STEP_MOTION_NODES);
}

function settleStep(step, visible) {
  if (!step) return;
  step.classList.toggle('is-active', visible);
  if (!gsap) return;
  const nodes = [step, ...stepMotionNodes(step)];
  gsap.killTweensOf(nodes);
  gsap.set(nodes, { clearProps: 'transform,opacity,visibility' });
}

function goTo(index, direction = 1) {
  if (index === state.index || index < 0 || index >= steps.length) return;

  const outgoing = steps[state.index];
  const incoming = steps[index];
  const outgoingChildren = stepMotionNodes(outgoing);
  const incomingChildren = stepMotionNodes(incoming);

  if (stepTween) {
    stepTween.kill();
    stepTween = null;
    steps.forEach((step) => {
      if (step !== incoming) settleStep(step, false);
    });
  }

  state.animating = true;
  state.index = index;
  clearStepErrors(ALL_STEPS[index]);
  updateChrome();

  if (!prefersReducedMotion()) {
    gsap.set(incoming, { autoAlpha: 0, y: direction > 0 ? 28 : -28 });
    gsap.set(incomingChildren, { autoAlpha: 0, y: direction > 0 ? 16 : -12 });
  }

  incoming.classList.add('is-active');

  const finish = () => {
    steps.forEach((step) => {
      if (step !== incoming) settleStep(step, false);
    });
    settleStep(incoming, true);
    state.animating = false;
    stepTween = null;
    focusStep(index);
    announce(`Step ${Math.min(index + 1, FORM_STEPS.length)} of ${FORM_STEPS.length}`);
    captureStepView();
  };

  if (prefersReducedMotion()) {
    finish();
    return;
  }

  stepTween = gsap.timeline({
    defaults: { ease: 'power3.out' },
    onComplete: finish,
  });

  stepTween.to(outgoingChildren, {
    autoAlpha: 0,
    y: direction > 0 ? -16 : 16,
    duration: 0.22,
    stagger: 0.012,
    ease: 'power2.in',
  }, 0);
  stepTween.to(outgoing, { autoAlpha: 0, duration: 0.22, ease: 'power2.in' }, 0);
  stepTween.to(incoming, { autoAlpha: 1, y: 0, duration: 0.42 }, 0.1);
  stepTween.to(incomingChildren, {
    autoAlpha: 1,
    y: 0,
    duration: 0.38,
    stagger: 0.018,
  }, 0.14);
}

function captureStepView() {
  posthog.capture('booking_step_viewed', {
    step: ALL_STEPS[state.index],
    step_index: state.index + 1,
  });
}

function selectedLabel(name) {
  const input = form.querySelector(`input[name="${name}"]:checked`);
  return input?.closest('label')?.querySelector('.booking-choice__label')?.textContent.trim() || '';
}

function syncCalendarTab() {
  if (!calendarTab || !calendarTabDate) return;
  const hasDate = Boolean(state.answers.meetingDate);
  calendarTab.hidden = !hasDate || !state.calendarCollapsed;
  calendarTabDate.textContent = formatTabDate(state.answers.meetingDate);
  calendarTab.setAttribute('aria-expanded', String(!state.calendarCollapsed));
  scheduler?.classList.toggle('is-collapsed', state.calendarCollapsed);
}

function isWideCalendar() {
  return window.matchMedia('(min-width: 720px)').matches;
}

function syncTimesHeight() {
  if (!timesGrid) return;
  if (!isWideCalendar() || !calendarRoot) {
    timesGrid.style.maxHeight = '';
    return;
  }

  const calendarHeight = calendarRoot.getBoundingClientRect().height;
  if (!calendarHeight) {
    timesGrid.style.maxHeight = '';
    return;
  }

  const heading = timesPanel?.querySelector('.booking-times__heading');
  const headingHeight = heading ? heading.getBoundingClientRect().height : 0;
  const gap = timesPanel ? parseFloat(getComputedStyle(timesPanel).rowGap || '10') : 10;
  timesGrid.style.maxHeight = `${Math.max(80, Math.round(calendarHeight - headingHeight - gap))}px`;
}

function setCalendarCollapsed(collapsed, { animate = true } = {}) {
  if (!calendarPanel) return;
  if (isWideCalendar()) {
    collapsed = false;
    animate = false;
  }

  if (!state.answers.meetingDate) {
    state.calendarCollapsed = false;
    gsap?.killTweensOf(calendarPanel);
    gsap?.set(calendarPanel, { clearProps: 'height,overflow,opacity' });
    syncCalendarTab();
    return;
  }

  const next = Boolean(collapsed);
  if (state.calendarCollapsed === next && animate) {
    syncCalendarTab();
    return;
  }

  const instant = !animate || prefersReducedMotion() || !gsap;
  if (instant) {
    state.calendarCollapsed = next;
    gsap?.killTweensOf(calendarPanel);
    if (next) {
      gsap?.set(calendarPanel, { height: 0, overflow: 'hidden', opacity: 0 });
    } else {
      gsap?.set(calendarPanel, { clearProps: 'height,overflow,opacity' });
    }
    syncCalendarTab();
    return;
  }

  gsap.killTweensOf(calendarPanel);
  const fromHeight = next ? calendarPanel.offsetHeight : 0;
  gsap.set(calendarPanel, { height: fromHeight, overflow: 'hidden', opacity: next ? 1 : 0 });
  state.calendarCollapsed = next;
  syncCalendarTab();

  const toHeight = next ? 0 : calendarPanel.scrollHeight;
  gsap.to(calendarPanel, {
    height: toHeight,
    opacity: next ? 0 : 1,
    duration: 0.42,
    ease: 'power3.inOut',
    onComplete: () => {
      if (!next) gsap.set(calendarPanel, { clearProps: 'height,overflow,opacity' });
    },
  });

  if (next && timesGrid) {
    gsap.fromTo(timesGrid, { y: 10, autoAlpha: 0.35 }, {
      y: 0,
      autoAlpha: 1,
      duration: 0.36,
      delay: 0.08,
      ease: 'power3.out',
      overwrite: true,
      onComplete: () => gsap.set(timesGrid, { clearProps: 'transform,opacity,visibility' }),
    });
  }
}

function renderTimes() {
  if (!timesGrid || !timesLabel) return;
  timesLabel.textContent = state.answers.meetingDate ? 'Available times' : 'Select a date';
  if (timesTz) {
    const zone = formatTimezoneLabel(state.timezone);
    timesTz.textContent = zone;
    timesTz.hidden = !zone;
  }
  timesGrid.innerHTML = TIME_SLOTS.map((slot) => {
    const selected = slot === state.answers.meetingTime ? ' is-selected' : '';
    const disabled = state.answers.meetingDate ? '' : ' disabled';
    return `<button type="button" class="booking-time${selected}" data-time="${slot}"${disabled}>${slot}</button>`;
  }).join('');
  requestAnimationFrame(syncTimesHeight);
}

function renderCalendar() {
  if (!calendarRoot) return;
  const month = state.calendarMonth;
  const firstDay = startOfMonth(month);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const gridStart = new Date(firstDay);
  gridStart.setDate(1 - startOffset);
  const todayIso = toIsoDate(new Date());
  const selectedIso = state.answers.meetingDate;
  const minMonth = startOfMonth(new Date());
  const canGoPrev = month > minMonth;

  const days = [];
  for (let index = 0; index < 42; index += 1) {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    days.push(date);
  }

  calendarRoot.innerHTML = `
    <div class="shad-calendar__nav">
      <button class="shad-calendar__nav-btn" type="button" data-cal-nav="prev" aria-label="Previous month"${canGoPrev ? '' : ' disabled'}>
        <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M10 3L5 8l5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <p class="shad-calendar__caption">${formatMonthCaption(month)}</p>
      <button class="shad-calendar__nav-btn" type="button" data-cal-nav="next" aria-label="Next month">
        <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M6 3l5 5-5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
    </div>
    <div class="shad-calendar__weekdays">
      ${WEEKDAYS.map((day) => `<span class="shad-calendar__weekday">${day}</span>`).join('')}
    </div>
    <div class="shad-calendar__grid">
      ${days.map((date) => {
        const iso = toIsoDate(date);
        const disabled = isDisabledDay(date);
        const classes = [
          'shad-calendar__day',
          startOfDay(date) < startOfDay(new Date()) ? 'is-outside' : '',
          iso === todayIso ? 'is-today' : '',
          iso === selectedIso ? 'is-selected' : '',
        ].filter(Boolean).join(' ');
        return `<button type="button" class="${classes}" data-date="${iso}"${disabled ? ' disabled' : ''} aria-pressed="${iso === selectedIso}">${date.getDate()}</button>`;
      }).join('')}
    </div>
  `;
  requestAnimationFrame(syncTimesHeight);
}

function mountCalendar() {
  if (state.answers.meetingDate) {
    const selected = parseIsoDate(state.answers.meetingDate);
    if (selected) state.calendarMonth = startOfMonth(selected);
  }
  renderCalendar();
  renderTimes();
  setCalendarCollapsed(Boolean(state.answers.meetingDate) && !isWideCalendar(), { animate: false });
  if (calendarTab) attachHapticOverlay(calendarTab);
  requestAnimationFrame(syncTimesHeight);
}

function confirmBooking() {
  state.booked = true;
  persistAnswers();
  const when = `${formatMeetingDate(state.answers.meetingDate)} at ${state.answers.meetingTime}`;
  if (bookedTitle) {
    bookedTitle.textContent = `${state.answers.firstName}, you are on the calendar.`;
  }
  if (bookedCopy) {
    bookedCopy.textContent = `Talk soon on ${when}. We will send a confirmation to ${state.answers.email}.`;
  }
  bookedPanel?.removeAttribute('hidden');
  booking.classList.add('is-booked');
  playBookedLottie();
  updateChrome();
  announce(`Booked for ${when}`);
  posthog.capture('booking_time_selected', {
    meeting_date: state.answers.meetingDate,
    meeting_time: state.answers.meetingTime,
    email: state.answers.email,
  }, { transport: 'sendBeacon' });
}

function completeForm() {
  collectAnswersFromDom();
  persistAnswers();

  const payload = {
    first_name: state.answers.firstName,
    last_name: state.answers.lastName,
    email: state.answers.email,
    phone: state.answers.phone,
    country: state.answers.country,
    list_size: state.answers.listSize,
    list_size_label: selectedLabel('listSize'),
    revenue: state.answers.revenue,
    revenue_label: selectedLabel('revenue'),
    email_pct: state.answers.emailPct,
    email_pct_label: selectedLabel('emailPct'),
    meeting_date: state.answers.meetingDate,
    meeting_time: state.answers.meetingTime,
  };

  posthog.identify(state.answers.email, {
    email: state.answers.email,
    first_name: state.answers.firstName,
    last_name: state.answers.lastName,
    phone: state.answers.phone,
  });
  posthog.capture('booking_form_completed', payload, { transport: 'sendBeacon' });

  mountCalendar();
  goTo(ALL_STEPS.indexOf('calendar'), 1);
}

function advance() {
  if (state.booked) return;
  const currentId = ALL_STEPS[state.index];
  triggerWebHaptic();

  if (!validateStep(state.index)) {
    shake(steps[state.index]?.querySelector('.booking-step__inner'));
    announce('Please complete this step.');
    return;
  }

  if (currentId === 'calendar') {
    confirmBooking();
    return;
  }

  collectAnswersFromDom();
  persistAnswers();

  if (currentId === 'emailPct') {
    completeForm();
    return;
  }

  goTo(state.index + 1, 1);
}

function goBack() {
  if (state.index === 0) return;
  triggerWebHaptic();
  if (ALL_STEPS[state.index] === 'calendar') {
    state.booked = false;
    bookedPanel?.setAttribute('hidden', '');
    booking.classList.remove('is-booked');
    stopBookedLottie();
  }
  clearStepErrors(ALL_STEPS[state.index]);
  goTo(state.index - 1, -1);
}

function handleChoiceSelection(input) {
  if (!input?.name) return;
  syncChoiceStyles(input.name);
  collectAnswersFromDom();
  persistAnswers();
  fieldError(input.name, '');
  form.querySelector(`[data-field="${input.name}"]`)?.classList.remove('is-invalid');

  window.setTimeout(() => {
    if (ALL_STEPS[state.index] === input.name) {
      advance();
    }
  }, prefersReducedMotion() ? 0 : 220);
}

function firstEmptyTextOnStep() {
  return Array.from(steps[state.index].querySelectorAll('.booking-input')).find((input) => !input.value.trim());
}

function isCountryMenuOpen() {
  return Boolean(countryMenu && !countryMenu.hidden);
}

function renderCountryOptions(filter = '') {
  if (!countryList) return;
  const needle = filter.trim().toLowerCase();
  const selectedIso = selectedCountry().iso;
  const items = COUNTRIES
    .slice()
    .sort((a, b) => {
      if (a.iso === selectedIso) return -1;
      if (b.iso === selectedIso) return 1;
      return a.name.localeCompare(b.name);
    })
    .filter((country) => {
      if (!needle) return true;
      return country.name.toLowerCase().includes(needle)
        || country.iso.toLowerCase().includes(needle)
        || country.dial.includes(needle);
    });

  countryList.innerHTML = items.map((country) => {
    const selected = country.iso === selectedIso;
    return `
      <li>
        <button type="button" class="booking-country-option${selected ? ' is-selected' : ''}" role="option" data-iso="${country.iso}" aria-selected="${selected}">
          <img src="${flagUrl(country.iso)}" alt="" width="20" height="15" />
          <span>${country.name}</span>
          <span class="booking-country-option__dial">${country.dial}</span>
        </button>
      </li>
    `;
  }).join('');
}

function setCountry(iso, { persist = true } = {}) {
  const country = findCountry(iso) || COUNTRIES.find((item) => item.iso === DEFAULT_COUNTRY);
  state.answers.country = country.iso;
  if (persist) countryLocked = true;
  if (countryFlag) {
    countryFlag.src = flagUrl(country.iso);
  }
  if (countryDial) {
    countryDial.textContent = country.dial;
  }
  countryButton?.setAttribute('aria-label', `Country, ${country.name} ${country.dial}`);
  renderCountryOptions(countrySearch?.value || '');
  if (form.phone.value.replace(/\D/g, '')) {
    formatPhoneInput({ restoreCaret: document.activeElement === form.phone });
  }
  if (persist) {
    collectAnswersFromDom();
    persistAnswers();
  }
}

function closeCountryMenu() {
  if (!countryMenu || !countryButton) return;
  countryMenu.hidden = true;
  countryButton.setAttribute('aria-expanded', 'false');
}

function openCountryMenu() {
  if (!countryMenu || !countryButton) return;
  renderCountryOptions('');
  if (countrySearch) countrySearch.value = '';
  countryMenu.hidden = false;
  countryButton.setAttribute('aria-expanded', 'true');
  countrySearch?.focus();
}

function toggleCountryMenu() {
  if (isCountryMenuOpen()) {
    closeCountryMenu();
    return;
  }
  openCountryMenu();
}

function countDigitsBefore(value, caret) {
  return String(value).slice(0, Math.max(0, caret)).replace(/\D/g, '').length;
}

function caretAfterDigits(value, digitCount) {
  if (digitCount <= 0) return 0;
  let seen = 0;
  for (let index = 0; index < value.length; index += 1) {
    if (/\d/.test(value[index])) {
      seen += 1;
      if (seen >= digitCount) return index + 1;
    }
  }
  return value.length;
}

function normalizePhoneInput() {
  const raw = form.phone.value.trim();
  if (!raw.startsWith('+')) return;
  const country = findCountry(raw) || countryFromPhone(raw);
  if (!country) return;
  countryLocked = true;
  setCountry(country.iso, { persist: false });
  form.phone.value = stripDialCode(raw, country);
}

function formatPhoneInput({ restoreCaret = true } = {}) {
  const input = form.phone;
  if (!input) return;

  const raw = input.value;
  if (!raw) return;

  const caret = input.selectionStart ?? raw.length;
  const digitsBefore = countDigitsBefore(raw, caret);

  if (raw.trim().startsWith('+')) {
    normalizePhoneInput();
  }

  const digits = input.value.replace(/\D/g, '');
  if (!digits) return;

  const formatted = formatIncompletePhoneNumber(digits, selectedCountry().iso) || digits;
  if (input.value === formatted) return;

  input.value = formatted;
  if (restoreCaret && input === document.activeElement) {
    const nextCaret = caretAfterDigits(formatted, digitsBefore);
    input.setSelectionRange(nextCaret, nextCaret);
  }
}

function applyVisitorTimezone(timeZone) {
  if (!timeZone) return;
  try {
    Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
  } catch {
    return;
  }
  state.timezone = timeZone;
  if (timesLabel) renderTimes();
}

async function detectVisitorCountry() {
  try {
    const response = await fetch('https://ipinfo.io/json', {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(2500),
    });
    if (!response.ok) return;

    const data = await response.json();
    applyVisitorTimezone(data?.timezone);

    if (countryLocked) return;
    const country = findCountry(data?.country);
    if (!country || countryLocked) return;
    if (String(form.phone.value).trim().startsWith('+')) return;

    setCountry(country.iso, { persist: false });
  } catch {
    // Keep the default country and local timezone if lookup fails.
  }
}

function onGlobalKeydown(event) {
  if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
  const currentId = ALL_STEPS[state.index];
  if (currentId === 'calendar') return;

  if (isCountryMenuOpen()) {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeCountryMenu();
      countryButton?.focus();
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      countryList?.querySelector('.booking-country-option')?.click();
      return;
    }
    return;
  }

  if (event.key === 'Enter') {
    const target = event.target;
    if (target instanceof HTMLInputElement && target.type !== 'radio') {
      const empty = firstEmptyTextOnStep();
      if (empty && empty !== target) {
        event.preventDefault();
        empty.focus();
        return;
      }
    }
    event.preventDefault();
    advance();
    return;
  }

  if (event.key === 'Escape') {
    goBack();
    return;
  }

  const letter = event.key.toUpperCase();
  if (!/^[A-J]$/.test(letter) && !/^[1-9]$/.test(event.key)) return;
  if (event.target instanceof HTMLInputElement && event.target.type !== 'radio') return;

  const choices = Array.from(steps[state.index].querySelectorAll('input[type="radio"]'));
  if (!choices.length) return;
  const index = /^[1-9]$/.test(event.key) ? Number(event.key) - 1 : letter.charCodeAt(0) - 65;
  const choice = choices[index];
  if (!choice) return;
  event.preventDefault();
  choice.checked = true;
  handleChoiceSelection(choice);
}

function init() {
  hydrate();
  detectVisitorCountry();
  gsap?.set(progressBar, { scaleX: 0, transformOrigin: 'left center' });
  steps.forEach((step, index) => {
    step.classList.toggle('is-active', index === state.index);
  });
  updateChrome();
  focusStep(state.index);
  captureStepView();
  if (ALL_STEPS[state.index] === 'calendar') {
    mountCalendar();
  }

  form.addEventListener('focusin', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || target.type === 'radio') return;
    if (target.id === 'booking-country-search') return;
    window.setTimeout(() => {
      target.scrollIntoView({ block: 'center', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    }, 250);
  });

  form.addEventListener('input', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || target.type === 'radio') return;
    if (target.id === 'booking-country-search') {
      renderCountryOptions(target.value);
      return;
    }
    if (target.name === 'phone') {
      formatPhoneInput();
    }
    syncFilledState(target);
    fieldError(target.name, '');
    collectAnswersFromDom();
    persistAnswers();
  });

  calendarRoot?.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target.closest('button') : null;
    if (!target) return;
    const nav = target.getAttribute('data-cal-nav');
    if (nav === 'prev') {
      state.calendarMonth = startOfMonth(new Date(state.calendarMonth.getFullYear(), state.calendarMonth.getMonth() - 1, 1));
      renderCalendar();
      return;
    }
    if (nav === 'next') {
      state.calendarMonth = startOfMonth(new Date(state.calendarMonth.getFullYear(), state.calendarMonth.getMonth() + 1, 1));
      renderCalendar();
      return;
    }
    const iso = target.getAttribute('data-date');
    if (!iso || target.disabled) return;
    state.answers.meetingDate = iso;
    state.answers.meetingTime = '';
    persistAnswers();
    renderCalendar();
    renderTimes();
    setCalendarCollapsed(true);
    updateChrome();
  });

  calendarTab?.addEventListener('click', () => {
    if (!state.answers.meetingDate) return;
    setCalendarCollapsed(!state.calendarCollapsed);
  });

  timesGrid?.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target.closest('[data-time]') : null;
    if (!target || target.disabled || !state.answers.meetingDate) return;
    state.answers.meetingTime = target.getAttribute('data-time') || '';
    persistAnswers();
    renderTimes();
    updateChrome();
  });

  countryButton?.addEventListener('click', (event) => {
    event.preventDefault();
    toggleCountryMenu();
  });

  countryList?.addEventListener('click', (event) => {
    const option = event.target instanceof Element ? event.target.closest('[data-iso]') : null;
    if (!option) return;
    setCountry(option.getAttribute('data-iso'));
    closeCountryMenu();
    form.phone.focus();
  });

  document.addEventListener('pointerdown', (event) => {
    if (!isCountryMenuOpen()) return;
    const target = event.target;
    if (target instanceof Element && target.closest('.booking-phone')) return;
    closeCountryMenu();
  });

  form.addEventListener('animationstart', (event) => {
    const target = event.target;
    if (target instanceof HTMLInputElement && event.animationName.includes('onAutoFillStart')) {
      syncFilledState(target);
    }
  });

  form.addEventListener('change', (event) => {
    const target = event.target;
    if (target instanceof HTMLInputElement && target.type === 'radio') {
      handleChoiceSelection(target);
    }
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    advance();
  });

  nextButton.addEventListener('click', advance);
  backButton.addEventListener('click', goBack);
  window.addEventListener('keydown', onGlobalKeydown);
  mountHapticOverlays();
  window.matchMedia('(min-width: 720px)').addEventListener('change', (event) => {
    if (event.matches) {
      setCalendarCollapsed(false, { animate: false });
      requestAnimationFrame(syncTimesHeight);
      return;
    }
    timesGrid && (timesGrid.style.maxHeight = '');
    if (state.answers.meetingDate && ALL_STEPS[state.index] === 'calendar') {
      setCalendarCollapsed(true, { animate: false });
    }
  });
  window.addEventListener('resize', () => requestAnimationFrame(syncTimesHeight));

  window.addEventListener('popstate', () => {
    const hash = normalizeToken(window.location.hash.replace('#', ''));
    const index = ALL_STEPS.findIndex((step) => normalizeToken(step) === hash);
    if (index >= 0 && index !== state.index && canEnterStep(index)) {
      goTo(index, index > state.index ? 1 : -1);
    }
  });
}

init();
