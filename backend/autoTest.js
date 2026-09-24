import { initializeProject, generateFiles } from './controllers/crudController.js';
import path from 'path';
import fs from 'fs';

const targetDir = 'C:/Users/Faizan/Desktop/hertzcode-test-project';

const project = {
  id: 'proj_ecommerce_test',
  name: 'EcommerceTest',
  directory: targetDir,
  themeColor: '#3b82f6',
  files: [
    {
      id: 'file_users',
      name: 'users',
      premiumType: 'admins',
      columns: [
        { name: 'id', type: 'number', isPrimary: true, isRequired: false, isFormCol: false, isListCol: true },
        { name: 'name', type: 'text', isRequired: true, isFormCol: true, isListCol: true },
        { name: 'email', type: 'email', isRequired: true, isFormCol: true, isListCol: true },
        { name: 'password', type: 'text', isRequired: true, isFormCol: true, isListCol: false }
      ]
    },
    {
      id: 'file_categories',
      name: 'categories',
      premiumType: 'default',
      columns: [
        { name: 'id', type: 'number', isPrimary: true, isRequired: false, isFormCol: false, isListCol: true },
        { name: 'name', type: 'text', isRequired: true, isFormCol: true, isListCol: true },
        { name: 'is_active', type: 'checkbox', isRequired: false, isFormCol: true, isListCol: true }
      ]
    },
    {
      id: 'file_products',
      name: 'products',
      premiumType: 'products',
      columns: [
        { name: 'id', type: 'number', isPrimary: true, isRequired: false, isFormCol: false, isListCol: true },
        { name: 'category_id', type: 'select', selectType: 'table', selectLookupTable: 'categories', selectLookupValue: 'id', selectLookupLabel: 'name', isRequired: true, isFormCol: true, isListCol: true },
        { name: 'title', type: 'text', isRequired: true, isFormCol: true, isListCol: true },
        { name: 'description', type: 'editor', isRequired: false, isFormCol: true, isListCol: false },
        { name: 'price', type: 'range', isRequired: true, isFormCol: true, isListCol: true },
        { name: 'in_stock', type: 'checkbox', isRequired: false, isFormCol: true, isListCol: true },
        { name: 'launch_date', type: 'date', isRequired: true, isFormCol: true, isListCol: true }
      ]
    }
  ]
};

const resMock = {
  status: (code) => ({
    json: (data) => console.log(`[Response ${code}]:`, JSON.stringify(data, null, 2))
  }),
  json: (data) => console.log(`[Response 200]:`, JSON.stringify(data, null, 2))
};

async function run() {
  console.log('--- 1. Initializing Project ---');
  await initializeProject({ body: { project } }, resMock);

  console.log('\n--- 2. Generating Users ---');
  await generateFiles({ body: { project, file: project.files[0] } }, resMock);

  console.log('\n--- 3. Generating Categories ---');
  await generateFiles({ body: { project, file: project.files[1] } }, resMock);

  console.log('\n--- 4. Generating Products ---');
  await generateFiles({ body: { project, file: project.files[2] } }, resMock);

  console.log('\n--- 5. Verifications ---');
  const productsCrudFile = path.join(targetDir, 'admin-panel/components/productsCrud.jsx');
  if (fs.existsSync(productsCrudFile)) {
    const code = fs.readFileSync(productsCrudFile, 'utf8');
    console.log('✅ productsCrud.jsx exists.');
    console.log('Contains RichTextEditor?', code.includes('RichTextEditor'));
    console.log('Contains RangeSlider?', code.includes('RangeSlider'));
  }

  const productsControllerFile = path.join(targetDir, 'backend/controllers/admin/productsController.js');
  if (fs.existsSync(productsControllerFile)) {
    const code = fs.readFileSync(productsControllerFile, 'utf8');
    console.log('✅ productsController.js exists.');
    console.log('Contains LEFT JOIN?', code.includes('LEFT JOIN'));
  }
}

run();
