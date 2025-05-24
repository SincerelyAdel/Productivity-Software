// team-manager.js
// Team member management functionality

import { teamMembers } from './models.js';
import { domElements } from './dom-elements.js';

export const addTeamMember = (name, color) => {
    if (!name) {
        console.warn('⚠️ Cannot add team member with empty name');
        return null;
    }
    
    console.log(`👥 Adding new team member: ${name} with color: ${color}`);
    
    const nameParts = name.split(' ');
    let initials = '';
    if (nameParts.length >= 2) {
        initials = nameParts[0][0] + nameParts[1][0];
    } else {
        initials = name.substring(0, 2);
    }
    initials = initials.toUpperCase();
    
    const newMemberId = 'user-' + Date.now();
    const newMember = {
        id: newMemberId,
        name: name,
        initials: initials,
        color: color
    };
    
    console.log('👤 New team member created:', newMember);
    
    teamMembers.push(newMember);
    
    return newMemberId;
};

export const renderTeamMembers = () => {
    console.log(`👥 Rendering ${teamMembers.length} team members`);
    
    domElements.teamMembersContainer.innerHTML = '';
    
    teamMembers.forEach(member => {
        const memberElem = document.createElement('div');
        memberElem.className = 'team-member';
        memberElem.innerHTML = `
            <div class="team-member-avatar" style="background-color:${member.color}">${member.initials}</div>
            <div class="team-member-name">${member.name}</div>
        `;
        
        domElements.teamMembersContainer.appendChild(memberElem);
    });
};

export const updateAssigneeDropdown = () => {
    console.log('🔄 Updating assignee dropdown');
    domElements.assigneeSelect.innerHTML = '<option value="">Assign to...</option>';
    
    teamMembers.forEach(member => {
        const option = document.createElement('option');
        option.value = member.id;
        option.textContent = member.name;
        domElements.assigneeSelect.appendChild(option);
    });
};

export const getTeamMemberById = (id) => {
    return teamMembers.find(member => member.id === id);
};