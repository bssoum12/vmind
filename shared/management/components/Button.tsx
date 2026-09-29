import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'secondary' | 'primary';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  variant = 'secondary', 
  children, 
  className = '', 
  ...props 
}) => {
  return (
    <button 
      className={`btn ${variant === 'primary' ? 'primary' : ''} ${className}`} 
      {...props}
    >
      {children}
    </button>
  );
};
