import React from 'react';
import { PackageOpen } from 'lucide-react';

const EmptyState = ({
  icon = <PackageOpen size={48} strokeWidth={1.5} />,
  title = 'No items found',
  message = 'There is nothing to display here yet.',
  action = null
}) => {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <h4>{title}</h4>
      <p>{message}</p>
      {action && <div style={{ marginTop: '1.25rem' }}>{action}</div>}
    </div>
  );
};

export default EmptyState;
