import React, { useState } from 'react';

interface ControlAccordionProps {
  title: string;
  icon: string;
  badge?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export const ControlAccordion: React.FC<ControlAccordionProps> = ({
  title,
  icon,
  badge,
  defaultOpen = true,
  children,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="control-accordion">
      <div className="accordion-header" onClick={() => setIsOpen(!isOpen)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>{icon}</span>
          <span>{title}</span>
          {badge && <span className="studio-badge" style={{ fontSize: '9px', padding: '1px 5px' }}>{badge}</span>}
        </div>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          {isOpen ? '▲' : '▼'}
        </span>
      </div>
      {isOpen && <div className="accordion-body">{children}</div>}
    </div>
  );
};
