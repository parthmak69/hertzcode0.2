import fs from "fs";
import path from "path";
import mysql from "mysql2/promise";
import { fileURLToPath } from "url";

const getDbConfig = () => ({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
});

// Helper to dynamically get the primary key column name
function getPrimaryKeyColumn(file) {
  if (!file || !Array.isArray(file.columns) || file.columns.length === 0) {
    return "id";
  }
  // Find column with primary key designation
  const pkCol = file.columns.find(
    (c) =>
      c.index === "PRIMARY KEY" ||
      c.isPrimaryKey === true ||
      c.name.toLowerCase() === "id"
  );
  return pkCol ? pkCol.name : file.columns[0].name;
}

// Generate React frontend component template
function generateReactComponent(file, apiTarget = "admin") {
  const pkField = getPrimaryKeyColumn(file);
  const apiEndpoint = apiTarget === "customer" ? `/api/apiCustomer/${file.name}` : `/api/apiAdmin/${file.name}`;
  const lookupEndpointPrefix = apiTarget === "customer" ? "/api/apiCustomer" : "/api/apiAdmin";
  const componentName = file.name.charAt(0).toUpperCase() + file.name.slice(1) + "Manager";

  // 1. Imports
  let additionalImports = '';
  if (file.columns.some(c => c.type === 'editor')) {
      additionalImports += `\nimport RichTextEditor from '@/components/ui/RichTextEditor';`;
  }
  if (file.columns.some(c => c.type === 'date' || c.type === 'datetime-local')) {
      additionalImports += `\nimport DatePicker from '@/components/ui/DatePicker';`;
  }

  const importsStr = `'use client';
import { useState, useEffect, useMemo } from 'react';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import ViewModal from '@/components/ui/ViewModal';
import DataTable from '@/components/ui/DataTable';
import { Input, Select, Textarea, Checkbox, Toggle, RadioGroup, RangeSlider } from '@/components/ui/FormFields';${additionalImports}
import { apiClient } from '@/utils/api';
import { Plus, Search, ShoppingBag, Database, LayoutList } from 'lucide-react';`;

  // 2. Dynamic Columns Map for DataTable
  const visibleColKeys = file.columns.filter(c => c.isListCol !== false).map(c => {
    const key = (c.type === 'select' && c.selectType === 'table') ? `${c.name}_label` : c.name;
    return `'${key}'`;
  });
  
  const columnsArr = file.columns.filter(c => c.isListCol !== false).map(c => {
    const key = (c.type === 'select' && c.selectType === 'table') ? `${c.name}_label` : c.name;
    return `{ key: '${key}', label: '${c.name.toUpperCase()}', sortable: true, filterable: true }`;
  }).join(',\n    ');

  const columnsStr = `  const columns = useMemo(() => [\n    ${columnsArr}\n  ], []);\n  const visibleColumns = [${visibleColKeys.join(', ')}];`;

  // 2b. View Schema for ViewModal
  const viewSchemaStr = `  const viewSchema = [\n    {\n      title: 'General Information',\n      fields: [\n        ${file.columns.map(c => {
    const key = (c.type === 'select' && c.selectType === 'table') ? `${c.name}_label` : c.name;
    return `{ key: '${key}', label: '${c.name.toUpperCase()}' }`;
  }).join(',\n        ')}\n      ]\n    }\n  ];`;

  // 3. Form Default State Generation
  const formDefaults = file.columns.map(c => {
    return `${c.name}: ${c.type === 'checkbox' ? 'false' : c.type === 'number' ? '0' : "''"}`;
  }).join(',\n    ');

  // 4. Form Field JSX Generation based on Column Type
  const formFieldsJSX = file.columns.filter(c => c.isFormCol !== false).map(c => {
    if (c.type === 'checkbox') {
        return `            <div className="col-span-1 md:col-span-2 pt-2">
                <Toggle
                  label="${c.name.toUpperCase()}"
                  checked={formValues.${c.name} === true || formValues.${c.name} === 1}
                  onChange={e => setFormValues({ ...formValues, ${c.name}: e.target.checked ? 1 : 0 })}
                />
            </div>`;
    } else if (c.type === 'textarea') {
        return `            <div className="col-span-1 md:col-span-2">
                <Textarea
                  label="${c.name.toUpperCase()}"
                  value={formValues.${c.name} || ''}
                  onChange={e => setFormValues({ ...formValues, ${c.name}: e.target.value })}
                  required={${c.isRequired ? 'true' : 'false'}}
                  rows={3}
                />
            </div>`;
    } else if (c.type === 'editor') {
        return `            <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium mb-1 text-foreground">${c.name.toUpperCase()}</label>
                <RichTextEditor
                  value={formValues.${c.name} || ''}
                  onChange={val => setFormValues({ ...formValues, ${c.name}: val })}
                />
            </div>`;
    } else if (c.type === 'date' || c.type === 'datetime-local') {
        return `            <div>
                <DatePicker
                  label="${c.name.toUpperCase()}"
                  selected={formValues.${c.name} ? new Date(formValues.${c.name}) : null}
                  onChange={date => setFormValues({ ...formValues, ${c.name}: date })}
                  showTimeSelect={${c.type === 'datetime-local' ? 'true' : 'false'}}
                />
            </div>`;
    } else if (c.type === 'range') {
        return `            <div>
                <RangeSlider
                  label="${c.name.toUpperCase()}"
                  value={formValues.${c.name} || 0}
                  onChange={e => setFormValues({ ...formValues, ${c.name}: parseInt(e.target.value) })}
                  min={0}
                  max={100}
                />
            </div>`;
    } else if (c.type === 'radio') {
        return `            <div>
                <RadioGroup
                  label="${c.name.toUpperCase()}"
                  value={formValues.${c.name} || ''}
                  onChange={e => setFormValues({ ...formValues, ${c.name}: e.target.value })}
                  options={[${(c.selectOptions || []).map(opt => `{value: '${opt}', label: '${opt}'}`).join(', ')}]}
                />
            </div>`;
    } else if (c.type === 'select') {
        if (c.selectType === 'table') {
            return `            <div>
                <Select
                  label="${c.name.toUpperCase()}"
                  value={formValues.${c.name} || ''}
                  onChange={e => setFormValues({ ...formValues, ${c.name}: e.target.value })}
                  required={${c.isRequired ? 'true' : 'false'}}
                  options={${c.name}Options.map(opt => ({ value: opt.${c.selectLookupValue || 'id'}, label: opt.${c.selectLookupLabel || 'name'} || opt.${c.selectLookupValue || 'id'} }))}
                />
            </div>`;
        } else {
            return `            <div>
                <Select
                  label="${c.name.toUpperCase()}"
                  value={formValues.${c.name} || ''}
                  onChange={e => setFormValues({ ...formValues, ${c.name}: e.target.value })}
                  required={${c.isRequired ? 'true' : 'false'}}
                  options={[${(c.selectOptions || []).map(opt => `{value: '${opt}', label: '${opt}'}`).join(', ')}]}
                />
            </div>`;
        }
    } else {
        return `            <div>
                <Input
                  label="${c.name.toUpperCase()}"
                  type="${c.type === 'number' ? 'number' : c.type === 'email' ? 'email' : 'text'}"
                  value={formValues.${c.name} || ''}
                  onChange={e => setFormValues({ ...formValues, ${c.name}: e.target.value })}
                  required={${c.isRequired ? 'true' : 'false'}}
                />
            </div>`;
    }
  }).join('\n');

  // 5. Lookup options state and fetch logic
  const lookupOptionsStates = file.columns.filter((c) => c.type === "select" && c.selectType === "table").map((c) => `  const [${c.name}Options, set${c.name}Options] = useState([]);`).join('\n');
  const lookupFetches = file.columns.filter((c) => c.type === "select" && c.selectType === "table").map((c) => `    apiClient.get('${lookupEndpointPrefix}/${c.selectLookupTable}').then(res => { if (res.success) set${c.name}Options(res.data || []); });`).join('\n');

  // 6. Return Final Assembled Template String
  return `${importsStr}

export default function ${componentName}() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Pagination State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formValues, setFormValues] = useState({
    ${formDefaults}
  });

  // Delete State
  const [deletingId, setDeletingId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // View State
  const [viewingData, setViewingData] = useState(null);

  // Toast Notification State
  const [toast, setToast] = useState({ message: '', type: '' });
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: '' }), 3000);
  };

${lookupOptionsStates}

${columnsStr}
${viewSchemaStr}

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(\`${apiEndpoint}\`);
      if (res.success) {
        // Implement frontend search & pagination for generated table data
        let data = res.data || [];
        if (searchQuery) {
            data = data.filter(item => JSON.stringify(item).toLowerCase().includes(searchQuery.toLowerCase()));
        }
        setTotalPages(Math.ceil(data.length / limit) || 1);
        setItems(data.slice((page - 1) * limit, page * limit));
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [page, limit, searchQuery]);

  useEffect(() => {
${lookupFetches}
  }, []);

  const handleAdd = () => {
    setEditingId(null);
    setFormValues({
      ${formDefaults}
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleEdit = (item) => {
    setEditingId(item.${pkField} !== undefined ? item.${pkField} : (item.id || item._id));
    setFormValues({
      ${file.columns.map((c) => `${c.name}: item.${c.name} !== undefined ? item.${c.name} : ${c.type === 'checkbox' ? 'false' : c.type === 'number' ? '0' : "''"}`).join(',\n      ')}
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    setFormError('');

    // Map empty string form inputs to null before submitting to the database
    const payload = Object.fromEntries(
      Object.entries(formValues).map(([k, v]) => [k, v === '' ? null : v])
    );

    try {
      let res;
      if (editingId) {
         res = await apiClient.put(\`${apiEndpoint}?id=\${editingId}\`, payload);
      } else {
         res = await apiClient.post(\`${apiEndpoint}\`, payload);
      }
      
      if (res.success) {
        setIsModalOpen(false);
        showToast(editingId ? 'Record updated successfully!' : 'Record added successfully!', 'success');
        fetchItems();
      } else {
        setFormError(res.error || res.message || 'Operation failed');
      }
    } catch (err) {
      setFormError(err.message || 'Error saving record');
    } finally {
      setSubmitLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    setDeleteLoading(true);
    try {
      const res = await apiClient.delete(\`${apiEndpoint}?id=\${deletingId}\`);
      if (res.success) {
        showToast('Record deleted successfully!', 'success');
        fetchItems();
      } else {
        showToast(res.error || 'Failed to delete', 'error');
      }
    } catch (err) {
      console.error('Delete error:', err);
      showToast('An error occurred during deletion', 'error');
    } finally {
      setDeleteLoading(false);
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card/60 backdrop-blur-md p-6 rounded-2xl border border-border/80 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground capitalize">Manage ${file.name}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">View, add, edit, and manage records in ${file.tableName}.</p>
        </div>
        <button
          onClick={handleAdd}
          className="w-full sm:w-auto px-4 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/95 transition cursor-pointer shadow-sm flex items-center justify-center gap-2 active:scale-95 text-sm"
        >
          <Plus className="w-4 h-4" />
          Add Record
        </button>
      </div>

      {/* Main Content Area */}
      <div className="bg-card border border-border/80 rounded-2xl shadow-sm p-6 space-y-4">
        {/* Search Bar */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-secondary/20 p-4 rounded-xl border border-border/60">
            <div className="relative w-full md:max-w-md flex-1">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground/60">
                    <Search className="w-4 h-4" />
                </span>
                <input
                    type="text"
                    placeholder="Search records..."
                    value={searchQuery}
                    onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setPage(1);
                    }}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition outline-none"
                />
            </div>
        </div>

        {/* Dynamic DataTable Component */}
        <DataTable
            columns={columns}
            data={items}
            visibleColumns={visibleColumns}
            loading={loading}
            currentPage={page}
            totalPages={totalPages}
            itemsPerPage={limit}
            onPageChange={setPage}
            onItemsPerPageChange={setLimit}
            ${file.settings.editButton !== false ? 'onEdit={handleEdit}' : ''}
            ${file.settings.deleteButton !== false ? 'onDelete={(item) => setDeletingId(item.id || item._id)}' : ''}
            onView={(item) => setViewingData(item)}
        />
      </div>

      {/* Create / Edit Form Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Edit Record' : 'Add New Record'}
      >
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {formError && (
                <div className="p-3 text-xs font-semibold rounded-xl bg-destructive/15 text-destructive border border-destructive/20">
                    {formError}
                </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
${formFieldsJSX}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
                <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium border border-border rounded-xl hover:bg-secondary cursor-pointer transition disabled:opacity-50"
                    disabled={submitLoading}
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    className="px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/95 rounded-xl cursor-pointer transition disabled:opacity-50 inline-flex items-center gap-1.5 active:scale-95"
                    disabled={submitLoading}
                >
                    {submitLoading && <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />}
                    {editingId ? 'Save Changes' : 'Create Record'}
                </button>
            </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={deletingId !== null}
        onClose={() => setDeletingId(null)}
        onConfirm={confirmDelete}
        title="Delete Record?"
        description="Are you sure you want to delete this record? This action cannot be undone."
        confirmText="Delete"
        loading={deleteLoading}
      />

      {/* View Record Modal */}
      <ViewModal 
        isOpen={!!viewingData}
        onClose={() => setViewingData(null)}
        data={viewingData}
        schema={viewSchema}
        title="${file.name.charAt(0).toUpperCase() + file.name.slice(1)} Details"
      />

      {/* Toast Notification */}
      {toast.message && (
        <div className={\`fixed bottom-6 right-6 px-4 py-3 rounded-xl text-sm font-semibold text-white shadow-xl z-50 flex items-center gap-2 animate-in slide-in-from-bottom-5 fade-in \${toast.type === 'error' ? 'bg-destructive' : 'bg-emerald-500'}\`}>
            {toast.message}
        </div>
      )}
    </div>
  );
}
`;
}

