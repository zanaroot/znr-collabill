"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

type AmountsVisibilityContextType = {
  hidden: boolean;
  toggleHidden: () => void;
};

const AmountsVisibilityContext = createContext<AmountsVisibilityContextType>({
  hidden: true,
  toggleHidden: () => { },
});

export const AmountsVisibilityProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [hidden, setHidden] = useState(true);

  const toggleHidden = useCallback(() => {
    setHidden((prev) => !prev);
  }, []);

  const value = useMemo(
    () => ({ hidden, toggleHidden }),
    [hidden, toggleHidden],
  );

  return (
    <AmountsVisibilityContext.Provider value={value}>
      {children}
    </AmountsVisibilityContext.Provider>
  );
};

export const useAmountsVisibility = () => useContext(AmountsVisibilityContext);
