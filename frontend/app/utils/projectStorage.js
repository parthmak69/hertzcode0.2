"use strict";

export function getProjectsForUser(currentUser, userRole) {
  if (!currentUser) return [];

  if (userRole === "admin") {
    // Admin loads projects of all users from localStorage keys starting with crudProjects_
    const allProjects = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("crudProjects_")) {
        try {
          const list = JSON.parse(localStorage.getItem(key)) || [];
          const owner = key.replace("crudProjects_", "");
          allProjects.push(...list.map(p => ({ ...p, owner })));
        } catch (e) {
          console.error("Failed to parse " + key, e);
        }
      }
    }
    // Also include legacy/no-prefix "crudProjects"
    const legacy = localStorage.getItem("crudProjects");
    if (legacy) {
      try {
        const list = JSON.parse(legacy) || [];
        allProjects.push(...list.map(p => ({ ...p, owner: p.owner || "admin" })));
      } catch (e) {}
    }
    // Deduplicate by project id
    const unique = [];
    const seen = new Set();
    allProjects.forEach(p => {
      if (!seen.has(p.id)) {
        seen.add(p.id);
        unique.push(p);
      }
    });
    return unique;
  } else {
    // Regular user loads only their own
    const stored = localStorage.getItem(`crudProjects_${currentUser}`);
    if (stored) {
      try {
        const list = JSON.parse(stored) || [];
        return list.map(p => ({ ...p, owner: p.owner || currentUser }));
      } catch (e) {
        console.error("Failed to parse user projects", e);
      }
    } else {
      // Fallback: If no user-specific key exists yet, check legacy "crudProjects" for owner matching
      const legacy = localStorage.getItem("crudProjects");
      if (legacy) {
        try {
          const list = JSON.parse(legacy) || [];
          const filtered = list.filter(p => p.owner === currentUser);
          if (filtered.length > 0) {
            return filtered;
          }
        } catch (e) {}
      }
    }
    return [];
  }
}

export function saveProjectsForUser(newProjects, currentUser, userRole) {
  if (!currentUser) return;

  if (userRole === "admin") {
    // Group projects by owner to save each group back to their respective user's namespace
    const byOwner = {};
    newProjects.forEach(p => {
      const owner = p.owner || "admin";
      if (!byOwner[owner]) byOwner[owner] = [];
      byOwner[owner].push(p);
    });

    // If an owner has no projects left in the updated list, clear their localStorage namespace
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("crudProjects_")) {
        const owner = key.replace("crudProjects_", "");
        if (!byOwner[owner]) {
          localStorage.setItem(key, JSON.stringify([]));
        }
      }
    }

    // Save each owner group to their respective key in localStorage
    Object.keys(byOwner).forEach(owner => {
      localStorage.setItem(`crudProjects_${owner}`, JSON.stringify(byOwner[owner]));
    });
  } else {
    // Regular user: save to their key, ensuring owner field matches currentUser
    const updated = newProjects.map(p => ({ ...p, owner: p.owner || currentUser }));
    localStorage.setItem(`crudProjects_${currentUser}`, JSON.stringify(updated));
  }
}
