/**
 * A small, real sample of India's location hierarchy so the app works out of the box.
 *
 * Production deployments should import the complete official datasets instead (see README,
 * "Location & education data"): the Local Government Directory (LGD) for states → districts →
 * sub-districts → villages, and the India Post PIN code directory for PIN codes and coordinates.
 * Imports upsert over these rows, so the sample never has to be removed.
 *
 * State codes are LGD state codes. Coordinates are approximate city centres (±~2 km), used only
 * for distance filters; a district takes the coordinates of its first listed settlement.
 */

export interface SampleState {
  lgd: number;
  name: string;
}

export interface SampleSettlement {
  state: number;
  district: string;
  subdistrict?: string;
  name: string;
  kind: 'city' | 'town' | 'village';
  lat: number;
  lng: number;
}

export interface SamplePincode {
  pincode: string;
  area: string;
  state: number;
  district: string;
  lat: number;
  lng: number;
}

export const SAMPLE_STATES: SampleState[] = [
  { lgd: 1, name: 'Jammu and Kashmir' },
  { lgd: 2, name: 'Himachal Pradesh' },
  { lgd: 3, name: 'Punjab' },
  { lgd: 4, name: 'Chandigarh' },
  { lgd: 5, name: 'Uttarakhand' },
  { lgd: 6, name: 'Haryana' },
  { lgd: 7, name: 'Delhi' },
  { lgd: 8, name: 'Rajasthan' },
  { lgd: 9, name: 'Uttar Pradesh' },
  { lgd: 10, name: 'Bihar' },
  { lgd: 11, name: 'Sikkim' },
  { lgd: 12, name: 'Arunachal Pradesh' },
  { lgd: 13, name: 'Nagaland' },
  { lgd: 14, name: 'Manipur' },
  { lgd: 15, name: 'Mizoram' },
  { lgd: 16, name: 'Tripura' },
  { lgd: 17, name: 'Meghalaya' },
  { lgd: 18, name: 'Assam' },
  { lgd: 19, name: 'West Bengal' },
  { lgd: 20, name: 'Jharkhand' },
  { lgd: 21, name: 'Odisha' },
  { lgd: 22, name: 'Chhattisgarh' },
  { lgd: 23, name: 'Madhya Pradesh' },
  { lgd: 24, name: 'Gujarat' },
  { lgd: 27, name: 'Maharashtra' },
  { lgd: 28, name: 'Andhra Pradesh' },
  { lgd: 29, name: 'Karnataka' },
  { lgd: 30, name: 'Goa' },
  { lgd: 31, name: 'Lakshadweep' },
  { lgd: 32, name: 'Kerala' },
  { lgd: 33, name: 'Tamil Nadu' },
  { lgd: 34, name: 'Puducherry' },
  { lgd: 35, name: 'Andaman and Nicobar Islands' },
  { lgd: 36, name: 'Telangana' },
  { lgd: 37, name: 'Ladakh' },
  { lgd: 38, name: 'Dadra and Nagar Haveli and Daman and Diu' },
];

