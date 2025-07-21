// ============ UPDATED SETTINGS MANAGEMENT FOR YOUR HTML ============

const settingsManager = {
    // Default settings
    defaultSettings: {
        statusTemplate: 'default',
    },

    statusTemplates: {
        default: {
            name: 'Default Business',
            category: 'General',
            description: 'Standard business project with comprehensive status tracking for general project management and task coordination.',
            statuses: [
                { key: 'not_started', label: 'Not Started', color: '#95a5a6', special: false },
                { key: 'in_progress', label: 'In Progress', color: '#4a6fa5', special: false },
                { key: 'under_review', label: 'Under Review', color: '#f39c12', special: true, approvalRequired: 2 },
                { key: 'completed', label: 'Completed', color: '#2ecc71', special: false },
                { key: 'on_hold', label: 'On Hold', color: '#e74c3c', special: false }
            ],
            specialStates: [
                { state: 'under_review', requirement: 'Requires approval from 2 assignees before proceeding' }
            ]
        },
        
        agile: {
            name: 'Agile Development',
            category: 'Development',
            description: 'Complete agile development project designed for software teams using Scrum methodology.',
            statuses: [
                { key: 'backlog', label: 'Product Backlog', color: '#95a5a6', special: false },
                { key: 'sprint_ready', label: 'Sprint Ready', color: '#17a2b8', special: false },
                { key: 'in_development', label: 'In Development', color: '#4a6fa5', special: false },
                { key: 'code_review', label: 'Code Review', color: '#f39c12', special: true, approvalRequired: 2 },
                { key: 'testing', label: 'Testing', color: '#9b59b6', special: false },
                { key: 'deployed', label: 'Deployed', color: '#2ecc71', special: false }
            ],
            specialStates: [
                { state: 'code_review', requirement: 'Requires approval from 2 senior developers' }
            ]
        },

        creative: {
            name: 'Creative project',
            category: 'Creative',
            description: 'Professional creative project for agencies handling client projects from concept through final delivery.',
            statuses: [
                { key: 'brief_review', label: 'Brief Review', color: '#95a5a6', special: false },
                { key: 'concept_development', label: 'Concept Development', color: '#9b59b6', special: false },
                { key: 'initial_design', label: 'Initial Design', color: '#4a6fa5', special: false },
                { key: 'client_review', label: 'Client Review', color: '#f39c12', special: true, approvalRequired: 1 },
                { key: 'final_approval', label: 'Final Approval', color: '#fd7e14', special: true, approvalRequired: 2 },
                { key: 'delivered', label: 'Delivered', color: '#2ecc71', special: false }
            ],
            specialStates: [
                { state: 'client_review', requirement: 'Requires client approval' },
                { state: 'final_approval', requirement: 'Requires approval from Creative Director and Account Manager' }
            ]
        },

        manufacturing: {
            name: 'Manufacturing',
            category: 'Operations',
            description: 'Manufacturing project with quality control checkpoints and regulatory compliance.',
            statuses: [
                { key: 'design_review', label: 'Design Review', color: '#95a5a6', special: false },
                { key: 'material_sourcing', label: 'Material Sourcing', color: '#17a2b8', special: false },
                { key: 'prototype', label: 'Prototype', color: '#4a6fa5', special: false },
                { key: 'quality_approval', label: 'Quality Approval', color: '#f39c12', special: true, approvalRequired: 2 },
                { key: 'production', label: 'Production', color: '#9b59b6', special: false },
                { key: 'shipped', label: 'Shipped', color: '#2ecc71', special: false }
            ],
            specialStates: [
                { state: 'quality_approval', requirement: 'Requires approval from 2 quality control engineers' }
            ]
        },

        academic: {
            name: 'Academic Research',
            category: 'Research',
            description: 'Scholarly research project covering proposal through publication with peer review processes.',
            statuses: [
                { key: 'proposal', label: 'Research Proposal', color: '#95a5a6', special: false },
                { key: 'ethics_review', label: 'Ethics Review', color: '#f39c12', special: true, approvalRequired: 3 },
                { key: 'data_collection', label: 'Data Collection', color: '#4a6fa5', special: false },
                { key: 'analysis', label: 'Data Analysis', color: '#9b59b6', special: false },
                { key: 'peer_review', label: 'Peer Review', color: '#fd7e14', special: true, approvalRequired: 3 },
                { key: 'published', label: 'Published', color: '#2ecc71', special: false }
            ],
            specialStates: [
                { state: 'ethics_review', requirement: 'Requires approval from 3 ethics committee members' },
                { state: 'peer_review', requirement: 'Requires approval from 3 peer reviewers' }
            ]
        },

        simple: {
            name: 'Simple (3 Status)',
            category: 'General',
            description: 'Minimalist three-stage project perfect for small teams and straightforward project management needs.',
            statuses: [
                { key: 'to_do', label: 'To Do', color: '#95a5a6', special: false },
                { key: 'in_progress', label: 'In Progress', color: '#4a6fa5', special: false },
                { key: 'completed', label: 'Completed', color: '#2ecc71', special: false }
            ],
            specialStates: []
        }
    },

    currentSettings: {},
    selectedTemplate: 'default',

    /**
     * Initialize settings system
     */
    init() {
        this.applySettings();
    },

    /**
     * Initialize settings view when opened
     */
    initializeSettingsView() {
        this.populateSettingsForm();
        this.renderStatusTemplates();
    },

    /**
     * Render method for compatibility with app.js renderCurrentView
     */
    render() {
        this.initializeSettingsView();
    },

    /**
     * Render status templates dropdown and preview
     */
    renderStatusTemplates() {
        const statusSelect = document.getElementById('statusTemplateSelect');
        if (!statusSelect) return;

        // Clear and populate the select dropdown
        statusSelect.innerHTML = '';
        
        Object.entries(this.statusTemplates).forEach(([key, template]) => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = template.name;
            option.selected = key === this.selectedTemplate;
            statusSelect.appendChild(option);
        });

        // Update preview
        this.updateStatusPreview();
    },

    /**
     * Update status preview
     */
    updateStatusPreview() {
        const template = this.statusTemplates[this.selectedTemplate];
        if (!template) return;

        // Update preview container
        const statusPreview = document.getElementById('statusPreview');
        if (statusPreview) {
            statusPreview.innerHTML = template.statuses.map(status => 
                `<span class="status-badge-preview ${status.special ? 'special' : ''}" 
                       style="background-color: ${status.color}; color: white; padding: 4px 8px; border-radius: 4px; margin: 2px; display: inline-block; font-size: 12px;">
                    ${status.label}${status.special ? ' ⭐' : ''}
                 </span>`
            ).join('');
        }

        // Update description
        const templateDescription = document.getElementById('templateDescription');
        if (templateDescription) {
            templateDescription.textContent = template.description;
        }
    },

    /**
     * Open settings - use full-page overlay system from your CSS
     */
    openSettings() {
        this.populateSettingsForm();
        
        // Create overlay if it doesn't exist
        let overlay = document.getElementById('settingsOverlay');
        if (!overlay) {
            overlay = this.createSettingsOverlay();
            document.body.appendChild(overlay);
        }
        
        // Show overlay
        overlay.classList.add('active');
        document.querySelector('.app-container').classList.add('settings-open');
        document.body.style.overflow = 'hidden';
    },

    /**
     * Close settings - restore app view
     */
    closeSettings() {
        const overlay = document.getElementById('settingsOverlay');
        if (overlay) {
            overlay.classList.remove('active');
        }
        
        document.querySelector('.app-container').classList.remove('settings-open');
        document.body.style.overflow = 'auto';
    },

    /**
     * Create the full-page settings overlay HTML - SIMPLIFIED VERSION
     */
    createSettingsOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'settingsOverlay';
        overlay.innerHTML = `
            <div class="settings-full-container">
                <!-- Settings Header -->
                <div class="settings-header-full">
                    <button id="backFromSettingsBtnFull" class="settings-back-btn">
                        <span>←</span>
                        <span>Back to App</span>
                    </button>
                    <h1>⚙️ Status Templates</h1>
                </div>

                <!-- Settings Content -->
                <div class="settings-content-full">
                    
                    <!-- Status Templates Section -->
                    <div class="status-templates-section-full">
                        <div class="section-header-full">
                            <h3>📋 Choose Your Workflow Template</h3>
                            <p class="section-description-full">Select the status workflow that best fits your project type and team needs</p>
                        </div>
                        
                        <div class="status-templates-grid">
                            <!-- Templates will be populated here -->
                        </div>
                        
                        <div class="selected-template-details">
                            <div class="template-info-panel">
                                <h4>Selected Template Details</h4>
                                <div class="template-description-panel">
                                    <p id="selectedTemplateDescriptionFull">Select a template to see details</p>
                                </div>
                                
                                <div class="template-statuses-preview">
                                    <h5>Status Workflow:</h5>
                                    <div id="selectedTemplateStatusesFull" class="statuses-list">
                                        <!-- Status badges will be populated here -->
                                    </div>
                                </div>
                                
                                <div class="special-states-info">
                                    <h5>Special Approval Requirements:</h5>
                                    <div id="specialStatesInfoFull" class="special-states-list">
                                        <!-- Special states will be populated here -->
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Save/Cancel Actions -->
                    <div class="settings-actions-full">
                        <button id="saveSettingsBtnFull" class="primary-btn-full">💾 Apply Template</button>
                        <button id="cancelSettingsBtnFull" class="secondary-btn-full">❌ Cancel</button>
                    </div>
                </div>
            </div>
        `;
        
        return overlay;
    },

    /**
     * Populate settings form - ONLY for full overlay
     */
    populateSettingsForm() {
        this.populateSettingsFormFull();
    },

    /**
     * Populate settings form for full overlay - SIMPLIFIED
     */
    populateSettingsFormFull() {
        // Only initialize status template display
        this.renderStatusTemplatesFull();
    },

    /**
     * Render status templates for full overlay
     */
    renderStatusTemplatesFull() {
        const grid = document.querySelector('.status-templates-grid');
        if (!grid) return;

        grid.innerHTML = '';

        Object.entries(this.statusTemplates).forEach(([key, template]) => {
            const card = document.createElement('div');
            card.className = `status-template-card ${key === this.selectedTemplate ? 'active' : ''}`;
            card.dataset.template = key;

            const hasSpecialStates = template.specialStates && template.specialStates.length > 0;
            const specialStatesHtml = hasSpecialStates ? 
                `<div class="template-special-indicator">
                    <span>⭐ Special Approval States: ${template.specialStates.length}</span>
                </div>` : '';

            card.innerHTML = `
                <div class="template-card-header">
                    <h4 class="template-card-title">${template.name}</h4>
                    <p class="template-card-subtitle">${template.category}</p>
                </div>
                <p class="template-card-description">${template.description}</p>
                <div class="template-card-statuses">
                    ${template.statuses.map(status => 
                        `<span class="template-status-badge ${status.special ? 'special-state-badge' : ''}" 
                               style="background-color: ${status.color}">${status.label}</span>`
                    ).join('')}
                </div>
                ${specialStatesHtml}
            `;

            card.addEventListener('click', () => {
                this.selectTemplateFull(key);
            });

            grid.appendChild(card);
        });

        // Update details panel for initially selected template
        this.updateTemplateDetailsFull(this.selectedTemplate);
    },

    /**
     * Select a status template for full overlay
     */
    selectTemplateFull(templateKey) {
        this.selectedTemplate = templateKey;
        
        // Update active card
        document.querySelectorAll('.status-template-card').forEach(card => {
            card.classList.toggle('active', card.dataset.template === templateKey);
        });

        // Update details panel
        this.updateTemplateDetailsFull(templateKey);
    },

    /**
     * Update template details panel for full overlay
     */
    updateTemplateDetailsFull(templateKey) {
        const template = this.statusTemplates[templateKey];
        if (!template) return;

        // Update description
        const descriptionElement = document.getElementById('selectedTemplateDescriptionFull');
        if (descriptionElement) {
            descriptionElement.textContent = template.description;
        }

        // Update statuses preview
        const statusesContainer = document.getElementById('selectedTemplateStatusesFull');
        if (statusesContainer) {
            statusesContainer.innerHTML = template.statuses.map(status => 
                `<span class="status-badge-large ${status.special ? 'special' : ''}" 
                       style="background-color: ${status.color}">${status.label}</span>`
            ).join('');
        }

        // Update special states info
        const specialStatesContainer = document.getElementById('specialStatesInfoFull');
        if (specialStatesContainer) {
            if (template.specialStates && template.specialStates.length > 0) {
                specialStatesContainer.innerHTML = template.specialStates.map(special => 
                    `<div class="special-state-item">
                        <span class="special-state-name">${this.getStatusLabel(special.state, template)}</span>
                        <span class="special-state-requirement">${special.requirement}</span>
                    </div>`
                ).join('');
            } else {
                specialStatesContainer.innerHTML = '<p style="color: #6c757d; font-style: italic; margin: 0;">No special approval requirements for this template.</p>';
            }
        }
    },

    /**
     * Select theme
     */
    selectTheme(themeKey) {
        document.querySelectorAll('.theme-option').forEach(button => {
            button.classList.toggle('active', button.dataset.theme === themeKey);
        });
    },

    /**
     * Cancel settings changes
     */
    cancelSettings() {
        this.populateSettingsForm();
        this.closeSettings();
    },

    /**
     * Apply current settings to the application
     */
    applySettings() {
        this.applyStatusTemplate();
    },

    /**
     * Apply status template
     */
    applyStatusTemplate() {
        const template = this.statusTemplates[this.selectedTemplate];
        if (!template) return;

        // Update kanban view columns immediately
        if (window.kanbanView && window.kanbanView.updateColumnsFromSettings) {
            window.kanbanView.updateColumnsFromSettings();
        }

        // Refresh status displays
        this.refreshStatusDisplays();
    },

    /**
     * Refresh status displays throughout the app
     */
    refreshStatusDisplays() {
        // Update status selectors
        this.updateStatusSelectors();
        
        // Refresh views if they exist
        if (window.kanbanView && window.kanbanView.refresh) {
            window.kanbanView.refresh();
        }

        if (window.taskView && window.taskView.render) {
            window.taskView.render();
        }
    },

    /**
     * Update status selectors throughout the app
     */
    updateStatusSelectors() {
        const template = this.getCurrentStatusTemplate();
        if (!template) return;

        // Update status dropdowns
        const statusSelects = document.querySelectorAll('select[name="status"], #taskStatus, #taskStatusSelect');
        statusSelects.forEach(select => {
            const currentValue = select.value;
            select.innerHTML = '';
            
            template.statuses.forEach(status => {
                const option = document.createElement('option');
                option.value = status.key;
                option.textContent = status.label;
                option.selected = status.key === currentValue;
                
                if (status.special) {
                    option.textContent += ' (Approval Required)';
                    option.style.fontStyle = 'italic';
                }
                
                select.appendChild(option);
            });
        });
    },

    /**
     * Get current status template
     */
    getCurrentStatusTemplate() {
        return this.statusTemplates[this.selectedTemplate] || this.statusTemplates.default;
    },

    /**
     * Get status label by key
     */
    getStatusLabel(statusKey) {
        const template = this.getCurrentStatusTemplate();
        const status = template.statuses.find(s => s.key === statusKey);
        return status ? status.label : statusKey;
    },

    /**
     * Get status color by key
     */
    getStatusColor(statusKey) {
        const template = this.getCurrentStatusTemplate();
        const status = template.statuses.find(s => s.key === statusKey);
        return status ? status.color : '#95a5a6';
    },

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        if (window.app && window.app.showNotification) {
            window.app.showNotification(message, type);
        } else {
        }
    },
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    settingsManager.init();
});

// Export for global access
window.settingsManager = settingsManager;