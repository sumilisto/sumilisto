import { google } from "googleapis";

function getSheetsAuth() {
  const email = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!email || !privateKey) {
    throw new Error("Faltan credenciales de Google Sheets");
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: email,
      private_key: privateKey,
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  return google.sheets({ version: "v4", auth });
}

export async function getRawSheetData(tabName: string): Promise<string[][]> {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) throw new Error("Falta GOOGLE_SHEET_ID");

  const sheets = getSheetsAuth();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: tabName,
  });

  return response.data.values || [];
}

export async function getSheetData(tabName: string): Promise<Record<string, string>[]> {
  const rows = await getRawSheetData(tabName);
  if (rows.length === 0) return [];

  let headerRowIndex = -1;
  let headers: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row.some(cell => cell && cell.trim().toUpperCase() === "SKU")) {
      headerRowIndex = i;
      headers = row.map(header => header ? header.trim().toLowerCase() : "");
      break;
    }
  }

  if (headerRowIndex === -1) {
    console.warn(`No se encontró la columna SKU en la pestaña ${tabName}`);
    return [];
  }

  const dataRows = rows.slice(headerRowIndex + 1);

  return dataRows.map((row) => {
    const rowData: Record<string, string> = {};
    headers.forEach((header, index) => {
      if (header) {
        rowData[header] = row[index] ? row[index].trim() : "";
      }
    });
    return rowData;
  });
}
