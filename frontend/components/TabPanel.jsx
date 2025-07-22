"use client";
import { useState } from 'react';

export default function TabPanel({ tabs, defaultTab }) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  return (
    <div className="tab-panel">
      {/* Tab Navigation */}
      <div style={{ 
        display: 'flex', 
        borderBottom: '1px solid #eee', 
        marginBottom: '20px',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none', // Firefox
        msOverflowStyle: 'none', // IE/Edge
      }}>
        {tabs.map((tab, idx) => (
          <div 
            key={tab.id + '-' + idx}
            onClick={() => setActiveTab(tab.id)}
            style={{ 
              padding: '10px 20px', 
              cursor: 'pointer',
              borderBottom: activeTab === tab.id ? '2px solid var(--primary)' : 'none',
              fontWeight: activeTab === tab.id ? 'bold' : 'normal',
              color: activeTab === tab.id ? 'var(--primary)' : 'inherit',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: activeTab === tab.id ? 'var(--primary)' : '#e5e5ea',
                color: activeTab === tab.id ? 'white' : '#666',
                borderRadius: '12px',
                fontSize: '0.75rem',
                padding: '2px 8px',
                minWidth: '20px',
                height: '20px',
                fontWeight: 'normal'
              }}>
                {tab.count}
              </span>
            )}
          </div>
        ))}
      </div>
      
      {/* Tab Content */}
      <div className="tab-content">
        {tabs.find(tab => tab.id === activeTab)?.content}
      </div>
    </div>
  );
}