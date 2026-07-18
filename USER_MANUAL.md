# PM Tool - User Manual

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [User Roles & Permissions](#2-user-roles--permissions)
3. [Dashboard](#3-dashboard)
4. [Projects](#4-projects)
5. [Tasks](#5-tasks)
6. [Time Tracking](#6-time-tracking)
7. [Timesheets](#7-timesheets)
8. [Invoices](#8-invoices)
9. [Financials](#9-financials)
10. [Reports](#10-reports)
11. [Admin Panel](#11-admin-panel)
12. [Profile](#12-profile)
13. [Language Support](#13-language-support)

---

## 1. Getting Started

### Logging In

Navigate to the application URL and sign in using one of two methods:

- **Email & Password** - Enter your email and password, then click **Login**.
- **Google OAuth** - Click **Sign in with Google** to authenticate with your Google account.

If your account has no role assigned, you will see a warning banner on the dashboard:
> "Your account does not have a role assigned yet. Please contact your administrator to get access."

### Navigation

The sidebar on the left provides access to all features. The items visible depend on your role:

| Section | Menu Items | Visible To |
|---|---|---|
| -- | Dashboard | Everyone |
| Manage | Projects | Everyone |
| Manage | Tasks | Internal + Vendor |
| Time & Billing | Time Tracking | Internal + Vendor |
| Time & Billing | Timesheets | Internal + Vendor |
| Time & Billing | Invoices | Everyone |
| Time & Billing | Financials | Admin, Super Admin, AM, PM |
| Time & Billing | Reports | Admin, Super Admin, AM, PM |
| Admin | Admin | Admin, Super Admin |

Your user profile is displayed at the bottom of the sidebar, showing your name, job title, email, and user type (Internal, Vendor, or Client). Click **Edit profile** to go to your profile page.

---

## 2. User Roles & Permissions

PM Tool has three user types and eight roles:

### Internal Users
| Role | Description |
|---|---|
| **Super Admin** | Full system access including admin panel and all management features |
| **Admin** | Full system access including admin panel and all management features |
| **Account Manager (AM)** | Manages client relationships, projects, invoices, financials, and reports |
| **Project Manager (PM)** | Manages projects, tasks, timesheets, invoices, financials, and reports |
| **Team Member** | Works on assigned tasks, logs time, submits timesheets |

### Vendor Users
| Role | Description |
|---|---|
| **Contractor** | Logs time, submits timesheets, views assigned projects |
| **Vendor Contact** | Manages vendor relationship, submits project requests and vendor invoices |

### Client Users
| Role | Description |
|---|---|
| **Client** | Views own projects, reviews and approves/declines project proposals, reviews and approves invoices |

### Permission Summary

| Action | Super Admin | Admin | AM | PM | Team Member | Contractor | Vendor Contact | Client |
|---|---|---|---|---|---|---|---|---|
| Create/Edit/Delete Projects | Yes | Yes | Yes | Yes | -- | -- | Request only | -- |
| Create/Edit/Delete Milestones | Yes | Yes | Yes | Yes | -- | -- | -- | -- |
| Create/Edit/Delete Tasks | Yes (any project) | Yes (any project) | Yes (any project) | Yes (any project) | Assigned projects only | Assigned projects only | Assigned projects only | -- |
| Log Time | Yes | Yes | Yes | Yes | Yes | Yes | Yes | -- |
| Submit Timesheets | Yes | Yes | Yes | Yes | Yes | Yes | Yes | -- |
| Approve/Reject Timesheets | Yes | Yes | Yes | Yes | -- | -- | -- | -- |
| Create Client Invoices | Yes | Yes | Yes | Yes | -- | -- | -- | -- |
| Create Vendor Invoices | -- | -- | -- | -- | -- | -- | Yes | -- |
| Approve Invoices | Yes | Yes | Yes | -- | -- | -- | -- | Yes |
| Send / Revise Project Proposals | Yes | Yes | Yes | Yes | -- | -- | -- | -- |
| Approve/Decline/Request Revision on Proposals | Yes | Yes | Yes | Yes | -- | -- | -- | Yes (own projects only) |
| Raise Change Requests | Yes | Yes | Yes | Yes | -- | -- | -- | -- |
| Approve/Decline/Request Revision on Change Requests | Yes | Yes | Yes | Yes | -- | -- | -- | Yes (own projects only) |
| View Financials | Yes | Yes | Yes | Yes | -- | -- | -- | -- |
| View Reports | Yes | Yes | Yes | Yes | -- | -- | -- | -- |
| Admin Panel | Yes | Yes | -- | -- | -- | -- | -- | -- |

---

## 3. Dashboard

Each role sees a customized dashboard after login.

### Account Manager / Admin / Super Admin Dashboard

- **Stat Cards**: Total Projects, Active Projects, Total Clients, Total Contract Value
- **Revenue Pipeline**: Total Billed, Collected, Outstanding amounts with badges for pending quotes and approvals
- **Portfolio by Client**: Table showing each client's project count, active projects, and contract value
- **Invoices Requiring Action**: List of invoices that need review with status badges
- **Pending Vendor Quotes**: Quotes awaiting approval with Approve/Reject actions
- **Projects by Status**: Breakdown of projects by their current status

### Project Manager Dashboard

- **Stat Cards**: My Projects, Active, Tasks Due This Week, Pending Timesheets
- **Pending Vendor Project Requests**: Vendor-submitted project requests with Approve/Reject buttons
- **My Projects**: List of assigned projects with health indicators (On Track, At Risk, Delayed)
- **Task Distribution**: Breakdown of tasks by status (To Do, In Progress, Review, Done)
- **Pending Quotes**: Vendor quotes awaiting review

### Vendor Dashboard

- **Vendor Info Card**: Vendor name, contact details, project count
- **Metric Cards**: Total Contract Value, Invoiced, Paid, Outstanding
- **Active Projects**: List of current projects with status and health indicators
- **Quotes**: Manage vendor quotes (create, submit, delete) with status tracking (Pending, Submitted, Approved, Rejected)
- **Recent Invoices**: Latest vendor invoices with status

### Client Dashboard

- **Billing Summary**: Contracted, Invoiced, Paid, Outstanding amounts
- **My Projects**: Grid of project cards showing status, proposal status (DRAFT/SENT/APPROVED/DECLINED/REVISION REQUESTED), task progress bar, PM/AM assignments, and due dates
- **Recent Invoices**: Table of latest invoices with status badges
- **Project Timeline**: Overview of active project milestones

A project only appears here — and in the client's Projects list — once its proposal has actually been sent (see Client Proposal Workflow below). A project still being drafted internally is never visible to the client.

### Team Member / Generic Dashboard

- **Stat Cards**: Active Projects, Open Tasks, Pending Timesheets, Hours This Week, Outstanding Invoices
- **Recent Projects**: Quick links to projects with task counts
- **Recent Invoices**: Table of recent invoices with status

---

## 4. Projects

Access via **Projects** in the sidebar.

### Tabs (vary by role)

**Internal users** see four tabs:
1. **My Projects** - Projects you are assigned to (as PM, AM, or team member)
2. **All Projects** - All projects in the system with filters for PM, AM, Client, and Vendor
3. **Vendor Requests** - Project requests submitted by vendors awaiting approval
4. **Archived Projects** - Projects with ARCHIVED status

**Vendor users** see three tabs:
1. **Current Projects** - Active projects assigned to your vendor
2. **My Requests** - Project requests you have submitted with approval status
3. **Archived Projects** - Archived vendor projects

**Client users** see one tab:
1. **My Projects** - Projects associated with your organization whose proposal has been sent at least once. A project still being drafted internally (proposal never sent) will not appear here.

### Creating a Project

Click **+ Create** (top right). Fill in the project form:

| Field | Required | Description |
|---|---|---|
| Name | Yes | Project name |
| Category | No | Project category |
| Description | No | Project details |
| Status | No | DRAFT, ACTIVE, ON_HOLD, COMPLETED, CANCELLED, ARCHIVED |
| Project Type | No | INTERNAL or other types |
| Priority | No | LOW, MEDIUM, HIGH, URGENT |
| Billing Method | No | Time & Materials, Fixed, Milestone, Mixed |
| Risk Level | No | Project risk assessment |
| Client | No | Assign a client organization |
| Vendor | No | Assign a vendor organization |
| Project Manager | No | Assign a PM |
| Account Manager | No | Assign an AM |
| Team Members | No | Multi-select team members |
| Start Date | No | Project start date |
| End Date | No | Project end date |
| Proposed Cost | No | Estimated project cost |
| Estimated Hours | No | Estimated total hours |
| Proposed Workers | No | Number of workers needed |
| Required Skill Set | No | Skills required |

Use **Save as Draft** to save without making it active, or **Save** to create the project.

Milestones are **not** part of this form. If you pick Milestone or Mixed billing, a note appears reminding you that milestones are added afterward on the project's own page (Work tab) — see Client Proposal Workflow below.

### Vendor Project Requests

Vendors can submit project requests by clicking **+ New Request**. The request form includes: Name, Category, Description, Start/End Date, Proposed Workers, Required Skill Set, Billing Method, Estimated Cost, and Estimated Hours.

Requests can be saved as draft or submitted. Once submitted, PM/AM/Admin users can **Approve** or **Reject** the request from the Vendor Requests tab or their dashboard.

### Client Proposal Workflow

For any project with a client assigned, scope and billing terms must be proposed to and approved by the client before the project becomes active. This is separate from Vendor Project Requests above — it governs client sign-off on cost, not a vendor's request to work on a project.

1. **Build the proposal** (PM, AM, Admin, Super Admin) - set the project's Billing Method, Estimated Cost, Estimated Hours, and, for Time & Materials or Mixed billing, an **Hourly Rate**. Add milestones on the project detail page's Work tab, each with a **Contracted Amount** for Milestone or Mixed billing.
   - The Proposal panel (and the rest of this workflow) only appears on the project detail page once a **Client** has been assigned to the project. If you don't see it, edit the project and set its Client.
2. **Send Proposal** - from the project detail page, click **Send Proposal**. The client receives an email notification. Sending is blocked with an error if an hourly rate is required but not set. Before this point, the client cannot see the project at all — it will not appear on their Dashboard or Projects list.
3. **Client reviews** - the client opens the project and sees the Proposed Cost, Estimated Hours, Hourly Rate, and each milestone's Contracted Amount directly on the page, plus a Proposal panel where they can **Approve**, **Decline** (with a required reason), or **Request Revision** (with notes).
4. **On approval** - the project automatically moves to ACTIVE status, and the Billing Method, Estimated Cost, Estimated Hours, Hourly Rate, and each milestone's Contracted Amount, Name, and Due Date all become locked — they cannot be edited further.
5. **Starting a new revision** - PM/AM/Admin can click **Start New Revision** to unlock these fields again and bump the proposal version, then edit and resend for approval.

**Proposal statuses:** DRAFT -> SENT -> APPROVED / DECLINED / REVISION_REQUESTED. From any of the latter three, starting a new revision returns the proposal to DRAFT with the version number incremented.

A client can only view and act on proposals for projects belonging to their own organization.

**Proposal History:** Every time a proposal is sent, a permanent snapshot of the terms and milestones at that moment is recorded, along with the client's response and any comment. Click **View History** next to the version badge to open a timeline of every past version — what was sent, who sent it, how the client responded, and any decline reason or revision note. Nothing is ever removed or overwritten by a later revision; even after a proposal is approved and later revised again, all earlier versions remain visible. Both internal staff and the client can view the full history.

### Change Requests

Once a project's proposal is **APPROVED**, the client may ask for additional work beyond the original scope (for example, an extra feature or deliverable). Rather than reopening and re-locking the entire proposal, this is handled with a separate **Change Request**:

1. **Raise a change request** (PM, AM, Admin, Super Admin) - from the project detail page, click **+ New Change Request** and fill in a Title, optional Description, the **Additional Cost**, and optionally one or more new milestones (Name, Due Date, Amount).
2. **Client reviews** - the client sees the change request alongside any others on the project and can **Approve**, **Decline** (with a required reason), or **Request Revision** (with notes) — the same as the proposal workflow.
3. **On approval** - any milestones listed on the change request are created on the project automatically, and the project's Estimated Cost increases by the Additional Cost. The original approved proposal and its history are not affected.
4. **On decline or revision request** - the change request stays visible permanently with the client's response and note. To address the feedback, raise a new change request; the original is never edited or removed.

A project can have any number of change requests over its lifetime, and each one's full history — including declined or superseded attempts — remains visible.

### Project Detail Page

Click any project name to open the detail page, which has four tabs:

1. **Work** - Manage milestones and tasks
   - Create, edit, and delete milestones (Super Admin, Admin, AM, PM only)
   - Each milestone can carry a **Contracted Amount**, shown next to its due date in the list and used to bill the client when marked complete (see Client Proposal Workflow above). The milestone's Name, Due Date, and Contracted Amount are all locked once the project's proposal is approved.
   - Create, edit, and delete tasks under milestones (managers on any project; Team Members, Contractors, and Vendor Contacts only on projects they're assigned to)
   - Quick-cycle task status by clicking the status badge (TODO -> IN_PROGRESS -> REVIEW -> DONE) — same access rule as editing tasks
   - View team members panel

2. **Quotes** - Vendor quotes for the project
   - View, create, and manage vendor quotes
   - Quote statuses: PENDING, SUBMITTED, APPROVED, REJECTED

3. **Budget** - Budget tracking for the project
   - Create and manage budget line items

4. **Documents** - File management
   - Upload and manage project documents

---

## 5. Tasks

Access via **Tasks** in the sidebar (Internal + Vendor users only).

### Viewing Tasks

Tasks are displayed in a table with status filter tabs:
- **All** - All tasks
- **To Do** - Tasks not yet started
- **In Progress** - Tasks being worked on
- **Review** - Tasks in review
- **Done** - Completed tasks

Use the **Project** dropdown to filter tasks by project. This view shows tasks across all projects regardless of assignment, so you can browse work outside your own projects — but you can only edit/delete/create on your own (see below).

### Creating a Task

Click **+ Create** and fill in:

| Field | Required | Description |
|---|---|---|
| Name | Yes | Task name |
| Description | No | Task details |
| Status | No | TODO, IN_PROGRESS, REVIEW, DONE |
| Priority | No | LOW, MEDIUM, HIGH, URGENT |
| Project | Yes | Which project this task belongs to |
| Milestone | No | Associate with a project milestone |
| Assignee | No | User assigned to the task |
| Due Date | No | Task deadline |
| Estimated Hours | No | Time estimate |
| Is Billable | No | Toggle whether the task is billable |

**Project and Assignee options are scoped to what you have access to:**
- Super Admin / Admin / AM / PM see every project, and can assign to anyone connected to the selected project (members, assigned PM/AM, or the assigned vendor's users).
- Team Member, Contractor, and Vendor Contact only see projects they are assigned to in the Project dropdown, and can only assign to people connected to that same project — not arbitrary org-wide users.

Editing, deleting, and reassigning an existing task follow the same project-assignment rule. Tasks outside your assigned projects show as view-only (no Edit/Delete, and drag-and-drop is disabled on the Board view).

### Quick Status Change

Click the status badge on any task to cycle through: **TODO -> IN_PROGRESS -> REVIEW -> DONE**. Only available if you can manage that task (see above).

### Board View

The Tasks page offers a **Board** view (Kanban-style columns: To Do, In Progress, Review, Done) alongside the **Table** view. Drag a card between columns to change its status, or click a card to open the edit modal. Both respect the same per-task permission rule as the table.

---

## 6. Time Tracking

Access via **Time Tracking** in the sidebar (Internal + Vendor users only).

### Logging Time

The Time Log shows all your time entries. Click **+ New Entry** to create one:

| Field | Required | Description |
|---|---|---|
| Date | Yes | Date of work |
| Project | Yes | Project worked on |
| Task | No | Specific task |
| Description | No | What you worked on |
| Start Time | Yes | When you started |
| End Time | Yes | When you stopped |
| Duration | Auto | Calculated from start/end times |
| Billable | No | Whether this time is billable |

### Live Timer

Use the **Start Timer** button to track time in real-time. Click **Stop** when done, and the start/end times will auto-populate the entry form.

### Filters

Filter your time entries by:
- **Project** - Select a specific project
- **Date range** - Set start and end dates

### Locked Entries

Time entries that are part of a submitted timesheet are locked and cannot be edited or deleted. They display a lock icon.

---

## 7. Timesheets

Access via **Timesheets** in the sidebar (Internal + Vendor users only).

### My Timesheets

Create timesheets to bundle and submit your time entries for approval.

1. Click **+ New Timesheet**
2. Select the **period start** and **period end** dates
3. The system will automatically include matching time entries
4. **Submit** the timesheet for approval, or save as draft

**Timesheet statuses:**
- **DRAFT** - Not yet submitted; can be edited or deleted
- **SUBMITTED** - Awaiting review; entries are locked
- **APPROVED** - Approved by a reviewer
- **REJECTED** - Rejected with a reason; review the feedback and resubmit

Click any timesheet to expand and see all linked time entries with hours.

### Reviewing Timesheets (PM, AM, Admin, Super Admin)

The **Pending Review** section shows all submitted timesheets from team members:

1. Click a timesheet to expand and review the time entries
2. Click **Approve** to approve the timesheet
3. Click **Reject** and provide a reason to send it back

The **Approved Timesheets** section shows previously approved timesheets with total hours, billable hours, and who approved them.

---

## 8. Invoices

Access via **Invoices** in the sidebar (Everyone).

### Tabs

- **Client Invoices** - Invoices sent to clients (visible to Internal users and Clients)
- **Vendor Invoices** - Invoices from vendors (visible to Internal users and Vendors)

Use the **Status** filter to filter invoices by their current status.

### Client Invoices

**Creating a Client Invoice** (PM, AM, Admin):

1. Click **+ New Client Invoice**
2. Select the **Project** and **Client**
3. Add line items with Description, Quantity, Unit Price
4. Set tax rate and currency (auto-populated from client settings)
5. Save as Draft

**Generating from Milestones** (PM, AM, Admin): For projects billed on a Milestone or Mixed basis, click **⚡ Generate from Milestones**, select the project, and a draft invoice is created automatically with one line item per completed milestone, using each milestone's Contracted Amount. Milestones already billed to the client on a submitted, approved, or paid invoice are excluded from the count.

**Invoice Lifecycle:**

```
DRAFT -> SENT -> APPROVED -> PAID
                          \-> OVERDUE (if past due date)
```

- **DRAFT** - Can be edited and deleted
- **SENT** - Sent to the client for review
- **APPROVED** - Client or AM has approved the invoice
- **PAID** - Payment has been received
- **OVERDUE** - Past the due date without payment

### Vendor Invoices

**Creating a Vendor Invoice** (Vendor Contact):

1. Click **+ Create Invoice**
2. Select from approved quotes (auto-populates details)
3. Add line items
4. Save as Draft or Submit

**Vendor Invoice Lifecycle:**

```
DRAFT -> SUBMITTED -> APPROVED -> PAID
                   \-> REJECTED
                   \-> REVISION_REQUESTED -> (new version created)
```

- **SUBMITTED** - Awaiting review by PM/AM
- **APPROVED** - PM/AM approved the invoice
- **REJECTED** - AM rejected the invoice (with notes)
- **REVISION_REQUESTED** - PM/AM requested changes; a new version is created for the vendor to edit and resubmit

A **review-queue banner** alerts PM/AM users when there are pending vendor invoices with count and total amount.

### Invoice Detail Page

Click any invoice to view its full details:
- Invoice header with status, dates, and amounts
- Line items table
- Payment history
- Action buttons (Submit, Approve, Reject, Request Revision) based on your role and the invoice status

### Recording Payments

For approved invoices, authorized users can record payments:
1. Open the invoice detail page
2. Click **Record Payment**
3. Enter the payment amount and date
4. The invoice status updates to PAID when fully paid

---

## 9. Financials

Access via **Financials** in the sidebar (Admin, Super Admin, AM, PM only).

### Summary Cards

Six cards provide a financial overview:
- **Draft** - Total value of draft invoices (pipeline)
- **Total Invoiced** - All invoices sent
- **Pending Review** - Invoices awaiting approval
- **Approved** - Approved invoice total
- **Paid** - Total payments received
- **Outstanding** - Unpaid balance

### Project Breakdown Table

A detailed table shows financial data per project:
- Project name and billing method
- Currency
- Invoice count
- Draft, Invoiced, Pending, Approved, Paid, and Outstanding amounts
- Paid progress bar (visual indicator)
- Totals footer row

### Filters

- **Vendor** - Filter by vendor organization
- **Client** - Filter by client organization

---

## 10. Reports

Access via **Reports** in the sidebar (Admin, Super Admin, AM, PM only).

### Time Report Tab

- **Summary Cards**: Total Hours, Project Count, Entry Count
- **By-Project Breakdown**: Hours per project with percentage share bars
- **Entry Log Table**: Detailed time entries (up to 50 rows)
- **Filters**: Project dropdown, Date range (start/end)

### Invoice Report Tab

- **Summary Cards**: Total Billed, Collected, Outstanding
- **By-Status Breakdown**: Invoice amounts grouped by status (Draft, Sent, Paid, Overdue)
- **Invoice Table**: Full list with collected and balance columns
- **Filters**: Client dropdown, Date range (start/end)

---

## 11. Admin Panel

Access via **Admin** in the sidebar (Admin, Super Admin only).

The Admin panel has three tabs:

### Users Tab

Manage all user accounts in the system.

**Creating a User:**
1. Click **+ Create User**
2. Fill in: Name (required), Email (required), Password (required), Job Title
3. Select User Type: Internal, Vendor, or Client
4. If Vendor/Client: select the organization
5. Toggle role assignments (multiple roles can be assigned)
6. Set Active/Inactive status

**Available Roles:** Super Admin, Admin, Account Manager, Project Manager, Team Member, Contractor, Vendor Contact, Client

**User Table** displays: Name & Title, Email, Company badge (Internal/Vendor/Client), Role pills, Active status.

### Clients Tab

Manage client organizations.

**Client Fields:**
- Name (required)
- Contact Email
- Contact Phone
- Address
- Payment Terms (default: "Net 30")
- Currency (dropdown)
- Active/Inactive status

### Vendors Tab

Manage vendor organizations.

**Vendor Fields:**
- Name (required)
- Contact Email
- Phone
- Address
- Default Hourly Rate (displayed as "$X/hr")
- Currency
- Active/Inactive status

---

## 12. Profile

Click **Edit profile** in the sidebar footer, or navigate to **Profile**.

### Editable Fields
- **Name** - Your display name
- **Email** - Your email address (disabled for Google OAuth users)
- **Job Title** - Your job title

### Read-Only Information
- **User Type** badge (Internal, Vendor, or Client)
- **Company Name** (for Vendor/Client users)
- **Auth Provider** badge (Local or Google)
- **Roles** - Your assigned role badges

### Changing Password (Local accounts only)

1. Enter your **Current Password**
2. Enter your **New Password** (minimum 8 characters)
3. **Confirm** the new password
4. Click **Update Password**

Google OAuth users cannot change their password and do not see this section.

---

## 13. Language Support

PM Tool supports three languages:

- **EN** - English
- **简** - Simplified Chinese (zh-CN)
- **繁** - Traditional Chinese (zh-TW)

Switch languages using the buttons in the top-right corner of the header. Your selection is applied immediately across the entire application.