// Generate Next.js / Node API backend endpoint template
function generateApiRoute(file, project) {
  const pkField = getPrimaryKeyColumn(file);

  const lookupCols = file.columns.filter((c) => c.type === "select" && c.selectType === "table");
  let selectClause = "SELECT \\x60" + file.tableName + "\\x60.*";
  let joinClause = "";
  
  lookupCols.forEach(c => {
    const lookupTable = c.selectLookupTable;
    const lookupValue = c.selectLookupValue || "id";
    const lookupLabel = c.selectLookupLabel || "name";
    if (lookupTable) {
        selectClause += `, \\x60${lookupTable}\\x60.\\x60${lookupLabel}\\x60 AS \\x60${c.name}_label\\x60`;
        joinClause += ` LEFT JOIN \\x60${lookupTable}\\x60 ON \\x60${file.tableName}\\x60.\\x60${c.name}\\x60 = \\x60${lookupTable}\\x60.\\x60${lookupValue}\\x60`;
    }
  });
  
  const fullGetQuery = `${selectClause} FROM \\x60${file.tableName}\\x60${joinClause}`;

  return `import express from 'express';
import pool from '../../config/db.js';

const router = express.Router();

// GET all records
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('${fullGetQuery}');
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST a new record
router.post('/', async (req, res) => {
  try {
    const body = req.body;
    const keys = Object.keys(body);
    const rawValues = Object.values(body);
    // Convert empty string inputs to null for optional database columns
    const values = rawValues.map(v => v === '' ? null : v);
    
    if (keys.length === 0) {
      return res.status(400).json({ success: false, error: 'Empty payload' });
    }

    const placeholders = keys.map(() => '?').join(', ');
    const columns = keys.map(k => "\\x60" + k + "\\x60").join(', ');
    const query = "INSERT INTO \\x60" + '${file.tableName}' + "\\x60 (" + columns + ") VALUES (" + placeholders + ")";
    const [result] = await pool.execute(query, values);
    return res.json({ success: true, insertId: result.insertId });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// PUT (update) a record
router.put('/', async (req, res) => {
  try {
    const id = req.query.id;
    const body = req.body;
    
    if (!id) {
      return res.status(400).json({ success: false, error: 'Record ID is required' });
    }

    const keys = Object.keys(body);
    const rawValues = Object.values(body);
    // Convert empty string inputs to null for optional database columns
    const values = rawValues.map(v => v === '' ? null : v);

    if (keys.length === 0) {
      return res.status(400).json({ success: false, error: 'Empty payload' });
    }

    const setClause = keys.map(k => "\\x60" + k + "\\x60 = ?").join(', ');
    const query = "UPDATE \\x60" + '${file.tableName}' + "\\x60 SET " + setClause + " WHERE " + '${pkField}' + " = ?";
    const [result] = await pool.execute(query, [...values, id]);
    return res.json({ success: true, affectedRows: result.affectedRows });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE a record
router.delete('/', async (req, res) => {
  try {
    const id = req.query.id;
    
    if (!id) {
      return res.status(400).json({ success: false, error: 'Record ID is required' });
    }

    const query = "DELETE FROM \\x60" + '${file.tableName}' + "\\x60 WHERE " + '${pkField}' + " = ?";
    const [result] = await pool.execute(query, [id]);
    return res.json({ success: true, affectedRows: result.affectedRows });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
`;
}

