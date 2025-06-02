# Step 6: Production Deployment and Testing - Manual Testing Checklist

## ✅ Automated Testing Status
- **Deployment Tests**: All 7 tests passing
- **Environment Variables**: Properly loaded
- **Database Connectivity**: Verified
- **Edge Functions**: Accessible
- **Monitoring Integration**: Configured
- **Error Tracking**: Functional

## ✅ Infrastructure Status
- **Local Development Server**: Running at http://localhost:3000
- **RLS Policies**: ✅ RESOLVED - Group creation working with secure policies
- **Authentication**: Working (user successfully logged in and created groups)
- **Sentry Integration**: Active (visible in page metadata)

## 🔄 Manual End-to-End Testing Required

### FR1: User Account Management
**Status**: Ready for testing

**Test Cases**:
- [ ] **New User Signup**: Test signup with a new email and password
- [ ] **User Profile Creation**: Verify profile created with Name and Email
- [ ] **User Login**: Test login with newly created account
- [ ] **User Logout**: Test logout functionality
- [ ] **Existing User Login**: Test login with existing account
- [ ] **Profile Management**: View/update profile information

**URL**: `http://localhost:3000/signup` and `http://localhost:3000/login`

### FR2: Group Management  
**Status**: ✅ RLS Issue Resolved - Should work normally

**Test Cases**:
- [x] **Group Creation**: Create new group (VERIFIED - working with groups 10, 11, 12)
- [ ] **Add Members**: Add members by name (test placeholder member creation)
- [ ] **Email Association**: Associate email with placeholder member
- [ ] **View Groups List**: Verify new groups appear in list
- [ ] **View Group Members**: View members of created groups

**URL**: `http://localhost:3000/groups/create` and `http://localhost:3000/groups`

### FR3 & FR4: LLM Expense Logging & Confirmation
**Status**: Ready for comprehensive testing

**Test Cases**:
- [ ] **Basic NLL Case**: "Yesterday, I paid $120 for dinner for myself, Alice, and Bob. Charlie wasn't there."
  - Verify LLM identifies: payer (self), amount ($120), participants (self, Alice, Bob)
  - Verify assumptions displayed and expense saved with 'confirmed' status
- [ ] **Placeholder Creation**: "Lunch $30, paid by me for me and Chris" (Chris not yet member)
  - Verify Chris created as placeholder member
- [ ] **Multiple Payers**: "Sarah paid $50 and I paid $30 for the $80 concert tickets for both of us and Tom"
  - Verify both payers and amounts identified correctly
- [ ] **Itemized Expenses**: "Groceries $100 paid by me. Apples $10 for me and Eve. Milk $5 for Adam. Rest split evenly among me, Eve, Adam."
  - Verify itemized breakdown and individual splits
- [ ] **LLM Clarification**: Test ambiguous input like "Snacks for some of us $20 paid by me"
- [ ] **Edit Before Confirmation**: Modify description, amount, payer, participants, split method
- [ ] **Discard Expense**: Test discarding expense before confirmation

**URL**: Navigate to a group and use NLL input

### FR5: Manual Expense Management
**Status**: Ready for testing

**Test Cases**:
- [ ] **Manual Expense Creation**: Use form to specify description, amount, date, multiple payers, uneven splits
- [ ] **View Expenses List**: Verify all expenses appear in group
- [ ] **Edit Existing Expense**: Modify confirmed expense (amount, participants)
- [ ] **Delete Expense**: Remove expense and verify removal

### FR6: Expense Ledger and Settlement
**Status**: Ready for testing

**Test Cases**:
- [ ] **View Aggregated Ledger**: Check ledger with multiple expenses and members
- [ ] **Net Amounts Display**: Verify net amounts owed between members
- [ ] **Settlement Calculations**: Verify simplified transaction list for settlement
- [ ] **Settlement State**: Test "Settle Up" functionality and clear offline settlement state

### FR7: Currency Support
**Status**: Ready for testing

**Test Cases**:
- [ ] **USD Default**: Verify all expenses default to USD
- [ ] **Currency Symbol Display**: Check correct currency symbol display

## 🌐 Cross-Device & Cross-Browser Testing

**Test Subset**: Login, NLL expense entry, view settlement

**Browsers to Test**:
- [ ] **Desktop Chrome**: Full workflow testing
- [ ] **Desktop Firefox**: Key functionality verification
- [ ] **Desktop Safari**: Key functionality verification (if available)
- [ ] **Mobile Chrome**: Responsive design and functionality
- [ ] **Mobile Safari**: Responsive design and functionality (or responsive mode)

## ⚡ Performance Validation

**Targets**:
- Page load times: < 2 seconds
- API responses: < 500ms (< 10s for LLM operations)

**Pages to Measure**:
- [ ] **Dashboard Load Time**: `http://localhost:3000/`
- [ ] **Group Detail Page**: Navigate to specific group
- [ ] **Expense Forms**: Group expense creation pages
- [ ] **LLM Response Time**: Parse-expense Edge Function
- [ ] **Settlement Calculation**: Calculate-settlement Edge Function
- [ ] **Core Web Vitals**: LCP, FID, CLS for key pages

**Tools**: Browser Developer Tools (Network and Performance tabs)

## 📊 Monitoring & Analytics Verification

### Sentry Error Reporting
- [ ] **Trigger Frontend Error**: Test error capture (browser console if possible)
- [ ] **Edge Function Error**: Test controlled error in Edge Functions
- [ ] **Verify Sentry Dashboard**: Confirm errors appear in Sentry

### Performance Monitoring  
- [ ] **Sentry Metrics**: Check performance data in Sentry dashboard
- [ ] **Vercel Analytics**: Verify Core Web Vitals and page load data
- [ ] **Custom Analytics**: Verify events tracked for key actions (signup, login, group creation, expense logging, settlement viewed)

### Database Monitoring
- [ ] **Supabase Dashboard**: Check for unusual load, slow queries, or errors

## 🔒 Security Review

### RLS Policy Verification
- [x] **Group Creation RLS**: ✅ RESOLVED - Working correctly
- [ ] **Cross-User Access**: Attempt to access/modify data belonging to another user
- [ ] **Cross-Group Access**: Test accessing groups not part of

### Data Security
- [ ] **Local Storage Check**: Verify no sensitive data inadvertently stored
- [ ] **Network Request Review**: Ensure API keys/secrets not exposed to client
- [ ] **Security Headers**: Check for CSP, X-Frame-Options, HSTS
- [ ] **CORS Configuration**: Verify correct CORS policies for production domain

## 📝 Documentation Updates Required

After successful testing:
- [ ] **README.md**: Add final deployment URL and usage instructions
- [ ] **Performance Results**: Document actual performance metrics achieved
- [ ] **Known Issues**: Document any issues found during testing
- [ ] **User Guides**: Create guides for accessing and using the production application

## 🎯 Success Criteria

- [ ] All FR1-FR7 user workflows functioning correctly
- [ ] Application usable across tested devices and browsers  
- [ ] Performance targets met or exceeded
- [ ] Monitoring and analytics systems functional
- [ ] Security review passed with RLS issue resolved
- [ ] Documentation updated and complete

---

**Current Status**: Ready to begin systematic manual testing. RLS issues have been resolved and automated tests are passing. Application is running and accessible at http://localhost:3000.

**Next Steps**: 
1. Begin with FR1 (User Account Management) testing
2. Progress through each feature systematically  
3. Document any issues found
4. Update progress in this checklist as testing proceeds 