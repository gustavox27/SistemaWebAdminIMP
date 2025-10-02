import React, { useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import PrintersTable from './components/PrintersTable';
import InventoryTable from './components/InventoryTable';
import OrdersTable from './components/OrdersTable';
import HistoryTable from './components/HistoryTable';
import EmptyTonersTable from './components/EmptyTonersTable';
import TicketsContainer from './components/TicketsContainer';
import ConfigurationContainer from './components/ConfigurationContainer';
import DailyReportContainer from './components/DailyReportContainer';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'printers':
        return <PrintersTable />;
      case 'inventory':
        return <InventoryTable />;
      case 'orders':
        return <OrdersTable />;
      case 'history':
        return <HistoryTable />;
      case 'empty-toners':
        return <EmptyTonersTable />;
      case 'tickets':
        return <TicketsContainer />;
      case 'configuration':
        return <ConfigurationContainer />;
      case 'daily-report':
        return <DailyReportContainer />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderContent()}
    </Layout>
  );
}

export default App;