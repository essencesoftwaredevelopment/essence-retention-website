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
const TZ_STORAGE_KEY = 'essence-booking-tz';
const FORM_STEPS = ['contact', 'phone', 'listSize', 'revenue', 'emailPct'];
const ALL_STEPS = [...FORM_STEPS, 'calendar'];
const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const AVAILABILITY_URL = 'https://api.shieldsoutboundserver.org/api/clients/essence-retention/calendly/available-times';
const BOOK_URL = 'https://api.shieldsoutboundserver.org/api/clients/essence-retention/calendly/book';
const CALENDLY_EVENT_TYPE = '30336f6d-1955-4c5f-ad3c-49f319bd61e3';
const CALENDLY_QUESTIONS = {
  phone: 'Phone',
  website: 'Website',
  listSize: 'How big is the email list within your Klaviyo/Email Sending Provider',
  revenue: 'Current D2C Revenue Per Month (USD, Approximate)',
  emailPct: 'What percentage of revenue is coming from Klaviyo/Email Sending Provider?',
};
const AVAILABILITY_CHUNK_DAYS = 7;
const AVAILABILITY_MAX_DAYS = 56;

const QUERY_ALIASES = {
  firstName: ['firstname', 'first_name', 'fname', 'first'],
  lastName: ['lastname', 'last_name', 'lname', 'last'],
  email: ['email', 'mail'],
  website: ['website', 'url', 'site', 'domain'],
  phone: ['phone', 'tel', 'telephone', 'mobile'],
  country: ['country', 'country_code', 'iso'],
  listSize: ['listsize', 'list_size', 'email_list', 'list', 'klaviyo_list'],
  revenue: ['revenue', 'd2c_revenue', 'monthly_revenue', 'rev'],
  emailPct: ['emailpct', 'email_pct', 'email_revenue', 'klaviyo_pct', 'email_percent'],
  meetingDate: ['meetingdate', 'date'],
  meetingTime: ['meetingtime', 'time'],
  timezone: ['timezone', 'tz', 'time_zone'],
  step: ['step', 'page'],
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CONSUMER_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'yahoo.com',
  'ymail.com',
  'rocketmail.com',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'msn.com',
  'aol.com',
  'aim.com',
  'protonmail.com',
  'proton.me',
  'pm.me',
  'zoho.com',
  'zohomail.com',
  'gmx.com',
  'gmx.net',
  'mail.com',
  'email.com',
  'yandex.com',
  'yandex.ru',
  'fastmail.com',
  'fastmail.fm',
  'tutanota.com',
  'tuta.io',
  'hey.com',
  'mail.ru',
  'qq.com',
  '163.com',
  '126.com',
  'icloud.com.tw',
  'comcast.net',
  'verizon.net',
  'att.net',
  'sbcglobal.net',
  'btinternet.com',
  'sky.com',
  'virginmedia.com',
  'duck.com',
  'rediffmail.com',
]);
const CONSUMER_EMAIL_ROOTS = new Set([
  'gmail',
  'googlemail',
  'yahoo',
  'ymail',
  'outlook',
  'hotmail',
  'live',
  'msn',
  'aol',
  'icloud',
  'protonmail',
  'proton',
]);

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
const timezoneButton = document.getElementById('booking-tz-button');
const timezoneMenu = document.getElementById('booking-tz-menu');
const timezoneSearch = document.getElementById('booking-tz-search');
const timezoneList = document.getElementById('booking-tz-list');
const bookedPanel = document.getElementById('booking-booked');
const bookedLottieHost = document.getElementById('booking-booked-lottie');
const bookedTitle = document.getElementById('booking-booked-title');
const bookedCopy = document.getElementById('booking-booked-copy');
const bookedStories = document.getElementById('booking-stories');
const BOOKED_LOTTIE_SRC = new URL('../animations/booking-success.json', import.meta.url).href;
const BOOKED_SOUND_SRC = new URL('../sounds/boop-send.mp3', import.meta.url).href;
const BOOKED_STORIES_DELAY = 900;
let bookedLottie = null;
let bookedLottieReady = null;
let bookedSound = null;
let bookedStoriesTimer = 0;
let bookedLottieSafety = 0;
let bookedStoriesShown = false;
let bookedLottieBound = false;

function loadBookedStoryVideos() {
  bookedStories?.querySelectorAll('iframe[data-src]').forEach((iframe) => {
    if (!iframe.getAttribute('src')) {
      iframe.src = iframe.dataset.src;
    }
  });
}

