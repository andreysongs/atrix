export type OfflineExerciseGuide = {
  id: string; name: string; category: string; equipment: string;
  primary: string; secondary: string; level: string;
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

export function saveOfflineGuide(guide: OfflineExerciseGuide) { return transaction("readwrite", (store) => store.put(guide)); }
export function removeOfflineGuide(id: string) { return transaction("readwrite", (store) => store.delete(id)); }
export function listOfflineGuides() { return transaction<OfflineExerciseGuide[]>("readonly", (store) => store.getAll()); }
