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

// DOM Elements - with error checking
const locationButtonsContainer = document.getElementById('location-buttons') || document.createElement('div');
const programButtonsContainer = document.getElementById('program-buttons') || document.createElement('div');
const scheduleGrid = document.getElementById('schedule-grid') || document.createElement('div');
const errorMessage = document.getElementById('error-message') || document.createElement('div');
const lastUpdated = document.getElementById('last-updated') || document.createElement('div');
const refreshButton = document.getElementById('refresh-button') || document.createElement('button');
const expandCollapseToggle = document.getElementById('expandCollapseToggle') || document.createElement('input');

// Check for missing elements and show console warnings
if (!document.getElementById('location-buttons')) console.warn('Missing element: location-buttons');
if (!document.getElementById('program-buttons')) console.warn('Missing element: program-buttons');
if (!document.getElementById('schedule-grid')) console.warn('Missing element: schedule-grid');
if (!document.getElementById('error-message')) console.warn('Missing element: error-message');
if (!document.getElementById('last-updated')) console.warn('Missing element: last-updated');
if (!document.getElementById('refresh-button')) console.warn('Missing element: refresh-button');
if (!document.getElementById('expandCollapseToggle')) console.warn('Missing element: expandCollapseToggle');

// Initialize application
function init() {
  try {
    // Make sure the schedule grid exists
    if (!document.getElementById('schedule-grid')) {
      console.error('Required element #schedule-grid not found in the document');
      alert('Error initializing application: Schedule grid element not found.');
      return;
    }
    
    // Create day headers for the schedule grid
    createDayHeaders();
    
    // Fetch data
    fetchData();
    
    // Set up refresh button
    if (refreshButton) {
      refreshButton.addEventListener('click', fetchData);
    }
    
    // Set up expand/collapse toggle
    if (expandCollapseToggle && expandCollapseToggle.tagName === 'INPUT') {
      expandCollapseToggle.addEventListener('change', function() {
        const allEvents = document.querySelectorAll('.class-card');
        
        if (this.checked) {
          // Expand all events
          allEvents.forEach(event => {
            event.classList.add('expanded');
          });
        } else {
          // Collapse all events
          allEvents.forEach(event => {
            event.classList.remove('expanded');
          });
        }
      });
    }
    
    // Check for responsive layout changes
    window.addEventListener('resize', checkResponsiveLayout);
    checkResponsiveLayout(); // Initial check
  } catch (error) {
    console.error('Error initializing application:', error);
    if (errorMessage) {
      errorMessage.textContent = 'Error initializing application: ' + error.message;
      errorMessage.classList.add('visible');
    } else {
      alert('Error initializing application: ' + error.message);
    }
  }
}

// Check for responsive layout changes
function checkResponsiveLayout() {
  const container = document.querySelector('.container');
  if (!container) {
    console.warn('Container element not found');
    return;
  }
  
  const containerWidth = container.offsetWidth;
  const gridContainer = document.getElementById('schedule-grid');
  
  if (!gridContainer) {
    console.warn('Schedule grid element not found');
    return;
  }
  
  if (containerWidth < 768) {
    // Switch to single column layout
    gridContainer.classList.add('responsive-layout');
    
    // If we just switched, re-render
    if (!gridContainer.classList.contains('already-responsive')) {
      gridContainer.classList.add('already-responsive');
      renderSchedule();
    }
  } else {
    // Switch to multi-column layout
    gridContainer.classList.remove('responsive-layout');
    
    // If we just switched, re-render
    if (gridContainer.classList.contains('already-responsive')) {
      gridContainer.classList.remove('already-responsive');
      renderSchedule();
    }
  }
}

