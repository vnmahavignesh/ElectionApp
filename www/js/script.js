// State variables
let voters = [];
let editingIndex = -1;
let currentPage = 1;
let rowsPerPage = 10;

// Load data on page load
window.addEventListener('DOMContentLoaded', () => {
    loadFromStorage();
    renderTable();
});

// Calculate age from date of birth
document.getElementById('dob').addEventListener('change', function () {
    const dob = new Date(this.value);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--;
    }

    document.getElementById('age').value = age;

    // Auto-set eligibility based on age
    const eligibilitySelect = document.getElementById('eligibility');
    if (age >= 18) {
        eligibilitySelect.value = 'Yes';
    } else {
        eligibilitySelect.value = 'No';
    }
});

// Form submission
document.getElementById('voterForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const form = e.target;
    if (!form.checkValidity()) {
        form.classList.add('was-validated');
        showToast('Please fill in all required fields correctly.', 'error');
        return;
    }

    const voter = {
        name: document.getElementById('name').value,
        dob: document.getElementById('dob').value,
        age: document.getElementById('age').value,
        eligibility: document.getElementById('eligibility').value,
        voterId: document.getElementById('voterId').value,
        phone: document.getElementById('phone').value,
        district: document.getElementById('district').value,
        city: document.getElementById('city').value,
        area: document.getElementById('area').value,
        street: document.getElementById('street').value,
        pincode: document.getElementById('pincode').value,
        address: document.getElementById('address').value
    };

    if (editingIndex >= 0) {
        voters[editingIndex] = voter;
        editingIndex = -1;
        showToast('Voter record updated successfully!', 'success');
    } else {
        voters.push(voter);
        showToast('Voter registered successfully!', 'success');
    }

    form.reset();
    form.classList.remove('was-validated');
    saveToStorage();
    renderTable();
});

// Reset form
document.getElementById('resetForm').addEventListener('click', function () {
    editingIndex = -1;
    document.getElementById('voterForm').reset();
    document.getElementById('voterForm').classList.remove('was-validated');
});