function hideBookedStories() {
  bookedStoriesShown = false;
  window.clearTimeout(bookedStoriesTimer);
  window.clearTimeout(bookedLottieSafety);
  bookedStoriesTimer = 0;
  bookedLottieSafety = 0;
  const step = bookedPanel?.closest('.booking-step');
  const inner = step?.querySelector('.booking-step__inner');
  booking.classList.remove('is-showing-stories');
  bookedStories?.classList.remove('is-visible');
  bookedStories?.setAttribute('aria-hidden', 'true');
  bookedStories?.setAttribute('inert', '');
  if (gsap) {
    const cards = bookedStories?.querySelectorAll('.booking-story') || [];
    gsap.killTweensOf([inner, ...cards]);
    gsap.set([inner, ...cards], { clearProps: 'transform,opacity' });
  }
}

function revealBookedStories() {
  if (bookedStoriesShown || !state.booked || !bookedStories) return;
  bookedStoriesShown = true;
  loadBookedStoryVideos();

  const step = bookedPanel?.closest('.booking-step');
  const inner = step?.querySelector('.booking-step__inner');
  const startTop = inner?.getBoundingClientRect().top ?? 0;

  booking.classList.add('is-showing-stories');
  bookedStories.classList.add('is-visible');
  bookedStories.removeAttribute('aria-hidden');
  bookedStories.removeAttribute('inert');
  step?.scrollTo({ top: 0, behavior: 'auto' });

  const cards = bookedStories.querySelectorAll('.booking-story');
  if (!gsap || prefersReducedMotion()) return;

  if (inner) {
    const endTop = inner.getBoundingClientRect().top;
    gsap.fromTo(inner, {
      y: startTop - endTop,
    }, {
      y: 0,
      duration: 0.7,
      ease: 'power3.out',
      clearProps: 'transform',
    });
  }

  if (cards.length) {
    gsap.fromTo(cards, {
      y: 28,
      opacity: 0,
    }, {
      y: 0,
      opacity: 1,
      duration: 0.62,
      stagger: 0.12,
      ease: 'power3.out',
      clearProps: 'transform',
    });
  }
}

function scheduleBookedStories() {
  window.clearTimeout(bookedLottieSafety);
  window.clearTimeout(bookedStoriesTimer);
  bookedStoriesTimer = window.setTimeout(revealBookedStories, BOOKED_STORIES_DELAY);
}

function bindBookedLottieEvents() {
  if (!bookedLottie || bookedLottieBound) return;
  bookedLottieBound = true;
  bookedLottie.addEventListener('complete', scheduleBookedStories);
  bookedLottie.addEventListener('data_failed', scheduleBookedStories);
}

function preloadBookedSound() {
  if (bookedSound) return bookedSound;
  bookedSound = new Audio(BOOKED_SOUND_SRC);
  bookedSound.preload = 'auto';
  bookedSound.load();
  return bookedSound;
}

function playBookedSound() {
  const sound = preloadBookedSound();
  sound.currentTime = 0;
  sound.play().catch(() => {});
}

function preloadBookedLottie() {
  if (bookedLottieReady) return bookedLottieReady;
  if (!bookedLottieHost || prefersReducedMotion()) return Promise.resolve(null);

  bookedLottieReady = Promise.all([
    import('../vendor/lottie-web/lottie.min.esm.js'),
    fetch(BOOKED_LOTTIE_SRC, { cache: 'force-cache' }).then((response) => {
      if (!response.ok) throw new Error('lottie');
      return response.json();
    }),
  ]).then(([{ default: lottie }, animationData]) => {
    if (!bookedLottie) {
      bookedLottie = lottie.loadAnimation({
        container: bookedLottieHost,
        renderer: 'svg',
        loop: false,
        autoplay: false,
        animationData,
      });
      bindBookedLottieEvents();
    }
    return bookedLottie;
  }).catch(() => {
    bookedLottieReady = null;
    return null;
  });

  return bookedLottieReady;
}

async function playBookedLottie() {
  window.clearTimeout(bookedLottieSafety);
  if (!bookedLottieHost || prefersReducedMotion()) {
    scheduleBookedStories();
    return;
  }
  bookedLottieSafety = window.setTimeout(scheduleBookedStories, 4000);
  try {
    await preloadBookedLottie();
    if (!bookedLottie) {
      scheduleBookedStories();
      return;
    }
    bookedLottie.resize();
    bookedLottie.goToAndPlay(0, true);
  } catch {
    scheduleBookedStories();
  }
}

