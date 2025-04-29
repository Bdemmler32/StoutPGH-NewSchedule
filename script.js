// State variables
let classes = [];
let locations = [];
let selectedLocations = [];
let activePrograms = [];

// Program to discipline mapping
const programMap = {
  'BJJ': ['Adult Brazilian Jiu Jitsu'],
  'Striking': ['Adult Striking'],
  'Youth': ['Youth Jiu Jitsu', 'Youth Striking'],
  'MMA': ['Mixed Martial Arts'],
  'Self-Defense': ['Self Defense']
};

// Category to class mapping
const categoryStyles = {
  'BJJ': 'bjj',
  'Striking': 'striking',
  'Youth': 'youth',
  'MMA': 'mma',
  'Self-Defense': 'selfdefense'
};

// Days of the week
const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// DOM Elements
const locationButtonsContainer = document.getElementById('location-buttons');
const programButtonsContainer = document.getElementById('program-buttons');
const dayButtonsContainer = document.getElementById('day-buttons');
const scheduleContainer = document.getElementById('schedule-container');
const scheduleGrid = document.getElementById('schedule-grid');
const errorMessage = document.getElementById('error-message');
const lastUpdated = document.getElementById('last-updated');
const loading = document.getElementById('loading');

// Initialize application
function init() {
  // Create schedule layout for both desktop and mobile
  createScheduleLayout();
  
  // Fetch data
  fetchExcelData();
}

// Create schedule layout for both desktop and mobile
function createScheduleLayout() {
  // Clear any existing content
  scheduleGrid.innerHTML = '';
  
  // Create desktop layout
  createDesktopLayout();
  
  // Create mobile layout
  createMobileLayout();
}