// Generate MVC controller code for database CRUD operations
function generateControllerCode(file, apiTarget = "admin") {
  const pkField = getPrimaryKeyColumn(file);

  const lookupCols = file.columns.filter((c) => c.type === "select" && c.selectType === "table");
  let selectClause = "SELECT \\x60" + file.tableName + "\\x60.*";
  let joinClause = "";
  
  lookupCols.forEach(c => {
    const lookupTable = c.selectLookupTable;
    const lookupValue = c.selectLookupValue || "id";
    const lookupLabel = c.selectLookupLabel || "name";
    if (lookupTable) {
        selectClause += `, \\x60${lookupTable}\\x60.\\x60${lookupLabel}\\x60 AS \\x60${c.name}_label\\x60`;
        joinClause += ` LEFT JOIN \\x60${lookupTable}\\x60 ON \\x60${file.tableName}\\x60.\\x60${c.name}\\x60 = \\x60${lookupTable}\\x60.\\x60${lookupValue}\\x60`;
    }
  });
  
  const fullGetQuery = `${selectClause} FROM \\x60${file.tableName}\\x60${joinClause}`;

  return `import pool from '../../config/db.js';

// GET all records
export async function getRecords(req, res) {
  try {
    const [rows] = await pool.query('${fullGetQuery}');
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

// POST a new record
export async function createRecord(req, res) {
  try {
    const body = req.body;
    const keys = Object.keys(body);
    const rawValues = Object.values(body);
    // Convert empty string inputs to null for optional database columns
    const values = rawValues.map(v => v === '' ? null : v);
    
    if (keys.length === 0) {
      return res.status(400).json({ success: false, error: 'Empty payload' });
    }

    const placeholders = keys.map(() => '?').join(', ');
    const columns = keys.map(k => "\\x60" + k + "\\x60").join(', ');
    const query = "INSERT INTO \\x60" + '${file.tableName}' + "\\x60 (" + columns + ") VALUES (" + placeholders + ")";
    const [result] = await pool.execute(query, values);
    return res.json({ success: true, insertId: result.insertId });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

// PUT (update) a record
export async function updateRecord(req, res) {
  try {
    const id = req.query.id;
    const body = req.body;
    
    if (!id) {
      return res.status(400).json({ success: false, error: 'Record ID is required' });
    }

    const keys = Object.keys(body);
    const rawValues = Object.values(body);
    // Convert empty string inputs to null for optional database columns
    const values = rawValues.map(v => v === '' ? null : v);

    if (keys.length === 0) {
      return res.status(400).json({ success: false, error: 'Empty payload' });
    }

    const setClause = keys.map(k => "\\x60" + k + "\\x60 = ?").join(', ');
    const query = "UPDATE \\x60" + '${file.tableName}' + "\\x60 SET " + setClause + " WHERE " + '${pkField}' + " = ?";
    const [result] = await pool.execute(query, [...values, id]);
    return res.json({ success: true, affectedRows: result.affectedRows });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

// DELETE a record
export async function deleteRecord(req, res) {
  try {
    const id = req.query.id;
    
    if (!id) {
      return res.status(400).json({ success: false, error: 'Record ID is required' });
    }

    const query = "DELETE FROM \\x60" + '${file.tableName}' + "\\x60 WHERE " + '${pkField}' + " = ?";
    const [result] = await pool.execute(query, [id]);
    return res.json({ success: true, affectedRows: result.affectedRows });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
`;
}

