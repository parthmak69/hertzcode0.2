import mysql from "mysql2/promise";

const getDbConfig = () => ({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
});

// Helper to validate database/table name strings
const validateName = (name) => {
  const pattern = /^[a-z0-9_]+$/;
  return pattern.test(name.trim().toLowerCase());
};

// ==================== 1. LIST TABLES / COLLECTIONS ====================
export const listTables = async (req, res) => {
  let connection;
  try {
    const { dbName } = req.query;

    if (!dbName) {
      return res.status(400).json({ success: false, error: "dbName parameter is required." });
    }

    if (dbName.startsWith("mongodb:")) {
      return res.json({ success: true, tables: [] });
    }

    if (!validateName(dbName)) {
      return res.status(400).json({ success: false, error: "Invalid database name." });
    }

    const tables = [];

    connection = await mysql.createConnection({
      ...getDbConfig(),
      database: dbName,
    });

    const [tablesList] = await connection.query("SHOW TABLES");

    for (const row of tablesList) {
      const tableName = Object.values(row)[0];
      if (tableName.startsWith("_recycled_")) continue;

      const [countResult] = await connection.query(`SELECT COUNT(*) as cnt FROM \`${tableName}\``);
      const entriesCount = countResult[0]?.cnt || 0;

      const [columnsDesc] = await connection.query(`DESCRIBE \`${tableName}\``);

      const columns = columnsDesc.map(col => {
        const typeMatch = col.Type.match(/^([a-zA-Z]+)(?:\(([^)]+)\))?/);
        const type = typeMatch ? typeMatch[1].toUpperCase() : col.Type.toUpperCase();
        const size = typeMatch && typeMatch[2] ? typeMatch[2] : "---";

        return {
          name: col.Field,
          type: type,
          size: size,
          index: col.Key === "PRI" ? "PRIMARY KEY" : col.Key === "UNI" ? "UNIQUE" : "---",
          defaultValue: col.Default === null ? "NULL" : col.Default,
          comment: col.Extra || "",
        };
      });

      const hasId = columns.some(c => c.name === "id" && c.index === "PRIMARY KEY");
      const hasCreated = columns.some(c => c.name === "created_at" || c.name === "createdOn");
      const hasModified = columns.some(c => c.name === "updated_at" || c.name === "modifiedOn");
      const hasDeleted = columns.some(c => c.name === "is_deleted" || c.name === "isDeleted");

      tables.push({
        name: tableName,
        entriesCount: entriesCount,
        idOption: hasId,
        createdOnOption: hasCreated,
        modifiedOnOption: hasModified,
        isDeletedOption: hasDeleted,
        columns: columns,
      });
    }

    return res.json({ success: true, tables });
  } catch (err) {
    if (err.code === 'ER_BAD_DB_ERROR') {
      console.warn(`List Tables Warning: Database '${dbName}' does not exist.`);
      return res.status(404).json({ success: false, code: 'DB_NOT_FOUND', error: `Database '${dbName}' does not exist.` });
    }
    console.error("List Tables Error:", err);
    return res.status(500).json({ success: false, error: "Failed to inspect tables: " + err.message });
  } finally {
    if (connection) {
      try { await connection.end(); } catch (e) {}
    }
  }
};

