import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

import { useAuth } from '../../contexts/AuthContext';
import {
  BouwaPilotAccessState,
  getBouwaPilotAccessState,
} from '../../lib/api';

interface BouwaPilotAccessContextValue {
  state: BouwaPilotAccessState | null;
  loading: boolean;
  unavailable: boolean;
}

const BouwaPilotAccessContext = createContext<BouwaPilotAccessContextValue | undefined>(undefined);

export function BouwaPilotAccessProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<BouwaPilotAccessState | null>(null);
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let current = true;
    setState(null);
    setUnavailable(false);
    if (!user) {
      setLoading(false);
      return () => { current = false; };
    }
    setLoading(true);
    getBouwaPilotAccessState()
      .then((nextState) => { if (current) setState(nextState); })
      .catch(() => { if (current) setUnavailable(true); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [user?.id]);

  return (
    <BouwaPilotAccessContext.Provider value={{ state, loading, unavailable }}>
      {children}
    </BouwaPilotAccessContext.Provider>
  );
}

export function useBouwaPilotAccess(): BouwaPilotAccessContextValue {
  const context = useContext(BouwaPilotAccessContext);
  if (!context) throw new Error('useBouwaPilotAccess must be used within BouwaPilotAccessProvider');
  return context;
}
