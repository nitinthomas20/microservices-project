import React from "react";
import '../App.css';  // For styling the card (optional)

const ServiceCard = ({ title, description }) => {
    const handleLearnMore = (title) => {
        // Redirect to the other React app on localhost:3002
        alert(String(title))
        if (String(title) =="Tour Booking"){
        window.location.href = `http://localhost:3002/`;}
        else if (String(title) =="Events"){
            window.location.href = `http://localhost:3000/`;
        }
        else{
            window.location.href=`http://127.0.0.1:5501/service_project/Frontend/index.html`
        }

      };
  return (
    
    <div className="card">
      <h3>{title}</h3>
      <p>{description}</p>
      <button onClick={() => handleLearnMore(title)}>Learn More</button>
    </div>
  );
};

export default ServiceCard;
