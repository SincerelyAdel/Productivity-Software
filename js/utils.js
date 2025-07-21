// Utility functions

/**
 * Format date for display
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date string
 */
function formatDate(date) {
    if (typeof date === 'string') {
        date = new Date(date);
    }
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString(undefined, options);
}

/**
 * Get day name from date
 * @param {Date} date - Date object
 * @returns {string} Short day name (e.g., 'Mon', 'Tue')
 */
function getDayName(date) {
    const options = { weekday: 'short' };
    return date.toLocaleDateString(undefined, options);
}

/**
 * Get relative time string
 * @param {Date|string} date - Date to compare
 * @returns {string} Relative time string
 */
function getRelativeTime(date) {
    if (typeof date === 'string') {
        date = new Date(date);
    }
    
    const now = new Date();
    const diff = now - date;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
}

/**
 * Generate initials from name
 * @param {string} name - Full name
 * @returns {string} Initials (max 2 characters)
 */
function getInitials(name) {
    return name
        .split(' ')
        .map(word => word.charAt(0).toUpperCase())
        .slice(0, 2)
        .join('');
}

/**
 * Generate random color
 * @returns {string} Hex color code
 */
function generateRandomColor() {
    const colors = [
        '#4a6fa5', '#e74c3c', '#2ecc71', '#f39c12', 
        '#9b59b6', '#1abc9c', '#e67e22', '#34495e',
        '#f1c40f', '#e91e63', '#3f51b5', '#00bcd4'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * Debounce function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle function
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Deep clone an object
 * @param {Object} obj - Object to clone
 * @returns {Object} Cloned object
 */
function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => deepClone(item));
    if (typeof obj === 'object') {
        const clonedObj = {};
        for (let key in obj) {
            if (obj.hasOwnProperty(key)) {
                clonedObj[key] = deepClone(obj[key]);
            }
        }
        return clonedObj;
    }
}

/**
 * Convert status to display format
 * @param {string} status - Status string
 * @returns {string} Formatted status
 */
function formatStatus(status) {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Get status color class
 * @param {string} status - Task status
 * @returns {string} CSS class name
 */
function getStatusColorClass(status) {
    const statusMap = {
        'not_started': 'not-started',
        'in_progress': 'in-progress',
        'under_review': 'under-review',
        'completed': 'completed',
        'on_hold': 'on-hold'
    };
    return statusMap[status] || 'not-started';
}

/**
 * Calculate task progress percentage
 * @param {Object} task - Task object
 * @returns {number} Progress percentage (0-100)
 */
function calculateTaskProgress(task) {
    const statusProgress = {
        'not_started': 0,
        'in_progress': 50,
        'under_review': 80,
        'completed': 100,
        'on_hold': 25
    };
    return statusProgress[task.status] || 0;
}

/**
 * Check if date is today
 * @param {Date|string} date - Date to check
 * @returns {boolean} True if date is today
 */
function isToday(date) {
    if (typeof date === 'string') {
        date = new Date(date);
    }
    const today = new Date();
    return date.toDateString() === today.toDateString();
}

/**
 * Check if date is in the past
 * @param {Date|string} date - Date to check
 * @returns {boolean} True if date is in the past
 */
function isPastDate(date) {
    if (typeof date === 'string') {
        date = new Date(date);
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
}

/**
 * Get task priority based on due date
 * @param {Object} task - Task object
 * @returns {string} Priority level ('high', 'medium', 'low')
 */
function getTaskPriority(task) {
    if (!task.endDate) return 'low';
    
    const dueDate = new Date(task.endDate);
    const today = new Date();
    const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
    
    if (daysUntilDue < 0) return 'overdue';
    if (daysUntilDue <= 1) return 'high';
    if (daysUntilDue <= 3) return 'medium';
    return 'low';
}

/**
 * Sanitize HTML content
 * @param {string} str - String to sanitize
 * @returns {string} Sanitized string
 */
function sanitizeHTML(str) {
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
}

/**
 * Generate unique ID
 * @returns {string} Unique identifier
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Local storage helpers
 */
const storage = {
    set: (key, value) => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.warn('LocalStorage not available:', e);
        }
    },
    
    get: (key, defaultValue = null) => {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            console.warn('Error reading from localStorage:', e);
            return defaultValue;
        }
    },
    
    remove: (key) => {
        try {
            localStorage.removeItem(key);
        } catch (e) {
            console.warn('Error removing from localStorage:', e);
        }
    }
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Export functions for global access
window.formatDate = formatDate;
window.getDayName = getDayName;
window.getRelativeTime = getRelativeTime;
window.getInitials = getInitials;
window.generateRandomColor = generateRandomColor;
window.debounce = debounce;
window.throttle = throttle;
window.deepClone = deepClone;
window.formatStatus = formatStatus;
window.getStatusColorClass = getStatusColorClass;
window.calculateTaskProgress = calculateTaskProgress;
window.isToday = isToday;
window.isPastDate = isPastDate;
window.getTaskPriority = getTaskPriority;
window.sanitizeHTML = sanitizeHTML;
window.generateId = generateId;
window.storage = storage;
window.sleep = sleep