//scripts.js

document.addEventListener('DOMContentLoaded', (event) => {
    const titleElement = document.querySelector('.shutdown-title');
	const messageElement = document.querySelector('.shutdown-message');
    const rotatingObject = document.querySelector('.rotating-object');
	 
    setTimeout(() => {
        // Update title and optionally perform other actions
        titleElement.textContent = "Bonne nuit";
		messageElement.textContent = "L'intervallomètre est éteint";
        rotatingObject.style.animation = 'none';
		
		titleElement.transition = 'opacity 0.7s ease-in-out';
		messageElement.transition = 'opacity 0.7s ease-in-out';
        //Optionally, redirect or perform other actions after a delay
        // Stop rotating animation
        rotatingObject.style.animation = 'none';
        
        // Smoothly hide rotating object
        rotatingObject.style.transition = 'opacity 0.7s ease-in-out';
        rotatingObject.style.opacity = '0';
        
        // Optionally, redirect or perform other actions after animation completes
        setTimeout(() => {
            rotatingObject.style.display = 'none'; // Hide the rotating object
            // Optionally, redirect or perform other actions here
            // window.location.href = 'maintenance.html';
            titleElement.classList.add('hide'); // Optional: Hide the title after transition
        }, 500); // Hide after 0.5 seconds (500 milliseconds) of fading out
        
    }, 15000); // 15 seconds (15000 milliseconds)
});
