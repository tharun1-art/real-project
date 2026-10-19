import { useEffect, useState } from 'react';
import './App.css';

const API_BASE = '/api';
const CURRENCIES = ['USD', 'EUR', 'GBP', 'AUD', 'CAD'];

function App() {
  const [amount, setAmount] = useState('1000');
  const [currency, setCurrency] = useState('USD');
  const [rates, setRates] = useState({});
  const [conversion, setConversion] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ratesError, setRatesError] = useState('');

  async function loadRates() {
    try {
      setRatesError('');

      const response = await fetch(`${API_BASE}/rates`);

      if (!response.ok) {
        throw new Error('Could not load exchange rates.');
      }

      const data = await response.json();
      setRates(data.rates || {});
    } catch {
      setRatesError('Unable to load rates. Please try again.');
    }
  }

  useEffect(() => {
    loadRates();

    // Refresh rates every minute.
    const timer = setInterval(loadRates, 60000);

    return () => clearInterval(timer);
  }, []);

  async function handleConvert(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setConversion(null);

    try {
      const response = await fetch(`${API_BASE}/convert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: Number(amount),
          currency,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Conversion failed.');
      }

      setConversion(data);
    } catch (err) {
      setError(err.message || 'Unable to reach the API.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page">
      <header className="header">
        <div className="brand">
          <span className="brand-icon">₹</span>
          <div>
            <h1>Currency Exchange</h1>
            <p>Simple. Clear. Global.</p>
          </div>
        </div>
        <span className="status">Exchange rates</span>
      </header>

      <section className="hero">
        <p className="eyebrow">YOUR MONEY, IN OTHER CURRENCIES</p>
        <h2>Convert INR with confidence.</h2>
        <p className="hero-description">
          Explore currency conversions and see the available exchange rates.
        </p>
      </section>

      <section className="dashboard">
        <form className="converter card" onSubmit={handleConvert}>
          <div className="section-heading">
            <div>
              <p className="eyebrow">CURRENCY CONVERTER</p>
              <h3>Calculate your amount</h3>
            </div>
          </div>

          <label htmlFor="amount">Amount in Indian Rupees (INR)</label>
          <input
            id="amount"
            type="number"
            min="0.01"
            step="any"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            required
          />

          <label htmlFor="currency">Convert to</label>
          <select
            id="currency"
            value={currency}
            onChange={(event) => setCurrency(event.target.value)}
          >
            {CURRENCIES.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>

          <button type="submit" disabled={loading}>
            {loading ? 'Converting...' : 'Convert currency'}
          </button>

          {error && <p className="error">{error}</p>}

          {conversion && (
            <div className="result" aria-live="polite">
              <p>Converted amount</p>
              <h2>
                {conversion.to}{' '}
                {Number(conversion.convertedAmount).toLocaleString(
                  'en-US',
                  { maximumFractionDigits: 4 }
                )}
              </h2>
              <p>
                ₹{Number(conversion.amount).toLocaleString('en-IN')} at
                ₹{conversion.rate} per {conversion.to}
              </p>
            </div>
          )}

          <p className="disclaimer">
            Demonstration rates only. These are not live market rates.
          </p>
        </form>

        <section className="rates card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">AVAILABLE CURRENCIES</p>
              <h3>Rates against INR</h3>
            </div>
            <button
              className="refresh"
              type="button"
              onClick={loadRates}
              aria-label="Refresh exchange rates"
            >
              ↻
            </button>
          </div>

          {ratesError && <p className="error">{ratesError}</p>}

          {Object.keys(rates).length === 0 && !ratesError && (
            <p>Loading exchange rates...</p>
          )}

          <div className="rate-list">
            {CURRENCIES.map((code) => (
              <div className="rate-row" key={code}>
                <div className="currency-info">
                  <span className="currency-symbol">
                    {code === 'USD' ? '$' :
                     code === 'EUR' ? '€' :
                     code === 'GBP' ? '£' :
                     code === 'AUD' ? 'A$' : 'C$'}
                  </span>
                  <div>
                    <strong>{code}</strong>
                    <p>{code} / INR</p>
                  </div>
                </div>
                <strong>
                  {rates[code] !== undefined
                    ? `₹${rates[code]}`
                    : 'Unavailable'}
                </strong>
              </div>
            ))}
          </div>

          <p className="disclaimer">
            Values show INR required for one unit of the selected currency.
          </p>
        </section>
      </section>

      <footer>
        <p>Currency Exchange Platform · Built for learning and demonstration</p>
      </footer>
    </main>
  );
}

export default App;
