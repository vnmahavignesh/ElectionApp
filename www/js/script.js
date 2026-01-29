// Toast notification system
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastIcon = document.getElementById('toastIcon');
    const toastMessage = document.getElementById('toastMessage');

    // Set icon based on type
    if (type === 'success') {
        toastIcon.textContent = '✓';
        toast.classList.remove('error');
        toast.classList.add('success');
    } else if (type === 'error') {
        toastIcon.textContent = '⚠';
        toast.classList.remove('success');
        toast.classList.add('error');
    }

    toastMessage.textContent = message;
    toast.classList.add('show');

    // Auto hide after 3 seconds
    setTimeout(() => {
        hideToast();
    }, 3000);
}

function hideToast() {
    const toast = document.getElementById('toast');
    toast.classList.remove('show');
}

// Data storage
let voters = [];
let filteredVoters = null; // For search
let currentPage = 1;
let rowsPerPage = 10;
let editingIndex = -1;
let searchQuery = '';

// Load data from localStorage on page load
window.addEventListener('DOMContentLoaded', () => {
    loadFromStorage();
    renderTable();

    // Show notification if data was loaded
    if (voters.length > 0) {
        showToast(`Loaded ${voters.length} voter records from storage`, 'success');
    }

    // Attach search event handler
    const searchInput = document.getElementById('searchVoterInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.trim().toLowerCase();
            filterVoters();
            currentPage = 1;
            renderTable();
        });
    }
});

// Calculate age and set eligibility when DOB changes
document.getElementById('dob').addEventListener('change', (e) => {
    const dob = new Date(e.target.value);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--;
    }

    document.getElementById('age').value = age;

    // Set eligibility based on age
    const eligibilitySelect = document.getElementById('eligibility');
    if (age >= 18) {
        eligibilitySelect.value = 'Yes';
    } else {
        eligibilitySelect.value = 'No';
    }
});

// Form submission
document.getElementById('voterForm').addEventListener('submit', (e) => {
    e.preventDefault();

    const form = e.target;

    // Add validation class to show errors
    form.classList.add('was-validated');

    // Check if form is valid
    if (!form.checkValidity()) {
        showToast('Please fill in all required fields correctly', 'error');
        return;
    }

    const formData = {
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
        voters[editingIndex] = formData;
        editingIndex = -1;
        showToast('Voter record updated successfully!', 'success');
    } else {
        voters.push(formData);
        showToast('Voter registered successfully!', 'success');
    }

    form.reset();
    form.classList.remove('was-validated');
    renderTable();
});

// Save changes button
document.getElementById('saveChangesBtn').addEventListener('click', () => {
    saveToStorage();
    showToast('Changes saved to local storage successfully!', 'success');
});

// Rows per page selector
document.getElementById('rowsPerPage').addEventListener('change', (e) => {
    rowsPerPage = parseInt(e.target.value);
    currentPage = 1;
    renderTable();
});

// ==================== MOBILE & WEB CSV EXPORT ====================

/**
 * Universal CSV download function
 * Detects environment and uses appropriate method
 */
function downloadCSV(csv, filename) {
    const isCordova = typeof cordova !== 'undefined' && window.cordova;

    if (isCordova && window.device && window.device.platform === 'Android') {
        // Android: Save to Downloads folder
        saveToDownloadsFolder(csv, filename);
    } else {
        // Web browser: Use browser download
        saveCsvWithBrowser(csv, filename);
    }
}

/**
 * Save to Android Downloads folder: /storage/emulated/0/Download/
 */
function saveToDownloadsFolder(csv, filename) {
    console.log('Saving to Android Downloads folder...');

    // Check if device is ready
    if (document.readyState === 'complete' && window.cordova) {
        executeDownloadsSave(csv, filename);
    } else {
        document.addEventListener('deviceready', function () {
            executeDownloadsSave(csv, filename);
        }, false);
    }
}

/**
 * Execute the actual save operation on Android
 */
