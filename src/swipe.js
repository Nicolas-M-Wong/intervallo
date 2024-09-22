const container = document.getElementById('screen-container');
const viewportWidth = window.innerWidth;

let startX = 0;  // Initial touch position
let currentX = 0;  // Current swipe distance
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
	isSwiping = true;
	container.style.transition = 'none'; // Disable transition during swipe
}

function handleTouchMove(e) {
	if (!isSwiping) return;

	const touch = e.touches ? e.touches[0] : e;
	currentX = touch.clientX - startX; // Calculate swipe distance

	// Move the container horizontally based on swipe distance
	container.style.transform = `translateX(${currentX}px)`;
}

function handleTouchEnd() {
	isSwiping = false;
	const threshold = viewportWidth * 0.66;  // 66% of the screen width

	// If swiped more than 66% of the screen width to the left
	if (currentX < -threshold) {
		// Swiped left beyond 66%
		container.style.transition = 'transform 0.3s ease-out'; // Smooth transition
		container.style.transform = 'translateX(-100vw)'; // Move off-screen left
		setTimeout(() => {
			changePage("left");
		}, 300); // Reload after transition
	} else if (currentX > threshold) {
		// Swiped right beyond 66%
		container.style.transition = 'transform 0.3s ease-out'; // Smooth transition
		container.style.transform = 'translateX(100vw)'; // Move off-screen right
		setTimeout(() => {
			changePage("right");
		}, 300); // Reload after transition
	} else {
		// Reset the swipe position if the threshold is not met
		container.style.transition = 'transform 0.3s ease-out'; // Add transition back
		container.style.transform = 'translateX(0)';
	}
}
