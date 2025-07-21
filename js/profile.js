function handleProfilePictureChange(event) {
    const file = event.target.files[0];
    
    if (!file) {
        return;
    }
    
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
        alert('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
        return;
    }
    
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
        alert('Please select an image smaller than 5MB');
        return;
    }
    
    showNotification('Uploading profile picture...', 'info');
    
    uploadProfilePicture(file);
}

function uploadProfilePicture(file) {
    const formData = new FormData();
    console.log(userData);
    
    formData.append('file', file);
    formData.append('member_id', userData.id);
    
    console.log('Uploading profile picture for member:', userData.id);
    
    fetch('http://127.0.0.1:8000/member/profile-picture', {
        method: 'POST',
        body: formData,
    })
    .then(response => {
        console.log('Upload response status:', response.status);
        return response.json();
    })
    .then(data => {
        console.log('Upload response data:', data);
        if (data.success) {
            loadProfilePictureFromBackend();
            showNotification('Profile picture uploaded successfully!', 'success');
            
            const profilePictureInput = document.getElementById('profilePictureInput');
            if (profilePictureInput) {
                profilePictureInput.value = '';
            }
        } else {
            showNotification('Failed to upload profile picture: ' + (data.message || 'Unknown error'), 'error');
        }
    })
    .catch(error => {
        console.error('Error uploading profile picture:', error);
        showNotification('Error uploading profile picture: ' + error.message, 'error');
    });
}

function removeProfilePicture() {
    console.log('Removing profile picture for member:', userData.id);
    
    const formData = new FormData();
    formData.append('member_id', userData.id);
    
    showNotification('Removing profile picture...', 'info');
    
    fetch('/member/profile-picture', {
        method: 'DELETE',
        body: formData,
    })
    .then(response => {
        console.log('Delete response status:', response.status);
        return response.json();
    })
    .then(data => {
        console.log('Delete response data:', data);
        if (data.success) {
            userData.profilePicture = null;
            updateUserInfo();
            showNotification('Profile picture removed successfully!', 'success');
            
            const profilePictureInput = document.getElementById('profilePictureInput');
            if (profilePictureInput) {
                profilePictureInput.value = '';
            }
        } else {
            showNotification('Failed to remove profile picture: ' + (data.message || 'Unknown error'), 'error');
        }
    })
    .catch(error => {
        console.error('Error removing profile picture:', error);
        showNotification('Error removing profile picture: ' + error.message, 'error');
    });
}

function testBackendConnection() {
    console.log('Testing backend connection...');
    
    fetch(`/member/${userData.id}/profile-picture`)
    .then(response => {
        console.log('Backend test response status:', response.status);
        if (response.status === 404) {
            console.log('No profile picture found (expected for new users)');
            showNotification('Backend connected - no profile picture found', 'info');
        } else if (response.ok) {
            console.log('Profile picture found');
            showNotification('Backend connected - profile picture exists', 'success');
        } else {
            console.log('Backend error:', response.status);
            showNotification('Backend connection error: ' + response.status, 'error');
        }
    })
    .catch(error => {
        console.error('Backend connection failed:', error);
        showNotification('Backend connection failed: ' + error.message, 'error');
    });
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    const bgColor = type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${bgColor};
        color: white;
        padding: 1rem;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        z-index: 1000;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        max-width: 400px;
        animation: slideIn 0.3s ease-out;
    `;
    
    // Add keyframes for animation
    if (!document.querySelector('#notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            .notification-content {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                width: 100%;
            }
            .notification-close {
                background: none;
                border: none;
                color: white;
                cursor: pointer;
                margin-left: auto;
                padding: 0.25rem;
            }
            .notification-close:hover {
                opacity: 0.8;
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

const userData = {
    id: 0,
    first_name: "",
    last_name: "",
    email: "",
    avatar_color: "",
    phoneNumber: "",
    profilePicture: null
};

function getInitials(firstName, lastName) {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`;
}

function initializePage() {
    userData.access_token = sessionStorage.getItem('access_token');
    updateUserInfo();
}

function updateUserInfo() {
    debugger;
    const initials = getInitials(userData.first_name, userData.last_name);
    
    const profileAvatar = document.getElementById('profileAvatar');
    const profileImage = document.getElementById('profileImage');
    const profileInitials = document.getElementById('profileInitials');

    userData.id = sessionStorage.getItem("member_id");
    console.log(userData.id);
    
    if (userData.id) {
        loadProfilePictureFromBackend();
    } else if (userData.profilePicture) {
        profileImage.src = userData.profilePicture;
        profileImage.style.display = 'block';
        profileInitials.style.display = 'none';
        profileAvatar.style.backgroundColor = 'transparent';
    } else {
        profileImage.style.display = 'none';
        profileInitials.style.display = 'block';
        profileInitials.textContent = initials;
        profileAvatar.style.backgroundColor = userData.avatar_color;
    }
    document.getElementById('profileName').textContent = `${userData.first_name} ${userData.last_name}`;
    document.getElementById('profileEmail').textContent = userData.email;
    document.getElementById('firstName').value = userData.first_name;
    document.getElementById('lastName').value = userData.last_name;
    document.getElementById('email').value = userData.email;
    
    document.getElementById('phone').value = userData.phoneNumber;
}

