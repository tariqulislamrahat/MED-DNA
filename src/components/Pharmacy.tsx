import React, { useState, useEffect } from 'react';
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

export const Pharmacy: React.FC = () => {
  const { medicines } = useMed();
  const [loading, setLoading] = useState(false);
  const [pharmacies, setPharmacies] = useState<(PharmacyType & { totalEstimatedPrice: number; availableCount: number })[]>([]);
  const [cheapestId, setCheapestId] = useState('');
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [orderedPharmacy, setOrderedPharmacy] = useState<string>('');

  const medNames = medicines.map(m => m.name);

  useEffect(() => {
    const fetchPharmacyData = async () => {
      if (medNames.length === 0) return;
      setLoading(true);
      try {
        const result = await mockApi.calculatePharmacyComparison(medNames);
        setPharmacies(result.pharmacies);
        setCheapestId(result.cheapestPharmacyId);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPharmacyData();
  }, [medicines]);

  const handlePlaceOrder = (pharmacyName: string) => {
    setOrderedPharmacy(pharmacyName);
    setOrderModalOpen(true);
  };

  return (
    <div className="pharmacy-view animate-fade-in">
      <header className="view-header">
        <h1>Local Pharmacy Price Comparison</h1>
        <p>Compare costs for your active medications across local stores. Highlight the cheapest option and request direct refills.</p>
      </header>

      {medNames.length === 0 ? (
        <div className="glass-card empty-meds-card">
          <ShoppingBag size={48} />
          <h3>No Medications to Compare</h3>
          <p>Please upload a prescription or add medicines to calculate pricing estimations.</p>
        </div>
      ) : loading ? (
        <div className="glass-card loading-card">
          <div className="spinner" />
          <p>Analyzing local catalog prices and calculating totals...</p>
        </div>
      ) : (
        <div className="pharmacy-layout-grid">
          
          {/* Left Side: Pricing List Cards */}
          <div className="pharmacies-list-panel">
            <h3>Nearby Pharmacy Quotes</h3>
            <p className="subtitle-text">Prices calculated for your total set of {medNames.length} active medicines.</p>
            
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
                        <span>CHEAPEST ESTIMATE (SAVE 15%)</span>
                      </div>
                    )}

                    <div className="quote-main-row">
                      <div className="pharmacy-meta-col">
                        <h4>{pharm.name}</h4>
                        <span className="distance-lbl"><MapPin size={12} /> {pharm.distance} miles away</span>
                        <div className="rating-row">
                          <Star size={12} className="star-filled" />
                          <span>{pharm.rating} Rating</span>
                        </div>
                      </div>

                      <div className="price-total-col">
                        <span className="total-lbl">Total Estimated Price</span>
                        <span className="total-val">${pharm.totalEstimatedPrice.toFixed(2)}</span>
                        <span className="availability-lbl">All {pharm.availableCount} items in stock</span>
                      </div>
                    </div>

                    {/* Expandable itemized pricing */}
                    <div className="itemized-prices-section">
                      <h5>Itemized Estimations:</h5>
                      <div className="itemized-grid">
                        {medicines.map(med => {
                          const price = pharm.prices[med.name] || 10.00;
                          return (
                            <div key={med.id} className="itemized-price-row">
                              <span className="med-name">{med.name}</span>
                              <span className="med-price">${price.toFixed(2)}</span>
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
                        Order Refills
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
              <h3>Live Pharmacy Locator Map</h3>
              <p className="card-desc">Visualizing locations relative to your current clinic coordinates.</p>
              
              <div className="map-canvas-mock">
                {/* Custom SVG Map Representation */}
                <svg viewBox="0 0 400 300" className="svg-map">
                  {/* Grid background */}
                  <defs>
                    <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />
                  
                  {/* Roads/streets representation */}
                  <path d="M 50 0 L 50 300 M 200 0 L 200 300 M 350 0 L 350 300 M 0 100 L 400 100 M 0 220 L 400 220" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="8" strokeLinecap="round" />
                  
                  {/* User location pulse */}
                  <circle cx="200" cy="150" r="14" fill="rgba(6, 182, 212, 0.15)" />
                  <circle cx="200" cy="150" r="6" fill="var(--color-accent)" className="user-dot" />
                  
                  {/* Pharmacy Dots */}
                  {/* Pharmacy 1 - MediCare Plus */}
                  <g className="pharm-marker">
                    <circle cx="50" cy="100" r="18" fill="rgba(13, 148, 136, 0.2)" />
                    <circle cx="50" cy="100" r="8" fill="var(--color-primary)" />
                    <text x="70" y="105" fill="var(--text-primary)" fontSize="10" fontWeight="bold">MediCare (0.4m)</text>
                  </g>

                  {/* Pharmacy 2 - Wellness Express */}
                  <g className="pharm-marker">
                    <circle cx="200" cy="220" r="18" fill="rgba(99, 102, 241, 0.2)" />
                    <circle cx="200" cy="220" r="8" fill="var(--color-secondary)" />
                    <text x="220" y="225" fill="var(--text-primary)" fontSize="10" fontWeight="bold">Wellness (1.2m)</text>
                  </g>

                  {/* Pharmacy 3 - CureAll Community */}
                  <g className="pharm-marker">
                    <circle cx="350" cy="80" r="18" fill="rgba(245, 158, 11, 0.2)" />
                    <circle cx="350" cy="80" r="8" fill="var(--color-warning)" />
                    <text x="240" y="85" fill="var(--text-primary)" fontSize="10" fontWeight="bold">CureAll (2.5m)</text>
                  </g>
                </svg>
              </div>

              <div className="map-legend">
                <div className="legend-item"><span className="legend-dot user-color" /><span>Your Location</span></div>
                <div className="legend-item"><span className="legend-dot cheapest-color" /><span>Cheapest Clinic Pharmacy</span></div>
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
            <h2>Refill Order Placed!</h2>
            <p>Your order for <strong>{medNames.join(', ')}</strong> has been successfully transmitted to <strong>{orderedPharmacy}</strong>.</p>
            
            <div className="delivery-time-card">
              <span>Estimated Delivery Window:</span>
              <h3>Within 2 Hours (Courier Delivery)</h3>
            </div>
            
            <p className="order-subtext">A confirmation receipt and tracking link have been dispatched to your email (alex.mercer@gmail.com).</p>
            
            <button className="btn btn-primary" onClick={() => setOrderModalOpen(false)}>
              Close Window
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

        .svg-map {
          width: 100%;
          height: 100%;
        }

        .user-dot {
          animation: pulseGlow 1.5s infinite;
        }

        .pharm-marker {
          cursor: pointer;
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
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-color);
          padding: 1rem;
          border-radius: var(--radius-md);
        }

        .delivery-time-card span {
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        .delivery-time-card h3 {
          font-size: 1.2rem;
          color: var(--color-primary);
          margin-top: 0.25rem;
        }

        .order-subtext {
          font-size: 0.8rem;
          color: var(--text-muted);
        }
      `}</style>
    </div>
  );
};
