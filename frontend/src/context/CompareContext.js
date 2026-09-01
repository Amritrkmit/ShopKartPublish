import React, { createContext, useContext, useState, useEffect } from 'react';

const CompareContext = createContext();

export const useCompare = () => {
    const context = useContext(CompareContext);
    if (!context) {
        throw new Error('useCompare must be used within a CompareProvider');
    }
    return context;
};

export const CompareProvider = ({ children }) => {
    const [compareList, setCompareList] = useState([]);

    useEffect(() => {
        const list = JSON.parse(localStorage.getItem('compare_list') || '[]');
        setCompareList(list);

        const handleStorage = (e) => {
            if (e.key === 'compare_list') {
                setCompareList(JSON.parse(e.newValue || '[]'));
            }
        };
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    const toggleCompare = (productId) => {
        const idStr = String(productId);
        setCompareList(prev => {
            const newList = prev.includes(idStr)
                ? prev.filter(id => id !== idStr)
                : [...prev, idStr].slice(0, 4);
            localStorage.setItem('compare_list', JSON.stringify(newList));
            return newList;
        });
    };

    const clearCompare = () => {
        setCompareList([]);
        localStorage.removeItem('compare_list');
    };

    return (
        <CompareContext.Provider value={{ compareList, toggleCompare, clearCompare, setCompareList }}>
            {children}
        </CompareContext.Provider>
    );
};
