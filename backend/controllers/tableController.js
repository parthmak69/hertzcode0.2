import mysql from "mysql2/promise";
import { MongoClient, ObjectId } from "mongodb";

const getDbConfig = () => ({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
});

const getMongoUri = () => process.env.MONGO_URI || "mongodb://localhost:27017";

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

    const isMongo = dbName.startsWith("mongodb:");
    const mongoDbRealName = isMongo ? dbName.replace("mongodb:", "") : dbName;

    if (!validateName(mongoDbRealName)) {
      return res.status(400).json({ success: false, error: "Invalid database name." });
    }

    const tables = [];

    if (isMongo) {
      const client = new MongoClient(getMongoUri());
      await client.connect();
      const db = client.db(mongoDbRealName);
      const collectionsList = await db.listCollections().toArray();

      for (const colInfo of collectionsList) {
        const colName = colInfo.name;
        const count = await db.collection(colName).countDocuments();
        const sample = await db.collection(colName).findOne();

        const columns = [];
        if (sample) {
          for (const [key, value] of Object.entries(sample)) {
            if (key === "_id") continue;
            let colType = "VARCHAR";
            if (typeof value === "number") colType = "INT";
            else if (value instanceof Date) colType = "DATETIME";
            else if (typeof value === "boolean") colType = "TINYINT";

            columns.push({
              name: key,
              type: colType,
              size: "---",
              index: "---",
              defaultValue: "NULL",
              comment: "",
            });
          }
        } else {
          columns.push({
            name: "name",
            type: "VARCHAR",
            size: "---",
            index: "---",
            defaultValue: "NULL",
            comment: "",
          });
        }

        tables.push({
          name: colName,
          entriesCount: count,
          idOption: true,
          createdOnOption: false,
          modifiedOnOption: false,
          isDeletedOption: false,
          columns: columns,
        });
      }
      await client.close();
    } else {
      connection = await mysql.createConnection({
        ...getDbConfig(),
        database: dbName,
      });

      const [tablesList] = await connection.query("SHOW TABLES");

      for (const row of tablesList) {
        const tableName = Object.values(row)[0];

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
          columns: columns.filter(c => !["id", "created_at", "createdOn", "updated_at", "modifiedOn", "is_deleted", "isDeleted"].includes(c.name)),
        });
      }

      await connection.end();
    }

    return res.json({ success: true, tables });
  } catch (err) {
    if (connection) {
      try { await connection.end(); } catch (e) {}
    }
    console.error("List Tables Error:", err);
    return res.status(500).json({ success: false, error: "Failed to inspect tables: " + err.message });
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

    const isMongo = dbName.startsWith("mongodb:");
    const mongoDbRealName = isMongo ? dbName.replace("mongodb:", "") : dbName;

    if (!validateName(mongoDbRealName) || !validateName(tableName)) {
      return res.status(400).json({ success: false, error: "Invalid database or table name." });
    }

    if (isMongo) {
      const client = new MongoClient(getMongoUri());
      await client.connect();
      const db = client.db(mongoDbRealName);

      const sampleDoc = {};
      if (Array.isArray(columns)) {
        for (const col of columns) {
          if (!col.name || !col.name.trim()) continue;
          let defaultVal = "";
          if (col.type === "INT" || col.type === "TINYINT") defaultVal = 0;
          else if (col.type === "DATETIME" || col.type === "DATE") defaultVal = new Date();
          sampleDoc[col.name.trim().toLowerCase()] = defaultVal;
        }
      }

      if (Object.keys(sampleDoc).length === 0) {
        sampleDoc["name"] = "Sample";
      }

      await db.collection(tableName.trim().toLowerCase()).insertOne(sampleDoc);
      await client.close();
    } else {
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
          } else if (col.defaultValue && col.defaultValue !== "As Defined") {
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
        await connection.end();
        return res.status(400).json({ success: false, error: "Table must have at least one column." });
      }

      const createTableQuery = `CREATE TABLE \`${tableName.trim().toLowerCase()}\` (
        ${columnDefinitions.join(",\n      ")}
      )`;

      await connection.execute(createTableQuery);
      await connection.end();
    }

    return res.json({ success: true });
  } catch (err) {
    if (connection) {
      try { await connection.end(); } catch (e) {}
    }
    console.error("Create Table Error:", err);
    return res.status(500).json({ success: false, error: "Failed to create table/collection: " + err.message });
  }
};

