import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

const translations = {
  en: {
    // App Title
    appTitle: "Digital Gram Property & Tax Management System",
    appSubtitle: "Maharashtra Government",
    
    // Navigation
    dashboard: "Dashboard",
    properties: "Properties",
    namuna9: "Namuna 9 - Property Register",
    namuna8: "Namuna 8 - Demand Register",
    taxEngine: "Tax Engine",
    users: "User Management",
    auditLogs: "Audit Logs",
    settings: "Settings",
    logout: "Logout",
    
    // Login
    login: "Login",
    phoneNumber: "Phone Number",
    enterPhone: "Enter your phone number",
    sendOtp: "Send OTP",
    enterOtp: "Enter OTP",
    verifyOtp: "Verify OTP",
    demoHint: "Demo Mode: Use OTP 123456",
    
    // Dashboard
    totalProperties: "Total Properties",
    measuredProperties: "Measured Properties",
    pendingMeasurement: "Pending Measurement",
    totalDemand: "Total Demand",
    totalCollection: "Total Collection",
    totalArrears: "Total Arrears",
    financialYear: "Financial Year",
    wardWiseSummary: "Ward-wise Summary",
    
    // Property (Namuna 9)
    propertyRegister: "Property Register (नमुना ९)",
    addProperty: "Add Property",
    editProperty: "Edit Property",
    ownerName: "Owner Name",
    houseNo: "House No.",
    wardNo: "Ward No.",
    surveyNo: "Survey No.",
    plotArea: "Plot Area (sq.m)",
    builtUpArea: "Built-up Area (sq.m)",
    usageType: "Usage Type",
    floorCount: "Floor Count",
    constructionType: "Construction Type",
    waterConnection: "Water Connection",
    electricityConnection: "Electricity Connection",
    village: "Village",
    taluka: "Taluka",
    district: "District",
    address: "Address",
    residential: "Residential",
    commercial: "Commercial",
    mixed: "Mixed",
    pucca: "Pucca",
    semiPucca: "Semi-Pucca",
    kaccha: "Kaccha",
    yes: "Yes",
    no: "No",
    search: "Search",
    actions: "Actions",
    view: "View",
    edit: "Edit",
    delete: "Delete",
    save: "Save",
    cancel: "Cancel",
    updateReason: "Update Reason",
    
    // Demand (Namuna 8)
    demandRegister: "Demand Register (नमुना ८)",
    generateDemand: "Generate Demand",
    houseTax: "House Tax",
    waterTax: "Water Tax",
    lightTax: "Light Tax",
    cleaningTax: "Cleaning Tax",
    totalTax: "Total Tax",
    arrears: "Arrears",
    rebate: "Rebate",
    penalty: "Penalty",
    netDemand: "Net Demand",
    amountPaid: "Amount Paid",
    balance: "Balance",
    status: "Status",
    paid: "Paid",
    pending: "Pending",
    partial: "Partial",
    recordPayment: "Record Payment",
    paymentAmount: "Payment Amount",
    paymentMode: "Payment Mode",
    cash: "Cash",
    bank: "Bank",
    online: "Online",
    
    // Tax Engine
    taxRates: "Tax Rates",
    addTaxRate: "Add Tax Rate",
    ratePerSqm: "Rate per sq.m",
    floorFactor: "Floor Factor",
    constructionFactor: "Construction Factor",
    rebatePercent: "Rebate %",
    penaltyPercent: "Penalty %",
    lockYear: "Lock Financial Year",
    locked: "Locked",
    
    // Audit
    auditTrail: "Audit Trail",
    entityType: "Entity Type",
    action: "Action",
    oldValue: "Old Value",
    newValue: "New Value",
    reason: "Reason",
    user: "User",
    timestamp: "Timestamp",
    
    // Common
    loading: "Loading...",
    error: "Error",
    success: "Success",
    confirm: "Confirm",
    close: "Close",
    noData: "No data available",
    selectYear: "Select Year",
    downloadPdf: "Download PDF",
    print: "Print",
    
    // Roles
    superAdmin: "Super Admin",
    talathi: "Talathi",
    gramsevak: "Gramsevak",
    dataEntry: "Data Entry Operator",
    auditor: "Auditor",
    citizen: "Citizen",
    
    // Messages
    otpSent: "OTP sent successfully",
    loginSuccess: "Login successful",
    propertyCreated: "Property created successfully",
    propertyUpdated: "Property updated successfully",
    demandGenerated: "Demand generated successfully",
    paymentRecorded: "Payment recorded successfully",
    seedSuccess: "Sample data created successfully"
  },
  mr: {
    // App Title
    appTitle: "डिजिटल ग्राम मालमत्ता व कर व्यवस्थापन प्रणाली",
    appSubtitle: "महाराष्ट्र शासन",
    
    // Navigation
    dashboard: "नियंत्रण कक्ष",
    properties: "मालमत्ता",
    namuna9: "नमुना ९ - मालमत्ता नोंदणी",
    namuna8: "नमुना ८ - मागणी नोंदवही",
    taxEngine: "कर इंजिन",
    users: "वापरकर्ता व्यवस्थापन",
    auditLogs: "लेखापरीक्षा नोंदी",
    settings: "सेटिंग्ज",
    logout: "बाहेर पडा",
    
    // Login
    login: "लॉगिन",
    phoneNumber: "मोबाईल क्रमांक",
    enterPhone: "आपला मोबाईल क्रमांक टाका",
    sendOtp: "OTP पाठवा",
    enterOtp: "OTP टाका",
    verifyOtp: "OTP पडताळणी करा",
    demoHint: "डेमो मोड: OTP 123456 वापरा",
    
    // Dashboard
    totalProperties: "एकूण मालमत्ता",
    measuredProperties: "मोजमाप पूर्ण",
    pendingMeasurement: "मोजमाप बाकी",
    totalDemand: "एकूण मागणी",
    totalCollection: "एकूण वसुली",
    totalArrears: "एकूण थकबाकी",
    financialYear: "आर्थिक वर्ष",
    wardWiseSummary: "वॉर्डनिहाय सारांश",
    
    // Property (Namuna 9)
    propertyRegister: "मालमत्ता नोंदणी (नमुना ९)",
    addProperty: "मालमत्ता जोडा",
    editProperty: "मालमत्ता संपादन",
    ownerName: "मालकाचे नाव",
    houseNo: "घर क्र.",
    wardNo: "वॉर्ड क्र.",
    surveyNo: "सर्वे क्र.",
    plotArea: "प्लॉट क्षेत्र (चौ.मी.)",
    builtUpArea: "बांधकाम क्षेत्र (चौ.मी.)",
    usageType: "वापर प्रकार",
    floorCount: "मजले",
    constructionType: "बांधकाम प्रकार",
    waterConnection: "पाणी जोडणी",
    electricityConnection: "वीज जोडणी",
    village: "गाव",
    taluka: "तालुका",
    district: "जिल्हा",
    address: "पत्ता",
    residential: "निवासी",
    commercial: "व्यापारी",
    mixed: "मिश्र",
    pucca: "पक्का",
    semiPucca: "अर्ध-पक्का",
    kaccha: "कच्चा",
    yes: "होय",
    no: "नाही",
    search: "शोधा",
    actions: "कृती",
    view: "पहा",
    edit: "संपादन",
    delete: "हटवा",
    save: "जतन करा",
    cancel: "रद्द करा",
    updateReason: "बदलाचे कारण",
    
    // Demand (Namuna 8)
    demandRegister: "मागणी नोंदवही (नमुना ८)",
    generateDemand: "मागणी तयार करा",
    houseTax: "घरपट्टी",
    waterTax: "पाणीपट्टी",
    lightTax: "दिवाबत्ती कर",
    cleaningTax: "स्वच्छता कर",
    totalTax: "एकूण कर",
    arrears: "थकबाकी",
    rebate: "सवलत",
    penalty: "दंड",
    netDemand: "निव्वळ मागणी",
    amountPaid: "भरलेली रक्कम",
    balance: "शिल्लक",
    status: "स्थिती",
    paid: "भरले",
    pending: "प्रलंबित",
    partial: "अंशत:",
    recordPayment: "भरणा नोंदवा",
    paymentAmount: "भरणा रक्कम",
    paymentMode: "भरणा पद्धत",
    cash: "रोख",
    bank: "बँक",
    online: "ऑनलाइन",
    
    // Tax Engine
    taxRates: "कर दर",
    addTaxRate: "कर दर जोडा",
    ratePerSqm: "दर प्रति चौ.मी.",
    floorFactor: "मजला गुणक",
    constructionFactor: "बांधकाम गुणक",
    rebatePercent: "सवलत %",
    penaltyPercent: "दंड %",
    lockYear: "आर्थिक वर्ष लॉक करा",
    locked: "लॉक केले",
    
    // Audit
    auditTrail: "लेखापरीक्षा मार्ग",
    entityType: "संस्था प्रकार",
    action: "कृती",
    oldValue: "जुने मूल्य",
    newValue: "नवीन मूल्य",
    reason: "कारण",
    user: "वापरकर्ता",
    timestamp: "वेळ",
    
    // Common
    loading: "लोड होत आहे...",
    error: "त्रुटी",
    success: "यशस्वी",
    confirm: "पुष्टी करा",
    close: "बंद करा",
    noData: "डेटा उपलब्ध नाही",
    selectYear: "वर्ष निवडा",
    downloadPdf: "PDF डाउनलोड",
    print: "प्रिंट",
    
    // Roles
    superAdmin: "सुपर अॅडमिन",
    talathi: "तलाठी",
    gramsevak: "ग्रामसेवक",
    dataEntry: "डेटा एंट्री ऑपरेटर",
    auditor: "लेखापरीक्षक",
    citizen: "नागरिक",
    
    // Messages
    otpSent: "OTP यशस्वीरित्या पाठवला",
    loginSuccess: "लॉगिन यशस्वी",
    propertyCreated: "मालमत्ता यशस्वीरित्या तयार केली",
    propertyUpdated: "मालमत्ता यशस्वीरित्या अपडेट केली",
    demandGenerated: "मागणी यशस्वीरित्या तयार केली",
    paymentRecorded: "भरणा यशस्वीरित्या नोंदवला",
    seedSuccess: "नमुना डेटा यशस्वीरित्या तयार केला"
  }
};

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('gram-lang') || 'en';
  });

  useEffect(() => {
    localStorage.setItem('gram-lang', language);
    document.documentElement.lang = language;
  }, [language]);

  const t = (key) => {
    return translations[language][key] || key;
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'mr' : 'en');
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
