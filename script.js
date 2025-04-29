// State variables
let classes = [];
let locations = [];
let selectedLocations = [];
let activePrograms = [];

// Program to discipline mapping
const programMap = {
  'Adult BJJ': ['Adult Brazilian Jiu Jitsu'],
  'Adult Striking': ['Adult Striking'],
  'Youth Classes': ['Youth Jiu Jitsu', 'Youth Striking'],
  'MMA Classes': ['Mixed Martial Arts'],
  'Self-Defense': ['Self Defense']
};

// Category to class mapping
const categoryStyles = {
  'Adult BJJ': 'bjj',
  'Adult Striking': 'striking',
  'Youth Classes': 'youth',
  'MMA Classes': 'mma',
  'Self-Defense': 'selfdefense'
};

// Days of the week
const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// DOM Elements
const locationButtonsContainer = document.getElementById('location-buttons');
const programButtonsContainer = document.getElementById('program-buttons');
const scheduleGrid = document.getElementById('schedule-grid');
const errorMessage = document.getElementById('error-message');
const lastUpdated = document.getElementById('last-updated');
const loading = document.getElementById('loading');
const expandCollapseToggle = document.getElementById('expandCollapseToggle');

// Initialize application
function init() {
  // Create day headers for the schedule grid
  createDayHeaders();
  
  // Fetch data
  fetchExcelData();
  
  // Setup expand/collapse toggle
  expandCollapseToggle.addEventListener('change', function() {
    const allCards = document.querySelectorAll('.class-card');
    
    if (this.checked) {
      // Expand all cards
      allCards.forEach(card => card.classList.add('expanded'));
    } else {
      // Collapse all cards
      allCards.forEach(card => card.classList.remove('expanded'));
    }
  });
}

// Create day headers for the schedule grid
function createDayHeaders() {
  // Add day headers
  days.forEach(day => {
    const dayHeader = document.createElement('div');
    dayHeader.className = 'day-header';
    dayHeader.textContent = day;
    scheduleGrid.appendChild(dayHeader);
  });
  
  // Add day columns
  days.forEach(day => {
    const dayColumn = document.createElement('div');
    dayColumn.className = 'day-column';
    dayColumn.id = `day-${day.toLowerCase()}`;
    scheduleGrid.appendChild(dayColumn);
  });
}

// Fetch data from Excel file
async function fetchExcelData() {
  // Show loading indicator
  loading.style.display = 'flex';
  scheduleGrid.style.display = 'none';
  errorMessage.classList.remove('visible');
  
  try {
    // Fetch the Excel file
    const response = await fetch('StoutPGH_Schedule.xlsx');
    if (!response.ok) {
      throw new Error(`Failed to fetch schedule data (Status: ${response.status})`);
    }
    
    const data = await response.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(data), {type: 'array', cellDates: true});
    
    // Get first sheet
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Extract update date from cell B1
    const updateDateCell = worksheet['B1'];
    const updateDate = updateDateCell ? updateDateCell.v : '';
    
    // Extract schedule data starting from the header row (row 3)
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {range: 2});
    
    // Process data and update UI
    processData(jsonData, updateDate);
    
  } catch (error) {
    console.error('Error fetching Excel data:', error);
    showError(`Could not load schedule data: ${error.message}`);
    loading.style.display = 'none';
  }
}

// Process the loaded data
function processData(data, updateDate) {
  // Convert Excel data to our expected format
  classes = data.map(item => ({
    Class: item.Class || '',
    Discipline: item['Discipline(s)'] || '',
    Day: item.Day || '',
    Time: item.Time || '',
    Location: item.Location || '',
    'Gi / No Gi': item['Apparel Format'] || '',
    Details: item.Details || '',
    Requisites: item.Requisites || ''
  }));
  
  // Extract unique locations
  locations = [...new Set(classes
    .filter(item => item.Location && item.Location.trim() !== '')
    .map(item => item.Location))];
  
  // Set initial selected location to Strip District, if available
  if (selectedLocations.length === 0) {
    const stripDistrict = locations.find(loc => loc === 'Strip District');
    selectedLocations = stripDistrict ? [stripDistrict] : locations.length > 0 ? [locations[0]] : [];
  }
  
  // Update last updated timestamp
  lastUpdated.textContent = `Last updated: ${updateDate || 'Unknown'}`;
  
  // Hide loading indicator
  loading.style.display = 'none';
  scheduleGrid.style.display = 'grid';
  
  // Render UI components
  renderLocationButtons();
  renderProgramButtons();
  renderSchedule();
}

