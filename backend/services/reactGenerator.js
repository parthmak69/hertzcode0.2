/**
 * React Frontend Component Code Generator Service for Next.js Admin Panel
 */
import { toPascalCase } from './expressGenerator.js';

/**
 * Generate React DataTable Component
 */
export function generateDataTableComponent(tableName, columns) {
  const pascalName = toPascalCase(tableName);
  const displayCols = columns.filter(c => !c.isPrimaryKey && c.name.toLowerCase() !== 'id');

  const headers = displayCols.map(c => `
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ${c.label || c.name}
              </th>`).join('');

  const cells = displayCols.map(c => {
    const nameLower = c.name.toLowerCase();
    const isImg = nameLower.includes('photo') || nameLower.includes('image') || nameLower.includes('pic') || nameLower.includes('avatar') || nameLower.includes('thumb') || nameLower.includes('logo');
    if (isImg) {
      return `
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {item.${c.name} ? (
                  <img src={String(item.${c.name}).startsWith('http') || String(item.${c.name}).startsWith('data:') ? item.${c.name} : (String(item.${c.name}).startsWith('/') ? item.${c.name} : '/' + item.${c.name})} alt="Preview" className="w-10 h-10 object-cover rounded-lg border border-gray-200" />
                ) : '-'}
              </td>`;
    }
    if (c.isLookupColumn) {
      return `
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {item.${c.name}_label || item.${c.name} || '-'}
              </td>`;
    }
    return `
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {String(item.${c.name} ?? '-')}
              </td>`;
  }).join('');

  return `'use client';
import React, { useState } from 'react';
import { Edit, Trash2, Eye } from 'lucide-react';

export default function ${pascalName}DataTable({ data, onEdit, onDelete, onView }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredData = data.filter(item =>
    Object.values(item).some(val =>
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <input
          type="text"
          placeholder="Search ${tableName}..."
          className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <span className="text-sm text-gray-500">Total: {filteredData.length}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>${headers}
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredData.map((item, idx) => (
              <tr key={item.id || idx} className="hover:bg-gray-50">
                ${cells}
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                  <button onClick={() => onView(item)} className="text-blue-600 hover:text-blue-900 p-1"><Eye size={16} /></button>
                  <button onClick={() => onEdit(item)} className="text-indigo-600 hover:text-indigo-900 p-1"><Edit size={16} /></button>
                  <button onClick={() => onDelete(item)} className="text-red-600 hover:text-red-900 p-1"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
`;
}

/**
 * Generate React Form Modal Component (Add / Edit)
 */
export function generateFormModalComponent(tableName, columns) {
  const pascalName = toPascalCase(tableName);
  const inputCols = columns.filter(c => !c.isPrimaryKey && c.name.toLowerCase() !== 'id');

  const lookupFetches = inputCols
    .filter(c => c.isLookupColumn && c.lookupTable)
    .map(c => `
  const [${c.name}Options, set${toPascalCase(c.name)}Options] = useState([]);
  useEffect(() => {
    fetch('/api/apiAdmin/${c.lookupTable}')
      .then(res => res.json())
      .then(res => { if (res.success) set${toPascalCase(c.name)}Options(res.data || []); });
  }, []);`).join('\n');

  const formFields = inputCols.map(c => {
    const labelName = c.label || c.name;
    if (c.isLookupColumn && c.lookupTable) {
      const displayCol = c.lookupDisplayColumn || 'name';
      return `
          <div>
            <label className="block text-sm font-medium text-gray-700">${labelName}</label>
            <select
              name="${c.name}"
              value={formData.${c.name} || ''}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md p-2 text-sm"
            >
              <option value="">Select ${labelName}</option>
              {${c.name}Options.map(opt => (
                <option key={opt.id} value={opt.id}>{opt.${displayCol} || opt.name || opt.id}</option>
              ))}
            </select>
          </div>`;
    }

    const type = (c.type || 'text').toLowerCase();
    let inputElem = `<input type="text" name="${c.name}" value={formData.${c.name} || ''} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md p-2 text-sm" />`;

    if (type.includes('number') || type.includes('int') || type.includes('price')) {
      inputElem = `<input type="number" step="any" name="${c.name}" value={formData.${c.name} || ''} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md p-2 text-sm" />`;
    } else if (type.includes('date') || type.includes('time')) {
      inputElem = `<input type="datetime-local" name="${c.name}" value={formData.${c.name} || ''} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md p-2 text-sm" />`;
    } else if (type.includes('text') || type.includes('json')) {
      inputElem = `<textarea name="${c.name}" rows="3" value={formData.${c.name} || ''} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md p-2 text-sm" />`;
    }

    return `
          <div>
            <label className="block text-sm font-medium text-gray-700">${labelName}</label>
            ${inputElem}
          </div>`;
  }).join('\n');

  return `'use client';
import React, { useState, useEffect } from 'react';

export default function ${pascalName}FormModal({ isOpen, onClose, onSubmit, initialData }) {
  const [formData, setFormData] = useState({});
  ${lookupFetches}

  useEffect(() => {
    setFormData(initialData || {});
  }, [initialData]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">{initialData ? 'Edit' : 'Add'} ${tableName}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          ${formFields}
          <div className="flex justify-end space-x-2 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-md text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
}
`;
}
