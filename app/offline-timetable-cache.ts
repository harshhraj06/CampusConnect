export type OfflineTimetableFile = {
  documentId: string;
  userId: string;
  fileName: string;
  mimeType: string;
  updatedAt: string;
  cachedAt: string;
  blob: Blob;
};

export type OfflineTimetableSchedule = {
  userId: string;
  entries: Record<string, any>[];
  breaks: Record<string, any>[];
  syncedAt: string;
};

const DB_NAME =
  "campusconnect-offline";

const DB_VERSION = 3;

const FILE_STORE_NAME =
  "timetable-files";

const SCHEDULE_STORE_NAME =
  "timetable-schedules";


function openDatabase():
  Promise<IDBDatabase> {
  return new Promise(
    (resolve, reject) => {
      if (
        typeof window ===
          "undefined" ||
        !("indexedDB" in window)
      ) {
        reject(
          new Error(
            "Offline storage is unavailable."
          )
        );

        return;
      }

      const request =
        window.indexedDB.open(
          DB_NAME,
          DB_VERSION
        );

      request.onupgradeneeded =
        () => {
          const database =
            request.result;

          if (
            !database
              .objectStoreNames
              .contains(
                FILE_STORE_NAME
              )
          ) {
            const store =
              database.createObjectStore(
                FILE_STORE_NAME,
                {
                  keyPath:
                    "documentId",
                }
              );

            store.createIndex(
              "userId",
              "userId",
              {
                unique: false,
              }
            );
          } else {
            const transaction =
              request.transaction;

            if (transaction) {
              const store =
                transaction.objectStore(
                  FILE_STORE_NAME
                );

              if (
                !store.indexNames
                  .contains(
                    "userId"
                  )
              ) {
                store.createIndex(
                  "userId",
                  "userId",
                  {
                    unique: false,
                  }
                );
              }
            }
          }

          if (
            !database
              .objectStoreNames
              .contains(
                SCHEDULE_STORE_NAME
              )
          ) {
            database.createObjectStore(
              SCHEDULE_STORE_NAME,
              {
                keyPath: "userId",
              }
            );
          }
        };

      request.onsuccess =
        () => {
          const database =
            request.result;

          database.onversionchange =
            () => {
              database.close();
            };

          resolve(database);
        };

      request.onerror =
        () =>
          reject(
            request.error ||
              new Error(
                "Unable to open CampusConnect offline storage."
              )
          );

      request.onblocked =
        () =>
          reject(
            new Error(
              "CampusConnect offline storage upgrade is blocked by another open tab."
            )
          );
    }
  );
}


export async function saveOfflineTimetableFile(
  file: OfflineTimetableFile
): Promise<void> {
  const database =
    await openDatabase();

  try {
    await new Promise<void>(
      (resolve, reject) => {
        const transaction =
          database.transaction(
            FILE_STORE_NAME,
            "readwrite"
          );

        const store =
          transaction.objectStore(
            FILE_STORE_NAME
          );

        const userIndex =
          store.index("userId");

        const cursorRequest =
          userIndex.openCursor(
            IDBKeyRange.only(
              file.userId
            )
          );

        cursorRequest.onsuccess =
          () => {
            const cursor =
              cursorRequest.result;

            if (!cursor) {
              store.put(file);
              return;
            }

            const value =
              cursor.value as
                OfflineTimetableFile;

            if (
              value.documentId !==
              file.documentId
            ) {
              cursor.delete();
            }

            cursor.continue();
          };

        cursorRequest.onerror =
          () =>
            transaction.abort();

        transaction.oncomplete =
          () => resolve();

        transaction.onerror =
          () =>
            reject(
              transaction.error ||
                new Error(
                  "Unable to save timetable file offline."
                )
            );

        transaction.onabort =
          () =>
            reject(
              transaction.error ||
                new Error(
                  "Unable to save timetable file offline."
                )
            );
      }
    );
  } finally {
    database.close();
  }
}


export async function getOfflineTimetableFiles(
  userId: string
): Promise<
  OfflineTimetableFile[]