// ==================== 3. DELETE TABLE / COLLECTION ====================
export const deleteTable = async (req, res) => {
  let connection;
  try {
    const { dbName, tableName } = req.body;

    if (!dbName || !tableName) {
      return res.status(400).json({ success: false, error: "Database name and table name are required." });
    }

    const isMongo = dbName.startsWith("mongodb:");
    const mongoDbRealName = isMongo ? dbName.replace("mongodb:", "") : dbName;

    if (!validateName(mongoDbRealName) || !validateName(tableName)) {
      return res.status(400).json({ success: false, error: "Invalid database or table name." });
    }

    if (isMongo) {
      const client = new MongoClient(getMongoUri());
      await client.connect();
      const db = client.db(mongoDbRealName);
      await db.collection(tableName.trim().toLowerCase()).drop();
      await client.close();
    } else {
      connection = await mysql.createConnection({
        ...getDbConfig(),
        database: dbName,
      });

      await connection.execute(`DROP TABLE IF EXISTS \`${tableName.trim().toLowerCase()}\``);
      await connection.end();
    }

    return res.json({ success: true });
  } catch (err) {
    if (connection) {
      try { await connection.end(); } catch (e) {}
    }
    console.error("Delete Table Error:", err);
    return res.status(500).json({ success: false, error: "Failed to drop table/collection: " + err.message });
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

    const isMongo = dbName.startsWith("mongodb:");
    const mongoDbRealName = isMongo ? dbName.replace("mongodb:", "") : dbName;

    if (!validateName(mongoDbRealName)) {
      return res.status(400).json({ success: false, error: "Invalid database name." });
    }

    if (isMongo) {
      const client = new MongoClient(getMongoUri());
      await client.connect();
      const db = client.db(mongoDbRealName);

      let parsed;
      try {
        parsed = JSON.parse(sql);
      } catch (e) {
        throw new Error("AI output was not valid JSON: " + sql);
      }

      const collectionName = parsed.collectionName || "generated_collection";
      const document = parsed.document || parsed;

      await db.collection(collectionName.trim().toLowerCase()).insertOne(document);
      await client.close();
    } else {
      connection = await mysql.createConnection({
        ...getDbConfig(),
        database: dbName,
        multipleStatements: true,
      });

      await connection.query(sql);
      await connection.end();
    }

    return res.json({ success: true });
  } catch (err) {
    if (connection) {
      try { await connection.end(); } catch (e) {}
    }
    console.error("Create Table Raw Error:", err);
    return res.status(500).json({ success: false, error: "Failed to execute table builder: " + err.message });
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

    const isMongo = dbName.startsWith("mongodb:");
    const mongoDbRealName = isMongo ? dbName.replace("mongodb:", "") : dbName;

    if (!validateName(mongoDbRealName)) {
      return res.status(400).json({ success: false, error: "Invalid database name." });
    }

    let rows = [];
    let fields = [];

    if (isMongo) {
      const client = new MongoClient(getMongoUri());
      await client.connect();
      const db = client.db(mongoDbRealName);
      const col = db.collection(tableName);

      rows = await col.find({}).limit(limitVal).toArray();

      if (rows.length > 0) {
        const keySet = new Set();
        for (const row of rows) {
          for (const key of Object.keys(row)) {
            keySet.add(key);
          }
        }
        fields = Array.from(keySet);
      }
      await client.close();
    } else {
      connection = await mysql.createConnection({
        ...getDbConfig(),
        database: dbName,
      });

      const [queryRows, queryFields] = await connection.query(`SELECT * FROM \`${tableName}\` LIMIT ${limitVal}`);
      rows = queryRows;
      fields = queryFields ? queryFields.map(f => f.name) : [];

      await connection.end();
    }

    return res.json({ success: true, rows, fields });
  } catch (err) {
    if (connection) {
      try { await connection.end(); } catch (e) {}
    }
    console.error("Get Rows Error:", err);
    return res.status(500).json({ success: false, error: "Failed to fetch rows: " + err.message });
  }
};

