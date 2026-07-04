import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useMed } from '../context/MedContext';
import {
  MapPin,
  Phone,
  Clock,
  Star,
  ShoppingBag,
  ExternalLink,
  AlertCircle,
  LocateFixed,
  Search,
  RotateCw,
  ShieldCheck,
  Store,
  Navigation,
} from 'lucide-react';

const pharmacyStyles = `
:root {
  /* Color Palette - Clean Light Mode with Red Accents */
  --bg-primary: #f5f5f5;
  --bg-secondary: #ffffff;
  --bg-card: #ffffff;
  --bg-card-hover: #fafafa;
  --bg-input: #f0f0f0;
  --border-color: rgba(0, 0, 0, 0.08);
  --border-color-hover: rgba(0, 0, 0, 0.15);

  /* Accent Colors - Red Primary */
  --color-primary: #e53935;           /* Bold Red */
  --color-primary-glow: rgba(229, 57, 53, 0.1);
  --color-secondary: #1a1a2e;         /* Deep Navy */
  --color-secondary-glow: rgba(26, 26, 46, 0.08);
  --color-accent: #e53935;            /* Red accent */
  --color-accent-glow: rgba(229, 57, 53, 0.08);

  /* Status Colors */
  --color-success: #2e7d32;
  --color-success-glow: rgba(46, 125, 50, 0.08);
  --color-warning: #e65100;
  --color-warning-glow: rgba(230, 81, 0, 0.08);
  --color-danger: #d32f2f;
  --color-danger-glow: rgba(211, 47, 47, 0.08);

  /* Text Colors */
  --text-primary: #1a1a1a;
  --text-secondary: #6b6b6b;
  --text-muted: #9e9e9e;
  --text-inverse: #ffffff;

  /* Dark Card (for chart panels like the reference) */
  --dark-card-bg: #1a1a2e;
  --dark-card-text: #ffffff;

  /* Shadows */
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.06);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.1);
  --shadow-card: 0 2px 8px rgba(0, 0, 0, 0.06);

  /* Fonts & Weights */
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-display: 'Outfit', 'Inter', sans-serif;

  /* Border Radii */
  --radius-xs: 6px;
  --radius-sm: 10px;
  --radius-md: 16px;
  --radius-lg: 24px;
  --radius-xl: 32px;
  --radius-full: 9999px;

  /* Transitions */
  --transition-fast: 0.15s ease;
  --transition-normal: 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  --transition-slow: 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.pharmacy-view {
  --view-max-width: 1180px;
  box-sizing: border-box;
  max-width: var(--view-max-width);
  margin: 0 auto;
  padding: 40px 24px 80px;
  font-family: var(--font-sans);
  color: var(--text-primary);
  background: var(--bg-primary);
}

.pharmacy-view.animate-fade-in {
  animation: pharmacyFadeIn 0.5s var(--transition-slow) both;
}

@media (prefers-reduced-motion: reduce) {
  .pharmacy-view.animate-fade-in,
  .pharmacy-view .modal-overlay,
  .pharmacy-view .spinner,
  .pharmacy-view .radar-sweep,
  .pharmacy-view .user-pulse-ring,
  .pharmacy-view .marketplace-card,
  .pharmacy-view .pharmacy-quote-card,
  .pharmacy-view .btn {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
  }
}

@keyframes pharmacyFadeIn {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.pharmacy-view .view-header {
  margin-bottom: 28px;
}

.pharmacy-view .view-header h1 {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 34px;
  letter-spacing: -0.01em;
  margin: 0 0 8px;
  color: var(--text-primary);
}

.pharmacy-view .view-header p {
  font-size: 15px;
  color: var(--text-secondary);
  margin: 0;
  max-width: 520px;
  line-height: 1.5;
}

.pharmacy-view .glass-card {
  box-sizing: border-box;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  position: relative;
}

.pharmacy-view .meds-strip {
  padding: 14px 18px;
  margin-bottom: 24px;
  font-size: 13.5px;
  color: var(--text-secondary);
}

.pharmacy-view .meds-strip span {
  color: var(--text-primary);
  font-weight: 500;
}

.pharmacy-view .btn {
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-family: var(--font-sans);
  font-size: 13.5px;
  font-weight: 600;
  letter-spacing: 0.01em;
  padding: 10px 18px;
  border-radius: var(--radius-full);
  border: 1px solid transparent;
  cursor: pointer;
  white-space: nowrap;
  transition: transform var(--transition-fast), background var(--transition-normal),
    border-color var(--transition-normal), opacity var(--transition-fast);
}

.pharmacy-view .btn:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.pharmacy-view .btn:active {
  transform: scale(0.97);
}

.pharmacy-view .btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  transform: none;
}

.pharmacy-view .btn-primary {
  background: var(--color-primary);
  color: var(--text-inverse);
  box-shadow: 0 4px 14px -4px var(--color-primary-glow);
}

.pharmacy-view .btn-primary:not(:disabled):hover {
  filter: brightness(1.08);
}

.pharmacy-view .btn-secondary {
  background: var(--bg-input);
  border-color: var(--border-color);
  color: var(--text-primary);
}

.pharmacy-view .btn-secondary:hover {
  background: var(--bg-card-hover);
  border-color: var(--border-color-hover);
}

.pharmacy-view .modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(26, 26, 46, 0.55);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  z-index: 100;
  animation: pharmacyFadeIn 0.25s var(--transition-normal) both;
}

.pharmacy-view .permission-modal {
  box-sizing: border-box;
  width: 100%;
  max-width: 420px;
  padding: 32px 28px;
  text-align: center;
}

.pharmacy-view .permission-icon {
  width: 56px;
  height: 56px;
  margin: 0 auto 18px;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-accent-glow);
  color: var(--color-accent);
}

.pharmacy-view .permission-modal h2 {
  font-family: var(--font-display);
  font-size: 21px;
  font-weight: 600;
  margin: 0 0 10px;
  color: var(--text-primary);
}

.pharmacy-view .permission-modal p {
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-secondary);
  margin: 0 0 24px;
}

.pharmacy-view .permission-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.pharmacy-view .location-card {
  box-sizing: border-box;
  padding: 28px;
  margin-bottom: 24px;
  text-align: center;
  color: var(--text-secondary);
}

.pharmacy-view .location-card svg {
  color: var(--color-warning);
  margin-bottom: 10px;
}

.pharmacy-view .location-card p {
  font-size: 14px;
  line-height: 1.6;
  margin: 0 0 6px;
}

.pharmacy-view .hint-text {
  font-size: 12.5px;
  color: var(--text-muted);
}

.pharmacy-view .hint-text a {
  color: var(--color-primary);
  text-decoration: none;
}

.pharmacy-view .hint-text a:hover {
  text-decoration: underline;
}

.pharmacy-view .manual-search-row {
  display: flex;
  gap: 10px;
  margin-top: 18px;
  max-width: 480px;
  margin-left: auto;
  margin-right: auto;
}

.pharmacy-view .manual-search-row input {
  box-sizing: border-box;
  flex: 1;
  font-family: var(--font-sans);
  font-size: 13.5px;
  color: var(--text-primary);
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-full);
  padding: 10px 16px;
}

.pharmacy-view .manual-search-row input::placeholder {
  color: var(--text-muted);
}

.pharmacy-view .manual-search-row input:focus-visible {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-glow);
}

.pharmacy-view .empty-state-card {
  box-sizing: border-box;
  padding: 44px 24px;
  text-align: center;
  color: var(--text-secondary);
  margin-bottom: 24px;
}

.pharmacy-view .empty-state-card svg {
  color: var(--text-muted);
  margin-bottom: 12px;
}

.pharmacy-view .empty-state-card h3 {
  font-family: var(--font-display);
  font-size: 17px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.pharmacy-view .empty-state-card p {
  font-size: 14px;
  margin: 0;
}

.pharmacy-view .marketplace-section {
  margin-bottom: 32px;
}

.pharmacy-view .marketplace-section h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 16px;
  color: var(--text-primary);
}

.pharmacy-view .marketplace-section h3 svg {
  color: var(--color-primary);
}

.pharmacy-view .marketplace-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}

.pharmacy-view .marketplace-card {
  box-sizing: border-box;
  padding: 20px;
  display: flex;
  flex-direction: column;
  transition: border-color var(--transition-normal), transform var(--transition-normal),
    box-shadow var(--transition-normal);
}

.pharmacy-view .marketplace-card:hover {
  border-color: var(--border-color-hover);
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.pharmacy-view .marketplace-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.pharmacy-view .marketplace-top h4 {
  font-size: 15.5px;
  font-weight: 600;
  margin: 0;
  color: var(--text-primary);
}

.pharmacy-view .verified-icon {
  color: var(--color-success);
  flex-shrink: 0;
}

.pharmacy-view .marketplace-card > p {
  font-size: 13px;
  line-height: 1.55;
  color: var(--text-secondary);
  margin: 0 0 14px;
  flex-grow: 1;
}

.pharmacy-view .marketplace-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 16px;
}

.pharmacy-view .tag-pill {
  font-family: var(--font-sans);
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.02em;
  padding: 4px 10px;
  border-radius: var(--radius-full);
  background: var(--color-secondary-glow);
  color: var(--color-secondary);
}

.pharmacy-view .marketplace-card .btn {
  width: 100%;
  justify-content: center;
}

.pharmacy-view .pharmacy-layout-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
  gap: 24px;
  align-items: start;
}

.pharmacy-view .pharmacies-list-panel h3 {
  font-family: var(--font-display);
  font-size: 17px;
  font-weight: 600;
  margin: 0 0 14px;
  color: var(--text-primary);
}

.pharmacy-view .map-card h3 {
  font-family: var(--font-display);
  font-size: 17px;
  font-weight: 600;
  margin: 0 0 14px;
  color: var(--dark-card-text);
}

.pharmacy-view .loading-card {
  box-sizing: border-box;
  padding: 40px 24px;
  text-align: center;
  color: var(--text-secondary);
}

.pharmacy-view .spinner {
  width: 26px;
  height: 26px;
  margin: 0 auto 14px;
  border-radius: 50%;
  border: 2.5px solid var(--border-color);
  border-top-color: var(--color-primary);
  animation: pharmacySpin 0.8s linear infinite;
}

@keyframes pharmacySpin {
  to {
    transform: rotate(360deg);
  }
}

.pharmacy-view .quotes-stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pharmacy-view .pharmacy-quote-card {
  box-sizing: border-box;
  padding: 18px 20px;
  transition: border-color var(--transition-normal), box-shadow var(--transition-normal);
}

.pharmacy-view .pharmacy-quote-card:hover {
  border-color: var(--border-color-hover);
  box-shadow: var(--shadow-md);
}

.pharmacy-view .quote-main-row {
  margin-bottom: 12px;
}

.pharmacy-view .pharmacy-meta-col h4 {
  font-size: 15.5px;
  font-weight: 600;
  margin: 0 0 6px;
  color: var(--text-primary);
}

.pharmacy-view .distance-lbl {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-family: var(--font-sans);
  font-size: 12px;
  color: var(--text-muted);
}

.pharmacy-view .rating-row {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 6px;
  font-size: 12.5px;
  color: var(--text-secondary);
}

.pharmacy-view .star-filled {
  color: var(--color-warning);
  fill: var(--color-warning);
}

.pharmacy-view .quote-actions-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border-color);
  flex-wrap: wrap;
}

.pharmacy-view .contact-details {
  display: flex;
  align-items: center;
  gap: 14px;
  font-size: 12.5px;
  color: var(--text-secondary);
}

.pharmacy-view .contact-details span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.pharmacy-view .status-open {
  color: var(--color-success);
}

.pharmacy-view .status-closed {
  color: var(--text-muted);
}

.pharmacy-view .map-card {
  box-sizing: border-box;
  padding: 22px;
  position: sticky;
  top: 24px;
  background: var(--dark-card-bg);
  border-color: rgba(255, 255, 255, 0.08);
}

.pharmacy-view .card-desc {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.55);
  margin: 0 0 16px;
}

.pharmacy-view .map-canvas-premium {
  border-radius: var(--radius-md);
  background: radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.05), rgba(0, 0, 0, 0.15) 80%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  overflow: hidden;
  aspect-ratio: 1 / 1;
}

.pharmacy-view .svg-map {
  width: 100%;
  height: 100%;
  display: block;
}

.pharmacy-view .radar-sweep {
  animation: pharmacySweep 4.5s linear infinite;
}

@keyframes pharmacySweep {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.pharmacy-view .user-pulse-ring {
  animation: pharmacyPulseRing 2.2s var(--transition-slow) infinite;
  transform-origin: center;
}

@keyframes pharmacyPulseRing {
  0% {
    opacity: 0.9;
    transform: scale(0.6);
  }
  70% {
    opacity: 0;
    transform: scale(2.6);
  }
  100% {
    opacity: 0;
    transform: scale(2.6);
  }
}

.pharmacy-view .pharm-marker {
  transition: opacity var(--transition-normal);
}

.pharmacy-view .pharm-marker text {
  font-family: var(--font-sans);
}

.pharmacy-view .map-legend {
  display: flex;
  gap: 20px;
  margin-top: 16px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.65);
}

.pharmacy-view .legend-item {
  display: flex;
  align-items: center;
  gap: 7px;
}

.pharmacy-view .legend-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  display: inline-block;
}

.pharmacy-view .legend-dot.user-color {
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.25);
}

.pharmacy-view .legend-dot.cheapest-color {
  background: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-glow);
}

@media (max-width: 900px) {
  .pharmacy-view .pharmacy-layout-grid {
    grid-template-columns: 1fr;
  }

  .pharmacy-view .map-card {
    position: static;
  }

  .pharmacy-view .view-header h1 {
    font-size: 28px;
  }
}

@media (max-width: 560px) {
  .pharmacy-view {
    padding: 28px 16px 60px;
  }

  .pharmacy-view .manual-search-row {
    flex-direction: column;
  }

  .pharmacy-view .permission-actions {
    flex-direction: column-reverse;
  }

  .pharmacy-view .quote-actions-row {
    flex-direction: column;
    align-items: stretch;
  }

  .pharmacy-view .quote-actions-row .btn {
    justify-content: center;
  }
}
`;

