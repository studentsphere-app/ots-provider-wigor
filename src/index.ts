import {
	BaseTimetableProvider,
	type Course,
	type ProviderCredentials,
	type School,
} from "@studentsphere/ots-core";
import {
	CD_SCHOOLS,
	CD_SCHOOLS_TIMETABLE_ENDPOINT,
	IGENSIA_SCHOOLS,
	IGENSIA_SCHOOLS_TIMETABLE_ENDPOINT,
	LOGIN_SERVER_ENDPOINT,
} from "./constants";
import { SCHOOLS_DATA } from "./schools";
import type { WigorEventJSON } from "./types";

const getScheduleServer = (schoolId?: string) => {
	if (schoolId && CD_SCHOOLS.includes(schoolId)) {
		return CD_SCHOOLS_TIMETABLE_ENDPOINT;
	}
	if (schoolId && IGENSIA_SCHOOLS.includes(schoolId)) {
		return IGENSIA_SCHOOLS_TIMETABLE_ENDPOINT;
	}
	return CD_SCHOOLS_TIMETABLE_ENDPOINT;
};

export class WigorProvider extends BaseTimetableProvider {
	get id(): string {
		return "wigor";
	}

	get name(): string {
		return "Wigor";
	}

	get logo(): string {
		return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEABAMAAACuXLVVAAAAAXNSR0IArs4c6QAAAAlwSFlzAAALEwAACxMBAJqcGAAAAA9QTFRFj79V////4+/VxN6mqM176BQKnwAAA0BJREFUeNrtm92N2lAUhPfaLuAeTAH2pgGcCkznLiEFESkPkYDJ8WgtmYGNmO8lSqyNv/M38LIfxhhjjDHGGGOMMcYYY4wxxhhjjDHGGGPMt+fn55UBn3S3Jx9Ie3vyY7fAFFfqPwJxZcYnJa70uwXOceWIT5q4cvriZ3YA1VCBIXUNnuwAXnNIdZLhjI8UaOPG1kYHDGcnXbBdG2E49Ef2wssZ2XBaeLALPlCsM75YG0UQoMDMl0MWBE3AcEQCPAhQYBBcIVkpqBOHoxcIshsRPb9CWRCMQgEeBEwgVFfIP1q6eIVAxdWA3pArlAVBQwWmRws0q7tWAqh8ZIJvBNCXVGtwgf13CHUSAbxCWRCMARx4cO1nXNu1YAI4MdkddhHITHZWI4CNxt6ck4DkA7khAqgrFCgRSBV8GJO9hkbnO8SuyIJgikB6yYcxL2pkAtguXRBEgsSA6A67SMx0Y/dzTgJtJE6SbwOsqiYSgyAGeLqWSFQSA5ogOEfiqIgBettTJHpNDJCyxkgcSLM0QRArkBiQBEEXK8yyGMjH3cYKJ1kM5LqaWGGQxUCebIkVao4BWRCcY4VjvhdZEEyxQi+LgVzYGCscZDGQRxurpGWRBUEXq8yyGMDzhkYfYDiqGMDKsNEwHFUM4CuxTnwl6oiCAAQqNh0HogoCqBOGI4sBLA0E7hdSFwM4XKgT3omrIgsCEIC/4LGo7vAIdcK3JdxIWRBQgWFSXSGGH9QJNzk+RSAmJtBjDMiCAOqEzYcYEN0hcsLepCuUC8wqAR4ECIZkQAxo7hA50N7Uhws0pE7Sm+HhAu23FKg4HEUM3KB1NmQ7hXeIdbb0CvV3OL9agA6nFwgUWueoigGkoXVOe66w2d4B+k+sXL3A5e8fS34i6MAaFdTUHbjU7QJlUXRggwCiF1huq4A0EoHU1kLVLhKBsl2gvoEANHqRCvDBVqq2CARyXVygfLyJwALDUQnwyRaqdhEJlK0C9R0EsNGLUICPttL/ZVEI5Moq79TTBcpLBJY0HLnAQl8zwK7IBMq2OusLBH49R+A3bXRBARmfd5zw11ru8G8GGWOMMcYYY4wxxhhjjDHGGGOMMcYYY4z5v/gDnuEEumjCiJsAAAAASUVORK5CYII=";
	}

	get schools(): School[] {
		return SCHOOLS_DATA;
	}

	async validateCredentials(
		credentials: ProviderCredentials,
	): Promise<boolean> {
		try {
			const { cookies } = await this.login(LOGIN_SERVER_ENDPOINT, credentials);
			return cookies.size > 0;
		} catch (_err) {
			return false;
		}
	}

