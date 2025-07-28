import React, { useState, useEffect } from 'react';
import AdvancedSearch from './AdvancedSearch';
import axios from 'axios';
import * as XLSX from 'xlsx';
// import Modal from './Modal'; // no longer using modal for details
import Footer from './Footer';

const HomePage: React.FC = () => {
  // State to toggle direct advanced search without login
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [query, setQuery] = useState<string>('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  // Excel upload states
  const [fileLoading, setFileLoading] = useState<boolean>(false);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [processedName, setProcessedName] = useState<string>('');
  const [fileError, setFileError] = useState<string | null>(null);
  // Selected country for trade classification code
  const [country, setCountry] = useState<string>('US');
  // Options for country-specific classification codes
  const countryOptions = [
    { code: 'US', label: 'United States (HTS)' },
    { code: 'CA', label: 'Canada (HS)' },
    { code: 'MX', label: 'Mexico (HS)' },
    { code: 'EU', label: 'European Union (TARIC)' },
    { code: 'GB', label: 'United Kingdom (UK Tariff)' },
    { code: 'CN', label: 'China (HS)' },
    { code: 'JP', label: 'Japan (HS)' },
    { code: 'IN', label: 'India (HS)' },
    { code: 'AU', label: 'Australia (HS)' },
    { code: 'BR', label: 'Brazil (NCM)' },
  ];
  // State for inline details view
  // const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [details, setDetails] = useState<any>(null);
  const [showInlineDetails, setShowInlineDetails] = useState<boolean>(false);
  // History of classifications
  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  // Dark/light theme
  const [isDark, setIsDark] = useState<boolean>(false);
  // Theme settings for AdvancedSearch
  const advancedTheme = {
    background: isDark ? '#343541' : '#f7f7f8',
    cardBackground: isDark ? '#444654' : '#ffffff',
    text: isDark ? '#d1d1e0' : '#1c1c1e',
    inputBackground: isDark ? '#40414f' : '#ffffff',
    inputBorder: isDark ? '#40414f' : '#e5e7eb',
    buttonBackground: isDark ? '#10a37f' : '#007aff',
    buttonColor: '#ffffff',
  };
  // Load history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('hscHistory');
      if (stored) setHistory(JSON.parse(stored));
    } catch (e) {
      console.warn('Failed to load history', e);
    }
    // Load theme preference
    try {
      const theme = localStorage.getItem('uiTheme');
      if (theme === 'dark') setIsDark(true);
    } catch {}
  }, []);
  // Persist history and theme to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('hscHistory', JSON.stringify(history));
    } catch (e) {
      console.warn('Failed to save history', e);
    }
    try {
      localStorage.setItem('uiTheme', isDark ? 'dark' : 'light');
    } catch {}
  }, [history, isDark]);
  // Apply theme class to root element
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) root.classList.add('dark'); else root.classList.remove('dark');
  }, [isDark]);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await axios.post('/get-hsc', { description: query, country });
      setResult(res.data);
      // Save classification to history
      const entry = {
        id: res.data.id,
        input: query,
        country,
        code: res.data.code,
        title: res.data.title,
        description: res.data.description,
        category: res.data.category,
        match: res.data.match,
        timestamp: new Date().toISOString(),
      };
      setHistory(prev => [entry, ...prev]);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Search failed');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle Excel file upload and processing
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileLoading(true);
    setFileError(null);
    setProcessedUrl(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      // Include selected country for classification
      formData.append('country', country);
      const res = await axios.post('/upload-excel', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const { filename, rows } = res.data as {
        filename: string;
        rows: Array<{ description: string; hsc_code: string; confidence?: number }>;
      };
      // Read original file
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
      // Add headers
      if (data.length > 0) {
        data[0] = [...data[0], 'HSC Code', 'Confidence'];
      }
      // Fill rows
      for (let i = 1; i < data.length; i++) {
        const rowResult = rows[i - 1] || {};
        data[i] = [
          ...(data[i] || []),
          rowResult.hsc_code || '',
          rowResult.confidence != null ? rowResult.confidence : '',
        ];
      }
      // Replace sheet and write new workbook
      const newSheet = XLSX.utils.aoa_to_sheet(data);
      workbook.Sheets[sheetName] = newSheet;
      const out = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([out], { type: 'application/octet-stream' });
      const blobUrl = URL.createObjectURL(blob);
      setProcessedName(`processed_${filename}`);
      setProcessedUrl(blobUrl);
    } catch (err: any) {
      console.error('Error processing Excel file', err);
      setFileError(err.response?.data?.detail || 'Failed to process Excel file');
    } finally {
      setFileLoading(false);
      // reset input
      if (e.target) e.target.value = '';
    }
  };

  // Render Advanced Search view directly without login
  if (showAdvancedSearch) {
    return <AdvancedSearch theme={advancedTheme} />;
  }
  return (
    <>
      <header style={{ width: '100%', padding: '0 2rem', backgroundColor: 'var(--header-bg)', color: 'var(--header-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '4rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem', fontWeight: 600 }}>
          📑
          <span>HSC/HTS Code Finder</span>
        </div>
        <nav style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.875rem' }}>
          <a href="/" style={{ color: 'var(--header-color)', textDecoration: 'none' }}>Home</a>
          <a href="/about" style={{ color: 'var(--header-color)', textDecoration: 'none' }}>About</a>
          <a href="/help" style={{ color: 'var(--header-color)', textDecoration: 'none' }}>Help</a>
          {/* Theme toggle */}
          <button onClick={() => setIsDark(!isDark)} style={{ background: 'none', border: 'none', color: 'var(--header-color)', cursor: 'pointer', fontSize: '0.875rem' }}>
            {isDark ? 'Light Mode' : 'Dark Mode'}
          </button>
          <button onClick={() => setShowAdvancedSearch(true)} style={{ display: 'flex', alignItems: 'center',  backgroundColor: '#3b82f6', border: 'none', borderRadius: '6px', padding: '0.5rem 1rem', color: '#ffffff', cursor: 'pointer', fontSize: '0.875rem' }}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="1rem" height="1rem">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
            </svg>
            Advanced Search
          </button>
        </nav>
      </header>
      {/* Side History Tab/Drawer */}
      {!showHistory && (
        <div onClick={() => setShowHistory(true)} style={{
          position: 'fixed',
          top: '50%',
          left: 0,
          transform: 'translateY(-50%)',
          backgroundColor: 'var(--header-bg)',
          color: 'var(--header-color)',
          padding: '0.5rem 1rem',
          borderTopRightRadius: '6px',
          borderBottomRightRadius: '6px',
          cursor: 'pointer',
          zIndex: 1000,
        }}>
          History
        </div>
      )}
      {showHistory && (
        <div style={{
          position: 'fixed',
          top: '4rem',
          left: 0,
          bottom: 0,
          width: '20rem',
          backgroundColor: 'var(--card-bg)',
          color: 'var(--card-text)',
          boxShadow: '2px 0 5px rgba(0,0,0,0.1)',
          zIndex: 1000,
          overflowY: 'auto',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 1rem', borderBottom: '1px solid var(--header-bg)' }}>
            <h3 style={{ margin: 0 }}>History</h3>
            <button onClick={() => setShowHistory(false)} style={{ background: 'none', border: 'none', color: 'var(--header-color)', fontSize: '1.25rem', cursor: 'pointer' }}>×</button>
          </div>
          {history.length === 0 ? (
            <p style={{ padding: '1rem' }}>No history available.</p>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {history.map((h, idx) => (
                <li key={h.id || idx} onClick={() => { setResult(h); setShowHistory(false); }} style={{ padding: '0.75rem 1rem', borderBottom: idx !== history.length - 1 ? '1px solid var(--header-bg)' : 'none', cursor: 'pointer' }}>
                  <div style={{ fontSize: '1rem', fontWeight: 500 }}>{h.code}</div>
                  <div style={{ fontSize: '0.875rem' }}>{h.input}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--card-text)' }}>{new Date(h.timestamp).toLocaleString()}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <main style={{
        flex: 1,
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        // minHeight: 'calc(100vh - 4rem)',
        padding: '1rem 2rem',
        background: 'var(--main-bg)',
        color: 'var(--main-text)',
        fontFamily: "'Inter', sans-serif",
      }}>
        <h2 style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold', color: '#111827' }}>Find the Right HSC/HTS Code</h2>
        <p style={{ width: '100%', margin: '1rem 0 1.5rem', fontSize: '0.875rem', color: '#6b7280', textAlign: 'center' }}>
          Enter a detailed product description to find the correct Harmonized System Code or Harmonized Tariff Schedule code for your international trade needs.
        </p>
        {/* Country selector */}
        <div style={{ width: '100%', maxWidth: '40rem', margin: '0 auto 1rem', textAlign: 'right' }}>
          <select
            value={country}
            onChange={e => setCountry(e.target.value)}
            style={{ padding: '0.5rem', fontSize: '0.875rem', borderRadius: '4px', border: '1px solid #d1d5db' }}
          >
            {countryOptions.map(opt => (
              <option key={opt.code} value={opt.code}>{opt.label}</option>
            ))}
          </select>
        </div>
        {/* Search bar with button on right */}
        {/* Search bar with button on right */}
        <div style={{ display: 'flex', alignItems: 'center', width: '100%', maxWidth: '40rem', margin: '0 auto', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderRadius: '6px', overflow: 'hidden', background: '#ffffff' }}>
          <div style={{ position: 'relative', flex: 1, display: 'flex' }}>
            <div style={{ position: 'absolute', top: '50%', left: '1rem', transform: 'translateY(-50%)', color: '#6b7280' }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="1rem" height="1rem">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Enter detailed product description..."
              style={{
                flex: 1,
                padding: '0.75rem 1rem 0.75rem 2.5rem',
                border: 'none',
                outline: 'none',
                fontSize: '0.875rem',
                background: '#ffffff',
                borderRight: '1px solid #d1d5db'
              }}
            />
          </div>
          <button
            onClick={handleSearch}
            style={{ backgroundColor: '#3b82f6', color: '#ffffff', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500, padding: '0.75rem 1rem', height: '100%',marginLeft:'1rem' }}
          >
            Search
          </button>
        </div>
        <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', color: '#6b7280', fontSize: '0.875rem', gap: '0.5rem' }}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="1rem" height="1rem" style={{ color: '#3b82f6' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span>Try: &quot;portable laptop computer&quot;, &quot;wireless headphones&quot;, &quot;athletic shoes&quot;</span>
        </div>
      {/* Excel Bulk Upload */}
      <div style={{ width: '100%', maxWidth: '40rem', margin: '1rem auto', display: 'flex', justifyContent: 'flex-end' }}>
        <label style={{ backgroundColor: '#3b82f6', color: '#ffffff', border: 'none', padding: '0.75rem 1rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}>
          Upload Excel
          <input type="file" accept=".xlsx" onChange={handleFileUpload} style={{ display: 'none' }} />
        </label>
      </div>
      <div style={{ position: 'relative', marginTop: '0.5rem', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {loading && <div style={{ color: '#6b7280' }}>Loading...</div>}
          {error && <div style={{ color: 'red' }}>{error}</div>}
        {result && (
          <div style={{
            width: '100%',
            maxWidth: '40rem',
            backgroundColor: 'var(--card-bg)',
            borderRadius: '8px',
            padding: '1rem',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          }}>
            {/* Top: category & match */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '9999px',
                padding: '0.25rem 0.75rem',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: '#1f2937',
              }}>
                {result.category}
              </div>
              <div style={{
                backgroundColor: '#10b981',
                borderRadius: '4px',
                padding: '0.25rem 0.75rem',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: '#ffffff',
              }}>
                {result.match}% Match
              </div>
            </div>
            {/* Code */}
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#2563eb', marginBottom: '0.5rem' }}>
              {result.code}
            </div>
            {/* Title & description */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '1rem', fontWeight: 600, color: '#111827', marginBottom: '0.25rem' }}>
                {result.title}
              </div>
              <div style={{
                fontSize: '0.875rem',
                color: '#4b5563',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}>
                {result.description}
              </div>
            </div>
            {/* Footer: view details & section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                onClick={() => { setDetails(result); setShowInlineDetails(!showInlineDetails); }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '4px',
                  padding: '0.5rem 1rem',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#1f2937',
                  cursor: 'pointer',
                }}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="1rem" height="1rem" style={{ color: '#6b7280' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 110-16 8 8 0 010 16z" />
                </svg>
                View Details
              </button>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                Section {result.code.split('.')[0]}
              </div>
            </div>
          </div>
        )}
{showInlineDetails && details && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: isDark ? 'rgba(17,24,39,0.95)' : 'rgba(255,255,255,0.95)',
                /* Allow page scroll; remove internal overlay scrolling */
                overflowY: 'visible',
                zIndex: 10,
              }}>
                {/* Details Card Inline */}
                <div style={{
                  position: 'relative',
                  backgroundColor: 'var(--card-bg)',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  /* fixed width and center card */
                  width: '90%',
                  maxWidth: '40rem',
                  margin: '4rem auto',
                }}>
                  {/* Close button inside card */}
                  <button onClick={() => setShowInlineDetails(false)} style={{
                    position: 'absolute',
                    top: '0.5rem',
                    right: '0.5rem',
                    border: 'none',
                    background: 'transparent',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    color: '#6b7280',
                    zIndex: 1,
                  }}>×</button>
                  {/* Header */}
                  <div style={{
                    backgroundColor: 'var(--card-bg)',
                    padding: '1rem 1.5rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#6b7280' }}>HSC/HTS Code</span>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="1rem" height="1rem" style={{ color: '#6b7280' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 110-16 8 8 0 010 16z" />
                      </svg>
                    </div>
                    <div style={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '9999px',
                      padding: '0.25rem 0.75rem',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      color: '#1f2937',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    }}>
                      {details.category}
                    </div>
                  </div>
                  {/* Code */}
                  <div style={{ padding: '0 1.5rem', fontSize: '2rem', fontWeight: 700, color: '#2563eb', lineHeight: 1.2 }}>
                    {details.code}
                  </div>
                  {/* Body */}
                  <div style={{ padding: '1rem 1.5rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: '#111827' }}>{details.title}</h3>
                    <p style={{ margin: '0.75rem 0 1rem', fontSize: '1rem', color: '#4b5563' }}>{details.description}</p>
                    <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb' }} />
                    {/* Match Confidence */}
                    <div style={{ marginTop: '1.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '1rem', fontWeight: 500, color: '#111827' }}>Match Confidence</span>
                        <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Based on AI analysis</span>
                      </div>
                      <div style={{ position: 'relative', height: '0.5rem', backgroundColor: '#e5e7eb', borderRadius: '9999px', overflow: 'hidden', marginTop: '0.5rem' }}>
                        <div style={{ width: `${details.match}%`, height: '100%', backgroundColor: '#3b82f6' }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
                        <span>Low confidence</span>
                        <span style={{ fontWeight: 600, color: '#111827' }}>{details.match}%</span>
                        <span>High confidence</span>
                      </div>
                    </div>
                    {/* Additional Information */}
                    <div style={{ marginTop: '1.5rem', backgroundColor: '#ffffff', borderRadius: '6px', padding: '1rem' }}>
                      <div style={{ fontSize: '1rem', fontWeight: 600, color: '#111827' }}>Additional Information</div>
                      <p style={{ margin: '0.5rem 0 1rem', fontSize: '1rem', color: '#4b5563' }}>This code is used for classifying goods in international trade. It follows the Harmonized System maintained by the World Customs Organization.</p>
                      <a href="https://www.wcotradetools.org/en/harmonized-system" target="_blank" rel="noopener noreferrer" style={{ fontSize: '1rem', color: '#3b82f6', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="1rem" height="1rem">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 3h7m0 0v7m0-7L10 14m0 0v7h7" />
                        </svg>
                        View WCO official classification
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}
          
          {/* File processing results */}
          {fileLoading && <div style={{ color: '#6b7280' }}>Processing file...</div>}
          {fileError && <div style={{ color: 'red' }}>{fileError}</div>}
          {processedUrl && (
            <div style={{ marginTop: '1rem' }}>
              <a
                href={processedUrl}
                download={processedName}
                style={{ textDecoration: 'underline', color: '#007aff' }}
              >
                Download {processedName}
              </a>
            </div>
          )}
        </div>
      </main>
      {/* Search results */}

      {/* Inline details shown above, modal removed */}
      <Footer />
    </>
  );
};

export default HomePage;