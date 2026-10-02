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
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;
  await dbQuery(sql, [], 0, 'EnsureHertzProjectsTable');
}

/**
 * Fetch all active projects for a given user & role
 */
export async function fetchProjects(user, role) {
  await ensureProjectsTable();
  let sql = "SELECT * FROM `hertz_projects` WHERE `isDeleted` = 0";
  const params = [];

  if (role !== "admin") {
    sql += " AND `owner` = ?";
    params.push(user);
  }

  const rows = await dbQuery(sql, params, 0, 'FetchProjects');
  return rows.map(r => ({
    ...r,
    isDeleted: r.isDeleted === 1,
    files: r.files ? JSON.parse(r.files) : []
  }));
}

/**
 * Save or Update projects array in MySQL
 */
export async function saveProjectsList(projects) {
  await ensureProjectsTable();
  for (const project of projects) {
    const filesStr = JSON.stringify(project.files || []);
    const isDeletedVal = project.isDeleted ? 1 : 0;
    const deletedAtVal = project.deletedAt || null;

    const sql = `
      INSERT INTO \`hertz_projects\` 
        (\`id\`, \`name\`, \`directory\`, \`databaseName\`, \`connectFolder\`, \`owner\`, \`files\`, \`isDeleted\`, \`deletedAt\`)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        \`name\` = VALUES(\`name\`),
        \`directory\` = VALUES(\`directory\`),
        \`databaseName\` = VALUES(\`databaseName\`),
        \`connectFolder\` = VALUES(\`connectFolder\`),
        \`files\` = VALUES(\`files\`),
        \`isDeleted\` = VALUES(\`isDeleted\`),
        \`deletedAt\` = VALUES(\`deletedAt\`)
    `;

    const params = [
      project.id,
      project.name,
      project.directory,
      project.databaseName || '',
      project.connectFolder || 'lib',
      project.owner || 'admin',
      filesStr,
      isDeletedVal,
      deletedAtVal
    ];

    await dbQuery(sql, params, 0, 'SaveProject');
  }
}
