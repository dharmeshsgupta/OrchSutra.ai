import React, { useState } from 'react';
import { PaymentsService } from '../services/paymentsService';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import '../styles/Payments.css';

interface PaymentsPageProps {
  currentCredits?: number;
  onCreditsUpdated?: (credits: number) => void;
}

const PaymentsPage: React.FC<PaymentsPageProps> = ({ 
  currentCredits = 0, 
  onCreditsUpdated 
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [credits, setCredits] = useState(currentCredits);

  const handleOnramp = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      
      const response = await PaymentsService.onramp();
      setCredits(response.credits);
      setSuccess(`Successfully added 1000 credits! Total: ${response.credits}`);
      
      if (onCreditsUpdated) {
        onCreditsUpdated(response.credits);
      }
    } catch (err) {
      setError('Failed to process onramp. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <Navbar />
    <div className="payments-container">
      <div className="payments-header">
        <h1>Billing & Credits</h1>
        <p className="subtitle">Manage your account credits and billing</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="credits-section">
        <div className="credits-card">
          <h2>Your Credits</h2>
          <div className="credits-display">
            <span className="credits-amount">{credits.toLocaleString()}</span>
            <span className="credits-label">Available Credits</span>
          </div>
          <p className="credits-info">
            Credits are used to make API calls. Each request consumes credits based on token usage.
          </p>
          <button
            className="btn btn-primary btn-large"
            onClick={handleOnramp}
            disabled={loading}
          >
            {loading ? 'Processing...' : 'Add 1,000 Credits'}
          </button>
        </div>

        <div className="pricing-info">
          <h3>Pricing Information</h3>
          <div className="pricing-table">
            <div className="pricing-row header">
              <div className="pricing-col">Model</div>
              <div className="pricing-col">Input Cost</div>
              <div className="pricing-col">Output Cost</div>
            </div>
            <div className="pricing-row">
              <div className="pricing-col">Premium Model</div>
              <div className="pricing-col">$0.0001/token</div>
              <div className="pricing-col">$0.0003/token</div>
            </div>
            <div className="pricing-row">
              <div className="pricing-col">Standard Model</div>
              <div className="pricing-col">$0.00005/token</div>
              <div className="pricing-col">$0.00015/token</div>
            </div>
            <div className="pricing-row">
              <div className="pricing-col">Budget Model</div>
              <div className="pricing-col">$0.00001/token</div>
              <div className="pricing-col">$0.00003/token</div>
            </div>
          </div>
        </div>
      </div>

      <div className="usage-section">
        <h3>Recent Transactions</h3>
        <p style={{ color: '#666', marginTop: '1rem' }}>
          Transaction history will be displayed here
        </p>
      </div>
    </div>
    <Footer />
    </>
  );
};

export default PaymentsPage;
