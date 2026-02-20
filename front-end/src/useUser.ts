import { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

export default function useUser() {
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [user, setUser] = useState<null | any>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(getAuth(), function(user) {
            setUser(user);
            setIsLoading(false);
        });
        return unsubscribe
    }, []);

    return { isLoading, user };
    
}