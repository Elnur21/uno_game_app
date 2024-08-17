import React, {ReactNode, createContext, useContext, useState} from 'react';
import {User as UserProps} from '../../types/types';
import UserContextType from './types';

interface Props {
  children: ReactNode;
}

export const User = createContext<UserContextType | any>(undefined);

export const UserProvider = ({children}: Props) => {
  const [isSigned, setIsSigned] = useState<boolean>(true);
  const [user, setUser] = useState<UserProps>();

  const contextValue = {
    isSigned,
    setIsSigned,
    user,
    setUser,
  };

  return <User.Provider value={contextValue}>{children}</User.Provider>;
};

export const useUserContext = (): UserContextType => {
  const context = useContext(User);

  if (context === null) {
    throw new Error('useUserContext must be used within a UserProvider');
  }

  return context;
};
