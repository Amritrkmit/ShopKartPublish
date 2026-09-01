// Validation utility for forms
export const validateField = (name, value, rules = {}) => {
    if (rules.required && (!value || value.toString().trim() === '')) {
        return `${rules.label || name} is required`;
    }

    if (rules.email && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return 'Please enter a valid email address';
    }

    if (rules.minLength && value && value.length < rules.minLength) {
        return `${rules.label || name} must be at least ${rules.minLength} characters`;
    }

    if (rules.maxLength && value && value.length > rules.maxLength) {
        return `${rules.label || name} must not exceed ${rules.maxLength} characters`;
    }

    if (rules.pattern && value && !rules.pattern.test(value)) {
        return rules.patternMessage || `${rules.label || name} format is invalid`;
    }

    if (rules.min && value && parseFloat(value) < rules.min) {
        return `${rules.label || name} must be at least ${rules.min}`;
    }

    if (rules.max && value && parseFloat(value) > rules.max) {
        return `${rules.label || name} must not exceed ${rules.max}`;
    }

    if (rules.custom && typeof rules.custom === 'function') {
        return rules.custom(value);
    }

    return null;
};

export const validateForm = (formData, validationRules) => {
    const errors = {};

    Object.keys(validationRules).forEach(field => {
        const error = validateField(field, formData[field], validationRules[field]);
        if (error) {
            errors[field] = error;
        }
    });

    return errors;
};
