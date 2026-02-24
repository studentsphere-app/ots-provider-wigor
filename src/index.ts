import * as crypto from "node:crypto";
import {
  BaseTimetableProvider,
  type Course,
  type ProviderCredentials,
  type School,
} from "@studentsphere/ots-core";
import axios, { type AxiosInstance } from "axios";
import { wrapper } from "axios-cookiejar-support";
import * as cheerio from "cheerio";
import pLimit from "p-limit";
import { CookieJar } from "tough-cookie";

const LOGIN_SERVER = "https://cas-p.wigorservices.net/cas/login";

const CD_SCHOOLS = [
  "3a",
  "epsi",
  "esail",
  "icl",
  "idrac-business-school",
  "ieft",
  "iet",
  "ifag",
  "igefi",
  "ihedrea",
  "ileri",
  "sup-de-com",
  "viva-mundi",
  "wis",
];

const IGENSIA_SCHOOLS = [
  "american-business-college",
  "business-science-institute",
  "cnva",
  "ecm",
  "emi",
  "esa",
  "esam",
  "icd-business-school",
  "igensia-rh",
  "imis",
  "imsi",
  "ipi",
  "iscpa",
  "ismm",
];

const getScheduleServer = (schoolId?: string) => {
  if (schoolId && CD_SCHOOLS.includes(schoolId)) {
    return "https://ws-edt-cd.wigorservices.net/WebPsDyn.aspx";
  }
  if (schoolId && IGENSIA_SCHOOLS.includes(schoolId)) {
    return "https://ws-edt-igs.wigorservices.net/WebPsDyn.aspx";
  }
  return "https://ws-edt-igs.wigorservices.net/WebPsDyn.aspx";
};

const FRENCH_MONTHS: Record<string, number> = {
  Janvier: 1,
  Février: 2,
  Mars: 3,
  Avril: 4,
  Mai: 5,
  Juin: 6,
  Juillet: 7,
  Août: 8,
  Septembre: 9,
  Octobre: 10,
  Novembre: 11,
  Décembre: 12,
};

const FRENCH_DAYS: Record<string, number> = {
  Lundi: 1,
  Mardi: 2,
  Mercredi: 3,
  Jeudi: 4,
  Vendredi: 5,
  Samedi: 6,
  Dimanche: 0,
};

const WEEK_DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export interface WigorEvent {
  title: string;
  instructor: string;
  program: string;
  startTime: string;
  endTime: string;
  duration: number;
  weekDay: string;
  classroom: string | null;
  campus: string | null;
  deliveryMode: string;
  color: string;
  classGroup: string;
  hash: string;
}

export class WigorProvider extends BaseTimetableProvider {
  get id(): string {
    return "wigor";
  }

  get name(): string {
    return "Wigor";
  }

  get logo(): string {
    return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADUAAAA1CAYAAADh5qNwAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAIvSURBVHgB7Zm/SgNBEMZXCSRoCBaJWAQMxCo2Cip2Wltrrz6JDyDYCLa+g2ArgpUWNiaVwQipTAoJMUQQlDHZsH/mLpfdFZwwv+puMnc3385+e5tk5uzm4FtMGbNiCmFRVGBRVGBRVGBRVGBRVGBRVGBRVEgJB3ZWDsV6cU+LXdwdic+vDyt3f+1EFBcqo/N6+15cPZ1aebnMojjePtdij81rcft8KSbFqVPN95oVUwtXKWRLRt5qorzBc6rCBUdR9sOwYiGWTs1psXRqHhVQzm8gz7EHLwlOomCatboNoRe1aeUVssvo9VhXTaFwf2w6J8F5oTBHMZcp/HZBpZzfQq81BwD8ZIpy7RIQTBRgFotNMyyOda7efhCueIiyfaUWi/lJAh1VPYiJMqf3JDiLgvluClM7FbUaSlS/mYsMzAJXPwFeL99W91U7V30VtXRL5ACAn+A6/b4N4YOXKGzey2LHd6oUmefjJ8CzUw0rBkViXTJzpa9C+wnwEoX5KqpQbLuDDYCvnwDvDS32vqos7WqxTv9tWGxPi8NUDe0nILgowCxU5sBmVgV7j/n6CfAWNdjO9GJzpKgkuwTXTayKt6jBPvAlNkcWOq5gn62RSpAviXHFgJ86/dbwuDU6xu/j3yXgz0WZn8UV/s86VY30lS2qFnufEAT7jSLKV2ahUatbqC4BwURhxap+ksDCgvnKXO59mOE/sonAoqjAoqjAoqjAoqjAoqjAoqjAoqjwAxN68XM4/01cAAAAAElFTkSuQmCC";
  }

