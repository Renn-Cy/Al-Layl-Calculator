from flask import Flask, request, jsonify
from flask_cors import CORS
import datetime

app = Flask(__name__)
# Enable CORS for frontend requests
CORS(app)

def time_str_to_minutes(t_str):
    h, m = map(int, t_str.split(':'))
    return h * 60 + m

def minutes_to_time_str(mins):
    mins = int(mins) % 1440
    h = mins // 60
    m = mins % 60
    return f"{h:02d}:{m:02d}"

def format_duration(mins):
    h = int(mins) // 60
    m = int(mins) % 60
    if h == 0:
        return f"{m}m"
    return f"{h}h {m}m"

def is_within_allowed_range(mins):
    # Allowed: 16:00 (960 mins) to 24:00 (1440 mins) AND 00:00 (0 mins) to 06:00 (360 mins)
    return mins >= 960 or mins <= 360

@app.route('/api/calculate', methods=['POST'])
def calculate():
    data = request.get_json() or {}
    start_str = data.get('start_time')
    end_str = data.get('end_time')

    if not start_str or not end_str:
        return jsonify({'error': 'Both start_time and end_time are required'}), 400

    try:
        start_mins = time_str_to_minutes(start_str)
        end_mins = time_str_to_minutes(end_str)
    except Exception:
        return jsonify({'error': 'Invalid time format. Use HH:MM'}), 400

    if not is_within_allowed_range(start_mins) or not is_within_allowed_range(end_mins):
        return jsonify({'error': 'Input times must be between 16:00 and 06:00'}), 400

    # Calculate total night duration (accounting for crossing midnight)
    if end_mins < start_mins:
        # e.g., start 18:00 (1080 mins), end 05:00 (300 mins)
        # end time is on the next day
        total_duration = (end_mins + 1440) - start_mins
    else:
        # e.g., start 16:00 (960 mins), end 20:00 (1200 mins)
        total_duration = end_mins - start_mins

    # Divisions
    # 2nd third start
    second_third_start_mins = (start_mins + total_duration / 3) % 1440
    # 3rd third start
    third_third_start_mins = (start_mins + 2 * total_duration / 3) % 1440
    # Midpoint / 2nd half start
    midpoint_start_mins = (start_mins + total_duration / 2) % 1440

    # Range from 2nd third start to calendar midnight (00:00 / 1440)
    # Check if 2nd third starts before calendar midnight
    # 2nd third start time could be on Day 1 (>= 960) or Day 2 (< 360)
    # Calendar midnight is at 0 minutes (or 1440 minutes relative to Day 1)
    to_cal_midnight = {'exists': False, 'start': '', 'end': '', 'duration_minutes': 0, 'duration_formatted': 'N/A'}
    
    # Let's compute normalized times relative to start_mins (which is Day 1)
    # Any time T can be represented as relative to start_mins:
    # If T < start_mins, it means T is on Day 2, so its relative time is T + 1440 - start_mins.
    # Otherwise, its relative time is T - start_mins.
    def get_relative_mins(t_mins):
        if t_mins < start_mins:
            return t_mins + 1440 - start_mins
        return t_mins - start_mins

    # Let's find calendar midnight in relative minutes.
    # Calendar midnight is 0 (or 1440).
    # If start_mins is 18:00 (1080), then calendar midnight is at 1440 - 1080 = 360 relative minutes.
    # If start_mins is 02:00 (120), then calendar midnight has already passed on Day 1,
    # but wait, the night starts at 02:00, so the next calendar midnight is at 1440 - 120 = 1320 relative minutes.
    # In general, midnight is at 0 (or 1440).
    if start_mins == 0:
        midnight_relative = 0
    else:
        midnight_relative = 1440 - start_mins

    sec_third_relative = total_duration / 3

    # Check if 2nd third starts before calendar midnight
    if sec_third_relative <= midnight_relative:
        to_cal_duration = midnight_relative - sec_third_relative
        to_cal_midnight = {
            'exists': True,
            'start': minutes_to_time_str(second_third_start_mins),
            'end': '00:00',
            'duration_minutes': int(to_cal_duration),
            'duration_formatted': format_duration(to_cal_duration)
        }

    # Range from 2nd third start to midpoint (Islamic Midnight)
    # This always exists and is exactly total_duration / 6
    to_islamic_duration = total_duration / 2 - total_duration / 3 # = total_duration / 6
    to_islamic_midnight = {
        'exists': True,
        'start': minutes_to_time_str(second_third_start_mins),
        'end': minutes_to_time_str(midpoint_start_mins),
        'duration_minutes': int(to_islamic_duration),
        'duration_formatted': format_duration(to_islamic_duration)
    }

    return jsonify({
        'start_time': start_str,
        'end_time': end_str,
        'night_duration_minutes': total_duration,
        'night_duration_formatted': format_duration(total_duration),
        'second_third_start': minutes_to_time_str(second_third_start_mins),
        'third_third_start': minutes_to_time_str(third_third_start_mins),
        'midpoint_start': minutes_to_time_str(midpoint_start_mins),
        'to_calendar_midnight': to_cal_midnight,
        'to_islamic_midnight': to_islamic_midnight
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
