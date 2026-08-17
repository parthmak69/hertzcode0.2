
const fs = require('fs');
const path = require('path');

function copyDirRecursiveSync(src, dest) {
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
        path.join(dest, childItemName)
      );
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

console.log('Starting template migration...');

const hertzcodeTemplatesDir = path.join(__dirname, 'templates');
const oldNextAdminTemplate = path.join(hertzcodeTemplatesDir, 'next-admin-template');
const newNextAdminPanelSrc = path.join('C:', 'Users', 'Faizan', 'Desktop', 'admin', 'next-admin-panel');
const backendSrc = path.join('C:', 'Users', 'Faizan', 'Desktop', 'admin', 'backend');
const backendAuthDest = path.join(hertzcodeTemplatesDir, 'backend-auth-module');

// Step 1: Scrap old template
if (fs.existsSync(oldNextAdminTemplate)) {
    console.log('Scrapping old next-admin-template...');
    fs.rmSync(oldNextAdminTemplate, { recursive: true, force: true });
}

// Step 2: Copy new frontend template
if (fs.existsSync(newNextAdminPanelSrc)) {
    console.log('Copying new next-admin-panel as the new template...');
    copyDirRecursiveSync(newNextAdminPanelSrc, oldNextAdminTemplate); // keeping the same destination name for compatibility
} else {
    console.error('Source new admin panel not found at:', newNextAdminPanelSrc);
}

// Step 3: Extract Backend Auth Modules
if (fs.existsSync(backendSrc)) {
    console.log('Extracting Backend Auth Modules...');
    if (fs.existsSync(backendAuthDest)) {
        fs.rmSync(backendAuthDest, { recursive: true, force: true });
    }
    fs.mkdirSync(backendAuthDest, { recursive: true });
    
    // Create folders
    fs.mkdirSync(path.join(backendAuthDest, 'controllers'), { recursive: true });
    fs.mkdirSync(path.join(backendAuthDest, 'models'), { recursive: true });
    fs.mkdirSync(path.join(backendAuthDest, 'routes'), { recursive: true });
    fs.mkdirSync(path.join(backendAuthDest, 'middleware'), { recursive: true });
    fs.mkdirSync(path.join(backendAuthDest, 'utils'), { recursive: true });
    
    // Copy specific auth files
    const filesToCopy = [
        { src: 'controllers/authController.js', dest: 'controllers/authController.js' },
        { src: 'models/adminModel.js', dest: 'models/adminModel.js' },
        { src: 'middleware/authMiddleware.js', dest: 'middleware/authMiddleware.js' },
        { src: 'utils/authHelper.js', dest: 'utils/authHelper.js' },
        // If there's an auth route, we copy it. Otherwise we will assume it's created or we can copy admin routes
        // The zip likely has 'routes/admin/authRoutes.js' or similar. We copy all routes if needed, or specific ones.
    ];

    filesToCopy.forEach(file => {
        const srcFile = path.join(backendSrc, file.src);
        const destFile = path.join(backendAuthDest, file.dest);
        if (fs.existsSync(srcFile)) {
            fs.copyFileSync(srcFile, destFile);
        } else {
            console.log(`Warning: File not found: ${srcFile}`);
        }
    });

    // Also let's try to copy the auth route if it exists
    const possibleRoutes = [
        'routes/authRoutes.js',
        'routes/admin/authRoutes.js'
    ];
    possibleRoutes.forEach(routePath => {
        const srcFile = path.join(backendSrc, routePath);
        if (fs.existsSync(srcFile)) {
            fs.mkdirSync(path.dirname(path.join(backendAuthDest, routePath)), { recursive: true });
            fs.copyFileSync(srcFile, path.join(backendAuthDest, routePath));
        }
    });

} else {
    console.error('Source backend not found at:', backendSrc);
}

console.log('Migration complete!');
