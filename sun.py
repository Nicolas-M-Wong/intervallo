import numpy as np
from astroquery.jplhorizons import Horizons
from datetime import datetime, timedelta, timezone

def sun_photo_spacing(focal_length_mm, resolution_width, resolution_height, sensor_width_mm):

    # Fetch today's angular diameter of the Sun from Horizons
    today = datetime.now(timezone.utc)
    start_date = today.strftime('%Y-%m-%d')
    stop_date = (today + timedelta(seconds=1)).strftime('%Y-%m-%dT%H:%M:%S')

    obj = Horizons(id='10', location='500', epochs={'start': start_date, 'stop': stop_date, 'step': '1d'})
    data = obj.ephemerides()

    # Inspect the column names of the data to find the correct key

    # Try to extract the angular diameter (ang_diam), use the correct column name
    # This is just a check to ensure we are using the right column
    if 'ang_width' in data.colnames:
        angular_size_arcsec = data[0]['ang_width']  # Angular size in arcseconds
    else:
        # Check if the expected column is named differently
        print("Column 'ang_width' not found. Available columns:", data.colnames)
        return None, None
    # Convert angular size to radians
    angular_size_rad = angular_size_arcsec *(np.pi/180)*(1/3600) # 1 arcsecond = 4.848e-6 radians

    # Calculate pixel size on the sensor
    sensor_pixel_pitch_mm = sensor_width_mm / resolution_width  # Pixel size in mm
    angular_size_per_pixel_rad = sensor_pixel_pitch_mm / focal_length_mm

    # Calculate the Sun's size in pixels
    sun_size_pixels = angular_size_rad / angular_size_per_pixel_rad

    # Calculate time between shots for spacing by one Sun diameter
    # The Sun's apparent motion across the sky is ~15 degrees/hour or 0.004166 degrees/second
    sun_motion_deg_per_sec = 0.004166
    sun_motion_rad_per_sec = np.deg2rad(sun_motion_deg_per_sec)
    
    # Time for the Sun to move one diameter (in radians)
    time_between_photos_sec = 2*angular_size_rad / sun_motion_rad_per_sec
    #Each sun are space out by one sun
    max_length = (resolution_width**2+resolution_height**2)**(1/2) #Diagonal of the sensor
    max_sun = int(max_length//(sun_size_pixels*2))
    return sun_size_pixels, time_between_photos_sec, max_sun

