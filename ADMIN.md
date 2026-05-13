# BWD Online Water Application System - Admin Manual

This section is for BWD administrative personnel managing the application queue.

---

## 🛡️ Administrative Workflow

### 1. The Admin Dashboard (Workflow Control)
The dashboard organizes applications into strict stages based on system logic:
- **For In-house Plumbing**: Waiting for the applicant to finish their plumbing.
- **For Inspection**: Plumbing marked done; waiting for an inspector assignment.
- **Under Review**: Inspection done; awaiting final admin/supervisor approval.
- **For Documents**: Inspection approved; waiting for applicant uploads or verification.
- **For Payment**: Documents verified; ready for the admin to set a payment date.
- **For Conversion**: Payment confirmed; ready for final water meter installation.

### 2. Processing Applications
1. **Review Documents**: Review the applicant's submitted documents (IDs, Clearances) in the "View Requirements" tab.
2. **Set Payment Dates**: Once documents are verified, you can set the official office payment date.
3. **Print Reports**: The **Print WACO** and **Print Inspection** buttons are automatically disabled until the system confirms the applicant has settled their payment.

### 3. Safeguards & Security
- **Document Purging**: This is restricted to specific super-admins and requires a successful **Export Docs (ZIP)** as a prerequisite to prevent data loss.
- **Live Search**: Use the search bar to find applicants instantly. The system is optimized to handle thousands of records using a dedicated database view.

---

## 🛠️ System Management

### 1. Managing Plumbers
- Admins can add, edit, or deactivate plumbers in the directory.
- Changes are instantly reflected in the applicant portal.

### 2. Managing Seminars
- Upload and manage video content for the Online Seminar.
- Use the shortcode `{{PLUMBERS_LIST}}` in descriptions to display the official plumbers list.

### 3. Push Notifications
- The system automatically notifies applicants whenever you update their application status.
