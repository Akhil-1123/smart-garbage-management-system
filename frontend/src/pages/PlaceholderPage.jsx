import React from 'react';
import { Construction } from 'lucide-react';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';

const PlaceholderPage = ({ title = 'Under Construction', message = 'This feature will be fully enabled in the next phase.' }) => {
  return (
    <div>
      <Card style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
        <EmptyState
          icon={<Construction size={54} color="var(--primary)" />}
          title={title}
          message={message}
        />
      </Card>
    </div>
  );
};

export default PlaceholderPage;
