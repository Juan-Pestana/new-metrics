import * as XLSX from "xlsx";
import { Parser } from "json2csv";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";
import { type NextRequest } from "next/server";
import { type ProcessingType } from "@/app/page";

// handle super anoying google private key format
const decodePrivateKey = (key: string | undefined): string => {
  if (!key) throw new Error("GOOGLE_PRIVATE_KEY is not defined");

  // First, handle any Unicode escape sequences
  let decodedKey = key.replace(/\\u[\dA-F]{4}/gi, (match) =>
    String.fromCharCode(parseInt(match.replace(/\\u/g, ""), 16))
  );

  // Remove enclosing quotes if present
  decodedKey = decodedKey.replace(/^["']|["']$/g, "");

  // Check if the key already contains actual newlines
  if (decodedKey.includes("\n")) {
    return decodedKey;
  }

  // If not, replace escaped newlines with actual newlines
  return decodedKey.replace(/\\n/g, "\n");
};
const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.file",
];

const jwt = new JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: decodePrivateKey(process.env.GOOGLE_PRIVATE_KEY),
  scopes: SCOPES,
});

// this is the only processing configuration required.
// probably should be comming from db user config or something
const logicConfigs = {
  escalas: "1xLb2Heh90wsb-MwtYCFT2Z8p2zQyHjMPEmpUsRA8DYY",
  dolor: "1WoiwHYwF2QJ0qctq8WOulSE48rAaR9jFlm7Y64qP48M",
  ausencias: "",
};

export const config = {
  api: {
    bodyParser: false,
  },
};

// Add your processing logic configurations here

export async function POST(request: NextRequest) {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ message: "Method Not Allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const searchParams = request.nextUrl.searchParams;
  const metricFile = searchParams.get("file") as ProcessingType;

  const formData = await request.formData();
  const file = formData.get("file") as unknown as File;
  console.log("form data", formData, file);

  if (!file) {
    return new Response(JSON.stringify({ message: "No file uploaded" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (!metricFile) {
    return new Response(
      JSON.stringify({ message: "Please indicate a file Type to upload" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Initialize the Google Spreadsheet
  const doc = new GoogleSpreadsheet(logicConfigs[metricFile], jwt);

  // Turn uploaded file data into json
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const workbook = XLSX.read(buffer, { type: "buffer" });

  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  type RawRowData = Record<string, unknown>;
  const jsonData = XLSX.utils.sheet_to_json<RawRowData>(worksheet);

  // take Google sheets file and clear the base sheet selected columns
  await doc.loadInfo();

  const sheet = doc.sheetsByTitle["base"];

  await sheet.clear();

  const headers = Object.keys(jsonData[0] as Record<string, unknown>);
  //TO DO validate header names from logic config here

  // Paste the JSON data into Google Sheets Base sheet
  await sheet.setHeaderRow(headers);
  //@ts-expect-error this is a workaround for the type error
  await sheet.addRows(jsonData);

  //get the processed data from the Google Sheets Result sheet
  const resultSheet = doc.sheetsByTitle["result"];
  await resultSheet.loadHeaderRow(); // Ensure headers are loaded
  const resultRows = await resultSheet.getRows();

  const resultData = resultRows.map((row) => {
    const rowData: Record<string, unknown> = {};
    // Use row._rawData or direct property access
    resultSheet.headerValues.forEach((header) => {
      rowData[header] = row.get(header);
    });
    return rowData;
  });

  // Convert processed data to CSV format and return.
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
