import type { NextApiResponse } from "next";
import * as XLSX from "xlsx";
import { Parser } from "json2csv";

export const config = {
	api: {
		bodyParser: false,
	},
};

export async function POST(request: Request, res: NextApiResponse) {
	if (request.method !== "POST") {
		return res.status(405).json({ message: "Method Not Allowed" });
	}

	const formData = await request.formData();
	const file = formData.get("file") as unknown as File;
	console.log("form data", formData, file);

	if (!file) {
		return res.status(400).json({ message: "No file uploaded" });
	}

	const arrayBuffer = await file.arrayBuffer();
	const buffer = Buffer.from(arrayBuffer);
	const workbook = XLSX.read(buffer, { type: "buffer" });

	const sheetName = workbook.SheetNames[0];
	const worksheet = workbook.Sheets[sheetName];

	// Convert Excel to JSON
	const jsonData = XLSX.utils.sheet_to_json(worksheet);

	

	// Example processing: adding a new field
	//@ts-ignore
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const processedData = jsonData.map((row: any) => ({
		...row,
		processed_at: new Date().toISOString(),
	}));

	const testOpject = [
		{
			email: "caraculo",
			date: "2021-10-10",
			caca: "caca",
		},
		{
			email: "caraculo",
			date: "2021-10-10",
			caca: "caca",
		},
	];

	// Convert processed data to CSV
	const json2csvParser = new Parser();
	const csv = json2csvParser.parse(testOpject);

	return new Response(csv, {
		status: 200,
		headers: {
			"Content-Type": "text/csv",
			"Content-Disposition": "attachment; filename=processed_data.csv",
		},
	});
}