// ==================== 2. CREATE TABLE / COLLECTION ====================
export const createTable = async (req, res) => {
  let connection;
  try {
    const { dbName, tableName, columns, idOption, createdOnOption, modifiedOnOption, isDeletedOption } = req.body;

    if (!dbName || !tableName) {
      return res.status(400).json({ success: false, error: "Database name and table name are required." });
    }

    if (dbName.startsWith("mongodb:")) {
      return res.status(400).json({ success: false, error: "MongoDB is not supported. SQL databases only." });
    }

    if (!validateName(dbName) || !validateName(tableName)) {
      return res.status(400).json({ success: false, error: "Invalid database or table name." });
    }

    connection = await mysql.createConnection({
      ...getDbConfig(),
      database: dbName,
    });

    const columnDefinitions = [];

    if (idOption) {
      columnDefinitions.push("`id` INT AUTO_INCREMENT PRIMARY KEY");
    }

    if (Array.isArray(columns)) {
      for (const col of columns) {
        if (!col.name || !col.name.trim()) continue;

        let stmt = `\`${col.name.trim().toLowerCase()}\` ${col.type}`;
        if (col.size && col.size.trim() && col.size !== "---") {
          stmt += `(${col.size.trim()})`;
        }

        if (col.index === "UNIQUE") {
          stmt += " UNIQUE";
        }

        if (col.defaultValue === "NULL") {
          stmt += " DEFAULT NULL";
        } else if (col.defaultValue === "CURRENT_TIMESTAMP") {
          stmt += " DEFAULT CURRENT_TIMESTAMP";
        } else if (col.defaultValue === "As Defined") {
          if (col.customDefaultValue !== undefined && col.customDefaultValue !== null) {
            stmt += ` DEFAULT '${col.customDefaultValue}'`;
          }
        } else if (col.defaultValue) {
          stmt += ` DEFAULT '${col.defaultValue}'`;
        }

        columnDefinitions.push(stmt);
      }
    }

    if (createdOnOption) {
      columnDefinitions.push("`createdOn` DATETIME DEFAULT CURRENT_TIMESTAMP");
    }

    if (modifiedOnOption) {
      columnDefinitions.push("`modifiedOn` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
    }

    if (isDeletedOption) {
      columnDefinitions.push("`isDeleted` TINYINT(1) DEFAULT 0");
    }

    if (columnDefinitions.length === 0) {
      return res.status(400).json({ success: false, error: "Table must have at least one column." });
    }

    const createTableQuery = `CREATE TABLE \`${tableName.trim().toLowerCase()}\` (
      ${columnDefinitions.join(",\n      ")}
    )`;

    await connection.execute(createTableQuery);

    return res.json({ success: true });
  } catch (err) {
    console.error("Create Table Error:", err);
    return res.status(500).json({ success: false, error: "Failed to create table/collection: " + err.message });
  } finally {
    if (connection) {
      try { await connection.end(); } catch (e) {}
    }
  }
};

export const deleteTable = async (req, res) => {
  let connection, metaConn;
  try {
    const { dbName, tableName, username } = req.body;

    if (!dbName || !tableName) {
      return res.status(400).json({ success: false, error: "Database name and table name are required." });
    }

    if (dbName.startsWith("mongodb:")) {
      return res.status(400).json({ success: false, error: "MongoDB is not supported." });
    }

    const cleanTableName = tableName.trim().toLowerCase();

    if (!validateName(dbName) || !validateName(cleanTableName)) {
      return res.status(400).json({ success: false, error: "Invalid database or table name." });
    }

    const recycledPhysName = `_recycled_${cleanTableName}_${Date.now()}`;

    connection = await mysql.createConnection({
      ...getDbConfig(),
      database: dbName,
    });

    await connection.execute(`RENAME TABLE \`${cleanTableName}\` TO \`${recycledPhysName}\``);

    // Insert record into recycled_items meta database
    metaConn = await mysql.createConnection({
      ...getDbConfig(),
      database: process.env.DB_NAME || "admin",
    });
    // Auto-create recycled_items if not exists
    await metaConn.execute(`
      CREATE TABLE IF NOT EXISTS \`recycled_items\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`item_type\` VARCHAR(50) NOT NULL,
        \`item_name\` VARCHAR(100) NOT NULL,
        \`original_owner\` VARCHAR(100) NOT NULL,
        \`parent_context\` VARCHAR(100) DEFAULT '',
        \`metadata\` LONGTEXT DEFAULT NULL,
        \`deleted_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await metaConn.execute(
      "INSERT INTO recycled_items (item_type, item_name, original_owner, parent_context, metadata) VALUES (?, ?, ?, ?, ?)",
      ["table", tableName, username || "unknown", dbName, JSON.stringify({ isMongo: false, physicalName: recycledPhysName })]
    );

    return res.json({ success: true });
  } catch (err) {
    console.error("Delete Table Error:", err);
    return res.status(500).json({ success: false, error: "Failed to soft-delete table/collection: " + err.message });
  } finally {
    if (connection) {
      try { await connection.end(); } catch (e) {}
    }
    if (metaConn) {
      try { await metaConn.end(); } catch (e) {}
    }
  }
};

// ==================== 4. EXECUTE RAW TABLE QUERY ====================
export const createTableRaw = async (req, res) => {
  let connection;
  try {
    const { dbName, sql } = req.body;

    if (!dbName || !sql) {
      return res.status(400).json({ success: false, error: "Database name and query string are required." });
    }

    if (dbName.startsWith("mongodb:")) {
      return res.status(400).json({ success: false, error: "MongoDB is not supported." });
    }

    if (!validateName(dbName)) {
      return res.status(400).json({ success: false, error: "Invalid database name." });
    }

    connection = await mysql.createConnection({
      ...getDbConfig(),
      database: dbName,
      multipleStatements: true,
    });

    await connection.query(sql);

    return res.json({ success: true });
  } catch (err) {
    console.error("Create Table Raw Error:", err);
    return res.status(500).json({ success: false, error: "Failed to execute table builder: " + err.message });
  } finally {
    if (connection) {
      try { await connection.end(); } catch (e) {}
    }
  }
};

// ==================== 5. ROWS GET ====================
export const getTableRows = async (req, res) => {
  let connection;
  try {
    const { dbName, tableName, limit } = req.query;
    const limitVal = parseInt(limit || "100") || 100;

    if (!dbName || !tableName) {
      return res.status(400).json({ success: false, error: "dbName and tableName parameters are required." });
    }

    if (dbName.startsWith("mongodb:")) {
      return res.json({ success: true, rows: [], fields: [] });
    }

    if (!validateName(dbName)) {
      return res.status(400).json({ success: false, error: "Invalid database name." });
    }

    connection = await mysql.createConnection({
      ...getDbConfig(),
      database: dbName,
    });

    const [queryRows, queryFields] = await connection.query(`SELECT * FROM \`${tableName}\` LIMIT ${limitVal}`);
    const rows = queryRows;
    const fields = queryFields ? queryFields.map(f => f.name) : [];

    return res.json({ success: true, rows, fields });
  } catch (err) {
    console.error("Get Rows Error:", err);
    return res.status(500).json({ success: false, error: "Failed to fetch rows: " + err.message });
  } finally {
    if (connection) {
      try { await connection.end(); } catch (e) {}
    }
  }
};

// Helper to write executing queries to query_logger table if it exists
const logQueryToLogger = async (connection, sqlQuery, values = [], endpoint = "Admin Portal", username = "admin") => {
  try {
    const [tables] = await connection.query("SHOW TABLES LIKE 'query_logger'");
    if (tables.length > 0) {
      let formattedSql = sqlQuery;
      values.forEach(val => {
        const replacement = typeof val === "string" ? `'${val.replace(/'/g, "''")}'` : typeof val === "object" && val !== null ? `'${JSON.stringify(val)}'` : val;
        formattedSql = formattedSql.replace("?", replacement);
      });
      await connection.query(
        "INSERT INTO `query_logger` (`query`, `link`, `accountID`) VALUES (?, ?, ?)",
        [formattedSql, endpoint, username || "admin"]
      );
    }
  } catch (err) {
    console.warn("Failed to write to query_logger:", err.message);
  }
};

// ==================== 6. ROWS INSERT ====================
export const insertTableRow = async (req, res) => {
  let connection;
  try {
    const { dbName, tableName, record, username } = req.body;

    if (!dbName || !tableName || !record) {
      return res.status(400).json({ success: false, error: "dbName, tableName and record are required." });
    }

    if (dbName.startsWith("mongodb:")) {
      return res.status(400).json({ success: false, error: "MongoDB is not supported." });
    }

    connection = await mysql.createConnection({
      ...getDbConfig(),
      database: dbName,
    });

    const keys = Object.keys(record);
    const values = Object.values(record);
    const placeholders = keys.map(() => "?").join(", ");
    const sql = `INSERT INTO \`${tableName}\` (${keys.map(k => `\`${k}\``).join(", ")}) VALUES (${placeholders})`;

    const [result] = await connection.execute(sql, values);

    // Log to query_logger
    await logQueryToLogger(connection, sql, values, "Admin Portal - Insert Row", username);

    return res.json({ success: true, insertId: result.insertId });
  } catch (err) {
    console.error("Insert Row Error:", err);
    return res.status(500).json({ success: false, error: err.message });
  } finally {
    if (connection) {
      try { await connection.end(); } catch (e) {}
    }
  }
};

// Helper to dynamically get the primary key column name of a MySQL table
const getPrimaryKeyColumn = async (connection, tableName) => {
  try {
    const [columnsDesc] = await connection.query(`DESCRIBE \`${tableName}\``);
    // 1. Look for Key === "PRI"
    let priCol = columnsDesc.find(col => col.Key === "PRI");
    if (priCol) return priCol.Field;
    // 2. Look for any column named "id" (case-insensitive)
    let idCol = columnsDesc.find(col => col.Field.toLowerCase() === "id");
    if (idCol) return idCol.Field;
    // 3. Look for any column ending in "id"
    let endsWithId = columnsDesc.find(col => col.Field.toLowerCase().endsWith("id"));
    if (endsWithId) return endsWithId.Field;
    // 4. Fallback to the first column in the table
    if (columnsDesc.length > 0) return columnsDesc[0].Field;
  } catch (e) {
    console.error("Failed to describe table for primary key:", e);
  }
  return "id"; // absolute fallback
};

