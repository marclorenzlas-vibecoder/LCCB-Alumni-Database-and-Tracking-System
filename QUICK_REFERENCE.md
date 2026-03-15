# Quick Reference Card - Alumni Verification

## 📋 FOR ADMINS/TEACHERS

### When You Receive a Registration Notification

1. **Click the notification** or go to Admin Dashboard
2. **Review the registration details** - Click on the row to expand
3. **Verify the information:**
   - Is the Student ID valid?
   - Does the name match your records?
   - Do the dates make sense? (Batch → Graduation Year)
   - Is the course/program correct?

4. **Make a decision:**
   - ✅ **APPROVE** if verified → User can login immediately
   - ❌ **REJECT** if not verified → Provide a reason

### Quick Verification Checklist

```
□ Student ID matches school format (e.g., 2020-12345)
□ Name is complete and looks legitimate
□ Email domain is @gmail.com (for alumni)
□ Contact number is valid (09XX format for Philippines)
□ Level matches their course (e.g., College for BSCS)
□ Course was offered in that batch year
□ Graduation year >= Batch year
□ No obvious red flags in additional info
```

### Red Flags to Watch For

❌ Invalid or incomplete Student ID  
❌ Fake-looking names (e.g., "Test User", "John Doe")  
❌ Temporary email addresses  
❌ Graduation year before batch year  
❌ Course not offered by school  
❌ Suspicious or inconsistent information  

---

## 🎓 FOR STUDENTS/ALUMNI

### How to Register Successfully

1. **Use Your Real Information**
   - First Name: Your legal first name
   - Last Name: Your legal last name
   - Student ID: Exact ID from your school records

2. **Contact Information**
   - Email: Your active Gmail account
   - Contact Number: Your current phone number

3. **Educational Details**
   - Level: Select your educational level
   - Course: Full course name (e.g., "BS Computer Science")
   - Batch: Your batch/year (e.g., 2020)
   - Graduation Year: When you graduated (e.g., 2024)

4. **Additional Information** (Optional but helpful)
   - Student organizations you joined
   - Notable achievements
   - Current employment
   - Any other identifying information

### What Happens After Registration?

1. ✅ You submit the form
2. ⏳ Admin reviews your information (usually within 24-48 hours)
3. 📧 You receive approval notification
4. 🔓 You can now login to the system

**OR**

3. ❌ Your registration is rejected (with reason provided)
4. 📞 Contact admin office with proper documentation

### Why Was I Rejected?

Common reasons:
- Student ID doesn't match school records
- Information doesn't match official documents
- Incomplete or suspicious details
- Not a verified alumni of the institution

**Solution:** Contact the admin office directly with:
- Your student ID
- Copy of diploma or transcript
- Valid ID
- Contact information

---

## 🖥️ TECHNICAL QUICK START

### Running the Database Migration

```bash
cd backend
node scripts/add-verification-fields.js
```

### Starting the Application

```powershell
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### Checking Pending Registrations

**As Admin:**
1. Login with teacher account (@lccbonline.com)
2. Navigate to Admin Dashboard
3. Review pending registrations
4. Click row to see full details
5. Approve or Reject

### Testing the System

**Test Registration:**
- Go to: http://localhost:3002/register (or your frontend URL)
- Fill all fields with test data
- Submit

**Test Admin Review:**
- Login as admin
- Go to Admin Dashboard
- See the test registration
- Try approving/rejecting

---

## 🎯 FIELD PURPOSES

| Field | Why It's Needed |
|-------|----------------|
| **First Name + Last Name** | Match with official school records |
| **Student ID** | Primary identifier in school database |
| **Email** | Account login & communication |
| **Contact Number** | Backup verification method |
| **Level** | Determines alumni category |
| **Course** | Verify enrollment history |
| **Batch** | Year cohort for grouping |
| **Graduation Year** | Confirm completion |
| **Additional Info** | Extra context for verification |

---

## 📱 SUPPORT CONTACTS

**For Technical Issues:**
- Check logs in browser console (F12)
- Check backend terminal for errors
- Refer to IMPLEMENTATION_SUMMARY.md

**For Verification Issues:**
- Students should contact admin office
- Admins can manually create accounts after offline verification
- Keep documentation of all offline verifications

---

## ⚡ KEYBOARD SHORTCUTS IN ADMIN DASHBOARD

- **Click Row** - Expand/collapse details
- **Green Button** - Approve registration
- **Red Button** - Open reject form
- **Esc** - Close details panel (browser default)

---

## 🔒 SECURITY REMINDERS

✅ Never approve without verifying at least the Student ID
✅ Keep rejection reasons professional and clear
✅ Don't share admin credentials
✅ Review registrations regularly (don't let them pile up)
✅ When in doubt, verify offline before approving

---

**Last Updated:** February 22, 2026  
**Version:** 1.0  
**System:** Alumni Tracking with Verification
