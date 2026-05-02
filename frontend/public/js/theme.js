// Function to get the user's preferred theme from local storage
function getPreferredTheme() {
  const storedTheme = localStorage.getItem('preferredTheme');
  return storedTheme ? storedTheme : 'light'; // Default to light if no preference is stored
}

// Function to set the user's preferred theme and apply it
function setTheme(theme) {
  document.body.setAttribute('data-theme', theme); // Add a data attribute to the body for CSS styling
  localStorage.setItem('preferredTheme', theme); // Store the preference
}

// Initialize the theme on page load
document.addEventListener('DOMContentLoaded', () => {
  const theme = getPreferredTheme();
  setTheme(theme);
});