// ==================== 7. ROWS UPDATE ====================
export const updateTableRow = async (req, res) => {
  let connection;
  try {
    const { dbName, tableName, id, record, username } = req.body;

    if (!dbName || !tableName || !id || !record) {
      return res.status(400).json({ success: false, error: "dbName, tableName, id and record are required." });
    }

    if (dbName.startsWith("mongodb:")) {
      return res.status(400).json({ success: false, error: "MongoDB is not supported." });
    }

    connection = await mysql.createConnection({
      ...getDbConfig(),
      database: dbName,
    });

    const pkColumn = await getPrimaryKeyColumn(connection, tableName);
    
    // Filter out the primary key from record to avoid trying to update it
    const { [pkColumn]: _, id: __, ...updateData } = record;
    const keys = Object.keys(updateData);
    const values = Object.values(updateData);

    const setClause = keys.map(k => `\`${k}\` = ?`).join(", ");
    const sql = `UPDATE \`${tableName}\` SET ${setClause} WHERE \`${pkColumn}\` = ?`;

    const [result] = await connection.execute(sql, [...values, id]);

    // Log to query_logger
    await logQueryToLogger(connection, sql, [...values, id], "Admin Portal - Update Row", username);

    return res.json({ success: true, affectedRows: result.affectedRows });
  } catch (err) {
    console.error("Update Row Error:", err);
    return res.status(500).json({ success: false, error: err.message });
  } finally {
    if (connection) {
      try { await connection.end(); } catch (e) {}
    }
  }
};

