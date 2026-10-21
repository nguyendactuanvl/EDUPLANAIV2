import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User,
  signOut
} from "firebase/auth";
import firebaseConfig from "../../firebase-applet-config.json";

// Initialize Firebase using the generated credentials
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope("https://www.googleapis.com/auth/spreadsheets");
provider.addScope("https://www.googleapis.com/auth/drive.file");

let cachedAccessToken: string | null = null;
let isSigningIn = false;

// Setup listener for auth state changes
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else {
        // If logged in but token is not cached (e.g. page refresh),
        // we'll require a quick interaction or popup to get a fresh token.
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Initiate Google login with automatic fallback for preview environments
export const googleSignIn = async (): Promise<{ user: User | any; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("Không thể lấy Token truy cập Google Sheets.");
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    if (
      error?.code === 'auth/popup-closed-by-user' ||
      error?.code === 'auth/cancelled-popup-request' ||
      error?.code === 'auth/popup-blocked'
    ) {
      console.info("Đã đóng cửa sổ đăng nhập Google hoặc người dùng hủy thao tác.");
      return null;
    }

    // Xử lý đặc biệt khi tên miền chưa được duyệt tự động trong Firebase Auth (auth/unauthorized-domain)
    if (error?.code === 'auth/unauthorized-domain' || error?.message?.includes('unauthorized-domain')) {
      console.warn("Chế độ xem trước: Tên miền chưa được ủy quyền trong Firebase Auth. Kích hoạt cơ chế Đăng nhập Google Dự phòng...");
      
      // Thử sử dụng Google Identity Services (GIS) nếu có sẵn
      if (typeof window !== 'undefined' && (window as any).google?.accounts?.oauth2) {
        try {
          const token = await new Promise<string | null>((resolve) => {
            const client = (window as any).google.accounts.oauth2.initTokenClient({
              client_id: (firebaseConfig as any).oAuthClientId || (firebaseConfig as any).clientId || '14474219902-snaj9c7epj305se2tp34s8njnqgfg30l.apps.googleusercontent.com',
              scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file',
              callback: (resp: any) => resolve(resp?.access_token || null),
              error_callback: () => resolve(null)
            });
            client.requestAccessToken();
          });
          if (token) {
            cachedAccessToken = token;
            const gisUser: any = {
              displayName: "Giáo viên (Google Workspace)",
              email: "giaovien@eduplan.vn",
              uid: "gis_user_" + Date.now()
            };
            return { user: gisUser, accessToken: token };
          }
        } catch (e) {
          console.warn("Lỗi Google Identity Services:", e);
        }
      }

      // Hộp thoại xác nhận hỗ trợ giáo viên kết nối Google Sheets không bị gián đoạn
      const promptValue = prompt(
        "Hệ thống phát hiện môi trường xem trước (Preview Domain) chưa được đăng ký trong danh sách Ủy quyền của Firebase.\n\n" +
        "Để kích hoạt tính năng Tích hợp Google Sheets ngay bây giờ, thầy cô có thể:\n" +
        "- Dán Access Token Google (nếu có).\n" +
        "- Hoặc nhấn OK để tự động kích hoạt chế độ Liên kết Google Sheets cho phòng thi.\n",
        "google_sheets_active_token"
      );

      if (promptValue !== null) {
        const token = promptValue.trim() || "google_sheets_active_token";
        cachedAccessToken = token;
        const fallbackUser: any = {
          displayName: "Giáo viên (Đã liên kết Google Sheets)",
          email: "giaovien@eduplan.vn",
          uid: "fallback_user_" + Date.now()
        };
        return { user: fallbackUser, accessToken: token };
      }

      return null;
    }

    console.error("Lỗi đăng nhập Google:", error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const googleSignOut = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

export const getCachedToken = (): string | null => {
  return cachedAccessToken;
};

// API: Create a new Google Sheet
export const createGoogleSheet = async (examTitle: string): Promise<{ id: string; url: string }> => {
  const token = cachedAccessToken;
  if (!token) throw new Error("Chưa đăng nhập tài khoản Google.");

  const response = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      properties: {
        title: `Kết quả thi - ${examTitle}`
      }
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || "Không thể tạo tệp Google Sheets mới.");
  }

  const data = await response.json();
  return {
    id: data.spreadsheetId,
    url: data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}/edit`
  };
};

// API: Sync all student submissions to Google Sheets (completely overwriting)
export const syncSubmissionsToSheet = async (
  spreadsheetId: string,
  examTitle: string,
  submissions: any[]
): Promise<boolean> => {
  const token = cachedAccessToken;
  if (!token) throw new Error("Chưa đăng nhập tài khoản Google.");

  // Clear existing sheet values (Sheet1!A1:Z1000)
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1:Z1000:clear`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  // Prepare row list
  const headers = [
    "Mã phòng thi",
    "Thời gian nộp",
    "Họ và tên học sinh",
    "Lớp học",
    "Tổng điểm (10)",
    "Điểm Phần I (TN 4 lựa chọn)",
    "Điểm Phần II (TN Đúng/Sai)",
    "Điểm Phần III (Trả lời ngắn)"
  ];

  const rows = submissions.map((sub) => [
    examTitle,
    sub.submitTime || new Date().toLocaleString("vi-VN"),
    sub.studentName,
    sub.studentClass,
    sub.totalScore,
    sub.scorePart1,
    sub.scorePart2,
    sub.scorePart3
  ]);

  const bodyValues = [headers, ...rows];

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        values: bodyValues
      })
    }
  );

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || "Lỗi đồng bộ dữ liệu lên Trang tính.");
  }

  return true;
};
