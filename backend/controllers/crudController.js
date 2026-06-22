import fs from "fs";
import path from "path";

// Generate React frontend component template
function generateReactComponent(file) {
  return `'use client';

import React, { useState, useEffect } from 'react';

// Automatically generated CRUD Interface by Hertzcoder
export default function ${file.name.charAt(0).toUpperCase() + file.name.slice(1)}Manager() {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState<any>({
    ${file.columns.map((c) => `${c.name}: ${c.type === 'checkbox' ? 'false' : c.type === 'number' ? '0' : '\'\''}`).join(',\n    ')}
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchItems = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(\`/api/${file.name}\`);
      const data = await res.json();
      if (data.success) {
        setItems(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching records:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingId ? \`/api/${file.name}?id=\${editingId}\` : \`/api/${file.name}\`;
    const method = editingId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.success) {
        alert(editingId ? 'Record updated!' : 'Record added!');
        setForm({
          ${file.columns.map((c) => `${c.name}: ${c.type === 'checkbox' ? 'false' : c.type === 'number' ? '0' : '\'\''}`).join(',\n          ')}
        });
        setEditingId(null);
        fetchItems();
      } else {
        alert('Operation failed: ' + data.error);
      }
    } catch (err: any) {
      alert('Error saving record: ' + err.message);
    }
  };

  const handleEdit = (item: any) => {
    setEditingId(item.id || item._id);
    setForm({
      ${file.columns.map((c) => `${c.name}: item.${c.name} !== undefined ? item.${c.name} : ${c.type === 'checkbox' ? 'false' : c.type === 'number' ? '0' : '\'\''}`).join(',\n      ')}
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this record?')) return;
    try {
      const res = await fetch(\`/api/${file.name}?id=\${id}\`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchItems();
      } else {
        alert('Failed to delete: ' + data.error);
      }
    } catch (err: any) {
      alert('Error deleting: ' + err.message);
    }
  };

  return (
    <div style={{ padding: '24px', fontFamily: 'system-ui, sans-serif', color: '#1e293b' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>
        Manage ${file.name.charAt(0).toUpperCase() + file.name.slice(1)} (${file.tableName})
      </h2>
      
      {/* Form Card */}
      <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px', marginBottom: '24px' }}>
        <h3 style={{ fontWeight: 'bold', marginBottom: '16px' }}>
          {editingId ? 'Edit Record' : 'Add New Record'}
        </h3>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          ${file.columns.filter((c) => c.isFormCol !== false).map((c) => {
            if (c.type === 'checkbox') {
              return `
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', gridColumn: 'span 2', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={form.${c.name}} 
              onChange={e => setForm({ ...form, ${c.name}: e.target.checked })} 
            />
            <span style={{ fontSize: '14px', fontWeight: 'bold' }}>${c.name}</span>
          </label>`;
            } else if (c.type === 'textarea') {
              return `
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: 'span 2' }}>
            <label style={{ fontSize: '13px', fontWeight: 'bold' }}>${c.name}</label>
            <textarea 
              style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', outline: 'none' }}
              value={form.${c.name}} 
              onChange={e => setForm({ ...form, ${c.name}: e.target.value })}
              required={${c.isRequired}}
            />
          </div>`;
            } else {
              return `
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 'bold' }}>${c.name}</label>
            <input 
              type="${c.type === 'number' ? 'number' : c.type === 'email' ? 'email' : c.type === 'date' ? 'date' : 'text'}"
              style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', outline: 'none' }}
              value={form.${c.name}} 
              onChange={e => setForm({ ...form, ${c.name}: e.target.value })}
              required={${c.isRequired}}
            />
          </div>`;
            }
          }).join('')}
          
          <div style={{ gridColumn: 'span 2', display: 'flex', gap: '10px', marginTop: '8px' }}>
            <button type="submit" style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
              {editingId ? 'Update Record' : 'Save Record'}
            </button>
            {editingId && (
              <button type="button" onClick={() => { setEditingId(null); setForm({ ${file.columns.map((c) => `${c.name}: ${c.type === 'checkbox' ? 'false' : c.type === 'number' ? '0' : '\'\''}`).join(', ')} }); }} style={{ backgroundColor: '#64748b', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Table Data list */}
      <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #e2e8f0' }}>
              ${file.columns.filter((c) => c.isListCol !== false).map((c) => `
              <th style={{ padding: '12px 16px', fontWeight: 'bold' }}>${c.name}</th>`).join('')}
              <th style={{ padding: '12px 16px', fontWeight: 'bold' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={${file.columns.filter((c) => c.isListCol !== false).length + 1}} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                  {isLoading ? 'Loading records...' : 'No records found.'}
                </td>
              </tr>
            ) : (
              items.map((item, idx) => (
                <tr key={item.id || item._id || idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  ${file.columns.filter((c) => c.isListCol !== false).map((c) => `
                  <td style={{ padding: '12px 16px' }}>{String(item.${c.name} !== undefined ? item.${c.name} : '')}</td>`).join('')}
                  <td style={{ padding: '12px 16px', display: 'flex', gap: '10px' }}>
                    ${file.settings.editButton ? `
                    <button onClick={() => handleEdit(item)} style={{ color: '#d97706', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold', padding: 0 }}>
                      Edit
                    </button>` : ''}
                    ${file.settings.deleteButton ? `
                    <button onClick={() => handleDelete(item.id || item._id)} style={{ color: '#dc2626', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold', padding: 0 }}>
                      Delete
                    </button>` : ''}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}';`;
}

// Generate Next.js / Node API backend endpoint template
function generateApiRoute(file, project) {
  const isMongo = project.databaseName.toLowerCase().startsWith("mongodb:");
  const realDbName = isMongo ? project.databaseName.replace("mongodb:", "") : project.databaseName;

  if (isMongo) {
    return `import { NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';

const uri = process.env.MONGO_URI || 'mongodb://localhost:27017';
const dbName = '${realDbName}';
const colName = '${file.tableName}';

export async function GET(request: Request) {
  try {
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db(dbName);
    const records = await db.collection(colName).find({}).toArray();
    await client.close();
    return NextResponse.json({ success: true, data: records });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db(dbName);
    const result = await db.collection(colName).insertOne(body);
    await client.close();
    return NextResponse.json({ success: true, insertedId: result.insertedId });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const body = await request.json();
    
    if (!id) {
      return NextResponse.json({ success: false, error: 'Record ID is required' }, { status: 400 });
    }

    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db(dbName);
    
    const { _id, ...updateData } = body;

    const result = await db.collection(colName).updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );
    await client.close();
    return NextResponse.json({ success: true, modifiedCount: result.modifiedCount });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ success: false, error: 'Record ID is required' }, { status: 400 });
    }

    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db(dbName);
    const result = await db.collection(colName).deleteOne({ _id: new ObjectId(id) });
    await client.close();
    return NextResponse.json({ success: true, deletedCount: result.deletedCount });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
`;
  } else {
    return `import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: '${realDbName}'
};

export async function GET(request: Request) {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.query('SELECT * FROM \\\`${file.tableName}\\\`');
    await connection.end();
    return NextResponse.json({ success: true, data: rows });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const keys = Object.keys(body);
    const values = Object.values(body);
    
    if (keys.length === 0) {
      return NextResponse.json({ success: false, error: 'Empty payload' }, { status: 400 });
    }

    const connection = await mysql.createConnection(dbConfig);
    const placeholders = keys.map(() => '?').join(', ');
    const query = \\\`INSERT INTO \\\\\\\`\${'${file.tableName}'}\\\\\\\` (\\\${keys.map(k => \\\\\\\`\\\\\\\`\\\\\\\`\\\${k}\\\\\\\`\\\\\\\`\\\\\\\`).join(', ')}) VALUES (\\\${placeholders})\\\`;
    const [result]: any = await connection.execute(query, values);
    await connection.end();
    return NextResponse.json({ success: true, insertId: result.insertId });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const body = await request.json();
    
    if (!id) {
      return NextResponse.json({ success: false, error: 'Record ID is required' }, { status: 400 });
    }

    const keys = Object.keys(body);
    const values = Object.values(body);

    if (keys.length === 0) {
      return NextResponse.json({ success: false, error: 'Empty payload' }, { status: 400 });
    }

    const connection = await mysql.createConnection(dbConfig);
    const setClause = keys.map(k => \\\\\\\`\\\\\\\`\\\\\\\`\\\${k}\\\\\\\`\\\\\\\`\\\\\\\` = ?\\\`).join(', ');
    const query = \\\`UPDATE \\\\\\\`\${'${file.tableName}'}\\\\\\\` SET \\\${setClause} WHERE id = ?\\\`;
    const [result]: any = await connection.execute(query, [...values, id]);
    await connection.end();
    return NextResponse.json({ success: true, affectedRows: result.affectedRows });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ success: false, error: 'Record ID is required' }, { status: 400 });
    }

    const connection = await mysql.createConnection(dbConfig);
    const query = \\\`DELETE FROM \\\\\\\`\${'${file.tableName}'}\\\\\\\` WHERE id = ?\\\`;
    const [result]: any = await connection.execute(query, [id]);
    await connection.end();
    return NextResponse.json({ success: true, affectedRows: result.affectedRows });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
`;
  }
}

// POST /api/crud/generate
export const generateFiles = async (req, res) => {
  try {
    const { project, file } = req.body;

    if (!project || !file) {
      return res.status(400).json({
        success: false,
        error: "Project and File configuration details are required.",
      });
    }

    const targetDir = project.directory;
    if (!targetDir) {
      return res.status(400).json({ success: false, error: "Project local directory path is missing." });
    }

    const schemaDir = path.join(targetDir, "schemas");
    const componentsDir = path.join(targetDir, "components");
    const apiDir = path.join(targetDir, "pages", "api", file.name);

    // Create paths recursively
    fs.mkdirSync(schemaDir, { recursive: true });
    fs.mkdirSync(componentsDir, { recursive: true });
    fs.mkdirSync(apiDir, { recursive: true });

    // 1. Write the metadata JSON
    const schemaFilePath = path.join(schemaDir, `${file.name}.json`);
    fs.writeFileSync(schemaFilePath, JSON.stringify(file, null, 2), "utf8");

    // 2. Write UI code component
    const componentCode = generateReactComponent(file);
    const componentFilePath = path.join(componentsDir, `${file.name}Crud.tsx`);
    fs.writeFileSync(componentFilePath, componentCode, "utf8");

    // 3. Write API route code
    const apiCode = generateApiRoute(file, project);
    const apiFilePath = path.join(apiDir, "route.ts");
    fs.writeFileSync(apiFilePath, apiCode, "utf8");

    return res.json({
      success: true,
      message: `Generated JSON configuration and files successfully at ${targetDir}`,
      paths: {
        json: schemaFilePath,
        ui: componentFilePath,
        api: apiFilePath,
      },
    });
  } catch (err) {
    console.error("Failed to generate CRUD assets:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to write files to disk: " + err.message,
    });
  }
};

// GET /api/crud/schemas
export const getSchemas = async (req, res) => {
  try {
    const { directory } = req.query;

    if (!directory) {
      return res.status(400).json({ success: false, error: "Project local directory path is required." });
    }

    const schemasDir = path.join(directory, "schemas");
    if (!fs.existsSync(schemasDir)) {
      return res.json({ success: true, schemas: [] });
    }

    const files = fs.readdirSync(schemasDir);
    const jsonFiles = files.filter(f => f.endsWith(".json"));

    const schemas = [];
    for (const fName of jsonFiles) {
      try {
        const filePath = path.join(schemasDir, fName);
        const fileContent = fs.readFileSync(filePath, "utf8");
        const parsedSchema = JSON.parse(fileContent);
        schemas.push(parsedSchema);
      } catch (err) {
        console.error(`Failed to parse schema file ${fName}:`, err);
      }
    }

    return res.json({ success: true, schemas });
  } catch (err) {
    console.error("Failed to load schemas from disk:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to read schemas from disk: " + err.message,
    });
  }
};