// ==================== 8. ROWS DELETE ====================
export const deleteTableRow = async (req, res) => {
  let connection;
  try {
    const { dbName, tableName, id, username } = req.query;

    if (!dbName || !tableName || !id) {
      return res.status(400).json({ success: false, error: "dbName, tableName and id query parameters are required." });
    }

    if (dbName.startsWith("mongodb:")) {
      return res.status(400).json({ success: false, error: "MongoDB is not supported." });
    }

    connection = await mysql.createConnection({
      ...getDbConfig(),
      database: dbName,
    });

    const pkColumn = await getPrimaryKeyColumn(connection, tableName);
    const sql = `DELETE FROM \`${tableName}\` WHERE \`${pkColumn}\` = ?`;
    const [result] = await connection.execute(sql, [id]);

    // Log to query_logger
    await logQueryToLogger(connection, sql, [id], "Admin Portal - Delete Row", username);

    return res.json({ success: true, affectedRows: result.affectedRows });
  } catch (err) {
    console.error("Delete Row Error:", err);
    return res.status(500).json({ success: false, error: err.message });
  } finally {
    if (connection) {
      try { await connection.end(); } catch (e) {}
    }
  }
};

// ==================== 9. SEED MOCK DATA ====================
const getMockVal = (category, fieldName = "", fieldType = "", customVal) => {
  if (category === "As Defined" && customVal !== undefined && customVal !== null && customVal.trim() !== "") {
    const typeLower = fieldType.toLowerCase();
    const isNumeric = typeLower.includes("int") || typeLower.includes("decimal") || typeLower.includes("float") || typeLower.includes("double");
    if (isNumeric) {
      const parsed = parseFloat(customVal);
      return isNaN(parsed) ? 0 : parsed;
    }
    return customVal;
  }

  const fieldLower = fieldName.toLowerCase();
  const typeLower = fieldType.toLowerCase();

  // Handle bit/boolean columns — only 0 or 1 allowed
  if (typeLower.includes("bit") || (typeLower === "tinyint(1)")) {
    if (category === "As Defined" && customVal !== undefined && customVal !== null && customVal.trim() !== "") {
      return parseInt(customVal) ? 1 : 0;
    }
    return Math.random() > 0.5 ? 1 : 0;
  }

  // Handle decimal/numeric columns — respect precision limits
  const decimalMatch = typeLower.match(/decimal\((\d+),(\d+)\)/);
  if (decimalMatch) {
    const totalDigits = parseInt(decimalMatch[1]);
    const decimalPlaces = parseInt(decimalMatch[2]);
    const integerDigits = totalDigits - decimalPlaces;
    const maxVal = Math.pow(10, integerDigits) - 1; // e.g. decimal(4,2) → max 99.99

    // Percent fields → realistic tax/percentage values
    if (fieldLower.includes("percent") || fieldLower.includes("pct") || fieldLower.includes("rate") || fieldLower.includes("gst") || fieldLower.includes("tax")) {
      const commonPercents = [5.00, 9.00, 12.00, 18.00, 28.00, 2.50, 6.00, 14.00];
      const val = commonPercents[Math.floor(Math.random() * commonPercents.length)];
      return Math.min(val, maxVal);
    }

    // Generic decimal — stay within column's max
    if (category === "As Defined" && customVal !== undefined && customVal !== null && customVal.trim() !== "") {
      const parsed = parseFloat(customVal);
      return isNaN(parsed) ? 0 : Math.min(parsed, maxVal);
    }
    const rawVal = parseFloat((Math.random() * Math.min(maxVal, 999)).toFixed(decimalPlaces));
    return Math.min(rawVal, maxVal);
  }
  
  const isNumeric = typeLower.includes("int") || typeLower.includes("decimal") || typeLower.includes("float") || typeLower.includes("double") || typeLower.includes("numeric");
  const isDateType = typeLower.includes("date") || typeLower.includes("time") || typeLower.includes("timestamp");

  const lengthMatch = fieldType.match(/\((\d+)\)/);
  const maxLength = lengthMatch ? parseInt(lengthMatch[1]) : 255;

  let targetCategory = category;
  if (category === "As Defined" || !category) {
    if (isNumeric) {
      if (fieldLower.includes("price") || fieldLower.includes("amount") || fieldLower.includes("cost") || fieldLower.includes("total") || fieldLower.includes("salary") || fieldLower.includes("rate") || fieldLower.includes("fee")) {
        targetCategory = "Price";
      } else {
        targetCategory = "Number";
      }
    } else if (isDateType) {
      targetCategory = "Date";
    } else {
      if (fieldLower.includes("email")) targetCategory = "Email";
      else if (fieldLower.includes("phone") || fieldLower.includes("mobile") || fieldLower.includes("tel") || fieldLower.includes("contact")) targetCategory = "Indian Mobile";
      else if (fieldLower.includes("dob") || fieldLower.includes("birth") || fieldLower.includes("date_of_birth")) targetCategory = "Date of Birth";
      else if (fieldLower.includes("image") || fieldLower.includes("avatar") || fieldLower.includes("photo") || fieldLower.includes("pic")) targetCategory = "Image URL";
      else if (fieldLower.includes("name")) targetCategory = "Full Name";
      else if (fieldLower.includes("status") || fieldLower.includes("state")) targetCategory = "Status";
      else if (fieldLower.includes("role") || fieldLower.includes("type") || fieldLower.includes("category") || fieldLower.includes("group")) targetCategory = "Role/Type";
      else if (fieldLower.includes("desc") || fieldLower.includes("content") || fieldLower.includes("body") || fieldLower.includes("comment") || fieldLower.includes("notes") || fieldLower.includes("bio")) targetCategory = "Description";
      else if (fieldLower.includes("city") || fieldLower.includes("address") || fieldLower.includes("country") || fieldLower.includes("state") || fieldLower.includes("location")) targetCategory = "Address";
      else if (fieldLower.includes("title") || fieldLower.includes("subject") || fieldLower.includes("header")) targetCategory = "Title";
      else if (fieldLower.includes("date") || fieldLower.includes("created") || fieldLower.includes("updated") || fieldLower.includes("time") || fieldLower.includes("at")) targetCategory = "Date";
      else if (fieldLower.includes("password") || fieldLower.includes("pass") || fieldLower.includes("secret") || fieldLower.includes("hash")) targetCategory = "Password";
      else if (fieldLower.includes("url") || fieldLower.includes("link") || fieldLower.includes("website") || fieldLower.includes("site")) targetCategory = "Website URL";
      else if (fieldLower.includes("zip") || fieldLower.includes("pincode") || fieldLower.includes("postal")) targetCategory = "Zip Code";
      else if (fieldLower.includes("company") || fieldLower.includes("org") || fieldLower.includes("firm")) targetCategory = "Company Name";
      else if (fieldLower.includes("gender") || fieldLower.includes("sex")) targetCategory = "Gender";
      else if (fieldLower.includes("ip") || fieldLower.includes("ip_address")) targetCategory = "IP Address";
    }
  }

  if (isNumeric && ["Full Name", "Email", "Indian Mobile", "Image URL", "Description", "Address", "Title", "Date", "Password", "Website URL", "Company Name", "Gender", "IP Address"].includes(targetCategory)) {
    if (fieldLower.includes("price") || fieldLower.includes("amount") || fieldLower.includes("cost") || fieldLower.includes("total") || fieldLower.includes("salary") || fieldLower.includes("rate") || fieldLower.includes("fee")) {
      targetCategory = "Price";
    } else {
      targetCategory = "Number";
    }
  }

  const names = [
    "Rajesh Patel", "Amit Sharma", "Neha Gupta", "Sunita Rao", "Karan Johar", "Vijay Kumar",
    "Aarav Singh", "Vivaan Kapoor", "Aditya Verma", "Vihaan Malhotra", "Arjun Joshi",
    "Sai Reddy", "Reyansh Nair", "Aaryan Roy", "Krishna Prasad", "Ishaan Mehta",
    "Ananya Sen", "Diya Iyer", "Pari Saxena", "Pihu Choudhury", "Ira Trivedi",
    "Avani Kulkarni", "Saisha Bhat", "Riya Das", "Aadhya Banerjee", "Anvi Khurana"
  ];

  const emails = [
    "aarav.singh@gmail.com", "vivaan.kapoor@yahoo.com", "neha.gupta@hertzsoft.com",
    "ananya.sen@outlook.com", "karan.johar@dharma.com", "sai.reddy@infy.com",
    "riya.das@tcs.com", "vijay.kumar@wipro.com", "avani.k@rediffmail.com"
  ];

  const statuses = ["active", "pending", "inactive", "completed", "cancelled", "on-hold"];
  const roles = ["admin", "editor", "user", "moderator", "customer", "manager", "employee"];
  const categoriesPool = ["Electronics", "Clothing", "Home & Kitchen", "Books", "Beauty & Health", "Sports"];
  
  const titles = [
    "Summer T-Shirt", "Wireless Headphones", "Water Bottle",
    "Web Development", "Green Tea", "Office Chair",
    "Liquid Lipstick", "Smartphone", "Smartwatch"
  ];

  const addresses = [
    "Andheri East, Mumbai, MH", "Jubilee Hills, Hyderabad, TS",
    "Elgin Road, Kolkata, WB", "Connaught Place, New Delhi, DL",
    "Indiranagar, Bengaluru, KA", "Anna Salai, Chennai, TN"
  ];

  const descriptions = [
    "Premium quality product.",
    "Highly recommended.",
    "State-of-the-art tech.",
    "Perfect for daily usage.",
    "Eco-friendly materials."
  ];

  const companies = ["HertzSoft", "TCS", "Infosys", "Reliance", "Wipro", "HDFC", "Mahindra"];
  const genders = ["Male", "Female", "Other"];
  const websites = ["https://hertzsoft.com", "https://google.com", "https://github.com", "https://wikipedia.org", "https://medium.com"];
  const ips = ["192.168.1.1", "10.0.0.12", "172.16.254.1", "8.8.8.8", "127.0.0.1"];

  switch (targetCategory) {
    case "Full Name":
      return names[Math.floor(Math.random() * names.length)].slice(0, maxLength);
    case "Date of Birth":
      return `199${Math.floor(Math.random() * 10)}-0${Math.floor(Math.random() * 9) + 1}-1${Math.floor(Math.random() * 9)}`.slice(0, maxLength);
    case "Indian Mobile": {
      const numPart = `9${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 8000000) + 1000000}`; // 9 digits
      if (maxLength < 15) {
        return numPart.slice(0, maxLength);
      }
      return `+91 ${numPart}`.slice(0, maxLength);
    }
    case "Image URL":
      return `https://picsum.photos/200?r=${Math.floor(Math.random() * 1000)}`.slice(0, maxLength);
    case "Email": {
      const suffix = String(Math.floor(Math.random() * 90000) + 10000);
      const domain = "@example.com";
      const neededLength = suffix.length + domain.length + 2;
      if (maxLength < neededLength) {
        return (names[Math.floor(Math.random() * names.length)].toLowerCase().replace(/\s+/g, "") + suffix).slice(0, maxLength);
      }
      const namePart = names[Math.floor(Math.random() * names.length)].toLowerCase().replace(/\s+/g, ".").slice(0, maxLength - neededLength);
      return `${namePart}${suffix}${domain}`;
    }
    case "Price":
      return parseFloat((Math.random() * 999 + 9.99).toFixed(2));
    case "Number":
      return Math.floor(Math.random() * 150) + 1;
    case "Status":
      return statuses[Math.floor(Math.random() * statuses.length)].slice(0, maxLength);
    case "Role/Type":
      if (fieldLower.includes("role")) return roles[Math.floor(Math.random() * roles.length)].slice(0, maxLength);
      return categoriesPool[Math.floor(Math.random() * categoriesPool.length)].slice(0, maxLength);
    case "Description":
      return descriptions[Math.floor(Math.random() * descriptions.length)].slice(0, maxLength);
    case "Address":
      return addresses[Math.floor(Math.random() * addresses.length)].slice(0, maxLength);
    case "Title":
      return titles[Math.floor(Math.random() * titles.length)].slice(0, maxLength);
    case "Date":
      const d = new Date();
      d.setDate(d.getDate() - Math.floor(Math.random() * 30));
      return d.toISOString().split("T")[0].slice(0, maxLength);
    case "Password":
      return "$2b$10$MOCKhashedPasswordSecretStringHere123456789".slice(0, maxLength);
    case "Website URL":
      return websites[Math.floor(Math.random() * websites.length)].slice(0, maxLength);
    case "Zip Code":
      return String(Math.floor(Math.random() * 800000) + 110000).slice(0, maxLength);
    case "Company Name":
      return companies[Math.floor(Math.random() * companies.length)].slice(0, maxLength);
    case "Gender":
      return genders[Math.floor(Math.random() * genders.length)].slice(0, maxLength);
    case "IP Address":
      return ips[Math.floor(Math.random() * ips.length)].slice(0, maxLength);
    default: {
      const suffix = String(Math.floor(Math.random() * 90000) + 10000);
      if (maxLength <= suffix.length) {
        return suffix.slice(0, maxLength);
      }
      const prefix = `Mock_${fieldName}`.slice(0, maxLength - suffix.length - 1);
      return `${prefix}_${suffix}`;
    }
  }
};