// Create day headers for the schedule grid
function createDayHeaders() {
  // Clear the schedule grid
  if (scheduleGrid) {
    scheduleGrid.innerHTML = '';
    
    if (!scheduleGrid.classList.contains('responsive-layout')) {
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
  }
}

// Fetch data from Excel file
async function fetchData() {
  try {
    // Show loading state
    if (errorMessage) {
      errorMessage.classList.remove('visible');
    }
    
    // Try different file paths
    const filePaths = [
      './StoutPGH_Schedule.xlsx',
      '/StoutPGH_Schedule.xlsx',
      'StoutPGH_Schedule.xlsx',
      '/StoutPGH-Schedule/StoutPGH_Schedule.xlsx'
    ];
    
    let excelData = null;
    let pathIndex = 0;
    let errorsList = [];
    
    // Try each path until one works
    while (excelData === null && pathIndex < filePaths.length) {
      try {
        console.log(`Attempting to load from: ${filePaths[pathIndex]}`);
        const response = await fetch(filePaths[pathIndex]);
        if (response.ok) {
          excelData = await response.arrayBuffer();
          console.log(`Successfully loaded data from: ${filePaths[pathIndex]}`);
        } else {
          errorsList.push(`HTTP ${response.status} from ${filePaths[pathIndex]}`);
          pathIndex++;
        }
      } catch (error) {
        console.error(`Failed to load from ${filePaths[pathIndex]}:`, error);
        errorsList.push(`${error.message} from ${filePaths[pathIndex]}`);
        pathIndex++;
      }
    }
    
    if (excelData === null) {
      throw new Error(`Could not find the Excel file. Tried: ${errorsList.join(', ')}`);
    }
    
    // Parse Excel data using SheetJS
    console.log('Parsing Excel data...');
    const workbook = XLSX.read(new Uint8Array(excelData), {
      type: 'array',
      cellDates: true,
      cellStyles: true
    });
    
    console.log('Available sheets:', workbook.SheetNames);
    
    // Get the first sheet
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Convert to JSON
    console.log('Converting worksheet to JSON...');
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      raw: true,
      dateNF: 'yyyy-mm-dd',
      defval: '' // Default value for empty cells
    });
    
    console.log('JSON data from Excel:', jsonData.slice(0, 2)); // Log first two items
    
    // Process the data
    processData(jsonData);
    
  } catch (error) {
    console.error('Error fetching data:', error);
    showError('Error loading the schedule: ' + error.message);
  }
}

// Process the loaded data
function processData(data) {
  try {
    console.log('Raw data from Excel:', data);
    
    // Clean and normalize the data
    classes = data.map(item => {
      // Create a new object with default values for all properties
      const cleanItem = {
        Class: item.Class || 'Unknown Class',
        Discipline: item.Discipline || '',
        Day: item.Day || 'Unknown',
        Time: item.Time || '',
        Location: item.Location || 'Unknown',
        'Gi / No Gi': item['Gi / No Gi'] || '',
        Details: item.Details || ''
      };
      return cleanItem;
    });
    
    console.log('Processed class data:', classes);
    
    // Extract unique locations - handle potential nulls
    locations = [...new Set(classes
      .filter(item => item.Location && item.Location.trim() !== '')
      .map(item => item.Location))];
    
    console.log('Available locations:', locations);
    
    // Set initial selected location to Strip District, if available
    if (selectedLocations.length === 0) {
      const stripDistrict = locations.find(loc => loc === 'Strip District');
      selectedLocations = stripDistrict ? [stripDistrict] : locations.length > 0 ? [locations[0]] : [];
      console.log('Initial selected locations:', selectedLocations);
    }
    
    // Update last updated timestamp
    if (lastUpdated) {
      lastUpdated.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
    }
    
    // Render UI components
    renderLocationButtons();
    renderProgramButtons();
    renderSchedule();
  } catch (error) {
    console.error('Error processing data:', error);
    showError('Error processing data: ' + error.message);
  }
}

// Render location filter buttons
function renderLocationButtons() {
  if (!locationButtonsContainer) return;
  
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
  if (!programButtonsContainer) return;
  
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
  if (!classItem) return false;
  
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
    return disciplines.some(discipline => {
      if (!classItem.Discipline) return false;
      
      return classItem.Discipline === discipline || 
        (typeof classItem.Discipline === 'string' && classItem.Discipline.includes(discipline));
    });
  });
}

// Get the CSS class for category styling
function getCategoryClass(classItem) {
  if (!classItem || !classItem.Discipline) {
    return '';
  }
  
  let categoryClass = '';
  
  Object.entries(programMap).forEach(([program, disciplines]) => {
    const isMatch = disciplines.some(discipline => {
      if (!classItem.Discipline) return false;
      
      return classItem.Discipline === discipline || 
        (typeof classItem.Discipline === 'string' && classItem.Discipline.includes(discipline));
    });
    
    if (isMatch) {
      categoryClass = categoryStyles[program] || '';
    }
  });
  
  return categoryClass;
}

