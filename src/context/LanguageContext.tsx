import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { toReadableHindi } from '../utils/readableHindiText';

export type AppLanguage = 'en' | 'hi';

export const LANGUAGE_STORAGE_KEY = 'crewcam_language';
export const COUNTRY_STORAGE_KEY = 'crewcam_country';

type LanguageContextType = {
  language: AppLanguage;
  countryCode: string;
  setLanguage: (language: AppLanguage) => Promise<void>;
  setCountryCode: (countryCode: string) => Promise<void>;
  t: (englishText: string) => string;
  formatName: (name?: string | null, maxWords?: number) => string;
};

const translations: Record<string, string> = {
  'Language': 'भाषा',
  'Country': 'देश',
  'Select Country': 'देश चुनें',
  'Close': 'बंद करें',
  'Loading...': 'लोड हो रहा है...',
  'Validation Error': 'मान्यकरण त्रुटि',
  'Please fill all fields and agree to terms.': 'कृपया सभी जानकारी भरें और शर्तों से सहमत हों।',
  'Employee Code': 'कर्मचारी कोड',
  'Phone Number': 'फोन नंबर',
  'I have read and agree to the': 'मैंने पढ़ लिया है और सहमत हूं',
  'terms and conditions': 'नियम और शर्तों',
  'SEND OTP': 'ओटीपी भेजें',
  'Need assistance? Contact support': 'सहायता चाहिए? सपोर्ट से संपर्क करें',
  'Terms & Conditions': 'नियम और शर्तें',
  'I Agree': 'मैं सहमत हूं',
  'OTP Not Sent': 'ओटीपी नहीं भेजा गया',
  'WhatsApp OTP API failed': 'व्हाट्सऐप ओटीपी सेवा विफल रही',
  'Login Failed': 'लॉगिन विफल',
  'Invalid credentials': 'अमान्य जानकारी',
  'Network error. Please check your connection.': 'नेटवर्क त्रुटि। कृपया अपना कनेक्शन जांचें।',
  '1. Accurate Information': '1. सही जानकारी',
  'You must provide accurate and complete information during registration.': 'पंजीकरण के दौरान सही और पूरी जानकारी देना आवश्यक है।',
  '2. Location Tracking': '2. स्थान ट्रैकिंग',
  'Your location will be tracked during work hours for attendance purposes.': 'उपस्थिति के लिए कार्य समय के दौरान आपका स्थान ट्रैक किया जाएगा।',
  '3. Data Security': '3. डेटा सुरक्षा',
  'Your data is secure and not shared with third parties without consent.': 'आपका डेटा सुरक्षित है और सहमति के बिना किसी तीसरे पक्ष से साझा नहीं किया जाता।',
  '4. Acceptable Use': '4. सही उपयोग',
  'You must not misuse the application or attempt unauthorized access.': 'आप ऐप का दुरुपयोग या अनधिकृत प्रवेश का प्रयास नहीं करेंगे।',
  '5. Account Access': '5. खाते की पहुंच',
  'Company reserves the right to suspend access for policy violations.': 'नीति उल्लंघन पर कंपनी पहुंच रोकने का अधिकार रखती है।',
  '6. OTP Confidentiality': '6. ओटीपी गोपनीयता',
  'OTP is confidential and should not be shared with anyone.': 'ओटीपी गोपनीय है और किसी से साझा नहीं करना चाहिए।',
  '7. Agreement': '7. सहमति',
  'By using this application, you agree to these terms and conditions.': 'इस ऐप का उपयोग करके आप इन नियमों और शर्तों से सहमत होते हैं।',
  'Please enter full 4-digit OTP': 'कृपया पूरा 4 अंकों का ओटीपी दर्ज करें',
  'Invalid OTP': 'अमान्य ओटीपी',
  'Something went wrong. Please try again.': 'कुछ गलत हो गया। कृपया फिर कोशिश करें।',
  'Wait': 'प्रतीक्षा करें',
  'Please wait': 'कृपया प्रतीक्षा करें',
  'seconds before resending': 'सेकंड फिर भेजने से पहले',
  'OTP resent successfully!': 'ओटीपी फिर से सफलतापूर्वक भेजा गया!',
  'Failed to resend OTP.': 'ओटीपी फिर से नहीं भेजा जा सका।',
  'Enter the 4-digit OTP sent to': 'भेजे गए 4 अंकों का ओटीपी दर्ज करें',
  'RESEND OTP': 'ओटीपी फिर भेजें',
  'RESEND': 'फिर भेजें',
  'VERIFY OTP': 'ओटीपी सत्यापित करें',
  'Menu': 'मेनू',
  'About us': 'हमारे बारे में',
  'Holiday List': 'छुट्टी सूची',
  'Logout': 'लॉगआउट',
  'ToDo': 'कार्य सूची',
  'Todo List': 'कार्य सूची',
  'Track assigned tasks, replies, deadlines and status updates.': 'सौंपे गए कार्य, उत्तर, समय सीमा और स्थिति अपडेट ट्रैक करें।',
  'Create New Task': 'नया कार्य बनाएं',
  'No tasks assigned': 'कोई कार्य नहीं सौंपा गया है',
  'All your tasks are complete!': 'आपके सभी कार्य पूरे हो चुके हैं!',
  'Send Reply': 'उत्तर भेजें',
  'Self': 'स्वयं',
  'Pending Task': 'लंबित कार्य',
  'Checking pending todo': 'लंबित कार्य जांच रहे हैं',
  'Complete pending todo first': 'पहले लंबित कार्य पूरा करें',
  'Write your reply here...': 'अपना उत्तर यहां लिखें...',
  'Update Task': 'कार्य अपडेट करें',
  'Deadline': 'समय सीमा',
  'Create Todo': 'नया कार्य बनाएं',
  'Assign tasks with a deadline and responsible team member.': 'समय सीमा और जिम्मेदार टीम सदस्य के साथ कार्य सौंपें।',
  'Create Task': 'कार्य विवरण',
  'Enter Task': 'कार्य दर्ज करें',
  'Job Deadline': 'कार्य की समय सीमा',
  'Select date and time': 'दिनांक और समय चुनें',
  'Select HOD': 'HOD चुनें',
  'Single': 'एक',
  'Multiple': 'अनेक',
  'CREATE TODO': 'कार्य बनाएं',
  'C.Updates': 'कंपनी अपडेट',
  'HR Support': 'मानव संसाधन सहायता',
  'Profile': 'व्यक्तिगत विवरण',
  'History': 'इतिहास',
  'Secure Verification': 'सुरक्षित सत्यापन',
  'Verify your identity to open dashboard': 'डैशबोर्ड खोलने के लिए अपनी पहचान सत्यापित करें',
  'Face Recognition': 'चेहरा पहचान',
  'Keep your face inside the circle': 'अपना चेहरा गोले के अंदर रखें',
  'Open camera and match face': 'कैमरा खोलकर चेहरा मिलाएं',
  'Fingerprint': 'अंगुली छाप',
  'Verify phone fingerprint': 'फोन की अंगुली छाप से सत्यापित करें',
  'Verified': 'सत्यापित',
  'Capturing face...': 'चेहरा कैप्चर हो रहा है...',
  'Cancel': 'रद्द करें',
  'Fingerprint Required': 'अंगुली छाप आवश्यक है',
  'Please set up fingerprint in your phone Settings first, then try again.': 'कृपया पहले फोन सेटिंग में अंगुली छाप जोड़ें, फिर दोबारा प्रयास करें।',
  'Verify your fingerprint': 'अपनी अंगुली छाप सत्यापित करें',
  'Verification Failed': 'सत्यापन असफल',
  'Fingerprint verification was cancelled or failed.': 'अंगुली छाप सत्यापन रद्द या असफल हो गया।',
  'Fingerprint Verified Successfully': 'अंगुली छाप सफलतापूर्वक सत्यापित हुई',
  'Your fingerprint verification is successful.': 'आपकी अंगुली छाप का सत्यापन सफल रहा।',
  'Continue': 'जारी रखें',
  'Hello': 'नमस्ते',
  'Important Notice': 'महत्वपूर्ण सूचना',
  'No update available.': 'कोई अपडेट उपलब्ध नहीं है।',
  'Continue to App': 'ऐप पर जारी रखें',
  'Verification Error': 'सत्यापन त्रुटि',
  'Camera Required': 'कैमरा जरूरी है',
  'Please allow camera permission for face recognition.': 'चेहरा पहचान के लिए कैमरे की अनुमति दें।',
  'Camera Not Found': 'कैमरा नहीं मिला',
  'Front camera is not available on this device.': 'इस डिवाइस पर फ्रंट कैमरा उपलब्ध नहीं है।',
  'Login Required': 'लॉगिन जरूरी है',
  'Please login again.': 'कृपया फिर से लॉगिन करें।',
  'Face verify API network failed': 'चेहरा सत्यापन सेवा से संपर्क असफल रहा',
  'Face Verified Successfully': 'चेहरा सफलतापूर्वक सत्यापित',
  'Your face verification is successful.': 'आपका चेहरा सत्यापन सफल रहा।',
  'Face Not Verified': 'चेहरा सत्यापित नहीं हुआ',
  'Face does not match your profile image.': 'चेहरा आपकी प्रोफाइल तस्वीर से मेल नहीं खाता।',
  'Camera Not Ready': 'कैमरा तैयार नहीं है',
  'Please wait a moment and try again.': 'कृपया थोड़ी देर रुककर फिर कोशिश करें।',
  'Raise queries, chat with assigned HR, HOD, or admin, and track status in one place.': 'अपनी समस्या दर्ज करें, नियुक्त मानव संसाधन अधिकारी, विभागाध्यक्ष या प्रशासक से बातचीत करें और स्थिति एक ही स्थान पर देखें।',
  'Submit Query': 'समस्या दर्ज करें',
  'Assigned Support Chats': 'नियुक्त सहायता बातचीत',
  'View assigned user chats and reply in real time.': 'नियुक्त उपयोगकर्ता बातचीत देखें और तुरंत जवाब दें।',
  'Assign to': 'नियुक्त करें',
  'Assigned Chats': 'नियुक्त बातचीत',
  'Active User Chats': 'सक्रिय उपयोगकर्ता बातचीत',
  'OPEN CHAT': 'बातचीत खोलें',
  'Unknown User': 'अज्ञात उपयोगकर्ता',
  'No assigned chats yet.': 'अभी कोई नियुक्त बातचीत नहीं है।',
  'No previous queries yet.': 'अभी कोई पुरानी समस्या नहीं है।',
  'Select your query': 'अपनी समस्या चुनें',
  'Select Query Type': 'समस्या का प्रकार चुनें',
  'Remark': 'टिप्पणी',
  'Enter your remark': 'अपनी टिप्पणी लिखें',
  'Add supporting attachment if required.': 'आवश्यक हो तो सहायक फाइल जोड़ें।',
  'Add': 'जोड़ें',
  'Image attached': 'तस्वीर जुड़ गई है',
  'SUBMIT QUERY': 'समस्या भेजें',
  'Your HR query has been submitted.': 'आपकी मानव संसाधन समस्या दर्ज हो गई है।',
  'Previous Queries': 'पुरानी समस्याएं',
  'Attachment': 'संलग्नक',
  'CHAT WITH': 'बात करें',
  'HR Support Chat': 'मानव संसाधन सहायता बातचीत',
  'Chat directly with our support team in real-time.': 'हमारी सहायता टीम से सीधे वास्तविक समय में बातचीत करें।',
  'Support Chat': 'सहायता बातचीत',
  'Assigned to': 'नियुक्त',
  'Type your message': 'अपना संदेश लिखें',
  'Send': 'भेजें',
  'Back': 'वापस',
  'You': 'आप',
  'Message Failed': 'संदेश नहीं भेजा गया',
  'Please try again': 'कृपया फिर कोशिश करें',
  'Error': 'त्रुटि',
  'Failed to send message': 'संदेश भेजने में समस्या आई',
  'No Internet Connection': 'इंटरनेट कनेक्शन उपलब्ध नहीं है',
  'Please check your Wi-Fi or Mobile Data connection.': 'कृपया वाई-फाई या मोबाइल डेटा कनेक्शन जांचें।',
  'Retry': 'फिर कोशिश करें',
  'Crewcam Service Menu': 'क्रूकैम सेवा मेनू',
  'Attendance Management': 'उपस्थिति प्रबंधन',
  'Mark, view, and manage team attendance effortlessly.': 'टीम की उपस्थिति आसानी से दर्ज करें, देखें और प्रबंधित करें।',
  'Leave Management': 'अवकाश प्रबंधन',
  'Apply for leaves and track request status.': 'अवकाश के लिए आवेदन करें और अनुरोध की स्थिति देखें।',
  'Meeting & Site Visit': 'बैठक और स्थल भ्रमण',
  'Schedule meetings and log site visit details.': 'बैठकें निर्धारित करें और स्थल भ्रमण विवरण दर्ज करें।',
  'Employee Live Tracking': 'कर्मचारी सीधा स्थान ट्रैकिंग',
  'Monitor employee live location': 'कर्मचारी का सीधा स्थान देखें',
  'Tracking': 'ट्रैकिंग',
  'Live field tracking': 'क्षेत्रीय गतिविधि की सीधी ट्रैकिंग',
  'Master Eye': 'मुख्य निगरानी',
  'View master admin controls': 'मुख्य प्रशासक नियंत्रण देखें',
  'Choose Action': 'कार्य चुनें',
  'Daily Attendance': 'दैनिक उपस्थिति',
  'Check in, check out and mark atten...': 'आगमन, प्रस्थान और उपस्थिति दर्ज करें...',
  'Attendance Status': 'उपस्थिति स्थिति',
  'View current and past attendance s...': 'वर्तमान और पिछली उपस्थिति स्थिति देखें...',
  'Leave Request': 'अवकाश अनुरोध',
  'Apply and track leave requests': 'अवकाश अनुरोध दर्ज करें और स्थिति देखें',
  'Manage meetings, MoMs and site visits from one place.': 'बैठकें, कार्यवृत्त और स्थल भ्रमण एक ही स्थान से प्रबंधित करें।',
  'Add New Meeting': 'नई बैठक जोड़ें',
  'Create a meeting with client and agenda details.': 'ग्राहक और कार्यसूची विवरण के साथ बैठक बनाएं।',
  'Scheduled Meeting': 'निर्धारित बैठक',
  'Review upcoming meetings and planned visits.': 'आगामी बैठकों और नियोजित भ्रमणों की समीक्षा करें।',
  "Create MoM's": 'बैठक कार्यवृत्त बनाएं',
  'Capture discussion notes and action points.': 'चर्चा टिप्पणियां और कार्य बिंदु दर्ज करें।',
  'Meeting History': 'बैठक इतिहास',
  'Select Meeting Type': 'बैठक का प्रकार चुनें',
  'Choose between a local meeting or an outstation meeting to proceed.': 'आगे बढ़ने के लिए स्थानीय बैठक या बाहरी स्थान बैठक चुनें।',
  'OR': 'या',
  'Local Meeting': 'स्थानीय बैठक',
  'Outstation Meeting': 'बाहरी स्थान बैठक',
  'NEW CLIENT': 'नया ग्राहक',
  'EXISTING CLIENT': 'मौजूदा ग्राहक',
  'Before going out for the Local meeting, please write full details of the questions below:': 'स्थानीय बैठक के लिए बाहर जाने से पहले नीचे दिए गए प्रश्नों का पूरा विवरण लिखें:',
  'Before going out for the Outstation meeting, please write full details of the questions below:': 'बाहरी स्थान बैठक के लिए बाहर जाने से पहले नीचे दिए गए प्रश्नों का पूरा विवरण लिखें:',
  'Add Client Details': 'ग्राहक विवरण जोड़ें',
  'Search Client': 'ग्राहक खोजें',
  'Search for an existing client...': 'मौजूदा ग्राहक खोजें...',
  'Add New Client': 'नया ग्राहक जोड़ें',
  'Client Name': 'ग्राहक का नाम',
  'Enter client name': 'ग्राहक का नाम दर्ज करें',
  'Contact Person': 'संपर्क व्यक्ति',
  'Contact Person Name': 'संपर्क व्यक्ति का नाम',
  'Enter contact person name': 'संपर्क व्यक्ति का नाम दर्ज करें',
  'Enter designation': 'पदनाम दर्ज करें',
  'Mobile No.': 'मोबाइल नंबर',
  'Enter mobile number': 'मोबाइल नंबर दर्ज करें',
  'Enter alternate number': 'वैकल्पिक नंबर दर्ज करें',
  'Client Address': 'ग्राहक का पता',
  'Enter client address': 'ग्राहक का पता दर्ज करें',
  'Select City': 'शहर चुनें',
  'Search for a city...': 'शहर खोजें...',
  'Select Location': 'स्थान चुनें',
  'Search for a location...': 'स्थान खोजें...',
  'Pin Code': 'पिन कोड',
  'City': 'शहर',
  'Location': 'स्थान',
  'Pin Code No.': 'पिन कोड नंबर',
  'Enter pin code': 'पिन कोड दर्ज करें',
  'Email ID': 'ईमेल आईडी',
  'Enter email': 'ईमेल दर्ज करें',
  'Add Meeting Details': 'बैठक विवरण जोड़ें',
  'Meeting Date': 'बैठक तारीख',
  'Meeting Time': 'बैठक समय',
  'Departure Date': 'प्रस्थान तारीख',
  'Return Date': 'वापसी तारीख',
  'Meeting Agenda': 'बैठक कार्यसूची',
  'Enter meeting agenda': 'बैठक कार्यसूची दर्ज करें',
  'SAVE': 'सहेजें',
  'RESET': 'रीसेट करें',
  'Saved': 'सहेजा गया',
  'Meeting saved successfully.': 'बैठक सफलतापूर्वक सहेजी गई।',
  'Outstation meeting saved successfully.': 'बाहरी स्थान बैठक सफलतापूर्वक सहेजी गई।',
  'Failed to save meeting': 'बैठक सहेजी नहीं जा सकी',
  'Connection failed. Please try again.': 'कनेक्शन विफल रहा। कृपया फिर प्रयास करें।',
  'Missing fields': 'आवश्यक जानकारी अधूरी है',
  'Please fill': 'कृपया भरें',
  'You can see the details of the meeting minutes (MOM) by clicking on the items below.': 'नीचे दिए गए आइटम पर क्लिक करके आप बैठक कार्यवृत्त का विवरण देख सकते हैं।',
  'Meeting History & MoM List': 'बैठक इतिहास और कार्यवृत्त सूची',
  'Status': 'स्थिति',
  'MoM Added': 'कार्यवृत्त जोड़ा गया',
  'No meeting history found.': 'बैठक इतिहास नहीं मिला।',
  'You can reset the meeting time and date details by clicking the edit icon': 'संपादन आइकन पर क्लिक करके आप बैठक का समय और तारीख बदल सकते हैं।',
  'Scheduled Meeting List': 'निर्धारित बैठक सूची',
  'Unnamed Client': 'नाम रहित ग्राहक',
  'Contact': 'संपर्क',
  'Tap to view details': 'विवरण देखने के लिए टैप करें',
  'No meetings scheduled for today.': 'आज के लिए कोई बैठक निर्धारित नहीं है।',
  'No upcoming meetings scheduled.': 'कोई आगामी बैठक निर्धारित नहीं है।',
  'Your schedule is clear right now.': 'अभी आपका कार्यक्रम खाली है।',
  'Meeting details not found.': 'बैठक विवरण नहीं मिला।',
  'Meeting updated successfully.': 'बैठक सफलतापूर्वक अपडेट हुई।',
  'Meeting deleted successfully.': 'बैठक सफलतापूर्वक हटाई गई।',
  'View previous meetings and MoM records.': 'पिछली बैठकों और कार्यवृत्त अभिलेखों को देखें।',
  'Add Site Visit': 'स्थल भ्रमण जोड़ें',
  'Log a site visit with location and purpose.': 'स्थान और उद्देश्य के साथ स्थल भ्रमण दर्ज करें।',
  'Office': 'कार्यालय',
  'Personal': 'व्यक्तिगत',
  'Account': 'खाता',
  'Score': 'अंक',
  'Full Name': 'पूरा नाम',
  'Unique ID': 'विशिष्ट पहचान संख्या',
  'Designation & Grade': 'पदनाम और ग्रेड',
  'Department': 'विभाग',
  'Office Cell No.': 'कार्यालय मोबाइल नंबर',
  'Official Email ID': 'आधिकारिक ईमेल आईडी',
  'Reporting Boss': 'रिपोर्टिंग अधिकारी',
  'Contact No.': 'संपर्क नंबर',
  'Job Reporting Address': 'कार्य रिपोर्टिंग पता',
  'Joining Date': 'ज्वाइनिंग तिथि',
  'Appraisal Month': 'मूल्यांकन माह',
  'Personal Cell No.': 'व्यक्तिगत मोबाइल नंबर',
  'Residence No.': 'निवास नंबर',
  'Residence Address': 'निवास पता',
  'Emergency Details': 'आपातकालीन विवरण',
  'Name': 'नाम',
  'Relation': 'संबंध',
  'Cell No.': 'मोबाइल नंबर',
  'Alternate No.': 'वैकल्पिक नंबर',
  'Email': 'ईमेल',
  'Contact Address': 'संपर्क पता',
  'Salary Bank Account No.': 'वेतन बैंक खाता संख्या',
  'IFSC Code': 'आईएफएससी कोड',
  'Personal Bank Account No.': 'व्यक्तिगत बैंक खाता संख्या',
  'Paytm No.': 'पेटीएम नंबर',
  'Health Insurance': 'स्वास्थ्य बीमा',
  'Aadhar Card No.': 'आधार कार्ड नंबर',
  'Passport No.': 'पासपोर्ट नंबर',
  'PAN Card No.': 'पैन कार्ड नंबर',
  'ESIC No.': 'ईएसआईसी नंबर',
  'EPF No.': 'ईपीएफ नंबर',
  'Score Parameters': 'अंक मानदंड',
  'Work Attendence': 'कार्य उपस्थिति',
  'Ambition / Initiative': 'महत्वाकांक्षा / पहल',
  'Productivity / Deadline': 'उत्पादकता / समयसीमा',
  'Quality of Work': 'कार्य की गुणवत्ता',
  'Focus Towards Task': 'कार्य पर ध्यान',
  'Stress Managmnt': 'तनाव प्रबंधन',
  'Reliability / Dependability': 'विश्वसनीयता / निर्भरता',
  'Achievments': 'उपलब्धियां',
  'Level Of Work Knowledge': 'कार्य ज्ञान का स्तर',
  'Company Oriented': 'कंपनी केंद्रित',
  'Attitude / Co-operations': 'व्यवहार / सहयोग',
  'Communication Skills': 'संचार कौशल',
  'Team Work / Piching - In': 'टीम कार्य / सहयोग',
  'Integrity / Dedication': 'ईमानदारी / समर्पण',
  'Activity Logs': 'गतिविधि अभिलेख',
  "Today's attendance, leave and task activity.": 'आज की उपस्थिति, अवकाश और कार्य गतिविधि।',
  'No Activity Logs': 'कोई गतिविधि अभिलेख नहीं',
  'Nothing to show yet.': 'अभी दिखाने के लिए कुछ नहीं है।',
  'Company Updates': 'कंपनी अपडेट',
  'Current month notifications and personal occasions.': 'वर्तमान माह की सूचनाएं और व्यक्तिगत अवसर।',
  'No Updates': 'कोई अपडेट नहीं',
  'There are no notifications for this month.': 'इस माह के लिए कोई सूचना नहीं है।',
  'Birthday': 'जन्मदिन',
  'Marriage Anniversary': 'विवाह वर्षगांठ',
  'Wish Received': 'शुभकामना प्राप्त हुई',
  'Wish Sent': 'शुभकामना भेजी गई',
  'Company Update': 'कंपनी अपडेट',
  'Birthday Celebration': 'जन्मदिन समारोह',
  'Anniversary Celebration': 'वर्षगांठ समारोह',
  'Happy Birthday': 'जन्मदिन की शुभकामनाएं',
  'Wished by': 'शुभकामना देने वाले',
  'By': 'द्वारा',
  'Noted': 'देख लिया',
  'Send Wish': 'शुभकामना भेजें',
  "Today's Notifications": 'आज की सूचनाएं',
  'Please check all notifications before continuing!': 'कृपया आगे बढ़ने से पहले सभी सूचनाओं की जांच करें!',
  'No updates available': 'कोई अपडेट नहीं है',
  'Open all updates': 'सभी अपडेट खोलें',
  'request by': 'अनुरोधकर्ता',
  'Someone': 'कोई व्यक्ति',
  'Regards': 'सादर',
  'Select Month': 'माह चुनें',
  'Attendance Score': 'उपस्थिति अंक',
  'Date': 'तारीख',
  'Intime': 'आगमन समय',
  'Outime': 'प्रस्थान समय',
  'User': 'उपयोगकर्ता',
  'To': 'को',
  'Leave': 'अवकाश',
  'No Data Available For This Month.': 'इस माह के लिए कोई डेटा उपलब्ध नहीं है।',
  'Attendance Name': 'उपस्थिति नाम',
  'Code': 'कोड',
  'Nos.': 'संख्या',
  'Rule': 'नियम',
  'Days': 'दिन',
  'Application crashed issue': 'ऐप बंद होने की समस्या',
  'Location not detected': 'स्थान पता नहीं चल रहा',
  'Attendance punch not working': 'उपस्थिति पंच काम नहीं कर रहा',
  'Attendance status not shown': 'उपस्थिति स्थिति नहीं दिख रही',
  'Attendance history issue': 'उपस्थिति इतिहास की समस्या',
  'Live location not working': 'सीधा स्थान काम नहीं कर रहा',
  'Request not going': 'अनुरोध नहीं जा रहा',
  'Approvals cannot be given': 'स्वीकृति नहीं दी जा रही',
  'Login issue': 'लॉगिन समस्या',
  'Password reset': 'पासवर्ड रीसेट',
  'Other': 'अन्य',
  'Pending': 'लंबित',
  'Completed': 'पूरा हुआ',
  'Overdue': 'देरी से',
  'In Progress': 'प्रगति में',
  'Resolved': 'समाधान हो गया',
  'Here Is Your Monthly Presence Details. If You Have Any Discrepancy Regarding Details, Please Contact The Hr Department For Amendment.': 'यह आपके मासिक उपस्थिति विवरण हैं। यदि विवरण में कोई अंतर हो, तो सुधार के लिए मानव संसाधन विभाग से संपर्क करें।',
  'Present Days': 'उपस्थित दिन',
  'Late Coming': 'देर से आगमन',
  'Week Off-Present': 'साप्ताहिक अवकाश पर उपस्थिति',
  'Week Off Days': 'साप्ताहिक अवकाश दिन',
  'Holiday Present': 'छुट्टी पर उपस्थिति',
  'Holiday Days': 'छुट्टी के दिन',
  'Absent Days': 'अनुपस्थित दिन',
  'Office Leave': 'कार्यालय अवकाश',
  'Paid Leave': 'वेतन सहित अवकाश',
  'Monthly Ctc': 'मासिक सीटीसी',
  'Earn Ctc': 'अर्जित सीटीसी',
  'Gross Salary': 'सकल वेतन',
  'Esi Contribution': 'ईएसआई योगदान',
  'Pf Contribution': 'पीएफ योगदान',
  'Ot Salary': 'अतिरिक्त समय वेतन',
  'Incentive Amt.': 'प्रोत्साहन राशि',
  'Earned Salary': 'अर्जित वेतन',
  'Tds Deduction': 'टीडीएस कटौती',
  'Loan Installment': 'ऋण किस्त',
  'Adv. For Expense': 'खर्च हेतु अग्रिम',
  'Expense Received': 'प्राप्त खर्च राशि',
  'Adv. Sal. Deduction': 'अग्रिम वेतन कटौती',
  'Penalty Deduction': 'जुर्माना कटौती',
  'Net Payable Salary': 'देय शुद्ध वेतन',
  'Loan Balance': 'ऋण शेष',
  'Check In': 'आगमन दर्ज',
  'Check Out': 'प्रस्थान दर्ज',
  'Office In': 'कार्यालय में प्रवेश',
  'Office Out': 'कार्यालय से बाहर',
  'Office Out Approved': 'कार्यालय से बाहर स्वीकृत',
  'Office Out Rejected': 'कार्यालय से बाहर अस्वीकृत',
  'Urgent Leave': 'आपात अवकाश',
  'Casual Leave': 'आकस्मिक अवकाश',
  'Outstation Leave': 'बाहरी स्थान अवकाश',
  'Please enter your leave reason': 'कृपया अवकाश का कारण दर्ज करें',
  'Invalid Date': 'अमान्य तारीख',
  'You cannot apply Paid Leave for today or a previous date. Please select tomorrow or a future date.': 'आज या पिछली तारीख के लिए वेतन सहित अवकाश नहीं लगाया जा सकता। कृपया कल या भविष्य की तारीख चुनें।',
  'You cannot apply leave for today or a previous date. Please select tomorrow or a future date.': 'आज या पिछली तारीख के लिए अवकाश नहीं लगाया जा सकता। कृपया कल या भविष्य की तारीख चुनें।',
  'User not authenticated': 'उपयोगकर्ता सत्यापित नहीं है',
  'Leave submitted successfully.': 'अवकाश सफलतापूर्वक जमा हो गया।',
  'Failed to submit leave': 'अवकाश जमा नहीं हो सका',
  'Failed to send leave request': 'अवकाश अनुरोध भेजने में समस्या आई',
  'Please write your reason below as to why you are requesting Paid Leave.': 'वेतन सहित अवकाश के लिए अपना कारण नीचे लिखें।',
  'PAID LEAVE REQUEST': 'वेतन सहित अवकाश अनुरोध',
  'Select Leave Date *': 'अवकाश तारीख चुनें *',
  'Please write your reason...': 'कृपया अपना कारण लिखें...',
  'Location permission denied': 'स्थान अनुमति अस्वीकृत',
  'Unable to fetch location': 'स्थान प्राप्त नहीं हो सका',
  'Please select leave type and enter reason.': 'कृपया अवकाश प्रकार चुनें और कारण दर्ज करें।',
  'Fetching location. Please wait...': 'स्थान प्राप्त हो रहा है। कृपया प्रतीक्षा करें...',
  'Please write your reason below as to why you are requesting Urgent Leave.': 'आपात अवकाश के लिए अपना कारण नीचे लिखें।',
  'Checking urgent leave options...': 'आपात अवकाश विकल्प जांचे जा रहे हैं...',
  'Urgent leave options are not available at this time.': 'इस समय आपात अवकाश विकल्प उपलब्ध नहीं हैं।',
  'URGENT LEAVE REQUEST': 'आपात अवकाश अनुरोध',
  'Coordinates': 'निर्देशांक',
  'Please select an employee.': 'कृपया कर्मचारी चुनें।',
  'Location not available yet. Please wait.': 'स्थान अभी उपलब्ध नहीं है। कृपया प्रतीक्षा करें।',
  'Token missing. Please login again.': 'टोकन उपलब्ध नहीं है। कृपया फिर लॉगिन करें।',
  'Invalid employee selection.': 'कर्मचारी चयन अमान्य है।',
  'Leave Request Sent!': 'अवकाश अनुरोध भेज दिया गया!',
  'Unknown error': 'अज्ञात त्रुटि',
  'Error sending leave request': 'अवकाश अनुरोध भेजने में त्रुटि',
  'Please write your reason below as to why you are requesting Casual Leave.': 'आकस्मिक अवकाश के लिए अपना कारण नीचे लिखें।',
  'CASUAL LEAVE REQUEST': 'आकस्मिक अवकाश अनुरोध',
  'Leave start date *': 'अवकाश शुरू होने की तारीख *',
  'Leave end date *': 'अवकाश समाप्ति तारीख *',
  'Please Provide a Reason For Your Casual Leave? *': 'कृपया आकस्मिक अवकाश का कारण बताएं *',
  'Enter your reason': 'अपना कारण दर्ज करें',
  'Who Has Taken Responsibility For Work During Your Leaves?': 'आपके अवकाश के दौरान काम की जिम्मेदारी किसने ली है?',
  'Who Has Taken Responsibility For Work During Your Leaves ?': 'आपके अवकाश के दौरान काम की जिम्मेदारी किसने ली है?',
  'Employee Name': 'कर्मचारी का नाम',
  'Designation': 'पदनाम',
  'Select Employee': 'कर्मचारी चुनें',
  'SENDING...': 'भेजा जा रहा है...',
  'SEND': 'भेजें',
  'Fetching current location...': 'वर्तमान स्थान प्राप्त हो रहा है...',
  'Current Location:': 'वर्तमान स्थान:',
  'Please fill all required (*) fields.': 'कृपया सभी आवश्यक (*) फ़ील्ड भरें।',
  'Outstation Leave request submitted successfully!': 'बाहरी स्थान अवकाश अनुरोध सफलतापूर्वक जमा हो गया!',
  'Failed to submit request.': 'अनुरोध जमा नहीं हो सका।',
  'An error occurred while submitting.': 'जमा करते समय त्रुटि हुई।',
  'Please write your reason below as to why you are requesting Outstation Leave.': 'बाहरी स्थान अवकाश के लिए अपना कारण नीचे लिखें।',
  'OUTSTATION LEAVE REQUEST': 'बाहरी स्थान अवकाश अनुरोध',
  'Please Provide a Reason For Your Outstation Leave *': 'कृपया बाहरी स्थान अवकाश का कारण बताएं *',
  'Enter reason': 'कारण दर्ज करें',
  'Your Address And Contact Details During Leaves ?*': 'अवकाश के दौरान आपका पता और संपर्क विवरण ?*',
  'Address during your leave *': 'अवकाश के दौरान पता *',
  'Enter address': 'पता दर्ज करें',
  'Country *': 'देश *',
  'State *': 'राज्य *',
  'Select State': 'राज्य चुनें',
  'City *': 'शहर *',
  'Pincode *': 'पिन कोड *',
  'Pincode': 'पिन कोड',
  'Contact No. *': 'संपर्क नंबर *',
  'Enter contact number': 'संपर्क नंबर दर्ज करें',
  'Relation with contact no. *': 'संपर्क नंबर से संबंध *',
  'Leave Approved': 'अवकाश स्वीकृत',
  'Leave Rejected': 'अवकाश अस्वीकृत',
  'Good Morning': 'सुप्रभात',
  'Good morning': 'सुप्रभात',
  'GoodMorning': 'सुप्रभात',
  'Good Afternoon': 'नमस्कार',
  'Good afternoon': 'नमस्कार',
  'GoodAfternoon': 'नमस्कार',
  'Good Evening': 'शुभ संध्या',
  'Good evening': 'शुभ संध्या',
  'GoodEvening': 'शुभ संध्या',
  'Hi': 'नमस्ते',
  'Username': 'उपयोगकर्ता नाम',
  'User Name': 'उपयोगकर्ता नाम',
  'Current Time': 'वर्तमान समय',
  'Current Location': 'वर्तमान स्थान',
  'Loading location...': 'स्थान लोड हो रहा है...',
  'Fetching location...': 'स्थान प्राप्त हो रहा है...',
  'Fetching address...': 'पता प्राप्त हो रहा है...',
  'Address not available': 'पता उपलब्ध नहीं है',
  'Address found but fields empty': 'पता मिला, लेकिन विवरण खाली हैं',
  'Company premises address not set': 'कंपनी परिसर का पता निर्धारित नहीं है',
  'Permission Denied': 'अनुमति अस्वीकृत',
  'Location permission is required.': 'स्थान अनुमति आवश्यक है।',
  'Location access is required to check in.': 'आगमन दर्ज करने के लिए स्थान की अनुमति आवश्यक है।',
  'Location access is required to check out.': 'प्रस्थान दर्ज करने के लिए स्थान की अनुमति आवश्यक है।',
  'Location access is required.': 'स्थान की अनुमति आवश्यक है।',
  'Missing token or location': 'लॉगिन जानकारी या स्थान उपलब्ध नहीं है',
  'Success': 'सफल',
  'Failed': 'असफल',
  'Check-In successful!': 'आगमन सफलतापूर्वक दर्ज हो गया!',
  'Check-In failed': 'आगमन दर्ज नहीं हो सका',
  'Network request failed. Please check your connection.': 'नेटवर्क अनुरोध असफल रहा। कृपया अपना कनेक्शन जांचें।',
  'Confirm your time and location': 'अपना समय और स्थान पुष्टि करें',
  'Check In Time': 'आगमन समय',
  'Check In Location': 'आगमन स्थान',
  'Not available': 'उपलब्ध नहीं',
  'Checkout Disabled': 'प्रस्थान बंद है',
  'Office Out is pending HOD approval.': 'कार्यालय से बाहर जाने का अनुरोध विभागाध्यक्ष की स्वीकृति हेतु लंबित है।',
  'You have checked out successfully!': 'आपका प्रस्थान सफलतापूर्वक दर्ज हो गया!',
  'Check-Out failed': 'प्रस्थान दर्ज नहीं हो सका',
  'Something went wrong while checking out.': 'प्रस्थान दर्ज करते समय समस्या आई।',
  'PROCESSING...': 'प्रक्रिया जारी है...',
  'CHECK IN': 'आगमन दर्ज करें',
  'CHECK OUT': 'प्रस्थान दर्ज करें',
  'Mark your check in': 'अपना आगमन दर्ज करें',
  'Mark your check out': 'अपना प्रस्थान दर्ज करें',
  'Office Out approval pending': 'कार्यालय से बाहर स्वीकृति लंबित है',
  'OFFICE OUT': 'कार्यालय से बाहर',
  'OFFICE IN': 'कार्यालय में वापसी',
  'Leaving from office': 'कार्यालय से बाहर जा रहे हैं',
  'Arrived at office': 'कार्यालय में लौट आए',
  'PAID LEAVE': 'वेतन सहित अवकाश',
  'Apply for paid leave': 'वेतन सहित अवकाश हेतु आवेदन करें',
  'URGENT LEAVE': 'आपात अवकाश',
  'Apply for urgent leave': 'आपात अवकाश हेतु आवेदन करें',
  "Today's Date": 'आज की तारीख',
  'Office Out Pending': 'कार्यालय से बाहर अनुरोध लंबित',
  'Office Out request is pending HOD approval.': 'कार्यालय से बाहर जाने का अनुरोध विभागाध्यक्ष की स्वीकृति हेतु लंबित है।',
  'Employee Attendance Status': 'कर्मचारी उपस्थिति स्थिति',
  'Employee Attendance': 'कर्मचारी उपस्थिति',
  'Employee History': 'कर्मचारी इतिहास',
  'All Employee Attendance List': 'सभी कर्मचारियों की उपस्थिति सूची',
  'Please select one option given below': 'कृपया नीचे दिया गया एक विकल्प चुनें',
  'Company holiday calendar and notes.': 'कंपनी छुट्टी कैलेंडर और नोट्स।',
  'No holidays found': 'कोई छुट्टी नहीं मिली',
  'Select Username': 'उपयोगकर्ता नाम चुनें',
  'Select User': 'उपयोगकर्ता चुनें',
  'Tracking details of all employees': 'सभी कर्मचारियों की ट्रैकिंग जानकारी',
  'Enter Employee Name': 'कर्मचारी का नाम दर्ज करें',
  'SEARCH': 'खोजें',
  'Check In session': 'आगमन सत्र',
  'Check Out session': 'प्रस्थान सत्र',
  'Session': 'सत्र',
  'Result': 'परिणाम',
  'Log Entry': 'लॉग प्रविष्टि',
  'Time': 'समय',
  'Final': 'अंतिम',
  'Note': 'टिप्पणी',
  'On Duty': 'ड्यूटी पर',
  'No record found for this date': 'इस तारीख के लिए कोई रिकॉर्ड नहीं मिला',
  'Please record your Office In status once you return to the premises.': 'परिसर में लौटने पर अपनी कार्यालय वापसी स्थिति दर्ज करें।',
  'OFFICE IN REQUEST': 'कार्यालय वापसी अनुरोध',
  'You are at': 'आप यहाँ हैं',
  'HOD Approval Required': 'विभागाध्यक्ष स्वीकृति आवश्यक',
  'Office In successfully recorded': 'कार्यालय वापसी सफलतापूर्वक दर्ज हो गई',
  'Failed to record Office In': 'कार्यालय वापसी दर्ज नहीं हो सकी',
  'Something went wrong': 'कुछ गलत हो गया',
  'Please write your reason below for going outside the office.': 'कार्यालय से बाहर जाने का कारण नीचे लिखें।',
  'Official': 'आधिकारिक',
  'OFFICE OUT REQUEST': 'कार्यालय से बाहर अनुरोध',
  'Please write your reason....': 'कृपया अपना कारण लिखें...',
  'Please enter your reason': 'कृपया अपना कारण दर्ज करें',
  'Location Required': 'स्थान आवश्यक है',
  'Please wait until current location is fetched.': 'कृपया वर्तमान स्थान प्राप्त होने तक प्रतीक्षा करें।',
  'Office Out request sent for HOD approval': 'कार्यालय से बाहर अनुरोध विभागाध्यक्ष स्वीकृति हेतु भेज दिया गया',
  'Failed to record Office Out': 'कार्यालय से बाहर अनुरोध दर्ज नहीं हो सका',
  'Choose the leave workflow you want to start.': 'जिस अवकाश प्रक्रिया को शुरू करना है, उसे चुनें।',
  'Submit a same-day emergency leave request.': 'उसी दिन का आपात अवकाश अनुरोध भेजें।',
  'Plan and track regular leave requests.': 'नियमित अवकाश अनुरोध बनाएं और स्थिति देखें।',
  'Request leave while travelling outstation.': 'बाहरी स्थान यात्रा के दौरान अवकाश अनुरोध करें।',
};

