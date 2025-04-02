import * as XLSX from "xlsx";
import { Parser } from "json2csv";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

// the file saved above

const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.file",
];

const { privateKey } = JSON.parse(process.env.FIREBASE_PRIVATE_KEY!);

const jwt = new JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: privateKey,
  scopes: SCOPES,
});
const doc = new GoogleSpreadsheet(
  "1xLb2Heh90wsb-MwtYCFT2Z8p2zQyHjMPEmpUsRA8DYY",
  jwt
);

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(request: Request) {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ message: "Method Not Allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const formData = await request.formData();
  const file = formData.get("file") as unknown as File;
  console.log("form data", formData, file);

  if (!file) {
    return new Response(JSON.stringify({ message: "No file uploaded" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const workbook = XLSX.read(buffer, { type: "buffer" });

  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // Convert Excel to JSON
  type RawRowData = Record<string, unknown>;
  const jsonData = XLSX.utils.sheet_to_json<RawRowData>(worksheet);

  await doc.loadInfo();

  //const sheet = doc.sheetsByIndex[0];
  const sheet = doc.sheetsByTitle["base"];
  await sheet.loadCells();

  // Get the total number of rows in the sheet
  const totalRows = sheet.rowCount;

  // Clear first 12 columns
  for (let row = 0; row < totalRows; row++) {
    for (let col = 0; col < 12; col++) {
      const cell = sheet.getCell(row, col);
      cell.value = null;
    }
  }

  const headers = Object.keys(jsonData[0] as Record<string, unknown>);
  //validate headers here

  await sheet.setHeaderRow(headers);
  //@ts-expect-error this is a workaround for the type error
  await sheet.addRows(jsonData);

  const resultSheet = doc.sheetsByTitle["result"];
  await resultSheet.loadHeaderRow(); // Ensure headers are loaded
  const resultRows = await resultSheet.getRows();

  // Convert the rows to a plain object array
  const resultData = resultRows.map((row) => {
    const rowData: Record<string, unknown> = {};
    // Use row._rawData or direct property access
    resultSheet.headerValues.forEach((header) => {
      rowData[header] = row.get(header); // Use get() method instead of direct access
    });
    return rowData;
  });

  // Convert processed data to CSV
  const json2csvParser = new Parser();
  const csv = json2csvParser.parse(resultData);

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": "attachment; filename=new_processed_data.csv",
    },
  });
}
