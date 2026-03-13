import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { getAuth, signOut } from 'firebase/auth';
import useUser from './useUser';



export default function Header() {
    const { user } = useUser();
    const navigate = useNavigate();
    return (
        <>
        <header className="app-header">
            <div className="header-left">
            </div>
            <div className="header-center">
                <Link to="/">
                    <img src="/logo-transparent.png" alt="VendorMap" className="header-logo" />
                </Link>
            </div>
            <div className="header-right">
                {user 
                    ? <button onClick = {() => signOut(getAuth())}>Sign Out</button>
                    : <button onClick = {() => navigate('/login')}>Sign In</button>
                } 
            </div>
        </header>
        </>
    )
}