// Generate Express Router configuration mapping paths to MVC controllers
function generateRouterCode(file, apiTarget = "admin") {
  return `import express from 'express';
import { getRecords, createRecord, updateRecord, deleteRecord } from '../../controllers/${apiTarget}/${file.name}Controller.js';

const router = express.Router();

router.get('/', getRecords);
router.post('/', createRecord);
router.put('/', updateRecord);
router.delete('/', deleteRecord);

export default router;
`;
}

// Generate CREATE TABLE SQL script model reference
function generateSqlSchema(file) {
  const cols = file.columns.map(c => {
    let mysqlType = 'VARCHAR(255)';
    if (c.type === 'number') mysqlType = 'INT';
    else if (c.type === 'checkbox') mysqlType = 'TINYINT(1) DEFAULT 0';
    else if (c.type === 'date') mysqlType = 'DATE';
    else if (c.type === 'datetime') mysqlType = 'DATETIME';
    else if (c.type === 'textarea') mysqlType = 'TEXT';
    
    let def = `  \\x60\${c.name}\\x60 \${mysqlType}`;
    if (c.isRequired) def += ' NOT NULL';
    if (c.index === 'PRIMARY KEY' || c.isPrimaryKey) def += ' PRIMARY KEY';
    if (c.isAutoIncrement) def += ' AUTO_INCREMENT';
    return def;
  }).join(',\\n');
  
  return `CREATE TABLE IF NOT EXISTS \\x60\${file.tableName}\\x60 (\\n\${cols}\\n);`;
}

