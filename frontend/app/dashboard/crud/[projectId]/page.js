"use client";
"use strict";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { getProjectsForUser, saveProjectsForUser } from "../../../utils/projectStorage";
import { databaseService } from "../../../../services/databaseService";
import { crudService } from "../../../../services/crudService";
import { useToast } from "../../../context/ToastContext";
export default function CrudFilesListPage() {
  const { showToast } = useToast();
  const router = useRouter();
  const params = useParams();
  const projectId = params?.projectId;
  const [project, setProject] = useState(null);
  const [allProjects, setAllProjects] = useState([]);
  const [currentUser, setCurrentUser] = useState("");
  const [userRole, setUserRole] = useState("user");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [updatingFileId, setUpdatingFileId] = useState(null);

  const handleQuickUpdateModule = async (file) => {
    if (!project || !file) return;
    setUpdatingFileId(file.id);
    try {
      const res = await crudService.generateCrud(project, file);
      if (res && res.success === false) {
        showToast(`Failed to update module "${file.name}": ` + (res.error || res.message || "Server error"), "error");
      } else {
        showToast(`Module "${file.name}" updated successfully!`, "success");
      }
    } catch (err) {
      showToast(`Failed to update module "${file.name}": ` + err.message, "error");
    } finally {
      setUpdatingFileId(null);
    }
  };
  const [searchQuery, setSearchQuery] = useState("");
  const [fileName, setFileName] = useState("");
  const [tableName, setTableName] = useState("");
  const [availableTables, setAvailableTables] = useState([]);
  const [selectedImportTable, setSelectedImportTable] = useState("");
  const [premiumType, setPremiumType] = useState("default");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState(null);

  // Edit CRUD File State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingFile, setEditingFile] = useState(null);
  const [editFileName, setEditFileName] = useState("");
  const [editTableName, setEditTableName] = useState("");
  const [editPremiumType, setEditPremiumType] = useState("default");
  const [editResetColumns, setEditResetColumns] = useState(false);

  // Helper: Get standard template columns
  const getTemplateColumns = (type) => {
    if (type === "categories") {
      return [
        { id: "col_id_" + Date.now(), name: "id", type: "number", isRequired: false, isUnique: true, isListCol: true, isFormCol: false, index: "PRIMARY KEY", isPrimaryKey: true, isAutoIncrement: true },
        { id: "col_name_" + Date.now(), name: "name", type: "text", isRequired: true, isUnique: false, isListCol: true, isFormCol: true },
        { id: "col_desc_" + Date.now(), name: "description", type: "textarea", isRequired: false, isUnique: false, isListCol: false, isFormCol: true },
        { id: "col_parent_" + Date.now(), name: "parent_id", type: "select", selectType: "table", selectLookupTable: "categories", selectLookupValue: "id", selectLookupLabel: "name", isRequired: false, isUnique: false, isListCol: true, isFormCol: true },
        { id: "col_photo_" + Date.now(), name: "image_url", type: "file", isRequired: false, isUnique: false, isListCol: true, isFormCol: true }
      ];
    } else if (type === "portfolio") {
      return [
        { id: "col_id_" + Date.now(), name: "id", type: "number", isRequired: false, isUnique: true, isListCol: true, isFormCol: false, index: "PRIMARY KEY", isPrimaryKey: true, isAutoIncrement: true },
        { id: "col_title_" + Date.now(), name: "title", type: "text", isRequired: true, isUnique: false, isListCol: true, isFormCol: true },
        { id: "col_desc_" + Date.now(), name: "description", type: "textarea", isRequired: false, isUnique: false, isListCol: false, isFormCol: true },
        { id: "col_cat_" + Date.now(), name: "category", type: "text", isRequired: false, isUnique: false, isListCol: true, isFormCol: true },
        { id: "col_link_" + Date.now(), name: "button_link", type: "text", isRequired: false, isUnique: false, isListCol: true, isFormCol: true },
        { id: "col_img_" + Date.now(), name: "image_url", type: "file", isRequired: false, isUnique: false, isListCol: true, isFormCol: true }
      ];
    } else if (type === "admins") {
      return [
        { id: "col_id_" + Date.now(), name: "id", type: "number", isRequired: false, isUnique: true, isListCol: true, isFormCol: false, index: "PRIMARY KEY", isPrimaryKey: true, isAutoIncrement: true },
        { id: "col_fname_" + Date.now(), name: "full_name", type: "text", isRequired: true, isUnique: false, isListCol: true, isFormCol: true },
        { id: "col_email_" + Date.now(), name: "email", type: "text", isRequired: true, isUnique: true, isListCol: true, isFormCol: true },
        { id: "col_phone_" + Date.now(), name: "phone", type: "text", isRequired: true, isUnique: false, isListCol: true, isFormCol: true },
        { id: "col_pass_" + Date.now(), name: "password", type: "password", isRequired: true, isUnique: false, isListCol: false, isFormCol: true }
      ];
    } else if (type === "master-form") {
      return [
        { id: "col_id_" + Date.now(), name: "id", type: "number", isRequired: false, isUnique: true, isListCol: true, isFormCol: false, index: "PRIMARY KEY", isPrimaryKey: true, isAutoIncrement: true },
        { id: "col_title_" + Date.now(), name: "title", type: "text", isRequired: true, isUnique: false, isListCol: true, isFormCol: true },
        { id: "col_subtitle_" + Date.now(), name: "subtitle", type: "text", isRequired: false, isUnique: false, isListCol: true, isFormCol: true },
        { id: "col_content_" + Date.now(), name: "content", type: "textarea", isRequired: false, isUnique: false, isListCol: false, isFormCol: true },
        { id: "col_status_" + Date.now(), name: "status", type: "select", selectType: "static", selectOptions: ["Active", "Inactive"], isRequired: false, isUnique: false, isListCol: true, isFormCol: true }
      ];
    } else if (type === "products" || type === "product") {
      return [
        { id: "col_id_" + Date.now(), name: "id", type: "number", isRequired: false, isUnique: true, isListCol: true, isFormCol: false, index: "PRIMARY KEY", isPrimaryKey: true, isAutoIncrement: true },
        { id: "col_name_" + Date.now(), name: "name", type: "text", isRequired: true, isUnique: false, isListCol: true, isFormCol: true },
        { id: "col_price_" + Date.now(), name: "price", type: "number", isRequired: true, isUnique: false, isListCol: true, isFormCol: true },
        { id: "col_cat_" + Date.now(), name: "categoryID", type: "select", selectType: "table", selectLookupTable: "categories", selectLookupValue: "id", selectLookupLabel: "name", isRequired: false, isUnique: false, isListCol: true, isFormCol: true },
        { id: "col_photo_" + Date.now(), name: "photo", type: "file", isRequired: false, isUnique: false, isListCol: true, isFormCol: true },
        { id: "col_desc_" + Date.now(), name: "description", type: "textarea", isRequired: false, isUnique: false, isListCol: false, isFormCol: true },
        { id: "col_slug_" + Date.now(), name: "slug", type: "text", isRequired: false, isUnique: false, isListCol: false, isFormCol: true }
      ];
    } else if (type === "orders" || type === "order") {
      return [
        { id: "col_id_" + Date.now(), name: "id", type: "number", isRequired: false, isUnique: true, isListCol: true, isFormCol: false, index: "PRIMARY KEY", isPrimaryKey: true, isAutoIncrement: true },
        { id: "col_cust_id_" + Date.now(), name: "customer_id", type: "number", isRequired: false, isUnique: false, isListCol: true, isFormCol: true },
        { id: "col_cust_" + Date.now(), name: "customer_name", type: "text", isRequired: true, isUnique: false, isListCol: true, isFormCol: true },
        { id: "col_email_" + Date.now(), name: "customer_email", type: "text", isRequired: false, isUnique: false, isListCol: true, isFormCol: true },
        { id: "col_amt_" + Date.now(), name: "total_amount", type: "number", isRequired: true, isUnique: false, isListCol: true, isFormCol: true },
        { id: "col_pay_" + Date.now(), name: "payment_method", type: "select", selectType: "static", selectOptions: ["COD", "Online", "Card", "UPI"], isRequired: true, isUnique: false, isListCol: true, isFormCol: true },
        { id: "col_status_" + Date.now(), name: "status", type: "select", selectType: "static", selectOptions: ["Pending", "Confirmed", "Shipped", "Delivered", "Cancelled"], isRequired: false, isUnique: false, isListCol: true, isFormCol: true }
      ];
    } else if (type === "settings" || type === "setting") {
      return [
        { id: "col_id_" + Date.now(), name: "id", type: "number", isRequired: false, isUnique: true, isListCol: true, isFormCol: false, index: "PRIMARY KEY", isPrimaryKey: true, isAutoIncrement: true },
        { id: "col_key_" + Date.now(), name: "setting_key", type: "text", isRequired: true, isUnique: true, isListCol: true, isFormCol: true },
        { id: "col_val_" + Date.now(), name: "setting_value", type: "textarea", isRequired: true, isUnique: false, isListCol: true, isFormCol: true },
        { id: "col_desc_" + Date.now(), name: "description", type: "textarea", isRequired: false, isUnique: false, isListCol: true, isFormCol: true }
      ];
    }
    return [];
  };

  // Helper: Human-friendly template label
  const getTemplateLabel = (type) => {
    switch (type) {
      case 'categories': return 'Categories Catalog';
      case 'portfolio': return 'Portfolio Cards';
      case 'admins': return 'Admin Access / Users';
      case 'master-form': return 'Master Form Inputs';
      case 'products':
      case 'product': return 'Products';
      case 'orders':
      case 'order': return 'Orders';
      case 'settings':
      case 'setting': return 'System Settings';
      default: return 'Standard CRUD';
    }
  };

  const handleOpenEditModal = (file) => {
    setEditingFile(file);
    setEditFileName(file.name || "");
    setEditTableName(file.tableName || file.name || "");
    setEditPremiumType(file.premiumType || "default");
    setEditResetColumns(false);
    setIsEditModalOpen(true);
  };

  const handleUpdateFile = (e) => {
    e.preventDefault();
    if (!project || !editingFile) return;

    const formattedName = editFileName.trim().toLowerCase().replace(/[\s-]+/g, "_");
    const formattedTable = editTableName.trim().toLowerCase().replace(/[\s-]+/g, "_") || formattedName;

    let updatedCols = [...(editingFile.columns || [])];

    // If user requested resetting columns to match the new template:
    if (editResetColumns && editPremiumType && editPremiumType !== "default") {
      const templateCols = getTemplateColumns(editPremiumType);
      if (templateCols.length > 0) {
        updatedCols = templateCols;
        const hasPk = updatedCols.some(c => c.name.toLowerCase() === "id" || c.isPrimaryKey || c.index === "PRIMARY KEY");
        if (!hasPk) {
          updatedCols = [
            { id: "col_id_" + Date.now(), name: "id", type: "number", isRequired: false, isUnique: true, isListCol: true, isFormCol: false, index: "PRIMARY KEY", isPrimaryKey: true, isAutoIncrement: true },
            ...updatedCols
          ];
        }
        const cNames = new Set(updatedCols.map(c => c.name ? c.name.toLowerCase() : ''));
        if (!cNames.has("isdeleted") && !cNames.has("is_deleted")) {
          updatedCols.push({ id: "col_isdeleted_" + Date.now(), name: "isDeleted", type: "number", isRequired: false, isUnique: false, isListCol: false, isFormCol: false });
        }
        if (!cNames.has("deletedon") && !cNames.has("deleted_on")) {
          updatedCols.push({ id: "col_deletedon_" + (Date.now() + 1), name: "deletedOn", type: "datetime", isRequired: false, isUnique: false, isListCol: false, isFormCol: false });
        }
      }
    }

    const updatedFile = {
      ...editingFile,
      name: formattedName,
      tableName: formattedTable,
      premiumType: editPremiumType,
      columns: updatedCols
    };

    const updatedFiles = (project.files || []).map(f => f.id === editingFile.id ? updatedFile : f);
    const updatedProject = { ...project, files: updatedFiles };
    const updatedProjectsList = allProjects.map(p => p.id === projectId ? updatedProject : p);

    setProject(updatedProject);
    setAllProjects(updatedProjectsList);
    saveProjectsForUser(updatedProjectsList, currentUser, userRole);

    setIsEditModalOpen(false);
    setEditingFile(null);
  };

  const fetchAvailableTables = async (dbName) => {
    try {
      const data = await databaseService.getTables(dbName);
      if (data.success && data.tables) {
        setAvailableTables(data.tables.map((t) => t.name));
      }
    } catch (err) {
      console.error("Failed to fetch tables for import:", err);
    }
  };
  useEffect(() => {
    const user = localStorage.getItem("currentUser") || "";
    const role = localStorage.getItem("currentUserRole") || "user";
    setCurrentUser(user);
    setUserRole(role);

    const loadData = () => {
      const projs = getProjectsForUser(user, role);
      setAllProjects(projs);
      const found = projs.find((p) => p.id === projectId);
      if (found) {
        setProject(found);
        if (found.databaseName) {
          fetchAvailableTables(found.databaseName);
        }
      }
    };

    loadData();

    window.addEventListener('projects_synced', loadData);
    return () => {
      window.removeEventListener('projects_synced', loadData);
    };
  }, [projectId]);
  const handleCreateFile = async (e) => {
    e.preventDefault();
    if (!project || !fileName.trim()) return;
    const formattedFileName = fileName.trim().toLowerCase().replace(/[\s-]+/g, "_");
    const formattedTableName = tableName.trim().toLowerCase().replace(/[\s-]+/g, "_") || selectedImportTable || formattedFileName;
    let columns = [];
    if (premiumType && premiumType !== "default") {
      columns = getTemplateColumns(premiumType);
    } else if (selectedImportTable) {
      try {
        const data = await databaseService.getTables(project.databaseName);
        if (data.success && data.tables) {
          const matchedTbl = data.tables.find((t) => t.name === selectedImportTable);
          if (matchedTbl && matchedTbl.columns) {
            columns = matchedTbl.columns.map((c) => {
              let mappedType = "text";
              const lowerName = c.name.toLowerCase();
              const lowerType = c.type.toLowerCase();

              const isPk = c.index === "PRIMARY" || c.index === "PRIMARY KEY" || c.isPrimaryKey || lowerName === "id";
              const isFk = lowerName.endsWith("_id") && lowerName !== "id";

              if (isPk) {
                mappedType = "number";
              } else if (isFk) {
                mappedType = "select";
              } else if (lowerName.includes("price") || lowerName.includes("amount") || lowerName.includes("cost") || lowerName.includes("stock") || lowerName.includes("qty") || lowerType.includes("int") || lowerType.includes("decimal") || lowerType.includes("float")) {
                mappedType = "number";
              } else if (lowerName.includes("date") || lowerType.includes("date") || lowerType.includes("time")) {
                mappedType = "date";
              } else if (lowerName.includes("desc") || lowerName.includes("content") || lowerType.includes("text")) {
                mappedType = "textarea";
              } else if (lowerName.includes("image") || lowerName.includes("photo") || lowerName.includes("avatar") || lowerName.includes("file")) {
                mappedType = "file";
              } else if (lowerName.includes("is_") || lowerName.includes("has_") || lowerName.includes("active") || lowerType.includes("bit") || lowerType.includes("boolean") || lowerType.includes("tinyint")) {
                mappedType = "checkbox";
              }

              const inferredLookupTable = isFk ? lowerName.replace(/_id$/, "s") : "";

              return {
                id: "col_" + Math.random().toString(36).substr(2, 9),
                name: c.name,
                type: mappedType,
                isRequired: isPk ? false : (lowerName === "name" || lowerName === "title" || lowerName === "price"),
                isUnique: c.index === "UNIQUE" || isPk,
                isListCol: !lowerName.includes("desc") && !lowerName.includes("content") && !["updated_at", "deletedon", "modifiedon"].includes(lowerName),
                isFormCol: !isPk && !["created_at", "updated_at", "created_on", "updated_on", "deletedon", "deleted_on", "deleted_at", "isdeleted", "modified", "modified_on", "modified_at", "created_by"].includes(lowerName),
                index: isPk ? "PRIMARY KEY" : (c.index || ""),
                isPrimaryKey: isPk,
                isAutoIncrement: isPk,
                selectType: isFk ? "table" : "static",
                selectLookupTable: inferredLookupTable,
                selectLookupValue: "id",
                selectLookupLabel: "name"
              };
            });
          }
        }
      } catch (err) {
        console.error("Failed to import table columns", err);
      }
    }


    // Default fallback columns if no columns specified
    if (columns.length === 0) {
      columns = [
        { id: "col_1_" + Date.now(), name: "id", type: "number", isRequired: false, isUnique: true, isListCol: true, isFormCol: false, index: "PRIMARY KEY", isPrimaryKey: true, isAutoIncrement: true },
        { id: "col_2_" + Date.now(), name: "title", type: "text", isRequired: true, isUnique: false, isListCol: true, isFormCol: true },
        { id: "col_3_" + Date.now(), name: "description", type: "textarea", isRequired: false, isUnique: false, isListCol: false, isFormCol: true }
      ];
    }

    // Smart Auto-Protection: Ensure an 'id' Primary Key column ALWAYS exists at index 0
    const hasPkColumn = columns.some(c => c.name.toLowerCase() === "id" || c.isPrimaryKey || c.index === "PRIMARY KEY");
    if (!hasPkColumn) {
      const defaultIdCol = {
        id: "col_id_" + Date.now(),
        name: "id",
        type: "number",
        isRequired: false,
        isUnique: true,
        isListCol: true,
        isFormCol: false,
        index: "PRIMARY KEY",
        isPrimaryKey: true,
        isAutoIncrement: true
      };
      columns = [defaultIdCol, ...columns];
    }

    // Auto-Ensure Audit & Soft Delete Columns exist in the schema
    const colNamesSet = new Set(columns.map(c => c.name ? c.name.toLowerCase() : ''));
    if (!colNamesSet.has("isdeleted") && !colNamesSet.has("is_deleted")) {
      columns.push({
        id: "col_isdeleted_" + Date.now(),
        name: "isDeleted",
        type: "number",
        isRequired: false,
        isUnique: false,
        isListCol: false,
        isFormCol: false
      });
    }
    if (!colNamesSet.has("deletedon") && !colNamesSet.has("deleted_on")) {
      columns.push({
        id: "col_deletedon_" + (Date.now() + 1),
        name: "deletedOn",
        type: "datetime",
        isRequired: false,
        isUnique: false,
        isListCol: false,
        isFormCol: false
      });
    }

    const newFile = {
      id: "file_" + Date.now(),
      name: formattedFileName,
      tableName: formattedTableName,
      dbConnectCode: `// Connect to ${project.databaseName}`,
      createdAt: (/* @__PURE__ */ new Date()).toLocaleDateString(),
      premiumType,
      columns,
      settings: {
        createUsingAi: false,
        showCreated: true,
        showModified: true,
        viewButton: true,
        editButton: true,
        duplicateButton: false,
        deleteButton: true,
        excelImport: premiumType !== "admins",
        excelExport: premiumType !== "admins",
        recycleBin: false,
        apiTarget: "admin"
      }
    };
    const updatedFiles = [...project.files || [], newFile];
    const updatedProject = { ...project, files: updatedFiles };
    const updatedProjectsList = allProjects.map((p) => p.id === projectId ? updatedProject : p);
    setProject(updatedProject);
    setAllProjects(updatedProjectsList);
    saveProjectsForUser(updatedProjectsList, currentUser, userRole);
    setIsModalOpen(false);
    setFileName("");
    setTableName("");
    setSelectedImportTable("");
    setPremiumType("default");
  };
  const confirmDeleteFile = (fileId, name) => {
    setFileToDelete({ id: fileId, name });
    setIsDeleteModalOpen(true);
  };
  const handleDeleteFile = () => {
    if (!project || !fileToDelete) return;
    const updatedFiles = project.files.map((f) => {
      if (f.id === fileToDelete.id) {
        return { ...f, isDeleted: true, deletedAt: Date.now() };
      }
      return f;
    });
    const updatedProject = { ...project, files: updatedFiles };
    const updatedProjectsList = allProjects.map((p) => p.id === projectId ? updatedProject : p);
    setProject(updatedProject);
    setAllProjects(updatedProjectsList);
    saveProjectsForUser(updatedProjectsList, currentUser, userRole);
    setIsDeleteModalOpen(false);
    setFileToDelete(null);
  };
  if (!project) {
    return <div style={{ padding: "24px", color: "var(--text-primary)" }}>Loading project details...</div>;
  }
  return <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      
      {
    /* SUB NAV BAR BANNER */
  }
      <div style={{ height: "40px", backgroundColor: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", color: "white", fontSize: "13px", fontWeight: "600", flexShrink: 0, boxShadow: "0 2px 6px rgba(0,0,0,0.05)" }}>
        <span style={{ fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.8px" }}>CRUD Builder</span>
        <span style={{ color: "rgba(255,255,255,0.8)" }}>Project / {project.name}</span>
      </div>

      <main style={{ flex: 1, padding: "24px", overflowY: "auto", backgroundColor: "var(--bg-primary)" }}>
        <div style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "24px", boxShadow: "var(--shadow-md)" }}>
          
          <div style={{ marginBottom: "16px" }}>
            <button
    onClick={() => router.push("/dashboard/crud")}
    style={{ background: "none", border: "none", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", color: "var(--text-muted)", fontWeight: "bold", fontSize: "14px", padding: 0 }}
  >
              ← Back to Projects
            </button>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "16px", marginBottom: "20px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "var(--text-primary)" }}>Files in project &quot;{project.name}&quot;:</h2>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => setIsModalOpen(true)}
                style={{ backgroundColor: "#3b82f6", color: "white", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: "bold" }}
              >
                Add CRUD File
              </button>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", fontSize: "14px", color: "var(--text-muted)" }}>
            <div>
              Show <select style={{ padding: "6px 12px", border: "1px solid var(--border-color)", borderRadius: "4px", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)" }}><option>50</option></select> entries
            </div>
            <div>Search: <input type="text" style={{ padding: "6px 12px", border: "1px solid var(--border-color)", borderRadius: "4px", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", outline: "none" }} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div>
          </div>

          <div style={{ width: "100%", overflowX: "auto", border: "1px solid var(--border-color)", borderRadius: "8px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border-color)", backgroundColor: "var(--bg-tertiary)" }}>
                  <th style={{ padding: "14px 16px", color: "var(--text-secondary)", fontWeight: 600, width: "60px" }}>Sr</th>
                  <th style={{ padding: "14px 16px", color: "var(--text-secondary)", fontWeight: 600 }}>File Name</th>
                  <th style={{ padding: "14px 16px", color: "var(--text-secondary)", fontWeight: 600 }}>Database Table</th>
                  <th style={{ padding: "14px 16px", color: "var(--text-secondary)", fontWeight: 600 }}>Template Mapping</th>
                  <th style={{ padding: "14px 16px", color: "var(--text-secondary)", fontWeight: 600 }}>Created Date</th>
                  <th style={{ padding: "14px 16px", color: "var(--text-secondary)", fontWeight: 600, width: "320px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {!project.files || project.files.filter((f) => !f.isDeleted).length === 0 ? <tr>
                    <td colSpan={6} style={{ padding: "30px", textAlign: "center", color: "var(--text-muted)" }}>
                      No files created yet. Click &quot;Add CRUD File&quot; to start!
                    </td>
                  </tr> : project.files.filter((file) => !file.isDeleted && file.name.toLowerCase().includes(searchQuery.toLowerCase())).map((file, idx) => <tr key={file.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                        <td style={{ padding: "14px 16px", color: "var(--text-primary)" }}>{idx + 1}</td>
                        <td style={{ padding: "14px 16px" }}>
                          <button
                            onClick={() => router.push(`/dashboard/crud/${projectId}/${file.id}`)}
                            style={{ background: "none", border: "none", color: "#0ea5e9", textDecoration: "underline", cursor: "pointer", fontSize: "14px", fontWeight: "500", padding: 0 }}
                          >
                            {file.name}
                          </button>
                        </td>
                        <td style={{ padding: "14px 16px", color: "var(--text-primary)" }}>{file.tableName}</td>
                        <td style={{ padding: "14px 16px" }}>
                          <span style={{ 
                            display: "inline-block", 
                            padding: "3px 10px", 
                            borderRadius: "12px", 
                            fontSize: "12px", 
                            fontWeight: 600,
                            backgroundColor: file.premiumType === 'categories' ? 'rgba(16, 185, 129, 0.15)' : file.premiumType === 'portfolio' ? 'rgba(59, 130, 246, 0.15)' : file.premiumType === 'products' ? 'rgba(245, 158, 11, 0.15)' : file.premiumType === 'master-form' ? 'rgba(168, 85, 247, 0.15)' : (file.premiumType === 'settings' || file.premiumType === 'setting') ? 'rgba(14, 165, 233, 0.15)' : 'rgba(100, 116, 139, 0.15)',
                            color: file.premiumType === 'categories' ? '#10b981' : file.premiumType === 'portfolio' ? '#3b82f6' : file.premiumType === 'products' ? '#f59e0b' : file.premiumType === 'master-form' ? '#a855f7' : (file.premiumType === 'settings' || file.premiumType === 'setting') ? '#0ea5e9' : 'var(--text-muted)'
                          }}>
                            {getTemplateLabel(file.premiumType)}
                          </span>
                        </td>
                        <td style={{ padding: "14px 16px", color: "var(--text-primary)" }}>{file.createdAt}</td>
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ display: "flex", gap: "10px", alignItems: "center", whiteSpace: "nowrap" }}>
                            <button
                              onClick={() => handleOpenEditModal(file)}
                              style={{ border: "none", background: "none", cursor: "pointer", padding: "6px", color: "#3b82f6", display: "inline-flex", alignItems: "center", gap: "4px", fontWeight: "600" }}
                              title="Edit Module / Table & Template Mapping"
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                              Edit CRUD
                            </button>
                            <button
                              onClick={() => router.push(`/dashboard/crud/${projectId}/${file.id}`)}
                              style={{ border: "none", background: "none", cursor: "pointer", padding: "6px", color: "#f59e0b", display: "inline-flex", alignItems: "center", gap: "4px", fontWeight: "600" }}
                              title="Manage Schema & Fields"
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <circle cx="12" cy="12" r="3" />
                                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l-.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                              </svg>
                              Manage Schema
                            </button>
                            <button
                              onClick={() => handleQuickUpdateModule(file)}
                              disabled={updatingFileId === file.id}
                              style={{
                                border: "none",
                                background: updatingFileId === file.id ? "rgba(16, 185, 129, 0.15)" : "none",
                                cursor: updatingFileId === file.id ? "not-allowed" : "pointer",
                                padding: "6px 8px",
                                borderRadius: "6px",
                                color: "#10b981",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                fontWeight: "600",
                                transition: "all 0.2s ease"
                              }}
                              title="Quick Update / Regenerate module code without entering settings"
                            >
                              {updatingFileId === file.id ? (
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "spin 1s linear infinite" }}>
                                  <line x1="12" y1="2" x2="12" y2="6" />
                                  <line x1="12" y1="18" x2="12" y2="22" />
                                  <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
                                  <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
                                  <line x1="2" y1="12" x2="6" y2="12" />
                                  <line x1="18" y1="12" x2="22" y2="12" />
                                  <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
                                  <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
                                </svg>
                              ) : (
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                                </svg>
                              )}
                              {updatingFileId === file.id ? "Updating..." : "Update"}
                            </button>
                            <button
                              onClick={() => confirmDeleteFile(file.id, file.name)}
                              style={{ border: "none", background: "none", cursor: "pointer", padding: "6px", color: "#ef4444", display: "inline-flex", alignItems: "center" }}
                              title="Delete File"
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>)}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {
    /* ==================== MODAL: ADD CRUD FILE ==================== */
  }
      {isModalOpen && <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1e3 }}>
          <div style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "8px", width: "600px", maxWidth: "90vw", boxShadow: "var(--shadow-lg)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid var(--border-color)" }}>
              <h3 style={{ fontWeight: "bold", fontSize: "16px", color: "var(--text-primary)" }}>Add CRUD File</h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "var(--text-muted)" }}>✕</button>
            </div>
            <form onSubmit={handleCreateFile}>
              <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "18px" }}>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-muted)" }}>File / Module Name (e.g. Products):</label>
                  <input
    type="text"
    placeholder="Products"
    required
    value={fileName}
    onChange={(e) => setFileName(e.target.value.toLowerCase().replace(/[\s-]+/g, "_"))}
    style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border-color)", borderRadius: "6px", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-muted)" }}>Database Table Name:</label>
                  {availableTables.length > 0 ? <select
    value={tableName}
    required
    onChange={(e) => {
      const val = e.target.value;
      setTableName(val);
      setSelectedImportTable(val);
    }}
    style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border-color)", borderRadius: "6px", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
  >
                      <option value="">-- Select Database Table --</option>
                      {availableTables.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select> : <input
    type="text"
    placeholder="product"
    value={tableName}
    onChange={(e) => setTableName(e.target.value.toLowerCase().replace(/[\s-]+/g, "_"))}
    style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border-color)", borderRadius: "6px", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
  />}
                </div>

                {availableTables.length > 0 && <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-muted)" }}>Import Columns from Database Table:</label>
                    <select
    value={selectedImportTable}
    onChange={(e) => setSelectedImportTable(e.target.value)}
    style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border-color)", borderRadius: "6px", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
  >
                      <option value="">-- Do Not Import (Create Sample Columns) --</option>
                      {availableTables.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>}

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-muted)" }}>Map to Premium Page Template:</label>
                  <select
    value={premiumType}
    onChange={(e) => setPremiumType(e.target.value)}
    style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border-color)", borderRadius: "6px", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
  >
                    <option value="default">Default Standard CRUD</option>
                    <option value="master-form">Master Form Inputs</option>
                    <option value="portfolio">Portfolio Cards</option>
                    <option value="categories">Categories Folder</option>
                    <option value="admins">Admins System</option>
                    <option value="products">Products Catalog</option>
                    <option value="orders">Orders System</option>
                    <option value="settings">System Settings</option>
                  </select>
                </div>

              </div>
              
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", padding: "16px 24px", borderTop: "1px solid var(--border-color)" }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: "8px 16px", borderRadius: "6px", border: "1px solid var(--border-color)", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", cursor: "pointer", fontSize: "14px" }}>Close</button>
                <button type="submit" style={{ padding: "8px 16px", borderRadius: "6px", border: "none", backgroundColor: "#3b82f6", color: "white", cursor: "pointer", fontSize: "14px", fontWeight: "bold" }}>Create File</button>
              </div>
            </form>
          </div>
        </div>}

      {/* ==================== MODAL: EDIT CRUD FILE ==================== */}
      {isEditModalOpen && editingFile && <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1e3 }}>
          <div style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "8px", width: "600px", maxWidth: "90vw", boxShadow: "var(--shadow-lg)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid var(--border-color)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                <h3 style={{ fontWeight: "bold", fontSize: "16px", color: "var(--text-primary)", margin: 0 }}>Edit CRUD File &amp; Mapping</h3>
              </div>
              <button onClick={() => { setIsEditModalOpen(false); setEditingFile(null); }} style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "var(--text-muted)" }}>✕</button>
            </div>
            <form onSubmit={handleUpdateFile}>
              <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "18px" }}>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-muted)" }}>File / Module Name (e.g. categories, portfolio_cards):</label>
                  <input
                    type="text"
                    required
                    value={editFileName}
                    onChange={(e) => setEditFileName(e.target.value.toLowerCase().replace(/[\s-]+/g, "_"))}
                    style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border-color)", borderRadius: "6px", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
                  />
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>URL path will become: <code style={{ color: "#3b82f6" }}>/{editFileName}</code></span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-muted)" }}>Database Table Name:</label>
                  <input
                    type="text"
                    required
                    value={editTableName}
                    onChange={(e) => setEditTableName(e.target.value.toLowerCase().replace(/[\s-]+/g, "_"))}
                    style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border-color)", borderRadius: "6px", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
                  />
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>MySQL table name: <code style={{ color: "#10b981" }}>{editTableName}</code></span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-muted)" }}>Map to Premium Page Template:</label>
                  <select
                    value={editPremiumType}
                    onChange={(e) => setEditPremiumType(e.target.value)}
                    style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border-color)", borderRadius: "6px", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
                  >
                    <option value="default">Default Standard CRUD</option>
                    <option value="master-form">Master Form Inputs</option>
                    <option value="portfolio">Portfolio Cards</option>
                    <option value="categories">Categories Folder / Catalog</option>
                    <option value="admins">Admins System</option>
                    <option value="products">Products Catalog</option>
                    <option value="orders">Orders System</option>
                    <option value="settings">System Settings</option>
                  </select>
                </div>

                <div style={{ padding: "12px 14px", borderRadius: "6px", backgroundColor: "var(--bg-tertiary)", border: "1px solid var(--border-color)", display: "flex", alignItems: "flex-start", gap: "10px" }}>
                  <input 
                    type="checkbox" 
                    id="resetColsCheck" 
                    checked={editResetColumns} 
                    onChange={(e) => setEditResetColumns(e.target.checked)}
                    style={{ marginTop: "3px", cursor: "pointer" }}
                  />
                  <label htmlFor="resetColsCheck" style={{ fontSize: "13px", color: "var(--text-primary)", cursor: "pointer", lineHeight: "1.4" }}>
                    <strong>Reset &amp; sync schema columns</strong> to match the selected template standard fields (recommended if switching between different templates like Categories ➔ Portfolio Cards).
                  </label>
                </div>

              </div>
              
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", padding: "16px 24px", borderTop: "1px solid var(--border-color)" }}>
                <button 
                  type="button" 
                  onClick={() => { setIsEditModalOpen(false); setEditingFile(null); }} 
                  style={{ padding: "8px 16px", borderRadius: "6px", border: "1px solid var(--border-color)", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", cursor: "pointer", fontSize: "14px" }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  style={{ padding: "8px 16px", borderRadius: "6px", border: "none", backgroundColor: "#3b82f6", color: "white", cursor: "pointer", fontSize: "14px", fontWeight: "bold" }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>}

      {/* ==================== MODAL: DELETE FILE CONFIRMATION ==================== */}
      {isDeleteModalOpen && fileToDelete && <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1e3 }}>
          <div style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "12px", width: "450px", maxWidth: "90vw", boxShadow: "var(--shadow-lg)", overflow: "hidden" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "30px 24px", textAlign: "center" }}>
              <div style={{ width: "56px", height: "56px", borderRadius: "50%", backgroundColor: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", color: "#ef4444", marginBottom: "20px" }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <h3 style={{ margin: "0 0 8px 0", fontSize: "18px", fontWeight: "bold", color: "var(--text-primary)" }}>Delete CRUD File</h3>
              <p style={{ margin: 0, fontSize: "14px", color: "var(--text-muted)", lineHeight: "1.5" }}>
                Are you sure you want to delete the CRUD file <strong style={{ color: "var(--text-primary)" }}>{fileToDelete.name}</strong>? This action is permanent and all configurations for this file will be lost forever.
              </p>
            </div>
            
            <div style={{ display: "flex", borderTop: "1px solid var(--border-color)", backgroundColor: "var(--bg-tertiary)" }}>
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setFileToDelete(null);
                }}
                style={{ flex: 1, padding: "16px", background: "none", border: "none", borderRight: "1px solid var(--border-color)", cursor: "pointer", fontSize: "14px", fontWeight: "600", color: "var(--text-secondary)", outline: "none" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteFile}
                style={{ flex: 1, padding: "16px", background: "none", border: "none", cursor: "pointer", fontSize: "14px", fontWeight: "bold", color: "#ef4444", outline: "none" }}
              >
                Delete File
              </button>
            </div>
          </div>
        </div>}

    </div>;
}
