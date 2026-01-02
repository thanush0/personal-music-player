/**
 * Local Player Context - Stores non-serializable player service instance
 * Separated from Redux to avoid non-serializable state warnings
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { localPlayerService } from '../services/localPlayer';

interface LocalPlayerContextType {
  playerService: typeof localPlayerService;
}

const LocalPlayerContext = createContext<LocalPlayerContextType | null>(null);

export const LocalPlayerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <LocalPlayerContext.Provider value={{ playerService: localPlayerService }}>
      {children}
    </LocalPlayerContext.Provider>
  );
};

export const useLocalPlayer = (): LocalPlayerContextType => {
  const context = useContext(LocalPlayerContext);
  if (!context) {
    throw new Error('useLocalPlayer must be used within LocalPlayerProvider');
  }
  return context;
};
