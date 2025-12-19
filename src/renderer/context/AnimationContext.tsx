// src/renderer/context/AnimationContext.tsx
import { createContext, useContext, ReactNode } from 'react';

interface AnimationContextType {
  animationsEnabled: boolean;
}

const AnimationContext = createContext<AnimationContextType>({ animationsEnabled: true });

export const AnimationProvider = ({ 
  children, 
  animationsEnabled 
}: { 
  children: ReactNode; 
  animationsEnabled: boolean;
}) => {
  return (
    <AnimationContext.Provider value={{ animationsEnabled }}>
      {children}
    </AnimationContext.Provider>
  );
};

export const useAnimation = () => useContext(AnimationContext);