export const seedTable = async (req, res) => {
  let connection;
  try {
    const { dbName, tableName, count, mappings, customValues } = req.body;

    if (!dbName || !tableName) {
      return res.status(400).json({ success: false, error: "Database name and table name are required." });
    }

    if (dbName.startsWith("mongodb:")) {
      return res.status(400).json({ success: false, error: "MongoDB is not supported." });
    }

    const rowsCount = Math.min(Math.max(parseInt(count) || 5, 1), 100);

    connection = await mysql.createConnection({
      ...getDbConfig(),
      database: dbName,
    });

    const [cols] = await connection.query(`DESCRIBE \`${tableName}\``);
    const validCols = cols.filter(c => !["id", "created_at", "createdOn", "updated_at", "modifiedOn", "is_deleted", "isDeleted"].includes(c.Field));

    for (let r = 0; r < rowsCount; r++) {
      const colNames = [];
      const colValues = [];

      for (const col of validCols) {
        const category = mappings?.[col.Field] || "As Defined";
        const customVal = customValues?.[col.Field];
        colNames.push(col.Field);
        colValues.push(getMockVal(category, col.Field, col.Type, customVal));
      }

      if (colNames.length > 0) {
        const placeholders = colNames.map(() => "?").join(", ");
        const insertQuery = `INSERT INTO \`${tableName}\` (${colNames.map(n => `\`${n}\``).join(", ")}) VALUES (${placeholders})`;
        await connection.execute(insertQuery, colValues);
      }
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("Seeding Error:", err);
    return res.status(500).json({ success: false, error: "Failed to insert mock data: " + err.message });
  } finally {
    if (connection) {
      try { await connection.end(); } catch (e) {}
    }
  }
};