const titleCaseName = (name?: string | null, maxWords = 2) => {
  const cleanName = String(name || '').replace(/\s+/g, ' ').trim();
  if (!cleanName) return 'User';

  return cleanName
    .split(' ')
    .slice(0, maxWords)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const independentVowels: Record<string, string> = {
  aa: 'आ',
  ai: 'ऐ',
  au: 'औ',
  a: 'अ',
  ee: 'ई',
  ii: 'ई',
  oo: 'ऊ',
  uu: 'ऊ',
  e: 'ए',
  i: 'इ',
  o: 'ओ',
  u: 'उ',
};

const vowelMarks: Record<string, string> = {
  aa: 'ा',
  ai: 'ै',
  au: 'ौ',
  a: '',
  ee: 'ी',
  ii: 'ी',
  oo: 'ू',
  uu: 'ू',
  e: 'े',
  i: 'ि',
  o: 'ो',
  u: 'ु',
};

const consonants: Record<string, string> = {
  ksh: 'क्ष',
  chh: 'छ',
  kh: 'ख',
  gh: 'घ',
  ch: 'च',
  jh: 'झ',
  th: 'थ',
  dh: 'ध',
  ph: 'फ',
  bh: 'भ',
  sh: 'श',
  gn: 'ज्ञ',
  tr: 'त्र',
  k: 'क',
  g: 'ग',
  c: 'क',
  j: 'ज',
  t: 'त',
  d: 'द',
  n: 'न',
  p: 'प',
  b: 'ब',
  m: 'म',
  y: 'य',
  r: 'र',
  l: 'ल',
  v: 'व',
  w: 'व',
  s: 'स',
  h: 'ह',
  f: 'फ',
  z: 'ज',
};

const commonNameWords: Record<string, string> = {
  sadhana: 'साधना',
  aman: 'अमन',
  amit: 'अमित',
  ankit: 'अंकित',
  anita: 'अनीता',
  pooja: 'पूजा',
  puja: 'पूजा',
  rahul: 'राहुल',
  rohit: 'रोहित',
  rishi: 'ऋषि',
  ravi: 'रवि',
  raj: 'राज',
  raju: 'राजू',
  sanjay: 'संजय',
  deepak: 'दीपक',
  vikash: 'विकास',
  vikas: 'विकास',
  vishal: 'विशाल',
  sunil: 'सुनील',
  manoj: 'मनोज',
  neha: 'नेहा',
  pandey: 'पांडे',
  panday: 'पांडे',
  pandeya: 'पांडे',
  nisha: 'निशा',
  priya: 'प्रिया',
  priyanka: 'प्रियंका',
  shivam: 'शिवम',
  shubham: 'शुभम',
  saurabh: 'सौरभ',
  sandeep: 'संदीप',
  pankaj: 'पंकज',
  mohit: 'मोहित',
  sumit: 'सुमित',
};

const matchByLength = (source: string, index: number, map: Record<string, string>) => {
  for (const length of [3, 2, 1]) {
    const key = source.slice(index, index + length);
    if (map[key]) {
      return key;
    }
  }
  return '';
};

const transliterateWord = (word: string) => {
  if (!word || /[\u0900-\u097F]/.test(word) || /\d/.test(word)) return word;
  const lowerWord = word.toLowerCase();
  if (commonNameWords[lowerWord]) return commonNameWords[lowerWord];

  let output = '';
  let index = 0;

  while (index < lowerWord.length) {
    const char = lowerWord[index];
    if (!/[a-z]/.test(char)) {
      output += word[index] || char;
      index += 1;
      continue;
    }

    const vowel = matchByLength(lowerWord, index, independentVowels);
    if (vowel) {
      output += independentVowels[vowel];
      index += vowel.length;
      continue;
    }

    const consonant = matchByLength(lowerWord, index, consonants);
    if (!consonant) {
      output += word[index] || char;
      index += 1;
      continue;
    }

    output += consonants[consonant];
    index += consonant.length;

    const nextVowel = matchByLength(lowerWord, index, vowelMarks);
    if (nextVowel) {
      output += vowelMarks[nextVowel];
      index += nextVowel.length;
    }
  }

  return output || word;
};

const transliterateName = (name?: string | null, maxWords = 2) => {
  const cleanName = String(name || '').replace(/\s+/g, ' ').trim();
  if (!cleanName) return 'उपयोगकर्ता';

  return cleanName
    .split(' ')
    .slice(0, maxWords)
    .map(transliterateWord)
    .join(' ');
};

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  countryCode: 'IN',
  setLanguage: async () => {},
  setCountryCode: async () => {},
  t: text => text,
  formatName: name => titleCaseName(name),
});

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<AppLanguage>('en');
  const [countryCode, setCountryCodeState] = useState('IN');

  useEffect(() => {
    const loadPreferences = async () => {
      const storedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      const storedCountry = await AsyncStorage.getItem(COUNTRY_STORAGE_KEY);

      if (storedLanguage === 'hi' || storedLanguage === 'en') {
        setLanguageState(storedLanguage);
      }
      if (storedCountry) {
        setCountryCodeState(storedCountry);
      }
    };

    loadPreferences();
  }, []);

  useEffect(() => {
    (globalThis as { __crewcamLanguage?: AppLanguage }).__crewcamLanguage = language;
  }, [language]);

  const value = useMemo<LanguageContextType>(() => ({
    language,
    countryCode,
    setLanguage: async nextLanguage => {
      (globalThis as { __crewcamLanguage?: AppLanguage }).__crewcamLanguage = nextLanguage;
      setLanguageState(nextLanguage);
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
    },
    setCountryCode: async nextCountryCode => {
      setCountryCodeState(nextCountryCode);
      await AsyncStorage.setItem(COUNTRY_STORAGE_KEY, nextCountryCode);
    },
    t: englishText => {
      if (language !== 'hi') {
        return englishText;
      }

      const trimmedText = String(englishText || '').trim();
      const legacyKnownText = translations[trimmedText];
      if (legacyKnownText) {
        return toReadableHindi(trimmedText);
      }
      return toReadableHindi(trimmedText || englishText);
    },
    formatName: (name, maxWords = 2) => {
      return language === 'hi' ? transliterateName(name, maxWords) : titleCaseName(name, maxWords);
    },
  }), [countryCode, language]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
