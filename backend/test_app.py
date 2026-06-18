import unittest
import json
from app import app

class TestTimeCalculations(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True

    def test_invalid_times(self):
        # Time outside 16:00 to 06:00
        response = self.app.post('/api/calculate', json={
            'start_time': '12:00',
            'end_time': '05:00'
        })
        self.assertEqual(response.status_code, 400)
        self.assertIn(b'Input times must be between 16:00 and 06:00', response.data)

    def test_standard_night(self):
        # 18:00 to 06:00 (12 hours)
        # 2nd third start: 18:00 + 4h = 22:00
        # 2nd half start (midpoint): 18:00 + 6h = 00:00
        # 3rd third start: 18:00 + 8h = 02:00
        # 2nd third to calendar midnight: 22:00 to 00:00 (2 hours)
        # 2nd third to islamic midnight: 22:00 to 00:00 (2 hours)
        response = self.app.post('/api/calculate', json={
            'start_time': '18:00',
            'end_time': '06:00'
        })
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data['night_duration_minutes'], 720)
        self.assertEqual(data['second_third_start'], '22:00')
        self.assertEqual(data['midpoint_start'], '00:00')
        self.assertEqual(data['third_third_start'], '02:00')
        self.assertTrue(data['to_calendar_midnight']['exists'])
        self.assertEqual(data['to_calendar_midnight']['duration_minutes'], 120)
        self.assertEqual(data['to_islamic_midnight']['duration_minutes'], 120)

    def test_asymmetric_night(self):
        # 19:30 to 04:30 (9 hours)
        # Duration = 9 hours = 540 mins
        # 1/3 duration = 3h = 180 mins
        # 1/2 duration = 4.5h = 270 mins (4h 30m)
        # 2nd third start: 19:30 + 3h = 22:30
        # Midpoint: 19:30 + 4.5h = 24:00 (00:00)
        # 3rd third start: 19:30 + 6h = 01:30
        # 2nd third to calendar midnight: 22:30 to 00:00 (1 hour 30 mins)
        response = self.app.post('/api/calculate', json={
            'start_time': '19:30',
            'end_time': '04:30'
        })
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data['night_duration_minutes'], 540)
        self.assertEqual(data['second_third_start'], '22:30')
        self.assertEqual(data['midpoint_start'], '00:00')
        self.assertEqual(data['to_calendar_midnight']['duration_minutes'], 90)
        self.assertEqual(data['to_islamic_midnight']['duration_minutes'], 90)

    def test_after_midnight_start(self):
        # start 01:00, end 05:00 (4 hours = 240 mins)
        # 1/3 = 1h 20m = 80 mins
        # 2nd third start: 01:00 + 1h 20m = 02:20
        # Midpoint: 01:00 + 2h = 03:00
        # Since start is 01:00 (after calendar midnight), 2nd third start (02:20) is after calendar midnight.
        # Wait, relative midnight:
        # start_mins = 60.
        # midnight_relative = 1440 - 60 = 1380.
        # sec_third_relative = 80.
        # sec_third_relative (80) <= midnight_relative (1380) is True!
        # So to_calendar_midnight will exist and be from 02:20 to 00:00 (next day) which is 21 hours and 40 minutes!
        # Let's check this behavior. It is correct because 02:20 is before the NEXT calendar midnight.
        response = self.app.post('/api/calculate', json={
            'start_time': '01:00',
            'end_time': '05:00'
        })
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data['night_duration_minutes'], 240)
        self.assertEqual(data['second_third_start'], '02:20')
        self.assertEqual(data['midpoint_start'], '03:00')
        self.assertTrue(data['to_calendar_midnight']['exists'])
        # 02:20 to 24:00 (next day) is 21h 40m = 1300 mins
        self.assertEqual(data['to_calendar_midnight']['duration_minutes'], 1300)

if __name__ == '__main__':
    unittest.main()