function executeDownloadsSave(csv, filename) {
    try {
        // Check if File plugin is available
        if (!window.cordova || !window.cordova.file) {
            console.error('Cordova File plugin not available');
            alert('⚠️ File plugin not available. Please install:\ncordova plugin add cordova-plugin-file');
            return;
        }

        // Log CSV content for debugging
        console.log('CSV content length:', csv.length);
        console.log('CSV preview:', csv.substring(0, 200));

        // ALWAYS use Downloads folder: /storage/emulated/0/Download/
        const directory = cordova.file.externalRootDirectory + 'Download/';
        console.log('Using Downloads folder:', directory);

        window.resolveLocalFileSystemURL(directory, function (dirEntry) {
            console.log('Downloads folder accessed successfully');

            // Add timestamp to filename to avoid overwriting
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            const uniqueFilename = filename.replace('.csv', `_${timestamp}.csv`);

            dirEntry.getFile(uniqueFilename, { create: true, exclusive: false }, function (fileEntry) {
                console.log('File entry created:', fileEntry.toURL());

                fileEntry.createWriter(function (fileWriter) {
                    console.log('File writer created');

                    fileWriter.onwriteend = function () {
                        console.log('CSV file written successfully to Downloads!');
                        console.log('File size:', this.length);

                        const locationMsg = '✅ File saved successfully!\n\n' +
                            '📁 Location: Downloads Folder\n' +
                            '📱 Path: /storage/emulated/0/Download/\n' +
                            `📄 Filename: ${uniqueFilename}\n` +
                            `📊 Size: ${this.length} bytes\n\n` +
                            '💡 Open your file manager and go to Downloads to access the file.';

                        alert(locationMsg);
                        showToast('CSV exported to Downloads folder!', 'success');

                        // Try to open the file automatically
                        if (window.cordova.plugins && window.cordova.plugins.fileOpener2) {
                            cordova.plugins.fileOpener2.open(
                                fileEntry.toURL(),
                                'text/csv',
                                {
                                    error: function (e) {
                                        console.log('Could not auto-open file:', e);
                                    },
                                    success: function () {
                                        console.log('File opened successfully');
                                    }
                                }
                            );
                        }
                    };

                    fileWriter.onerror = function (e) {
                        console.error('FileWriter error details:', e);
                        console.error('Error code:', e.code);
                        console.error('Error message:', e.message);

                        let errorMsg = 'Unknown error';
                        if (e.code === 1) errorMsg = 'NOT_FOUND_ERR';
                        else if (e.code === 2) errorMsg = 'SECURITY_ERR';
                        else if (e.code === 3) errorMsg = 'ABORT_ERR';
                        else if (e.code === 4) errorMsg = 'NOT_READABLE_ERR';
                        else if (e.code === 5) errorMsg = 'ENCODING_ERR';
                        else if (e.code === 6) errorMsg = 'NO_MODIFICATION_ALLOWED_ERR';
                        else if (e.code === 7) errorMsg = 'INVALID_STATE_ERR';
                        else if (e.code === 8) errorMsg = 'SYNTAX_ERR';
                        else if (e.code === 9) errorMsg = 'INVALID_MODIFICATION_ERR';
                        else if (e.code === 10) errorMsg = 'QUOTA_EXCEEDED_ERR';

                        alert('❌ Error saving file to Downloads folder:\n' + errorMsg + ' (Code: ' + e.code + ')');
                        showToast('Error saving CSV file', 'error');
                    };

                    // Create a blob and write it - ENSURE csv variable has content
                    console.log('Creating blob with CSV content...');
                    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                    console.log('Blob created, size:', blob.size);

                    if (blob.size === 0) {
                        console.error('WARNING: Blob size is 0! CSV content is empty');
                        alert('❌ Error: CSV content is empty. Please check if data exists.');
                        return;
                    }

                    console.log('Writing blob to file...');
                    fileWriter.write(blob);

                }, function (error) {
                    console.error('Failed to create file writer:', error);
                    alert('❌ Error creating file writer: ' + (error.code || error.toString()));
                    showToast('Error creating file writer', 'error');
                });
            }, function (error) {
                console.error('Failed to get file:', error);
                alert('❌ Error accessing file in Downloads folder: ' + (error.code || error.toString()));
                showToast('Error accessing Downloads folder', 'error');
            });
        }, function (error) {
            console.error('Failed to resolve Downloads directory:', error);
            alert('❌ Cannot access Downloads folder. Error code: ' + (error.code || error.toString()) + '\n\nPlease check storage permissions.');
            showToast('Cannot access Downloads folder', 'error');
        });

    } catch (error) {
        console.error('Download save error:', error);
        alert('❌ Unexpected error: ' + error.toString());
        showToast('Unexpected error saving file', 'error');
    }
}

/**
 * Save CSV using Browser method (for web browsers)
 */
function saveCsvWithBrowser(csv, filename) {
    try {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });

        // Modern browsers
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        link.style.display = 'none';

        document.body.appendChild(link);
        link.click();

        setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }, 100);

        // Show success message
        setTimeout(() => {
            showToast('CSV export initiated! Check your Downloads folder.', 'success');
        }, 500);

    } catch (error) {
        console.error('Browser CSV Export Error:', error);
        alert('❌ Error downloading file: ' + error.toString());
        showToast('Error downloading CSV file', 'error');
    }
}

