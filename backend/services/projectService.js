import { dbQuery } from '../config/db.js';


export async function ensureProjectsTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS \`hertz_projects\` (
      \`id\` VARCHAR(50) PRIMARY KEY,
      \`name\` VARCHAR(100) NOT NULL,
      \`directory\` VARCHAR(255) NOT NULL,
      \`databaseName\` VARCHAR(100) DEFAULT '',
      \`connectFolder\` VARCHAR(50) DEFAULT 'lib',
      \`owner\` VARCHAR(100) NOT NULL,
      \`files\` LONGTEXT DEFAULT NULL,
      \`isDeleted\` TINYINT(1) DEFAULT 0,
      \`deletedAt\` BIGINT DEFAULT NULL,
      \`themeColor\` VARCHAR(50) DEFAULT '#008080',
      \`settings\` LONGTEXT DEFAULT NULL,
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;
  const metaDb = process.env.DB_NAME || 'admin';
  await dbQuery(sql, [], 0, 'EnsureHertzProjectsTable', metaDb);

  try {
    await dbQuery("ALTER TABLE `hertz_projects` ADD COLUMN `themeColor` VARCHAR(50) DEFAULT '#008080'", [], 0, 'AddThemeColorCol', metaDb);
  } catch (e) {}

  try {
    await dbQuery("ALTER TABLE `hertz_projects` ADD COLUMN `settings` LONGTEXT DEFAULT NULL", [], 0, 'AddSettingsCol', metaDb);
  } catch (e) {}
}

/**
 * Fetch all active projects for a given user & role
 */
export async function fetchProjects(user, role, includeDeleted = true) {
  await ensureProjectsTable();
  let sql = "SELECT * FROM `hertz_projects`";
  const params = [];
  const conditions = [];

  if (!includeDeleted) {
    conditions.push("`isDeleted` = 0");
  }

  if (role !== "admin" && user) {
    conditions.push("`owner` = ?");
    params.push(user);
  }

  if (conditions.length > 0) {
    sql += " WHERE " + conditions.join(" AND ");
  }

  sql += " ORDER BY `created_at` DESC";

  const metaDb = process.env.DB_NAME || 'admin';
  const rows = await dbQuery(sql, params, 0, 'FetchProjects', metaDb);
  return rows.map(r => ({
    ...r,
    themeColor: r.themeColor || '#008080',
    settings: r.settings ? (typeof r.settings === 'string' ? JSON.parse(r.settings) : r.settings) : {},
    isDeleted: r.isDeleted === 1,
    files: r.files ? (typeof r.files === 'string' ? JSON.parse(r.files) : r.files) : []
  }));
}

/**
 * Save or Update projects array in MySQL
 */
export async function saveProjectsList(projects, user, role) {
  await ensureProjectsTable();
  const metaDb = process.env.DB_NAME || 'admin';

  for (const project of projects) {
    const filesStr = JSON.stringify(project.files || []);
    const settingsStr = JSON.stringify(project.settings || {});
    const isDeletedVal = project.isDeleted ? 1 : 0;
    const deletedAtVal = project.deletedAt || null;
    const themeColorVal = project.themeColor || '#008080';

    const sql = `
      INSERT INTO \`hertz_projects\` 
        (\`id\`, \`name\`, \`directory\`, \`databaseName\`, \`connectFolder\`, \`owner\`, \`files\`, \`isDeleted\`, \`deletedAt\`, \`themeColor\`, \`settings\`)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        \`name\` = VALUES(\`name\`),
        \`directory\` = VALUES(\`directory\`),
        \`databaseName\` = VALUES(\`databaseName\`),
        \`connectFolder\` = VALUES(\`connectFolder\`),
        \`owner\` = VALUES(\`owner\`),
        \`files\` = VALUES(\`files\`),
        \`isDeleted\` = VALUES(\`isDeleted\`),
        \`deletedAt\` = VALUES(\`deletedAt\`),
        \`themeColor\` = VALUES(\`themeColor\`),
        \`settings\` = VALUES(\`settings\`)
    `;

    const params = [
      project.id,
      project.name,
      project.directory,
      project.databaseName || '',
      project.connectFolder || 'lib',
      project.owner || user || 'admin',
      filesStr,
      isDeletedVal,
      deletedAtVal,
      themeColorVal,
      settingsStr
    ];

    await dbQuery(sql, params, 0, 'SaveProject', metaDb);
  }

  // If projects array was provided, permanently remove projects that were explicitly purged
  if (Array.isArray(projects)) {
    const activeIds = projects.map(p => p.id).filter(Boolean);
    if (activeIds.length > 0) {
      const placeholders = activeIds.map(() => '?').join(',');
      let deleteSql = `DELETE FROM \`hertz_projects\` WHERE \`id\` NOT IN (${placeholders})`;
      const deleteParams = [...activeIds];
      if (role !== 'admin' && user) {
        deleteSql += ' AND `owner` = ?';
        deleteParams.push(user);
      }
      await dbQuery(deleteSql, deleteParams, 0, 'CleanupPurgedProjects', metaDb);
    } else {
      // All projects were permanently purged
      let deleteSql = `DELETE FROM \`hertz_projects\``;
      const deleteParams = [];
      if (role !== 'admin' && user) {
        deleteSql += ' WHERE `owner` = ?';
        deleteParams.push(user);
      }
      await dbQuery(deleteSql, deleteParams, 0, 'CleanupAllPurgedProjects', metaDb);
    }
  }
}
  