/**
 * A small sample of real Indian universities and colleges so education features work out of the
 * box. Production deployments should import the full AISHE (All India Survey on Higher Education)
 * directory instead (see README, "Location & education data"); imported rows carry AISHE codes.
 *
 * `state` is an LGD state code and `district` must match a district in the location sample
 * (or be omitted); both are resolved to place ids when seeding.
 */

export interface SampleInstitution {
  name: string;
  shortName: string;
  kind: 'university' | 'college' | 'standalone';
  state: number;
  district?: string;
  city: string;
}

export const SAMPLE_INSTITUTIONS: SampleInstitution[] = [
  // Institutes of national importance (listed as universities in AISHE)
  { name: 'Indian Institute of Technology Bombay', shortName: 'IIT Bombay', kind: 'university', state: 27, district: 'Mumbai', city: 'Mumbai' },
  { name: 'Indian Institute of Technology Delhi', shortName: 'IIT Delhi', kind: 'university', state: 7, city: 'New Delhi' },
  { name: 'Indian Institute of Technology Madras', shortName: 'IIT Madras', kind: 'university', state: 33, district: 'Chennai', city: 'Chennai' },
  { name: 'Indian Institute of Technology Kanpur', shortName: 'IIT Kanpur', kind: 'university', state: 9, district: 'Kanpur Nagar', city: 'Kanpur' },
  { name: 'Indian Institute of Technology Kharagpur', shortName: 'IIT Kharagpur', kind: 'university', state: 19, district: 'Paschim Medinipur', city: 'Kharagpur' },
  { name: 'Indian Institute of Technology Hyderabad', shortName: 'IIT Hyderabad', kind: 'university', state: 36, district: 'Sangareddy', city: 'Kandi' },
  { name: 'Indian Institute of Technology Roorkee', shortName: 'IIT Roorkee', kind: 'university', state: 5, district: 'Haridwar', city: 'Roorkee' },
  { name: 'Indian Institute of Technology Guwahati', shortName: 'IIT Guwahati', kind: 'university', state: 18, city: 'Guwahati' },
  { name: 'Indian Institute of Technology Ropar', shortName: 'IIT Ropar', kind: 'university', state: 3, district: 'Rupnagar', city: 'Rupnagar' },
  { name: 'Indian Institute of Science', shortName: 'IISc', kind: 'university', state: 29, district: 'Bengaluru Urban', city: 'Bengaluru' },
  { name: 'Indian Institute of Management Ahmedabad', shortName: 'IIM Ahmedabad', kind: 'university', state: 24, district: 'Ahmedabad', city: 'Ahmedabad' },
  { name: 'National Institute of Technology Warangal', shortName: 'NIT Warangal', kind: 'university', state: 36, district: 'Warangal', city: 'Warangal' },
  { name: 'National Institute of Technology Tiruchirappalli', shortName: 'NIT Trichy', kind: 'university', state: 33, district: 'Tiruchirappalli', city: 'Tiruchirappalli' },
  { name: 'National Institute of Technology Karnataka', shortName: 'NITK Surathkal', kind: 'university', state: 29, district: 'Dakshina Kannada', city: 'Mangaluru' },
  { name: 'International Institute of Information Technology Hyderabad', shortName: 'IIIT Hyderabad', kind: 'university', state: 36, city: 'Hyderabad' },
  // Central and state universities
  { name: 'University of Hyderabad', shortName: 'UoH', kind: 'university', state: 36, city: 'Hyderabad' },
  { name: 'Osmania University', shortName: 'OU', kind: 'university', state: 36, district: 'Hyderabad', city: 'Hyderabad' },
  { name: 'Jawaharlal Nehru Technological University Hyderabad', shortName: 'JNTUH', kind: 'university', state: 36, city: 'Hyderabad' },
  { name: 'University of Delhi', shortName: 'DU', kind: 'university', state: 7, city: 'Delhi' },
  { name: 'Jawaharlal Nehru University', shortName: 'JNU', kind: 'university', state: 7, city: 'New Delhi' },
  { name: 'Jamia Millia Islamia', shortName: 'JMI', kind: 'university', state: 7, city: 'New Delhi' },
  { name: 'Anna University', shortName: 'Anna University', kind: 'university', state: 33, district: 'Chennai', city: 'Chennai' },
  { name: 'University of Madras', shortName: 'University of Madras', kind: 'university', state: 33, district: 'Chennai', city: 'Chennai' },
  { name: 'Bangalore University', shortName: 'BU', kind: 'university', state: 29, district: 'Bengaluru Urban', city: 'Bengaluru' },
  { name: 'University of Mumbai', shortName: 'MU', kind: 'university', state: 27, district: 'Mumbai', city: 'Mumbai' },
  { name: 'Savitribai Phule Pune University', shortName: 'SPPU', kind: 'university', state: 27, district: 'Pune', city: 'Pune' },
  { name: 'COEP Technological University', shortName: 'COEP', kind: 'university', state: 27, district: 'Pune', city: 'Pune' },
  { name: 'University of Rajasthan', shortName: 'RU', kind: 'university', state: 8, district: 'Jaipur', city: 'Jaipur' },
  { name: 'Jadavpur University', shortName: 'JU', kind: 'university', state: 19, district: 'Kolkata', city: 'Kolkata' },
  { name: 'University of Calcutta', shortName: 'CU', kind: 'university', state: 19, district: 'Kolkata', city: 'Kolkata' },
  { name: 'Presidency University', shortName: 'Presidency', kind: 'university', state: 19, district: 'Kolkata', city: 'Kolkata' },
  { name: 'Banaras Hindu University', shortName: 'BHU', kind: 'university', state: 9, district: 'Varanasi', city: 'Varanasi' },
  { name: 'Aligarh Muslim University', shortName: 'AMU', kind: 'university', state: 9, district: 'Aligarh', city: 'Aligarh' },
  { name: 'University of Lucknow', shortName: 'LU', kind: 'university', state: 9, district: 'Lucknow', city: 'Lucknow' },
  { name: 'Panjab University', shortName: 'PU', kind: 'university', state: 4, district: 'Chandigarh', city: 'Chandigarh' },
  { name: 'Cochin University of Science and Technology', shortName: 'CUSAT', kind: 'university', state: 32, district: 'Ernakulam', city: 'Kochi' },
  { name: 'University of Kerala', shortName: 'University of Kerala', kind: 'university', state: 32, district: 'Thiruvananthapuram', city: 'Thiruvananthapuram' },
  { name: 'Andhra University', shortName: 'AU', kind: 'university', state: 28, district: 'Visakhapatnam', city: 'Visakhapatnam' },
  { name: 'Gujarat University', shortName: 'GU', kind: 'university', state: 24, district: 'Ahmedabad', city: 'Ahmedabad' },
  // Private and deemed universities
  { name: 'Birla Institute of Technology and Science, Pilani', shortName: 'BITS Pilani', kind: 'university', state: 8, district: 'Jhunjhunu', city: 'Pilani' },
  { name: 'Manipal Academy of Higher Education', shortName: 'MAHE', kind: 'university', state: 29, district: 'Udupi', city: 'Manipal' },
  { name: 'Vellore Institute of Technology', shortName: 'VIT', kind: 'university', state: 33, district: 'Vellore', city: 'Vellore' },
  { name: 'SRM Institute of Science and Technology', shortName: 'SRMIST', kind: 'university', state: 33, district: 'Chengalpattu', city: 'Kattankulathur' },
  { name: 'Christ University', shortName: 'Christ', kind: 'university', state: 29, district: 'Bengaluru Urban', city: 'Bengaluru' },
  // Colleges
  { name: "St. Xavier's College, Mumbai", shortName: "St. Xavier's", kind: 'college', state: 27, district: 'Mumbai', city: 'Mumbai' },
  { name: 'Loyola College', shortName: 'Loyola', kind: 'college', state: 33, district: 'Chennai', city: 'Chennai' },
  { name: 'Hindu College', shortName: 'Hindu College', kind: 'college', state: 7, city: 'Delhi' },
  { name: 'Lady Shri Ram College for Women', shortName: 'LSR', kind: 'college', state: 7, city: 'New Delhi' },
];
