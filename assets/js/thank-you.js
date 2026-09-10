const LOTTIE_SRC = new URL('../animations/booking-success.json', import.meta.url).href;

const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = String(new Date().getFullYear());

const mark = document.getElementById('ty-mark');
const lottieHost = document.getElementById('ty-lottie');
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (mark && lottieHost && !prefersReducedMotion) {
  Promise.all([
    import('../vendor/lottie-web/lottie.min.esm.js'),
    fetch(LOTTIE_SRC, { cache: 'force-cache' }).then((response) => {
      if (!response.ok) throw new Error('lottie');
      return response.json();
    }),
  ]).then(([{ default: lottie }, animationData]) => {
    const animation = lottie.loadAnimation({
      container: lottieHost,
      renderer: 'svg',
      loop: false,
      autoplay: false,
      animationData,
    });
    animation.addEventListener('DOMLoaded', () => {
      mark.classList.add('is-animated');
      animation.goToAndPlay(0, true);
    });
  }).catch(() => {});
}

// Calendly appends invitee and event details to the redirect URL when
// "Pass event details to your redirect page" is enabled for the event type.
const params = new URLSearchParams(window.location.search);

function cleanParam(name, maxLength) {
  const value = (params.get(name) || '').trim().replace(/\s+/g, ' ');
  return value.length > 0 && value.length <= maxLength ? value : '';
}

const firstNameRaw = cleanParam('invitee_first_name', 30) || cleanParam('invitee_full_name', 60).split(' ')[0];
const firstName = /^[\p{L}][\p{L}'-]{0,29}$/u.test(firstNameRaw) ? firstNameRaw : '';
const email = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,24}$/.test(cleanParam('invitee_email', 254))
  ? cleanParam('invitee_email', 254)
  : '';
const eventName = cleanParam('event_type_name', 80);
const eventStart = new Date(params.get('event_start_time') || '');
const eventEnd = new Date(params.get('event_end_time') || '');

const titleEl = document.getElementById('ty-title');
if (titleEl && firstName) {
  titleEl.textContent = `${firstName}, you're on the calendar.`;
}

const heroCopyEl = document.getElementById('ty-hero-copy');
if (heroCopyEl && email) {
  heroCopyEl.textContent = `A calendar invite is on its way to ${email}.`;
}

let eventTimeText = '';
if (!Number.isNaN(eventStart.getTime())) {
  const dayFormat = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  const timeFormat = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
  eventTimeText = dayFormat.format(eventStart);
  try {
    eventTimeText += `, ${Number.isNaN(eventEnd.getTime()) ? timeFormat.format(eventStart) : timeFormat.formatRange(eventStart, eventEnd)}`;
  } catch {
    eventTimeText += `, ${timeFormat.format(eventStart)}`;
  }
}

const eventChip = document.getElementById('ty-event');
if (eventChip && (eventName || eventTimeText)) {
  document.getElementById('ty-event-name').textContent = eventName;
  document.getElementById('ty-event-time').textContent = eventTimeText;
  if (eventName && eventTimeText) {
    document.getElementById('ty-event-sep').hidden = false;
  }
  eventChip.hidden = false;
}

function captureBooking(posthog, attempt = 0) {
  if (!posthog.__loaded) {
    if (attempt < 10) window.setTimeout(() => captureBooking(posthog, attempt + 1), 500);
    return;
  }
  try {
    if (email) {
      posthog.identify(email, { email, name: cleanParam('invitee_full_name', 60) || firstName || undefined });
    }
    posthog.capture('calendly_booking_landed', {
      event_type_name: eventName || undefined,
      assigned_to: cleanParam('assigned_to', 60) || undefined,
      event_start_time: params.get('event_start_time') || undefined,
    });
  } catch {
    // Analytics must never break the page.
  }
}

if (eventName || email || params.has('invitee_uuid')) {
  import('posthog-js')
    .then(({ default: posthog }) => captureBooking(posthog))
    .catch(() => {});
}

const faqList = document.getElementById('ty-faq-list');
if (faqList) {
  const faqItems = faqList.querySelectorAll('.faq-item');
  faqItems.forEach((item) => {
    const question = item.querySelector('.faq-question');
    if (!question) return;

    question.addEventListener('click', () => {
      const isOpen = item.classList.contains('is-open');

      faqItems.forEach((otherItem) => {
        if (otherItem !== item) {
          otherItem.classList.remove('is-open');
        }
      });

      item.classList.toggle('is-open', !isOpen);
    });
  });
}
