#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class GramPanchayatAPITester:
    def __init__(self, base_url="https://maharashtragp.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_phone = "9876543210"
        self.demo_otp = "123456"

    def log_test(self, name, success, details=""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED {details}")
        else:
            print(f"❌ {name} - FAILED {details}")
        return success

    def make_request(self, method, endpoint, data=None, params=None):
        """Make HTTP request with proper headers"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)
            
            return response
        except requests.exceptions.RequestException as e:
            print(f"Request failed: {str(e)}")
            return None

    def test_send_otp(self):
        """Test OTP sending functionality"""
        print("\n🔍 Testing OTP Send API...")
        response = self.make_request('POST', 'auth/send-otp', {'phone': self.test_phone})
        
        if response and response.status_code == 200:
            data = response.json()
            demo_mode = data.get('demo_mode', False)
            return self.log_test("Send OTP", True, f"- Demo mode: {demo_mode}")
        else:
            error = response.json().get('detail', 'Unknown error') if response else 'No response'
            return self.log_test("Send OTP", False, f"- Status: {response.status_code if response else 'None'}, Error: {error}")

    def test_verify_otp(self):
        """Test OTP verification and login"""
        print("\n🔍 Testing OTP Verification...")
        response = self.make_request('POST', 'auth/verify-otp', {
            'phone': self.test_phone,
            'otp': self.demo_otp
        })
        
        if response and response.status_code == 200:
            data = response.json()
            self.token = data.get('access_token')
            user_data = data.get('user', {})
            self.user_id = user_data.get('id')
            return self.log_test("Verify OTP", True, f"- Token received, User: {user_data.get('name')}, Role: {user_data.get('role')}")
        else:
            error = response.json().get('detail', 'Unknown error') if response else 'No response'
            return self.log_test("Verify OTP", False, f"- Status: {response.status_code if response else 'None'}, Error: {error}")

    def test_get_current_user(self):
        """Test getting current user info"""
        print("\n🔍 Testing Get Current User...")
        response = self.make_request('GET', 'auth/me')
        
        if response and response.status_code == 200:
            user_data = response.json()
            return self.log_test("Get Current User", True, f"- User: {user_data.get('name')}")
        else:
            error = response.json().get('detail', 'Unknown error') if response else 'No response'
            return self.log_test("Get Current User", False, f"- Status: {response.status_code if response else 'None'}, Error: {error}")

    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        print("\n🔍 Testing Dashboard Stats...")
        response = self.make_request('GET', 'dashboard/stats')
        
        if response and response.status_code == 200:
            stats = response.json()
            return self.log_test("Dashboard Stats", True, f"- Properties: {stats.get('total_properties')}, FY: {stats.get('current_fy')}")
        else:
            error = response.json().get('detail', 'Unknown error') if response else 'No response'
            return self.log_test("Dashboard Stats", False, f"- Status: {response.status_code if response else 'None'}, Error: {error}")

    def test_seed_data(self):
        """Test sample data creation"""
        print("\n🔍 Testing Seed Data Creation...")
        response = self.make_request('POST', 'seed-data')
        
        if response and response.status_code == 200:
            return self.log_test("Seed Data", True, "- Sample data created successfully")
        else:
            error = response.json().get('detail', 'Unknown error') if response else 'No response'
            return self.log_test("Seed Data", False, f"- Status: {response.status_code if response else 'None'}, Error: {error}")

    def test_get_properties(self):
        """Test getting properties list"""
        print("\n🔍 Testing Get Properties...")
        response = self.make_request('GET', 'properties')
        
        if response and response.status_code == 200:
            properties = response.json()
            return self.log_test("Get Properties", True, f"- Found {len(properties)} properties")
        else:
            error = response.json().get('detail', 'Unknown error') if response else 'No response'
            return self.log_test("Get Properties", False, f"- Status: {response.status_code if response else 'None'}, Error: {error}")

    def test_create_property(self):
        """Test creating a new property"""
        print("\n🔍 Testing Create Property...")
        property_data = {
            "owner_name": "Test Owner",
            "owner_name_mr": "टेस्ट मालक",
            "house_no": "TEST-001",
            "ward_no": "99",
            "survey_no": "S-TEST-001",
            "plot_area_sqm": 100.0,
            "built_up_area_sqm": 80.0,
            "usage_type": "residential",
            "floor_count": 1,
            "construction_type": "pucca",
            "water_connection": True,
            "electricity_connection": True,
            "village": "Test Village",
            "taluka": "Test Taluka",
            "district": "Test District"
        }
        
        response = self.make_request('POST', 'properties', property_data)
        
        if response and response.status_code == 200:
            property_resp = response.json()
            self.test_property_id = property_resp.get('id')
            return self.log_test("Create Property", True, f"- Property ID: {property_resp.get('property_id')}")
        else:
            error = response.json().get('detail', 'Unknown error') if response else 'No response'
            return self.log_test("Create Property", False, f"- Status: {response.status_code if response else 'None'}, Error: {error}")

    def test_get_tax_rates(self):
        """Test getting tax rates"""
        print("\n🔍 Testing Get Tax Rates...")
        response = self.make_request('GET', 'tax-rates')
        
        if response and response.status_code == 200:
            rates = response.json()
            return self.log_test("Get Tax Rates", True, f"- Found {len(rates)} tax rates")
        else:
            error = response.json().get('detail', 'Unknown error') if response else 'No response'
            return self.log_test("Get Tax Rates", False, f"- Status: {response.status_code if response else 'None'}, Error: {error}")

    def test_get_demands(self):
        """Test getting demands"""
        print("\n🔍 Testing Get Demands...")
        response = self.make_request('GET', 'demands')
        
        if response and response.status_code == 200:
            demands = response.json()
            return self.log_test("Get Demands", True, f"- Found {len(demands)} demands")
        else:
            error = response.json().get('detail', 'Unknown error') if response else 'No response'
            return self.log_test("Get Demands", False, f"- Status: {response.status_code if response else 'None'}, Error: {error}")

    def test_ward_summary(self):
        """Test ward summary"""
        print("\n🔍 Testing Ward Summary...")
        response = self.make_request('GET', 'dashboard/ward-summary')
        
        if response and response.status_code == 200:
            summary = response.json()
            return self.log_test("Ward Summary", True, f"- Found {len(summary)} wards")
        else:
            error = response.json().get('detail', 'Unknown error') if response else 'No response'
            return self.log_test("Ward Summary", False, f"- Status: {response.status_code if response else 'None'}, Error: {error}")

    def run_all_tests(self):
        """Run comprehensive API tests"""
        print("🚀 Starting Digital Gram Panchayat API Tests")
        print(f"📍 Base URL: {self.base_url}")
        print(f"📱 Test Phone: {self.test_phone}")
        print(f"🔐 Demo OTP: {self.demo_otp}")
        
        # Authentication Tests
        if not self.test_send_otp():
            print("❌ OTP send failed - stopping tests")
            return False
            
        if not self.test_verify_otp():
            print("❌ OTP verification failed - stopping tests")
            return False
            
        if not self.test_get_current_user():
            print("❌ User authentication failed - stopping tests")
            return False

        # Dashboard Tests
        self.test_dashboard_stats()
        
        # Seed data (only if user has permission)
        self.test_seed_data()
        
        # Core functionality tests
        self.test_get_properties()
        self.test_create_property()
        self.test_get_tax_rates()
        self.test_get_demands()
        self.test_ward_summary()

        # Print final results
        print(f"\n📊 Test Results: {self.tests_passed}/{self.tests_run} tests passed")
        success_rate = (self.tests_passed / self.tests_run) * 100 if self.tests_run > 0 else 0
        print(f"✨ Success Rate: {success_rate:.1f}%")
        
        if success_rate >= 80:
            print("🎉 Backend APIs are working well!")
            return True
        else:
            print("⚠️  Some backend issues detected")
            return False

def main():
    tester = GramPanchayatAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())