# Alumni Verification System - Implementation Guide

## Overview
Your alumni tracking system now includes a comprehensive verification workflow to ensure only certified alumni can register and access the system.

## 🔐 How the Security System Works

### 1. **Registration Phase**
When a user tries to register as an alumni:

- They must provide verification information:
  - ✅ **First Name & Last Name** - Full legal name
  - ✅ **Student/Alumni ID** - Their official student ID number
  - ✅ **Contact Number** - Phone number for verification
  - ✅ **Email Address** - Must be Gmail (for alumni)
  - ✅ **Educational Level** - College, Senior High, or High School
  - ✅ **Course/Program** - What they studied
  - ✅ **Batch** - Their batch/year group
  - ✅ **Graduation Year** - When they graduated
  - ✅ **Additional Information** (optional) - Any extra verification details

- The registration goes to a **pending_registration** table (NOT the main user table)
- The user **cannot login** until approved by admin
- They receive a message: "Registration submitted successfully! Please wait for admin approval."

### 2. **Admin Notification**
When someone registers:

- All admins/teachers receive a notification
- The notification includes key verification details:
  - Name, Student ID, Contact Number
  - Level, Course, Batch, Graduation Year
  - Email address

### 3. **Admin Review Phase**
Admins can access the Admin Dashboard to review pending registrations:

**Verification Steps for Admin:**

1. **Check Student ID** - Look up the ID in your school records database
2. **Verify Name** - Match the name with school records
3. **Contact Verification** - You can call the contact number if needed
4. **Cross-Reference Details** - Check if:
   - The course matches their student ID
   - The graduation year matches their batch
   - The educational level is correct

5. **Decision:**
   - ✅ **APPROVE** - If verified as a legitimate alumni
     - User account is created
     - Alumni profile is created with verified status
     - User can now login
     - User receives approval notification
   - ❌ **REJECT** - If not verified or suspicious
     - Must provide a reason for rejection
     - Registration is deleted
     - User cannot login

### 4. **Post-Approval**
Once approved:
- User is moved to the main `user` table
- Alumni profile is created in `alumni` table
- Account is marked as `is_verified: true`
- User can login with their credentials
- Full access to the alumni tracking system

## 📊 Database Changes

### New Fields in `pending_registration` table:
```sql
- first_name       VARCHAR(100)   -- Alumni's first name
- last_name        VARCHAR(100)   -- Alumni's last name  
- student_id       VARCHAR(50)    -- Student/Alumni ID number
- contact_number   VARCHAR(50)    -- Phone for verification
- verification_document VARCHAR(255) -- Path to uploaded docs (future)
- additional_info  TEXT           -- Extra verification details
```

## 🚀 Setup Instructions

### Step 1: Run Database Migration
```bash
cd backend
node scripts/add-verification-fields.js
```

This script adds the new verification columns to your database.

### Step 2: Update Prisma Schema
Already updated! The schema now includes all verification fields.

### Step 3: Start Your Servers

**Backend:**
```bash
cd backend
npm start
```

**Frontend:**
```bash
cd frontend
npm run dev
```

## 📝 How to Verify Alumni (Admin Guide)

### Quick Verification Checklist

When reviewing a registration, check:

- [ ] **Student ID Format** - Does it match your school's ID format?
- [ ] **Name Spelling** - Check against official records
- [ ] **Course Code** - Valid course for that level?
- [ ] **Batch/Grad Year** - Do they align logically?
- [ ] **Contact Number** - Valid Philippines mobile number?
- [ ] **Email Domain** - Must be @gmail.com for alumni
- [ ] **Additional Info** - Any red flags or helpful context?

### Red Flags (Reject These)

❌ Invalid or fake student ID  
❌ Name doesn't match records  
❌ Course not offered in that year  
❌ Graduation year before enrollment  
❌ Suspicious or incomplete information  
❌ Email looks fake or temporary  

### Example Verification Scenarios

**✅ APPROVE Example:**
```
Name: Juan Dela Cruz
Student ID: 2020-12345
Email: juan.delacruz@gmail.com
Contact: 09171234567
Level: College
Course: BS Computer Science
Batch: 2020
Graduation: 2024
Additional Info: "I was part of the Computer Society"

Verification: ID found in records, name matches, course correct, years align.
Decision: APPROVE ✓
```

**❌ REJECT Example:**
```
Name: John Doe
Student ID: 12345
Email: test123@gmail.com
Contact: 0912
Level: College
Course: BSCS
Batch: 2025
Graduation: 2020
Additional Info: (empty)

Red Flags: Invalid ID format, grad year before batch, incomplete contact
Decision: REJECT ✗
Reason: "Invalid student ID format and inconsistent dates. Please contact admin."
```

## 🎯 Benefits of This System

1. **Security** - Only verified alumni can access the system
2. **Data Integrity** - All alumni information is validated
3. **Accountability** - Full audit trail of who registered and when
4. **Fraud Prevention** - Multiple verification points reduce fake accounts
5. **Admin Control** - Complete oversight of who gets access

## 🔄 User Flow Diagram

```
User Registration
    ↓
Form with Verification Fields
    ↓
Submitted to pending_registration table
    ↓
Notification sent to Admins
    ↓
Admin Reviews Details
    ↓
    ├─→ APPROVE → User account created → User can login
    └─→ REJECT → Registration deleted → User cannot access

```

## 💡 Tips for Students

**To ensure quick approval, students should:**

1. Use their **official student ID** exactly as it appears in school records
2. Provide a **valid contact number** that admin can verify
3. Use their **real name** (as per school documents)
4. Fill in **accurate course and graduation year**
5. Use the **additional info** field to add context like:
   - Student org participation
   - Notable achievements
   - Current employment (if relevant)
   - Any other identifying information

## 🛡️ Security Features

- **No auto-approval** - Every registration requires manual admin review
- **Email validation** - Only Gmail for alumni, institutional email for teachers
- **Password hashing** - All passwords stored securely with bcrypt
- **Duplicate prevention** - Can't register same email twice
- **Rejection tracking** - Rejected registrations are removed
- **Notification system** - Admins alerted immediately of new registrations

## 📞 Support

If a legitimate alumni is rejected:
- They should contact the admin office directly
- Provide official documentation (student ID, diploma, transcript)
- Admin can manually create their account after verification

## 🔮 Future Enhancements

Possible additions:
1. **Document Upload** - Allow users to upload student ID/diploma during registration
2. **SMS Verification** - Send verification code to contact number
3. **Alumni Network Check** - Cross-reference with existing verified alumni
4. **Batch Validation** - Only allow specific batches to register
5. **Automatic ID Verification** - Integration with school database API

---

## Need Help?

Contact your system administrator or refer to the main documentation.
