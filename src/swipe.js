	// Variables to store touch positions
	let startX, startY, endX, endY;

	const minSwipeDistance = 0.5; 
	// Function to handle the start of a touch event
	function handleTouchStart(event) {
		startX = event.touches[0].clientX;
	}

	// Function to handle the end of a touch event
	function handleTouchEnd(event) {
		const viewportWidth = window.innerWidth;
		const minSwipeDistanceX = viewportWidth * minSwipeDistance;
		endX = event.changedTouches[0].clientX;
		const diffX = endX - startX;

		if (Math.abs(diffX) > minSwipeDistanceX) {
			// Horizontal swipe
			if (diffX > 0) {
				
				home.changePage('home-V1');
			} else {
				
				home.changePage('home-V1');
			}
		} 

	}

	// Attach touch event listeners to the swipe area
	const swipeArea = document.getElementById('screen-container');
	swipeArea.addEventListener('touchstart', handleTouchStart);
	swipeArea.addEventListener('touchend', handleTouchEnd);