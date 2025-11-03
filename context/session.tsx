import { useRouter } from 'next/router';
import { createContext, useContext, useEffect, useState } from 'react';
import { bigCommerceSDK } from '../scripts/bcSdk';

const SessionContext = createContext({ context: '' });

const SessionProvider = ({ children }) => {
    const { query } = useRouter();
    const [context, setContext] = useState('');

    useEffect(() => {
        console.log('[SessionProvider] Router query changed:', {
            hasContext: !!query.context,
            queryKeys: Object.keys(query)
        });

        if (query.context) {
            const contextStr = query.context.toString();
            console.log('[SessionProvider] Setting context:', contextStr.substring(0, 20) + '...');
            setContext(contextStr);
            // Keeps app in sync with BC (e.g. heatbeat, user logout, etc)
            bigCommerceSDK(query.context);
        } else {
            console.warn('[SessionProvider] No context in query params');
        }
    }, [query.context]);

    console.log('[SessionProvider] Current context state:', context ? 'present' : 'empty');

    return (
        <SessionContext.Provider value={{ context }}>
            {children}
        </SessionContext.Provider>
    );
};

export const useSession = () => useContext(SessionContext);

export default SessionProvider;
