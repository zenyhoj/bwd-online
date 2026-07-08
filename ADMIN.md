# BWD Online Water Application System - Admin Manual

This section is for BWD administrative personnel managing the application queue.

---

## Administrative Workflow

### 1. The Admin Dashboard
The dashboard organizes applications into workflow stages. The summary cards, sidebar dashboard badge, workflow filter, and applicant table stage labels should follow the same stage rules.

- **For In-house Plumbing**: Waiting for the applicant to finish and mark in-house plumbing complete.
- **For Inspection**: Plumbing is complete; waiting for BWD to schedule inspection.
- **Under Review**: Inspection is scheduled or submitted, but not yet approved.
- **For Documents**: Inspection is approved; waiting for applicant uploads, office-submission verification, or document review.
- **For Payment**: Documents are verified; ready for admin to set or monitor the office payment date.
- **For Water Meter Scheduling**: Payment is confirmed; ready to schedule water meter installation.
- **For Water Meter Completion**: Water meter installation is scheduled; waiting for completion.
- **For Conversion**: Required workflow steps are done; ready for final account conversion if needed.
- **Completed**: The application is converted and water meter installation is marked complete.

### 2. Processing Applications
1. **Multiple Applications per Applicant**: A single applicant profile can have multiple water connection applications simultaneously. When processing, ensure you check the specific application details (like service classification and number of users) as these are now tied to the application rather than the applicant.
2. **Use the Stage column**: In the application queue, check the **Stage** column to see why an applicant is counted in a dashboard card.
2. **Schedule inspection**: After in-house plumbing is complete, assign an inspector and schedule the site inspection. This automatically emails the applicant.
3. **Review inspection findings**: Inspection status and plumbing result should stay aligned. If the inspection status is not approved, the plumbing result should not be approved. Approving the inspection automatically emails the applicant.
4. **Review documents**: Review uploaded requirements in the document verification panel. You will receive automated emails whenever an applicant uploads a new document. If the applicant chose office submission, verify the requirements when they bring them to BWD.
5. **Set payment dates**: Once documents are verified, schedule the official office payment date. This sends an automated payment schedule email to the applicant.
6. **Confirm payment**: Mark payment complete only after the applicant settles fees at the office.
7. **Schedule and complete water meter installation**: After payment is confirmed, schedule the water meter installation. Mark installation complete only after the work is finished; this finalizes conversion.
8. **Print reports**: **Print WACO** and **Print Inspection** are disabled until the system confirms the needed workflow milestones.

### 3. Safeguards and Security
- **Document purging**: Restricted to authorized super-admins and should be done only after a successful **Export Docs (ZIP)**.
- **Search and filters**: Use the search bar and workflow filter to find applicants. If a summary card count looks unexpected, filter by that workflow stage and check the table's **Stage** column.
- **Scheduling rules**: Admin scheduling follows the configured business window: Monday to Thursday, 7:00 AM to 6:00 PM.

### 4. Managing Water Bills
- **Uploading bills**: Admins can bulk-upload water bills through the **Water Bills** dashboard using an Excel file (`.xlsx` or `.xls`).
- **Required format**: The spreadsheet must contain `account_number`, `account_name`, `amount`, `due_date`, and optionally `amount_after_duedate`.
- **Mapping**: The system links uploaded bills to concessionaire records by account number.
- **Concessionaire view**: Once uploaded, bills become visible to the matching end users in their applicant portal.

---

## System Management

### 1. Managing Plumbers
- Admins can add, edit, or deactivate accredited plumbers.
- Changes are reflected in the applicant portal.

### 2. Managing Seminars
- Upload and manage Online Seminar content.
- Use the shortcode `{{PLUMBERS_LIST}}` in descriptions to display the official plumbers list.

### 3. Push Notifications
- The system notifies applicants when important workflow statuses change.
