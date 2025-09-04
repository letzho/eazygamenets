import React from 'react';
import styles from './TabBar.module.css';

export default function TabBar({ tabs, activeTab, onTabChange }) {
  console.log('TabBar rendering, activeTab:', activeTab, 'tabs:', tabs);
  
  return (
    <nav className={styles.tabBar}>
      {tabs.map(tab => {
        console.log(`Tab ${tab.key}:`, tab);
        console.log(`Tab ${tab.key} icon:`, tab.icon, 'type:', typeof tab.icon);
        
        return (
          <button
            key={tab.key}
            className={activeTab === tab.key ? styles.active : ''}
            onClick={() => {
              console.log('TabBar button clicked:', tab.key);
              onTabChange(tab.key);
            }}
          >
            <span className={styles.icon}>
              {typeof tab.icon === 'string' && tab.icon.startsWith('http') ? (
                <img src={tab.icon} alt={tab.label} />
              ) : typeof tab.icon === 'string' ? (
                tab.icon
              ) : (
                <img src={tab.icon} alt={tab.label} />
              )}
            </span>
            <span className={styles.label}>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
} 
