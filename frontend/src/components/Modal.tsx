import React from 'react';

interface ModalProps {
  onClose: () => void;
  children: React.ReactNode;
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

const modalStyle: React.CSSProperties = {
  position: 'relative',
  backgroundColor: '#ffffff',
  padding: '1.5rem',
  borderRadius: '6px',
  maxWidth: '500px',
  width: '90%',
  boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
};

const closeButtonStyle: React.CSSProperties = {
  position: 'absolute',
  top: '0.5rem',
  right: '0.5rem',
  border: 'none',
  background: 'transparent',
  fontSize: '1.5rem',
  cursor: 'pointer',
  lineHeight: 1,
};

const Modal: React.FC<ModalProps> = ({ onClose, children }) => {
  // Prevent background scrolling when modal is open
  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={closeButtonStyle} aria-label="Close">×</button>
        {children}
      </div>
    </div>
  );
};

export default Modal;