// Export to CSV - Updated to use universal download function
document.getElementById('exportBtn').addEventListener('click', () => {
    console.log('Export button clicked');
    console.log('Voters array length:', voters.length);

    if (voters.length === 0) {
        showToast('No data to export!', 'error');
        return;
    }

    const headers = ['Name', 'DOB', 'Age', 'Eligibility', 'Voter ID', 'Phone', 'District', 'City', 'Area', 'Street', 'Pincode', 'Address'];
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

    const filename = `voter_data_${new Date().toISOString().split('T')[0]}.csv`;

    console.log('CSV content created');
    console.log('CSV length:', csvContent.length);
    console.log('CSV preview (first 200 chars):', csvContent.substring(0, 200));
    console.log('Filename:', filename);

    // Use universal download function (works on both web and mobile)
    downloadCSV(csvContent, filename);
});

// ==================== MOBILE & WEB CSV IMPORT ====================

/**
 * Import CSV - Trigger function
 * Called when Import CSV button is clicked
 */
function triggerImportCSV() {
    const isCordova = typeof cordova !== 'undefined' && window.cordova;

    if (isCordova && window.device && window.device.platform === 'Android') {
        // Mobile: Use cordova-plugin-chooser for better file access
        importCSVFromMobile();
    } else {
        // Web: Use standard file input
        document.getElementById('importFile').click();
    }
}

/**
 * Import CSV from Mobile using cordova-plugin-chooser
 */
function importCSVFromMobile() {
    console.log('Mobile CSV import initiated...');

    // Check if chooser plugin is available
    if (!window.chooser) {
        console.error('Chooser plugin not available, falling back to file input');
        alert('⚠️ File chooser not available. Using fallback method...');
        document.getElementById('importFile').click();
        return;
    }

    // Use chooser plugin to select file
    chooser.getFile('text/csv,text/comma-separated-values,application/csv,text/plain', function (file) {
        console.log('File selected:', file);
        console.log('File name:', file.name);
        console.log('File URI:', file.uri);
        console.log('File data type:', typeof file.data);
        console.log('File data length:', file.data ? file.data.length : 'N/A');

        if (!file) {
            console.log('No file selected');
            return;
        }

        try {
            // The chooser plugin returns base64 data in file.data
            if (!file.data) {
                throw new Error('No file data received from file picker');
            }

            let csvText = '';

            // Try multiple decoding methods
            try {
                // Method 1: Direct atob (if data is clean base64)
                console.log('Attempting direct base64 decode...');
                const base64Data = file.data.replace(/\s/g, ''); // Remove whitespace
                csvText = atob(base64Data);
                console.log('Direct decode successful');
            } catch (atobError) {
                console.log('Direct atob failed:', atobError.message);

                try {
                    // Method 2: Remove data URL prefix if present
                    console.log('Attempting to decode with data URL cleanup...');
                    let base64Data = file.data;

                    // Remove data URL prefix (data:text/csv;base64,)
                    if (base64Data.includes(',')) {
                        base64Data = base64Data.split(',')[1];
                        console.log('Removed data URL prefix');
                    }

                    // Clean up the base64 string
                    base64Data = base64Data.replace(/\s/g, '').replace(/[^A-Za-z0-9+/=]/g, '');

                    csvText = atob(base64Data);
                    console.log('Data URL decode successful');
                } catch (dataUrlError) {
                    console.log('Data URL decode failed:', dataUrlError.message);

                    // Method 3: Use Cordova File plugin to read the file directly
                    console.log('Attempting to read file using Cordova File plugin...');
                    readFileFromURI(file.uri, file.name);
                    return; // Exit and let readFileFromURI handle it
                }
            }

            if (!csvText || csvText.length === 0) {
                throw new Error('Decoded CSV text is empty');
            }

            console.log('CSV text decoded, length:', csvText.length);
            console.log('CSV preview:', csvText.substring(0, 200));

            // Process the CSV
            processCSVImport(csvText, file.name);

        } catch (error) {
            console.error('Error processing file:', error);
            alert('❌ Error reading CSV file:\n' + error.message + '\n\nTrying alternative method...');

            // Final fallback: try reading from URI
            if (file.uri) {
                readFileFromURI(file.uri, file.name);
            } else {
                showToast('Error importing CSV file', 'error');
            }
        }
    }, function (error) {
        console.error('Chooser error:', error);
        if (error && error !== 'canceled') {
            alert('❌ Error selecting file: ' + error);
            showToast('Error selecting file', 'error');
        }
    });
}