// Create desktop layout with 7 columns
function createDesktopLayout() {
  // Add day headers
  days.forEach(day => {
    const dayHeader = document.createElement('div');
    dayHeader.className = 'day-header';
    dayHeader.id = `desktop-header-${day.toLowerCase()}`;
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

// Create mobile layout with day sections
function createMobileLayout() {
  // Create a container for mobile sections
  const mobileSections = document.createElement('div');
  mobileSections.id = 'mobile-sections';
  
  // Add day sections
  days.forEach(day => {
    // Create day section
    const daySection = document.createElement('div');
    daySection.className = 'day-section';
    daySection.id = `mobile-${day.toLowerCase()}`;
    
    // Create day header
    const dayHeader = document.createElement('div');
    dayHeader.className = 'day-header';
    dayHeader.id = `mobile-header-${day.toLowerCase()}`;
    dayHeader.textContent = day;
    daySection.appendChild(dayHeader);
    
    // Create day content container
    const dayContent = document.createElement('div');
    dayContent.className = 'day-content';
    dayContent.id = `mobile-content-${day.toLowerCase()}`;
    daySection.appendChild(dayContent);
    
    // Add day section to mobile sections
    mobileSections.appendChild(daySection);
  });
  
  // Add mobile sections to container
  scheduleContainer.appendChild(mobileSections);
}

// Create day navigation buttons for mobile view
function createDayNavigationButtons() {
  // Make sure we have a container
  if (!dayButtonsContainer) return;
  
  dayButtonsContainer.innerHTML = '';
  
  // Create a button for each day
  days.forEach(day => {
    const button = document.createElement('button');
    button.className = 'filter-button';
    button.textContent = day.substring(0, 3); // First 3 letters of the day
    
    // Add click event for smooth scrolling to that day section
    button.addEventListener('click', () => {
      // Find the target section based on screen size
      const isMobile = window.innerWidth < 1110;
      const targetId = isMobile 
        ? `mobile-header-${day.toLowerCase()}`
        : `desktop-header-${day.toLowerCase()}`;
      
      const targetElement = document.getElementById(targetId);
      
      if (targetElement) {
        // Smooth scroll to the target
        targetElement.scrollIntoView({ behavior: 'smooth' });
      }
    });
    
    dayButtonsContainer.appendChild(button);
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
    const workbook = XLSX.read(new Uint8Array(data), {
      type: 'array', 
      cellDates: true,
      cellText: false
    });
    
    // Get first sheet
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Extract update date from cell B1
    const updateDateCell = worksheet['B1'];
    const updateDate = updateDateCell ? updateDateCell.v : '';
    
    // Extract schedule data starting from the header row (row 3)
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      range: 2,
      raw: false,
      dateNF: 'h:mm AM/PM'
    });
    
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
  try {
    // Convert Excel data to our expected format
    classes = data.map(item => {
      // Pre-format the time to ensure it's a string
      let formattedTime = '';
      
      // Handle time value regardless of its format
      if (item.Time) {
        // If it's a date object
        if (item.Time instanceof Date) {
          const hours = item.Time.getHours();
          const minutes = item.Time.getMinutes();
          const ampm = hours >= 12 ? 'PM' : 'AM';
          const hours12 = hours % 12 || 12;
          const minutesStr = minutes < 10 ? `0${minutes}` : minutes;
          formattedTime = `${hours12}:${minutesStr} ${ampm}`;
        }
        // If it's already a string (possibly from Excel's formatting)
        else if (typeof item.Time === 'string') {
          formattedTime = item.Time;
        }
        // If it's a number (Excel's internal date format)
        else if (typeof item.Time === 'number') {
          // Convert Excel's date number to hours and minutes
          const totalSeconds = Math.round(item.Time * 86400); // 86400 seconds in a day
          const hours = Math.floor(totalSeconds / 3600);
          const minutes = Math.floor((totalSeconds % 3600) / 60);
          const ampm = hours >= 12 ? 'PM' : 'AM';
          const hours12 = hours % 12 || 12;
          const minutesStr = minutes < 10 ? `0${minutes}` : minutes;
          formattedTime = `${hours12}:${minutesStr} ${ampm}`;
        }
      }
      
      return {
        Class: item.Class || '',
        Discipline: item['Discipline(s)'] || '',
        Day: item.Day || '',
        Time: formattedTime,
        Location: item.Location || '',
        'Gi / No Gi': item['Apparel Format'] || '',
        Details: item.Details || '',
        Requisites: item.Requisites || ''
      };
    });
    
    // Extract unique locations
    locations = [...new Set(classes
      .filter(item => item.Location && item.Location.trim() !== '')
      .map(item => item.Location))];
    
    // Set initial selected location to Strip District, if available
    if (selectedLocations.length === 0) {
      const stripDistrict = locations.find(loc => loc === 'Strip District');
      selectedLocations = stripDistrict ? [stripDistrict] : locations.length > 0 ? [locations[0]] : [];
    }
    
    // Update last updated timestamp - remove the "Last updated:" text
    lastUpdated.textContent = updateDate || '';
    
    // Hide loading indicator
    loading.style.display = 'none';
    scheduleGrid.style.display = 'grid';
    
    // Render UI components
    renderLocationButtons();
    renderProgramButtons();
    createDayNavigationButtons();
    renderSchedule();
  } catch (error) {
    console.error('Error processing data:', error);
    showError(`Error processing schedule data: ${error.message}`);
    loading.style.display = 'none';
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

// Convert time to minutes for sorting
function timeToMinutes(timeStr) {
  try {
    if (!timeStr) return 0;
    
    // We'll work with string representation
    const timeString = String(timeStr || '').trim();
    if (!timeString) return 0;
    
    let hours = 0;
    let minutes = 0;
    let isPM = false;
    
    // Match pattern like "6:45 AM" or "6:45:00 AM"
    const timeMatch = timeString.match(/(\d+):(\d+)(?::(\d+))?\s*(AM|PM)/i);
    
    if (timeMatch) {
      hours = parseInt(timeMatch[1], 10) || 0;
      minutes = parseInt(timeMatch[2], 10) || 0;
      isPM = (timeMatch[4] || '').toUpperCase() === 'PM';
      
      // Adjust for PM/AM
      if (isPM && hours < 12) hours += 12;
      if (!isPM && hours === 12) hours = 0;
      
      return hours * 60 + minutes;
    }
    
    // Try to handle 24-hour format like "18:45"
    const militaryMatch = timeString.match(/(\d+):(\d+)/);
    if (militaryMatch) {
      hours = parseInt(militaryMatch[1], 10) || 0;
      minutes = parseInt(militaryMatch[2], 10) || 0;
      return hours * 60 + minutes;
    }
    
    return 0;
  } catch (error) {
    console.warn('Error parsing time for sorting:', timeStr, error);
    return 0;
  }
}

// Render the schedule
function renderSchedule() {
  try {
    // Clear existing classes in desktop layout
    days.forEach(day => {
      const dayColumn = document.getElementById(`day-${day.toLowerCase()}`);
      if (dayColumn) {
        dayColumn.innerHTML = '';
      }
      
      // Clear mobile content
      const mobileDayContent = document.getElementById(`mobile-content-${day.toLowerCase()}`);
      if (mobileDayContent) {
        mobileDayContent.innerHTML = '';
      }
    });
    
    // Populate each day in desktop and mobile layouts
    days.forEach(day => {
      // Get desktop column
      const dayColumn = document.getElementById(`day-${day.toLowerCase()}`);
      // Get mobile content container
      const mobileDayContent = document.getElementById(`mobile-content-${day.toLowerCase()}`);
      
      if (!dayColumn || !mobileDayContent) return;
      
      // Filter classes for this day and apply filters
      const dayClasses = classes
        .filter(c => c.Day === day && isClassVisible(c))
        .sort((a, b) => {
          // Sort by time
          return timeToMinutes(a.Time) - timeToMinutes(b.Time);
        });
      
      if (dayClasses.length === 0) {
        // No classes message for desktop
        const noClassesDesktop = document.createElement('div');
        noClassesDesktop.className = 'no-classes';
        noClassesDesktop.textContent = 'No classes';
        dayColumn.appendChild(noClassesDesktop);
        
        // No classes message for mobile
        const noClassesMobile = document.createElement('div');
        noClassesMobile.className = 'no-classes';
        noClassesMobile.textContent = 'No classes';
        mobileDayContent.appendChild(noClassesMobile);
      } else {
        dayClasses.forEach(classItem => {
          try {
            // Create class card for desktop
            const desktopCard = createClassCard(classItem, false);
            dayColumn.appendChild(desktopCard);
            
            // Create class card for mobile (with mobile layout)
            const mobileCard = createClassCard(classItem, true);
            mobileDayContent.appendChild(mobileCard);
          } catch (error) {
            console.error('Error creating class card:', error, classItem);
          }
        });
      }
    });
  } catch (error) {
    console.error('Error rendering schedule:', error);
    showError(`Error displaying schedule: ${error.message}`);
  }
}

// Create a class card element
function createClassCard(classItem, isMobile) {
  const card = document.createElement('div');
  card.className = `class-card ${getCategoryClass(classItem)}`;
  
  if (isMobile) {
    // Mobile layout: Time and Class on the same line
    const headerRow = document.createElement('div');
    headerRow.className = 'class-header';
    
    // Time with clock icon
    const timeElem = document.createElement('div');
    timeElem.className = 'class-time';
    
    const clockIcon = document.createElement('span');
    clockIcon.className = 'clock-icon';
    timeElem.appendChild(clockIcon);
    
    const timeText = document.createElement('span');
    timeText.textContent = classItem.Time || '';
    timeElem.appendChild(timeText);
    
    // Class name
    const nameElem = document.createElement('div');
    nameElem.className = 'class-name';
    nameElem.textContent = classItem.Class || '';
    
    // Add time and class name to the header row
    headerRow.appendChild(timeElem);
    headerRow.appendChild(nameElem);
    
    // Add header row to the card
    card.appendChild(headerRow);
    
    // Location on its own line
    const locationElem = document.createElement('div');
    locationElem.className = 'class-location';
    locationElem.textContent = classItem.Location || '';
    card.appendChild(locationElem);
  } else {
    // Desktop layout: Time, Class, and Location on separate lines
    // Time
    const timeElem = document.createElement('div');
    timeElem.className = 'class-time';
    
    const clockIcon = document.createElement('span');
    clockIcon.className = 'clock-icon';
    timeElem.appendChild(clockIcon);
    
    const timeText = document.createElement('span');
    timeText.textContent = classItem.Time || '';
    timeElem.appendChild(timeText);
    
    // Class name
    const nameElem = document.createElement('div');
    nameElem.className = 'class-name';
    nameElem.textContent = classItem.Class || '';
    
    // Location
    const locationElem = document.createElement('div');
    locationElem.className = 'class-location';
    locationElem.textContent = classItem.Location || '';
    
    // Add elements to card
    card.appendChild(timeElem);
    card.appendChild(nameElem);
    card.appendChild(locationElem);
  }
  
  // Create details section (hidden by default)
  const details = document.createElement('div');
  details.className = 'class-details';
  
  // Add details content
  if (classItem['Gi / No Gi']) {
    const giNoGiRow = document.createElement('div');
    giNoGiRow.className = 'details-row';
    giNoGiRow.innerHTML = `<span class="