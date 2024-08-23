var WheelConstruct = WheelConstruct || {};
 
WheelConstruct.createWheel = function(elementId, step) {
    const wheel = document.getElementById(elementId);
    const paddingDiv = document.createElement('div');
    paddingDiv.style.height = '50px';
    wheel.appendChild(paddingDiv);

    // Flag to determine if this is the first element
    let isFirst = true;

    step.forEach(({ start, end, step, fixed }) => {
        for (let i = start; i <= end; i += step) {
            const numberDiv = document.createElement('div');
            numberDiv.className = 'number';
            numberDiv.innerText = fixed ? i.toFixed(countDecimalPlaces(step)) : i;

            // Apply attributes to the first numberDiv
            if (isFirst) {
                numberDiv.id = 'number_selected_' + elementId;
                numberDiv.classList.add('selected');
                isFirst = false;
            }

            wheel.appendChild(numberDiv);
        }
    });

    const paddingDivEnd = document.createElement('div');
    paddingDivEnd.style.height = '50px';
    wheel.appendChild(paddingDivEnd);
}

// ---------------------------------------------------------------------------------------------------------------------------------------------
		
WheelConstruct.getCurrentValue = function (wheel, step_array) {
	const numbers = wheel.querySelectorAll('.number');
	const middleIndex = Math.round((wheel.scrollTop + wheel.clientHeight/3 - 50)/50);
	const currentValue = parseFloat(numbers[middleIndex].innerText, 10);

	// Function to get the current step based on value and step_pose
	function getStep(value, step_array) {
		for (let i = 0; i < step_array.length; i++) {
			if (value >= step_array[i].start && value < step_array[i].end) {
				return step_array[i].step;
			}
		}
		return step_array[step_array.length - 1].step; // Default to the last step if not found
	}

	const step = getStep(currentValue, step_array);
	return currentValue.toFixed(countDecimalPlaces(step));
}

// ---------------------------------------------------------------------------------------------------------------------------------------------

WheelConstruct.adjustScroll = function(wheel,wheelId) {
	// Wheel = document.getElementById
	// WheelId = Id of the element
	const numbers = wheel.querySelectorAll('.number');
	const middleIndex = Math.round((wheel.scrollTop + wheel.clientHeight/3 - 50)/50);
	const targetScrollTop = middleIndex * 50 - wheel.clientHeight/3 + 50;

	wheel.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
	WheelConstruct.updateSelectedNumber(wheel,wheelId);
}

// ---------------------------------------------------------------------------------------------------------------------------------------------

WheelConstruct.attachWheelEvents = function(wheelId){
	// Wheel = document.getElementById
	// WheelId = Id of the element
	const wheel = document.getElementById(wheelId);
	let scrollTimeout;
	wheel.addEventListener('scroll', () => {
		clearTimeout(scrollTimeout);
		scrollTimeout = setTimeout(() => {
			WheelConstruct.adjustScroll(wheel,wheelId);
		}, 100);
	});
}

// ---------------------------------------------------------------------------------------------------------------------------------------------

WheelConstruct.updateSelectedNumber = function(wheel,wheelId) {
	// Wheel = document.getElementById
	// WheelId = Id of the element
	const numbers = wheel.querySelectorAll('.number');
	const middleIndex = Math.round((wheel.scrollTop + wheel.clientHeight/12 - 25)/50);
	numbers.forEach(num => {
		num.classList.remove('selected'); 
		delete num.dataset.mode;
		num.removeAttribute('id');
		});
		
	if (middleIndex >= 0 && middleIndex < numbers.length) {
		numbers[middleIndex].classList.add('selected');
		let selectedElements = document.getElementsByClassName('number selected');
		let themeMode = sessionStorage.getItem('theme') || 'dark';
		
		for (let i = 0; i < selectedElements.length; i++) {
			selectedElements[i].id = 'number_selected_'+wheelId;
			selectedElements[i].dataset.mode = themeMode;
		}
	}
}

// ---------------------------------------------------------------------------------------------------------------------------------------------

WheelConstruct.updateWheel = function(wheelId, startValue, steps) {
    const wheel = document.getElementById(wheelId);

    // Ensure the element with the provided id exists
    if (!wheel) {
        console.error(`Element with id "${wheelId}" not found.`);
        return;
    }

    // Ensure the steps array is not empty
    if (!Array.isArray(steps) || steps.length === 0) {
        console.error('Steps array is either not an array or is empty.');
        return;
    }

    // Flatten the step ranges into a single array of possible values
    let possibleValues = [];
    for (let i = 0; i < steps.length; i++) {
        let step = steps[i];
        if (step.fixed) {
            if (step.start === step.end) {
                possibleValues.push(step.start);
            } else {
                for (let j = step.start; j <= step.end; j += step.step) {
                    possibleValues.push(j);
                }
            }
        } else {
            for (let j = step.start; j <= step.end; j += step.step) {
                possibleValues.push(j);
            }
        }
    }

    // Find the closest value in the possibleValues array to the startValue
    let closestValue = possibleValues[0];
    let smallestDifference = Math.abs(startValue - closestValue);

    for (let i = 1; i < possibleValues.length; i++) {
        const currentDifference = Math.abs(startValue - possibleValues[i]);
        if (currentDifference < smallestDifference) {
            closestValue = possibleValues[i];
            smallestDifference = currentDifference;
        }
    }

    // Find the index of the closest value
    const startIndex = possibleValues.indexOf(closestValue);
    if (startIndex === -1) {
        console.error(`Closest value "${closestValue}" not found in possible values.`);
        return;
    }

    // Calculate the initial scroll position based on the index of the closest value
    const initialScrollPosition = startIndex * 50; // Assuming each step occupies 50px height
    wheel.scrollTo({ top: initialScrollPosition, behavior: 'smooth' });

    // Update the selected number
    WheelConstruct.updateSelectedNumber(wheel, wheelId);
}

// ---------------------------------------------------------------------------------------------------------------------------------------------

WheelConstruct.countDecimalPlaces = function(num) {
	let numStr = num.toString();
	let decimalIndex = numStr.indexOf('.');
	if (decimalIndex === -1) {
		return 0;
	}
	return numStr.length - decimalIndex - 1;
	//Compte les chiffres après la virgule du pas décimal
	//Compte les caractères pour éviter une boucle while
}