//Dynamic SQL Schema Builder Service for Hertzcode Generator

//Column Type Mapping Function

export function mapColumnToSqlType(col) {
    const name = col.name ? col.name.toLowerCase() : "";
    const type = col.type ? col.type.toLowerCase() : 'text';

    //Primary key check
    if (col.isPrimaryKey || col.isPrimary || col.primaryKey || name === 'id') {
        return 'VARCHAR(50) PRIMARY KEY';
    }

    // Date /Time Fields Check
    if (name.includes('date') || name.includes('time') || name.includes('created') || name.includes('updated')) {
        return 'DATETIME NULL DEFAULT CURRENT_TIMESTAMP';
    }

    //Date Types Mapping
    switch (type) {
        case 'number':
        case 'int':
        case 'integer':
            return 'INT NULL DEFAULT 0';

        case 'decimal':
        case 'price':
        case 'amount':
            return 'DECIMAL(10,2) NULL DEFAULT 0.00';

        case 'bool':
        case 'boolean':
            return 'TINYINT(1) NULL DEFAULT 0';

        case 'longtext':
        case 'json':
            return 'LONGTEXT NULL';

        case 'text':
        case 'string':
        default:
            return 'VARCHAR(255) NULL DEFAULT NULL';
    }
}

//CREATE TABLE SQL BUILDER FUNCTION

export function buildCreateTableSql(tableName, columns){

    const columnDefs = [];
    const foreignKeys = [];

    const existingNames = new Set((columns || []).map(c => c.name ? c.name.toLowerCase() : ''));

    for (const col of columns){
        const sqlType = mapColumnToSqlType(col);

        //Ignore separate Primary key constraint if already in column definition

        if(col.isPrimaryKey || col.isPrimary || col.primaryKey || (col.name && col.name.toLowerCase() === 'id')){
            columnDefs.push(`\`${col.name}\` ${sqlType}`);
            continue;
        }

        columnDefs.push(`\`${col.name}\` ${sqlType}`);

        //Foreign Key / Lookup Reference 
        if(col.isLookupColumn && col.lookupTable){
            foreignKeys.push(
             `FOREIGN KEY (\`${col.name}\`) REFERENCES \`${col.lookupTable}\` (\`${col.lookupKey || 'id'}\`) ON DELETE SET NULL`
            );
        }
    }

    // Auto-append Global Audit & Soft Delete Columns
    if (!existingNames.has('createdby') && !existingNames.has('created_by')) {
        columnDefs.push('`createdBy` VARCHAR(255) DEFAULT NULL');
    }
    if (!existingNames.has('createdon') && !existingNames.has('created_on') && !existingNames.has('created_at')) {
        columnDefs.push('`createdOn` DATETIME DEFAULT CURRENT_TIMESTAMP');
    }
    if (!existingNames.has('modifiedon') && !existingNames.has('modified_on') && !existingNames.has('updated_at')) {
        columnDefs.push('`modifiedOn` DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP');
    }
    if (!existingNames.has('isdeleted') && !existingNames.has('is_deleted')) {
        columnDefs.push('`isDeleted` TINYINT(1) DEFAULT 0');
    }
    if (!existingNames.has('deletedon') && !existingNames.has('deleted_at')) {
        columnDefs.push('`deletedOn` DATETIME DEFAULT NULL');
    }

    const altDefinition = [...columnDefs, ...foreignKeys].join(',\n  ');

    return `CREATE TABLE IF NOT EXISTS \`${tableName}\` (\n  ${altDefinition}\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`;
}