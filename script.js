// State variables
let classes = [];
let locations = [];
let selectedLocations = [];
let activePrograms = [];
let activeTooltip = null; // Track active tooltip
let giFilter = false;
let noGiFilter = false;
let beginnersFilter = false;
let startTimeFilter = 0; // Hours since midnight (0-24)
let endTimeFilter = 24; // Hours since midnight (0-24)

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
const refreshButton = document.getElementById('refresh-button');
const printButton = document.getElementById('print-button');
const tooltip = document.getElementById('tooltip');
const visibleClassCount = document.getElementById('visible-class-count');
const totalClassCount = document.getElementById('total-class-count');
const giFilterCheckbox = document.getElementById('gi-filter');
const noGiFilterCheckbox = document.getElementById('nogi-filter');
const beginnersFilterCheckbox = document.getElementById('beginners-filter');
const startTimeSlider = document.getElementById('start-time-slider');
const endTimeSlider = document.getElementById('end-time-slider');
const startTimeLabel = document.getElementById('start-time-label');
const endTimeLabel = document.getElementById('end-time-label');

// Initialize application
function init() {
  // Create day headers for the schedule grid
  createDayHeaders();
  
  // Fetch data
  fetchData();
  
  // Set up refresh button
  refreshButton.addEventListener('click', fetchData);
  
  // Set up print button
  printButton.addEventListener('click', printSchedule);
  
  // Set up filter checkboxes
  setupFilterCheckboxes();
  
  // Set up time sliders
  setupTimeSliders();
  
  // Add document click event to close tooltip when clicking outside
  document.addEventListener('click', (event) => {
    if (activeTooltip && !event.target.closest('.class-card') && !event.target.closest('.tooltip')) {
      hideTooltip();
    }
  });
  
  // Add keyboard shortcut for Escape to clear all filters
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      clearAllFilters();
    }
  });
}

// Create day headers for the schedule grid
function createDayHeaders() {
  // Clear existing grid
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

// Set up filter checkboxes
function setupFilterCheckboxes() {
  giFilterCheckbox.addEventListener('change', (event) => {
    giFilter = event.target.checked;
    renderSchedule();
  });
  
  noGiFilterCheckbox.addEventListener('change', (event) => {
    noGiFilter = event.target.checked;
    renderSchedule();
  });
  
  beginnersFilterCheckbox.addEventListener('change', (event) => {
    beginnersFilter = event.target.checked;
    renderSchedule();
  });
}

// Set up time sliders
function setupTimeSliders() {
  // Initialize labels
  updateTimeLabels();
  
  startTimeSlider.addEventListener('input', (event) => {
    startTimeFilter = parseFloat(event.target.value);
    
    // Prevent end time from being less than start time
    if (startTimeFilter > endTimeFilter) {
      endTimeFilter = startTimeFilter;
      endTimeSlider.value = endTimeFilter;
    }
    
    updateTimeLabels();
    renderSchedule();
  });
  
  endTimeSlider.addEventListener('input', (event) => {
    endTimeFilter = parseFloat(event.target.value);
    
    // Prevent start time from being greater than end time
    if (endTimeFilter < startTimeFilter) {
      startTimeFilter = endTimeFilter;
      startTimeSlider.value = startTimeFilter;
    }
    
    updateTimeLabels();
    renderSchedule();
  });
}

// Update time slider labels
function updateTimeLabels() {
  startTimeLabel.textContent = formatTimeFromHours(startTimeFilter);
  endTimeLabel.textContent = formatTimeFromHours(endTimeFilter);
}

// Format hours to time string (e.g., 14.5 -> "2:30 PM")
function formatTimeFromHours(hours) {
  const wholeHours = Math.floor(hours);
  const minutes = (hours % 1) * 60;
  
  let period = 'AM';
  let hour12 = wholeHours;
  
  if (wholeHours >= 12) {
    period = 'PM';
    hour12 = wholeHours % 12 || 12;
  }
  
  if (hour12 === 0) {
    hour12 = 12;
  }
  
  const minutesStr = minutes === 0 ? '00' : (minutes === 30 ? '30' : minutes);
  
  return `${hour12}:${minutesStr} ${period}`;
}

// Clear all filters
function clearAllFilters() {
  // Reset program filters
  activePrograms = [];
  
  // Reset checkbox filters
  giFilter = false;
  noGiFilter = false;
  beginnersFilter = false;
  giFilterCheckbox.checked = false;
  noGiFilterCheckbox.checked = false;
  beginnersFilterCheckbox.checked = false;
  
  // Reset time filters
  startTimeFilter = 0;
  endTimeFilter = 24;
  startTimeSlider.value = startTimeFilter;
  endTimeSlider.value = endTimeFilter;
  updateTimeLabels();
  
  // Re-render UI
  renderProgramButtons();
  renderSchedule();
}

// Print schedule
function printSchedule() {
  window.print();
}

// Fetch data from JSON
function fetchData() {
  // Show loading state
  errorMessage.classList.remove('visible');
  
  // Try different file paths
  const filePaths = [
    './StoutPGH_Schedule_Cleaned.json',
    '/StoutPGH_Schedule_Cleaned.json',
    'StoutPGH_Schedule_Cleaned.json',
    '/StoutPGH-Schedule/StoutPGH_Schedule_Cleaned.json'
  ];
  
  let pathIndex = 0;
  
  function tryNextPath() {
    if (pathIndex >= filePaths.length) {
      // All paths failed
      showError('Could not find the schedule data file. Please check that StoutPGH_Schedule_Cleaned.json exists in your repository.');
      return;
    }
    
    const path = filePaths[pathIndex];
    console.log(`Trying to load data from: ${path}`);
    
    fetch(path)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        console.log('Data loaded successfully!');
        processData(data);
      })
      .catch(error => {
        console.error(`Failed to load from ${path}:`, error);
        pathIndex++;
        tryNextPath();
      });
  }
  
  // Start trying paths
  tryNextPath();
}

// Process the loaded data
function processData(data) {
  // Save the class data
  classes = data;
  
  // Extract unique locations
  locations = [...new Set(data
    .filter(item => item.Location && item.Location.trim() !== '')
    .map(item => item.Location))];
  
  // Set initial selected location to Strip District, if available
  if (selectedLocations.length === 0) {
    const stripDistrict = locations.find(loc => loc === 'Strip District');
    selectedLocations = stripDistrict ? [stripDistrict] : locations.length > 0 ? [locations[0]] : [];
  }
  
  // Update class counts
  totalClassCount.textContent = classes.length;
  
  // Update last updated timestamp
  lastUpdated.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
  
  // Render UI components
  renderLocationButtons();
  renderProgramButtons();
  renderSchedule();
}