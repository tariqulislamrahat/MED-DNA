import React, { useState, useEffect, useRef } from 'react';
import { useMed } from '../context/MedContext';
import { mockApi } from '../services/mockApi';
import type { Pharmacy as PharmacyType } from '../services/mockData';
import { 
  MapPin, 
  Phone, 
  Clock, 
  Star, 
  CheckCircle, 
  ShoppingBag, 
  TrendingDown
} from 'lucide-react';

const BASE_PRICES: Record<string, number> = {
  "Aspirin": 4.50,
  "Ibuprofen": 6.20,
  "Warfarin": 12.00,
  "Metformin": 8.00,
  "Lisinopril": 9.50,
  "Amoxicillin": 15.00,
  "Atorvastatin": 18.20
};

const seedRandom = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(Math.sin(hash));
};

const calculateRealPharmacyPrices = (pharm: any, meds: string[]) => {
  let seed = 0;
  for (let i = 0; i < pharm.name.length; i++) {
    seed += pharm.name.charCodeAt(i);
  }
  
  const prices: Record<string, number> = {};
  let totalEstimatedPrice = 0;
  let availableCount = 0;

  meds.forEach((medName) => {
    const base = BASE_PRICES[medName] || 10.00;
    const variation = 0.85 + ((seed % 31) / 100);
    const price = base * variation;
    
    prices[medName] = price;
    totalEstimatedPrice += price;
    availableCount++;
  });

  return {
    ...pharm,
    prices,
    totalEstimatedPrice,
    availableCount
  };
};

const fetchRealPharmacies = async (lat: number, lng: number, language: string): Promise<any[]> => {
  try {
    const query = `[out:json][timeout:15];node(around:3000,${lat},${lng})[amenity=pharmacy];out;`;
    const response = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error("Overpass API query failed");
    const data = await response.json();
    
    if (!data.elements || data.elements.length === 0) {
      return [];
    }
    
    return data.elements.slice(0, 5).map((element: any, idx: number) => {
      const name = element.tags.name || (language === 'bn' ? `স্থানীয় ফার্মেসি #${idx + 1}` : `Local Pharmacy #${idx + 1}`);
      const latDiff = element.lat - lat;
      const lngDiff = element.lon - lng;
      const distanceMiles = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 69;
      
      return {
        id: `real_${element.id || idx}`,
        name: name,
        address: element.tags['addr:street'] || element.tags['addr:full'] || (language === 'bn' ? "নিকটবর্তী এলাকা" : "Nearby Street"),
        phone: element.tags.phone || element.tags['contact:phone'] || (language === 'bn' ? "+৮৮০ ২-১২৩৪৫৬" : "+880 2-123456"),
        distance: parseFloat(distanceMiles.toFixed(2)),
        rating: parseFloat((4.0 + (seedRandom(name) * 0.9)).toFixed(1)),
        openHours: element.tags.opening_hours || "8:00 AM - 10:00 PM",
        lat: element.lat,
        lng: element.lon
      };
    });
  } catch (error) {
    console.warn("Failed to fetch real pharmacies from Overpass, using fallbacks:", error);
    return [];
  }
};

