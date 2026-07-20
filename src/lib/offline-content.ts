export type OfflineExerciseGuide = {
  id: string; name: string; category: string; equipment: string;
  primary: string; secondary: string; level: string;
  image: string;
  steps: string[]; savedAt: string;
};

const databaseName = "pulse-offline";
const storeName = "exercise-guides";

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(storeName, { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function transaction<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>) {
  const database = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    const request = action(database.transaction(storeName, mode).objectStore(storeName));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  }).finally(() => database.close());
}

const offlineMediaCache = "olympus-exercise-guides-v1";

export async function saveOfflineGuide(guide: OfflineExerciseGuide) {
  await transaction("readwrite", (store) => store.put(guide));
  if ("caches" in globalThis) {
    const cache = await caches.open(offlineMediaCache);
    await cache.add(guide.image).catch(() => undefined);
  }
}

export async function removeOfflineGuide(id: string) {
  const guides = await listOfflineGuides();
  const guide = guides.find((item) => item.id === id);
  await transaction("readwrite", (store) => store.delete(id));
  if (guide && "caches" in globalThis) {
    const cache = await caches.open(offlineMediaCache);
    await cache.delete(guide.image);
  }
}
export function listOfflineGuides() { return transaction<OfflineExerciseGuide[]>("readonly", (store) => store.getAll()); }