// Render location filter buttons
function renderLocationButtons() {
  locationButtonsContainer.innerHTML = '';
  
  locations.forEach(location => {
    const button = document.createElement('button');
    button.className = `filter-button ${selectedLocations.includes(location) ? 'active' : ''}`;
    button.textContent = location;
    
    button.addEventListener('click', () => {
      if (selectedLocations.includes(location)) {
        // Don't allow deselecting all locations
        if (selectedLocations.length > 1) {
          selectedLocations = selectedLocations.filter(loc => loc !== location);
        }
      } else {
        selectedLocations.push(location);
      }
      
      renderLocationButtons();
      renderSchedule();
    });
    
    locationButtonsContainer.appendChild(button);
  });
}

// Render program filter buttons
function renderProgramButtons() {
  programButtonsContainer.innerHTML = '';
  
  Object.keys(programMap).forEach(program => {
    const button = document.createElement('button');
    button.className = `filter-button ${activePrograms.includes(program) ? 'active' : ''}`;
    button.textContent = program;
    
    button.addEventListener('click', () => {
      if (activePrograms.includes(program)) {
        activePrograms = activePrograms.filter(p => p !== program);
      } else {
        activePrograms.push(program);
      }
      
      renderProgramButtons();
      renderSchedule();
    });
    
    programButtonsContainer.appendChild(button);
  });
}

// Check if a class should be visible based on filters
function isClassVisible(classItem) {
  // Check location
  if (!selectedLocations.includes(classItem.Location)) {
    return false;
  }
  
  // If no program filters active, show all classes
  if (activePrograms.length === 0) {
    return true;
  }
  
  // Check program match
  return activePrograms.some(program => {
    const disciplines = programMap[program] || [];
    return disciplines.some(discipline => 
      classItem.Discipline === discipline || 
      (typeof classItem.Discipline === 'string' && classItem.Discipline.includes(discipline))
    );
  });
}

// Get the CSS class for category styling
function getCategoryClass(classItem) {
  let categoryClass = '';
  
  Object.entries(programMap).forEach(([program, disciplines]) => {
    const isMatch = disciplines.some(discipline => 
      classItem.Discipline === discipline || 
      (typeof classItem.Discipline === 'string' && classItem.Discipline.includes(discipline))
    );
    
    if (isMatch) {
      categoryClass = categoryStyles[program] || '';
    }
  });
  
  return categoryClass;
}

// Format time (handles both "7:30 AM" and "07:30" formats)
function formatTime(time) {
  if (!time) return '';
  
  // Return the time directly if it already includes AM/PM
  if (time.includes('AM') || time.includes('PM')) {
    return time;
  }
  
  // Handle 24-hour format
  if (time.includes(':')) {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    
    return `${hour12}:${minutes || '00'} ${ampm}`;
  }
  
  // Return original if can't parse
  return time;
}

// Convert time to minutes for sorting
function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  
  // Ensure we're working with a string
  const timeString = String(timeStr);
  
  let hours = 0;
  let minutes = 0;
  let isPM = false;
  
  // Check if time is in 12-hour format with AM/PM
  if (timeString.includes('AM') || timeString.includes('PM')) {
    isPM = timeString.includes('PM');
    const timePart = timeString.replace(/\s*(AM|PM).*/, '');
    if (timePart.includes(':')) {
      const parts = timePart.split(':');
      hours = parseInt(parts[0], 10) || 0;
      minutes = parseInt(parts[1], 10) || 0;
    } else {
      hours = parseInt(timePart, 10) || 0;
    }
    
    // Adjust for PM
    if (isPM && hours < 12) {
      hours += 12;
    }
    // Adjust for 12 AM
    if (!isPM && hours === 12) {
      hours = 0;
    }
  } 
  // Handle 24-hour format
  else if (timeString.includes(':')) {
    const parts = timeString.split(':');
    hours = parseInt(parts[0], 10) || 0;
    minutes = parseInt(parts[1], 10) || 0;
  }
  
  return hours * 60 + minutes;
}