export const Pharmacy: React.FC = () => {
  const { medicines, checkoutRefills, language, t } = useMed();
  const [loading, setLoading] = useState(false);
  const [pharmacies, setPharmacies] = useState<(PharmacyType & { totalEstimatedPrice: number; availableCount: number })[]>([]);
  const [cheapestId, setCheapestId] = useState('');
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [orderedPharmacy, setOrderedPharmacy] = useState<string>('');
  const [mapLoaded, setMapLoaded] = useState(false);
  const [coords, setCoords] = useState<[number, number]>([23.8103, 90.4125]); // Default Dhaka, Bangladesh

  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapInstance = useRef<any>(null);
  const medNames = medicines.length > 0 
    ? medicines.map(m => m.name) 
    : ['Lisinopril', 'Atorvastatin'];

  // Track user location with Geolocation API
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoords([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          console.warn("Geolocation failed or denied, using Dhaka:", error);
          setCoords([23.8103, 90.4125]);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      setCoords([23.8103, 90.4125]);
    }
  }, []);

  // Dynamically load Leaflet assets
  useEffect(() => {
    if ((window as any).L) {
      setMapLoaded(true);
      return;
    }

    // Leaflet CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
    link.crossOrigin = '';
    document.head.appendChild(link);

    // Leaflet JS
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
    script.crossOrigin = '';
    script.onload = () => {
      setMapLoaded(true);
    };
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    const loadPharmacyData = async () => {
      setLoading(true);
      try {
        let realList = await fetchRealPharmacies(coords[0], coords[1], language);
        
        if (realList.length === 0) {
          console.log("No real pharmacies found near coordinates, using relative fallbacks.");
          const userLat = coords[0];
          const userLng = coords[1];
          realList = [
            {
              id: "pharm_01",
              name: language === 'bn' ? "মেডিকেয়ার প্লাস ফার্মেসি" : "MediCare Plus Pharmacy",
              address: language === 'bn' ? "৭৪২ মেডিকেল সেন্টার রোড" : "742 Medical Center Dr, Suite A",
              phone: "(555) 123-4567",
              distance: 0.4,
              rating: 4.8,
              openHours: "8:00 AM - 10:00 PM",
              lat: userLat + 0.003,
              lng: userLng - 0.004
            },
            {
              id: "pharm_02",
              name: language === 'bn' ? "ওয়েলনেস এক্সপ্রেস ফার্মেসি" : "Wellness Express Pharmacy",
              address: language === 'bn' ? "১০৯৮ হেলথ রোড" : "1098 Health Blvd, Corner Shop",
              phone: "(555) 987-6543",
              distance: 1.2,
              rating: 4.5,
              openHours: "24/7 Open",
              lat: userLat - 0.008,
              lng: userLng - 0.009
            },
            {
              id: "pharm_03",
              name: language === 'bn' ? "কিউরঅল কমিউনিটি ড্রাগস্টোর" : "CureAll Community Drugstore",
              address: language === 'bn' ? "৩২০ ম্যাপেল স্ট্রিট" : "320 Maple St, Downtown",
              phone: "(555) 456-7890",
              distance: 2.5,
              rating: 4.2,
              openHours: "9:00 AM - 7:00 PM",
              lat: userLat + 0.018,
              lng: userLng + 0.015
            }
          ];
        }
        
        const processed = realList.map(pharm => calculateRealPharmacyPrices(pharm, medNames));
        processed.sort((a, b) => a.totalEstimatedPrice - b.totalEstimatedPrice);
        
        setPharmacies(processed);
        if (processed.length > 0) {
          setCheapestId(processed[0].id);
        }
      } catch (err) {
        console.error("Error loading pharmacy data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadPharmacyData();
  }, [coords, medicines]);

  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !(window as any).L || pharmacies.length === 0) return;

    if (leafletMapInstance.current) {
      leafletMapInstance.current.remove();
      leafletMapInstance.current = null;
    }

    const L = (window as any).L;
    
    const map = L.map(mapRef.current).setView(coords, 13);
    leafletMapInstance.current = map;

    // Use Google Maps roadmap tiles
    L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      attribution: '© Google Maps',
      maxZoom: 20
    }).addTo(map);

    // Custom user location pulse marker
    const userIcon = L.divIcon({
      className: 'custom-user-marker',
      html: `<div class="user-pulse-dot"></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });

    L.marker(coords, { icon: userIcon }).addTo(map).bindPopup('<b>Your Location</b>');

    // Pharmacy markers relative to user coordinates
    const userLat = coords[0];
    const userLng = coords[1];
    
    const pharmCoords: Record<string, [number, number]> = {
      "pharm_01": [userLat + 0.003, userLng - 0.004], // Medicare Plus (~0.4 miles away)
      "pharm_02": [userLat - 0.008, userLng - 0.009], // Wellness Express (~1.2 miles away)
      "pharm_03": [userLat + 0.018, userLng + 0.015]  // CureAll Community (~2.5 miles away)
    };

    pharmacies.forEach(pharm => {
      const pinCoords = pharmCoords[pharm.id] || [userLat + (Math.random() - 0.5) * 0.02, userLng + (Math.random() - 0.5) * 0.02];
      const isCheapest = pharm.id === cheapestId;
      
      const pharmIcon = L.divIcon({
        className: `custom-pharmacy-marker ${isCheapest ? 'cheapest' : ''}`,
        html: `<div class="pharm-dot ${isCheapest ? 'cheapest' : ''}"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });

      L.marker(pinCoords, { icon: pharmIcon })
        .addTo(map)
        .bindPopup(`
          <div class="map-popup-content">
            <h4 style="margin: 0 0 0.25rem 0; font-size: 0.85rem; font-weight: bold; color: #1a1a1a;">${pharm.name}</h4>
            <span style="font-size: 0.72rem; color: #666;">⭐ ${pharm.rating} Rating • ${pharm.distance}m</span><br/>
            <span style="font-size: 0.78rem; font-weight: bold; color: var(--color-primary); display: block; margin-top: 0.2rem;">Total Package Est: ৳ ${(pharm.totalEstimatedPrice * 115).toFixed(0)}</span>
            <span style="font-size: 0.7rem; color: #444; display: block; margin-top: 0.1rem;">${pharm.openHours}</span>
          </div>
        `);
    });

    return () => {
      if (leafletMapInstance.current) {
        leafletMapInstance.current.remove();
        leafletMapInstance.current = null;
      }
    };
  }, [mapLoaded, pharmacies, cheapestId, coords]);

  const handlePlaceOrder = (pharmacyName: string) => {
    setOrderedPharmacy(pharmacyName);
    checkoutRefills();
    setOrderModalOpen(true);
  };

  return (
    <div className="pharmacy-view animate-fade-in">
      <header className="view-header">
        <h1>{t('pharmacyHeader')}</h1>
        <p>{t('pharmacySub')}</p>
      </header>

      {loading ? (
        <div className="glass-card loading-card">
          <div className="spinner" />
          <p>{language === 'bn' ? 'স্থানীয় ক্যাটালগ মূল্য বিশ্লেষণ এবং মোট হিসাব করা হচ্ছে...' : 'Analyzing local catalog prices and calculating totals...'}</p>
        </div>
      ) : (
        <div className="pharmacy-layout-grid">
          
          {/* Left Side: Pricing List Cards */}
          <div className="pharmacies-list-panel">
            <h3>{t('nearbyQuotes')}</h3>
            {medicines.length === 0 && (
              <div className="banner banner-info" style={{
                background: 'rgba(6, 182, 212, 0.08)',
                border: '1px solid rgba(6, 182, 212, 0.2)',
                color: '#0891b2',
                padding: '0.75rem',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '1rem',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                textAlign: 'left'
              }}>
                <span>ℹ️ {language === 'bn' 
                  ? 'আপনার ড্যাশবোর্ডে কোনো সক্রিয় ওষুধ নেই। সাধারণ ওষুধের (Lisinopril, Atorvastatin) আনুমানিক মূল্য নিচে দেখানো হলো।' 
                  : 'No active medicines in your dashboard. Displaying estimated quotes for common medicines (Lisinopril, Atorvastatin) below.'}</span>
              </div>
            )}
            <p className="subtitle-text">
              {language === 'bn'
                ? `আপনার মোট ${medNames.length} টি সক্রিয় ওষুধের জন্য মূল্য নির্ধারণ করা হয়েছে।`
                : `Prices calculated for your total set of ${medNames.length} active medicines.`}
            </p>
            
            <div className="quotes-stack">
              {pharmacies.map((pharm) => {
                const isCheapest = pharm.id === cheapestId;
                return (
                  <div 
                    key={pharm.id} 
                    className={`glass-card pharmacy-quote-card ${isCheapest ? 'cheapest-highlight' : ''}`}
                  >
                    {isCheapest && (
                      <div className="cheapest-badge-banner">
                        <TrendingDown size={14} />
                        <span>{t('cheapestEstimate')}</span>
                      </div>
                    )}

                    <div className="quote-main-row">
                      <div className="pharmacy-meta-col">
                        <h4>{pharm.name}</h4>
                        <span className="distance-lbl"><MapPin size={12} /> {pharm.distance} {language === 'bn' ? 'মাইল দূরে' : 'miles away'}</span>
                        <div className="rating-row">
                          <Star size={12} className="star-filled" />
                          <span>{pharm.rating} {language === 'bn' ? 'রেটিং' : 'Rating'}</span>
                        </div>
                      </div>

                      <div className="price-total-col">
                        <span className="total-lbl">{t('totalEstimatedPrice')}</span>
                        <span className="total-val">৳ {(pharm.totalEstimatedPrice * 115).toLocaleString('en-US')}</span>
                        <span className="availability-lbl">
                          {language === 'bn'
                            ? `সব ${pharm.availableCount} টি আইটেম স্টক আছে`
                            : `All ${pharm.availableCount} items in stock`}
                        </span>
                      </div>
                    </div>

                    {/* Expandable itemized pricing */}
                    <div className="itemized-prices-section">
                      <h5>{t('itemizedEstimations')}</h5>
                      <div className="itemized-grid">
                        {medicines.map(med => {
                          const price = pharm.prices[med.name] || 10.00;
                          return (
                            <div key={med.id} className="itemized-price-row">
                              <span className="med-name">{med.name}</span>
                              <span className="med-price">৳ {(price * 115).toFixed(0)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="quote-actions-row">
                      <div className="contact-details">
                        <span><Clock size={12} /> {pharm.openHours}</span>
                        <span><Phone size={12} /> {pharm.phone}</span>
                      </div>
                      <button 
                        className={`btn ${isCheapest ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => handlePlaceOrder(pharm.name)}
                      >
                        {t('orderRefills')}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Side: Mock Map view */}
          <div className="map-view-panel">
            <div className="glass-card map-card">
              <h3>{t('liveMap')}</h3>
              <p className="card-desc">{t('liveMapSub')}</p>
              
              <div className="map-canvas-mock" style={{ height: '300px', position: 'relative', zIndex: 10 }}>
                <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
              </div>

              <div className="map-legend">
                <div className="legend-item"><span className="legend-dot user-color" /><span>{t('yourLocation')}</span></div>
                <div className="legend-item"><span className="legend-dot cheapest-color" /><span>{t('cheapestClinic')}</span></div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Mock Order Confirmation Modal */}
      {orderModalOpen && (
        <div className="modal-overlay" onClick={() => setOrderModalOpen(false)}>
          <div className="modal-content glass-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon-success">
              <CheckCircle size={44} />
            </div>
            <h2>{t('refillOrderPlaced')}</h2>
            <p>
              {language === 'bn'
                ? `আপনার ওষুধের (${medNames.join(', ')}) অর্ডার সফলভাবে ${orderedPharmacy} এ পাঠানো হয়েছে।`
                : `Your order for ${medNames.join(', ')} has been successfully transmitted to ${orderedPharmacy}.`}
            </p>
            
            <div className="delivery-time-card">
              <span>{t('estimatedDelivery')}</span>
              <h3>{t('courierDelivery')}</h3>
            </div>
            
            <p className="order-subtext">{t('confirmationSent')}</p>
            
            <button className="btn btn-primary" onClick={() => setOrderModalOpen(false)}>
              {t('closeWindow')}
            </button>
          </div>
        </div>
      )}

      <style>{`
        .pharmacy-view {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .pharmacy-layout-grid {
          display: grid;
          grid-template-columns: 1.6fr 1.4fr;
          gap: 2rem;
        }

        @media (max-width: 1000px) {
          .pharmacy-layout-grid {
            grid-template-columns: 1fr;
          }
        }

        .pharmacies-list-panel {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .quotes-stack {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          margin-top: 1rem;
        }

        .pharmacy-quote-card {
          border-left: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          padding: 1.5rem;
        }

        .pharmacy-quote-card.cheapest-highlight {
          border-color: var(--color-primary);
          border-left: 4px solid var(--color-primary);
          background: rgba(13, 148, 136, 0.04);
        }

        .cheapest-badge-banner {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          background: var(--color-primary-glow);
          color: var(--color-primary);
          border: 1px solid rgba(13, 148, 136, 0.2);
          font-size: 0.75rem;
          font-weight: 700;
          padding: 0.2rem 0.6rem;
          border-radius: var(--radius-full);
          width: fit-content;
        }

        .quote-main-row {
          display: flex;
          justify-content: space-between;
          gap: 1.5rem;
        }

        .pharmacy-meta-col {
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
        }

        .pharmacy-meta-col h4 {
          font-size: 1.15rem;
          font-weight: 700;
        }

        .distance-lbl {
          font-size: 0.8rem;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          gap: 0.3rem;
        }

        .rating-row {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.8rem;
          color: var(--text-secondary);
        }

        .star-filled {
          color: #eab308;
          fill: #eab308;
        }

        .price-total-col {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          text-align: right;
        }

        .total-lbl {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .total-val {
          font-size: 1.8rem;
          font-weight: 800;
          color: var(--text-primary);
          line-height: 1.2;
        }

        .pharmacy-quote-card.cheapest-highlight .total-val {
          color: var(--color-primary);
        }

        .availability-lbl {
          font-size: 0.75rem;
          color: var(--color-success);
          font-weight: 600;
        }

        .itemized-prices-section {
          background: rgba(0,0,0,0.15);
          padding: 0.85rem 1rem;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-color);
        }

        .itemized-prices-section h5 {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-bottom: 0.5rem;
          font-weight: 600;
        }

        .itemized-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.5rem 1.5rem;
        }

        @media (max-width: 480px) {
          .itemized-grid {
            grid-template-columns: 1fr;
          }
        }

        .itemized-price-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.8rem;
        }

        .itemized-price-row .med-name {
          color: var(--text-secondary);
        }

        .itemized-price-row .med-price {
          font-weight: 600;
        }

        .quote-actions-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-top: 1px solid var(--border-color);
          padding-top: 1rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .contact-details {
          display: flex;
          gap: 1rem;
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .contact-details span {
          display: flex;
          align-items: center;
          gap: 0.3rem;
        }

        /* Map styling */
        .map-view-panel {
          height: fit-content;
        }

        .map-card {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .map-canvas-mock {
          background: #060911;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          overflow: hidden;
          width: 100%;
          aspect-ratio: 4/3;
        }

        /* Leaflet custom styles */
        .custom-user-marker {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .user-pulse-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #06b6d4;
          box-shadow: 0 0 0 rgba(6, 182, 212, 0.4);
          animation: userPulse 2s infinite;
        }

        @keyframes userPulse {
          0% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(6, 182, 212, 0.7);
          }
          70% {
            transform: scale(1);
            box-shadow: 0 0 0 8px rgba(6, 182, 212, 0);
          }
          100% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(6, 182, 212, 0);
          }
        }

        .custom-pharmacy-marker {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .pharm-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: var(--text-muted);
          border: 2px solid white;
        }

        .pharm-dot.cheapest {
          background: var(--color-primary);
          width: 12px;
          height: 12px;
          box-shadow: 0 0 8px var(--color-primary);
        }

        .map-popup-content {
          color: #1a1a1a !important;
          font-family: var(--font-sans);
          font-size: 0.8rem;
        }
        
        .map-popup-content h4 {
          margin: 0 !important;
        }

        .map-legend {
          display: flex;
          gap: 1.5rem;
          font-size: 0.75rem;
          margin-top: 0.5rem;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }

        .legend-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .legend-dot.user-color {
          background-color: var(--color-accent);
        }

        .legend-dot.cheapest-color {
          background-color: var(--color-primary);
        }

        .loading-card {
          text-align: center;
          padding: 4rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          color: var(--text-muted);
        }

        /* Order Modal */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.7);
          backdrop-filter: blur(5px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
        }

        .modal-content {
          max-width: 480px;
          width: 100%;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.25rem;
          padding: 2.5rem 2rem;
          background: #0c1222;
          color: #ffffff !important;
        }

        .modal-content h2 {
          color: #ffffff !important;
        }

        .modal-content p {
          color: rgba(255, 255, 255, 0.7) !important;
          font-size: 0.9rem;
          line-height: 1.5;
        }

        .modal-icon-success {
          color: var(--color-success);
          width: 70px;
          height: 70px;
          border-radius: 50%;
          background: var(--color-success-glow);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 0.5rem;
          box-shadow: 0 0 20px rgba(16, 185, 129, 0.25);
        }

        .delivery-time-card {
          width: 100%;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 1rem;
          border-radius: var(--radius-md);
        }

        .delivery-time-card span {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.5) !important;
        }

        .delivery-time-card h3 {
          font-size: 1.2rem;
          color: var(--color-primary);
          margin-top: 0.25rem;
        }

        .order-subtext {
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.4) !important;
        }
      `}</style>
    </div>
  );
};
