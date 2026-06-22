# Hertzcode Node.js + Express Backend Development Guide

This guide describes how to build and structure the Node.js + Express backend for **Hertzcode**, based on the analysis of the previous Next.js API backend code (`C:\Users\Faizan\Desktop\api`).

---

## 1. Directory Structure (MVC)
We recommend organizing the backend using the Model-View-Controller (MVC) pattern to separate routes, controller logic, and database connections.

```text
backend/
├── config/
│   └── db.js                 # Global connections/helpers for MySQL & MongoDB
├── controllers/
│   ├── authController.js     # User login & forgot password logic
│   ├── databaseController.js # Dynamic DB creation, deletion & list
│   ├── tableController.js    # Table/Collection create, delete & list
│   ├── queryController.js    # Run raw SQL queries & MongoDB shell queries
│   ├── aiController.js       # AI generation with Gemini Integration
│   └── crudController.js     # Dynamic CRUD files code generator
├── routes/
│   ├── authRoutes.js         # /api/auth/*
│   ├── databaseRoutes.js     # /api/database/*
│   ├── aiRoutes.js           # /api/ai
│   └── crudRoutes.js         # /api/crud/*
├── .env                      # App Configuration
├── BACKEND_GUIDE.md          # This Guide
├── server.js                 # Express Application Entry
└── package.json              # Backend Dependencies
```

---

## 2. Environment Configuration
The backend requires a `.env` file at the root containing the following variables:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/hertzcoder_metadata
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=admin
GEMINI_API_KEY=your_gemini_api_key_here
```

* `DB_NAME` defaults to `admin` and serves as the metadata repository where the list of user credentials and registered databases is stored in MySQL.

---

## 3. Required NPM Dependencies
To support all features, install these packages in the `backend` folder:

```json
{
  "dependencies": {
    "express": "^4.19.2",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "mysql2": "^3.11.0",
    "mongodb": "^6.8.0",
    "@google/generative-ai": "^0.1.1",
    "@faker-js/faker": "^8.4.1"
  },
  "devDependencies": {
    "nodemon": "^3.1.4"
  }
}
```

---

## 4. Metadata DB Schema (MySQL)
The authentication and project configurations are stored in the MySQL metadata database (`DB_NAME`).

### Table: `user_cred`
This table keeps track of login details and the user's custom databases:
```sql
CREATE TABLE IF NOT EXISTS `user_cred` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(100) NOT NULL UNIQUE,
  `pass_hash` VARCHAR(255) NOT NULL,
  `name` VARCHAR(100) DEFAULT '',
  `created_databases` TEXT,
  `modified_on` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

---

## 5. Routes and Logic Specifications

### A. Authentication Module (`/api/auth`)

#### 1. Login (`POST /api/auth/login`)
* **Logic**:
  1. Open a connection to MySQL host using `DB_HOST`, `DB_USER`, `DB_PASSWORD` (without specifying database first to avoid crashing if target DB does not exist).
  2. Run `CREATE DATABASE IF NOT EXISTS \`admin\`` and switch into it.
  3. Run `CREATE TABLE IF NOT EXISTS \`user_cred\`` to ensure it is initialized.
  4. If table is empty, auto-insert a default user: username `'admin'`, password `'admin123'`, name `'Administrator'`.
  5. Check if the login username matches. If not exists and is not 'admin', auto-register it (fallback insert of the new user) to allow easy access.
  6. Compare `pass_hash` in plain text.
  7. Return `{ success: true, username, name }`.

#### 2. Forgot Password (`POST /api/auth/forgot-password`)
* **Payload**: `{ email, newPassword }`
* **Logic**:
  1. Connect to MySQL `admin` database.
  2. Verify that `email` exists in the `user_cred` table.
  3. Execute `UPDATE user_cred SET pass_hash = ?, modified_on = NOW() WHERE username = ?`.

---

### B. Database Operations (`/api/database`)

#### 1. List Databases (`GET /api/database/list?username=...`)
* **Logic**:
  1. Read the comma-separated `created_databases` column from `user_cred` for the specified `username`.
  2. For each database name:
     - **If prefixed with `mongodb:`** (e.g. `mongodb:test_db`):
       * Connect to MongoDB Server via `MONGO_URI`.
       * List database names. If it doesn't exist, remove it from the user's metadata tracking.
       * Retrieve collections list to populate the `tablesCount`.
     - **If SQL**:
       * Run `SHOW TABLES FROM \`dbName\``. If database doesn't exist on MySQL server, catch the error (e.g. `ER_BAD_DB_ERROR`), clean it up from `created_databases` in `user_cred`, and omit it.
  3. Return merged array of database objects:
     ```json
     { "id": "sql_shop", "name": "shop", "displayName": "shop", "type": "sql", "tablesCount": 3 }
     ```

