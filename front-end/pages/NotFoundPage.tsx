import { Link } from 'react-router-dom';

export default function NotFoundPage() {
    return (
        <div className="not-found-page">
            <h1>Page Not Found</h1>
            <p>The link you followed must be broken or the page no longer exists.</p>
            <Link to="/map">← Back to Home</Link>
        </div>
    )
}