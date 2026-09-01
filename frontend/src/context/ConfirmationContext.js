import React, { createContext, useContext, useState, useCallback } from 'react';
import ConfirmationModal from '../components/ConfirmationModal';

const ConfirmationContext = createContext();

export const useConfirmation = () => {
    const context = useContext(ConfirmationContext);
    if (!context) {
        throw new Error('useConfirmation must be used within a ConfirmationProvider');
    }
    return context;
};

export const ConfirmationProvider = ({ children }) => {
    const [modalState, setModalState] = useState({
        isOpen: false,
        title: '',
        message: '',
        confirmText: '',
        cancelText: '',
        isDelete: true,
        onConfirm: null,
        onClose: null,
    });

    const confirm = useCallback(({
        title = "Are you sure?",
        message = "This action cannot be undone.",
        confirmText = "Confirm",
        cancelText = "Cancel",
        isDelete = true,
        onConfirm,
        onCancel,
    }) => {
        setModalState({
            isOpen: true,
            title,
            message,
            confirmText,
            cancelText,
            isDelete,
            onConfirm: () => {
                if (onConfirm) onConfirm();
                setModalState(prev => ({ ...prev, isOpen: false }));
            },
            onClose: () => {
                if (onCancel) onCancel();
                setModalState(prev => ({ ...prev, isOpen: false }));
            },
        });
    }, []);

    return (
        <ConfirmationContext.Provider value={{ confirm }}>
            {children}
            <ConfirmationModal
                isOpen={modalState.isOpen}
                onClose={modalState.onClose}
                onConfirm={modalState.onConfirm}
                title={modalState.title}
                message={modalState.message}
                confirmText={modalState.confirmText}
                cancelText={modalState.cancelText}
                isDelete={modalState.isDelete}
            />
        </ConfirmationContext.Provider>
    );
};