async function loadProfilePictureFromBackend() {
    const profileImage = document.getElementById('profileImage');
    const profileInitials = document.getElementById('profileInitials');
    const profileAvatar = document.getElementById('profileAvatar');

    try {
        console.log(userData);
        
        const response = await fetch(`http://127.0.0.1:8000/member/${userData.id}/profile`);
        
        if (!response.ok) {
            throw new Error(`Error fetching profile: ${response.status}`);
        }

        const data = await response.json();

        console.log(data);
        

        // Update userData with backend response
        Object.assign(userData, data);

        console.log(userData);
        
        const initials = getInitials(data.first_name, data.last_name);

        if (data.has_profile_picture && data.profile_picture_url) {
            // Add cache-busting timestamp
            const imageUrl = `http://127.0.0.1:8000/member/${userData.id}/profile-picture?t=${Date.now()}`;


            profileImage.onload = () => {
                profileImage.style.display = 'block';
                profileInitials.style.display = 'none';
                profileAvatar.style.backgroundColor = 'transparent';
            };

            profileImage.onerror = () => {
                profileImage.style.display = 'none';
                profileInitials.style.display = 'block';
                profileInitials.textContent = initials;
                profileAvatar.style.backgroundColor = userData.avatar_color;
            };

            profileImage.src = imageUrl;
        } else {
            // No image, show initials
            profileImage.style.display = 'none';
            profileInitials.style.display = 'block';
            profileInitials.textContent = initials;
            profileAvatar.style.backgroundColor = userData.avatar_color;
        }

        // Also update profile text info
        document.getElementById('profileName').textContent = `${data.first_name} ${data.last_name}`;
        document.getElementById('profileEmail').textContent = data.email;
        document.getElementById('firstName').value = data.first_name;
        document.getElementById('lastName').value = data.last_name;
        document.getElementById('email').value = data.email;
        document.getElementById('phone').value = data.phoneNumber || ''; // fallback if not included
    } catch (error) {
        console.error('Failed to load profile data:', error);
        showNotification('Failed to load profile data', 'error');
    }
}


function addInteractivity() {
    const editProfileButton = document.querySelector('.profile-actions .btn-primary');

    if (editProfileButton) {
        editProfileButton.addEventListener('click', async () => {
            debugger;
            const updatedData = {
                first_name: document.getElementById('firstName').value.trim(),
                last_name: document.getElementById('lastName').value.trim(),
                email: document.getElementById('email').value.trim(),
                phoneNumber: document.getElementById('phone').value.trim(),
            };

            const password = document.getElementById('password').value.trim();
            const confirmPassword = document.getElementById('confirmPassword').value.trim();

            let updatedMember = {};

            if (password === confirmPassword && password !== "") {
                updatedData.password = password;
                updatedMember = await updateMember(userData.id, updatedData);
                
                if (updatedMember && Object.keys(updatedMember).length !== 0) {
                    showNotification('Profile updated successfully!', 'success');
                    updateUserInfo();
                }
            } else {
                showNotification('Incorrect password, both password fields need to match.', 'error');
            }
        });
    }

    const profilePictureInput = document.getElementById('profilePictureInput');
    if (profilePictureInput) {
        profilePictureInput.addEventListener('change', handleProfilePictureChange);
    }

    const logoutButton = document.querySelector('.profile-actions .btn-secondary');
    if (logoutButton) {
        logoutButton.addEventListener('click', () => logoutUser());
    }
}

async function updateMember(memberId, updatedData) {
    try {
        const response = await fetch(`http://127.0.0.1:8000/members/${memberId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to update member');
        }

        const updatedMember = await response.json();
        console.log('Member updated:', updatedMember);
        return updatedMember;
    } catch (error) {
        console.error('Error updating member:', error.message);
    }
}

function logoutUser() {
    sessionStorage.clear();

    window.location.href = "/login.html";
}

function openPasswordModal() {
    document.getElementById('changePasswordModal').style.display = 'flex';
}

function closePasswordModal() {
    document.getElementById('changePasswordModal').style.display = 'none';
    document.getElementById('oldPassword').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmNewPassword').value = '';
}

async function submitPasswordChange() {
    debugger;
    const oldPassword = document.getElementById('oldPassword').value.trim();
    const newPassword = document.getElementById('newPassword').value.trim();
    const confirmPassword = document.getElementById('confirmNewPassword').value.trim();

    if (!oldPassword || !newPassword || !confirmPassword) {
        showNotification('Please fill in all fields.', 'error');
        return;
    }

    if (newPassword !== confirmPassword) {
        showNotification('New passwords do not match.', 'error');
        return;
    }

    try {
        const response = await fetch(`http://127.0.0.1:8000/members/${userData.id}/change-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                old_password: oldPassword,
                new_password: newPassword
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || 'Password change failed.');
        }

        showNotification('Password changed successfully!', 'success');
        closePasswordModal();
    } catch (error) {
        console.error('Password change error:', error);
        showNotification(error.message, 'error');
    }
}

function exitProfilePage() {
    sessionStorage.setItem('access_token', `${userData.access_token}`)
    history.back();
}


document.addEventListener('DOMContentLoaded', () => {
    initializePage();
    addInteractivity();
    
    console.log('WorkspaceFlow User Dashboard initialized successfully!');
});
