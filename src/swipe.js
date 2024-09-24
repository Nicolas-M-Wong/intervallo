const container = document.getElementById('screen-container');
const viewportWidth = window.innerWidth;
const viewportHeight = window.innerHeight;
let startX = 0;  // Initial touch position
let startY = 0;
let currentX = 0;  // Current swipe distance
let currentY = 0;
let isSwiping = false;

// Touch event listeners for mobile devices
container.addEventListener('touchstart', handleTouchStart, false);
container.addEventListener('touchmove', handleTouchMove, false);
container.addEventListener('touchend', handleTouchEnd, false);

// Mouse event listeners for desktop
container.addEventListener('mousedown', handleTouchStart, false);
window.addEventListener('mousemove', handleTouchMove, false); 
window.addEventListener('mouseup', handleTouchEnd, false);

function handleTouchStart(e) {
	const touch = e.touches ? e.touches[0] : e;
	startX = touch.clientX;
	startY = touch.clientY;
	
	isSwiping = true;
	container.style.transition = 'none'; // Disable transition during swipe
}

function handleTouchMove(e) {
	if (!isSwiping) return;

	const touch = e.touches ? e.touches[0] : e;
	currentX = touch.clientX - startX; // Calculate swipe distance
	currentY = touch.clientY - startY;
	const min_thresholdX = viewportWidth * 0.3;
	const min_thresholdY = viewportHeight * 0.05;
	// Move the container horizontally based on swipe distance
	if (Math.abs(currentX) >= min_thresholdX){
		container.style.transform = `translateX(${currentX}px)`;
	}
	if (currentY >= min_thresholdY){
		container.style.transform = `translateY(${currentY}px)`;
	}
}

function handleTouchEnd() {
	isSwiping = false;
	const thresholdX = viewportWidth * 0.5;  // 55% of the screen width
	const thresholdY = viewportHeight * 0.25;  // 50% of the screen width
	// Handle X direction
	if (currentX <= -thresholdX) {
		// Swiped left beyond 66%
		container.style.transition = 'transform 0.3s ease-out'; // Smooth transition
		container.style.transform = 'translateX(-100vw)'; // Move off-screen left
		setTimeout(() => {
			changePage("left");
		}, 300); // Reload after transition
	} else if (currentX >= thresholdX) {
		// Swiped right beyond 66%
		container.style.transition = 'transform 0.3s ease-out'; // Smooth transition
		container.style.transform = 'translateX(100vw)'; // Move off-screen right
		setTimeout(() => {
			changePage("right");
		}, 300); // Reload after transition
	} else {
		// Reset the swipe position if the threshold is not met
		container.style.transition = 'transform 0.3s ease-out'; // Add transition back
		container.style.transform = 'translateX(0px)';
	}
	
	// Handle Y direction

	if (currentY >= thresholdY) {
		// Swiped right beyond 66%
		container.style.transition = 'transform 0.3s ease-out'; // Smooth transition
		//container.style.transform = 'translateY(100vw)'; // Move off-screen right
		setTimeout(() => {
			location.reload();
		}, 300); // Reload after transition
	} else {
		// Reset the swipe position if the threshold is not met
		container.style.transition = 'transform 0.3s ease-out'; // Add transition back
		container.style.transform = 'translateY(0px)';
	}
}
