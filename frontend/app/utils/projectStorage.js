"use strict";

import axios from "axios";

// In-memory cache for fast, synchronous component rendering
let cachedProjects = null;
let isFetchingInitial = false;

// Session storage key used strictly as a per-session runtime cache (not persistent localStorage)
const SESSION_CACHE_KEY = "hertz_db_projects_session";

/**
 * Migrate legacy projects from localStorage to MySQL database and permanently purge localStorage keys.
 */
function migrateAndPurgeLocalStorage(currentUser, userRole) {
  if (typeof window === "undefined") return [];
  const legacyProjects = [];
  const keysToRemove = [];

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith("crudProjects_") || key === "crudProjects")) {
        try {
          const parsed = JSON.parse(localStorage.getItem(key)) || [];
          if (Array.isArray(parsed)) {
            const owner = key.startsWith("crudProjects_") ? key.replace("crudProjects_", "") : (currentUser || "admin");
            parsed.forEach((p) => {
              if (p && p.id && !legacyProjects.some((item) => item.id === p.id)) {
                legacyProjects.push({ ...p, owner: p.owner || owner });
              }
            });
          }
        } catch (e) {
          console.error("Error reading legacy key " + key, e);
        }
        keysToRemove.push(key);
      }
    }

    // Immediately remove all crudProjects keys from localStorage
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch (err) {
    console.error("Failed to clean up localStorage:", err);
  }

  return legacyProjects;
}

/**
 * Update internal cache from database fetch
 */
export function syncProjectsFromDb(projects) {
  if (Array.isArray(projects)) {
    cachedProjects = projects;
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(projects));
      } catch (e) {}
      window.dispatchEvent(new Event("projects_synced"));
    }
  }
}

/**
 * Synchronous project getter for React components
 */
export function getProjectsForUser(currentUser, userRole) {
  if (!currentUser || typeof window === "undefined") return [];

  // 1. If in-memory cache is empty, check sessionStorage runtime cache
  if (cachedProjects === null) {
    try {
      const sessionData = sessionStorage.getItem(SESSION_CACHE_KEY);
      if (sessionData) {
        cachedProjects = JSON.parse(sessionData) || [];
      }
    } catch (e) {}
  }

  // 2. Check and migrate any legacy localStorage items once
  const legacyFound = migrateAndPurgeLocalStorage(currentUser, userRole);
  if (legacyFound.length > 0) {
    if (!cachedProjects || cachedProjects.length === 0) {
      cachedProjects = legacyFound;
    } else {
      // Merge unique
      const existingIds = new Set((cachedProjects || []).map((p) => p.id));
      legacyFound.forEach((lp) => {
        if (!existingIds.has(lp.id)) {
          cachedProjects.push(lp);
        }
      });
    }
    // Asynchronously push migrated projects to MySQL database
    axios
      .post(`/api/crud/projects?user=${encodeURIComponent(currentUser)}&role=${encodeURIComponent(userRole)}`, {
        projects: cachedProjects,
      })
      .catch((e) => console.error("Database sync for migrated legacy projects failed:", e));
  }

  // 3. If cache is still empty/null, trigger background fetch from MySQL
  if (cachedProjects === null && !isFetchingInitial) {
    isFetchingInitial = true;
    axios
      .get(
        `/api/crud/projects?user=${encodeURIComponent(currentUser)}&role=${encodeURIComponent(userRole)}&includeDeleted=true`
      )
      .then((res) => {
        if (res.data && res.data.success && Array.isArray(res.data.projects)) {
          syncProjectsFromDb(res.data.projects);
        }
      })
      .catch((err) => console.error("Initial background fetch from MySQL failed:", err))
      .finally(() => {
        isFetchingInitial = false;
      });
    return [];
  }

  const list = cachedProjects || [];

  if (userRole === "admin") {
    // Admin sees all projects
    return [...list];
  } else {
    // User sees their own or unowned projects
    return list.filter((p) => !p.owner || p.owner === currentUser || p.owner === "admin");
  }
}

/**
 * Save projects list directly to MySQL database and update cache
 */
export function saveProjectsForUser(newProjects, currentUser, userRole) {
  if (!currentUser || typeof window === "undefined") return;

  // Make sure all crudProjects keys in localStorage are removed
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && (key.startsWith("crudProjects") || key.startsWith("crudProjects_"))) {
        localStorage.removeItem(key);
      }
    }
  } catch (e) {}

  // Update in-memory cache and sessionStorage
  let fullList = [];
  if (userRole === "admin") {
    fullList = newProjects;
  } else {
    // Merge new/updated user projects with others already in cache
    const others = (cachedProjects || []).filter((p) => p.owner && p.owner !== currentUser && p.owner !== "admin");
    fullList = [...others, ...newProjects.map((p) => ({ ...p, owner: p.owner || currentUser }))];
  }

  cachedProjects = fullList;
  try {
    sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(fullList));
  } catch (e) {}

  window.dispatchEvent(new Event("projects_synced"));

  // Persist directly to MySQL database via API
  const endpoint = `/api/crud/projects?user=${encodeURIComponent(currentUser)}&role=${encodeURIComponent(userRole)}`;
  return axios
    .post(endpoint, { projects: fullList })
    .catch((e) => console.error("Database project save failed:", e));
}