> {
  const database =
    await openDatabase();

  try {
    return await new Promise<
      OfflineTimetableFile[]
    >(
      (resolve, reject) => {
        const transaction =
          database.transaction(
            FILE_STORE_NAME,
            "readonly"
          );

        const request =
          transaction
            .objectStore(
              FILE_STORE_NAME
            )
            .index("userId")
            .getAll(userId);

        request.onsuccess =
          () => {
            const rows =
              (
                request.result ||
                []
              ) as
                OfflineTimetableFile[];

            resolve(
              rows.sort(
                (a, b) =>
                  new Date(
                    b.updatedAt ||
                      b.cachedAt
                  ).getTime() -
                  new Date(
                    a.updatedAt ||
                      a.cachedAt
                  ).getTime()
              )
            );
          };

        request.onerror =
          () =>
            reject(
              request.error ||
                new Error(
                  "Unable to read offline timetable files."
                )
            );
      }
    );
  } finally {
    database.close();
  }
}


export async function removeOfflineTimetableFilesForUser(
  userId: string
): Promise<void> {
  const database =
    await openDatabase();

  try {
    await new Promise<void>(
      (resolve, reject) => {
        const transaction =
          database.transaction(
            FILE_STORE_NAME,
            "readwrite"
          );

        const request =
          transaction
            .objectStore(
              FILE_STORE_NAME
            )
            .index("userId")
            .openCursor(
              IDBKeyRange.only(
                userId
              )
            );

        request.onsuccess =
          () => {
            const cursor =
              request.result;

            if (!cursor) {
              return;
            }

            cursor.delete();
            cursor.continue();
          };

        request.onerror =
          () =>
            transaction.abort();

        transaction.oncomplete =
          () => resolve();

        transaction.onerror =
          () =>
            reject(
              transaction.error ||
                new Error(
                  "Unable to clear offline timetable files."
                )
            );

        transaction.onabort =
          () =>
            reject(
              transaction.error ||
                new Error(
                  "Unable to clear offline timetable files."
                )
            );
      }
    );
  } finally {
    database.close();
  }
}


export async function saveOfflineTimetableSchedule(
  snapshot: OfflineTimetableSchedule
): Promise<void> {
  const database =
    await openDatabase();

  try {
    await new Promise<void>(
      (resolve, reject) => {
        const transaction =
          database.transaction(
            SCHEDULE_STORE_NAME,
            "readwrite"
          );

        transaction
          .objectStore(
            SCHEDULE_STORE_NAME
          )
          .put(snapshot);

        transaction.oncomplete =
          () => resolve();

        transaction.onerror =
          () =>
            reject(
              transaction.error ||
                new Error(
                  "Unable to save offline timetable schedule."
                )
            );

        transaction.onabort =
          () =>
            reject(
              transaction.error ||
                new Error(
                  "Unable to save offline timetable schedule."
                )
            );
      }
    );
  } finally {
    database.close();
  }
}


export async function getOfflineTimetableSchedule(
  userId: string
): Promise<
  OfflineTimetableSchedule | null
> {
  const database =
    await openDatabase();

  try {
    return await new Promise(
      (resolve, reject) => {
        const transaction =
          database.transaction(
            SCHEDULE_STORE_NAME,
            "readonly"
          );

        const request =
          transaction
            .objectStore(
              SCHEDULE_STORE_NAME
            )
            .get(userId);

        request.onsuccess =
          () =>
            resolve(
              (
                request.result ||
                null
              ) as
                OfflineTimetableSchedule |
                null
            );

        request.onerror =
          () =>
            reject(
              request.error ||
                new Error(
                  "Unable to read offline timetable schedule."
                )
            );
      }
    );
  } finally {
    database.close();
  }
}


export async function removeOfflineTimetableSchedule(
  userId: string
): Promise<void> {
  const database =
    await openDatabase();

  try {
    await new Promise<void>(
      (resolve, reject) => {
        const transaction =
          database.transaction(
            SCHEDULE_STORE_NAME,
            "readwrite"
          );

        transaction
          .objectStore(
            SCHEDULE_STORE_NAME
          )
          .delete(userId);

        transaction.oncomplete =
          () => resolve();

        transaction.onerror =
          () =>
            reject(
              transaction.error ||
                new Error(
                  "Unable to clear offline timetable schedule."
                )
            );

        transaction.onabort =
          () =>
            reject(
              transaction.error ||
                new Error(
                  "Unable to clear offline timetable schedule."
                )
            );
      }
    );
  } finally {
    database.close();
  }
}


export function timetableMimeType(
  fileName: string
): string {
  const extension =
    fileName
      .toLowerCase()
      .split(".")
      .pop();

  if (
    extension === "jpg" ||
    extension === "jpeg"
  ) {
    return "image/jpeg";
  }

  if (extension === "png") {
    return "image/png";
  }

  if (extension === "webp") {
    return "image/webp";
  }

  if (extension === "pdf") {
    return "application/pdf";
  }

  return "application/octet-stream";
}
