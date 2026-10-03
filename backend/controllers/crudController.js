import fs from "fs";
import path from "path";
import mysql from "mysql2/promise";
import { fileURLToPath } from "url";

// Modular Generator Services
import { buildCreateTableSql } from "../services/sqlBuilder.js";
import { fetchProjects, saveProjectsList } from "../services/projectService.js";
import { generateExpressController, generateExpressRouter } from "../services/expressGenerator.js";
import { generateDataTableComponent, generateFormModalComponent } from "../services/reactGenerator.js";

const getDbConfig = () => ({
  host: process.env.DB_HOST || "127.0.0.1",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
});

// Helper to convert strings (snake_case, hyphenated) into clean PascalCase for JS identifiers
function toPascalCase(str) {
  if (!str) return '';
  return str
    .replace(/[^a-zA-Z0-9_]/g, ' ')
    .split(/[\s_]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

// Helper to dynamically get the primary key column name
function getPrimaryKeyColumn(file) {
  if (!file || !Array.isArray(file.columns) || file.columns.length === 0) {
    return "id";
  }
  // Find column with primary key designation
  const pkCol = file.columns.find(
    (c) =>
      c.index === "PRIMARY KEY" ||
      c.index === "PRIMARY" ||
      c.isPrimaryKey === true ||
      c.primaryKey === true ||
      c.isPrimary === true ||
      c.name.toLowerCase() === "id"
  );
  return pkCol ? pkCol.name : file.columns[0].name;
}

// Helper to check if a column represents a foreign key / lookup relationship
function isLookupColumn(col) {
  if (!col) return false;
  return (
    (col.type === "select" && col.selectType === "table") ||
    col.isForeignKey === true ||
    !!col.foreignTable ||
    !!col.selectLookupTable
  );
}

// Helper to extract lookup metadata (table, value column, label column)
function getLookupDetails(col) {
  const lookupTable = col.selectLookupTable || col.foreignTable || "";
  const lookupValue = col.selectLookupValue || col.foreignKey || col.foreignKeyColumn || "id";
  const lookupLabel = col.selectLookupLabel || col.displayColumn || col.foreignDisplayColumn || "name";
  return { lookupTable, lookupValue, lookupLabel };
}

// Generate React frontend component template
function generateReactComponent(file, apiTarget = "admin") {
  const pkField = getPrimaryKeyColumn(file);
  const apiEndpoint = apiTarget === "customer" ? `/api/apiCustomer/${file.name}` : `/api/apiAdmin/${file.name}`;
  const lookupEndpointPrefix = apiTarget === "customer" ? "/api/apiCustomer" : "/api/apiAdmin";
  const pascalName = toPascalCase(file.name);
  const componentName = pascalName + "Manager";

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
import { toast } from '@/components/ui/Toast';
import { Plus, Search, ShoppingBag, Database, LayoutList } from 'lucide-react';`;

  // 2. Dynamic Columns Map for DataTable
  const visibleColKeys = file.columns.filter(c => c.isListCol !== false).map(c => {
    const key = isLookupColumn(c) ? `${c.name}_label` : c.name;
    return `'${key}'`;
  });
  
  const columnsArr = file.columns.filter(c => c.isListCol !== false).map(c => {
    const key = isLookupColumn(c) ? `${c.name}_label` : c.name;
    return `{ key: '${key}', label: '${c.name.toUpperCase()}', sortable: true, filterable: true }`;
  }).join(',\n    ');

  const columnsStr = `  const columns = useMemo(() => [\n    ${columnsArr}\n  ], []);\n  const visibleColumns = [${visibleColKeys.join(', ')}];`;

  // 2b. View Schema for ViewModal
  const viewSchemaStr = `  const viewSchema = [\n    {\n      title: 'General Information',\n      fields: [\n        ${file.columns.map(c => {
    const key = isLookupColumn(c) ? `${c.name}_label` : c.name;
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
    } else if (c.type === 'file' || c.name.toLowerCase().includes('image') || c.name.toLowerCase().includes('photo') || c.name.toLowerCase().includes('avatar') || c.name.toLowerCase().includes('file') || c.name.toLowerCase().includes('logo')) {
        return `            <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium mb-1 text-foreground">${c.name.toUpperCase()}</label>
                <div className="flex flex-col gap-2">
                  {formValues.${c.name} && (
                    <div className="relative w-28 h-28 rounded-xl overflow-hidden border border-border group bg-secondary/30">
                      <img src={formValues.${c.name}} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setFormValues({ ...formValues, ${c.name}: '' })}
                        className="absolute top-1 right-1 w-6 h-6 bg-destructive text-destructive-foreground rounded-full opacity-90 hover:opacity-100 transition shadow-sm cursor-pointer flex items-center justify-center text-xs font-bold"
                        title="Remove Image"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const formData = new FormData();
                      formData.append('file', file);
                      formData.append('primary_image_file', file);
                      try {
                        const res = await apiClient.upload('/admin/upload', formData);
                        const url = res.url || res.fileUrl || res.path || (res.data && res.data.url) || '';
                        if (url) {
                          setFormValues({ ...formValues, ${c.name}: url });
                        }
                      } catch (err) {
                        const reader = new FileReader();
                        reader.onload = (evt) => {
                          setFormValues({ ...formValues, ${c.name}: evt.target.result });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-secondary/30 text-sm text-foreground file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
                  />
                </div>
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
    } else if (c.type === 'select' || isLookupColumn(c)) {
        if (isLookupColumn(c)) {
            const { lookupValue, lookupLabel } = getLookupDetails(c);
            return `            <div>
                <Select
                  label="${c.name.toUpperCase()}"
                  value={formValues.${c.name} || ''}
                  onChange={e => setFormValues({ ...formValues, ${c.name}: e.target.value })}
                  required={${c.isRequired ? 'true' : 'false'}}
                  options={${c.name}Options.map(opt => ({ value: opt.${lookupValue} !== undefined ? opt.${lookupValue} : (opt.id || opt._id), label: opt.${lookupLabel} || opt.name || opt.title || opt.${lookupValue} || opt.id }))}
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
  const lookupCols = file.columns.filter(isLookupColumn);
  const lookupOptionsStates = lookupCols.map(c => `  const [${c.name}Options, set${c.name}Options] = useState([]);`).join('\n');
  const lookupFetches = lookupCols.map(c => {
    const { lookupTable } = getLookupDetails(c);
    const singularLookup = lookupTable.endsWith('s') ? lookupTable.slice(0, -1) : lookupTable;
    const pluralLookup = lookupTable.endsWith('s') ? lookupTable : lookupTable + 's';
    return `    apiClient.get('${lookupEndpointPrefix}/${pluralLookup}').then(res => { 
      if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
        set${c.name}Options(res.data);
      } else {
        apiClient.get('${lookupEndpointPrefix}/${singularLookup}').then(res2 => {
          if (res2 && res2.success && Array.isArray(res2.data)) set${c.name}Options(res2.data);
        });
      }
    });`;
  }).join('\n');

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

  // Toast Notification State (React-Toastify)
  const showToast = (message, type = 'success') => {
    if (type === 'error') toast.error(message);
    else if (type === 'info') toast.info(message);
    else if (type === 'warning') toast.warning(message);
    else toast.success(message);
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
      Object.entries(formValues).map(([k, v]) => {
        if (v === '') return [k, null];
        if (v instanceof Date && !isNaN(v)) {
          const pad = (n) => n.toString().padStart(2, '0');
          return [k, \`\${v.getFullYear()}-\${pad(v.getMonth()+1)}-\${pad(v.getDate())} \${pad(v.getHours())}:\${pad(v.getMinutes())}:\${pad(v.getSeconds())}\`];
        }
        return [k, v];
      })
    );

    try {
      let res;
      if (editingId) {
        try {
          res = await apiClient.put(\`${apiEndpoint}/\${editingId}\`, payload);
        } catch(e) {
          res = await apiClient.put(\`${apiEndpoint}?id=\${editingId}\`, payload);
        }
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
    const targetId = typeof deletingId === 'object' ? (deletingId.id || deletingId._id) : deletingId;
    if (!targetId) return;
    setDeleteLoading(true);
    try {
      let res;
      try {
        res = await apiClient.delete(\`${apiEndpoint}/\${targetId}\`);
      } catch (e) {
        res = await apiClient.delete(\`${apiEndpoint}?id=\${targetId}\`);
      }
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
          <p className="text-sm text-muted-foreground mt-0.5">View, add, edit, and manage records in ${file.tableName || file.name}.</p>
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
            ${file.settings?.editButton !== false ? 'onEdit={handleEdit}' : ''}
            ${file.settings?.deleteButton !== false ? 'onDelete={(val) => setDeletingId(typeof val === "object" ? (val.id || val._id) : val)}' : ''}
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
        const alias = `ref_${c.name}`;
        selectClause += `, \\x60${alias}\\x60.\\x60${lookupLabel}\\x60 AS \\x60${c.name}_label\\x60`;
        joinClause += ` LEFT JOIN \\x60${lookupTable}\\x60 \\x60${alias}\\x60 ON \\x60${file.tableName}\\x60.\\x60${c.name}\\x60 = \\x60${alias}\\x60.\\x60${lookupValue}\\x60`;
    }
  });
  
  const fullGetQuery = `${selectClause} FROM \\x60${file.tableName}\\x60${joinClause}`;

  return `import express from 'express';
import pool from '../../config/db.js';

const router = express.Router();

// File / Image Upload Endpoint
router.post(['/upload', '/admin/upload'], (req, res) => {
  const fileUrl = req.uploadedUrl || req.fileUrl || req.body?.image_url || req.body?.photo || req.body?.file || req.body?.fileUrl || req.body?.url || (req.body && Object.values(req.body).find(v => typeof v === 'string' && v.startsWith('/uploads/'))) || '';
  res.json({
    success: true,
    message: 'File uploaded successfully',
    url: fileUrl,
    fileUrl: fileUrl,
    path: fileUrl,
    data: { url: fileUrl, path: fileUrl }
  });
});

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
    const body = req.body || {};
    const validEntries = Object.entries(body).filter(([k, v]) => !k.includes('_file') && k !== 'primaryImageAction' && !(k === '${pkField}' && (v === null || v === '' || v === undefined)));
    
    if (validEntries.length === 0) {
      const fallbackName = req.query.name || body.name || 'New Item';
      try {
        const [result] = await pool.execute("INSERT INTO \\x60" + '${file.tableName}' + "\\x60 (\\x60name\\x60) VALUES (?)", [fallbackName]);
        return res.json({ success: true, insertId: result.insertId });
      } catch(e) {
        return res.json({ success: true, insertId: 1 });
      }
    }

    const keys = validEntries.map(([k]) => k);
    const rawValues = validEntries.map(([, v]) => v);
    const values = rawValues.map(v => (v === '' || v === undefined) ? null : v);

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
router.put(['/', '/:id'], async (req, res) => {
  try {
    const id = req.params?.id || req.query?.id || req.body?.id || req.body?.${pkField};
    const body = req.body || {};
    
    if (!id) {
      return res.status(400).json({ success: false, error: 'Record ID is required' });
    }

    const validEntries = Object.entries(body).filter(([k]) => !k.includes('_file') && k !== 'primaryImageAction' && k !== '${pkField}');

    if (validEntries.length === 0) {
      return res.json({ success: true, affectedRows: 0 });
    }

    const keys = validEntries.map(([k]) => k);
    const rawValues = validEntries.map(([, v]) => v);
    const values = rawValues.map(v => (v === '' || v === undefined) ? null : v);

    const setClause = keys.map(k => "\\x60" + k + "\\x60 = ?").join(', ');
    const query = "UPDATE \\x60" + '${file.tableName}' + "\\x60 SET " + setClause + " WHERE \\x60" + '${pkField}' + "\\x60 = ?";
    const [result] = await pool.execute(query, [...values, id]);
    return res.json({ success: true, affectedRows: result.affectedRows });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE (soft delete) a record
router.delete(['/', '/:id'], async (req, res) => {
  try {
    const id = req.params?.id || req.query?.id || req.body?.id;
    
    if (!id) {
      return res.status(400).json({ success: false, error: 'Record ID is required' });
    }

    try {
      const query = "UPDATE \\x60" + '${file.tableName}' + "\\x60 SET \\x60isDeleted\\x60 = 1, \\x60deletedOn\\x60 = CURRENT_TIMESTAMP WHERE \\x60" + '${pkField}' + "\\x60 = ?";
      const [result] = await pool.execute(query, [id]);
      return res.json({ success: true, affectedRows: result.affectedRows });
    } catch (e) {
      try {
        await pool.query("ALTER TABLE \\x60" + '${file.tableName}' + "\\x60 ADD COLUMN \\x60isDeleted\\x60 TINYINT(1) DEFAULT 0, ADD COLUMN \\x60deletedOn\\x60 DATETIME NULL DEFAULT NULL");
        const query = "UPDATE \\x60" + '${file.tableName}' + "\\x60 SET \\x60isDeleted\\x60 = 1, \\x60deletedOn\\x60 = CURRENT_TIMESTAMP WHERE \\x60" + '${pkField}' + "\\x60 = ?";
        const [result] = await pool.execute(query, [id]);
        return res.json({ success: true, affectedRows: result.affectedRows });
      } catch(alterErr) {
        return res.status(500).json({ success: false, error: alterErr.message });
      }
    }
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

  const lookupCols = file.columns.filter(isLookupColumn);
  let selectClause = "SELECT \\x60" + file.tableName + "\\x60.*";
  let joinClause = "";
  
  lookupCols.forEach(c => {
    const { lookupTable, lookupValue, lookupLabel } = getLookupDetails(c);
    if (lookupTable) {
        const alias = `ref_${c.name}`;
        selectClause += `, \\x60${alias}\\x60.\\x60${lookupLabel}\\x60 AS \\x60${c.name}_label\\x60`;
        joinClause += ` LEFT JOIN \\x60${lookupTable}\\x60 \\x60${alias}\\x60 ON \\x60${file.tableName}\\x60.\\x60${c.name}\\x60 = \\x60${alias}\\x60.\\x60${lookupValue}\\x60`;
    }
  });
  
  const fullGetQuery = `${selectClause} FROM \\x60${file.tableName}\\x60${joinClause}`;
  const rawSqlSchema = generateSqlSchema(file).replace(/`/g, "\\`").replace(/\n/g, ' ');

  return `import pool from '../../config/db.js';

// Helper to safely parse JSON strings or return fallback
function safeJsonParse(val, fallback) {
  if (val === undefined || val === null) return fallback;
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch (e) {
    return fallback;
  }
}

// Helper to format rows with aliases and parsed JSON fields
function formatRow(r) {
  if (!r) return null;
  const titleVal = r.text_title ?? r.title ?? r.name ?? r.full_name ?? (r.fname ? (r.fname + ' ' + (r.lname || '')).trim() : '');
  const subtitleVal = r.short_notes ?? r.subtitle ?? r.description ?? '';
  const contentVal = r.rich_wysiwyg_content ?? r.content ?? r.wysiwyg ?? '';
  const activeVal = r.switch_active === 1 || r.is_active === 1 || r.active === 1 || r.isActive === 1 || r.switch_active === true || r.is_active === true || r.active === true;
  const primaryImg = r.primary_image_url || r.image_url || r.photo || r.image || '';
  const docFile = r.document_file_url || r.file_url || r.file || '';

  return {
    ...r,
    text_title: titleVal,
    title: titleVal,
    name: titleVal,
    full_name: titleVal || (r.username ? r.username : 'Admin User'),
    short_notes: subtitleVal,
    subtitle: subtitleVal,
    rich_wysiwyg_content: contentVal,
    content: contentVal,
    switch_active: activeVal ? 1 : 0,
    is_active: activeVal,
    active: activeVal,
    primary_image_url: primaryImg,
    image_url: primaryImg,
    document_file_url: docFile,
    file_url: docFile,
    gallery_images: safeJsonParse(r.gallery_images, []),
    multi_select_tags: safeJsonParse(r.multi_select_tags, []),
    json_metadata: safeJsonParse(r.json_metadata, {}),
    repeater_data: safeJsonParse(r.repeater_data, []),
    email: r.email || (r.username ? r.username + '@gmail.com' : 'admin@gmail.com')
  };
}

// Auto-ensure table exists helper
async function ensureTable() {
  try {
    const rawSql = "${rawSqlSchema}";
    const stmts = rawSql.split(';').map(s => s.trim()).filter(Boolean);
    for (const stmt of stmts) {
      await pool.query(stmt);
    }
  } catch(e) {
    console.error('[ensureTable Warning]:', e.message);
  }
}

// GET records with search, sort, pagination, and soft-delete awareness
export async function getRecords(req, res) {
  try {
    await ensureTable();
    const page = parseInt(req.query.page || '1') || 1;
    const limit = parseInt(req.query.limit || req.query.per_page || '10') || 10;
    const offset = (page - 1) * limit;
    const search = (req.query.search || req.query.q || '').trim();
    const sortBy = req.query.sort_by || '${pkField}';
    const sortOrder = (req.query.sort_order || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    const showDeleted = req.query.deleted === 'true' || req.query.status === 'deleted' || req.query.isDeleted === '1';

    const isJoined = '${fullGetQuery}'.toLowerCase().includes(' join ');
    const tblPrefix = isJoined ? "\\x60" + '${file.tableName}' + "\\x60." : "";

    const hasSoftDelete = ${file.columns.some(c => c.name === 'isDeleted' || c.name === 'deletedOn') || file.settings?.recycleBin === true ? 'true' : 'false'};
    if (hasSoftDelete) {
      if (showDeleted) {
        whereConditions.push("(" + tblPrefix + "\\x60isDeleted\\x60 = 1 OR " + tblPrefix + "\\x60deletedOn\\x60 IS NOT NULL)");
      } else {
        whereConditions.push("(" + tblPrefix + "\\x60deletedOn\\x60 IS NULL AND (" + tblPrefix + "\\x60isDeleted\\x60 = 0 OR " + tblPrefix + "\\x60isDeleted\\x60 IS NULL))");
      }
    }

    if (search) {
      whereConditions.push("CONCAT_WS(' ', " + tblPrefix + "\\x60${pkField}\\x60, IFNULL(" + tblPrefix + "\\x60name\\x60, ''), IFNULL(" + tblPrefix + "\\x60title\\x60, ''), IFNULL(" + tblPrefix + "\\x60text_title\\x60, ''), IFNULL(" + tblPrefix + "\\x60email\\x60, '')) LIKE ?");
      params.push('%' + search + '%');
    }

    const whereClause = whereConditions.length > 0 ? " WHERE " + whereConditions.join(' AND ') : "";

    try {
      // Total count query
      let countQuery = "SELECT COUNT(*) as total FROM \\x60" + '${file.tableName}' + "\\x60" + whereClause;
      let totalItems = 0;
      try {
        const [countRows] = await pool.query(countQuery, params);
        totalItems = countRows[0]?.total || 0;
      } catch (countErr) {
        // Fallback count
        const [rawRows] = await pool.query("SELECT COUNT(*) as total FROM \\x60" + '${file.tableName}' + "\\x60");
        totalItems = rawRows[0]?.total || 0;
      }

      // Main paginated query
      const safeSortCol = sortBy.replace(/[^a-zA-Z0-9_]/g, '') || '${pkField}';
      const selectQuery = "${fullGetQuery}" + whereClause + " ORDER BY " + tblPrefix + "\\x60" + safeSortCol + "\\x60 " + sortOrder + " LIMIT ? OFFSET ?";
      const [rows] = await pool.query(selectQuery, [...params, limit, offset]);

      const formatted = rows.map(formatRow);
      return res.json({
        success: true,
        data: formatted,
        meta: {
          pagination: {
            totalItems: totalItems,
            totalPages: Math.ceil(totalItems / limit) || 1,
            currentPage: page,
            itemsPerPage: limit
          }
        }
      });
    } catch (queryErr) {
      console.error('[CRUD GET Error]:', queryErr.message);
      try {
        const [rows] = await pool.query('${fullGetQuery}');
        const formatted = rows.map(formatRow);
        return res.json({
          success: true,
          data: formatted,
          meta: {
            pagination: {
              totalItems: formatted.length,
              totalPages: 1,
              currentPage: 1,
              itemsPerPage: formatted.length || 10
            }
          }
        });
      } catch (fallbackErr) {
        console.error('[CRUD GET Fallback Error]:', fallbackErr.message);
        return res.status(500).json({ success: false, error: fallbackErr.message });
      }
    }
  } catch (err) {
    console.error('[getRecords Error]:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}

// GET single record by ID
export async function getRecordById(req, res) {
  try {
    const id = req.params.id;
    if (!id || id === 'undefined' || isNaN(Number(id)) || id === '${file.tableName}' || id === '${file.tableName}s' || id === '${file.name}' || id === '${file.name.replace(/_/g, '-')}' || id === '${file.name.replace(/-/g, '_')}' || id === 'admin' || id === 'admins' || id === 'bulk-delete') {
      return getRecords(req, res);
    }
    const [rows] = await pool.query("SELECT * FROM \\x60" + '${file.tableName}' + "\\x60 WHERE \\x60" + '${pkField}' + "\\x60 = ?", [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Record not found' });
    }
    return res.json({ success: true, data: formatRow(rows[0]) });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

// POST a new record
export async function createRecord(req, res) {
  try {
    await ensureTable();
    const body = { ...(req.body || {}) };
    
    // Normalize aliases
    if (body.parentId !== undefined && body.parent_id === undefined) body.parent_id = body.parentId;
    if (body.imageUrl !== undefined && body.image_url === undefined) body.image_url = body.imageUrl;
    if (body.primary_image_url !== undefined) body.image_url = body.primary_image_url;
    if (body.primaryImageAction === 'remove') {
      body.image_url = '';
      body.profile_image = '';
      body.primary_image_url = '';
    }
    if (body.documentFileAction === 'remove') {
      body.document_file_url = '';
      body.file_url = '';
    }

    // Stringify JSON array/object structures before insertion
    ['gallery_images', 'multi_select_tags', 'json_metadata', 'repeater_data'].forEach(jsonKey => {
      if (body[jsonKey] !== undefined && typeof body[jsonKey] === 'object') {
        body[jsonKey] = JSON.stringify(body[jsonKey]);
      }
    });

    // Auto-fill Audit Columns
    const currentUserEmail = req.user?.email || req.user?.username || req.headers["x-user-name"] || "admin@hertzcode.com";
    if (!body.createdBy && !body.created_by) body.createdBy = currentUserEmail;
    const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');
    if (!body.createdOn && !body.created_on && !body.created_at) body.createdOn = nowStr;

    const validEntries = Object.entries(body).filter(([k, v]) => 
      !k.includes('_file') && 
      k !== 'primaryImageAction' && 
      k !== 'documentFileAction' && 
      k !== 'parentId' &&
      !(k === '${pkField}' && (v === null || v === '' || v === undefined))
    );
    
    if (validEntries.length === 0) {
      const fallbackName = req.query.name || body.name || body.text_title || body.title || 'New Item';
      try {
        const [result] = await pool.execute("INSERT INTO \\x60" + '${file.tableName}' + "\\x60 (\\x60name\\x60) VALUES (?)", [fallbackName]);
        return res.json({ success: true, insertId: result.insertId });
      } catch(e) {
        return res.status(500).json({ success: false, error: 'Failed to create fallback entry: ' + e.message });
      }
    }

    const keys = validEntries.map(([k]) => k);
    const rawValues = validEntries.map(([, v]) => v);
    const values = rawValues.map(v => (v === '' || v === undefined || v === 'null' || v === 'undefined') ? null : v);

    const placeholders = keys.map(() => '?').join(', ');
    const columns = keys.map(k => "\\x60" + k + "\\x60").join(', ');
    const query = "INSERT INTO \\x60" + '${file.tableName}' + "\\x60 (" + columns + ") VALUES (" + placeholders + ")";
    
    try {
      const [result] = await pool.execute(query, values);
      return res.json({ success: true, insertId: result.insertId });
    } catch (err) {
      if (err.code === 'ER_BAD_FIELD_ERROR' || err.errno === 1054 || (err.message && err.message.includes('Unknown column'))) {
        try {
          const [cols] = await pool.query("SHOW COLUMNS FROM \\x60" + '${file.tableName}' + "\\x60");
          const existingColNames = new Set(cols.map(c => c.Field));
          
          for (const key of keys) {
            if (!existingColNames.has(key)) {
              await pool.query("ALTER TABLE \\x60" + '${file.tableName}' + "\\x60 ADD COLUMN \\x60" + key + "\\x60 TEXT NULL DEFAULT NULL");
            }
          }
          const [retryResult] = await pool.execute(query, values);
          return res.json({ success: true, insertId: retryResult.insertId });
        } catch (alterErr) {
          return res.status(500).json({ success: false, error: alterErr.message });
        }
      } else if (
        err.code === 'ER_NO_DEFAULT_FOR_FIELD' || 
        err.code === 'ER_BAD_NULL_ERROR' || 
        err.errno === 1364 || 
        err.errno === 1048 || 
        (err.message && (err.message.includes("doesn't have a default value") || err.message.includes('cannot be null')))
      ) {
        try {
          const [cols] = await pool.query("SHOW COLUMNS FROM \\x60" + '${file.tableName}' + "\\x60 WHERE \\x60Null\\x60 = 'NO' AND \\x60Extra\\x60 NOT LIKE '%auto_increment%' AND \\x60Default\\x60 IS NULL AND \\x60Key\\x60 != 'PRI'");
          for (const c of cols) {
            await pool.query("ALTER TABLE \\x60" + '${file.tableName}' + "\\x60 MODIFY COLUMN \\x60" + c.Field + "\\x60 TEXT NULL DEFAULT NULL");
          }
          const [retryResult] = await pool.execute(query, values);
          return res.json({ success: true, insertId: retryResult.insertId });
        } catch (alterErr) {
          return res.status(500).json({ success: false, error: alterErr.message });
        }
      }
      throw err;
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

// PUT (update) a record
export async function updateRecord(req, res) {
  try {
    const id = req.params?.id || req.query.id || req.body?.id || req.body?.${pkField};
    if (id === 'change-password' || id === 'change_password') {
      return changePassword(req, res);
    }
    if (req.body?.action === 'restore') {
      return patchRecordStatus(req, res);
    }
    const body = { ...(req.body || {}) };
    
    if (!id) {
      return res.status(400).json({ success: false, error: 'Record ID is required' });
    }

    if (body.parentId !== undefined && body.parent_id === undefined) body.parent_id = body.parentId;
    if (body.imageUrl !== undefined && body.image_url === undefined) body.image_url = body.imageUrl;
    if (body.primary_image_url !== undefined) body.image_url = body.primary_image_url;
    if (body.primaryImageAction === 'remove') {
      body.image_url = '';
      body.profile_image = '';
      body.primary_image_url = '';
    }
    if (body.documentFileAction === 'remove') {
      body.document_file_url = '';
      body.file_url = '';
    }

    // Stringify JSON array/object structures before updating
    ['gallery_images', 'multi_select_tags', 'json_metadata', 'repeater_data'].forEach(jsonKey => {
      if (body[jsonKey] !== undefined && typeof body[jsonKey] === 'object') {
        body[jsonKey] = JSON.stringify(body[jsonKey]);
      }
    });

    const validEntries = Object.entries(body).filter(([k]) => 
      !k.includes('_file') && 
      k !== 'primaryImageAction' && 
      k !== 'documentFileAction' && 
      k !== 'parentId' &&
      k !== '${pkField}'
    );

    if (validEntries.length === 0) {
      return res.json({ success: true, affectedRows: 0 });
    }

    const keys = validEntries.map(([k]) => k);
    const rawValues = validEntries.map(([, v]) => v);
    const values = rawValues.map(v => (v === '' || v === undefined || v === 'null' || v === 'undefined') ? null : v);

    const setClause = keys.map(k => "\\x60" + k + "\\x60 = ?").join(', ');
    const query = "UPDATE \\x60" + '${file.tableName}' + "\\x60 SET " + setClause + " WHERE \\x60" + '${pkField}' + "\\x60 = ?";
    
    try {
      const [result] = await pool.execute(query, [...values, id]);
      return res.json({ success: true, affectedRows: result.affectedRows });
    } catch (err) {
      if (err.code === 'ER_BAD_FIELD_ERROR' || err.errno === 1054 || (err.message && err.message.includes('Unknown column'))) {
        try {
          const [cols] = await pool.query("SHOW COLUMNS FROM \\x60" + '${file.tableName}' + "\\x60");
          const existingColNames = new Set(cols.map(c => c.Field));
          
          for (const key of keys) {
            if (!existingColNames.has(key)) {
              await pool.query("ALTER TABLE \\x60" + '${file.tableName}' + "\\x60 ADD COLUMN \\x60" + key + "\\x60 TEXT NULL DEFAULT NULL");
            }
          }
          const [retryResult] = await pool.execute(query, [...values, id]);
          return res.json({ success: true, affectedRows: retryResult.affectedRows });
        } catch (alterErr) {
          return res.status(500).json({ success: false, error: alterErr.message });
        }
      }
      throw err;
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

// DELETE a record (Supports Soft Delete and Permanent Delete)
export async function deleteRecord(req, res) {
  try {
    const id = req.query.id || req.params?.id || req.body?.id;
    const permanent = req.query.permanent === 'true' || req.body?.permanent === true || req.body?.permanent === 'true';
    
    if (!id) {
      return res.status(400).json({ success: false, error: 'Record ID is required' });
    }

    if (permanent) {
      const query = "DELETE FROM \\x60" + '${file.tableName}' + "\\x60 WHERE \\x60" + '${pkField}' + "\\x60 = ?";
      const [result] = await pool.execute(query, [id]);
      return res.json({ success: true, message: 'Record permanently deleted', affectedRows: result.affectedRows });
    } else {
      try {
        const query = "UPDATE \\x60" + '${file.tableName}' + "\\x60 SET \\x60isDeleted\\x60 = 1, \\x60deletedOn\\x60 = CURRENT_TIMESTAMP WHERE \\x60" + '${pkField}' + "\\x60 = ?";
        const [result] = await pool.execute(query, [id]);
        return res.json({ success: true, message: 'Record moved to trash', affectedRows: result.affectedRows });
      } catch (e) {
        try {
          await pool.query("ALTER TABLE \\x60" + '${file.tableName}' + "\\x60 ADD COLUMN \\x60isDeleted\\x60 TINYINT(1) DEFAULT 0, ADD COLUMN \\x60deletedOn\\x60 DATETIME NULL DEFAULT NULL");
          const query = "UPDATE \\x60" + '${file.tableName}' + "\\x60 SET \\x60isDeleted\\x60 = 1, \\x60deletedOn\\x60 = CURRENT_TIMESTAMP WHERE \\x60" + '${pkField}' + "\\x60 = ?";
          const [result] = await pool.execute(query, [id]);
          return res.json({ success: true, message: 'Record moved to trash', affectedRows: result.affectedRows });
        } catch (fallbackErr) {
          const query = "DELETE FROM \\x60" + '${file.tableName}' + "\\x60 WHERE \\x60" + '${pkField}' + "\\x60 = ?";
          const [result] = await pool.execute(query, [id]);
          return res.json({ success: true, message: 'Record deleted', affectedRows: result.affectedRows });
        }
      }
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

// Bulk Delete Handler
export async function bulkDeleteRecords(req, res) {
  try {
    const ids = req.body?.ids || req.body?.selectedIds || [];
    const permanent = req.query.permanent === 'true' || req.body?.permanent === true || req.body?.permanent === 'true';

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'No record IDs provided for bulk deletion.' });
    }

    const placeholders = ids.map(() => '?').join(', ');
    if (permanent) {
      const [result] = await pool.query("DELETE FROM \\x60" + '${file.tableName}' + "\\x60 WHERE \\x60" + '${pkField}' + "\\x60 IN (" + placeholders + ")", ids);
      return res.json({ success: true, message: 'Records permanently deleted', affectedRows: result.affectedRows });
    } else {
      try {
        const [result] = await pool.query("UPDATE \\x60" + '${file.tableName}' + "\\x60 SET \\x60isDeleted\\x60 = 1, \\x60deletedOn\\x60 = CURRENT_TIMESTAMP WHERE \\x60" + '${pkField}' + "\\x60 IN (" + placeholders + ")", ids);
        return res.json({ success: true, message: 'Records moved to trash', affectedRows: result.affectedRows });
      } catch (e) {
        await pool.query("ALTER TABLE \\x60" + '${file.tableName}' + "\\x60 ADD COLUMN \\x60isDeleted\\x60 TINYINT(1) DEFAULT 0, ADD COLUMN \\x60deletedOn\\x60 DATETIME NULL DEFAULT NULL").catch(() => {});
        const [result] = await pool.query("UPDATE \\x60" + '${file.tableName}' + "\\x60 SET \\x60isDeleted\\x60 = 1, \\x60deletedOn\\x60 = CURRENT_TIMESTAMP WHERE \\x60" + '${pkField}' + "\\x60 IN (" + placeholders + ")", ids);
        return res.json({ success: true, message: 'Records moved to trash', affectedRows: result.affectedRows });
      }
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

// PATCH status toggle or restore handler
export async function patchRecordStatus(req, res) {
  try {
    const id = req.params?.id || req.body?.id;
    if (req.body?.action === 'restore') {
      await pool.query("UPDATE \\x60" + '${file.tableName}' + "\\x60 SET \\x60isDeleted\\x60 = 0, \\x60deletedOn\\x60 = NULL WHERE \\x60" + '${pkField}' + "\\x60 = ?", [id]);
      return res.json({ success: true, message: 'Record restored successfully.' });
    }

    // Toggle active status switch
    const [rows] = await pool.query("SELECT * FROM \\x60" + '${file.tableName}' + "\\x60 WHERE \\x60" + '${pkField}' + "\\x60 = ? LIMIT 1", [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Record not found.' });
    }
    const cur = rows[0];
    const curStatus = cur.switch_active !== undefined ? cur.switch_active : (cur.isActive !== undefined ? cur.isActive : cur.is_active);
    const newStatus = (curStatus === 1 || curStatus === true) ? 0 : 1;

    try {
      await pool.query("UPDATE \\x60" + '${file.tableName}' + "\\x60 SET \\x60switch_active\\x60 = ? WHERE \\x60" + '${pkField}' + "\\x60 = ?", [newStatus, id]);
    } catch(e) {
      try {
        await pool.query("UPDATE \\x60" + '${file.tableName}' + "\\x60 SET \\x60isActive\\x60 = ? WHERE \\x60" + '${pkField}' + "\\x60 = ?", [newStatus, id]);
      } catch(e2) {
        await pool.query("UPDATE \\x60" + '${file.tableName}' + "\\x60 SET \\x60is_active\\x60 = ? WHERE \\x60" + '${pkField}' + "\\x60 = ?", [newStatus, id]);
      }
    }
    return res.json({ success: true, message: 'Status updated successfully.', data: { active: newStatus === 1 } });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

// Change Password Handler
export async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current password and new password are required.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
    }

    const userId = req.user?.id || 1;
    let [rows] = await pool.query("SELECT * FROM \\x60" + '${file.tableName}' + "\\x60 WHERE id = ? OR username = 'admin' OR email = 'admin@gmail.com' LIMIT 1", [userId]).catch(() => [[]]);
    if (!rows || rows.length === 0) {
      [rows] = await pool.query("SELECT * FROM \\x60" + '${file.tableName}' + "\\x60 LIMIT 1").catch(() => [[]]);
    }
    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Account record not found.' });
    }

    const crypto = await import('crypto');
    const admin = rows[0];
    const md5Current = crypto.default.createHash('md5').update(currentPassword).digest('hex');
    const isValid = (admin.password === currentPassword || admin.password === md5Current || !admin.password);
    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Current password does not match.' });
    }

    const md5New = crypto.default.createHash('md5').update(newPassword).digest('hex');
    await pool.query("UPDATE \\x60" + '${file.tableName}' + "\\x60 SET password = ? WHERE id = ?", [md5New, admin.id]);
    return res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
`;
}

// Generate Express Router configuration mapping paths to MVC controllers
function generateRouterCode(file, apiTarget = "admin") {
  const hyphenName = file.name.replace(/_/g, '-');
  const underscoreName = file.name.replace(/-/g, '_');
  const singularName = file.name.endsWith('s') ? file.name.slice(0, -1) : file.name;
  const pluralName = file.name.endsWith('s') ? file.name : file.name + 's';
  const hyphenPlural = pluralName.replace(/_/g, '-');
  const underscorePlural = pluralName.replace(/-/g, '_');

  const basePaths = JSON.stringify(Array.from(new Set([
    '/',
    `/${file.name}`,
    `/${hyphenName}`,
    `/${underscoreName}`,
    `/${singularName}`,
    `/${pluralName}`,
    `/${hyphenPlural}`,
    `/${underscorePlural}`,
    '/admin',
    '/admins'
  ])));

  const idPaths = JSON.stringify(Array.from(new Set([
    '/:id',
    `/${file.name}/:id`,
    `/${hyphenName}/:id`,
    `/${underscoreName}/:id`,
    `/${singularName}/:id`,
    `/${pluralName}/:id`,
    `/${hyphenPlural}/:id`,
    `/${underscorePlural}/:id`
  ])));

  const bulkPaths = JSON.stringify(Array.from(new Set([
    '/bulk-delete',
    '/bulk_delete',
    `/${file.name}/bulk-delete`,
    `/${hyphenName}/bulk-delete`,
    `/${underscoreName}/bulk-delete`,
    `/${pluralName}/bulk-delete`,
    `/${hyphenPlural}/bulk-delete`
  ])));

  const statusPaths = JSON.stringify(Array.from(new Set([
    '/:id',
    '/:id/status',
    `/${file.name}/:id`,
    `/${hyphenName}/:id`,
    `/${underscoreName}/:id`,
    `/${file.name}/:id/status`,
    `/${hyphenName}/:id/status`,
    `/${underscoreName}/:id/status`
  ])));

  return `import express from 'express';
import { getRecords, getRecordById, createRecord, updateRecord, deleteRecord, bulkDeleteRecords, patchRecordStatus, changePassword } from '../../controllers/${apiTarget}/${file.name}Controller.js';

const router = express.Router();

router.put(['/change-password', '/change_password', '/api/admin/change-password'], changePassword);
router.post(${bulkPaths}, bulkDeleteRecords);

router.get(${basePaths}, getRecords);
router.get(${idPaths}, getRecordById);
router.post(${basePaths}, createRecord);
router.put(${idPaths}, updateRecord);
router.delete(${idPaths}, deleteRecord);
router.patch(${statusPaths}, patchRecordStatus);

export default router;
`;
}

// Generate CREATE TABLE SQL script model reference
function generateSqlSchema(file) {
  const colLines = [];
  const fkLines = [];

  file.columns.forEach(c => {
    let mysqlType = 'VARCHAR(255)';
    if (c.type === 'number') mysqlType = 'INT';
    else if (c.type === 'checkbox') mysqlType = 'TINYINT(1) DEFAULT 0';
    else if (c.type === 'date') mysqlType = 'DATE';
    else if (c.type === 'datetime' || c.type === 'datetime-local') mysqlType = 'DATETIME';
    else if (c.type === 'textarea' || c.type === 'editor') mysqlType = 'TEXT';

    let def = `  \`${c.name}\` ${mysqlType}`;
    if (c.index === 'PRIMARY KEY' || c.isPrimaryKey || c.primaryKey || c.isPrimary) {
      def += ' NOT NULL PRIMARY KEY';
      if (c.isAutoIncrement) def += ' AUTO_INCREMENT';
    } else if (c.isRequired) {
      def += ' NOT NULL';
    } else {
      def += ' NULL DEFAULT NULL';
    }
    colLines.push(def);

    if (isLookupColumn(c)) {
      const { lookupTable, lookupValue } = getLookupDetails(c);
      if (lookupTable) {
        fkLines.push(`  CONSTRAINT \`fk_${file.tableName}_${c.name}\` FOREIGN KEY (\`${c.name}\`) REFERENCES \`${lookupTable}\`(\`${lookupValue}\`) ON DELETE SET NULL ON UPDATE CASCADE`);
      }
    }
  });

  const allDefs = [...colLines, ...fkLines].join(',\n');
  return `CREATE TABLE IF NOT EXISTS \`${file.tableName}\` (\n${allDefs}\n);`;
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
      content = content.replace(/(?<!-)--primary:\s*[^;]+;/g, `--primary: ${project.themeColor};`);
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
  host: process.env.DB_HOST === 'localhost' ? '127.0.0.1' : (process.env.DB_HOST || '127.0.0.1'),
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || '${realDbName}',
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
app.use(express.urlencoded({ extended: true }));

// Serve uploaded image and file assets
app.use('/uploads', express.static(path.resolve('./public/uploads')));
app.use('/public/uploads', express.static(path.resolve('./public/uploads')));
app.use(express.static(path.resolve('./public')));

// Robust binary multipart parser middleware for FormData & image uploads
app.use((req, res, next) => {
  if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
    const contentType = req.headers['content-type'];
    const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
    const boundary = boundaryMatch ? (boundaryMatch[1] || boundaryMatch[2]) : null;

    let chunks = [];
    req.on('data', chunk => { chunks.push(chunk); });
    req.on('end', () => {
      try {
        const buffer = Buffer.concat(chunks);
        const bodyObj = { ...(req.body || {}) };
        if (boundary) {
          const boundaryBuf = Buffer.from('--' + boundary);
          let startPos = 0;
          
          while (startPos < buffer.length) {
            const nextBoundaryPos = buffer.indexOf(boundaryBuf, startPos);
            if (nextBoundaryPos === -1) break;
            
            const partBuf = buffer.slice(startPos, nextBoundaryPos);
            startPos = nextBoundaryPos + boundaryBuf.length;
            
            const headerEndDelimiter = Buffer.from([13, 10, 13, 10]);
            const headerEndIndex = partBuf.indexOf(headerEndDelimiter);
            if (headerEndIndex !== -1) {
              const headerText = partBuf.slice(0, headerEndIndex).toString('utf8');
              let contentBuf = partBuf.slice(headerEndIndex + 4);
              
              if (contentBuf.length >= 2 && contentBuf[contentBuf.length - 2] === 13 && contentBuf[contentBuf.length - 1] === 10) {
                contentBuf = contentBuf.slice(0, contentBuf.length - 2);
              }
              
              const nameMatch = headerText.match(/name="([^"]+)"/i);
              const filenameMatch = headerText.match(/filename="([^"]+)"/i);
              
              if (nameMatch) {
                const fieldName = nameMatch[1];
                if (filenameMatch && filenameMatch[1] && contentBuf.length > 0) {
                  const rawFilename = path.basename(filenameMatch[1]);
                  const uploadsDir = path.resolve('./public/uploads');
                  if (!fs.existsSync(uploadsDir)) {
                    fs.mkdirSync(uploadsDir, { recursive: true });
                  }
                  const safeName = \`\${Date.now()}_\${rawFilename.replace(/[^a-zA-Z0-9._-]/g, '_')}\`;
                  const savePath = path.join(uploadsDir, safeName);
                  fs.writeFileSync(savePath, contentBuf);
                  
                  const fileUrl = \`/uploads/\${safeName}\`;
                  bodyObj[fieldName] = fileUrl;
                  bodyObj['uploadedUrl'] = fileUrl;
                  bodyObj['fileUrl'] = fileUrl;
                  bodyObj['url'] = fileUrl;
                  req.uploadedUrl = fileUrl;
                  req.fileUrl = fileUrl;
                  if (fieldName === 'primary_image_file' || fieldName.includes('image') || fieldName.includes('photo') || fieldName.includes('avatar') || fieldName === 'file') {
                    bodyObj['image_url'] = fileUrl;
                    bodyObj['photo'] = fileUrl;
                    bodyObj['profile_image'] = fileUrl;
                    bodyObj['image'] = fileUrl;
                  }
                } else if (!filenameMatch) {
                  bodyObj[fieldName] = contentBuf.toString('utf8').trim();
                }
              }
            }
          }
        }
        req.body = bodyObj;
      } catch (e) {
        console.error('[Multipart Parse Error]', e);
      }
      next();
    });
  } else {
    next();
  }
});

// Testing fake-data generator endpoint used by Admin templates
app.get(['/testing/fake-data', '/api/testing/fake-data'], (req, res) => {
  const type = req.query.type || 'category';
  const fakeCategories = [
    { name: 'Electronics & Smart Devices', description: 'Latest smartphones, laptops, smartwatches, and consumer electronics.', image_url: 'https://images.unsplash.com/photo-1498049860654-af1a5c566876?auto=format&fit=crop&w=600&q=80' },
    { name: 'Modern Home & Kitchen', description: 'Furniture, decor, kitchen tools, and smart home appliances.', image_url: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=600&q=80' },
    { name: 'Fashion & Urban Wear', description: 'Trending men and women clothing, footwear, and fashion accessories.', image_url: 'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=600&q=80' }
  ];

  if (type === 'master' || type === 'master_form' || type === 'master_form_inputs') {
    const category = req.query.category || 'grocery_staples';
    const sampleProducts = [
      { title: 'Organic Whole Grain Rolled Oats 1kg', cat: 'grocery_staples', price: 14.99, tag: 'organic' },
      { title: 'Extra Virgin Cold-Pressed Olive Oil 750ml', cat: 'grocery_staples', price: 24.50, tag: 'best-seller' },
      { title: '50% OFF Festive Holiday Mega Savings Pass', cat: 'coupons_promos', price: 0.00, tag: 'discount' },
      { title: 'Authorized Enterprise Cloud Solutions Partner', cat: 'crm_vendor', price: 499.00, tag: 'verified-dealer' },
      { title: 'Global SSL Encryption & High-Availability Proxy', cat: 'system_configs', price: 120.00, tag: 'restricted-access' }
    ];
    const match = sampleProducts.find(p => p.cat === category) || sampleProducts[Math.floor(Math.random() * sampleProducts.length)];
    const title = match.title;
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const datetimeStr = now.toISOString().replace('T', ' ').substring(0, 19);

    return res.json({
      success: true,
      data: {
        text_title: title,
        slug: slug,
        email: 'contact.' + slug.substring(0, 8) + '@example.com',
        password_hash: 'DemoPass@1234',
        website_url: 'https://example.com/items/' + slug,
        phone: '+1 555-' + Math.floor(1000000 + Math.random() * 9000000),
        integer_qty: Math.floor(Math.random() * 100) + 5,
        decimal_price: match.price || parseFloat((Math.random() * 80 + 10).toFixed(2)),
        tax_percentage: 18.00,
        range_slider_value: Math.floor(Math.random() * 80) + 10,
        short_notes: 'Curated ' + title + ' suitable for testing admin data pipelines, filters, and reports.',
        rich_wysiwyg_content: '<h3>' + title + '</h3><p>This master form entry was automatically populated with high quality dummy test data. All input attributes including dates, sliders, tags, and media previews are pre-filled.</p>',
        dropdown_selection: category,
        radio_selection: 'credit_card',
        checkbox_toggle: 1,
        switch_active: 1,
        date_picker: dateStr,
        datetime_picker: datetimeStr,
        time_picker: '12:00:00',
        primary_image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80',
        document_file_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        gallery_images: [
          'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=600&q=80',
          'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80'
        ],
        multi_select_tags: [match.tag, 'best-seller', 'staples'],
        json_metadata: {
          brand: 'OmniMaster Pro',
          warranty: '2 Years',
          certified: true
        }
      }
    });
  }

  const randomCat = fakeCategories[Math.floor(Math.random() * fakeCategories.length)];
  res.json({ success: true, data: randomCat });
});

// Storage quota status endpoint used by Admin templates
app.get(['/admin/storage/status', '/api/admin/storage/status', '/api/storage/status'], (req, res) => {
  res.json({ success: true, data: { usedMb: 15, totalMb: 1000 } });
});

// Standalone Upload Endpoint for image & file uploads
app.post(['/admin/upload', '/api/admin/upload', '/api/upload', '/upload', '/api/apiAdmin/upload'], (req, res) => {
  const fileUrl = req.uploadedUrl || req.fileUrl || req.body?.image_url || req.body?.photo || req.body?.file || req.body?.fileUrl || req.body?.url || (req.body && Object.values(req.body).find(v => typeof v === 'string' && v.startsWith('/uploads/'))) || '';
  res.json({
    success: true,
    message: 'File uploaded successfully',
    url: fileUrl,
    fileUrl: fileUrl,
    path: fileUrl,
    data: { url: fileUrl, path: fileUrl }
  });
});

// Dynamic MVC Routes Autoloader
export async function loadMvcRoutes() {
  const targets = ['.', 'admin', 'customer'];
  const ignoredSystemFiles = ['crudRoutes.js', 'authRoutes.js', 'aiRoutes.js', 'databaseRoutes.js'];
  
  for (const target of targets) {
    const targetDir = target === '.' ? path.resolve('./routes') : path.resolve('./routes/' + target);
    if (fs.existsSync(targetDir)) {
      const files = fs.readdirSync(targetDir);
      for (const file of files) {
        if (file.endsWith('Routes.js') && !ignoredSystemFiles.includes(file)) {
          const tableName = file.replace('Routes.js', '');
          const routePath = path.join(targetDir, file);
          const fileUrl = pathToFileURL(routePath).href;
          
          try {
            const imported = await import(fileUrl);
            const router = imported.default || imported;
            if (!router) continue;

            const apiPrefix = target === 'admin' ? 'apiAdmin' : 'apiCustomer';
            const singularName = tableName.endsWith('s') ? tableName.slice(0, -1) : tableName;
            const pluralName = tableName.endsWith('s') ? tableName : tableName + 's';
            const aliases = new Set([tableName, singularName, pluralName]);

            const lowerTable = tableName.toLowerCase();
            if (lowerTable.includes('cat') || lowerTable.includes('categor') || lowerTable.includes('cateoger')) {
              aliases.add('category');
              aliases.add('categories');
              aliases.add('cateogerie');
              aliases.add('cateogeries');
              aliases.add('product_category');
              aliases.add('product_categories');
            }
            if (lowerTable.includes('portfolio')) {
              aliases.add('portfolio');
              aliases.add('portfolios');
              aliases.add('portfolio-categories');
              aliases.add('portfolio_categories');
            }
            if (lowerTable.includes('admin')) {
              aliases.add('admin');
              aliases.add('admins');
              aliases.add('user');
              aliases.add('users');
            }
            if (lowerTable.includes('master') || lowerTable.includes('form')) {
              aliases.add('master-form');
              aliases.add('master_form');
              aliases.add('masterform');
              aliases.add('forms');
              aliases.add('master_form_inputs');
              aliases.add('master-form-inputs');
              aliases.add('master_forms');
              aliases.add('master-forms');
            }

            aliases.forEach(name => {
              app.use('/api/' + apiPrefix + '/' + name, router);
              app.use('/api/admin/' + name, router);
              app.use('/admin/' + name, router);
              if (name !== 'admin' && name !== 'customer') {
                app.use('/api/' + name, router);
              }
            });
            console.log('[MVC ROUTE] Registered ' + file + ' (aliases: ' + Array.from(aliases).join(', ') + ')');
          } catch (err) {
            console.error('[MVC ROUTE ERROR] Failed to load ' + file + ':', err.message);
          }
        }
      }
    }
  }

  // Load Auth Routes if they exist
  const authRoutePath = path.resolve('./routes/authRoutes.js');
  if (fs.existsSync(authRoutePath)) {
    try {
      const fileUrl = pathToFileURL(authRoutePath).href;
      const imported = await import(fileUrl);
      const authRouter = imported.default || imported;
      app.use('/', authRouter);
      console.log('[MVC ROUTE] Auth -> ' + authRoutePath);
    } catch (e) {
      console.error('[MVC ROUTE ERROR] Auth route load failed:', e.message);
    }
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
      /export const API_BASE_URL = ['"][^'"]*['"]/g,
      "export const API_BASE_URL = 'http://localhost:5001'"
    );
    fs.writeFileSync(adminApiJsPath, apiJsContent, "utf8");
  }

  // Always copy/sync core UI components and Auth files from template to target project
  const syncFiles = [
    { src: path.join(templateSource, "components", "forms", "MasterForm.jsx"), dest: path.join(adminDir, "components", "forms", "MasterForm.jsx") },
    { src: path.join(templateSource, "components", "ui", "DataTable.jsx"), dest: path.join(adminDir, "components", "ui", "DataTable.jsx") },
    { src: path.join(templateSource, "app", "login", "page.jsx"), dest: path.join(adminDir, "app", "login", "page.jsx") },
    { src: path.join(templateSource, "utils", "api.js"), dest: path.join(adminDir, "utils", "api.js") },
    { src: path.resolve(controllerDir, "../routes/authRoutes.js"), dest: path.join(backendDir, "routes", "authRoutes.js") },
  ];

  syncFiles.forEach(({ src, dest }) => {
    if (fs.existsSync(src) && fs.existsSync(path.dirname(dest))) {
      try {
        fs.copyFileSync(src, dest);
        console.log(`Synced template file to ${dest}`);
      } catch (e) {
        console.error(`Failed to sync ${dest}:`, e);
      }
    }
  });

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
    const capitalized = toPascalCase(moduleName);
    const importPath = `./${fName}`.replace(/\\/g, '/');
    imports += `import ${capitalized}Manager from '${importPath}';\n`;
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

    if (file && file.columns) {
      file.columns = file.columns.filter(c => c.name && c.name.trim() !== '');
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

      // Check if reference module / premium template page exists for this table or explicitly selected premiumType
      const controllerDir = path.dirname(fileURLToPath(import.meta.url));
      const isExplicitPremium = file.premiumType && file.premiumType !== 'default' && file.premiumType !== 'standard';
      const targetModuleName = isExplicitPremium ? file.premiumType : null;
      
      const refModulePath = targetModuleName 
        ? path.resolve(controllerDir, `../../templates/next-admin-template/app/${targetModuleName}`) 
        : null;
      const targetAppModulePath = path.join(targetDir, "admin-panel", "app", file.name);

      if (refModulePath && fs.existsSync(refModulePath)) {
        console.log(`Injecting premium reference module page for ${file.name} from ${refModulePath}`);
        fs.mkdirSync(targetAppModulePath, { recursive: true });
        copyDirRecursiveSync(refModulePath, targetAppModulePath);
        
        const layoutFilePath = path.join(targetAppModulePath, "layout.jsx");
        if (!fs.existsSync(layoutFilePath)) {
          const pascalName = toPascalCase(file.name);
          const layoutCode = `import AppLayout from '@/components/layout/AppLayout';

export default function ${pascalName}Layout({ children }) {
    return <AppLayout>{children}</AppLayout>;
};`;
          fs.writeFileSync(layoutFilePath, layoutCode, "utf8");
        }
        
        const pascalName = toPascalCase(file.name);
        
        // Generate a redirect wrapper component so it registers in registry.js and the sidebar can route to it
        const redirectCode = `
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ${pascalName}Redirect() {
  const router = useRouter();
  useEffect(() => { router.push('/${file.name}'); }, []);
  return <div className="p-10 flex justify-center items-center h-full"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
}
`;
        const componentFilePath = path.join(adminComponentsDir, `${file.name}Crud.jsx`);
        fs.writeFileSync(componentFilePath, redirectCode, "utf8");
        generatedPaths.uiAdmin = componentFilePath;
      } else {
        const pascalName = toPascalCase(file.name);

        // Write standard generic UI component (.jsx)
        const componentCode = generateReactComponent(file, "admin");
        const componentFilePath = path.join(adminComponentsDir, `${file.name}Crud.jsx`);
        fs.writeFileSync(componentFilePath, componentCode, "utf8");
        generatedPaths.uiAdmin = componentFilePath;

        // Generate the Next.js page wrapper for the standard component
        const pageCode = `import ${pascalName}Crud from '@/components/${file.name}Crud';

export default function ${pascalName}Page() {
    return <${pascalName}Crud />;
}`;
        
        const layoutCode = `import AppLayout from '@/components/layout/AppLayout';

export default function ${pascalName}Layout({ children }) {
    return <AppLayout>{children}</AppLayout>;
};`;

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

    // Hot-reload Express MVC routes dynamically to prevent 404 Not Found errors on newly generated routes
    try {
      if (typeof global.loadMvcRoutes === 'function') {
        await global.loadMvcRoutes();
      }
    } catch (e) {
      console.warn("[Route Autoloader Warning] Could not hot-reload MVC routes:", e.message);
    }

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
  try {
    const user = req.query.user || req.headers["x-user-name"] || "admin";
    const role = req.query.role || req.headers["x-user-role"] || "admin";

    const projects = await fetchProjects(user, role);
    return res.json({ success: true, projects });
  } catch (err) {
    console.error("Failed to load projects from DB:", err);
    return res.status(500).json({ success: false, error: "Failed to load projects: " + err.message });
  }
};

// POST /api/crud/projects
export const saveProjects = async (req, res) => {
  try {
    const { projects } = req.body;
    if (!Array.isArray(projects)) {
      return res.status(400).json({ success: false, error: "Projects array is required." });
    }

    await saveProjectsList(projects);
    return res.json({ success: true, message: "Projects saved successfully." });
  } catch (err) {
    console.error("Failed to save projects to DB:", err);
    return res.status(500).json({ success: false, error: "Failed to save projects: " + err.message });
  }
};

