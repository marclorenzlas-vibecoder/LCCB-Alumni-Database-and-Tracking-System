# Alumni Verification System Guide

## Overview
The system now includes a **School ID verification feature** that checks if a registrant's School ID exists in your verified alumni database. This helps admins verify if someone is a legitimate alumni before approving their registration.

## How It Works

### 1. Database Structure
- The `alumni` table now has a `student_id` field (VARCHAR 50, UNIQUE)
- This stores the official School IDs of verified alumni

### 2. Verification Process
When someone registers:
1. They enter their School ID (e.g., `21-0087-958`)
2. The registration goes to the admin dashboard for review
3. The system automatically checks if that School ID exists in the `alumni` table
4. Admin sees a visual indicator:
   - **✓ Verified** (Green badge) = School ID found in alumni database
   - **✗ Not Found** (Red badge) = School ID not in alumni database

### 3. Admin Dashboard Features
- **Main table**: Shows verification badge next to each School ID
- **Expanded details**: Shows full verification status and matching alumni record details
- Admins can approve/reject registrations based on verification status

## Populating the Alumni Database

You need to add verified alumni records to your database. Here are three methods:

### Method 1: Using the Sample Script
```bash
cd backend
node scripts/add-sample-verified-alumni.js
```

Edit the script to add your actual alumni data:
```javascript
const sampleAlumni = [
  {
    student_id: '21-0087-958',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe.alumni@example.com',
    level: 'Senior_High_school',
    course: 'GAS',
    batch: 2020,
    graduation_year: 2021,
    is_verified: true
  },
  // Add more alumni...
];
```

### Method 2: Manual Database Query
Run this SQL directly in your database:
```sql
INSERT INTO alumni (student_id, first_name, last_name, graduation_year, course, batch, level, is_verified)
VALUES 
  ('21-0087-958', 'John', 'Doe', 2021, 'GAS', 2020, 'Senior_High_school', 1),
  ('22-0123-456', 'Jane', 'Smith', 2022, 'STEM', 2021, 'Senior_High_school', 1);
```

### Method 3: Import from Excel/CSV
1. Prepare your alumni list in Excel with columns:
   - student_id
   - first_name
   - last_name
   - graduation_year
   - course
   - batch
   - level
   - email (optional)
   - contact_number (optional)

2. Export to CSV

3. Use a database tool (like phpMyAdmin, MySQL Workbench) to import the CSV into the `alumni` table

## API Endpoint

The system includes a new API endpoint:

```
GET /api/auth/verify-student-id/:studentId
```

**Example Request:**
```bash
curl http://localhost:5001/api/auth/verify-student-id/21-0087-958
```

**Response (Verified):**
```json
{
  "verified": true,
  "message": "School ID found in alumni records",
  "alumni": {
    "student_id": "21-0087-958",
    "first_name": "John",
    "last_name": "Doe",
    "graduation_year": 2021,
    "course": "GAS",
    "batch": 2020,
    "level": "Senior_High_school"
  }
}
```

**Response (Not Found):**
```json
{
  "verified": false,
  "message": "School ID not found in alumni records"
}
```

## Important Notes

1. **School ID Format**: Make sure School IDs in your alumni database match the format users enter (e.g., `21-0087-958`)

2. **Unique Constraint**: Each School ID must be unique in the alumni table

3. **Case Sensitivity**: School ID searches are case-sensitive

4. **Not Required for Approval**: A "Not Found" status doesn't automatically reject registrations - admins still make the final decision

5. **Privacy**: Only basic alumni information is shown to admins during verification

## Future Enhancements

You could extend this system to:
- Allow admins to add alumni directly from the dashboard
- Bulk import alumni from CSV files through the web interface  
- Show more detailed alumni records
- Add fuzzy matching for similar names
- Send validation emails to alumni already in the database

## Troubleshooting

**Q: School ID shows "Not Found" for a valid alumni**
A: Check if the School ID exists in the `alumni` table and matches exactly (including format and case)

**Q: How do I check what's in my alumni database?**
A: Run this query:
```sql
SELECT student_id, first_name, last_name, graduation_year FROM alumni WHERE student_id IS NOT NULL;
```

**Q: Can I change the School ID format?**
A: Yes, but make sure to update both the registration form validation and existing alumni records to match the new format