// Toast notification
function showToast(message, type = 'success') {
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideInRight 0.3s ease-out reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Search functionality
document.getElementById('searchInput').addEventListener('input', function (e) {
    const searchTerm = e.target.value.toLowerCase();

    if (searchTerm === '') {
        loadFromStorage();
        renderTable();
        return;
    }

    const allVoters = JSON.parse(localStorage.getItem('voterData') || '[]');
    voters = allVoters.filter(voter =>
        voter.name.toLowerCase().includes(searchTerm) ||
        voter.voterId.toLowerCase().includes(searchTerm) ||
        voter.phone.includes(searchTerm) ||
        voter.district.toLowerCase().includes(searchTerm) ||
        voter.city.toLowerCase().includes(searchTerm)
    );

    currentPage = 1;
    renderTable();
});

// Rows per page selector
document.getElementById('rowsPerPage').addEventListener('change', function (e) {
    rowsPerPage = parseInt(e.target.value);
    currentPage = 1;
    renderTable();
});

// Export to CSV
document.getElementById('exportCSV').addEventListener('click', function () {
    if (voters.length === 0) {
        showToast('No data to export!', 'error');
        return;
    }

    const headers = ['Name', 'Date of Birth', 'Age', 'Eligibility', 'Voter ID', 'Phone', 'District', 'City', 'Area', 'Street', 'Pincode', 'Address'];
    const csvContent = [
        headers.join(','),
        ...voters.map(voter => [
            escapeCSV(voter.name),
            escapeCSV(voter.dob),
            escapeCSV(voter.age),
            escapeCSV(voter.eligibility),
            escapeCSV(voter.voterId),
            escapeCSV(voter.phone),
            escapeCSV(voter.district),
            escapeCSV(voter.city),
            escapeCSV(voter.area),
            escapeCSV(voter.street),
            escapeCSV(voter.pincode),
            escapeCSV(voter.address)
        ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `voter_registration_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Data exported successfully!', 'success');
});

// Print table
document.getElementById('printTable').addEventListener('click', function () {
    if (voters.length === 0) {
        showToast('No data to print!', 'error');
        return;
    }

    const printWindow = window.open('', '_blank');
    const tableHTML = document.querySelector('.table-wrapper').innerHTML;

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Voter Registration Data</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #1a3a52; color: white; }
                tr:nth-child(even) { background-color: #f8f6f3; }
                @media print {
                    .actions-cell { display: none; }
                    th:last-child, td:last-child { display: none; }
                }
            </style>
        </head>
        <body>
            <h1>Voter Registration System</h1>
            <p>Generated on: ${new Date().toLocaleString()}</p>
            ${tableHTML}
        </body>
        </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 250);
});

// Import CSV
document.getElementById('importCSV').addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        showToast('Please select a valid CSV file!', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = function (event) {
        try {
            const csv = event.target.result;
            const lines = csv.split('\n');
            const headers = lines[0].split(',');

            const importedVoters = [];
            for (let i = 1; i < lines.length; i++) {
                if (lines[i].trim() === '') continue;

                const values = parseCSVLine(lines[i]);
                if (values.length >= 11) {
                    importedVoters.push({
                        name: values[0],
                        dob: values[1],
                        age: values[2],
                        eligibility: values[3],
                        voterId: values[4],
                        phone: values[5],
                        district: values[6],
                        city: values[7],
                        area: values[8],
                        street: values[9],
                        pincode: values[10],
                        address: values[11] || ''
                    });
                }
            }

            voters = importedVoters;
            currentPage = 1;
            renderTable();
            showToast(`Successfully imported ${importedVoters.length} voter records!`, 'success');
        } catch (error) {
            showToast('Error importing CSV file. Please check the format.', 'error');
            console.error(error);
        }
    };
    reader.readAsText(file);
    e.target.value = '';
});

// Render table
function renderTable() {
    const tableBody = document.getElementById('tableBody');
    const pagination = document.getElementById('pagination');

    if (voters.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="12" class="empty-state">
                    <div class="empty-state-icon">📋</div>
                    <p>No voters registered yet. Fill out the form above to add your first entry.</p>
                </td>
            </tr>
        `;
        pagination.innerHTML = '';
        return;
    }

    const totalPages = Math.ceil(voters.length / rowsPerPage);
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = Math.min(startIndex + rowsPerPage, voters.length);
    const currentVoters = voters.slice(startIndex, endIndex);

    tableBody.innerHTML = currentVoters.map((voter, index) => {
        const actualIndex = startIndex + index;
        const eligibilityColor = voter.eligibility === 'Yes' ? '#4a9d7f' : '#c65d5d';
        return `
            <tr>
                <td>${voter.name}</td>
                <td>${voter.dob}</td>
                <td>${voter.age || 'N/A'}</td>
                <td style="color: ${eligibilityColor}; font-weight: 600;">${voter.eligibility}</td>
                <td>${voter.voterId}</td>
                <td>${voter.phone}</td>
                <td>${voter.district}</td>
                <td>${voter.city}</td>
                <td>${voter.area}</td>
                <td>${voter.street}</td>
                <td>${voter.pincode}</td>
                <td>
                    <div class="actions-cell">
                        <button class="btn-icon btn-edit" onclick="editVoter(${actualIndex})">Edit</button>
                        <button class="btn-icon btn-delete" onclick="deleteVoter(${actualIndex})">Delete</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    // Render pagination
    pagination.innerHTML = '';

    const prevBtn = document.createElement('button');
    prevBtn.className = 'page-btn';
    prevBtn.textContent = '← Previous';
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => {
        if (currentPage > 1) {
            currentPage--;
            renderTable();
        }
    };
    pagination.appendChild(prevBtn);

    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = 'page-btn' + (i === currentPage ? ' active' : '');
        pageBtn.textContent = i;
        pageBtn.onclick = () => {
            currentPage = i;
            renderTable();
        };
        pagination.appendChild(pageBtn);
    }

    const nextBtn = document.createElement('button');
    nextBtn.className = 'page-btn';
    nextBtn.textContent = 'Next →';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => {
        if (currentPage < totalPages) {
            currentPage++;
            renderTable();
        }
    };
    pagination.appendChild(nextBtn);
}

// Edit voter
function editVoter(index) {
    editingIndex = index;
    const voter = voters[index];

    const form = document.getElementById('voterForm');
    form.classList.remove('was-validated'); // Remove validation state when editing

    document.getElementById('name').value = voter.name;
    document.getElementById('dob').value = voter.dob;
    document.getElementById('age').value = voter.age || '';
    document.getElementById('eligibility').value = voter.eligibility || 'Yes';
    document.getElementById('voterId').value = voter.voterId;
    document.getElementById('phone').value = voter.phone;
    document.getElementById('district').value = voter.district;
    document.getElementById('city').value = voter.city;
    document.getElementById('area').value = voter.area;
    document.getElementById('street').value = voter.street;
    document.getElementById('pincode').value = voter.pincode;
    document.getElementById('address').value = voter.address;

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Delete voter
function deleteVoter(index) {
    if (confirm('Are you sure you want to delete this voter record?')) {
        const voterName = voters[index].name;
        voters.splice(index, 1);
        if (voters.length <= (currentPage - 1) * rowsPerPage && currentPage > 1) {
            currentPage--;
        }
        renderTable();
        showToast(`Voter record for ${voterName} deleted successfully!`, 'success');
    }
}

// Save to localStorage
function saveToStorage() {
    localStorage.setItem('voterData', JSON.stringify(voters));
}

// Load from localStorage
function loadFromStorage() {
    const stored = localStorage.getItem('voterData');
    if (stored) {
        try {
            voters = JSON.parse(stored);
        } catch (e) {
            console.error('Error loading data:', e);
            voters = [];
        }
    }
}

// CSV helper functions
function escapeCSV(value) {
    if (value === null || value === undefined) return '';
    const stringValue = String(value);
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);

    return result;
}

// Auto-save on window close
window.addEventListener('beforeunload', () => {
    saveToStorage();
});