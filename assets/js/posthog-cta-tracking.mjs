import posthog from 'posthog-js';

/**
 * CTA click tracking.
 *
 * Any element carrying `data-ph-cta` is tracked on click. The attribute value is the
 * stable CTA id used in PostHog; `data-ph-cta-location` records where on the page it sits.
 *
 * Events are sent with `transport: 'sendBeacon'` so they survive the navigation that a
 * Calendly link triggers immediately after the click.
 */

const CTA_SELECTOR = '[data-ph-cta]';

function ctaProperties(element) {
  const href = element.getAttribute('href') || null;
  let destinationHost = null;

  if (href) {
    try {
      destinationHost = new URL(href, window.location.href).host;
    } catch {
      destinationHost = null;
    }
  }

  return {
    cta_id: element.dataset.phCta,
    cta_location: element.dataset.phCtaLocation || null,
    cta_text: (element.textContent || '').trim().slice(0, 120) || null,
    cta_destination: href,
    cta_destination_host: destinationHost,
    is_booking_link: Boolean(href && href.includes('calendly.com'))
  };
}

document.addEventListener(
  'click',
  (event) => {
    const target = event.target instanceof Element ? event.target.closest(CTA_SELECTOR) : null;
    if (!target) {
      return;
    }

    posthog.capture('cta_clicked', ctaProperties(target), { transport: 'sendBeacon' });
  },
  { capture: true }
);

/**
 * Lead magnet modal form. Delegated so it also works if the modal is re-enabled later
 * (the markup is currently commented out in index.html) or injected dynamically.
 * Passive — it never blocks or alters the existing submit handler.
 */
document.addEventListener(
  'submit',
  (event) => {
    const form = event.target instanceof Element ? event.target.closest('#lead-modal-form') : null;
    if (!form) {
      return;
    }

    posthog.capture('lead_form_submitted', { form_id: 'lead-modal-form' });
  },
  { capture: true }
);
