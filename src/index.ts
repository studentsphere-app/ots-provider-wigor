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
		return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADUAAAA1CAYAAADh5qNwAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAIvSURBVHgB7Zm/SgNBEMZXCSRoCBaJWAQMxCo2Cip2Wltrrz6JDyDYCLa+g2ArgpUWNiaVwQipTAoJMUQQlDHZsH/mLpfdFZwwv+puMnc3385+e5tk5uzm4FtMGbNiCmFRVGBRVGBRVGBRVGBRVGBRVGBRVEgJB3ZWDsV6cU+LXdwdic+vDyt3f+1EFBcqo/N6+15cPZ1aebnMojjePtdij81rcft8KSbFqVPN95oVUwtXKWRLRt5qorzBc6rCBUdR9sOwYiGWTs1psXRqHhVQzm8gz7EHLwlOomCatboNoRe1aeUVssvo9VhXTaFwf2w6J8F5oTBHMZcp/HZBpZzfQq81BwD8ZIpy7RIQTBRgFotNMyyOda7efhCueIiyfaUWi/lJAh1VPYiJMqf3JDiLgvluClM7FbUaSlS/mYsMzAJXPwFeL99W91U7V30VtXRL5ACAn+A6/b4N4YOXKGzey2LHd6oUmefjJ8CzUw0rBkViXTJzpa9C+wnwEoX5KqpQbLuDDYCvnwDvDS32vqos7WqxTv9tWGxPi8NUDe0nILgowCxU5sBmVgV7j/n6CfAWNdjO9GJzpKgkuwTXTayKt6jBPvAlNkcWOq5gn62RSpAviXHFgJ86/dbwuDU6xu/j3yXgz0WZn8UV/s86VY30lS2qFnufEAT7jSLKV2ahUatbqC4BwURhxap+ksDCgvnKXO59mOE/sonAoqjAoqjAoqjAoqjAoqjAoqjAojwAxN68XM4/01cAAAAAElFTkSuQmCC";
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