// Format time (handles both "7:30 AM" and "07:30" formats)
function formatTime(time) {
  if (!time) return '';
  
  // If it's a date object (from Excel)
  if (time instanceof Date) {
    const hours = time.getHours();
    const minutes = time.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    const minuteStr = minutes < 10 ? `0${minutes}` : minutes;
    
    return `${hour12}:${minuteStr} ${ampm}`;
  }
  
  // Return the time directly if it already includes AM/PM
  if (typeof time === 'string' && (time.includes('AM') || time.includes('PM'))) {
    return time;
  }
  
  // Handle 24-hour format
  if (typeof time === 'string' && time.includes(':')) {
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
  
  // If it's a date object (from Excel)
  if (timeStr instanceof Date) {
    return timeStr.getHours() * 60 + timeStr.getMinutes();
  }
  
  // Handle string format
  if (typeof timeStr === 'string') {
    let hours = 0;
    let minutes = 0;
    let isPM = false;
    
    // Check if time is in 12-hour format with AM/PM
    if (timeStr.includes('AM') || timeStr.includes('PM')) {
      isPM = timeStr.includes('PM');
      const timePart = timeStr.replace(/\s*(AM|PM).*/, '');
      if (timePart.includes(':')) {
        [hours, minutes] = timePart.split(':').map(num => parseInt(num, 10));
      } else {
        hours = parseInt(timePart, 10);
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
    else if (timeStr.includes(':')) {
      [hours, minutes] = timeStr.split(':').map(num => parseInt(num, 10));
    }
    
    return hours * 60 + minutes;
  }
  
  return 0;
}

// Render the schedule
function renderSchedule() {
  if (!scheduleGrid) return;
  
  // Get responsive state
  const isResponsive = scheduleGrid.classList.contains('responsive-layout');
  
  // For desktop layout
  if (!isResponsive) {
    renderDesktopSchedule();
  } else {
    // For responsive layout
    renderResponsiveSchedule();
  }
}

// Render desktop schedule (7 columns)
function renderDesktopSchedule() {
  // Clear existing classes
  days.forEach(day => {
    const dayColumn = document.getElementById(`day-${day.toLowerCase()}`);
    if (dayColumn) {
      dayColumn.innerHTML = '';
    }
  });
  
  // Populate each day
  days.forEach(day => {
    const dayColumn = document.getElementById(`day-${day.toLowerCase()}`);
    if (!dayColumn) return;
    
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

// Render responsive schedule (single column)
function renderResponsiveSchedule() {
  // Clear existing content
  scheduleGrid.innerHTML = '';
  
  // Process each day
  days.forEach(day => {
    const dayClasses = classes.filter(c => c.Day === day && isClassVisible(c))
      .sort((a, b) => {
        // Sort by time - convert to minutes for proper chronological order
        return timeToMinutes(a.Time) - timeToMinutes(b.Time);
      });
    
    if (dayClasses.length === 0) return;
    
    // Create day section
    const daySection = document.createElement('div');
    daySection.className = 'day-section';
    
    // Create day header
    const dayHeader = document.createElement('div');
    dayHeader.className = 'day-header';
    dayHeader.textContent = day;
    daySection.appendChild(dayHeader);
    
    // Create content container
    const dayContent = document.createElement('div');
    dayContent.className = 'day-content';
    
    // Add classes to container
    dayClasses.forEach(classItem => {
      const classCard = createClassCard(classItem);
      dayContent.appendChild(classCard);
    });
    
    daySection.appendChild(dayContent);
    scheduleGrid.appendChild(daySection);
  });
}

// Create a class card element
function createClassCard(classItem) {
  try {
    // Validate the input
    if (!classItem) {
      console.warn('Attempted to create class card with null/undefined item');
      return document.createElement('div'); // Return empty div
    }
    
    const card = document.createElement('div');
    card.className = `class-card ${getCategoryClass(classItem)}`;
    
    // Time
    const timeElem = document.createElement('div');
    timeElem.className = 'class-time';
    
    const clockIcon = document.createElement('span');
    clockIcon.className = 'clock-icon';
    timeElem.appendChild(clockIcon);
    
    const timeText = document.createElement('span');
    timeText.textContent = formatTime(classItem.Time) || 'Time not specified';
    timeElem.appendChild(timeText);
    
    // Class name
    const nameElem = document.createElement('div');
    nameElem.className = 'class-name';
    nameElem.textContent = classItem.Class || 'Unnamed Class';
    
    // Location
    const locationElem = document.createElement('div');
    locationElem.className = 'class-location';
    locationElem.textContent = classItem.Location || 'Location not specified';
    
    // Add main elements to card
    card.appendChild(timeElem);
    card.appendChild(nameElem);
    card.appendChild(locationElem);
    
    // Add detailed information section (initially hidden)
    const detailsElem = document.createElement('div');
    detailsElem.className = 'class-details';
    
    // Add detailed information - handle potential nulls
    const discipline = classItem.Discipline || 'Not specified';
    const giNoGi = classItem['Gi / No Gi'] || '';
    const details = classItem.Details || '';
    
    // Build HTML content
    let detailsHTML = `<div><strong>Discipline:</strong> ${discipline}</div>`;
    
    if (giNoGi) {
      detailsHTML += `<div><strong>Gi/NoGi:</strong> ${giNoGi}</div>`;
    }
    
    if (details) {
      detailsHTML += `<div><strong>Details:</strong> ${details}</div>`;
    }
    
    detailsElem.innerHTML = detailsHTML;
    card.appendChild(detailsElem);
    
    // Add click event for expand/collapse
    card.addEventListener('click', function() {
      this.classList.toggle('expanded');
    });
    
    return card;
  } catch (error) {
    console.error('Error creating class card:', error, classItem);
    // Return empty div as fallback
    return document.createElement('div');
  }
}

// Show error message
function showError(message) {
  if (errorMessage) {
    errorMessage.textContent = message;
    errorMessage.classList.add('visible');
  } else {
    console.error('Error:', message);
    alert('Error: ' + message);
  }
}

// Initialize the application when the DOM is ready
document.addEventListener('DOMContentLoaded', init);
 Striking'],
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

// DOM Elements - with error checking
const locationButtonsContainer = document.getElementById('location-buttons') || document.createElement('div');
const programButtonsContainer = document.getElementById('program-buttons') || document.createElement('div');
const scheduleGrid = document.getElementById('schedule-grid') || document.createElement('div');
const errorMessage = document.getElementById('error-message') || document.createElement('div');
const lastUpdated = document.getElementById('last-updated') || document.createElement('div');
const refreshButton = document.getElementById('refresh-button') || document.createElement('button');
const expandCollapseToggle = document.getElementById('expandCollapseToggle') || document.createElement('input');

// Check for missing elements and show console warnings
if (!document.getElementById('location-buttons')) console.warn('Missing element: location-buttons');
if (!document.getElementById('program-buttons')) console.warn('Missing element: program-buttons');
if (!document.getElementById('schedule-grid')) console.warn('Missing element: schedule-grid');
if (!document.getElementById('error-message')) console.warn('Missing element: error-message');
if (!document.getElementById('last-updated')) console.warn('Missing element: last-updated');
if (!document.getElementById('refresh-button')) console.warn('Missing element: refresh-button');
if (!document.getElementById('expandCollapseToggle')) console.warn('Missing element: expandCollapseToggle'); Striking'],
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

// DOM Elements - with error checking
const locationButtonsContainer = document.getElementById('location-buttons') || document.createElement('div');
const programButtonsContainer = document.getElementById('program-buttons') || document.createElement('div');
const scheduleGrid = document.getElementById('schedule-grid') || document.createElement('div');
const errorMessage = document.getElementById('error-message') || document.createElement('div');
const lastUpdated = document.getElementById('last-updated') || document.createElement('div');
const refreshButton = document.getElementById('refresh-button') || document.createElement('button');
const expandCollapseToggle = document.getElementById('expandCollapseToggle') || document.createElement('input');

// Check for missing elements and show console warnings
if (!document.getElementById('location-buttons')) console.warn('Missing element: location-buttons');
if (!document.getElementById('program-buttons')) console.warn('Missing element: program-buttons');
if (!document.getElementById('schedule-grid')) console.warn('Missing element: schedule-grid');
if (!document.getElementById('error-message')) console.warn('Missing element: error-message');
if (!document.getElementById('last-updated')) console.warn('Missing element: last-updated');
if (!document.getElementById('refresh-button')) console.warn('Missing element: refresh-button');
if (!document.getElementById('expandCollapseToggle')) console.warn('Missing element: expandCollapseToggle');

// Initialize application
function init() {
  try {
    // Make sure the schedule grid exists
    if (!document.getElementById('schedule-grid')) {
      console.error('Required element #schedule-grid not found in the document');
      alert('Error initializing application: Schedule grid element not found.');
      return;
    }
    
    // Create day headers for the schedule grid
    createDayHeaders();
    
    // Fetch data
    fetchData();
    
    // Set up refresh button
    if (refreshButton) {
      refreshButton.addEventListener('click', fetchData);
    }
    
    // Set up expand/collapse toggle
    if (expandCollapseToggle && expandCollapseToggle.tagName === 'INPUT') {
      expandCollapseToggle.addEventListener('change', function() {
        const allEvents = document.querySelectorAll('.class-card');
        
        if (this.checked) {
          // Expand all events
          allEvents.forEach(event => {
            event.classList.add('expanded');
          });
        } else {
          // Collapse all events
          allEvents.forEach(event => {
            event.classList.remove('expanded');
          });
        }
      });
    }
    
    // Check for responsive layout changes
    window.addEventListener('resize', checkResponsiveLayout);
    checkResponsiveLayout(); // Initial check
  } catch (error) {
    console.error('Error initializing application:', error);
    if (errorMessage) {
      errorMessage.textContent = 'Error initializing application: ' + error.message;
      errorMessage.classList.add('visible');
    } else {
      alert('Error initializing application: ' + error.message);
    }
  }
}

// Create day headers for the schedule grid
function createDayHeaders() {
  // Clear the schedule grid
  scheduleGrid.innerHTML = '';
  
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

// Check if we should switch to responsive layout
function checkResponsiveLayout() {
  const containerWidth = document.querySelector('.container').offsetWidth;
  const gridContainer = document.getElementById('schedule-grid');
  
  if (containerWidth < 768) {
    // Switch to single column layout
    gridContainer.classList.add('responsive-layout');
    
    // If we just switched, re-render
    if (!gridContainer.classList.contains('already-responsive')) {
      gridContainer.classList.add('already-responsive');
      renderSchedule();
    }
  } else {
    // Switch to multi-column layout
    gridContainer.classList.remove('responsive-layout');
    
    // If we just switched, re-render
    if (gridContainer.classList.contains('already-responsive')) {
      gridContainer.classList.remove('already-responsive');
      renderSchedule();
    }
  }
}

// Fetch data from Excel file
async function fetchData() {
  try {
    // Show loading state
    if (errorMessage) {
      errorMessage.classList.remove('visible');
    }
    
    // Try different file paths
    const filePaths = [
      './StoutPGH_Schedule.xlsx',
      '/StoutPGH_Schedule.xlsx',
      'StoutPGH_Schedule.xlsx',
      '/StoutPGH-Schedule/StoutPGH_Schedule.xlsx'
    ];
    
    let excelData = null;
    let pathIndex = 0;
    let errorsList = [];
    
    // Try each path until one works
    while (excelData === null && pathIndex < filePaths.length) {
      try {
        console.log(`Attempting to load from: ${filePaths[pathIndex]}`);
        const response = await fetch(filePaths[pathIndex]);
        if (response.ok) {
          excelData = await response.arrayBuffer();
          console.log(`Successfully loaded data from: ${filePaths[pathIndex]}`);
        } else {
          errorsList.push(`HTTP ${response.status} from ${filePaths[pathIndex]}`);
          pathIndex++;
        }
      } catch (error) {
        console.error(`Failed to load from ${filePaths[pathIndex]}:`, error);
        errorsList.push(`${error.message} from ${filePaths[pathIndex]}`);
        pathIndex++;
      }
    }
    
    if (excelData === null) {
      throw new Error(`Could not find the Excel file. Tried: ${errorsList.join(', ')}`);
    }
    
    // Parse Excel data using SheetJS
    console.log('Parsing Excel data...');
    const workbook = XLSX.read(new Uint8Array(excelData), {
      type: 'array',
      cellDates: true,
      cellStyles: true
    });
    
    console.log('Available sheets:', workbook.SheetNames);
    
    // Get the first sheet
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Convert to JSON
    console.log('Converting worksheet to JSON...');
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      raw: true,
      dateNF: 'yyyy-mm-dd',
      defval: '' // Default value for empty cells
    });
    
    console.log('JSON data from Excel:', jsonData.slice(0, 2)); // Log first two items
    
    // Process the data
    processData(jsonData);
    
  } catch (error) {
    console.error('Error fetching data:', error);
    showError('Error loading the schedule: ' + error.message);
  }
}

// Process the loaded data
function processData(data) {
  try {
    console.log('Raw data from Excel:', data);
    
    // Clean and normalize the data
    classes = data.map(item => {
      // Create a new object with default values for all properties
      const cleanItem = {
        Class: item.Class || 'Unknown Class',
        Discipline: item.Discipline || '',
        Day: item.Day || 'Unknown',
        Time: item.Time || '',
        Location: item.Location || 'Unknown',
        'Gi / No Gi': item['Gi / No Gi'] || '',
        Details: item.Details || ''
      };
      return cleanItem;
    });
    
    console.log('Processed class data:', classes);
    
    // Extract unique locations - handle potential nulls
    locations = [...new Set(classes
      .filter(item => item.Location && item.Location.trim() !== '')
      .map(item => item.Location))];
    
    console.log('Available locations:', locations);
    
    // Set initial selected location to Strip District, if available
    if (selectedLocations.length === 0) {
      const stripDistrict = locations.find(loc => loc === 'Strip District');
      selectedLocations = stripDistrict ? [stripDistrict] : locations.length > 0 ? [locations[0]] : [];
      console.log('Initial selected locations:', selectedLocations);
    }
    
    // Update last updated timestamp
    if (lastUpdated) {
      lastUpdated.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
    }
    
    // Render UI components
    renderLocationButtons();
    renderProgramButtons();
    renderSchedule();
  } catch (error) {
    console.error('Error processing data:', error);
    showError('Error processing data: ' + error.message);
  }
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
  if (!classItem || !classItem.Discipline) {
    return '';
  }
  
  let categoryClass = '';
  
  Object.entries(programMap).forEach(([program, disciplines]) => {
    const isMatch = disciplines.some(discipline => {
      if (!classItem.Discipline) return false;
      
      return classItem.Discipline === discipline || 
        (typeof classItem.Discipline === 'string' && classItem.Discipline.includes(discipline));
    });
    
    if (isMatch) {
      categoryClass = categoryStyles[program] || '';
    }
  });
  
  return categoryClass;
}

// Format time (handles both "7:30 AM" and "07:30" formats)
function formatTime(time) {
  if (!time) return '';
  
  // If it's a date object (from Excel)
  if (time instanceof Date) {
    const hours = time.getHours();
    const minutes = time.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    const minuteStr = minutes < 10 ? `0${minutes}` : minutes;
    
    return `${hour12}:${minuteStr} ${ampm}`;
  }
  
  // Return the time directly if it already includes AM/PM
  if (typeof time === 'string' && (time.includes('AM') || time.includes('PM'))) {
    return time;
  }
  
  // Handle 24-hour format
  if (typeof time === 'string' && time.includes(':')) {
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
  
  // If it's a date object (from Excel)
  if (timeStr instanceof Date) {
    return timeStr.getHours() * 60 + timeStr.getMinutes();
  }
  
  // Handle string format
  if (typeof timeStr === 'string') {
    let hours = 0;
    let minutes = 0;
    let isPM = false;
    
    // Check if time is in 12-hour format with AM/PM
    if (timeStr.includes('AM') || timeStr.includes('PM')) {
      isPM = timeStr.includes('PM');
      const timePart = timeStr.replace(/\s*(AM|PM).*/, '');
      if (timePart.includes(':')) {
        [hours, minutes] = timePart.split(':').map(num => parseInt(num, 10));
      } else {
        hours = parseInt(timePart, 10);
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
    else if (timeStr.includes(':')) {
      [hours, minutes] = timeStr.split(':').map(num => parseInt(num, 10));
    }
    
    return hours * 60 + minutes;
  }
  
  return 0;
}

// Render the schedule
function renderSchedule() {
  // Get responsive state
  const isResponsive = scheduleGrid.classList.contains('responsive-layout');
  
  // For desktop layout
  if (!isResponsive) {
    renderDesktopSchedule();
  } else {
    // For responsive layout
    renderResponsiveSchedule();
  }
}

// Render desktop schedule (7 columns)
function renderDesktopSchedule() {
  // Clear existing classes
  days.forEach(day => {
    const dayColumn = document.getElementById(`day-${day.toLowerCase()}`);
    if (dayColumn) {
      dayColumn.innerHTML = '';
    }
  });
  
  // Populate each day
  days.forEach(day => {
    const dayColumn = document.getElementById(`day-${day.toLowerCase()}`);
    if (!dayColumn) return;
    
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

// Render responsive schedule (single column)
function renderResponsiveSchedule() {
  // Clear existing content
  scheduleGrid.innerHTML = '';
  
  // Process each day
  days.forEach(day => {
    const dayClasses = classes.filter(c => c.Day === day && isClassVisible(c))
      .sort((a, b) => {
        // Sort by time - convert to minutes for proper chronological order
        return timeToMinutes(a.Time) - timeToMinutes(b.Time);
      });
    
    if (dayClasses.length === 0) return;
    
    // Create day section
    const daySection = document.createElement('div');
    daySection.className = 'day-section';
    
    // Create day header
    const dayHeader = document.createElement('div');
    dayHeader.className = 'day-header';
    dayHeader.textContent = day;
    daySection.appendChild(dayHeader);
    
    // Create content container
    const dayContent = document.createElement('div');
    dayContent.className = 'day-content';
    
    // Add classes to container
    dayClasses.forEach(classItem => {
      const classCard = createClassCard(classItem);
      dayContent.appendChild(classCard);
    });
    
    daySection.appendChild(dayContent);
    scheduleGrid.appendChild(daySection);
  });
}

// Create a class card element
function createClassCard(classItem) {
  try {
    // Validate the input
    if (!classItem) {
      console.warn('Attempted to create class card with null/undefined item');
      return document.createElement('div'); // Return empty div
    }
    
    const card = document.createElement('div');
    card.className = `class-card ${getCategoryClass(classItem)}`;
    
    // Time
    const timeElem = document.createElement('div');
    timeElem.className = 'class-time';
    
    const clockIcon = document.createElement('span');
    clockIcon.className = 'clock-icon';
    timeElem.appendChild(clockIcon);
    
    const timeText = document.createElement('span');
    timeText.textContent = formatTime(classItem.Time) || 'Time not specified';
    timeElem.appendChild(timeText);
    
    // Class name
    const nameElem = document.createElement('div');
    nameElem.className = 'class-name';
    nameElem.textContent = classItem.Class || 'Unnamed Class';
    
    // Location
    const locationElem = document.createElement('div');
    locationElem.className = 'class-location';
    locationElem.textContent = classItem.Location || 'Location not specified';
    
    // Add main elements to card
    card.appendChild(timeElem);
    card.appendChild(nameElem);
    card.appendChild(locationElem);
    
    // Add detailed information section (initially hidden)
    const detailsElem = document.createElement('div');
    detailsElem.className = 'class-details';
    
    // Add detailed information - handle potential nulls
    const discipline = classItem.Discipline || 'Not specified';
    const giNoGi = classItem['Gi / No Gi'] || '';
    const details = classItem.Details || '';
    
    // Build HTML content
    let detailsHTML = `<div><strong>Discipline:</strong> ${discipline}</div>`;
    
    if (giNoGi) {
      detailsHTML += `<div><strong>Gi/NoGi:</strong> ${giNoGi}</div>`;
    }
    
    if (details) {
      detailsHTML += `<div><strong>Details:</strong> ${details}</div>`;
    }
    
    detailsElem.innerHTML = detailsHTML;
    card.appendChild(detailsElem);
    
    // Add click event for expand/collapse
    card.addEventListener('click', function() {
      this.classList.toggle('expanded');
    });
    
    return card;
  } catch (error) {
    console.error('Error creating class card:', error, classItem);
    // Return empty div as fallback
    return document.createElement('div');
  }
}

// Show error message
function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.add('visible');
}

// Initialize the application when the DOM is ready
document.addEventListener('DOMContentLoaded', init);