// Helper to recursively copy directories
function copyDirRecursiveSync(src, dest, ignoreList = []) {
  if (ignoreList.includes(path.basename(src))) {
    return;
  }
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyDirRecursiveSync(
        path.join(src, childItemName),
        path.join(dest, childItemName),
        ignoreList
      );
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

// Helper to configure dynamic UI Theme, Header, and Auth based on project settings
function configureThemeAndAuth(targetDir, project) {
  const adminDir = path.join(targetDir, "admin-panel");
  const projectName = project.name || 'Admin Panel';
  
  // 1. Update login page
  const loginPagePath = path.join(adminDir, "app", "login", "page.jsx");
  if (fs.existsSync(loginPagePath)) {
    let content = fs.readFileSync(loginPagePath, "utf8");
    content = content.replace(/Next Admin Panel/g, `${projectName} Admin`);
    fs.writeFileSync(loginPagePath, content, "utf8");
  }

  // 2. Update Sidebar
  const sidebarPath = path.join(adminDir, "components", "layout", "Sidebar.jsx");
  if (fs.existsSync(sidebarPath)) {
    let content = fs.readFileSync(sidebarPath, "utf8");
    content = content.replace(/AdminPanel/g, `Admin Panel`);
    fs.writeFileSync(sidebarPath, content, "utf8");
  }

  // 3. Update Header
  const headerPath = path.join(adminDir, "components", "layout", "Header.jsx");
  if (fs.existsSync(headerPath)) {
    let content = fs.readFileSync(headerPath, "utf8");
    content = content.replace(/Next Admin Panel/g, projectName);
    fs.writeFileSync(headerPath, content, "utf8");
  }

  // 4. Update Theme Color
  if (project.themeColor) {
    const globalsCssPath = path.join(adminDir, "app", "globals.css");
    if (fs.existsSync(globalsCssPath)) {
      let content = fs.readFileSync(globalsCssPath, "utf8");
      content = content.replace(/--primary:\s*[^;]+;/g, `--primary: ${project.themeColor};`);
      content = content.replace(/--sidebar-primary:\s*[^;]+;/g, `--sidebar-primary: ${project.themeColor};`);
      fs.writeFileSync(globalsCssPath, content, "utf8");
    }
  }
}

// Helper to initialize boilerplate directories and files
function initializeBoilerplate(targetDir, project) {
  const realDbName = project.databaseName;

  const backendDir = path.join(targetDir, "backend");
  const configDir = path.join(backendDir, "config");
  const modelsDir = path.join(backendDir, "models");
  const controllersAdminDir = path.join(backendDir, "controllers", "admin");
  const controllersCustomerDir = path.join(backendDir, "controllers", "customer");
  const routesAdminDir = path.join(backendDir, "routes", "admin");
  const routesCustomerDir = path.join(backendDir, "routes", "customer");
  const middlewareDir = path.join(backendDir, "middleware");

  fs.mkdirSync(configDir, { recursive: true });
  fs.mkdirSync(modelsDir, { recursive: true });
  fs.mkdirSync(controllersAdminDir, { recursive: true });
  fs.mkdirSync(controllersCustomerDir, { recursive: true });
  fs.mkdirSync(routesAdminDir, { recursive: true });
  fs.mkdirSync(routesCustomerDir, { recursive: true });
  fs.mkdirSync(middlewareDir, { recursive: true });

  // 1. Write backend/config/db.js (Always Overwrite)
  const dbJsPath = path.join(configDir, "db.js");
  const dbContent = `import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: '${realDbName}',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export const dbQuery = async (sql, params = [], executingUserId = 0, actionName = 'Query') => {
    try {
        const [rows] = await pool.query(sql, params);
        return rows;
    } catch (err) {
        console.error('[DB Query Error]', err);
        throw err;
    }
};

export default pool;
`;
    fs.writeFileSync(dbJsPath, dbContent, "utf8");

  // 2. Write backend/config/common.js if not exists
  const commonJsPath = path.join(configDir, "common.js");
  if (!fs.existsSync(commonJsPath)) {
    const commonContent = `export const logQuery = (query, link, accountId) => {
  console.log(\`[AUDIT LOG] User: \${accountId} executed: "\${query}" on link: "\${link}"\`);
};

export const formatResponse = (success, data, error) => {
  return { success, data, error };
};
`;
    fs.writeFileSync(commonJsPath, commonContent, "utf8");
  }

  // 3. Write backend/package.json if not exists
  const pkgPath = path.join(backendDir, "package.json");
  if (!fs.existsSync(pkgPath)) {
    const pkgContent = `{
  "name": "ecommerce-backend",
  "version": "1.0.0",
  "type": "module",

  "scripts":{
   "start":"node server.js",
   "dev": "nodemon server.js"
  },

  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "mysql2": "^3.11.0",
    "nodemon": "^3.1.0"
  }
}
`;
    fs.writeFileSync(pkgPath, pkgContent, "utf8");
  }

  // 4. Write backend/server.js (Always Overwrite)
  const serverPath = path.join(backendDir, "server.js");

  const serverContent = `import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'url';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Dynamic MVC Routes Autoloader
async function loadMvcRoutes() {
  const targets = ['admin', 'customer'];
  
  for (const target of targets) {
    const targetDir = path.resolve(\`./routes/\${target}\`);
    if (fs.existsSync(targetDir)) {
      const files = fs.readdirSync(targetDir);
      for (const file of files) {
        if (file.endsWith('Routes.js')) {
          const tableName = file.replace('Routes.js', '');
          const routePath = path.join(targetDir, file);
          const fileUrl = pathToFileURL(routePath).href;
          const { default: router } = await import(fileUrl);
          
          // Map to correct API endpoints prefix: /apiAdmin/[tableName] or /apiCustomer/[tableName]
          const apiPrefix = target === 'admin' ? 'apiAdmin' : 'apiCustomer';
          app.use(\`/\${apiPrefix}/\${tableName}\`, router);
          console.log(\`[MVC ROUTE] /\${apiPrefix}/\${tableName} -> \${routePath}\`);
        }
      }
    }
  }

  // Load Auth Routes if they exist
  const authRoutePath = path.resolve('./routes/authRoutes.js');
  if (fs.existsSync(authRoutePath)) {
    const fileUrl = pathToFileURL(authRoutePath).href;
    const { default: authRouter } = await import(fileUrl);
    app.use('/', authRouter);
    console.log(\`[MVC ROUTE] Auth -> \${authRoutePath}\`);
  }
}

app.get('/', (req, res) => {
  res.send('Node Express MVC Backend is running');
});

async function startServer() {
  await loadMvcRoutes();
  app.listen(PORT, () => {
    console.log(\`Server running at http://localhost:\${PORT}\`);
  });
}

startServer();
`;
    fs.writeFileSync(serverPath, serverContent, "utf8");

  // Standalone Admin Panel Boilerplate Generation using Premium Template
  const adminDir = path.join(targetDir, "admin-panel");

  // Determine path to templates root dynamically relative to controller file location
  const controllerDir = path.dirname(fileURLToPath(import.meta.url));
  const templateSource = path.resolve(controllerDir, "../../templates/next-admin-template");

  // Copy template if admin-panel is empty or doesn't exist
  if (!fs.existsSync(adminDir) || fs.readdirSync(adminDir).length === 0) {
    console.log(`Copying template from ${templateSource} to ${adminDir}`);
    if (fs.existsSync(templateSource)) {
      fs.mkdirSync(adminDir, { recursive: true });
      copyDirRecursiveSync(templateSource, adminDir, ['node_modules', '.next', 'reference-modules']);
    } else {
      console.error(`Templates source directory not found at: ${templateSource}`);
    }
  }

  // Rewrite API_BASE_URL in the generated frontend to point to our Express Backend
  const adminApiJsPath = path.join(adminDir, "utils", "api.js");
  if (fs.existsSync(adminApiJsPath)) {
    let apiJsContent = fs.readFileSync(adminApiJsPath, "utf8");
    apiJsContent = apiJsContent.replace(
      /export const API_BASE_URL = '\/api'/g,
      "export const API_BASE_URL = 'http://localhost:5001/api'"
    );
    fs.writeFileSync(adminApiJsPath, apiJsContent, "utf8");
  }

  // 13. Write backend/.env if not exists (reads main editor DB details dynamically)
  const envPath = path.join(backendDir, ".env");
  if (!fs.existsSync(envPath)) {
    const envContent = `PORT=5001
DB_HOST=${process.env.DB_HOST || 'localhost'}
DB_USER=${process.env.DB_USER || 'root'}
DB_PASSWORD=${process.env.DB_PASSWORD || ''}
DB_NAME=${realDbName}
`;
    fs.writeFileSync(envPath, envContent, "utf8");
  }

  // Inject Backend Auth Module
  const backendAuthSource = path.resolve(controllerDir, "../../templates/backend-auth-module");
  if (fs.existsSync(backendAuthSource)) {
    console.log(`Injecting backend auth module from ${backendAuthSource} to ${backendDir}`);
    copyDirRecursiveSync(backendAuthSource, backendDir);
  }

  // Configure dynamic theme and auth (Phase 1)
  configureThemeAndAuth(targetDir, project);
}

// Helper to dynamically update the components/registry.js file based on active schemas
function updateRegistry(targetDir) {
  const componentsDir = path.join(targetDir, "admin-panel", "components");

  // Ensure components directory exists
  fs.mkdirSync(componentsDir, { recursive: true });

  // Scan only for existing React CRUD components (.jsx)
  const files = fs.readdirSync(componentsDir).filter(f => f.endsWith("Crud.jsx"));

  let imports = "";
  let registryEntries = "";

  files.forEach(fName => {
    const moduleName = fName.replace("Crud.jsx", "");
    const capitalized = moduleName.charAt(0).toUpperCase() + moduleName.slice(1);
    imports += `import ${capitalized}Manager from './${fName}';\n`;
    registryEntries += `  ${moduleName}: { name: "${moduleName}", label: "${capitalized}", Component: ${capitalized}Manager },\n`;
  });

  const registryCode = `// Automatically updated by Hertzcoder generator
${imports}
export const registry = {
${registryEntries}};
`;

  fs.writeFileSync(path.join(componentsDir, "registry.js"), registryCode, "utf8");
}

function configureDynamicSidebar(targetDir, project) {
  if (!project || !project.files || project.files.length === 0) return;

  const sidebarPath = path.join(targetDir, "admin-panel", "components", "layout", "Sidebar.jsx");
  if (!fs.existsSync(sidebarPath)) return;

  let sidebarCode = fs.readFileSync(sidebarPath, "utf8");

  // Find all premium files
  const premiumFiles = project.files.filter(f => f.premiumType && f.premiumType !== 'default' && !f.isDeleted);
  
  // Map ALL files to Sidebar routes, not just premium
  const allFiles = project.files || [];
  if (allFiles.length === 0) return;

  const iconMap = {
    'master-form': 'ClipboardList',
    'portfolio': 'LayoutGrid',
    'gallery': 'ImageIcon',
    'image': 'ImageIcon',
    'images': 'ImageIcon',
    'products': 'Package',
    'categories': 'List',
    'categorie': 'List',
    'category': 'List',
    'orders': 'Receipt',
    'invoices': 'FileText',
    'sales': 'TrendingUp',
    'settings': 'Settings',
    'setting': 'Settings',
    'admins': 'Shield',
    'admin': 'Shield',
    'users': 'Users',
    'user': 'Users',
    'customers': 'Users',
    'clients': 'Users',
    'posts': 'FileText',
    'blog': 'FileText',
  };

  const dynamicRoutesCode = allFiles.map(file => {
    const routeUrl = `/${file.name.toLowerCase()}`;
    const premiumKey = file.premiumType && file.premiumType !== 'default' ? file.premiumType : null;
    const nameKey = file.name.toLowerCase();
    
    const iconName = iconMap[premiumKey] || iconMap[nameKey] || 'Database';
    return `    { id: '${file.id}', name: '${file.name.replace(/_/g, " ")}', href: '${routeUrl}', icon: ${iconName} },`;
  }).join("\n");

  // Ensure all potential icons are imported from lucide-react
  const requiredIcons = ['Users', 'Image as ImageIcon', 'FileText', 'Database', 'List', 'Package', 'Receipt', 'HardDrive', 'ClipboardList', 'LayoutGrid', 'Folder', 'Settings', 'Shield'];
  const importRegex = /import\s+\{([^}]+)\}\s+from\s+['"]lucide-react['"]/;
  
  const match = sidebarCode.match(importRegex);
  if (match) {
    let existingImportsInner = match[1];
    requiredIcons.forEach(icon => {
      // Check if the icon is already imported (e.g., 'Users' or 'Image as ImageIcon')
      const baseIconName = icon.split(' as ')[0].trim();
      // Use word boundary to prevent partial matches (e.g. 'List' matching 'ClipboardList')
      const iconRegex = new RegExp('\\b' + baseIconName + '\\b');
      if (!iconRegex.test(existingImportsInner)) {
        existingImportsInner += `,\n    ${icon}`;
      }
    });
    sidebarCode = sidebarCode.replace(importRegex, `import {${existingImportsInner}\n} from 'lucide-react'`);
  }

  // Inject into Sidebar
  sidebarCode = sidebarCode.replace(
    /(\/\/\s*__DYNAMIC_ROUTES_START__\s*)[\s\S]*?(\s*\/\/\s*__DYNAMIC_ROUTES_END__)/,
    `$1\n${dynamicRoutesCode}$2`
  );

  fs.writeFileSync(sidebarPath, sidebarCode, "utf8");
}

// POST /api/crud/initialize
export const initializeProject = async (req, res) => {
  try {
    const { project } = req.body;

    if (!project) {
      return res.status(400).json({
        success: false,
        error: "Project configuration details are required.",
      });
    }

    let targetDir = project.directory;
    if (!targetDir) {
      return res.status(400).json({ success: false, error: "Project local directory path is missing." });
    }

    // Sanitize and normalize the path
    targetDir = targetDir.trim().replace(/\\/g, "/");
    targetDir = path.resolve(targetDir);

    // Validate the path doesn't contain obviously invalid segments
    const invalidChars = /[<>"|?*]/;
    if (invalidChars.test(targetDir)) {
      return res.status(400).json({ success: false, error: "Directory path contains invalid characters. Avoid < > \" | ? *" });
    }

    // Ensure the drive / root exists (Windows check)
    const parsedPath = path.parse(targetDir);
    if (parsedPath.root && !fs.existsSync(parsedPath.root)) {
      return res.status(400).json({ success: false, error: `Drive ${parsedPath.root} does not exist.` });
    }

    // Run boilerplate checks and initializations
    initializeBoilerplate(targetDir, project);

    return res.status(200).json({
      success: true,
      message: "Project initialized successfully",
      targetDir
    });
  } catch (error) {
    console.error("Initialization error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "An error occurred during project initialization.",
    });
  }
};

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

    let targetDir = project.directory;
    if (!targetDir) {
      return res.status(400).json({ success: false, error: "Project local directory path is missing." });
    }

    // Sanitize and normalize the path
    targetDir = targetDir.trim().replace(/\\/g, "/"); // normalize to forward slashes
    targetDir = path.resolve(targetDir); // resolve to absolute path

    // Validate the path doesn't contain obviously invalid segments
    const invalidChars = /[<>"|?*]/;
    if (invalidChars.test(targetDir)) {
      return res.status(400).json({ success: false, error: "Directory path contains invalid characters. Avoid < > \" | ? *" });
    }

    // Ensure the drive / root exists (Windows check)
    const parsedPath = path.parse(targetDir);
    if (parsedPath.root && !fs.existsSync(parsedPath.root)) {
      return res.status(400).json({ success: false, error: `Drive ${parsedPath.root} does not exist.` });
    }

    // Run boilerplate checks and initializations
    initializeBoilerplate(targetDir, project);

    const apiTarget = file.settings?.apiTarget || "admin";
    const generatedPaths = {};

    // 1. Always write the JSON schema config to admin-panel/schemas so Hertzcoder can load it
    const adminSchemaDir = path.join(targetDir, "admin-panel", "schemas");
    fs.mkdirSync(adminSchemaDir, { recursive: true });
    const schemaFilePath = path.join(adminSchemaDir, `${file.name}.json`);
    fs.writeFileSync(schemaFilePath, JSON.stringify(file, null, 2), "utf8");
    generatedPaths.schema = schemaFilePath;

    // 2. Generate Admin UI and Admin Backend API (Express MVC style)
    if (apiTarget === "admin" || apiTarget === "both") {
      const adminComponentsDir = path.join(targetDir, "admin-panel", "components");
      const adminControllerDir = path.join(targetDir, "backend", "controllers", "admin");
      const adminRouteDir = path.join(targetDir, "backend", "routes", "admin");
      const modelsDir = path.join(targetDir, "backend", "models");

      fs.mkdirSync(adminComponentsDir, { recursive: true });
      fs.mkdirSync(adminControllerDir, { recursive: true });
      fs.mkdirSync(adminRouteDir, { recursive: true });
      fs.mkdirSync(modelsDir, { recursive: true });

      // Check if reference module exists for this table
      const controllerDir = path.dirname(fileURLToPath(import.meta.url));
      const refModulePath = path.resolve(controllerDir, `../../templates/next-admin-template/reference-modules/${file.name}`);
      const targetAppModulePath = path.join(targetDir, "admin-panel", "app", file.name);

      if (fs.existsSync(refModulePath)) {
        console.log(`Injecting premium reference module for ${file.name}`);
        fs.mkdirSync(targetAppModulePath, { recursive: true });
        copyDirRecursiveSync(refModulePath, targetAppModulePath);
        
        // Generate a redirect wrapper component so it registers in registry.js and the sidebar can route to it
        const redirectCode = `
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ${file.name.charAt(0).toUpperCase() + file.name.slice(1)}Redirect() {
  const router = useRouter();
  useEffect(() => { router.push('/${file.name}'); }, []);
  return <div className="p-10 flex justify-center items-center h-full"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
}
`;
        const componentFilePath = path.join(adminComponentsDir, `${file.name}Crud.jsx`);
        fs.writeFileSync(componentFilePath, redirectCode, "utf8");
        generatedPaths.uiAdmin = componentFilePath;
      } else {
        // Write standard generic UI component (.jsx)
        const componentCode = generateReactComponent(file, "admin");
        const componentFilePath = path.join(adminComponentsDir, `${file.name}Crud.jsx`);
        fs.writeFileSync(componentFilePath, componentCode, "utf8");
        generatedPaths.uiAdmin = componentFilePath;

        // Generate the Next.js page wrapper for the standard component
        const pageCode = `import ${file.name.charAt(0).toUpperCase() + file.name.slice(1)}Crud from '@/components/${file.name}Crud';

export default function ${file.name.charAt(0).toUpperCase() + file.name.slice(1)}Page() {
    return <${file.name.charAt(0).toUpperCase() + file.name.slice(1)}Crud />;
}`;
        
        const layoutCode = `import AppLayout from '@/components/layout/AppLayout';

export default function ${file.name.charAt(0).toUpperCase() + file.name.slice(1)}Layout({ children }) {
    return <AppLayout>{children}</AppLayout>;
}`;

        const targetAppModulePath = path.join(targetDir, "admin-panel", "app", file.name.toLowerCase());
        if (!fs.existsSync(targetAppModulePath)) {
            fs.mkdirSync(targetAppModulePath, { recursive: true });
        }
        fs.writeFileSync(path.join(targetAppModulePath, "page.jsx"), pageCode, "utf8");
        fs.writeFileSync(path.join(targetAppModulePath, "layout.jsx"), layoutCode, "utf8");
      }

      // Write Controller (.js)
      const controllerCode = generateControllerCode(file, "admin");
      const controllerFilePath = path.join(adminControllerDir, `${file.name}Controller.js`);
      fs.writeFileSync(controllerFilePath, controllerCode, "utf8");
      generatedPaths.controllerAdmin = controllerFilePath;

      // Write Route (.js)
      const routeCode = generateRouterCode(file, "admin");
      const routeFilePath = path.join(adminRouteDir, `${file.name}Routes.js`);
      fs.writeFileSync(routeFilePath, routeCode, "utf8");
      generatedPaths.routeAdmin = routeFilePath;

      // Write SQL Model schema reference (.sql)
      const sqlCode = generateSqlSchema(file);
      const sqlFilePath = path.join(modelsDir, `${file.name}.sql`);
      fs.writeFileSync(sqlFilePath, sqlCode, "utf8");
      generatedPaths.modelSql = sqlFilePath;
    }

    // 3. Generate Customer/Website Backend API (Express MVC style, Only routes & controllers, no UI files)
    if (apiTarget === "customer" || apiTarget === "both") {
      const customerControllerDir = path.join(targetDir, "backend", "controllers", "customer");
      const customerRouteDir = path.join(targetDir, "backend", "routes", "customer");
      const modelsDir = path.join(targetDir, "backend", "models");

      fs.mkdirSync(customerControllerDir, { recursive: true });
      fs.mkdirSync(customerRouteDir, { recursive: true });
      fs.mkdirSync(modelsDir, { recursive: true });

      // Write Controller (.js)
      const controllerCode = generateControllerCode(file, "customer");
      const controllerFilePath = path.join(customerControllerDir, `${file.name}Controller.js`);
      fs.writeFileSync(controllerFilePath, controllerCode, "utf8");
      generatedPaths.controllerCustomer = controllerFilePath;

      // Write Route (.js)
      const routeCode = generateRouterCode(file, "customer");
      const routeFilePath = path.join(customerRouteDir, `${file.name}Routes.js`);
      fs.writeFileSync(routeFilePath, routeCode, "utf8");
      generatedPaths.routeCustomer = routeFilePath;

      // Write SQL Model schema reference (.sql)
      const sqlCode = generateSqlSchema(file);
      const sqlFilePath = path.join(modelsDir, `${file.name}.sql`);
      fs.writeFileSync(sqlFilePath, sqlCode, "utf8");
      generatedPaths.modelSql = sqlFilePath;
    }

    // Update the dynamic sidebar component registry
    updateRegistry(targetDir);

    // Configure the dynamic sidebar routes based on premium templates mapping
    configureDynamicSidebar(targetDir, project);

    return res.json({
      success: true,
      message: `Generated files successfully at ${targetDir} for target ${apiTarget}`,
      paths: generatedPaths,
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

    const schemas = [];
    const searchDirs = [
      path.join(directory, "admin-panel", "schemas"),
      path.join(directory, "website", "schemas"),
      path.join(directory, "schemas"), // Compatibility fallback for old monolithic layouts
    ];

    for (const schemasDir of searchDirs) {
      if (fs.existsSync(schemasDir)) {
        const files = fs.readdirSync(schemasDir);
        const jsonFiles = files.filter(f => f.endsWith(".json"));
        for (const fName of jsonFiles) {
          try {
            const filePath = path.join(schemasDir, fName);
            const fileContent = fs.readFileSync(filePath, "utf8");
            const parsedSchema = JSON.parse(fileContent);
            
            // Prevent duplicate schemas from being pushed if they somehow overlap
            if (!schemas.some((s) => s.name === parsedSchema.name)) {
              schemas.push(parsedSchema);
            }
          } catch (err) {
            console.error(`Failed to parse schema file ${fName}:`, err);
          }
        }
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

// GET /api/crud/projects
export const getProjects = async (req, res) => {
  let connection;
  try {
    const { user, role } = req.query;
    if (!user) {
      return res.status(400).json({ success: false, error: "Username is required." });
    }

    const dbName = process.env.DB_NAME || "admin";
    connection = await mysql.createConnection({
      ...getDbConfig(),
      database: dbName,
    });

    // Auto-create hertz_projects table if it does not exist yet (handles pre-authenticated page loads)
    await connection.execute(`
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
      )
    `);

    let query = "SELECT * FROM `hertz_projects` WHERE `isDeleted` = 0";
    const queryParams = [];

    if (role !== "admin") {
      query += " AND `owner` = ?";
      queryParams.push(user);
    }

    const [rows] = await connection.execute(query, queryParams);

    const projects = rows.map(r => ({
      ...r,
      isDeleted: r.isDeleted === 1,
      files: r.files ? JSON.parse(r.files) : []
    }));

    return res.json({ success: true, projects });
  } catch (err) {
    console.error("Failed to load projects from DB:", err);
    return res.status(500).json({ success: false, error: "Failed to load projects: " + err.message });
  } finally {
    if (connection) await connection.end();
  }
};

// POST /api/crud/projects
export const saveProjects = async (req, res) => {
  let connection;
  try {
    const { projects } = req.body;
    if (!Array.isArray(projects)) {
      return res.status(400).json({ success: false, error: "Projects array is required." });
    }

    const dbName = process.env.DB_NAME || "admin";
    connection = await mysql.createConnection({
      ...getDbConfig(),
      database: dbName,
    });

    // Auto-create hertz_projects table if it does not exist yet (handles pre-authenticated page loads)
    await connection.execute(`
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
      )
    `);

    for (const project of projects) {
      const filesStr = JSON.stringify(project.files || []);
      const isDeletedVal = project.isDeleted ? 1 : 0;
      const deletedAtVal = project.deletedAt || null;

      const query = `
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

      await connection.execute(query, [
        project.id,
        project.name,
        project.directory,
        project.databaseName || '',
        project.connectFolder || 'lib',
        project.owner,
        filesStr,
        isDeletedVal,
        deletedAtVal
      ]);
    }

    return res.json({ success: true, message: "Projects saved successfully." });
  } catch (err) {
    console.error("Failed to save projects to DB:", err);
    return res.status(500).json({ success: false, error: "Failed to save projects: " + err.message });
  } finally {
    if (connection) await connection.end();
  }
};

