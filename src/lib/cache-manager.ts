// Centralized cache manager for all modules
export const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

// Cache stores
export let dashboardCache: { data: any; timestamp: number } | null = null
export let crmLeadsCache: { data: any; timestamp: number } | null = null
export let usersCache: { data: any; timestamp: number } | null = null
export let sellerDashboardCache: Map<string, { data: any; timestamp: number }> = new Map()
export let userStatsCache: { data: any; timestamp: number } | null = null

// Function to clear all caches
export function clearAllCaches() {
  dashboardCache = null
  crmLeadsCache = null
  usersCache = null
  sellerDashboardCache.clear()
  userStatsCache = null
}

// Function to set dashboard cache
export function setDashboardCache(data: any) {
  dashboardCache = { data, timestamp: Date.now() }
}

// Function to get dashboard cache
export function getDashboardCache() {
  if (dashboardCache && Date.now() - dashboardCache.timestamp < CACHE_DURATION) {
    return dashboardCache.data
  }
  return null
}

// Function to set CRM cache
export function setCrmCache(data: any) {
  crmLeadsCache = { data, timestamp: Date.now() }
}

// Function to get CRM cache
export function getCrmCache() {
  if (crmLeadsCache && Date.now() - crmLeadsCache.timestamp < CACHE_DURATION) {
    return crmLeadsCache.data
  }
  return null
}

// Function to set Users cache
export function setUsersCache(data: any) {
  usersCache = { data, timestamp: Date.now() }
}

// Function to get Users cache
export function getUsersCache() {
  if (usersCache && Date.now() - usersCache.timestamp < CACHE_DURATION) {
    return usersCache.data
  }
  return null
}

// Function to set Seller Dashboard cache (per user)
export function setSellerDashboardCache(userId: string, data: any) {
  sellerDashboardCache.set(userId, { data, timestamp: Date.now() })
}

// Function to get Seller Dashboard cache (per user)
export function getSellerDashboardCache(userId: string) {
  const cached = sellerDashboardCache.get(userId)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data
  }
  // Clean up expired cache
  if (cached) {
    sellerDashboardCache.delete(userId)
  }
  return null
}

// Function to set User Stats cache
export function setUserStatsCache(data: any) {
  userStatsCache = { data, timestamp: Date.now() }
}

// Function to get User Stats cache
export function getUserStatsCache() {
  if (userStatsCache && Date.now() - userStatsCache.timestamp < CACHE_DURATION) {
    return userStatsCache.data
  }
  return null
}