  get schools(): School[] {
    return [
      {
        id: "3a",
        name: "3A",
        logo: "https://raw.githubusercontent.com/studentsphere-app/ots-provider-wigor/refs/heads/main/.github/assets/schools/3a.png",
      },
      {
        id: "american-business-college",
        name: "American Business College",
        logo: "https://raw.githubusercontent.com/studentsphere-app/ots-provider-wigor/refs/heads/main/.github/assets/schools/american_business_college.png",
      },
      {
        id: "business-science-institute",
        name: "Business Science Institute",
        logo: "https://raw.githubusercontent.com/studentsphere-app/ots-provider-wigor/refs/heads/main/.github/assets/schools/business_science_institute.png",
      },
      {
        id: "cnva",
        name: "CNVA",
        logo: "https://raw.githubusercontent.com/studentsphere-app/ots-provider-wigor/refs/heads/main/.github/assets/schools/cnva.png",
      },
      {
        id: "ecm",
        name: "ECM",
        logo: "https://raw.githubusercontent.com/studentsphere-app/ots-provider-wigor/refs/heads/main/.github/assets/schools/ecm.png",
      },
      {
        id: "emi",
        name: "EMI",
        logo: "https://raw.githubusercontent.com/studentsphere-app/ots-provider-wigor/refs/heads/main/.github/assets/schools/emi.png",
      },
      {
        id: "epsi",
        name: "EPSI",
        logo: "https://raw.githubusercontent.com/studentsphere-app/ots-provider-wigor/refs/heads/main/.github/assets/schools/epsi.png",
      },
      {
        id: "esa",
        name: "ESA",
        logo: "https://raw.githubusercontent.com/studentsphere-app/ots-provider-wigor/refs/heads/main/.github/assets/schools/esa.png",
      },
      {
        id: "esail",
        name: "ESAIL",
        logo: "https://raw.githubusercontent.com/studentsphere-app/ots-provider-wigor/refs/heads/main/.github/assets/schools/esail.png",
      },
      {
        id: "esam",
        name: "ESAM",
        logo: "https://raw.githubusercontent.com/studentsphere-app/ots-provider-wigor/refs/heads/main/.github/assets/schools/esam.png",
      },
      {
        id: "icd-business-school",
        name: "ICD Business School",
        logo: "https://raw.githubusercontent.com/studentsphere-app/ots-provider-wigor/refs/heads/main/.github/assets/schools/icd_business_school.png",
      },
      {
        id: "icl",
        name: "ICL",
        logo: "https://raw.githubusercontent.com/studentsphere-app/ots-provider-wigor/refs/heads/main/.github/assets/schools/icl.png",
      },
      {
        id: "idrac-business-school",
        name: "IDRAC Business School",
        logo: "https://raw.githubusercontent.com/studentsphere-app/ots-provider-wigor/refs/heads/main/.github/assets/schools/idrac_business_school.png",
      },
      {
        id: "ieft",
        name: "IEFT",
        logo: "https://raw.githubusercontent.com/studentsphere-app/ots-provider-wigor/refs/heads/main/.github/assets/schools/ieft.png",
      },
      {
        id: "iet",
        name: "IET",
        logo: "https://raw.githubusercontent.com/studentsphere-app/ots-provider-wigor/refs/heads/main/.github/assets/schools/iet.png",
      },
      {
        id: "ifag",
        name: "IFAG",
        logo: "https://raw.githubusercontent.com/studentsphere-app/ots-provider-wigor/refs/heads/main/.github/assets/schools/ifag.png",
      },
      {
        id: "igefi",
        name: "IGEFI",
        logo: "https://raw.githubusercontent.com/studentsphere-app/ots-provider-wigor/refs/heads/main/.github/assets/schools/igefi.png",
      },
      {
        id: "igensia-rh",
        name: "IGENSIA RH",
        logo: "https://raw.githubusercontent.com/studentsphere-app/ots-provider-wigor/refs/heads/main/.github/assets/schools/igensia_rh.png",
      },
      {
        id: "ihedrea",
        name: "IHEDREA",
        logo: "https://raw.githubusercontent.com/studentsphere-app/ots-provider-wigor/refs/heads/main/.github/assets/schools/ihedrea.png",
      },
      {
        id: "ileri",
        name: "ILERI",
        logo: "https://raw.githubusercontent.com/studentsphere-app/ots-provider-wigor/refs/heads/main/.github/assets/schools/ileri.png",
      },
      {
        id: "imis",
        name: "IMIS",
        logo: "https://raw.githubusercontent.com/studentsphere-app/ots-provider-wigor/refs/heads/main/.github/assets/schools/imis.png",
      },
      {
        id: "imsi",
        name: "IMSI",
        logo: "https://raw.githubusercontent.com/studentsphere-app/ots-provider-wigor/refs/heads/main/.github/assets/schools/imsi.png",
      },
      {
        id: "ipi",
        name: "IPI",
        logo: "https://raw.githubusercontent.com/studentsphere-app/ots-provider-wigor/refs/heads/main/.github/assets/schools/ipi.png",
      },
      {
        id: "iscpa",
        name: "ISCPA",
        logo: "https://raw.githubusercontent.com/studentsphere-app/ots-provider-wigor/refs/heads/main/.github/assets/schools/iscpa.png",
      },
      {
        id: "ismm",
        name: "ISMM",
        logo: "https://raw.githubusercontent.com/studentsphere-app/ots-provider-wigor/refs/heads/main/.github/assets/schools/ismm.png",
      },
      {
        id: "sup-de-com",
        name: "SUP DE COM",
        logo: "https://raw.githubusercontent.com/studentsphere-app/ots-provider-wigor/refs/heads/main/.github/assets/schools/sup_de_com.png",
      },
      {
        id: "viva-mundi",
        name: "Viva Mundi",
        logo: "https://raw.githubusercontent.com/studentsphere-app/ots-provider-wigor/refs/heads/main/.github/assets/schools/viva_mundi.png",
      },
      {
        id: "wis",
        name: "WIS",
        logo: "https://raw.githubusercontent.com/studentsphere-app/ots-provider-wigor/refs/heads/main/.github/assets/schools/wis.png",
      },
    ];
  }