interface NearbyPharmacy {
  id: string;
  name: string;
  rating: number | null;
  address: string;
  openNow: boolean | null;
  website: string | null;
  phone: string | null;
  lat: number;
  lng: number;
  distance: number;
}

interface Marketplace {
  id: string;
  name: string;
  description: string;
  website: string;
  tags: string[];
  delivery?: boolean;
}

interface Coords {
  latitude: number;
  longitude: number;
}

// ---- geometry helpers for the radar map (real math, not decoration) ----
const toRad = (deg: number) => (deg * Math.PI) / 180;

function bearingDegrees(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
) {
  const φ1 = toRad(lat1),
    φ2 = toRad(lat2);
  const Δλ = toRad(lng2 - lng1);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (Math.atan2(y, x) * 180) / Math.PI; // -180..180, 0 = north
}

// Radar map geometry constants
const RADAR_SIZE = 400;
const RADAR_CENTER = RADAR_SIZE / 2;
const RADAR_MAX_R = RADAR_CENTER - 40;

export const Pharmacy: React.FC = () => {
  const { medicines } = useMed();

  const [pharmacies, setPharmacies] = useState<NearbyPharmacy[]>([]);
  const [marketplaces, setMarketplaces] = useState<Marketplace[]>([]);
  const [detectedCity, setDetectedCity] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualAddress, setManualAddress] = useState('');
  const [manualLoading, setManualLoading] = useState(false);

  const [coords, setCoords] = useState<Coords | null>(null);
  const [isGeolocationAvailable] = useState(() => 'geolocation' in navigator);
  const [isGeolocationEnabled, setIsGeolocationEnabled] = useState(true);
  const [positionError, setPositionError] = useState<string | null>(null);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [hasRespondedToModal, setHasRespondedToModal] = useState(false);

  const fetchPharmacies = useCallback(async (lat: number, lng: number) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `http://localhost:5000/api/pharmacies?lat=${lat}&lng=${lng}`,
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Unable to fetch pharmacies');
      }

      setPharmacies(Array.isArray(data.pharmacies) ? data.pharmacies : []);
    } catch (err: any) {
      setError(err.message);
      setPharmacies([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Always fetches the nationwide marketplace list. Reverse-geocoding is
  // attempted separately so a failed/slow geocode never blocks the
  // marketplace section from showing — previously `if (!city) return;`
  // meant a geocode miss silently hid every marketplace.
  const fetchCityAndMarketplaces = useCallback(
    async (lat: number, lng: number) => {
      let city: string | null = null;

      try {
        const geoRes = await fetch(
          `http://localhost:5000/api/reverse-geocode?lat=${lat}&lng=${lng}`,
        );
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          city = geoData.city || null;
          setDetectedCity(city);
        }
      } catch {
        // Reverse geocoding is best-effort only — don't let it block
        // the marketplace fetch below.
      }

      try {
        const mpRes = await fetch(
          `http://localhost:5000/api/marketplaces${
            city ? `?city=${encodeURIComponent(city)}` : ''
          }`,
        );
        if (!mpRes.ok) return;
        const { marketplaces: list } = await mpRes.json();
        setMarketplaces(list || []);
      } catch {
        // Non-critical — physical pharmacy results still work without this
      }
    },
    [],
  );

  const requestLocation = useCallback(() => {
    if (!isGeolocationAvailable) return;
    setPositionError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsGeolocationEnabled(true);
        const { latitude, longitude } = position.coords;

        setCoords({ latitude, longitude });
        fetchPharmacies(latitude, longitude);
        fetchCityAndMarketplaces(latitude, longitude);
      },
      (err) => {
        setPositionError(err.message);
        if (err.code === err.PERMISSION_DENIED) setIsGeolocationEnabled(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGeolocationAvailable]);

  // Check permission state on mount WITHOUT auto-prompting.
  // We only show our own modal; the native prompt only fires after the user clicks "Allow" in it.
  useEffect(() => {
    if (!isGeolocationAvailable) return;

    if ('permissions' in navigator) {
      navigator.permissions
        .query({ name: 'geolocation' as PermissionName })
        .then((status) => {
          setIsGeolocationEnabled(status.state !== 'denied');
          if (status.state === 'granted') {
            requestLocation(); // already allowed previously — skip the modal
          } else if (status.state === 'prompt') {
            setShowPermissionModal(true); // show our friendly modal first
          }
          status.onchange = () =>
            setIsGeolocationEnabled(status.state !== 'denied');
        });
    } else {
      setShowPermissionModal(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGeolocationAvailable]);

  const handleAllowLocation = () => {
    setHasRespondedToModal(true);
    setShowPermissionModal(false);
    requestLocation(); // user gesture → native browser prompt fires here
  };

  const handleDenyLocation = () => {
    setHasRespondedToModal(true);
    setShowPermissionModal(false);
  };

  const handleManualSearch = async () => {
    if (!manualAddress.trim()) return;
    setManualLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `http://localhost:5000/api/geocode?address=${encodeURIComponent(manualAddress)}`,
      );
      if (!res.ok) throw new Error('not found');
      const { lat, lng } = await res.json();
      setCoords({ latitude: lat, longitude: lng });
      fetchPharmacies(lat, lng);
      fetchCityAndMarketplaces(lat, lng);
    } catch {
      setError(
        'Could not find that address. Try a more specific one (street, city).',
      );
    } finally {
      setManualLoading(false);
    }
  };

  const handleOrder = (pharm: NearbyPharmacy) => {
    if (pharm.website) {
      window.open(pharm.website, '_blank', 'noopener,noreferrer');
      return;
    }

    window.open(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        pharm.name + ' ' + pharm.address,
      )}`,
      '_blank',
      'noopener,noreferrer',
    );
  };

  const permissionBlocked = isGeolocationAvailable && !isGeolocationEnabled;

  // Radar map geometry — real bearing/distance from the user to each pharmacy
  const radarPoints = useMemo(() => {
    if (!coords || pharmacies.length === 0) return [];
    const maxDistance = Math.max(...pharmacies.map((p) => p.distance), 0.5);
    return pharmacies.slice(0, 8).map((pharm) => {
      const bearing = bearingDegrees(
        coords.latitude,
        coords.longitude,
        pharm.lat,
        pharm.lng,
      );
      const r = (pharm.distance / maxDistance) * RADAR_MAX_R;
      const rad = toRad(bearing);
      const x = RADAR_CENTER + r * Math.sin(rad);
      const y = RADAR_CENTER - r * Math.cos(rad);
      return { ...pharm, x, y };
    });
  }, [coords, pharmacies]);

  return (
    <div className="pharmacy-view animate-fade-in">
      <style>{pharmacyStyles}</style>
      <header className="view-header">
        <h1>Nearby Pharmacies</h1>
        <p>
          Find a pharmacy near you, or order from a trusted online marketplace.
        </p>
      </header>

      {medicines.length > 0 && (
        <div className="glass-card meds-strip">
          <span>Refilling: {medicines.map((m) => m.name).join(', ')}</span>
        </div>
      )}

      {/* Custom pre-permission modal */}
      {showPermissionModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-card permission-modal">
            <div className="permission-icon">
              <Navigation size={28} />
            </div>
            <h2>Enable your location</h2>
            <p>
              We'll use your location to find pharmacies near you and detect
              your city so we can show relevant online medicine marketplaces.
              Your location is never stored.
            </p>
            <div className="permission-actions">
              <button
                className="btn btn-secondary"
                onClick={handleDenyLocation}
              >
                Not now
              </button>
              <button className="btn btn-primary" onClick={handleAllowLocation}>
                <LocateFixed size={16} /> Allow location
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fallback / status states once the modal has been dismissed */}
      {!coords && !loading && hasRespondedToModal && (
        <div className="glass-card location-card">
          {!isGeolocationAvailable ? (
            <p>
              Your browser doesn't support location access. Enter your address
              below instead.
            </p>
          ) : permissionBlocked || positionError ? (
            <>
              <AlertCircle size={26} />
              <p>
                Location access is blocked for this site, so we can't detect
                your position automatically.
              </p>
              <p className="hint-text">
                To re-enable it: click the site-info icon next to the address
                bar, set "Location" to Allow, then try again.{' '}
                <a
                  href="https://www.chromestatus.com/feature/6443143280984064"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Learn more
                </a>
              </p>
              <button
                className="btn btn-secondary"
                onClick={() => setShowPermissionModal(true)}
              >
                <RotateCw size={14} /> Try again
              </button>
            </>
          ) : (
            <p>No location yet — enter an address below to search manually.</p>
          )}

          <div className="manual-search-row">
            <input
              type="text"
              placeholder="Or enter your address / city / zip"
              value={manualAddress}
              onChange={(e) => setManualAddress(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
            />
            <button
              className="btn btn-primary"
              onClick={handleManualSearch}
              disabled={manualLoading}
            >
              <Search size={14} /> {manualLoading ? 'Searching…' : 'Search'}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="glass-card empty-state-card">
          <AlertCircle size={36} />
          <p>{error}</p>
        </div>
      )}

      {/* Online marketplaces — nationwide list, plus city-specific extras
          when a city was successfully detected */}
      {marketplaces.length > 0 && (
        <section className="marketplace-section">
          <h3>
            <Store size={18} /> Online medicine marketplaces
            {detectedCity ? ` in ${detectedCity}` : ' in Bangladesh'}
          </h3>
          <div className="marketplace-grid">
            {marketplaces.map((mp, i) => (
              <div
                key={mp.id || `${mp.name}-${i}`}
                className="glass-card marketplace-card"
              >
                <div className="marketplace-top">
                  <h4>{mp.name}</h4>
                  <ShieldCheck size={16} className="verified-icon" />
                </div>
                <p>{mp.description}</p>
                <div className="marketplace-tags">
                  {Array.isArray(mp.tags) &&
                    mp.tags.map((tag, ti) => (
                      <span key={`${tag}-${ti}`} className="tag-pill">
                        {tag}
                      </span>
                    ))}
                </div>
                <button
                  className="btn btn-primary"
                  onClick={() =>
                    window.open(mp.website, '_blank', 'noopener,noreferrer')
                  }
                >
                  <ExternalLink size={14} /> Visit & order
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {coords && (
        <div className="pharmacy-layout-grid">
          <div className="pharmacies-list-panel">
            <h3>Nearby physical pharmacies</h3>

            {loading ? (
              <div className="glass-card loading-card">
                <div className="spinner" />
                <p>Finding pharmacies near you…</p>
              </div>
            ) : pharmacies.length > 0 ? (
              <div className="quotes-stack">
                {pharmacies.map((pharm) => (
                  <div
                    key={pharm.id}
                    className="glass-card pharmacy-quote-card"
                  >
                    <div className="quote-main-row">
                      <div className="pharmacy-meta-col">
                        <h4>{pharm.name || 'Unnamed pharmacy'}</h4>
                        <span className="distance-lbl">
                          <MapPin size={12} /> {pharm.distance} mi ·{' '}
                          {pharm.address}
                        </span>
                        {pharm.rating && (
                          <div className="rating-row">
                            <Star size={12} className="star-filled" />
                            <span>{pharm.rating} rating</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="quote-actions-row">
                      <div className="contact-details">
                        {pharm.openNow !== null && (
                          <span
                            className={
                              pharm.openNow ? 'status-open' : 'status-closed'
                            }
                          >
                            <Clock size={12} />{' '}
                            {pharm.openNow ? 'Open now' : 'Closed'}
                          </span>
                        )}
                        {pharm.phone && (
                          <span>
                            <Phone size={12} /> {pharm.phone}
                          </span>
                        )}
                      </div>
                      <button
                        className="btn btn-primary"
                        disabled={!pharm.website}
                        onClick={() => handleOrder(pharm)}
                      >
                        <ExternalLink size={14} />
                        {pharm.website
                          ? 'Order online'
                          : pharm.phone
                            ? 'Call to order'
                            : 'No contact info'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="glass-card empty-state-card">
                <ShoppingBag size={40} />
                <h3>No pharmacies found nearby</h3>
              </div>
            )}
          </div>

          {/* Live radar map */}
          <div className="map-view-panel">
            <div className="glass-card map-card">
              <h3>Live location map</h3>
              <p className="card-desc">
                Pharmacies plotted by real direction and distance from you.
              </p>

              <div className="map-canvas-premium">
                <svg
                  viewBox={`0 0 ${RADAR_SIZE} ${RADAR_SIZE}`}
                  className="svg-map"
                >
                  <defs>
                    <radialGradient id="radarGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="rgba(229,57,53,0.20)" />
                      <stop offset="100%" stopColor="rgba(229,57,53,0)" />
                    </radialGradient>
                    <clipPath id="radarClip">
                      <circle
                        cx={RADAR_CENTER}
                        cy={RADAR_CENTER}
                        r={RADAR_MAX_R}
                      />
                    </clipPath>
                  </defs>

                  <circle
                    cx={RADAR_CENTER}
                    cy={RADAR_CENTER}
                    r={RADAR_MAX_R}
                    fill="url(#radarGlow)"
                  />

                  <g clipPath="url(#radarClip)">
                    <g
                      className="radar-sweep"
                      style={{
                        transformOrigin: `${RADAR_CENTER}px ${RADAR_CENTER}px`,
                      }}
                    >
                      <path
                        d={`M ${RADAR_CENTER} ${RADAR_CENTER} L ${RADAR_CENTER} ${RADAR_CENTER - RADAR_MAX_R} A ${RADAR_MAX_R} ${RADAR_MAX_R} 0 0 1 ${RADAR_CENTER + RADAR_MAX_R * Math.sin(toRad(38))} ${RADAR_CENTER - RADAR_MAX_R * Math.cos(toRad(38))} Z`}
                        fill="rgba(229,57,53,0.16)"
                      />
                    </g>
                  </g>

                  {[0.33, 0.66, 1].map((f) => (
                    <circle
                      key={f}
                      cx={RADAR_CENTER}
                      cy={RADAR_CENTER}
                      r={RADAR_MAX_R * f}
                      fill="none"
                      stroke="rgba(255,255,255,0.08)"
                      strokeDasharray="4 4"
                    />
                  ))}
                  <line
                    x1={RADAR_CENTER}
                    y1={20}
                    x2={RADAR_CENTER}
                    y2={RADAR_SIZE - 20}
                    stroke="rgba(255,255,255,0.05)"
                  />
                  <line
                    x1={20}
                    y1={RADAR_CENTER}
                    x2={RADAR_SIZE - 20}
                    y2={RADAR_CENTER}
                    stroke="rgba(255,255,255,0.05)"
                  />

                  {/* User location, pulsing */}
                  <circle
                    cx={RADAR_CENTER}
                    cy={RADAR_CENTER}
                    r="16"
                    fill="rgba(255,255,255,0.18)"
                    className="user-pulse-ring"
                  />
                  <circle
                    cx={RADAR_CENTER}
                    cy={RADAR_CENTER}
                    r="7"
                    fill="#ffffff"
                  />

                  {radarPoints.map((p, i) => (
                    <g key={p.id} className="pharm-marker">
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r="14"
                        fill={
                          i === 0
                            ? 'rgba(229,57,53,0.25)'
                            : 'rgba(230,81,0,0.2)'
                        }
                      />
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r="6"
                        fill={
                          i === 0
                            ? 'var(--color-primary)'
                            : 'var(--color-warning)'
                        }
                      />
                      <text
                        x={p.x + (p.x > RADAR_CENTER ? 12 : -12)}
                        y={p.y + 4}
                        fill="#ffffff"
                        fontSize="10"
                        fontWeight="600"
                        textAnchor={p.x > RADAR_CENTER ? 'start' : 'end'}
                      >
                        {p.name.length > 16
                          ? `${p.name.slice(0, 16)}…`
                          : p.name}{' '}
                        ({p.distance}mi)
                      </text>
                    </g>
                  ))}
                </svg>
              </div>

              <div className="map-legend">
                <div className="legend-item">
                  <span className="legend-dot user-color" /> Your location
                </div>
                <div className="legend-item">
                  <span className="legend-dot cheapest-color" /> Nearest
                  pharmacy
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};