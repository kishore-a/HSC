import React from 'react';

const Footer: React.FC = () => (
  <div style={{
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(107, 114, 128, 0.1)',
    color: '#6b7280',
    fontSize: '0.75rem',
    textAlign: 'center',
    padding: '0.5rem 0',
    zIndex: 1000,
  }}>
    © 2025 HSC/HTS Code Finder | This tool is for reference only
  </div>
);

export default Footer;