function stopBookedLottie() {
  bookedLottie?.stop();
  hideBookedStories();
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

function formatTimezoneShortName(timeZone) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'longGeneric',
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

function isValidTimeZone(timeZone) {
  if (!timeZone) return false;
  try {
    Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

const FALLBACK_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Anchorage',
  'Pacific/Honolulu',
  'America/Toronto',
  'America/Vancouver',
  'America/Mexico_City',
  'America/Bogota',
  'America/Lima',
  'America/Santiago',
  'America/Sao_Paulo',
  'America/Argentina/Buenos_Aires',
  'Europe/London',
  'Europe/Dublin',
  'Europe/Lisbon',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Amsterdam',
  'Europe/Madrid',
  'Europe/Rome',
  'Europe/Stockholm',
  'Europe/Warsaw',
  'Europe/Athens',
  'Europe/Istanbul',
  'Europe/Moscow',
  'Africa/Cairo',
  'Africa/Johannesburg',
  'Africa/Lagos',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Bangkok',
  'Asia/Singapore',
  'Asia/Hong_Kong',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Australia/Perth',
  'Pacific/Auckland',
];

let cachedTimeZones = null;

function listTimeZones() {
  if (cachedTimeZones) return cachedTimeZones;
  try {
    if (typeof Intl.supportedValuesOf !== 'function') {
      cachedTimeZones = FALLBACK_TIMEZONES;
      return cachedTimeZones;
    }
    cachedTimeZones = Intl.supportedValuesOf('timeZone').filter((zone) => (
      zone === 'UTC' || (!zone.startsWith('Etc/') && zone !== 'Factory')
    ));
    return cachedTimeZones;
  } catch {
    cachedTimeZones = FALLBACK_TIMEZONES;
    return cachedTimeZones;
  }
}

function timezoneSearchHaystack(timeZone) {
  return [
    timeZone,
    formatTimezoneCity(timeZone),
    formatTimezoneOffset(timeZone),
    formatTimezoneShortName(timeZone),
  ].join(' ').toLowerCase().replace(/_/g, ' ');
}

function toUtcIso(date) {
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function dateKeyInZone(date, timeZone = state.timezone) {
  try {
    return date.toLocaleDateString('en-CA', { timeZone: timeZone || undefined });
  } catch {
    return toIsoDate(date);
  }
}

function formatSlotTime(date, timeZone = state.timezone) {
  return date.toLocaleTimeString('en-US', {
    timeZone: timeZone || undefined,
    hour: 'numeric',
    minute: '2-digit',
  });
}

function availabilityRangeWindows(fromDate, untilDate) {
  const soonest = new Date(Date.now() + 2 * 60 * 1000);
  const from = new Date(Math.max(fromDate.getTime(), soonest.getTime()));

  const until = new Date(untilDate);
  const maxUntil = new Date(soonest);
  maxUntil.setUTCDate(maxUntil.getUTCDate() + AVAILABILITY_MAX_DAYS);
  if (until > maxUntil) until.setTime(maxUntil.getTime());
  if (until <= from) return [];

  const windows = [];
  let cursor = new Date(from);
  while (cursor < until) {
    const end = new Date(cursor);
    end.setUTCDate(end.getUTCDate() + AVAILABILITY_CHUNK_DAYS);
    windows.push({
      startIso: toUtcIso(cursor),
      endIso: toUtcIso(end),
    });
    cursor = end;
  }
  return windows;
}

function ingestAvailability(times) {
  const now = Date.now();
  const seen = new Set(state.availability.slots.map((slot) => slot.iso));

  times.forEach((item) => {
    if (!item || (item.status && item.status !== 'available')) return;
    if (Number(item.inviteesRemaining) === 0) return;
    const start = new Date(item.startTime);
    if (Number.isNaN(start.getTime()) || start.getTime() < now) return;
    if (seen.has(item.startTime)) return;
    seen.add(item.startTime);
    state.availability.slots.push({
      start,
      iso: item.startTime,
      schedulingUrl: item.schedulingUrl || '',
    });
  });

  state.availability.slots.sort((a, b) => a.start - b.start);
}

function slotsForDate(dateKey) {
  if (!dateKey) return [];
  return state.availability.slots.filter((slot) => dateKeyInZone(slot.start) === dateKey);
}

function hasAvailability(date) {
  return slotsForDate(toIsoDate(date)).length > 0;
}

function isDisabledDay(date) {
  if (toIsoDate(date) < dateKeyInZone(new Date())) return true;
  if (state.availability.status !== 'ready') return true;
  return !hasAvailability(date);
}

function syncSelectedAvailability() {
  if (!state.answers.meetingDate || state.availability.status !== 'ready') return;
  const slots = slotsForDate(state.answers.meetingDate);
  if (!slots.length) {
    state.answers.meetingDate = '';
    state.answers.meetingTime = '';
    state.answers.meetingStart = '';
    persistAnswers();
    return;
  }
  if (state.answers.meetingStart && !slots.some((slot) => slot.iso === state.answers.meetingStart)) {
    state.answers.meetingTime = '';
    state.answers.meetingStart = '';
    persistAnswers();
  }
}

async function fetchAvailabilityWindow(startIso, endIso) {
  const key = `${startIso}|${endIso}`;
  const cached = availabilityWindows.get(key);
  if (cached) return cached;

  const url = new URL(AVAILABILITY_URL);
  url.searchParams.set('startTime', startIso);
  url.searchParams.set('endTime', endIso);
  url.searchParams.set('eventType', CALENDLY_EVENT_TYPE);

  const request = fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
  }).then(async (response) => {
    if (!response.ok) throw new Error('availability');
    const data = await response.json();
    return Array.isArray(data?.times) ? data.times : [];
  }).catch((error) => {
    availabilityWindows.delete(key);
    throw error;
  });

  availabilityWindows.set(key, request);
  return request;
}

async function ensureAvailability(fromDate, untilDate) {
  const windows = availabilityRangeWindows(fromDate, untilDate);
  if (!windows.length) {
    state.availability.status = 'ready';
    return;
  }

  const missing = windows.some((range) => (
    !availabilityWindows.has(`${range.startIso}|${range.endIso}`)
  ));
  if (missing) state.availability.status = 'loading';

  const results = await Promise.allSettled(windows.map((range) => (
    fetchAvailabilityWindow(range.startIso, range.endIso)
  )));
  let failed = false;
  results.forEach((result) => {
    if (result.status === 'fulfilled') {
      ingestAvailability(result.value);
      return;
    }
    failed = true;
  });
  state.availability.status = state.availability.slots.length || !failed ? 'ready' : 'error';
  if (state.availability.status === 'ready') syncSelectedAvailability();
}

async function ensureAvailabilityForMonth(monthDate) {
  const start = startOfMonth(monthDate);
  const until = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 42);
  await ensureAvailability(start < new Date() ? new Date() : start, until);
}