#### 2. Create Database (`POST /api/database/create`)
* **Payload**: `{ dbName, tables, username, dbType }`
* **Logic**:
  * Sanitize name format (lowercase letters, numbers, and underscores only).
  * **If MongoDB**: Connect, retrieve the db, and initialize selected collections by inserting a mock placeholder document (e.g. `{ initialized: true }`).
  * **If SQL**: Connect, execute `CREATE DATABASE \`trimmedName\``, switch to it, and execute selected table templates defined in the `TABLE_SCHEMAS` pool (e.g., `admin`, `blog`, `cart`, `users`, `products`).
  * **Ownership Tracking**: Append `dbName` (prefixed with `mongodb:` if Mongo) to the user's `created_databases` list inside `user_cred`.

#### 3. Delete Database (`DELETE /api/database/delete`)
* **Payload**: `{ dbName, username }`
* **Logic**:
  * If MongoDB, call `db.dropDatabase()`.
  * If MySQL, run `DROP DATABASE IF EXISTS \`dbName\``.
  * Clean up database tracking string inside the user's metadata record.

---

### C. Table / Collection Operations (`/api/database/tables`)

#### 1. List Tables (`GET /api/database/tables?dbName=...`)
* **Logic**:
  * **MongoDB**: Lists collections and retrieves document counts. It also retrieves a sample document from the collection to construct schema column definitions (mapping JavaScript types to SQL-like types).
  * **MySQL**: Executes `SHOW TABLES`. For each table, runs `DESCRIBE \`tableName\`` to extract column fields, types, constraints, default values, and primary key states, and gets counts using `SELECT COUNT(*)`.

#### 2. Create Table (`POST /api/database/tables/create`)
* **Payload**: `{ dbName, tableName, columns, idOption, createdOnOption, modifiedOnOption, isDeletedOption }`
* **Logic**:
  * **MongoDB**: Map array of columns to a key-value template and execute `insertOne(schemaDoc)` to establish fields in the collection.
  * **MySQL**: Construct a `CREATE TABLE \`tableName\`` string appending definitions:
    * Primary key `id` (if `idOption` is true).
    * Customized columns (e.g. `colName colType(size) [UNIQUE] [DEFAULT]`).
    * `createdOn DATETIME DEFAULT CURRENT_TIMESTAMP` (if checked).
    * `modifiedOn DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP` (if checked).
    * `isDeleted TINYINT(1) DEFAULT 0` (if checked).

#### 3. Delete Table (`DELETE /api/database/tables/delete`)
* **Payload**: `{ dbName, tableName }`
* **Logic**: Run `DROP TABLE` (MySQL) or `db.collection(tableName).drop()` (MongoDB).

#### 4. Execute Raw Table Creation (`POST /api/database/tables/create-raw`)
* **Payload**: `{ dbName, sql }`
* **Logic**: Runs raw SQL queries on MySQL (enabling `multipleStatements: true`), or parses JSON containing `{ collectionName, document }` to insert a dynamic document into MongoDB.

---

### D. Table Row Operations (`/api/database/tables/rows`)

The Express controller must handle full dynamic CRUD operations on database tables:

* **GET**: `SELECT * FROM \`tableName\` LIMIT ?` or `col.find({}).limit(?).toArray()`.
* **POST**: Map keys/values to dynamic INSERT queries:
  ```sql
  INSERT INTO `tableName` (`col1`, `col2`) VALUES (?, ?);
  ```
  Or `insertOne(record)` for MongoDB.
* **PUT**: Map keys/values to dynamic UPDATE queries based on `id`:
  ```sql
  UPDATE `tableName` SET `col1` = ? WHERE `id` = ?;
  ```
  Or `updateOne({ _id: new ObjectId(id) }, { $set: updateData })` for MongoDB.
* **DELETE**: `DELETE FROM \`tableName\` WHERE \`id\` = ?` or `deleteOne({ _id: new ObjectId(id) })`.

---

### E. AI Module (`/api/ai`)
* **Route**: `POST /api/ai`
* **Logic**:
  1. Call the Google Gemini generateContent API (e.g. model `gemini-2.5-flash` or `gemini-1.5-flash` using `GEMINI_API_KEY`).
  2. If target engine is SQL, prompt it to generate standard raw MySQL statements (using `AUTO_INCREMENT`, wrapped column backticks).
  3. If MongoDB, prompt it to return a raw JSON object with keys `"collectionName"` and `"document"`.
  4. Strip any markdown wrapping block characters (like ` ```sql ` or ` ```json `) and return the response.

---

### F. Code Generation Module (`/api/crud/generate`)
* **Route**: `POST /api/crud/generate`
* **Logic**:
  1. Formulates target directories using `project.directory`: `schemas/`, `components/`, and `pages/api/[fileName]/`.
  2. Writes the configuration JSON file to `schemas/[fileName].json`.
  3. Compiles a React UI file (`[fileName]Crud.tsx`) containing state management, fetch hooks, and styled inputs mapping columns.
  4. Compiles a Next.js template API route (`route.ts`) containing dynamic connection details.
  5. Writes these text templates directly to the local disk using Node `fs`.
