import { useEffect } from 'react';
import {Link} from 'react-router-dom';

export default function LandingPage() {
  useEffect(() => {
    fetch('https://vendormaps.onrender.com/health')
      .catch(() => {});
  }, []);

  return (
    <div className="landing-page"> 
      <div className="landing-hero">
        <h1>Welcome to Vendor Maps</h1>
        <p>FIND LOCAL VENDORS</p>

      </div>
      <p className="landing-actions-label">What would you like to do today</p>
      <ul className="landing-actions">
        <li className="landing-action-item">
          <Link to="/add-business">
            <h2>ADD</h2>
            <h3>Add a Business</h3>
          </Link>
        </li>
        <li className="landing-action-item">
          <Link to="/businesses">
            <h2>SEARCH</h2>
            <h3>Search for Vendors</h3>
          </Link>
        </li>
        <li className="landing-action-item">
          <Link to="/map">
            <h2>EXPLORE</h2>
            <h3>Explore the Map</h3>
          </Link>
        </li>
      </ul>
    </div>
  );
}