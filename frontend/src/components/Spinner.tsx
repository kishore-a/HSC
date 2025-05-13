import React from 'react';
import './Spinner.css';

interface SpinnerProps {
  size?: number;
  color?: string;
}

const Spinner: React.FC<SpinnerProps> = ({
  size = 16,
  color = '#fff'
}) => {
  const borderWidth = size / 8;

  return (
    <div
      className="spinner"
      style={{
        width: size,
        height: size,
        borderWidth,
        borderTopColor: color,
        borderRightColor: 'transparent',
        borderBottomColor: 'transparent',
        borderLeftColor: 'transparent'
      }}
      aria-label="loading"
    />
  );
};

export default Spinner;