const state = {
  index: 0,
  animating: false,
  calendarMonth: startOfMonth(new Date()),
  calendarCollapsed: false,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
  booked: false,
  submitting: false,
  availability: {
    status: 'idle',
    slots: [],
  },
  answers: {
    firstName: '',
    lastName: '',
    email: '',
    website: '',
    phone: '',
    country: DEFAULT_COUNTRY,
    listSize: '',
    revenue: '',
    emailPct: '',
    meetingDate: '',
    meetingTime: '',
    meetingStart: '',
  },
};

const availabilityWindows = new Map();

let countryLocked = false;
let timezoneLocked = false;
let websiteTouched = false;
let websiteAutofill = '';

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

function isTestBooking() {
  return String(readQueryMap().get('test') || '').trim().toLowerCase() === 'true';
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

function persistTimezone() {
  if (!state.timezone) {
    sessionStorage.removeItem(TZ_STORAGE_KEY);
    return;
  }
  sessionStorage.setItem(TZ_STORAGE_KEY, state.timezone);
}

function loadStoredTimezone() {
  try {
    return sessionStorage.getItem(TZ_STORAGE_KEY) || '';
  } catch {
    return '';
  }
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

function normalizeWebsite(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const href = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(href);
    if (!url.hostname.includes('.')) return '';
    return url.href;
  } catch {
    return '';
  }
}

function websiteHost(value) {
  const normalized = normalizeWebsite(value);
  if (!normalized) return '';
  try {
    return new URL(normalized).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

function isConsumerEmailDomain(host) {
  const domain = String(host || '').toLowerCase().replace(/^www\./, '');
  if (!domain) return true;
  if (CONSUMER_EMAIL_DOMAINS.has(domain)) return true;
  return CONSUMER_EMAIL_ROOTS.has(domain.split('.')[0]);
}

function websiteFromEmail(email) {
  const match = String(email || '').trim().toLowerCase().match(/^[^\s@]+@([^\s@]+\.[^\s@]+)$/);
  if (!match) return '';
  let host = match[1].replace(/\.+$/, '');
  host = host.replace(/^(mail|email|smtp|imap|webmail)\./, '');
  if (!host.includes('.') || isConsumerEmailDomain(host)) return '';
  return host;
}

function maybeAutofillWebsite() {
  if (!(form.website instanceof HTMLInputElement)) return;

  const current = form.website.value.trim();
  const currentHost = websiteHost(current);
  const autofillHost = websiteHost(websiteAutofill);
  const inferred = websiteFromEmail(form.email.value);

  if (websiteTouched && current && currentHost !== autofillHost) return;

  if (!inferred) {
    if (current && currentHost === autofillHost) {
      form.website.value = '';
      websiteAutofill = '';
      syncFilledState(form.website);
      fieldError('website', '');
    }
    return;
  }

  if (currentHost === inferred) {
    websiteAutofill = current || inferred;
    return;
  }

  form.website.value = inferred;
  websiteAutofill = inferred;
  websiteTouched = false;
  syncFilledState(form.website);
  fieldError('website', '');
}

function collectAnswersFromDom() {
  state.answers.firstName = form.firstName.value.trim();
  state.answers.lastName = form.lastName.value.trim();
  state.answers.email = form.email.value.trim();
  state.answers.website = normalizeWebsite(form.website?.value || '');
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
  if (form.website) form.website.value = state.answers.website;

  const inferredCountry = countryFromPhone(state.answers.phone);
  const explicitCountry = findCountry(state.answers.country);
  const country = (String(state.answers.phone).trim().startsWith('+') && inferredCountry)
    ? inferredCountry
    : (explicitCountry || inferredCountry || COUNTRIES.find((item) => item.iso === DEFAULT_COUNTRY));
  setCountry(country.iso, { persist: false });
  form.phone.value = stripDialCode(state.answers.phone, country);
  formatPhoneInput({ restoreCaret: false });

  [form.firstName, form.lastName, form.email, form.website, form.phone].forEach((input) => {
    if (input) syncFilledState(input);
  });

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
    if (field === 'step' || field === 'timezone') return false;
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
  const inferredWebsite = websiteFromEmail(state.answers.email);
  const storedWebsiteHost = websiteHost(state.answers.website);
  websiteTouched = Boolean(storedWebsiteHost && storedWebsiteHost !== inferredWebsite);
  websiteAutofill = inferredWebsite && storedWebsiteHost === inferredWebsite
    ? (form.website?.value.trim() || inferredWebsite)
    : '';
  maybeAutofillWebsite();
  if (freshLanding) {
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(TZ_STORAGE_KEY);
  }

  const queryTz = readAliasedParam(query, 'timezone');
  if (isValidTimeZone(queryTz)) {
    state.timezone = queryTz;
    timezoneLocked = true;
    persistTimezone();
  } else if (!freshLanding) {
    const storedTz = loadStoredTimezone();
    if (isValidTimeZone(storedTz)) {
      state.timezone = storedTz;
      timezoneLocked = true;
    }
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

  if (!normalizeWebsite(form.website?.value || '')) {
    fieldError('website', 'Enter your store website.');
    ok = false;
  } else {
    fieldError('website', '');
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
  booking.classList.toggle('is-booking', state.submitting);
  backButton.hidden = state.index === 0;
  backButton.disabled = state.submitting;
  nextButton.disabled = state.submitting || (id === 'calendar' && (!state.answers.meetingDate || !state.answers.meetingTime));
  if (nextLabel) {
    nextLabel.textContent = state.submitting ? 'Booking' : id === 'calendar' ? 'Book' : 'Next';
  }
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
  closeTimezoneMenu();

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
  if (ALL_STEPS[index] === 'calendar') mountCalendar();
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

function syncTimezoneButton() {
  const zone = formatTimezoneLabel(state.timezone);
  if (timesTz) timesTz.textContent = zone;
  if (timezoneButton) {
    timezoneButton.hidden = !zone;
    timezoneButton.setAttribute('aria-label', zone ? `Timezone, ${zone}` : 'Timezone');
  }
}

function renderTimes() {
  if (!timesGrid || !timesLabel) return;
  const selectedDate = state.answers.meetingDate;
  const slots = slotsForDate(selectedDate);
  if (state.availability.status === 'loading') {
    timesLabel.textContent = 'Checking the calendar';
  } else if (state.availability.status === 'error') {
    timesLabel.textContent = 'Times unavailable';
  } else if (selectedDate) {
    timesLabel.textContent = slots.length ? 'Available times' : 'No times this day';
  } else {
    timesLabel.textContent = 'Select a date';
  }
  syncTimezoneButton();

  if (state.availability.status === 'loading') {
    timesGrid.innerHTML = '<p class="booking-times__empty">Finding open times.</p>';
  } else if (state.availability.status === 'error') {
    timesGrid.innerHTML = '<button class="booking-times__retry" type="button" data-availability-retry>Try again</button>';
  } else if (!selectedDate) {
    timesGrid.innerHTML = '';
  } else if (!slots.length) {
    timesGrid.innerHTML = '<p class="booking-times__empty">Nothing open on this date. Pick another day.</p>';
  } else {
    timesGrid.innerHTML = slots.map((slot) => {
      const label = formatSlotTime(slot.start);
      const selected = slot.iso === state.answers.meetingStart ? ' is-selected' : '';
      return `<button type="button" class="booking-time${selected}" data-time="${label}" data-start="${slot.iso}">${label}</button>`;
    }).join('');
  }
  requestAnimationFrame(syncTimesHeight);
}

function renderCalendar() {
  if (!calendarRoot) return;
  const month = state.calendarMonth;
  const firstDay = startOfMonth(month);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const gridStart = new Date(firstDay);
  gridStart.setDate(1 - startOffset);
  const todayIso = dateKeyInZone(new Date());
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
          iso < todayIso ? 'is-outside' : '',
          iso === todayIso ? 'is-today' : '',
          iso === selectedIso ? 'is-selected' : '',
        ].filter(Boolean).join(' ');
        return `<button type="button" class="${classes}" data-date="${iso}"${disabled ? ' disabled' : ''} aria-pressed="${iso === selectedIso}">${date.getDate()}</button>`;
      }).join('')}
    </div>
  `;
  requestAnimationFrame(syncTimesHeight);
}

async function mountCalendar() {
  if (state.answers.meetingDate) {
    const selected = parseIsoDate(state.answers.meetingDate);
    if (selected) state.calendarMonth = startOfMonth(selected);
  }
  renderCalendar();
  renderTimes();
  setCalendarCollapsed(Boolean(state.answers.meetingDate) && !isWideCalendar(), { animate: false });
  if (calendarTab) attachHapticOverlay(calendarTab);
  requestAnimationFrame(syncTimesHeight);
  await ensureAvailabilityForMonth(state.calendarMonth);
  renderCalendar();
  renderTimes();
  updateChrome();
}

function bookPayload() {
  return {
    startTime: state.answers.meetingStart,
    firstName: state.answers.firstName,
    lastName: state.answers.lastName,
    email: state.answers.email,
    timezone: state.timezone || 'America/New_York',
    eventType: CALENDLY_EVENT_TYPE,
    questionsAndAnswers: [
      { question: CALENDLY_QUESTIONS.phone, answer: state.answers.phone },
      { question: CALENDLY_QUESTIONS.website, answer: state.answers.website },
      { question: CALENDLY_QUESTIONS.listSize, answer: selectedLabel('listSize') },
      { question: CALENDLY_QUESTIONS.revenue, answer: selectedLabel('revenue') },
      { question: CALENDLY_QUESTIONS.emailPct, answer: selectedLabel('emailPct') },
    ],
  };
}

function bookErrorMessage(error) {
  const raw = String(error?.data?.error || error?.data?.message || '');
  if (error?.status === 400 && /available|slot/i.test(raw)) {
    return 'That time was just taken. Pick another.';
  }
  if (error?.status >= 500) {
    return 'We could not reach the calendar. Try again.';
  }
  return raw || 'We could not book that time. Try again.';
}

function showBookedSuccess() {
  const zone = formatTimezoneCity(state.timezone);
  const when = zone
    ? `${formatMeetingDate(state.answers.meetingDate)} at ${state.answers.meetingTime} (${zone})`
    : `${formatMeetingDate(state.answers.meetingDate)} at ${state.answers.meetingTime}`;
  state.booked = true;
  persistAnswers();
  if (bookedTitle) {
    bookedTitle.textContent = `${state.answers.firstName}, you are on the calendar.`;
  }
  if (bookedCopy) {
    bookedCopy.textContent = `Talk soon on ${when}. We will send a confirmation to ${state.answers.email}.`;
  }
  fieldError('calendar', '');
  bookedPanel?.removeAttribute('hidden');
  booking.classList.add('is-booked');
  hideBookedStories();
  playBookedSound();
  playBookedLottie();
  updateChrome();
  announce(`Booked for ${when}`);
  posthog.capture('booking_time_selected', {
    meeting_date: state.answers.meetingDate,
    meeting_time: state.answers.meetingTime,
    meeting_start: state.answers.meetingStart,
    timezone: state.timezone,
    email: state.answers.email,
    test: isTestBooking(),
  }, { transport: 'sendBeacon' });
}

async function confirmBooking() {
  if (state.submitting || state.booked) return;
  if (!state.answers.meetingStart) {
    fieldError('calendar', 'Pick a date and time.');
    announce('Pick a date and time.');
    return;
  }

  state.submitting = true;
  fieldError('calendar', '');
  updateChrome();

  try {
    if (isTestBooking()) {
      await new Promise((resolve) => window.setTimeout(resolve, 450));
      showBookedSuccess();
      return;
    }

    const response = await fetch(BOOK_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bookPayload()),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw Object.assign(new Error(data.error || data.message || 'book'), {
        status: response.status,
        data,
      });
    }
    showBookedSuccess();
  } catch (error) {
    const message = bookErrorMessage(error);
    fieldError('calendar', message);
    announce(message);
    shake(steps[state.index]?.querySelector('.booking-step__inner'));
    if (error?.status === 400) {
      availabilityWindows.clear();
      state.availability.slots = [];
      state.answers.meetingTime = '';
      state.answers.meetingStart = '';
      persistAnswers();
      await ensureAvailabilityForMonth(state.calendarMonth);
      renderCalendar();
      renderTimes();
    }
  } finally {
    state.submitting = false;
    updateChrome();
  }
}

function completeForm() {
  collectAnswersFromDom();
  persistAnswers();

  const payload = {
    first_name: state.answers.firstName,
    last_name: state.answers.lastName,
    email: state.answers.email,
    website: state.answers.website,
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
    meeting_start: state.answers.meetingStart,
  };

  posthog.identify(state.answers.email, {
    email: state.answers.email,
    first_name: state.answers.firstName,
    last_name: state.answers.lastName,
    phone: state.answers.phone,
  });
  posthog.capture('booking_form_completed', payload, { transport: 'sendBeacon' });

  goTo(ALL_STEPS.indexOf('calendar'), 1);
}

function advance() {
  if (state.booked || state.submitting) return;
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
  if (state.index === 0 || state.submitting) return;
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
  closeTimezoneMenu();
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

function setTimezone(timeZone, { persist = true } = {}) {
  if (!isValidTimeZone(timeZone)) return;
  if (state.timezone === timeZone) {
    if (persist) timezoneLocked = true;
    return;
  }

  state.timezone = timeZone;
  if (persist) timezoneLocked = true;

  if (state.answers.meetingStart) {
    const slot = state.availability.slots.find((item) => item.iso === state.answers.meetingStart);
    if (slot) {
      state.answers.meetingDate = dateKeyInZone(slot.start);
      state.answers.meetingTime = formatSlotTime(slot.start);
    }
  }

  syncSelectedAvailability();

  if (state.answers.meetingDate) {
    const selected = parseIsoDate(state.answers.meetingDate);
    if (selected) state.calendarMonth = startOfMonth(selected);
  }

  if (persist) persistTimezone();
  persistAnswers();
  if (calendarRoot) renderCalendar();
  if (timesLabel) renderTimes();
  updateChrome();
}

function applyVisitorTimezone(timeZone) {
  if (timezoneLocked) return;
  setTimezone(timeZone, { persist: false });
}

function isTimezoneMenuOpen() {
  return Boolean(timezoneMenu && !timezoneMenu.hidden);
}

function renderTimezoneOptions(filter = '') {
  if (!timezoneList) return;
  const needle = filter.trim().toLowerCase().replace(/_/g, ' ');
  const selectedZone = state.timezone;
  const zones = listTimeZones().slice();
  if (selectedZone && !zones.includes(selectedZone) && isValidTimeZone(selectedZone)) {
    zones.unshift(selectedZone);
  }
  const items = zones
    .sort((a, b) => {
      if (a === selectedZone) return -1;
      if (b === selectedZone) return 1;
      return formatTimezoneCity(a).localeCompare(formatTimezoneCity(b));
    })
    .filter((zone) => {
      if (!needle) return true;
      return timezoneSearchHaystack(zone).includes(needle);
    });

  if (!items.length) {
    timezoneList.innerHTML = '<li class="booking-tz-empty">No matching timezones</li>';
    return;
  }

  timezoneList.innerHTML = items.map((zone) => {
    const selected = zone === selectedZone;
    const city = formatTimezoneCity(zone);
    const offset = formatTimezoneOffset(zone);
    return `
      <li>
        <button type="button" class="booking-tz-option${selected ? ' is-selected' : ''}" role="option" data-timezone="${zone}" aria-selected="${selected}">
          <span>${city}</span>
          <span class="booking-tz-option__offset">${offset}</span>
        </button>
      </li>
    `;
  }).join('');
}

function closeTimezoneMenu() {
  if (!timezoneMenu || !timezoneButton) return;
  timezoneMenu.hidden = true;
  timezoneButton.setAttribute('aria-expanded', 'false');
}

function openTimezoneMenu() {
  if (!timezoneMenu || !timezoneButton) return;
  renderTimezoneOptions('');
  if (timezoneSearch) timezoneSearch.value = '';
  timezoneMenu.hidden = false;
  timezoneButton.setAttribute('aria-expanded', 'true');
  timezoneSearch?.focus();
  requestAnimationFrame(() => {
    timezoneList?.querySelector('.is-selected')?.scrollIntoView({ block: 'nearest' });
  });
}

function toggleTimezoneMenu() {
  if (isTimezoneMenuOpen()) {
    closeTimezoneMenu();
    return;
  }
  closeCountryMenu();
  openTimezoneMenu();
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

  if (isTimezoneMenuOpen()) {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeTimezoneMenu();
      timezoneButton?.focus();
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      timezoneList?.querySelector('.booking-tz-option')?.click();
      return;
    }
    return;
  }

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
  syncTimezoneButton();
  detectVisitorCountry();
  preloadBookedLottie();
  preloadBookedSound();
  ensureAvailabilityForMonth(state.calendarMonth);
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
    if (target.id === 'booking-country-search' || target.id === 'booking-tz-search') return;
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
    if (target.id === 'booking-tz-search') {
      renderTimezoneOptions(target.value);
      return;
    }
    if (target.name === 'phone') {
      formatPhoneInput();
    }
    if (target.name === 'website') {
      websiteTouched = true;
    }
    if (target.name === 'email') {
      maybeAutofillWebsite();
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
    if (nav === 'prev' || nav === 'next') {
      const offset = nav === 'next' ? 1 : -1;
      state.calendarMonth = startOfMonth(new Date(state.calendarMonth.getFullYear(), state.calendarMonth.getMonth() + offset, 1));
      renderCalendar();
      ensureAvailabilityForMonth(state.calendarMonth).then(() => {
        renderCalendar();
        renderTimes();
      });
      return;
    }
    const iso = target.getAttribute('data-date');
    if (!iso || target.disabled) return;
    state.answers.meetingDate = iso;
    state.answers.meetingTime = '';
    state.answers.meetingStart = '';
    persistAnswers();
    renderCalendar();
    renderTimes();
    setCalendarCollapsed(true);
    closeTimezoneMenu();
    updateChrome();
  });

  calendarTab?.addEventListener('click', () => {
    if (!state.answers.meetingDate) return;
    setCalendarCollapsed(!state.calendarCollapsed);
  });

  timesGrid?.addEventListener('click', (event) => {
    const retry = event.target instanceof Element ? event.target.closest('[data-availability-retry]') : null;
    if (retry) {
      availabilityWindows.clear();
      state.availability.slots = [];
      state.availability.status = 'idle';
      mountCalendar();
      return;
    }
    const target = event.target instanceof Element ? event.target.closest('[data-time]') : null;
    if (!target || target.disabled || !state.answers.meetingDate) return;
    state.answers.meetingTime = target.getAttribute('data-time') || '';
    state.answers.meetingStart = target.getAttribute('data-start') || '';
    persistAnswers();
    renderTimes();
    closeTimezoneMenu();
    updateChrome();
  });

  timezoneButton?.addEventListener('click', (event) => {
    event.preventDefault();
    toggleTimezoneMenu();
  });

  timezoneList?.addEventListener('click', (event) => {
    const option = event.target instanceof Element ? event.target.closest('[data-timezone]') : null;
    if (!option) return;
    setTimezone(option.getAttribute('data-timezone'));
    closeTimezoneMenu();
    timezoneButton?.focus();
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
    const target = event.target;
    if (isCountryMenuOpen() && !(target instanceof Element && target.closest('.booking-phone'))) {
      closeCountryMenu();
    }
    if (isTimezoneMenuOpen() && !(target instanceof Element && target.closest('.booking-tz'))) {
      closeTimezoneMenu();
    }
  });

  form.addEventListener('animationstart', (event) => {
    const target = event.target;
    if (target instanceof HTMLInputElement && event.animationName.includes('onAutoFillStart')) {
      syncFilledState(target);
      if (target.name === 'email') {
        maybeAutofillWebsite();
        collectAnswersFromDom();
        persistAnswers();
      }
    }
  });

  form.addEventListener('change', (event) => {
    const target = event.target;
    if (target instanceof HTMLInputElement && target.type === 'radio') {
      handleChoiceSelection(target);
    }
    if (target instanceof HTMLInputElement && target.name === 'email') {
      maybeAutofillWebsite();
      collectAnswersFromDom();
      persistAnswers();
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
