import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
  clickable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  hoverable = false,
  clickable = false,
  ...props
}) => {
  const isInteractive = hoverable || clickable;

  return (
    <div
      className={`card ${
        isInteractive ? 'card-clickable' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