// Render the schedule
function renderSchedule() {
  // Clear existing classes
  days.forEach(day => {
    const dayColumn = document.getElementById(`day-${day.toLowerCase()}`);
    dayColumn.innerHTML = '';
  });
  
  // Populate each day
  days.forEach(day => {
    const dayColumn = document.getElementById(`day-${day.toLowerCase()}`);
    const dayClasses = classes.filter(c => c.Day === day && isClassVisible(c))
      .sort((a, b) => {
        // Sort by time - convert to minutes for proper chronological order
        return timeToMinutes(a.Time) - timeToMinutes(b.Time);
      });
    
    if (dayClasses.length === 0) {
      const noClasses = document.createElement('div');
      noClasses.className = 'no-classes';
      noClasses.textContent = 'No classes';
      dayColumn.appendChild(noClasses);
    } else {
      dayClasses.forEach(classItem => {
        const classCard = createClassCard(classItem);
        dayColumn.appendChild(classCard);
      });
    }
  });
}

// Create a class card element
function createClassCard(classItem) {
  const card = document.createElement('div');
  card.className = `class-card ${getCategoryClass(classItem)}`;
  
  // Time
  const timeElem = document.createElement('div');
  timeElem.className = 'class-time';
  
  const clockIcon = document.createElement('span');
  clockIcon.className = 'clock-icon';
  timeElem.appendChild(clockIcon);
  
  const timeText = document.createElement('span');
  timeText.textContent = formatTime(classItem.Time);
  timeElem.appendChild(timeText);
  
  // Class name
  const nameElem = document.createElement('div');
  nameElem.className = 'class-name';
  nameElem.textContent = classItem.Class;
  
  // Location
  const locationElem = document.createElement('div');
  locationElem.className = 'class-location';
  locationElem.textContent = classItem.Location;
  
  // Add main elements to card
  card.appendChild(timeElem);
  card.appendChild(nameElem);
  card.appendChild(locationElem);
  
  // Create expandable details section
  const details = document.createElement('div');
  details.className = 'class-details';
  
  // Add details content
  if (classItem['Gi / No Gi']) {
    const giNoGiRow = document.createElement('div');
    giNoGiRow.className = 'details-row';
    giNoGiRow.innerHTML = `<span class="details-label">Apparel:</span> ${classItem['Gi / No Gi']}`;
    details.appendChild(giNoGiRow);
  }
  
  if (classItem.Discipline) {
    const disciplineRow = document.createElement('div');
    disciplineRow.className = 'details-row';
    disciplineRow.innerHTML = `<span class="details-label">Discipline:</span> ${classItem.Discipline}`;
    details.appendChild(disciplineRow);
  }
  
  if (classItem.Details) {
    const detailsRow = document.createElement('div');
    detailsRow.className = 'details-row';
    detailsRow.innerHTML = `<span class="details-label">Details:</span> ${classItem.Details}`;
    details.appendChild(detailsRow);
  }
  
  if (classItem.Requisites) {
    const requisitesRow = document.createElement('div');
    requisitesRow.className = 'details-row';
    requisitesRow.innerHTML = `<span class="details-label">Requirements:</span> ${classItem.Requisites}`;
    details.appendChild(requisitesRow);
  }
  
  // Add details to card
  card.appendChild(details);
  
  // Add click event for expanding/collapsing
  card.addEventListener('click', function() {
    this.classList.toggle('expanded');
  });
  
  return card;
}

// Show error message
function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.add('visible');
}

// Initialize the application when the DOM is ready
document.addEventListener('DOMContentLoaded', init);