const DB_NAME = 'TunnelVisionDB'
const STORE_NAME = 'binaryStore'
const DB_VERSION = 1

let DB_PROMISE: Promise<IDBDatabase> | null = null

function getDB(): Promise<IDBDatabase | void> {
  if (DB_PROMISE) return DB_PROMISE

  DB_PROMISE = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      //@ts-ignore
      const db = event.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }

    //@ts-ignore
    request.onsuccess = (event) => resolve(event.target.result)
    //@ts-ignore
    request.onerror = () => {
      console.error(`getDB: failed to get db: `, request.error)
      reject()
    }
  })

  return DB_PROMISE
}

// Store ArrayBuffer
export async function setBinary(key: string, arrayBuffer: ArrayBuffer): Promise<void> {
  const db = await getDB()
  if (!db) return

  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.objectStore(STORE_NAME)

  return new Promise((resolve, reject) => {
    const request = store.put(arrayBuffer, key)
    request.onsuccess = () => resolve()
    request.onerror = () => {
      console.error(`setBinary: Could not set value at key ${key}:`, request.error)
      reject()
    }
  })
}

// Retrieve ArrayBuffer
export async function getBinary(key: string): Promise<ArrayBuffer | undefined> {
  const db = await getDB()
  if (!db) return

  const tx = db.transaction(STORE_NAME, 'readonly')
  const store = tx.objectStore(STORE_NAME)

  return new Promise((resolve, reject) => {
    const request = store.get(key)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => {
      console.error(`getBinary: Could not get value at key ${key}:`, request.error)
      reject()
    }
  })
}

// Delete function
export async function deleteBinary(key: string): Promise<void> {
  const db = await getDB()
  if (!db) return

  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.objectStore(STORE_NAME)

  return new Promise((resolve, reject) => {
    const request = store.delete(key);   // <-- This deletes the entry

    request.onsuccess = () => {
      console.log(`deleteBinary: Deleted entry with key: ${key}`)
      resolve()
    }

    request.onerror = () => {
      console.error(`deleteBinary: Failed to delete key ${key}: `, request.error)
      reject()
    }
  })
}