/**
 * Read file directly from URI using Cordova File plugin
 * Fallback method when base64 decode fails
 */
function readFileFromURI(fileUri, fileName) {
    console.log('Reading file from URI:', fileUri);

    // Check if File plugin is available
    if (!window.resolveLocalFileSystemURL) {
        console.error('File plugin not available');
        alert('❌ Cannot read file. File plugin not available.');
        showToast('File plugin not available', 'error');
        return;
    }

    window.resolveLocalFileSystemURL(fileUri, function (fileEntry) {
        console.log('File entry resolved:', fileEntry.name);

        fileEntry.file(function (file) {
            console.log('Got file object:', file.name, file.size);

            const reader = new FileReader();

            reader.onloadend = function () {
                try {
                    const csvText = this.result;
                    console.log('File read successfully, length:', csvText.length);
                    console.log('CSV preview:', csvText.substring(0, 200));

                    if (!csvText || csvText.length === 0) {
                        throw new Error('File is empty');
                    }

                    // Process the CSV
                    processCSVImport(csvText, fileName);

                } catch (error) {
                    console.error('Error processing file content:', error);
                    alert('❌ Error processing CSV file: ' + error.message);
                    showToast('Error processing CSV file', 'error');
                }
            };

            reader.onerror = function (error) {
                console.error('FileReader error:', error);
                alert('❌ Error reading file: ' + error.toString());
                showToast('Error reading file', 'error');
            };

            // Read file as text
            reader.readAsText(file);

        }, function (error) {
            console.error('Error getting file object:', error);
            alert('❌ Error accessing file: ' + error.code);
            showToast('Error accessing file', 'error');
        });

    }, function (error) {
        console.error('Error resolving file URI:', error);
        alert('❌ Error accessing file URI: ' + error.code);
        showToast('Error accessing file', 'error');
    });
}

/**
 * Process CSV import (common for both web and mobile)
 */
function processCSVImport(csvText, fileName) {
    console.log('Processing CSV import...');
    console.log('CSV text length:', csvText.length);

    try {
        const lines = csvText.split('\n').filter(line => line.trim() !== '');
        console.log('Total lines:', lines.length);

        if (lines.length < 2) {
            throw new Error('CSV file appears to be empty or has no data rows');
        }

        const headers = lines[0].split(',');
        console.log('Headers:', headers);

        const importedVoters = [];

        for (let i = 1; i < lines.length; i++) {
            const values = parseCSVLine(lines[i]);

            if (values.length >= 11) {
                const voter = {
                    name: values[0] || '',
                    dob: values[1] || '',
                    age: values[2] || '',
                    eligibility: values[3] || 'Yes',
                    voterId: values[4] || '',
                    phone: values[5] || '',
                    district: values[6] || '',
                    city: values[7] || '',
                    area: values[8] || '',
                    street: values[9] || '',
                    pincode: values[10] || '',
                    address: values[11] || ''
                };
                importedVoters.push(voter);
            }
        }

        console.log('Imported voters:', importedVoters.length);

        if (importedVoters.length === 0) {
            throw new Error('No valid voter records found in CSV');
        }

        // Confirm before replacing data
        const confirmMsg = `Import ${importedVoters.length} voter records from ${fileName}?\n\n⚠️ This will replace current data.`;

        if (confirm(confirmMsg)) {
            voters = importedVoters;
            currentPage = 1;
            filteredVoters = null;
            searchQuery = '';

            // Clear search input if exists
            const searchInput = document.getElementById('searchVoterInput');
            if (searchInput) searchInput.value = '';

            renderTable();
            saveToStorage();

            alert(`✅ Successfully imported ${importedVoters.length} voter records!`);
            showToast(`Successfully imported ${importedVoters.length} voter records!`, 'success');
        }

    } catch (error) {
        console.error('Error processing CSV:', error);
        alert('❌ Error importing CSV file:\n' + error.message + '\n\nPlease check the file format.');
        showToast('Error importing CSV file', 'error');
    }
}

/**
 * Web browser import using file input
 */
