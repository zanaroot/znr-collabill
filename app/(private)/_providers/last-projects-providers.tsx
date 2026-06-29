
"use client";

import {
    createContext,
    type ReactNode,
    useContext,
    useMemo,
    useState,
} from "react";

type LastProjectContextType = {
    lastProjectId: string;
    setLastProjectId: (id: string) => void;
};

const LastProjectContext = createContext<LastProjectContextType | undefined>(
    undefined,
);

export function LastProjectProvider({
    children,
}: {
    children: ReactNode;
}) {
    const [lastProjectId, setLastProjectId] = useState("");

    const value = useMemo(
        () => ({
            lastProjectId,
            setLastProjectId,
        }),
        [lastProjectId],
    );

    return (
        <LastProjectContext.Provider value={value}>
            {children}
        </LastProjectContext.Provider>
    );
}

export function useLastProject() {
    const context = useContext(LastProjectContext);

    if (!context) {
        throw new Error(
            "useLastProject must be used inside LastProjectProvider",
        );
    }

    return context;
}

