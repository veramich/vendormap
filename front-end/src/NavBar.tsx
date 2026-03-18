import { Link } from 'react-router-dom';

export default function NavBar() {
    return (
        <nav>
            <ul>
                <li><Link to="/map">Map</Link></li>
                <li><Link to="/businesses">List</Link></li>
                <li><Link to="/add-business">Add Business</Link></li>
                <li><Link to="/profile">Profile</Link></li>
            </ul>
        </nav>
    )
}