document.getElementById('importFile').addEventListener('change', (e) => {
    const file = e.target.files[0];
    console.log('File input changed:', file);

    if (!file) {
        console.log('No file selected');
        return;
    }

    if (!file.name.toLowerCase().endsWith('.csv')) {
        alert('❌ Please select a CSV file.');
        showToast('Please select a CSV file', 'error');
        e.target.value = '';
        return;
    }

    const reader = new FileReader();

    reader.onload = (event) => {
        try {
            const csvText = event.target.result;
            processCSVImport(csvText, file.name);
        } catch (error) {
            console.error('FileReader error:', error);
            alert('❌ Error reading file: ' + error.message);
            showToast('Error reading CSV file', 'error');
        }
    };

    reader.onerror = (error) => {
        console.error('FileReader error:', error);
        alert('❌ Error reading file. Please try again.');
        showToast('Error reading file', 'error');
    };

    reader.readAsText(file);
    e.target.value = '';
});

// Render table
function renderTable() {
    const tableBody = document.getElementById('tableBody');
    const pagination = document.getElementById('pagination');

    // Use filteredVoters if searching, else voters
    const data = filteredVoters !== null ? filteredVoters : voters;

    if (data.length === 0) {
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

    const totalPages = Math.ceil(data.length / rowsPerPage);
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = Math.min(startIndex + rowsPerPage, data.length);
    const currentVoters = data.slice(startIndex, endIndex);

    tableBody.innerHTML = currentVoters.map((voter, index) => {
        const actualIndex = filteredVoters !== null ? voters.indexOf(voter) : startIndex + index;
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

// Filter voters based on search query
function filterVoters() {
    if (!searchQuery) {
        filteredVoters = null;
        return;
    }
    filteredVoters = voters.filter(voter => {
        return Object.values(voter).some(val =>
            String(val).toLowerCase().includes(searchQuery)
        );
    });
}

// Edit voter - open modal
function editVoter(index) {
    editingIndex = index;
    const voter = voters[index];

    // Fill modal form fields
    document.getElementById('edit_name').value = voter.name;
    document.getElementById('edit_dob').value = voter.dob;
    document.getElementById('edit_age').value = voter.age || '';
    document.getElementById('edit_eligibility').value = voter.eligibility || 'Yes';
    document.getElementById('edit_voterId').value = voter.voterId;
    document.getElementById('edit_phone').value = voter.phone;
    document.getElementById('edit_district').value = voter.district;
    document.getElementById('edit_city').value = voter.city;
    document.getElementById('edit_area').value = voter.area;
    document.getElementById('edit_street').value = voter.street;
    document.getElementById('edit_pincode').value = voter.pincode;
    document.getElementById('edit_address').value = voter.address;

    // Remove validation state
    document.getElementById('editVoterForm').classList.remove('was-validated');

    // Show modal
    document.getElementById('editVoterModal').classList.add('active');
}

// Modal close button
document.getElementById('closeEditModal').addEventListener('click', function () {
    document.getElementById('editVoterModal').classList.remove('active');
});

// Close modal on overlay click (optional, not on modal content)
document.getElementById('editVoterModal').addEventListener('click', function (e) {
    if (e.target === this) {
        this.classList.remove('active');
    }
});

// Calculate age and set eligibility in edit modal
document.getElementById('edit_dob').addEventListener('change', (e) => {
    const dob = new Date(e.target.value);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--;
    }
    document.getElementById('edit_age').value = age;
    // Set eligibility based on age
    const eligibilitySelect = document.getElementById('edit_eligibility');
    if (age >= 18) {
        eligibilitySelect.value = 'Yes';
    } else {
        eligibilitySelect.value = 'No';
    }
});

// Edit voter form submission
document.getElementById('editVoterForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const form = e.target;
    form.classList.add('was-validated');
    if (!form.checkValidity()) {
        showToast('Please fill in all required fields correctly', 'error');
        return;
    }
    if (editingIndex < 0) return;
    const updatedVoter = {
        name: document.getElementById('edit_name').value,
        dob: document.getElementById('edit_dob').value,
        age: document.getElementById('edit_age').value,
        eligibility: document.getElementById('edit_eligibility').value,
        voterId: document.getElementById('edit_voterId').value,
        phone: document.getElementById('edit_phone').value,
        district: document.getElementById('edit_district').value,
        city: document.getElementById('edit_city').value,
        area: document.getElementById('edit_area').value,
        street: document.getElementById('edit_street').value,
        pincode: document.getElementById('edit_pincode').value,
        address: document.getElementById('edit_address').value
    };
    voters[editingIndex] = updatedVoter;
    editingIndex = -1;
    renderTable();
    document.getElementById('editVoterModal').classList.remove('active');
    showToast('Voter record updated successfully!', 'success');
});

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