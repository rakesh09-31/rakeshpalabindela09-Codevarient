import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  hoverable = false,
  ...props
}) => {
  return (
    <div
      className={`bg-white rounded-2xl border border-stone-200/80 shadow-xs ${
        hoverable ? 'hover:shadow-md hover:border-emerald-300 transition-all duration-200 cursor-pointer' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
