const axios = require('axios');

async function testAPICareerCreation() {
  try {
    const API_URL = 'http://localhost:5001/api';
    
    console.log('🧪 Testing automatic career creation via API...\n');
    
    // Get a pending application
    const applicationsRes = await axios.get(`${API_URL}/applications`);
    const pendingApp = applicationsRes.data.find(app => app.status === 'PENDING');
    
    if (!pendingApp) {
      console.log('❌ No pending applications found');
      return;
    }
    
    console.log('Found pending application:');
    console.log(`  ID: ${pendingApp.id}`);
    console.log(`  Applicant: ${pendingApp.applicant?.first_name} ${pendingApp.applicant?.last_name}`);
    console.log(`  Job: ${pendingApp.job_posting?.job_title}\n`);
    
    // Check career entries before
    const careersBefore = await axios.get(`${API_URL}/careers/alumni/${pendingApp.applicant_id}`);
    console.log(`Career entries before: ${careersBefore.data.length}\n`);
    
    // Accept the application
    console.log('📝 Accepting application via API...');
    await axios.patch(`${API_URL}/applications/${pendingApp.id}/status`, {
      status: 'ACCEPTED'
    });
    
    console.log('✅ Application accepted\n');
    
    // Check career entries after
    console.log('🔍 Checking if career entry was created...');
    const careersAfter = await axios.get(`${API_URL}/careers/alumni/${pendingApp.applicant_id}`);
    console.log(`Career entries after: ${careersAfter.data.length}\n`);
    
    if (careersAfter.data.length > careersBefore.data.length) {
      console.log('✅ SUCCESS! Career entry was automatically created!');
      const newCareer = careersAfter.data[0];
      console.log('New career entry:', {
        job_title: newCareer.job_title,
        company: newCareer.company,
        is_current: newCareer.is_current
      });
    } else {
      console.log('❌ FAILED! Career entry was NOT created automatically');
      console.log('Check the backend server logs for errors');
    }
    
    // Reset for future tests
    console.log('\n🔄 Resetting application to PENDING...');
    await axios.patch(`${API_URL}/applications/${pendingApp.id}/status`, {
      status: 'PENDING'
    });
    
    // Delete the created career entry
    if (careersAfter.data.length > careersBefore.data.length) {
      const newCareer = careersAfter.data[0];
      await axios.delete(`${API_URL}/careers/${newCareer.id}`);
    }
    
    console.log('✅ Reset complete\n');
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testAPICareerCreation();
