// team-modal-controller.js
// Team member modal functionality

import { domElements } from '../dom-elements.js';
import { addTeamMember, renderTeamMembers, updateAssigneeDropdown } from '../team-manager.js';

let selectedColor = '#4a6fa5';

export const setupTeamModalController = () => {
    // Set up color selection
    domElements.colorOptions.forEach(option => {
        option.addEventListener('click', () => {
            domElements.colorOptions.forEach(opt => opt.classList.remove('selected'));
            
            option.classList.add('selected');
            
            selectedColor = option.getAttribute('data-color');
            console.log(`🎨 Color selected: ${selectedColor}`);
        });
    });

    if (domElements.colorOptions.length > 0) {
        domElements.colorOptions[0].classList.add('selected');
    }

    // Modal open button
    domElements.addTeamMemberBtn.addEventListener('click', () => {
        console.log('🖱️ Add team member button clicked');
        domElements.memberNameInput.value = '';
        domElements.teamMemberModal.style.display = 'block';
        domElements.memberNameInput.focus();
    });

    // Close modal functions
    const closeTeamMemberModal = () => {
        console.log('🔳 Closing team member modal');
        domElements.teamMemberModal.style.display = 'none';
    };

    domElements.closeTeamModal.addEventListener('click', closeTeamMemberModal);
    domElements.cancelTeamMemberBtn.addEventListener('click', closeTeamMemberModal);

    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === domElements.teamMemberModal) {
            console.log('🖱️ Clicked outside team modal to close');
            closeTeamMemberModal();
        }
    });

    // Save team member
    domElements.saveTeamMemberBtn.addEventListener('click', () => {
        const name = domElements.memberNameInput.value.trim();
        
        if (!name) {
            console.warn('⚠️ Cannot add team member with empty name');
            alert('Please enter a team member name');
            return;
        }
        
        addTeamMember(name, selectedColor);
        renderTeamMembers();
        updateAssigneeDropdown();
        closeTeamMemberModal();
    });

    // Enter key in name input
    domElements.memberNameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            domElements.saveTeamMemberBtn.click();
        }
    });
};