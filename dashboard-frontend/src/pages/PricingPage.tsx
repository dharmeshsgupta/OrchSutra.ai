import React from 'react';
import Navbar from '../components/Navbar';
import '../styles/PricingPage.css';

type PlanKey = 'free' | 'payg' | 'enterprise';

interface FeatureRow {
  feature: string;
  free: string;
  payg: string;
  enterprise: string;
}

const featureRows: FeatureRow[] = [
  { feature: 'Platform Fee', free: 'N/A', payg: '5.5%', enterprise: 'Custom discount' },
  { feature: 'Models', free: '24+ free models', payg: '300+ models', enterprise: '300+ models' },
  { feature: 'Providers', free: '4+ providers', payg: '40+ providers', enterprise: '40+ providers' },
  { feature: 'Chat and API Access', free: 'Included', payg: 'Included', enterprise: 'Included' },
  { feature: 'Activity Logs and Export', free: 'Included', payg: 'Included', enterprise: 'Included' },
  { feature: 'Auto Routing', free: 'Basic', payg: 'Advanced', enterprise: 'Advanced' },
  { feature: 'Budgets and Spend Controls', free: 'No', payg: 'Yes', enterprise: 'Yes' },
  { feature: 'Prompt Caching', free: 'No', payg: 'Yes', enterprise: 'Yes' },
  { feature: 'Management API Key', free: 'No', payg: 'Yes', enterprise: 'Yes' },
  { feature: 'Data Privacy Routed', free: 'No', payg: 'No', enterprise: 'Yes' },
  { feature: 'Rate Limits', free: '50 req/day', payg: 'High global limits', enterprise: 'Dedicated limits' },
  { feature: 'Token Pricing', free: 'Free models only', payg: 'No minimum spend', enterprise: 'Volume pricing' },
  { feature: 'Support', free: 'Community', payg: 'Email support', enterprise: 'SLA support' },
];

const planBadge = (value: string) => {
  if (value === 'Included' || value === 'Yes' || value === 'Advanced') {
    return <span className="pricing-pill ok">{value}</span>;
  }
  if (value === 'No') {
    return <span className="pricing-pill no">{value}</span>;
  }
  if (value === 'Basic') {
    return <span className="pricing-pill basic">{value}</span>;
  }
  return <span>{value}</span>;
};

const PricingPage: React.FC = () => {
  const [selectedPlan, setSelectedPlan] = React.useState<PlanKey>('payg');

  return (
    <div className="pricing-page">
      <Navbar />
      <main className="pricing-wrap">
        <header className="pricing-header">
          <p className="pricing-kicker">Pricing</p>
          <h1>Plans for indie hackers, startups, and enterprises</h1>
          <p>Compare platform features and choose the right plan for your workload.</p>
        </header>

        <div className="pricing-plan-toggle" role="tablist" aria-label="Select plan">
          <button
            className={selectedPlan === 'free' ? 'active' : ''}
            onClick={() => setSelectedPlan('free')}
          >
            Free
          </button>
          <button
            className={selectedPlan === 'payg' ? 'active' : ''}
            onClick={() => setSelectedPlan('payg')}
          >
            Pay as you go
          </button>
          <button
            className={selectedPlan === 'enterprise' ? 'active' : ''}
            onClick={() => setSelectedPlan('enterprise')}
          >
            Enterprise
          </button>
        </div>

        <section className="pricing-table-wrap" aria-label="Pricing comparison table">
          <table className="pricing-table">
            <thead>
              <tr>
                <th>Feature</th>
                <th className={selectedPlan === 'free' ? 'selected' : ''}>Free</th>
                <th className={selectedPlan === 'payg' ? 'selected' : ''}>Pay as you go</th>
                <th className={selectedPlan === 'enterprise' ? 'selected' : ''}>Enterprise</th>
              </tr>
            </thead>
            <tbody>
              {featureRows.map((row) => (
                <tr key={row.feature}>
                  <td className="feature-col">{row.feature}</td>
                  <td className={selectedPlan === 'free' ? 'selected' : ''}>{planBadge(row.free)}</td>
                  <td className={selectedPlan === 'payg' ? 'selected' : ''}>{planBadge(row.payg)}</td>
                  <td className={selectedPlan === 'enterprise' ? 'selected' : ''}>{planBadge(row.enterprise)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <div className="pricing-cta-row">
          <button className="pricing-btn ghost">Get Started For Free</button>
          <button className="pricing-btn solid">Buy Credits</button>
          <button className="pricing-btn ghost">Contact Sales</button>
        </div>
      </main>
    </div>
  );
};

export default PricingPage;