export const SAMPLE_SETTLEMENTS: SampleSettlement[] = [
  // Telangana
  { state: 36, district: 'Hyderabad', name: 'Hyderabad', kind: 'city', lat: 17.385, lng: 78.4867 },
  { state: 36, district: 'Hyderabad', name: 'Secunderabad', kind: 'city', lat: 17.4399, lng: 78.4983 },
  { state: 36, district: 'Warangal', name: 'Warangal', kind: 'city', lat: 17.9689, lng: 79.5941 },
  { state: 36, district: 'Karimnagar', name: 'Karimnagar', kind: 'city', lat: 18.4386, lng: 79.1288 },
  { state: 36, district: 'Nizamabad', name: 'Nizamabad', kind: 'city', lat: 18.6725, lng: 78.0941 },
  { state: 36, district: 'Sangareddy', name: 'Sangareddy', kind: 'town', lat: 17.6197, lng: 78.0816 },
  { state: 36, district: 'Sangareddy', subdistrict: 'Sangareddy', name: 'Kandi', kind: 'village', lat: 17.5936, lng: 78.123 },
  // Andhra Pradesh
  { state: 28, district: 'Visakhapatnam', name: 'Visakhapatnam', kind: 'city', lat: 17.6868, lng: 83.2185 },
  { state: 28, district: 'NTR', name: 'Vijayawada', kind: 'city', lat: 16.5062, lng: 80.648 },
  { state: 28, district: 'Guntur', name: 'Guntur', kind: 'city', lat: 16.3067, lng: 80.4365 },
  { state: 28, district: 'Tirupati', name: 'Tirupati', kind: 'city', lat: 13.6288, lng: 79.4192 },
  // Karnataka
  { state: 29, district: 'Bengaluru Urban', name: 'Bengaluru', kind: 'city', lat: 12.9716, lng: 77.5946 },
  { state: 29, district: 'Mysuru', name: 'Mysuru', kind: 'city', lat: 12.2958, lng: 76.6394 },
  { state: 29, district: 'Dakshina Kannada', name: 'Mangaluru', kind: 'city', lat: 12.9141, lng: 74.856 },
  { state: 29, district: 'Dharwad', name: 'Hubballi', kind: 'city', lat: 15.3647, lng: 75.124 },
  { state: 29, district: 'Belagavi', name: 'Belagavi', kind: 'city', lat: 15.8497, lng: 74.4977 },
  { state: 29, district: 'Udupi', name: 'Udupi', kind: 'town', lat: 13.3409, lng: 74.7421 },
  { state: 29, district: 'Udupi', name: 'Manipal', kind: 'town', lat: 13.3525, lng: 74.7928 },
  // Tamil Nadu
  { state: 33, district: 'Chennai', name: 'Chennai', kind: 'city', lat: 13.0827, lng: 80.2707 },
  { state: 33, district: 'Coimbatore', name: 'Coimbatore', kind: 'city', lat: 11.0168, lng: 76.9558 },
  { state: 33, district: 'Madurai', name: 'Madurai', kind: 'city', lat: 9.9252, lng: 78.1198 },
  { state: 33, district: 'Tiruchirappalli', name: 'Tiruchirappalli', kind: 'city', lat: 10.7905, lng: 78.7047 },
  { state: 33, district: 'Vellore', name: 'Vellore', kind: 'city', lat: 12.9165, lng: 79.1325 },
  { state: 33, district: 'Chengalpattu', name: 'Chengalpattu', kind: 'town', lat: 12.6921, lng: 79.9766 },
  { state: 33, district: 'Chengalpattu', subdistrict: 'Chengalpattu', name: 'Kattankulathur', kind: 'village', lat: 12.823, lng: 80.044 },
  // Kerala
  { state: 32, district: 'Thiruvananthapuram', name: 'Thiruvananthapuram', kind: 'city', lat: 8.5241, lng: 76.9366 },
  { state: 32, district: 'Ernakulam', name: 'Kochi', kind: 'city', lat: 9.9312, lng: 76.2673 },
  { state: 32, district: 'Ernakulam', name: 'Aluva', kind: 'town', lat: 10.1004, lng: 76.357 },
  { state: 32, district: 'Kozhikode', name: 'Kozhikode', kind: 'city', lat: 11.2588, lng: 75.7804 },
  // Maharashtra
  { state: 27, district: 'Mumbai', name: 'Mumbai', kind: 'city', lat: 19.076, lng: 72.8777 },
  { state: 27, district: 'Thane', name: 'Thane', kind: 'city', lat: 19.2183, lng: 72.9781 },
  { state: 27, district: 'Pune', name: 'Pune', kind: 'city', lat: 18.5204, lng: 73.8567 },
  { state: 27, district: 'Pune', name: 'Lonavala', kind: 'town', lat: 18.7546, lng: 73.4062 },
  { state: 27, district: 'Nagpur', name: 'Nagpur', kind: 'city', lat: 21.1458, lng: 79.0882 },
  { state: 27, district: 'Nashik', name: 'Nashik', kind: 'city', lat: 19.9975, lng: 73.7898 },
  { state: 27, district: 'Chhatrapati Sambhajinagar', name: 'Chhatrapati Sambhajinagar', kind: 'city', lat: 19.8762, lng: 75.3433 },
  // Gujarat
  { state: 24, district: 'Ahmedabad', name: 'Ahmedabad', kind: 'city', lat: 23.0225, lng: 72.5714 },
  { state: 24, district: 'Gandhinagar', name: 'Gandhinagar', kind: 'city', lat: 23.2156, lng: 72.6369 },
  { state: 24, district: 'Surat', name: 'Surat', kind: 'city', lat: 21.1702, lng: 72.8311 },
  { state: 24, district: 'Vadodara', name: 'Vadodara', kind: 'city', lat: 22.3072, lng: 73.1812 },
  { state: 24, district: 'Rajkot', name: 'Rajkot', kind: 'city', lat: 22.3039, lng: 70.8022 },
  // Delhi, Haryana, Punjab, Chandigarh
  { state: 7, district: 'New Delhi', name: 'New Delhi', kind: 'city', lat: 28.6139, lng: 77.209 },
  { state: 6, district: 'Gurugram', name: 'Gurugram', kind: 'city', lat: 28.4595, lng: 77.0266 },
  { state: 6, district: 'Faridabad', name: 'Faridabad', kind: 'city', lat: 28.4089, lng: 77.3178 },
  { state: 3, district: 'Ludhiana', name: 'Ludhiana', kind: 'city', lat: 30.901, lng: 75.8573 },
  { state: 3, district: 'Amritsar', name: 'Amritsar', kind: 'city', lat: 31.634, lng: 74.8723 },
  { state: 3, district: 'Rupnagar', name: 'Rupnagar', kind: 'town', lat: 30.966, lng: 76.533 },
  { state: 4, district: 'Chandigarh', name: 'Chandigarh', kind: 'city', lat: 30.7333, lng: 76.7794 },
  // Uttar Pradesh, Uttarakhand
  { state: 9, district: 'Lucknow', name: 'Lucknow', kind: 'city', lat: 26.8467, lng: 80.9462 },
  { state: 9, district: 'Kanpur Nagar', name: 'Kanpur', kind: 'city', lat: 26.4499, lng: 80.3319 },
  { state: 9, district: 'Gautam Buddha Nagar', name: 'Noida', kind: 'city', lat: 28.5355, lng: 77.391 },
  { state: 9, district: 'Ghaziabad', name: 'Ghaziabad', kind: 'city', lat: 28.6692, lng: 77.4538 },
  { state: 9, district: 'Varanasi', name: 'Varanasi', kind: 'city', lat: 25.3176, lng: 82.9739 },
  { state: 9, district: 'Prayagraj', name: 'Prayagraj', kind: 'city', lat: 25.4358, lng: 81.8463 },
  { state: 9, district: 'Agra', name: 'Agra', kind: 'city', lat: 27.1767, lng: 78.0081 },
  { state: 9, district: 'Aligarh', name: 'Aligarh', kind: 'city', lat: 27.8974, lng: 78.088 },
  { state: 5, district: 'Dehradun', name: 'Dehradun', kind: 'city', lat: 30.3165, lng: 78.0322 },
  { state: 5, district: 'Haridwar', name: 'Roorkee', kind: 'town', lat: 29.8543, lng: 77.888 },
  // Rajasthan
  { state: 8, district: 'Jaipur', name: 'Jaipur', kind: 'city', lat: 26.9124, lng: 75.7873 },
  { state: 8, district: 'Jodhpur', name: 'Jodhpur', kind: 'city', lat: 26.2389, lng: 73.0243 },
  { state: 8, district: 'Udaipur', name: 'Udaipur', kind: 'city', lat: 24.5854, lng: 73.7125 },
  { state: 8, district: 'Kota', name: 'Kota', kind: 'city', lat: 25.2138, lng: 75.8648 },
  { state: 8, district: 'Jhunjhunu', name: 'Pilani', kind: 'town', lat: 28.367, lng: 75.604 },
  // Madhya Pradesh, Chhattisgarh
  { state: 23, district: 'Bhopal', name: 'Bhopal', kind: 'city', lat: 23.2599, lng: 77.4126 },
  { state: 23, district: 'Indore', name: 'Indore', kind: 'city', lat: 22.7196, lng: 75.8577 },
  { state: 23, district: 'Gwalior', name: 'Gwalior', kind: 'city', lat: 26.2183, lng: 78.1828 },
  { state: 23, district: 'Jabalpur', name: 'Jabalpur', kind: 'city', lat: 23.1815, lng: 79.9864 },
  { state: 22, district: 'Raipur', name: 'Raipur', kind: 'city', lat: 21.2514, lng: 81.6296 },
  // East
  { state: 19, district: 'Kolkata', name: 'Kolkata', kind: 'city', lat: 22.5726, lng: 88.3639 },
  { state: 19, district: 'Howrah', name: 'Howrah', kind: 'city', lat: 22.5958, lng: 88.2636 },
  { state: 19, district: 'Darjeeling', name: 'Siliguri', kind: 'city', lat: 26.7271, lng: 88.3953 },
  { state: 19, district: 'Paschim Medinipur', name: 'Kharagpur', kind: 'city', lat: 22.346, lng: 87.232 },
  { state: 10, district: 'Patna', name: 'Patna', kind: 'city', lat: 25.5941, lng: 85.1376 },
  { state: 20, district: 'Ranchi', name: 'Ranchi', kind: 'city', lat: 23.3441, lng: 85.3096 },
  { state: 20, district: 'Purbi Singhbhum', name: 'Jamshedpur', kind: 'city', lat: 22.8046, lng: 86.2029 },
  { state: 21, district: 'Khordha', name: 'Bhubaneswar', kind: 'city', lat: 20.2961, lng: 85.8245 },
  { state: 21, district: 'Cuttack', name: 'Cuttack', kind: 'city', lat: 20.4625, lng: 85.8828 },
  // North-east
  { state: 18, district: 'Kamrup Metropolitan', name: 'Guwahati', kind: 'city', lat: 26.1445, lng: 91.7362 },
  { state: 17, district: 'East Khasi Hills', name: 'Shillong', kind: 'city', lat: 25.5788, lng: 91.8933 },
  { state: 14, district: 'Imphal West', name: 'Imphal', kind: 'city', lat: 24.817, lng: 93.9368 },
  { state: 16, district: 'West Tripura', name: 'Agartala', kind: 'city', lat: 23.8315, lng: 91.2868 },
  { state: 11, district: 'Gangtok', name: 'Gangtok', kind: 'town', lat: 27.3389, lng: 88.6065 },
  { state: 15, district: 'Aizawl', name: 'Aizawl', kind: 'city', lat: 23.7271, lng: 92.7176 },
  { state: 13, district: 'Kohima', name: 'Kohima', kind: 'town', lat: 25.6751, lng: 94.1086 },
  { state: 12, district: 'Papum Pare', name: 'Itanagar', kind: 'town', lat: 27.0844, lng: 93.6053 },
  // Hills, islands and other union territories
  { state: 30, district: 'North Goa', name: 'Panaji', kind: 'city', lat: 15.4909, lng: 73.8278 },
  { state: 2, district: 'Shimla', name: 'Shimla', kind: 'city', lat: 31.1048, lng: 77.1734 },
  { state: 1, district: 'Srinagar', name: 'Srinagar', kind: 'city', lat: 34.0837, lng: 74.7973 },
  { state: 1, district: 'Jammu', name: 'Jammu', kind: 'city', lat: 32.7266, lng: 74.857 },
  { state: 37, district: 'Leh', name: 'Leh', kind: 'town', lat: 34.1526, lng: 77.577 },
  { state: 34, district: 'Puducherry', name: 'Puducherry', kind: 'city', lat: 11.9416, lng: 79.8083 },
  { state: 35, district: 'South Andaman', name: 'Sri Vijaya Puram', kind: 'town', lat: 11.6234, lng: 92.7265 },
  { state: 31, district: 'Lakshadweep', name: 'Kavaratti', kind: 'town', lat: 10.5669, lng: 72.642 },
  { state: 38, district: 'Daman', name: 'Daman', kind: 'town', lat: 20.3974, lng: 72.8328 },
];

