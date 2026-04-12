import { WigorProvider } from "../src/index.js";

/**
 * Example of timetable retrieval using WigorProvider.
 *
 * To run this example:
 * 1. Install dependencies: npm install
 * 2. Build the project: npm run build
 * 3. Create a .env file with your credentials:
 *    WIGOR_IDENTIFIER=your_identifier
 *    WIGOR_PASSWORD=your_password
 * 4. Run the script: node --env-file=.env examples/get_timetable.js
 * (Or use tsx: npx tsx --env-file=.env examples/get_timetable.ts)
 */

async function main() {
	// Initialize the provider
	const provider = new WigorProvider();

	// Use environment variables for credentials
	const credentials = {
		identifier: process.env.WIGOR_IDENTIFIER,
		password: process.env.WIGOR_PASSWORD,
	};

	if (!credentials.identifier || !credentials.password) {
		console.error(
			"Error: WIGOR_IDENTIFIER and WIGOR_PASSWORD environment variables are required.",
		);
		return;
	}

	console.log("Validating credentials...");

	try {
		// 1. Validate credentials (optional but recommended)
		const isValid = await provider.validateCredentials(credentials);

		if (!isValid) {
			console.error("Invalid credentials!");
			return;
		}

		console.log("Credentials valid. Fetching schedule...");

		// 2. Define the period (e.g., October 2026)
		const fromDate = new Date("2025-09-01T00:00:00Z");
		const toDate = new Date("2026-08-31T23:59:59Z");

		// 3. Fetch the schedule
		const courses = await provider.getSchedule(credentials, fromDate, toDate);

		console.log(`Successfully retrieved ${courses.length} courses.`);

		if (courses.length > 0) {
			for (const course of courses) {
				console.log("\n");
				console.log(`Nom: ${course.subject}`);
				console.log(`Hash: ${course.hash}`);
				console.log(`Start: ${course.start.toISOString()}`);
				console.log(`End ${course.end.toISOString()}`);
				console.log(`Teacher: ${course.teacher || "N/A"}`);
				console.log(`Location: ${course.location || "N/A"}`);
				console.log(`Color: ${course.color || "N/A"}`);
				console.log(`Description: ${course.description || "N/A"}`);
			}
		}
	} catch (error) {
		console.error("An error occurred during retrieval:", error);
	}
}

main();