  async validateCredentials(
    credentials: ProviderCredentials,
  ): Promise<boolean> {
    try {
      const isCasAvailable = await this.checkCasAvailability(LOGIN_SERVER);

      if (!isCasAvailable) {
        return false;
      }

      const jar = new CookieJar();
      const client = wrapper(axios.create({ jar, withCredentials: true }));

      const getRes = await client.get(LOGIN_SERVER, {
        params: { service: "" },
        headers: { "User-Agent": "nodejs-client", Accept: "text/html" },
      });

      const hidden = await this.extractHiddenFields(getRes.data as string);

      const form = new URLSearchParams();
      form.append("username", credentials.identifier as string);
      form.append("password", credentials.password || "");
      for (const [k, v] of Object.entries(hidden)) {
        if (k !== "username" && k !== "password") form.append(k, v);
      }
      if (!form.get("_eventId")) form.append("_eventId", "submit");

      const postRes = await client.post(LOGIN_SERVER, form.toString(), {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "nodejs-client",
          Accept: "text/html",
        },
        maxRedirects: 0,
        validateStatus: () => true,
      });

      if (postRes.status >= 300 && postRes.status < 400) {
      }

      if (postRes.status === 200) {
        // Check if we are actually logged in (CAS usually shows a specific page or redirects)
        if (
          postRes.data.includes("success") ||
          postRes.data.includes("Log Out") ||
          postRes.data.includes("Vous êtes connecté")
        ) {
          return true;
        }

        // Note: CAS might return 200 on failure with an error message in the HTML
        if (
          postRes.data.includes("incorrect") ||
          postRes.data.includes("erreur")
        ) {
          return false;
        }
        // If it's a 200 and no error message, it might be a success depending on the CAS config
        return true;
      }

      return false;
    } catch (err) {
      console.error(`[Wigor] Error during validation:`, err);
      return false;
    }
  }

  async getSchedule(
    credentials: ProviderCredentials,
    from: Date,
    to: Date,
  ): Promise<Course[]> {
    const isCasAvailable = await this.checkCasAvailability(LOGIN_SERVER);
    if (!isCasAvailable) {
      throw new Error("CAS server unavailable");
    }

    const query = {
      action: "posEDTLMS",
      serverID: "C",
      hashURL:
        "3771E093EFD5A0DB1204B280BBC7F09097D3A41521007FAEB9EAC5AD8905F07DBB230E9FFE9D3A6BF40B157D22E842F91708A3D7950855E83F70CF9A8A4A1CF8",
      Tel: credentials.identifier as string,
    };

    const limit = pLimit(10);
    const allEvents: WigorEvent[] = [];

    const effectiveStart = from;
    const effectiveEnd = to;

    let currentMonday = this.getMonday(effectiveStart);
    const endDateObj = effectiveEnd;
    const endFriday = this.addDays(this.getMonday(endDateObj), 4);

    const weeks: string[] = [];
    while (currentMonday <= endFriday) {
      const mondayStr = `${(currentMonday.getUTCMonth() + 1)
        .toString()
        .padStart(2, "0")}/${currentMonday
        .getUTCDate()
        .toString()
        .padStart(2, "0")}/${currentMonday.getUTCFullYear()}`;
      weeks.push(mondayStr);
      currentMonday = this.addDays(currentMonday, 7);
    }

    const scheduleServer = getScheduleServer(
      credentials.schoolId as string | undefined,
    );

    const promises = weeks.map((mondayStr) =>
      limit(async () => {
        const client = await this.createClient(LOGIN_SERVER, credentials);
        let valid = false;
        let events: WigorEvent[] = [];
        for (let attempt = 1; attempt <= 3 && !valid; attempt++) {
          try {
            const html = await this.fetchEDTHtml(client, scheduleServer, {
              ...query,
              date: mondayStr,
            });
            events = this.parseEdtHtml(html, mondayStr);
            valid = this.areEventsValid(events);
          } catch (_err) {
            console.warn(
              `[Wigor] Failed to fetch/parse week ${mondayStr} (Attempt ${attempt})`,
            );
          }
        }
        return valid ? events : [];
      }),
    );

    const results = await Promise.allSettled(promises);
    for (const result of results) {
      if (result.status === "fulfilled") {
        allEvents.push(...result.value);
      }
    }

    return allEvents.map((event) => ({
      hash: event.hash,
      subject: event.title,
      start: new Date(event.startTime),
      end: new Date(event.endTime),
      location: event.classroom || event.campus || "Inconnu",
      teacher: event.instructor,
      color: event.color,
    }));
  }

  // Helper methods
  private async checkCasAvailability(loginServer: string): Promise<boolean> {
    try {
      const response = await axios.head(loginServer, {
        headers: { "User-Agent": "nodejs-client", Accept: "text/html" },
        validateStatus: (status) => status === 200,
      });
      return response.status === 200;
    } catch (_err) {
      return false;
    }
  }

  private async extractHiddenFields(
    html: string,
  ): Promise<Record<string, string>> {
    const $ = cheerio.load(html);
    const fields: Record<string, string> = {};
    $('input[type="hidden"]').each((_, el) => {
      const name = $(el).attr("name");
      const value = $(el).attr("value") ?? "";
      if (name) {
        fields[name] = value;
      }
    });
    return fields;
  }

  private async createClient(
    loginServer: string,
    credentials: ProviderCredentials,
  ): Promise<AxiosInstance> {
    const jar = new CookieJar();
    const client = wrapper(axios.create({ jar, withCredentials: true }));
    const getRes = await client.get(loginServer, {
      params: { service: "" },
      headers: { "User-Agent": "nodejs-client", Accept: "text/html" },
    });

    const hidden = await this.extractHiddenFields(getRes.data as string);

    const form = new URLSearchParams();
    form.append("username", credentials.identifier as string);
    form.append("password", credentials.password || "");
    for (const [k, v] of Object.entries(hidden)) {
      if (k !== "username" && k !== "password") form.append(k, v);
    }
    if (!form.get("_eventId")) form.append("_eventId", "submit");

    await client.post(loginServer, form.toString(), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "nodejs-client",
        Accept: "text/html",
      },
      maxRedirects: 0,
      validateStatus: (s) => s >= 200 && s < 400,
    });

    return client;
  }

  private isErrorPage(html: string): boolean {
    return (
      html.includes("<title>Error 500</title>") ||
      html.includes("<h1>500</h1>") ||
      html.includes("Unexpected Error")
    );
  }

  private async fetchEDTHtml(
    client: AxiosInstance,
    scheduleServer: string,
    query: Record<string, string>,
    maxRetries: number = 3,
  ): Promise<string> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const params = new URLSearchParams(query).toString();
        const url = `${scheduleServer}?${params}`;

        const res = await client.get(url, {
          headers: { "User-Agent": "nodejs-client", Accept: "text/html" },
        });
        const html = res.data as string;
        if (!this.isErrorPage(html)) {
          return html;
        }
      } catch (_err) {
        // Ignore error and retry
      }
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
    throw new Error("Failed to fetch EDT");
  }

  private capitalizeName(name: string): string {
    return name
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  }

  private parseFrenchDate(
    dayText: string,
    baseYear: number,
    queryDateObj: Date,
  ): string {
    const parts = dayText.trim().split(/\s+/);
    if (parts.length < 3) throw new Error("Invalid date format");

    const dayName = parts[0];
    if (!dayName || !(dayName in FRENCH_DAYS))
      throw new Error("Invalid day name");

    const dayNumStr = parts[1];
    if (!dayNumStr) throw new Error("Missing day number");
    const dayNum = parseInt(dayNumStr, 10);
    if (Number.isNaN(dayNum)) throw new Error("Invalid day number");

    const monthNameRaw = parts[2];
    if (!monthNameRaw) throw new Error("Missing month name");
    const monthName =
      monthNameRaw.charAt(0).toUpperCase() +
      monthNameRaw.slice(1).toLowerCase();
    const month = FRENCH_MONTHS[monthName];
    if (!month) throw new Error("Invalid month name");

    const weekday = FRENCH_DAYS[dayName];

    let bestDate: Date | null = null;
    let minDiff = Infinity;
    for (const y of [baseYear - 1, baseYear, baseYear + 1]) {
      const d = new Date(Date.UTC(y, month - 1, dayNum));
      if (d.getUTCDay() === weekday) {
        const diff = Math.abs(d.getTime() - queryDateObj.getTime());
        if (diff < minDiff) {
          minDiff = diff;
          bestDate = d;
        }
      }
    }

    if (!bestDate) throw new Error("No matching date found");
    const iso = bestDate.toISOString();
    const datePart = iso.split("T")[0];
    if (!datePart) throw new Error("Invalid ISO date format");
    return datePart;
  }

  private getMonday(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    d.setDate(d.getDate() + diff);
    return d;
  }

  private addDays(date: Date, days: number): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  private calculateDuration(
    startTime: string,
    endTime: string,
    date: string,
  ): number {
    const start = new Date(`${date}T${startTime}:00Z`);
    const end = new Date(`${date}T${endTime}:00Z`);
    return (end.getTime() - start.getTime()) / (1000 * 60);
  }

  private parseEdtHtml(html: string, queryDate: string): WigorEvent[] {
    const $ = cheerio.load(html);
    const events: WigorEvent[] = [];
    const queryParts = queryDate.split("/");
    if (queryParts.length !== 3) throw new Error("Invalid query date format");

    const baseYearStr = queryParts[2];
    if (!baseYearStr) throw new Error("Missing year in query date");
    const baseYear = parseInt(baseYearStr, 10);
    if (Number.isNaN(baseYear)) throw new Error("Invalid year in query date");

    const monthStr = queryParts[0];
    const dayStr = queryParts[1];
    if (!monthStr || !dayStr)
      throw new Error("Missing month or day in query date");
    const month = parseInt(monthStr, 10);
    const day = parseInt(dayStr, 10);
    if (Number.isNaN(month) || Number.isNaN(day))
      throw new Error("Invalid month or day in query date");

    const queryDateObj = new Date(Date.UTC(baseYear, month - 1, day));

    const dayMap: Map<number, string> = new Map();
    $(".Jour").each((_, el) => {
      const $el = $(el);
      const style = $el.attr("style") || "";
      const leftMatch = style.match(/left:([\d.]+)%/);
      if (!leftMatch || !leftMatch[1]) {
        return;
      }
      const left = parseFloat(leftMatch[1]);
      if (left < 100 || left >= 200) {
        return;
      }
      const dayText = $el.find(".TCJour").text().trim();
      try {
        const parsedDate = this.parseFrenchDate(
          dayText,
          baseYear,
          queryDateObj,
        );
        dayMap.set(left, parsedDate);
      } catch (_err) {
        // Skip invalid days
      }
    });

    const sortedDays = Array.from(dayMap.keys()).sort((a, b) => a - b);

    $(".Case").each((_, element) => {
      const $case = $(element);
      const style = $case.attr("style") || "";
      const leftMatch = style.match(/left:([\d.]+)%/);
      if (!leftMatch || !leftMatch[1]) {
        return;
      }
      const caseLeft = parseFloat(leftMatch[1]);
      if (caseLeft < 100 || caseLeft >= 200) {
        return;
      }

      const dayLeft = sortedDays.filter((l) => l <= caseLeft).pop();
      if (dayLeft === undefined) {
        return;
      }
      const eventDate = dayMap.get(dayLeft);
      if (!eventDate) {
        return;
      }

      const time = $case.find(".TChdeb").text().trim().split(" - ");
      if (time.length !== 2 || !time[0] || !time[1]) {
        return;
      }

      const profContents = $case
        .find(".TCProf")
        .contents()
        .filter(function () {
          return this.type === "text" && $(this).text().trim() !== "";
        })
        .map(function () {
          return $(this).text().trim();
        })
        .get();

      const classroomInfo = $case.find(".TCSalle").text().trim();

      const courseName = $case
        .find("td.TCase")
        .contents()
        .filter(function () {
          return this.type === "text" && $(this).text().trim() !== "";
        })
        .text()
        .trim();

      const borderColor =
        $case
          .find(".innerCase")
          .attr("style")
          ?.match(/border:3px solid\s*([^;]+)/)?.[1] || "";

      if (!courseName) {
        return;
      }

      const specParts = profContents[1] ? profContents[1].split(" - ") : [];

      let classroom: string | null =
        classroomInfo.replace("Salle:", "").split("(")[0]?.trim() || null;
      let campus: string | null =
        classroomInfo.match(/\(([^)]+)\)/)?.[1] || null;
      let sessionType: string = "in_person";

      if (
        classroomInfo.includes("(DISTANCIEL)") ||
        classroomInfo.includes("Aucune")
      ) {
        classroom = null;
        campus = null;
        if (classroomInfo.includes("(DISTANCIEL)")) sessionType = "remote";
      }

      const dateObj = new Date(eventDate);
      if (Number.isNaN(dateObj.getTime()))
        throw new Error("Invalid event date");

      const weekDay = WEEK_DAYS[dateObj.getUTCDay()];
      if (!weekDay) throw new Error("Invalid weekday");

      const startTime = `${eventDate}T${time[0]}:00`;
      const endTime = `${eventDate}T${time[1]}:00`;
      const instructor = profContents[0]
        ? this.capitalizeName(profContents[0])
        : "";

      // Generate stable hash from content
      // We use a combination of stable fields to ensure the same course gives the same hash
      const hashContent = `${courseName}|${startTime}|${endTime}|${classroom}|${instructor}`;
      const hash = crypto
        .createHash("sha256")
        .update(hashContent)
        .digest("hex");

      const event: WigorEvent = {
        title: courseName.replace(/(\n|\t|\s\s+)/g, " ").trim(),
        instructor,
        program: specParts[1]?.trim() || "",
        startTime,
        endTime,
        duration: this.calculateDuration(time[0], time[1], eventDate),
        weekDay,
        classroom,
        campus: campus || "Arras",
        deliveryMode: sessionType,
        color: borderColor || "#808080",
        classGroup: specParts[0]?.trim() || "",
        hash,
      };
      events.push(event);
    });

    return events;
  }

  private areEventsValid(events: WigorEvent[]): boolean {
    return events.every((event) => {
      return (
        event.title &&
        event.title.trim() !== "" &&
        event.instructor &&
        event.instructor.trim() !== "" &&
        event.startTime &&
        event.startTime.trim() !== "" &&
        event.endTime &&
        event.endTime.trim() !== "" &&
        event.weekDay &&
        event.weekDay.trim() !== ""
      );
    });
  }
}