export const SAMPLE_PINCODES: SamplePincode[] = [
  { pincode: '500001', area: 'Hyderabad GPO', state: 36, district: 'Hyderabad', lat: 17.385, lng: 78.4867 },
  { pincode: '500003', area: 'Secunderabad', state: 36, district: 'Hyderabad', lat: 17.4399, lng: 78.4983 },
  { pincode: '502285', area: 'Kandi', state: 36, district: 'Sangareddy', lat: 17.5936, lng: 78.123 },
  { pincode: '560001', area: 'Bengaluru GPO', state: 29, district: 'Bengaluru Urban', lat: 12.9716, lng: 77.5946 },
  { pincode: '576104', area: 'Manipal', state: 29, district: 'Udupi', lat: 13.3525, lng: 74.7928 },
  { pincode: '600001', area: 'Chennai GPO', state: 33, district: 'Chennai', lat: 13.0827, lng: 80.2707 },
  { pincode: '603203', area: 'Kattankulathur', state: 33, district: 'Chengalpattu', lat: 12.823, lng: 80.044 },
  { pincode: '400001', area: 'Mumbai GPO', state: 27, district: 'Mumbai', lat: 19.076, lng: 72.8777 },
  { pincode: '411001', area: 'Pune City', state: 27, district: 'Pune', lat: 18.5204, lng: 73.8567 },
  { pincode: '110001', area: 'New Delhi GPO', state: 7, district: 'New Delhi', lat: 28.6139, lng: 77.209 },
  { pincode: '700001', area: 'Kolkata GPO', state: 19, district: 'Kolkata', lat: 22.5726, lng: 88.3639 },
  { pincode: '380001', area: 'Ahmedabad GPO', state: 24, district: 'Ahmedabad', lat: 23.0225, lng: 72.5714 },
  { pincode: '302001', area: 'Jaipur GPO', state: 8, district: 'Jaipur', lat: 26.9124, lng: 75.7873 },
  { pincode: '333031', area: 'Pilani', state: 8, district: 'Jhunjhunu', lat: 28.367, lng: 75.604 },
  { pincode: '226001', area: 'Lucknow GPO', state: 9, district: 'Lucknow', lat: 26.8467, lng: 80.9462 },
  { pincode: '682001', area: 'Kochi', state: 32, district: 'Ernakulam', lat: 9.9312, lng: 76.2673 },
  { pincode: '695001', area: 'Thiruvananthapuram GPO', state: 32, district: 'Thiruvananthapuram', lat: 8.5241, lng: 76.9366 },
];
