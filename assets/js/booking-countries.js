export const COUNTRIES = [
  { iso: 'US', name: 'United States', dial: '+1' },
  { iso: 'CA', name: 'Canada', dial: '+1' },
  { iso: 'GB', name: 'United Kingdom', dial: '+44' },
  { iso: 'AU', name: 'Australia', dial: '+61' },
  { iso: 'NZ', name: 'New Zealand', dial: '+64' },
  { iso: 'IE', name: 'Ireland', dial: '+353' },
  { iso: 'DE', name: 'Germany', dial: '+49' },
  { iso: 'FR', name: 'France', dial: '+33' },
  { iso: 'ES', name: 'Spain', dial: '+34' },
  { iso: 'IT', name: 'Italy', dial: '+39' },
  { iso: 'NL', name: 'Netherlands', dial: '+31' },
  { iso: 'BE', name: 'Belgium', dial: '+32' },
  { iso: 'AT', name: 'Austria', dial: '+43' },
  { iso: 'CH', name: 'Switzerland', dial: '+41' },
  { iso: 'SE', name: 'Sweden', dial: '+46' },
  { iso: 'NO', name: 'Norway', dial: '+47' },
  { iso: 'DK', name: 'Denmark', dial: '+45' },
  { iso: 'FI', name: 'Finland', dial: '+358' },
  { iso: 'PT', name: 'Portugal', dial: '+351' },
  { iso: 'PL', name: 'Poland', dial: '+48' },
  { iso: 'CZ', name: 'Czechia', dial: '+420' },
  { iso: 'HU', name: 'Hungary', dial: '+36' },
  { iso: 'RO', name: 'Romania', dial: '+40' },
  { iso: 'GR', name: 'Greece', dial: '+30' },
  { iso: 'TR', name: 'Turkey', dial: '+90' },
  { iso: 'UA', name: 'Ukraine', dial: '+380' },
  { iso: 'RU', name: 'Russia', dial: '+7' },
  { iso: 'AE', name: 'United Arab Emirates', dial: '+971' },
  { iso: 'SA', name: 'Saudi Arabia', dial: '+966' },
  { iso: 'IL', name: 'Israel', dial: '+972' },
  { iso: 'QA', name: 'Qatar', dial: '+974' },
  { iso: 'KW', name: 'Kuwait', dial: '+965' },
  { iso: 'BH', name: 'Bahrain', dial: '+973' },
  { iso: 'OM', name: 'Oman', dial: '+968' },
  { iso: 'EG', name: 'Egypt', dial: '+20' },
  { iso: 'ZA', name: 'South Africa', dial: '+27' },
  { iso: 'NG', name: 'Nigeria', dial: '+234' },
  { iso: 'KE', name: 'Kenya', dial: '+254' },
  { iso: 'GH', name: 'Ghana', dial: '+233' },
  { iso: 'MA', name: 'Morocco', dial: '+212' },
  { iso: 'IN', name: 'India', dial: '+91' },
  { iso: 'PK', name: 'Pakistan', dial: '+92' },
  { iso: 'BD', name: 'Bangladesh', dial: '+880' },
  { iso: 'LK', name: 'Sri Lanka', dial: '+94' },
  { iso: 'NP', name: 'Nepal', dial: '+977' },
  { iso: 'CN', name: 'China', dial: '+86' },
  { iso: 'HK', name: 'Hong Kong', dial: '+852' },
  { iso: 'TW', name: 'Taiwan', dial: '+886' },
  { iso: 'JP', name: 'Japan', dial: '+81' },
  { iso: 'KR', name: 'South Korea', dial: '+82' },
  { iso: 'SG', name: 'Singapore', dial: '+65' },
  { iso: 'MY', name: 'Malaysia', dial: '+60' },
  { iso: 'TH', name: 'Thailand', dial: '+66' },
  { iso: 'VN', name: 'Vietnam', dial: '+84' },
  { iso: 'ID', name: 'Indonesia', dial: '+62' },
  { iso: 'PH', name: 'Philippines', dial: '+63' },
  { iso: 'MX', name: 'Mexico', dial: '+52' },
  { iso: 'BR', name: 'Brazil', dial: '+55' },
  { iso: 'AR', name: 'Argentina', dial: '+54' },
  { iso: 'CL', name: 'Chile', dial: '+56' },
  { iso: 'CO', name: 'Colombia', dial: '+57' },
  { iso: 'PE', name: 'Peru', dial: '+51' },
  { iso: 'VE', name: 'Venezuela', dial: '+58' },
  { iso: 'EC', name: 'Ecuador', dial: '+593' },
  { iso: 'UY', name: 'Uruguay', dial: '+598' },
  { iso: 'CR', name: 'Costa Rica', dial: '+506' },
  { iso: 'PA', name: 'Panama', dial: '+507' },
  { iso: 'GT', name: 'Guatemala', dial: '+502' },
  { iso: 'DO', name: 'Dominican Republic', dial: '+1' },
  { iso: 'PR', name: 'Puerto Rico', dial: '+1' },
  { iso: 'JM', name: 'Jamaica', dial: '+1' },
];

export const DEFAULT_COUNTRY = 'US';

export function flagUrl(iso) {
  return `https://flagcdn.com/w40/${iso.toLowerCase()}.png`;
}

export function findCountry(value) {
  const needle = String(value || '').trim().toLowerCase().replace(/[^a-z0-9+]/g, '');
  if (!needle) return null;

  return COUNTRIES.find((country) => {
    const iso = country.iso.toLowerCase();
    const name = country.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const dial = country.dial.replace(/\D/g, '');
    return iso === needle
      || name === needle
      || country.dial === value
      || `+${dial}` === needle
      || dial === needle.replace(/^\+/, '');
  }) || null;
}

export function countryFromPhone(rawPhone) {
  const digits = String(rawPhone || '').replace(/\D/g, '');
  if (!digits) return null;

  const ranked = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);
  return ranked.find((country) => {
    const dial = country.dial.replace(/\D/g, '');
    return digits.startsWith(dial) && country.iso !== 'CA' && country.iso !== 'DO' && country.iso !== 'PR' && country.iso !== 'JM';
  }) || null;
}

export function stripDialCode(rawPhone, country) {
  if (!country) return String(rawPhone || '').trim();
  const trimmed = String(rawPhone || '').trim();
  const dial = country.dial.replace(/\D/g, '');
  const digits = trimmed.replace(/\D/g, '');
  if (trimmed.startsWith(country.dial)) {
    return trimmed.slice(country.dial.length).trim();
  }
  if (digits.startsWith(dial)) {
    return digits.slice(dial.length);
  }
  return trimmed.replace(/^\+/, '');
}
