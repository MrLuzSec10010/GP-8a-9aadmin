# Digital Gram Property & Tax Management System - Maharashtra

## Project Overview
Government-grade ERP system for Gram Panchayat to manage property records, tax calculation, billing, and government registers.

## Original Problem Statement
Build a complete web-based software for Gram Panchayat to manage:
- Property Survey (Laser Measurement Based)
- Ferfarni (Mutation)
- House Tax, Water Tax, Light Tax, Cleaning Tax
- Billing, Collection, Arrears
- All Government Registers (Namuna 1 to Namuna 33)
- Namuna 8 (Demand Register)
- Namuna 9 (Property Register)

## User Personas
1. **Super Admin** - District level, full access
2. **Talathi** - Property records management
3. **Gramsevak** - Village level administration
4. **Data Entry Operator** - Data entry tasks
5. **Auditor** - Audit trail access, read-only
6. **Citizen** - Read-only view access

## Core Requirements
- OTP-based authentication (Demo mode: 123456)
- Bilingual interface (Marathi/English toggle)
- Role-based access control
- Government blue & white theme with Ashoka emblem
- Audit trail for all changes
- MongoDB with ACID transactions
- Government format PDF generation (planned)

## Phase-1 Implementation (Completed - January 27, 2025)

### Backend APIs (`/app/backend/server.py`)
- `POST /api/auth/send-otp` - Send OTP to phone
- `POST /api/auth/verify-otp` - Verify OTP and login
- `GET /api/auth/me` - Get current user
- `GET/POST /api/properties` - CRUD for Namuna 9
- `GET/POST /api/demands` - CRUD for Namuna 8
- `POST /api/demands/{id}/payment` - Record payment
- `GET/POST /api/tax-rates` - Tax rate configuration
- `GET /api/audit-logs` - Audit trail
- `GET /api/dashboard/stats` - Dashboard statistics
- `POST /api/seed-data` - Create sample data

### Frontend Pages
- **Login** - OTP-based with government theme
- **Dashboard** - Summary cards, ward-wise chart
- **Namuna 9** - Property register table, add/edit/view
- **Namuna 8** - Demand register, payment recording
- **Tax Engine** - Rate configuration
- **Users** - User management (admin only)
- **Audit Logs** - System changes log

### Features Implemented
- ✅ OTP Login (Demo mode with 123456)
- ✅ Bilingual UI (English/Marathi toggle)
- ✅ Dashboard with statistics
- ✅ Property Register (Namuna 9)
- ✅ Demand Register (Namuna 8)
- ✅ Tax Engine with rate configuration
- ✅ Role-based access control
- ✅ Audit trail logging
- ✅ User management
- ✅ Government blue theme

## Prioritized Backlog

### P0 - Critical (Next Phase)
- [ ] PDF generation for Namuna 8 & 9 in government format
- [ ] Twilio SMS integration for production OTP
- [ ] Super Admin user creation flow

### P1 - Important
- [ ] Ferfarni (Mutation) workflow
- [ ] Bill generation with QR code
- [ ] Receipt generation
- [ ] Additional Namuna registers (1-7, 10-33)

### P2 - Enhancement
- [ ] Daily collection register
- [ ] Ward-wise defaulter list
- [ ] Year closing abstract report
- [ ] Offline sync capability
- [ ] Digital signature integration

## Tech Stack
- **Frontend**: React 19, TailwindCSS, Shadcn/UI, Recharts
- **Backend**: FastAPI, Motor (MongoDB async)
- **Database**: MongoDB with transactions
- **Auth**: JWT + OTP (Demo mode)
- **Languages**: Bilingual (English + Marathi)

## API Configuration
- Backend: `http://localhost:8001` (internal)
- Frontend: `http://localhost:3000`
- Production URL: `https://maharashtragp.preview.emergentagent.com`

## Next Tasks
1. Implement PDF generation with government templates
2. Add Twilio SMS for production OTP
3. Create super admin initialization flow
4. Build Ferfarni (mutation) module
5. Add bill and receipt generation
