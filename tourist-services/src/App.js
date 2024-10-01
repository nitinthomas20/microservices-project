import React from 'react';
import './App.css';
import ServiceCard from './components/ServiceCard';

function App() {
  return (
    <div className="App">
      <header>
        <h1>Tourist Services</h1>
      </header>
      <div className="card-container">
        <ServiceCard 
          title="Tour Booking" 
          description="Book tours to explore exciting destinations." 
        />
        <ServiceCard 
          title="Ticket Booking" 
          description="Book tickets for transportation or local attractions." 
        />
        <ServiceCard 
          title="Events" 
          description="Get notified about upcoming events." 
        />
      </div>
    </div>
  );
}

export default App;
