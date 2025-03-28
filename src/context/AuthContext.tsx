
import React, { createContext, useContext, useState, useEffect } from 'react';
import { saveToStorage, getFromStorage, removeFromStorage, storageKeys } from '@/utils/localStorage';

interface User {
  name: string;
  sheetsUrl: string;
  uid?: string; // Adding optional uid property to the User interface
  id?: string;  // Adding optional id property to the User interface
}

// Define what user properties can be updated
interface UserProfileUpdate {
  name?: string;
  sheetsUrl?: string;
}

interface AuthContextType {
  user: User | null;
  login: (userData: User) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  updateUserProfile: (updates: UserProfileUpdate) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load saved user data on mount
  useEffect(() => {
    const savedUser = getFromStorage<User | null>(storageKeys.AUTH_USER, null);
    if (savedUser) {
      setUser(savedUser);
    }
    setIsInitialized(true);
  }, []);

  const login = async (userData: User): Promise<void> => {
    // In a real application, you would validate credentials here
    setUser(userData);
    saveToStorage(storageKeys.AUTH_USER, userData);
  };

  const logout = () => {
    setUser(null);
    removeFromStorage(storageKeys.AUTH_USER);
  };

  const updateUserProfile = async (updates: UserProfileUpdate): Promise<void> => {
    if (!user) {
      throw new Error('No user logged in');
    }

    // Update the user object with the new values
    const updatedUser = {
      ...user,
      ...updates
    };

    // Update state and storage
    setUser(updatedUser);
    saveToStorage(storageKeys.AUTH_USER, updatedUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated: !!user,
        updateUserProfile,
      }}
    >
      {isInitialized ? children : <div>Loading...</div>}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
