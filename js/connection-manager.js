// Connection Manager - Backend Integration Utilities

/**
 * Update the connection status indicator in the UI
 */
function updateConnectionStatus(status, message) {
    const indicator = document.getElementById('connectionIndicator');
    const statusDot = indicator?.querySelector('.status-dot');
    const statusText = indicator?.querySelector('.status-text');
    
    if (statusDot && statusText) {
        statusDot.className = `status-dot ${status}`;
        statusText.textContent = message;
        
        const connectionStatus = indicator.closest('.connection-status');
        if (connectionStatus) {
            connectionStatus.className = `connection-status ${status}`;
        }
    }
}

/**
 * Show connection error modal
 */
function showConnectionError() {
    const modal = document.getElementById('connectionErrorModal');
    if (modal) {
        modal.style.display = 'block';
    }
}

/**
 * Hide connection error modal
 */
function hideConnectionError() {
    const modal = document.getElementById('connectionErrorModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Initialize connection management
 */
function initializeConnectionManager() {
    // Initialize connection status
    updateConnectionStatus('connecting', 'Connecting...');

    // Global error handler for backend connection issues
    // window.addEventListener('error', (event) => {
    //     if (event.error && event.error.message.includes('fetch')) {
    //         updateConnectionStatus('error', 'Connection lost');
    //     }
    // });

    // Add retry functionality
    const retryBtn = document.getElementById('retryConnectionBtn');
    if (retryBtn) {
        retryBtn.addEventListener('click', () => {
            // location.reload();
        });
    }

    // Add offline mode functionality
    const offlineBtn = document.getElementById('offlineModeBtn');
    if (offlineBtn) {
        offlineBtn.addEventListener('click', () => {
            hideConnectionError();
            updateConnectionStatus('offline', 'Offline mode');
        });
    }

    // Monitor online/offline status
    window.addEventListener('online', () => {
        updateConnectionStatus('connecting', 'Reconnecting...');
        // Trigger app re-initialization
        if (window.app && window.app.forceRefresh) {
            window.app.forceRefresh();
        }
    });

    window.addEventListener('offline', () => {
        updateConnectionStatus('offline', 'Offline');
    });
}

/**
 * Handle successful backend connection
 */
function onConnectionSuccess() {
    updateConnectionStatus('connected', 'Connected');
    hideConnectionError();
}

/**
 * Handle backend connection failure
 */
function onConnectionFailure(error) {
    console.error('Backend connection failed:', error);
    updateConnectionStatus('error', 'Connection failed');
    showConnectionError();
}

/**
 * Test backend connectivity
 */
async function testBackendConnection() {
    try {
        const response = await fetch(`${BASE_URL}/members`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        
        if (response.ok) {
            onConnectionSuccess();
            return true;
        } else {
            throw new Error(`HTTP ${response.status}`);
        }
    } catch (error) {
        onConnectionFailure(error);
        return false;
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initializeConnectionManager();
});

// Export functions for global access
window.updateConnectionStatus = updateConnectionStatus;
window.showConnectionError = showConnectionError;
window.hideConnectionError = hideConnectionError;
window.onConnectionSuccess = onConnectionSuccess;
window.onConnectionFailure = onConnectionFailure;
window.testBackendConnection = testBackendConnection;