// ==================== 6. ROWS INSERT ====================
export const insertTableRow = async (req, res) => {
  let connection;
  try {
    const { dbName, tableName, record } = req.body;

    if (!dbName || !tableName || !record) {
      return res.status(400).json({ success: false, error: "dbName, tableName and record are required." });
    }

    const isMongo = dbName.startsWith("mongodb:");
    const mongoDbRealName = isMongo ? dbName.replace("mongodb:", "") : dbName;

    if (isMongo) {
      const client = new MongoClient(getMongoUri());
      await client.connect();
      const db = client.db(mongoDbRealName);
      const col = db.collection(tableName);

      const result = await col.insertOne(record);
      await client.close();
      return res.json({ success: true, insertedId: result.insertedId });
    } else {
      connection = await mysql.createConnection({
        ...getDbConfig(),
        database: dbName,
      });

      const keys = Object.keys(record);
      const values = Object.values(record);
      const placeholders = keys.map(() => "?").join(", ");
      const sql = `INSERT INTO \`${tableName}\` (${keys.map(k => `\`${k}\``).join(", ")}) VALUES (${placeholders})`;

      const [result] = await connection.execute(sql, values);
      await connection.end();
      return res.json({ success: true, insertId: result.insertId });
    }
  } catch (err) {
    if (connection) {
      try { await connection.end(); } catch (e) {}
    }
    console.error("Insert Row Error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ==================== 7. ROWS UPDATE ====================
export const updateTableRow = async (req, res) => {
  let connection;
  try {
    const { dbName, tableName, id, record } = req.body;

    if (!dbName || !tableName || !id || !record) {
      return res.status(400).json({ success: false, error: "dbName, tableName, id and record are required." });
    }

    const isMongo = dbName.startsWith("mongodb:");
    const mongoDbRealName = isMongo ? dbName.replace("mongodb:", "") : dbName;

    if (isMongo) {
      const client = new MongoClient(getMongoUri());
      await client.connect();
      const db = client.db(mongoDbRealName);
      const col = db.collection(tableName);

      const { _id, ...updateData } = record;
      const result = await col.updateOne({ _id: new ObjectId(id) }, { $set: updateData });
      await client.close();
      return res.json({ success: true, modifiedCount: result.modifiedCount });
    } else {
      connection = await mysql.createConnection({
        ...getDbConfig(),
        database: dbName,
      });

      const { id: _, ...updateData } = record;
      const keys = Object.keys(updateData);
      const values = Object.values(updateData);

      const setClause = keys.map(k => `\`${k}\` = ?`).join(", ");
      const sql = `UPDATE \`${tableName}\` SET ${setClause} WHERE \`id\` = ?`;

      const [result] = await connection.execute(sql, [...values, id]);
      await connection.end();
      return res.json({ success: true, affectedRows: result.affectedRows });
    }
  } catch (err) {
    if (connection) {
      try { await connection.end(); } catch (e) {}
    }
    console.error("Update Row Error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ==================== 8. ROWS DELETE ====================
export const deleteTableRow = async (req, res) => {
  let connection;
  try {
    const { dbName, tableName, id } = req.query;

    if (!dbName || !tableName || !id) {
      return res.status(400).json({ success: false, error: "dbName, tableName and id query parameters are required." });
    }

    const isMongo = dbName.startsWith("mongodb:");
    const mongoDbRealName = isMongo ? dbName.replace("mongodb:", "") : dbName;

    if (isMongo) {
      const client = new MongoClient(getMongoUri());
      await client.connect();
      const db = client.db(mongoDbRealName);
      const col = db.collection(tableName);

      const result = await col.deleteOne({ _id: new ObjectId(id) });
      await client.close();
      return res.json({ success: true, deletedCount: result.deletedCount });
    } else {
      connection = await mysql.createConnection({
        ...getDbConfig(),
        database: dbName,
      });

      const sql = `DELETE FROM \`${tableName}\` WHERE \`id\` = ?`;
      const [result] = await connection.execute(sql, [id]);
      await connection.end();
      return res.json({ success: true, affectedRows: result.affectedRows });
    }
  } catch (err) {
    if (connection) {
      try { await connection.end(); } catch (e) {}
    }
    console.error("Delete Row Error:", err);
    return res.status(500).json({ success: false, error: err.message });
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
  
  const isNumeric = typeLower.includes("int") || typeLower.includes("decimal") || typeLower.includes("float") || typeLower.includes("double") || typeLower.includes("numeric");
  const isDateType = typeLower.includes("date") || typeLower.includes("time") || typeLower.includes("timestamp");

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
      else if (fieldLower.includes("phone") || fieldLower.includes("mobile") || fieldLower.includes("tel")) targetCategory = "Indian Mobile";
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
    "Summer Cotton T-Shirt", "Wireless Noise Cancelling Headphones", "Stainless Steel Water Bottle",
    "Introduction to Web Development", "Organic Green Tea Leaves", "Ergonomic Office Chair",
    "Matte Liquid Lipstick", "Smartphone With 108MP Camera", "Bluetooth Fitness Tracker Smartwatch"
  ];

  const addresses = [
    "102, Shanti Nagar, Andheri East, Mumbai, MH", "45, Jubilee Hills, Road No 3, Hyderabad, TS",
    "7B, Elgin Road, Near Forum Mall, Kolkata, WB", "321, Connaught Place, Block C, New Delhi, DL",
    "504, 100 Feet Road, Indiranagar, Bengaluru, KA", "12, Anna Salai, Teynampet, Chennai, TN"
  ];

  const descriptions = [
    "A premium quality product designed for long-lasting usage and comfort.",
    "Highly recommended by experts in the industry. Easy to use and low maintenance.",
    "Features state-of-the-art technology with a sleek, modern, and compact design.",
    "Perfect choice for daily usage or as a premium gift for your friends and family.",
    "Eco-friendly materials used. Cruelty-free and certified by standard safety authorities."
  ];

  const companies = ["HertzSoft Technologies", "Tata Consultancy Services", "Infosys", "Reliance Industries", "Wipro", "HDFC Bank", "Mahindra Group"];
  const genders = ["Male", "Female", "Other"];
  const websites = ["https://hertzsoft.com", "https://google.com", "https://github.com", "https://wikipedia.org", "https://medium.com"];
  const ips = ["192.168.1.1", "10.0.0.12", "172.16.254.1", "8.8.8.8", "127.0.0.1"];

  switch (targetCategory) {
    case "Full Name":
      return names[Math.floor(Math.random() * names.length)];
    case "Date of Birth":
      return `199${Math.floor(Math.random() * 10)}-0${Math.floor(Math.random() * 9) + 1}-1${Math.floor(Math.random() * 9)}`;
    case "Indian Mobile":
      return `+91 9${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 8000000) + 1000000}`;
    case "Image URL":
      return `https://picsum.photos/200/300?random=${Math.floor(Math.random() * 1000)}`;
    case "Email":
      if (Math.random() > 0.4) {
        return emails[Math.floor(Math.random() * emails.length)];
      }
      return `${names[Math.floor(Math.random() * names.length)].toLowerCase().replace(/\s+/g, ".")}@example.com`;
    case "Price":
      return parseFloat((Math.random() * 999 + 9.99).toFixed(2));
    case "Number":
      return Math.floor(Math.random() * 150) + 1;
    case "Status":
      return statuses[Math.floor(Math.random() * statuses.length)];
    case "Role/Type":
      if (fieldLower.includes("role")) return roles[Math.floor(Math.random() * roles.length)];
      return categoriesPool[Math.floor(Math.random() * categoriesPool.length)];
    case "Description":
      return descriptions[Math.floor(Math.random() * descriptions.length)];
    case "Address":
      return addresses[Math.floor(Math.random() * addresses.length)];
    case "Title":
      return titles[Math.floor(Math.random() * titles.length)];
    case "Date":
      const d = new Date();
      d.setDate(d.getDate() - Math.floor(Math.random() * 30));
      return d.toISOString().split("T")[0];
    case "Password":
      return "$2b$10$MOCKhashedPasswordSecretStringHere123456789";
    case "Website URL":
      return websites[Math.floor(Math.random() * websites.length)];
    case "Zip Code":
      return String(Math.floor(Math.random() * 800000) + 110000);
    case "Company Name":
      return companies[Math.floor(Math.random() * companies.length)];
    case "Gender":
      return genders[Math.floor(Math.random() * genders.length)];
    case "IP Address":
      return ips[Math.floor(Math.random() * ips.length)];
    default:
      return "Mock Text";
  }
};

export const seedTable = async (req, res) => {
  let connection;
  try {
    const { dbName, tableName, count, mappings, customValues } = req.body;

    if (!dbName || !tableName) {
      return res.status(400).json({ success: false, error: "Database name and table name are required." });
    }

    const isMongo = dbName.startsWith("mongodb:");
    const mongoDbRealName = isMongo ? dbName.replace("mongodb:", "") : dbName;
    const rowsCount = Math.min(Math.max(parseInt(count) || 5, 1), 100);

    if (isMongo) {
      const client = new MongoClient(getMongoUri());
      await client.connect();
      const db = client.db(mongoDbRealName);
      const col = db.collection(tableName);

      const sample = await col.findOne();
      const fields = sample ? Object.keys(sample).filter(k => k !== "_id") : (mappings ? Object.keys(mappings) : ["name", "email"]);

      const documents = [];
      for (let r = 0; r < rowsCount; r++) {
        const doc = {};
        for (const field of fields) {
          const category = mappings?.[field] || "As Defined";
          const customVal = customValues?.[field];
          doc[field] = getMockVal(category, field, "VARCHAR", customVal);
        }
        documents.push(doc);
      }

      if (documents.length > 0) {
        await col.insertMany(documents);
      }
      await client.close();
    } else {
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

      await connection.end();
    }

    return res.json({ success: true });
  } catch (err) {
    if (connection) {
      try { await connection.end(); } catch (e) {}
    }
    console.error("Seeding Error:", err);
    return res.status(500).json({ success: false, error: "Failed to insert mock data: " + err.message });
  }
};
