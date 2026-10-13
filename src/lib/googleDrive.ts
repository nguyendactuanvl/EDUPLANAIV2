import { getCachedToken, googleSignIn } from './googleAuth';

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  webContentLink?: string;
  createdTime?: string;
  size?: string;
  folderName?: string;
}

const EDUPLAN_ROOT_FOLDER = "Tài Liệu EduPlan GDPT 2018";

/**
 * Searches for or creates a folder on Google Drive
 */
export async function getOrCreateDriveFolder(token: string, folderName: string, parentFolderId?: string): Promise<string> {
  if (!token) throw new Error("Chưa đăng nhập tài khoản Google.");

  let query = `mimeType = 'application/vnd.google-apps.folder' and name = '${folderName.replace(/'/g, "\\'")}' and trashed = false`;
  if (parentFolderId) {
    query += ` and '${parentFolderId}' in parents`;
  }

  // 1. Search for existing folder
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id, name)`;
  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (searchRes.ok) {
    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
      return searchData.files[0].id;
    }
  }

  // 2. Create folder if not found
  const createRes = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: parentFolderId ? [parentFolderId] : undefined
    })
  });

  if (!createRes.ok) {
    const err = await createRes.json();
    throw new Error(err.error?.message || "Không thể tạo thư mục trên Google Drive.");
  }

  const folderData = await createRes.json();
  return folderData.id;
}

/**
 * Uploads a file (Word .docx, PDF, or JSON) directly to the teacher's Google Drive
 */
export async function uploadFileToGoogleDrive(
  fileBlob: Blob,
  fileName: string,
  mimeType: string,
  subFolder?: string
): Promise<DriveFileItem> {
  let token = getCachedToken();
  if (!token) {
    const authResult = await googleSignIn();
    if (!authResult?.accessToken) {
      throw new Error("Cần đăng nhập Google Drive để tải tệp lên cloud.");
    }
    token = authResult.accessToken;
  }

  // 1. Ensure root EduPlan folder & subfolder exist
  const rootFolderId = await getOrCreateDriveFolder(token, EDUPLAN_ROOT_FOLDER);
  let targetFolderId = rootFolderId;
  if (subFolder) {
    targetFolderId = await getOrCreateDriveFolder(token, subFolder, rootFolderId);
  }

  // 2. Build multipart body
  const boundary = "------EduPlanDriveBoundary" + Math.random().toString(36).substring(2);
  const metadata = {
    name: fileName,
    mimeType: mimeType,
    parents: [targetFolderId]
  };

  const metadataPart = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`;
  const mediaHeader = `--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`;
  const closingPart = `\r\n--${boundary}--`;

  const arrayBuffer = await fileBlob.arrayBuffer();
  
  const blob = new Blob([
    metadataPart,
    mediaHeader,
    new Uint8Array(arrayBuffer),
    closingPart
  ], { type: `multipart/related; boundary=${boundary}` });

  // 3. POST multipart request to Google Drive Upload API
  const uploadUrl = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink,webContentLink,createdTime,size";
  const uploadRes = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": `multipart/related; boundary=${boundary}`
    },
    body: blob
  });

  if (!uploadRes.ok) {
    const errData = await uploadRes.json().catch(() => ({}));
    throw new Error(errData.error?.message || "Không thể tải tệp lên Google Drive. Vui lòng thử lại.");
  }

  const result = await uploadRes.json();
  return {
    id: result.id,
    name: result.name || fileName,
    mimeType: result.mimeType || mimeType,
    webViewLink: result.webViewLink || `https://drive.google.com/file/d/${result.id}/view`,
    webContentLink: result.webContentLink,
    createdTime: result.createdTime || new Date().toISOString(),
    size: result.size,
    folderName: subFolder || EDUPLAN_ROOT_FOLDER
  };
}

/**
 * Syncs exam matrix or JSON data to Google Drive
 */
export async function syncExamDataToGoogleDrive(
  examData: any,
  fileName: string
): Promise<DriveFileItem> {
  const jsonString = JSON.stringify(examData, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  return uploadFileToGoogleDrive(
    blob,
    fileName.endsWith(".json") ? fileName : `${fileName}.json`,
    "application/json",
    "Đề Thi & Ma Trận Sync"
  );
}

/**
 * Lists all EduPlan files from the teacher's Google Drive
 */
export async function listEduPlanDriveFiles(): Promise<DriveFileItem[]> {
  const token = getCachedToken();
  if (!token) return [];

  try {
    const rootFolderId = await getOrCreateDriveFolder(token, EDUPLAN_ROOT_FOLDER);
    const query = `'${rootFolderId}' in parents or mimeType = 'application/vnd.google-apps.folder'`;
    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,webViewLink,webContentLink,createdTime,size,parents)&orderBy=createdTime desc&pageSize=50`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) return [];
    const data = await res.json();
    return (data.files || []).map((f: any) => ({
      id: f.id,
      name: f.name,
      mimeType: f.mimeType,
      webViewLink: f.webViewLink || `https://drive.google.com/file/d/${f.id}/view`,
      webContentLink: f.webContentLink,
      createdTime: f.createdTime,
      size: f.size
    }));
  } catch (e) {
    console.warn("Lỗi đọc danh sách tệp Google Drive:", e);
    return [];
  }
}
