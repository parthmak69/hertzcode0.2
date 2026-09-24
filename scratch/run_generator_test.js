import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Import controller functions from hertzcode0.2 backend
import { initializeProject, generateFiles } from 'c:/Users/Faizan/Desktop/hertzcode0.2/backend/controllers/crudController.js';

const targetDir = 'C:/Users/Faizan/Desktop/test2';

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const project = {
  id: 'proj_test2_' + Date.now(),
  name: 'Test Store Project',
  databaseName: 'ecommerce_test_db',
  directory: targetDir,
  themeColor: '#3b82f6',
  files: []
};

// Define 5 test files/schemas representing various feature templates
const fileCategories = {
  id: 'file_cat_1',
  name: 'categories',
  tableName: 'categories',
  premiumType: 'categories',
  columns: [
    { id: 'c1', name: 'id', type: 'number', isPrimaryKey: true, index: 'PRIMARY KEY', isAutoIncrement: true },
    { id: 'c2', name: 'name', type: 'text', isRequired: true },
    { id: 'c3', name: 'description', type: 'textarea' }
  ]
};

const filePortfolio = {
  id: 'file_port_1',
  name: 'portfolio',
  tableName: 'portfolio',
  premiumType: 'portfolio',
  columns: [
    { id: 'p1', name: 'id', type: 'number', isPrimaryKey: true, index: 'PRIMARY KEY', isAutoIncrement: true },
    { id: 'p2', name: 'title', type: 'text', isRequired: true },
    { id: 'p3', name: 'image', type: 'file' },
    { id: 'p4', name: 'description', type: 'textarea' }
  ]
};

const fileMasterForm = {
  id: 'file_mf_1',
  name: 'custom_form',
  tableName: 'custom_form',
  premiumType: 'master-form',
  columns: [
    { id: 'm1', name: 'id', type: 'number', isPrimaryKey: true, index: 'PRIMARY KEY', isAutoIncrement: true },
    { id: 'm2', name: 'full_name', type: 'text', isRequired: true },
    { id: 'm3', name: 'email', type: 'email' },
    { id: 'm4', name: 'bio', type: 'textarea' }
  ]
};

const fileAdmins = {
  id: 'file_adm_1',
  name: 'admins',
  tableName: 'admins',
  premiumType: 'admins',
  columns: [
    { id: 'a1', name: 'id', type: 'number', isPrimaryKey: true, index: 'PRIMARY KEY', isAutoIncrement: true },
    { id: 'a2', name: 'full_name', type: 'text', isRequired: true },
    { id: 'a3', name: 'email', type: 'email', isRequired: true },
    { id: 'a4', name: 'is_active', type: 'checkbox' }
  ]
};

const fileProducts = {
  id: 'file_prod_1',
  name: 'products',
  tableName: 'products',
  premiumType: 'default',
  columns: [
    { id: 'pr1', name: 'id', type: 'number', isPrimaryKey: true, index: 'PRIMARY KEY', isAutoIncrement: true },
    { id: 'pr2', name: 'name', type: 'text', isRequired: true },
    { id: 'pr3', name: 'price', type: 'number', isRequired: true },
    { 
      id: 'pr4', 
      name: 'category_id', 
      type: 'select', 
      selectType: 'table', 
      selectLookupTable: 'categories', 
      selectLookupValue: 'id', 
      selectLookupLabel: 'name' 
    },
    { id: 'pr5', name: 'description', type: 'textarea' }
  ]
};

project.files = [fileCategories, filePortfolio, fileMasterForm, fileAdmins, fileProducts];

const mockRes = () => {
  const res = {};
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (data) => { res.jsonData = data; return res; };
  return res;
};

async function runTest() {
  console.log('=== Initializing project in C:/Users/Faizan/Desktop/test2 ===');
  const reqInit = { body: { project } };
  const resInit = mockRes();
  await initializeProject(reqInit, resInit);
  console.log('Initialize Result:', resInit.jsonData);

  for (const file of project.files) {
    console.log(`\n=== Generating files for schema: ${file.name} (premiumType: ${file.premiumType}) ===`);
    const reqGen = { body: { project, file } };
    const resGen = mockRes();
    await generateFiles(reqGen, resGen);
    console.log(`Generate ${file.name} Result:`, resGen.jsonData);
  }

  console.log('\n=== Generation Complete! Inspecting generated folder C:/Users/Faizan/Desktop/test2 ===');
}

runTest().catch(err => console.error('Test execution error:', err));