	async getSchedule(
		credentials: ProviderCredentials,
		from: Date,
		to: Date,
	): Promise<Course[]> {
		const scheduleServer = getScheduleServer(
			credentials.schoolId as string | undefined,
		);

		const params = new URLSearchParams({
			sort: "",
			group: "",
			filter: "",
			dateDebut: from.toISOString(),
			dateFin: to.toISOString(),
		});

		const fullScheduleUrl = `${scheduleServer}?${params.toString()}`;

		const { cookies } = await this.login(
			LOGIN_SERVER_ENDPOINT,
			credentials,
			fullScheduleUrl,
		);

		const response = await fetch(fullScheduleUrl, {
			headers: {
				"User-Agent": "ots",
				Cookie: this.serializeCookies(cookies, scheduleServer),
			},
		});

		if (!response.ok || response.status === 302) {
			const text = await response.text();
			if (text.includes("cas/login") || response.status === 302) {
				throw new Error(
					"Session expired or redirected to login. Authentication was not fully established.",
				);
			}
			throw new Error(
				`Failed to fetch schedule: ${response.status} ${response.statusText}`,
			);
		}

		const contentType = response.headers.get("content-type");
		if (!contentType?.includes("application/json")) {
			const text = await response.text();
			console.error("[Wigor] Expected JSON but received:", text.slice(0, 200));
			throw new Error(
				`Expected JSON response but received ${contentType || "unknown content type"}. You might have been redirected to a login page.`,
			);
		}

		const json = (await response.json()) as { Data: WigorEventJSON[] };
		const events = json.Data || [];

		return events.map((event) => {
			const subject =
				event.Commentaire && event.Commentaire !== "COMMENTAIRE"
					? event.Commentaire
					: event.Matiere || event.Title || "Sans titre";

			return {
				hash: event.NoCours.toString(),
				subject,
				start: new Date(event.Start),
				end: new Date(event.End),
				location:
					event.Salles && event.Salles !== "Aucune" ? event.Salles : undefined,
				teacher: event.NomProf || "Anonyme",
				color: `rgb(${event.ColorRed},${event.ColorGreen},${event.ColorBlue})`,
				description: (() => {
					const parts: string[] = [];
					parts.push(`\n`);
					const teamsUrlField = event.TeamsURL || event.TeamsUrl;
					if (teamsUrlField) {
						const linkRegex =
							/<a [^>]*href="([^"]+)"[^>]*>[\s\S]*?<img [^>]*src="([^"]+)"[^>]*>[\s\S]*?<\/a>/gi;
						let match: RegExpExecArray | null;
						// biome-ignore lint/suspicious/noAssignInExpressions: valid regex usage
						while ((match = linkRegex.exec(teamsUrlField)) !== null) {
							if (match[1] && match[2]) {
								const url = match[1];
								const imgSrc = match[2];
								const labelMatch = imgSrc.match(/MTeams_([^.]+)\.png/);
								const label = labelMatch
									? `Lien Teams ${labelMatch[1].replace(/_/g, " ")}`
									: "Lien Teams";
								parts.push(`${label}:\n${url}\n`);
							}
						}

						if (parts.length <= 1) {
							// 1 because of the initial newline
							const simpleUrls = [
								...teamsUrlField.matchAll(/href="([^"]+)"/g),
							].map((m) => m[1]);
							for (const url of simpleUrls) {
								if (url) parts.push(`Lien Teams:\n${url}\n`);
							}
						}
					}

					if (event.LibelleGroupe) {
						parts.push(event.LibelleGroupe);
					}
					if (event.LibelleSemaine) {
						parts.push(event.LibelleSemaine);
					}
					if (event.Commentaire && event.Commentaire !== "COMMENTAIRE") {
						parts.push(event.Commentaire);
					}
					if (event.Description) {
						parts.push(event.Description);
					}
					return parts.length > 0 ? parts.join("\n") : undefined;
				})(),
				originalData: event,
			};
		});
	}

	private async login(
		loginServer: string,
		credentials: ProviderCredentials,
		service?: string,
	): Promise<{
		cookies: Map<
			string,
			Map<string, { value: string; path: string; expires?: number }>
		>;
	}> {
		const jar: Map<
			string,
			Map<string, { value: string; path: string; expires?: number }>
		> = new Map();
		const serviceParam = service
			? `?service=${encodeURIComponent(service)}`
			: "";

		let currentUrl = `${loginServer}${serviceParam}`;

		// 1. GET login page to extract hidden fields
		const getRes = await fetch(currentUrl, {
			headers: { "User-Agent": "ots" },
		});
		this.updateCookies(jar, currentUrl, getRes.headers.getSetCookie());
		const html = await getRes.text();
		const hidden = this.extractHiddenFields(html);

		// 2. POST credentials
		const form = new URLSearchParams();
		form.append("username", credentials.identifier as string);
		form.append("password", credentials.password || "");
		for (const [k, v] of Object.entries(hidden)) {
			if (k !== "username" && k !== "password") form.append(k, v);
		}
		if (!form.has("_eventId")) form.append("_eventId", "submit");
		let response = await fetch(currentUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
				"User-Agent": "ots",
				Cookie: this.serializeCookies(jar, currentUrl),
			},
			body: form.toString(),
			redirect: "manual",
		});

		// 3. Follow redirect chain manually to capture all intermediate cookies
		let redirectCount = 0;
		const maxRedirects = 15;
		const seenTickets = new Set<string>();

		while (true) {
			this.updateCookies(jar, currentUrl, response.headers.getSetCookie());

			if (response.status >= 300 && response.status < 400) {
				let location = response.headers.get("location");
				if (!location) break;

				// Ticket Reuse Prevention: detect and strip reused tickets
				const urlObj = new URL(location, currentUrl);
				const ticket = urlObj.searchParams.get("ticket");
				if (ticket) {
					if (seenTickets.has(ticket)) {
						urlObj.searchParams.delete("ticket");
						location = urlObj.toString();
					} else {
						seenTickets.add(ticket);
					}
				}

				currentUrl = new URL(location, currentUrl).toString();
				const cookieHeader = this.serializeCookies(jar, currentUrl);
				if (cookieHeader)
					response = await fetch(currentUrl, {
						headers: {
							"User-Agent": "ots",
							Cookie: cookieHeader,
						},
						redirect: "manual",
					});
				redirectCount++;
				if (redirectCount > maxRedirects) break;
			} else {
				// Final response or error
				if (response.status >= 400) {
					const body = await response.text();
					console.error(
						`[Wigor] [DEBUG] Error Status: ${response.status} at ${currentUrl}`,
					);
					console.error(`[Wigor] [DEBUG] Error Body: ${body.slice(0, 1000)}`);
				}
				break;
			}
		}

		if (response.status >= 400) {
			throw new Error(
				`Authentication failed with status ${response.status} at ${currentUrl}`,
			);
		}

		return { cookies: jar };
	}

	private extractHiddenFields(html: string): Record<string, string> {
		const fields: Record<string, string> = {};
		const regex =
			/<input[^>]+type="hidden"[^>]+name="([^"]+)"[^>]+value="([^"]*)"/gi;
		let match: RegExpExecArray | null;
		// biome-ignore lint/suspicious/noAssignInExpressions: valid regex usage
		while ((match = regex.exec(html)) !== null) {
			if (match[1]) fields[match[1]] = match[2] || "";
		}
		return fields;
	}

	private updateCookies(
		jar: Map<
			string,
			Map<string, { value: string; path: string; expires?: number }>
		>,
		url: string,
		setCookieHeaders: string[],
	) {
		const parsedUrl = new URL(url);
		const hostname = parsedUrl.hostname;

		for (const header of setCookieHeaders) {
			const parts = header.split(";");
			const firstPart = parts[0]?.split("=");

			if (firstPart && firstPart.length === 2 && firstPart[0]) {
				const name = firstPart[0].trim();
				const value = firstPart[1].trim();

				let targetDomain = hostname;
				let path = "/";
				let isDeletion = value === "";
				let expiresAt: number | undefined;

				for (const part of parts.slice(1)) {
					const p = part.trim().toLowerCase();
					if (p.startsWith("domain=")) {
						const d = p.split("=")[1]?.trim();
						if (d) targetDomain = d.startsWith(".") ? d : `.${d}`;
					} else if (p.startsWith("path=")) {
						path = p.split("=")[1]?.trim() || "/";
					} else if (p.startsWith("expires=")) {
						const exp = p.split("=")[1]?.trim();
						if (exp) {
							const date = new Date(exp);
							if (date.getTime() < Date.now()) isDeletion = true;
							expiresAt = date.getTime();
						}
					} else if (p.startsWith("max-age=")) {
						const maxAge = parseInt(p.split("=")[1]?.trim() || "0", 10);
						if (maxAge <= 0) isDeletion = true;
						else expiresAt = Date.now() + maxAge * 1000;
					}
				}

				let domainCookies = jar.get(targetDomain);
				if (!domainCookies) {
					domainCookies = new Map();
					jar.set(targetDomain, domainCookies);
				}

				if (isDeletion) {
					domainCookies.delete(name);
				} else {
					domainCookies.set(name, { value, path, expires: expiresAt });
				}
			}
		}
	}

	private serializeCookies(
		jar: Map<
			string,
			Map<string, { value: string; path: string; expires?: number }>
		>,
		url: string,
	): string {
		const parsedUrl = new URL(url);
		const hostname = parsedUrl.hostname;
		const path = parsedUrl.pathname;
		const cookiesToSet = new Map<string, string>();

		for (const [domain, domainCookies] of jar.entries()) {
			// Send if exact host match or if it's a parent domain wildcard
			if (
				hostname === domain ||
				(domain.startsWith(".") && hostname.endsWith(domain))
			) {
				for (const [name, cookie] of domainCookies.entries()) {
					// Expiry check
					if (cookie.expires && cookie.expires < Date.now()) {
						domainCookies.delete(name);
						continue;
					}
					// Path match: cookie path must be a prefix of request path
					if (path.startsWith(cookie.path)) {
						cookiesToSet.set(name, cookie.value);
					}
				}
			}
		}

		return Array.from(cookiesToSet.entries())
			.map(([name, value]) => `${name}=${value}`)
			.join("; ");
	}
}
