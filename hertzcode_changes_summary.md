# Hertzcode 0.2 - Project Implementation & Changes Summary

This file lists all the security updates, role-based controls, database isolation, and layout improvements we made to the **Hertzcode 0.2** project.

---

## 🆕 New Files Created

### 💻 Frontend
1. **[projectStorage.js](file:///c:/Users/Faizan/Desktop/hertzcode0.2/frontend/app/utils/projectStorage.js)**
   - **Purpose:** Segregates local browser `localStorage` entries for CRUD projects by username (e.g. `crudProjects_{username}`). 
   - **How it works:** When a normal user logs in, they only see and edit their own CRUD projects. When the admin logs in, the utility scans all prefixes in `localStorage` and merges them so the admin has global visibility over everyone's projects.
2. **[admin/page.js](file:///c:/Users/Faizan/Desktop/hertzcode0.2/frontend/app/dashboard/admin/page.js)**
   - **Purpose:** Renders the new **Admin Panel** dashboard page.
   - **Features:** Contains a user registration form to create new accounts with customized roles (`admin` or `user`), and an active user table showing all credentials registered in the database.

### ⚙️ Backend
3. **[dbAccess.js](file:///c:/Users/Faizan/Desktop/hertzcode0.2/backend/middleware/dbAccess.js)**
   - **Purpose:** A security middleware that validates database ownership on the server side.
   - **How it works:** Checks if the database (`dbName`) requested by any table list, data view, seed mock, or query run belongs to the logged-in user. If the user doesn't own the database and is not an admin, it blocks the request with a `403 Forbidden` response.

---

## 🛠️ Existing Files Modified

### ⚙️ Backend (Server Logic & APIs)

1. **[authController.js](file:///c:/Users/Faizan/Desktop/hertzcode0.2/backend/controllers/authController.js)**
   - Added the `role` column (`VARCHAR(50) DEFAULT 'user'`) to the user registry table `user_cred`.
   - Setup automatic superuser initialization for default credentials (`admin` / `admin123`) on startup.
   - Disabled automatic registration for unknown usernames on sign-in (returns `401 Unauthorized` instead).
   - Added user listing (`listUsers`) and registration (`createUser`) controllers.
   
2. **[authRoutes.js](file:///c:/Users/Faizan/Desktop/hertzcode0.2/backend/routes/authRoutes.js)**
   - Registered paths `/users` (GET) and `/users` (POST) to enable user management.

3. **[recycleBinController.js](file:///c:/Users/Faizan/Desktop/hertzcode0.2/backend/controllers/recycleBinController.js)**
   - Hardened all recycle bin actions (listing, restoring, deleting) so only users with the `admin` role are allowed to access them.

4. **[databaseController.js](file:///c:/Users/Faizan/Desktop/hertzcode0.2/backend/controllers/databaseController.js)**
   - Updated database listing: returns all users' databases with owner details for `admin` role, and only owned databases for standard user role.
   - Created an automatic clean-up routine (`removeStaleDatabase`) to remove deleted database entries from all user profiles.

5. **[databaseRoutes.js](file:///c:/Users/Faizan/Desktop/hertzcode0.2/backend/routes/databaseRoutes.js)**
   - Integrated the `checkDatabaseAccess` middleware to safeguard all query, table, and schema endpoints.

---

### 💻 Frontend (User Interface & Pages)

6. **[layout.js](file:///c:/Users/Faizan/Desktop/hertzcode0.2/frontend/app/dashboard/layout.js)**
   - Injected a global fetch interceptor that automatically attaches the logged-in username in the `x-user-username` request header.
   - Restrained sidebar links for **Recycle Bin** and **Admin Panel** to the `admin` role.
   - Integrated client-side page guards to redirect standard users attempting to access admin or recycle bin URLs directly.
   - Updated the sign-out handler to completely clear session keys and remember-me credentials.

7. **[page.js (Login Page)](file:///c:/Users/Faizan/Desktop/hertzcode0.2/frontend/app/page.js)**
   - Stores user's role in local storage (`currentUserRole`) on login.
   - Disabled browser input autocompletes by setting `autoComplete="off"` and `autoComplete="new-password"`.

8. **[page.js (Database List Page)](file:///c:/Users/Faizan/Desktop/hertzcode0.2/frontend/app/dashboard/page.js)**
   - Preserves and renders the owner's username for each database in the SQL databases list table.
   - Escaped unescaped double quotes.

9. **[page.js (Tables List Page)](file:///c:/Users/Faizan/Desktop/hertzcode0.2/frontend/app/dashboard/db/[dbName]/page.js)**
   - Captures and stores the logged-in user session in `currentUser` state.
   - Handles database errors or unauthorized queries by triggering error toasts and redirecting back to `/dashboard`.
   - Fixed `react-hooks` warnings.

10. **[page.js (Table Details Page)](file:///c:/Users/Faizan/Desktop/hertzcode0.2/frontend/app/dashboard/db/[dbName]/[tableName]/page.js)**
    - Performs safety checks and redirect guards if a user tries to access a table layout belonging to someone else.
    - Fixed JSX syntax warnings and escaped raw double/single quotes.
